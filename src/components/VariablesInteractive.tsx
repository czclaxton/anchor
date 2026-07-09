import { basicSetup } from 'codemirror'
import { python } from '@codemirror/lang-python'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { Fragment, useEffect, useRef, useState } from 'react'
import { preloadPyodide, runPythonExtractVars } from '../lib/runPython'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SceneVars {
  season: string
  weather: string
  time_of_day: string
  npc_count: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_W = 640
const CANVAS_H = 360

const DEFAULT_CODE = `season = "summer"
weather = "sunny"
time_of_day = "day"
npc_count = 4`

const VAR_NAMES = ['season', 'weather', 'time_of_day', 'npc_count'] as const

const VALID = {
  season: ['summer', 'fall', 'winter', 'spring'],
  weather: ['sunny', 'rainy', 'stormy', 'windy'],
  time_of_day: ['day', 'night'],
}

const NPC_COUNT_MIN = 1
const NPC_COUNT_MAX = 8

const LEGEND_ROWS: { name: string; values: string[]; copyable: boolean }[] = [
  { name: 'season', values: VALID.season.map((s) => `"${s}"`), copyable: true },
  {
    name: 'weather',
    values: VALID.weather.map((s) => `"${s}"`),
    copyable: true,
  },
  {
    name: 'time_of_day',
    values: VALID.time_of_day.map((s) => `"${s}"`),
    copyable: true,
  },
  {
    name: 'npc_count',
    values: [`${NPC_COUNT_MIN}–${NPC_COUNT_MAX}`],
    copyable: false,
  },
]

const DEFAULT_VARS: SceneVars = {
  season: 'summer',
  weather: 'sunny',
  time_of_day: 'day',
  npc_count: 4,
}

// ── Sky palette ───────────────────────────────────────────────────────────────

const SKY_DAY: Record<string, number> = {
  sunny: 0x87ceeb,
  rainy: 0x708090,
  stormy: 0x3e4852,
  windy: 0x9eb8cc,
}

// Scene-wide ambient tint per weather — a gentle color wash over the whole
// world (under the night dim) so lighting matches the mood instead of every
// weather sharing identical flat daylight.
const WEATHER_TINT: Record<string, { color: number; alpha: number }> = {
  sunny: { color: 0xffd27f, alpha: 0.05 },
  rainy: { color: 0x5a7286, alpha: 0.14 },
  stormy: { color: 0x3a4654, alpha: 0.2 },
  windy: { color: 0xa8bccc, alpha: 0.06 },
}

const STAR_POSITIONS: [number, number][] = [
  [55, 22],
  [130, 55],
  [220, 14],
  [305, 42],
  [405, 26],
  [470, 62],
  [570, 78],
  [80, 88],
  [175, 95],
  [330, 80],
]

const CLOUD_POSITIONS: [number, number, number, number][] = [
  [100, 52, 84, 36],
  [162, 46, 52, 28],
  [370, 62, 92, 42],
  [432, 56, 56, 30],
  [528, 42, 72, 32],
]

// ── Isometric grid + sprite assets ─────────────────────────────────────────────

// Each season has two extra grass-tile variants (same PixelLab prompt,
// different seeds). Picking one per cell with a stable spatial hash breaks
// the repeating-texture moiré without the ground reshuffling between
// renders or season switches: ~50% base, 25% each variant.
function groundVariantKey(season: string, col: number, row: number): string {
  const hash = ((col * 73856093) ^ (row * 19349663)) >>> 0
  const roll = hash & 3
  const suffix = roll === 2 ? '-v1' : roll === 3 ? '-v2' : ''
  return `ground-${season}${suffix}`
}

// Ground texture for any cell: street rows get pavement (snow-covered in
// winter), everything else gets seasonal grass.
function cellGroundKey(season: string, col: number, row: number): string {
  if (row === ROAD_ROW) return season === 'winter' ? 'road-winter' : 'road'
  if (SIDEWALK_ROWS.includes(row))
    return season === 'winter' ? 'sidewalk-winter' : 'sidewalk'
  return groundVariantKey(season, col, row)
}

const treeKey = (season: string) => `tree-${season}`

// Scattered ground props. Kind is fixed per cell (stable hash); which kinds
// are visible depends on the season — flowers don't bloom on snow, and the
// snow-covered bush only exists in winter, so winter fields read barer.
const PROP_KINDS = ['flowers', 'tuft', 'rock', 'snowbush'] as const
type PropKind = (typeof PROP_KINDS)[number]
const PROP_KEYS: Record<PropKind, string> = {
  flowers: 'prop-flowers',
  tuft: 'prop-tuft',
  rock: 'prop-rock',
  snowbush: 'prop-snowbush',
}
const PROP_SEASONS: Record<PropKind, string[]> = {
  flowers: ['spring', 'summer'],
  tuft: ['spring', 'summer', 'fall'],
  rock: ['summer', 'fall', 'winter', 'spring'],
  snowbush: ['winter'],
}

// ~6% of cells get a prop, with a small deterministic offset so placement
// doesn't read as grid-aligned. Different mixing primes than the ground
// variant hash so the two patterns don't correlate.
function propForCell(
  col: number,
  row: number,
): { kind: PropKind; dx: number; dy: number } | null {
  const hash = ((col * 40503) ^ (row * 63689) ^ ((col + row) * 52361)) >>> 0
  if (hash % 100 >= 6) return null
  const kindRoll = (hash >> 8) % 100
  const kind: PropKind =
    kindRoll < 30
      ? 'flowers'
      : kindRoll < 70
        ? 'tuft'
        : kindRoll < 85
          ? 'rock'
          : 'snowbush'
  const dx = ((hash >> 16) % 17) - 8
  const dy = ((hash >> 21) % 9) - 4
  return { kind, dx, dy }
}
// Four distinct people (design 0 is the original and keeps its 'npc' asset
// prefix); each has all five seasonal/weather texture states. NPCs are
// assigned designs round-robin at spawn so even small crowds mix.
const NPC_DESIGN_PREFIXES = ['npc', 'npc2', 'npc3', 'npc4']
const NPC_STATES = ['summer', 'fall', 'winter', 'spring', 'rain']
const NPC_STATE_KEYS = NPC_DESIGN_PREFIXES.flatMap((prefix) =>
  NPC_STATES.map((state) => `${prefix}-${state}`),
)
const NPC_WALK_FRAME_COUNT = 6
type NpcFacing = 'south' | 'north' | 'east' | 'south-east' | 'north-east'
const NPC_FACINGS: NpcFacing[] = [
  'south',
  'north',
  'east',
  'south-east',
  'north-east',
]
const npcWalkAnimKey = (stateKey: string, facing: NpcFacing) =>
  `${stateKey}-walk-${facing}`
const npcWalkFrameKey = (stateKey: string, facing: NpcFacing, frame: number) =>
  `${stateKey}-walk-${facing}-${frame}`

const ASSET_KEYS = [
  'ground-summer',
  'ground-fall',
  'ground-winter',
  'ground-spring',
  ...['summer', 'fall', 'winter', 'spring'].flatMap((s) => [
    `ground-${s}-v1`,
    `ground-${s}-v2`,
  ]),
  'road',
  'road-winter',
  'sidewalk',
  'sidewalk-winter',
  ...Object.values(PROP_KEYS),
  'tree-summer',
  'tree-fall',
  'tree-winter',
  'tree-spring',
  'building',
  'building-school',
  'building-store',
  'building-house2',
  ...NPC_STATE_KEYS,
  ...NPC_STATE_KEYS.flatMap((stateKey) =>
    NPC_FACINGS.flatMap((facing) =>
      Array.from({ length: NPC_WALK_FRAME_COUNT }, (_, i) =>
        npcWalkFrameKey(stateKey, facing, i),
      ),
    ),
  ),
]

const GRID_SIZE = 16
const TILE_W = 48
const TILE_H_STEP = 12
const ORIGIN_X = CANVAS_W / 2
const ORIGIN_Y = 100

// Town layout on the 16×16 grid: four buildings around an open central
// park. `anchor` is where the sprite sits (and its render depth cell),
// `door` the walkable cell in front of the entrance, `inside` the cell
// behind the door that entering NPCs walk toward (hidden behind the
// building's front wall), and `blocked` the cell rectangle excluded from
// wander targets and prop placement.
interface BuildingDef {
  key: string
  anchor: { col: number; row: number }
  door: { col: number; row: number }
  inside: { col: number; row: number }
  originY: number
  blocked: { c0: number; c1: number; r0: number; r1: number }
}

// Main-street town plan: an east-west street (road row + sidewalks) spans
// the whole visible world. All buildings line the north side facing the
// street — houses first, then the store, then the school — with front-yard
// grass strips between their doors and the sidewalk. South of the street is
// the park: clustered trees, props, and open lawn.
const ROAD_ROW = 8
const SIDEWALK_ROWS = [7, 9]

const BUILDINGS: BuildingDef[] = [
  {
    key: 'building',
    anchor: { col: 1, row: 5 },
    door: { col: 1, row: 6 },
    inside: { col: 1, row: 5 },
    originY: 0.85,
    blocked: { c0: 0, c1: 2, r0: 3, r1: 5 },
  },
  {
    key: 'building-house2',
    anchor: { col: 4, row: 5 },
    door: { col: 4, row: 6 },
    inside: { col: 4, row: 5 },
    originY: 0.85,
    blocked: { c0: 3, c1: 5, r0: 3, r1: 5 },
  },
  {
    key: 'building-store',
    anchor: { col: 8, row: 5 },
    door: { col: 8, row: 6 },
    inside: { col: 8, row: 5 },
    originY: 0.85,
    blocked: { c0: 7, c1: 9, r0: 3, r1: 5 },
  },
  {
    key: 'building-school',
    anchor: { col: 12, row: 5 },
    door: { col: 12, row: 6 },
    inside: { col: 12, row: 5 },
    originY: 0.82,
    blocked: { c0: 10, c1: 14, r0: 1, r1: 5 },
  },
]

const buildingDepth = (b: BuildingDef) => b.anchor.col + b.anchor.row

// Park south of the street.
const TREE_ANCHORS = [
  { col: 2, row: 11 },
  { col: 4, row: 13 },
  { col: 6, row: 11 },
  { col: 3, row: 14 },
]

// The camera pins the grid's top vertex (the horizon) SKY_HEIGHT_PX from the
// top of the canvas so the scene reads as ground with a band of sky above it
// — decorative ground tiles fill the rest of the view below the horizon so
// the playable grid doesn't look like a floating island.
const SKY_HEIGHT_PX = 80
const CAMERA_SIDE_PAD = 24
const CAMERA_BOTTOM_PAD = 16
const CAMERA_MIN_ZOOM = 0.3
const CAMERA_MAX_ZOOM = 1

// Sky decor (sun/moon/stars/clouds) was laid out on the original 640×100
// sky strip; positions are remapped as fractions into whatever sky band the
// camera's zoom actually produces (view top → horizon).
const SKY_DESIGN_H = 100

function isoToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (col - row) * (TILE_W / 2),
    y: ORIGIN_Y + (col + row) * TILE_H_STEP,
  }
}

// Every ground tile (playable and decorative) shares one depth ordering by
// grid row (col+row), so each tile's art "skirt" is covered by the tile
// south of it regardless of which set the neighbor belongs to. A flat depth
// split (playable above decorative) exposed the skirts as dark seams along
// the playable grid's borders.
function groundDepth(col: number, row: number): number {
  return -1000 + (col + row) * 0.01
}

function isBlockedCell(col: number, row: number): boolean {
  return BUILDINGS.some(
    (b) =>
      col >= b.blocked.c0 &&
      col <= b.blocked.c1 &&
      row >= b.blocked.r0 &&
      row <= b.blocked.r1,
  )
}

function randomFreeCell(): { col: number; row: number } {
  let col: number
  let row: number
  do {
    col = Math.floor(Math.random() * GRID_SIZE)
    row = Math.floor(Math.random() * GRID_SIZE)
  } while (isBlockedCell(col, row))
  return { col, row }
}

type NpcMoveState = 'wandering' | 'entering' | 'inside' | 'exiting'

interface Npc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sprite: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shadow: any
  design: number
  col: number
  row: number
  targetCol: number
  targetRow: number
  state: NpcMoveState
  buildingIdx: number
  insideUntil: number
  speed: number
  facing: NpcFacing
  facingFlipped: boolean
}

// Facing is decided from the on-screen movement vector (not raw col/row
// delta) since the isometric projection makes a "straight" grid move look
// diagonal on screen. Full 8-way bucketing from only 5 generated directions:
// west/south-west/north-west mirror east/south-east/north-east via flipX.
function facingFromScreenDelta(
  dxScreen: number,
  dyScreen: number,
): { facing: NpcFacing; flipped: boolean } {
  const angleDeg = (Math.atan2(dyScreen, dxScreen) * 180) / Math.PI
  const normalized = ((angleDeg % 360) + 360) % 360
  const sector = Math.round(normalized / 45) % 8

  switch (sector) {
    case 0:
      return { facing: 'east', flipped: false }
    case 1:
      return { facing: 'south-east', flipped: false }
    case 2:
      return { facing: 'south', flipped: false }
    case 3:
      return { facing: 'south-east', flipped: true } // south-west
    case 4:
      return { facing: 'east', flipped: true } // west
    case 5:
      return { facing: 'north-east', flipped: true } // north-west
    case 6:
      return { facing: 'north', flipped: false }
    default:
      return { facing: 'north-east', flipped: false }
  }
}

// ── Error helpers ─────────────────────────────────────────────────────────────

function formatPythonError(msg: string): string {
  const nameMatch = msg.match(/NameError.*name '(\w+)' is not defined/)
  if (nameMatch) {
    const name = nameMatch[1]
    const allVals = [...VALID.season, ...VALID.weather, ...VALID.time_of_day]
    if (allVals.includes(name)) {
      return `Missing quotes: "${name}" needs quotation marks. Try: variable = "${name}"`
    }
    return `"${name}" is not defined. If it's a text value, put it in quotes: "${name}"`
  }
  if (
    msg.includes('SyntaxError') ||
    msg.includes('invalid syntax') ||
    msg.includes('IndentationError') ||
    msg.includes('TabError')
  ) {
    return `Syntax error. Each line should look like:\n  variable = "value"  or  variable = 4`
  }
  const lines = msg.split('\n')
  const errorLine = [...lines]
    .reverse()
    .find((l) => /^\w*Error:/.test(l.trim()))
  return `Python error: ${errorLine?.trim() ?? lines.find((l) => l.trim()) ?? msg}`
}

function validateVars(vars: Record<string, unknown>): string | null {
  const { season, weather, time_of_day, npc_count } = vars

  if (season === undefined) return `season is not set. Keep: season = "summer"`
  if (weather === undefined)
    return `weather is not set. Keep: weather = "sunny"`
  if (time_of_day === undefined)
    return `time_of_day is not set. Keep: time_of_day = "day"`
  if (npc_count === undefined)
    return `npc_count is not set. Keep: npc_count = 4`

  if (!VALID.season.includes(String(season)))
    return `"${season}" is not a valid season. Choose from: ${VALID.season.map((s) => `"${s}"`).join(', ')}`
  if (!VALID.weather.includes(String(weather)))
    return `"${weather}" is not a valid weather. Choose from: ${VALID.weather.map((s) => `"${s}"`).join(', ')}`
  if (!VALID.time_of_day.includes(String(time_of_day)))
    return `"${time_of_day}" is not a valid time. Choose from: ${VALID.time_of_day.map((s) => `"${s}"`).join(', ')}`

  const n = Number(npc_count)
  if (!Number.isInteger(n) || n < NPC_COUNT_MIN || n > NPC_COUNT_MAX)
    return `npc_count must be a whole number between ${NPC_COUNT_MIN} and ${NPC_COUNT_MAX} (got: ${npc_count})`

  return null
}

// ── Phaser scene factory ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeParkScene(P: any) {
  return class ParkScene extends P.Scene {
    vars: SceneVars = { ...DEFAULT_VARS }
    sceneReady = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bg: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weatherLayer: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snowLayer: any
    snowFlakes: Array<{ x: number; y: number; drift: number }> = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nightOverlay: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weatherTintOverlay: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nightSkyLayer: any
    shootingStar: {
      x: number
      y: number
      vx: number
      vy: number
      ttl: number
    } | null = null
    nextShootingStarAt = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groundTiles: any[][] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    decorativeTiles: any[] = []
    // Visible world rect (differs from CANVAS_W/H once the camera zooms out)
    view = { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }
    cloudRects: Array<{ x: number; y: number; rw: number; rh: number }> = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    treeSprites: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: Array<{ sprite: any; kind: PropKind }> = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildingSprites: any[] = []
    npcs: Npc[] = []
    drops: Array<{ x: number; y: number }> = []

    constructor() {
      super({ key: 'Park' })
    }

    preload() {
      for (const key of ASSET_KEYS) {
        this.load.image(key, `/sprites/variables/${key}.png`)
      }
    }

    create() {
      this.setupCamera()

      this.bg = this.add.graphics()
      this.bg.setDepth(-2000)

      this.groundTiles = []
      for (let row = 0; row < GRID_SIZE; row++) {
        const rowTiles = []
        for (let col = 0; col < GRID_SIZE; col++) {
          const { x, y } = isoToScreen(col, row)
          const tile = this.add.image(
            x,
            y,
            cellGroundKey(this.vars.season, col, row),
          )
          tile.setOrigin(0.5, 0.25)
          tile.setDepth(groundDepth(col, row))
          rowTiles.push(tile)
        }
        this.groundTiles.push(rowTiles)
      }

      // Decorative (non-walkable) ground beyond the playable grid: fills the
      // visible area below the horizon so the world reads as continuous
      // ground with sky above it, not a floating diamond.
      this.decorativeTiles = []
      const pad = TILE_W
      const range = 48
      for (let row = -range; row < GRID_SIZE + range; row++) {
        for (let col = -range; col < GRID_SIZE + range; col++) {
          const inPlayable =
            col >= 0 && col < GRID_SIZE && row >= 0 && row < GRID_SIZE
          if (inPlayable) continue
          const { x, y } = isoToScreen(col, row)
          if (y < ORIGIN_Y || y > this.view.y + this.view.h + pad) continue
          if (x < this.view.x - pad || x > this.view.x + this.view.w + pad)
            continue
          const tile = this.add.image(
            x,
            y,
            cellGroundKey(this.vars.season, col, row),
          )
          tile.setOrigin(0.5, 0.25)
          tile.setDepth(groundDepth(col, row))
          this.decorativeTiles.push({ tile, col, row })
        }
      }

      this.buildingSprites = BUILDINGS.map((b) => {
        const pos = isoToScreen(b.anchor.col, b.anchor.row)
        const sprite = this.add.image(pos.x, pos.y, b.key)
        sprite.setOrigin(0.5, b.originY)
        sprite.setDepth(buildingDepth(b))
        return sprite
      })

      this.treeSprites = TREE_ANCHORS.map(({ col, row }) => {
        const { x, y } = isoToScreen(col, row)
        const tree = this.add.image(x, y, treeKey(this.vars.season))
        tree.setOrigin(0.5, 0.92)
        tree.setDepth(col + row)
        return tree
      })

      this.props = []
      const tryPlaceProp = (col: number, row: number) => {
        // Keep building blocks (including doors), the street, and tree
        // cells clear.
        if (isBlockedCell(col, row)) return
        if (row === ROAD_ROW || SIDEWALK_ROWS.includes(row)) return
        if (TREE_ANCHORS.some((t) => t.col === col && t.row === row)) return
        const pick = propForCell(col, row)
        if (!pick) return
        const { x, y } = isoToScreen(col, row)
        const sprite = this.add.image(
          x + pick.dx,
          y + pick.dy,
          PROP_KEYS[pick.kind],
        )
        sprite.setOrigin(0.5, 0.85)
        sprite.setDepth(col + row)
        sprite.setVisible(PROP_SEASONS[pick.kind].includes(this.vars.season))
        this.props.push({ sprite, kind: pick.kind })
      }
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) tryPlaceProp(col, row)
      }
      for (const { col, row } of this.decorativeTiles) tryPlaceProp(col, row)

      this.nightSkyLayer = this.add.graphics()
      this.nightSkyLayer.setDepth(-1999)
      this.shootingStar = null
      this.nextShootingStarAt = 3000 + Math.random() * 5000

      this.weatherLayer = this.add.graphics()
      this.weatherLayer.setDepth(1000)
      this.snowLayer = this.add.graphics()
      this.snowLayer.setDepth(1000)
      this.snowFlakes = Array.from({ length: 90 }, () => ({
        x: this.view.x + Math.random() * this.view.w,
        y: this.view.y + Math.random() * this.view.h,
        drift: (Math.random() - 0.5) * 1.5,
      }))
      // Below the weather particles (1000) so rain/snow/leaves stay crisp
      // on top of the tinted scene.
      this.weatherTintOverlay = this.add.rectangle(
        this.view.x + this.view.w / 2,
        this.view.y + this.view.h / 2,
        this.view.w,
        this.view.h,
        0xffffff,
        0,
      )
      this.weatherTintOverlay.setDepth(999)

      this.nightOverlay = this.add.rectangle(
        this.view.x + this.view.w / 2,
        this.view.y + this.view.h / 2,
        this.view.w,
        this.view.h,
        0x000000,
        0,
      )
      this.nightOverlay.setDepth(1001)

      // Drops start at cloud undersides (not scattered mid-sky) so the
      // first rain visibly falls from the clouds.
      this.drops = Array.from({ length: 130 }, () => {
        const drop = { x: 0, y: 0 }
        this.resetRainDrop(drop)
        return drop
      })

      for (const stateKey of NPC_STATE_KEYS) {
        for (const facing of NPC_FACINGS) {
          const animKey = npcWalkAnimKey(stateKey, facing)
          if (this.anims.exists(animKey)) continue
          this.anims.create({
            key: animKey,
            frames: Array.from({ length: NPC_WALK_FRAME_COUNT }, (_, i) => ({
              key: npcWalkFrameKey(stateKey, facing, i),
            })),
            frameRate: 6,
            repeat: -1,
          })
        }
      }

      this.npcs = []
      this.spawnNpcs(this.vars.npc_count)

      this.drawSky()
      this.updateOverlays()
      this.sceneReady = true
    }

    // Static zoomed-out view (not scrollable/pannable). Zoom fits the whole
    // playable grid into the space below the sky band; the grid's top vertex
    // is pinned SKY_HEIGHT_PX from the canvas top so the horizon sits high
    // and ground fills the rest of the frame. Computed from GRID_SIZE, so it
    // stays correct as the grid grows in later phases.
    setupCamera() {
      const diamondW = (GRID_SIZE - 1) * TILE_W
      const diamondH = (GRID_SIZE - 1) * 2 * TILE_H_STEP
      const zoom = Math.min(
        CAMERA_MAX_ZOOM,
        Math.max(
          CAMERA_MIN_ZOOM,
          Math.min(
            (CANVAS_W - CAMERA_SIDE_PAD * 2) / diamondW,
            (CANVAS_H - SKY_HEIGHT_PX - CAMERA_BOTTOM_PAD) / diamondH,
          ),
        ),
      )

      const centerY = ORIGIN_Y + (CANVAS_H / 2 - SKY_HEIGHT_PX) / zoom
      this.cameras.main.setZoom(zoom)
      this.cameras.main.centerOn(ORIGIN_X, centerY)

      const w = CANVAS_W / zoom
      const h = CANVAS_H / zoom
      this.view = { x: ORIGIN_X - w / 2, y: centerY - h / 2, w, h }

      // Cloud rects live in world coords so rain can anchor to them even
      // when the sky is redrawn (e.g. rainy nights).
      const s = w / CANVAS_W
      this.cloudRects = CLOUD_POSITIONS.map(([cx, cy, rw, rh]) => ({
        x: this.skyX(cx),
        y: this.skyY(cy),
        rw: rw * s,
        rh: rh * s,
      }))
    }

    // Map original 640×100 sky-strip design coords into the actual sky band
    // (view top → horizon) the camera produced.
    skyX(px: number): number {
      return this.view.x + (px / CANVAS_W) * this.view.w
    }

    skyY(py: number): number {
      return this.view.y + (py / SKY_DESIGN_H) * (ORIGIN_Y - this.view.y)
    }

    drawSky() {
      this.bg.clear()

      const night = this.vars.time_of_day === 'night'
      const raining =
        this.vars.weather === 'rainy' || this.vars.weather === 'stormy'
      const skyColor = night
        ? 0x0d0d2b
        : (SKY_DAY[this.vars.weather] ?? 0x87ceeb)
      this.bg.fillStyle(skyColor)
      this.bg.fillRect(this.view.x, this.view.y, this.view.w, this.view.h)

      if (!night) {
        if (this.vars.weather === 'sunny') {
          this.drawSun()
        } else {
          this.drawClouds(false)
        }
      } else if (raining) {
        // Clouds also render on rainy nights so rain visibly falls from
        // them instead of appearing out of empty sky.
        this.drawClouds(true)
      }
    }

    drawClouds(night: boolean) {
      const stormy = this.vars.weather === 'stormy'
      const base = night ? 0x2a2a3e : stormy ? 0x4a4a52 : 0xcccccc
      const shadow = night ? 0x1d1d2e : stormy ? 0x33333c : 0xaaaaaa
      const highlight = night ? 0x3c3c55 : stormy ? 0x6b6b76 : 0xffffff
      const highlightAlpha = night ? 0.3 : stormy ? 0.25 : 0.55

      for (const { x: cx, y: cy, rw, rh } of this.cloudRects) {
        this.bg.fillStyle(shadow, 0.9)
        this.bg.fillEllipse(cx, cy + rh * 0.25, rw * 0.9, rh * 0.7)

        this.bg.fillStyle(base, 0.95)
        this.bg.fillEllipse(cx - rw * 0.3, cy, rw * 0.55, rh * 0.75)
        this.bg.fillEllipse(cx + rw * 0.32, cy + rh * 0.05, rw * 0.5, rh * 0.7)
        this.bg.fillEllipse(cx, cy - rh * 0.15, rw * 0.65, rh * 0.85)

        this.bg.fillStyle(highlight, highlightAlpha)
        this.bg.fillEllipse(cx - rw * 0.1, cy - rh * 0.3, rw * 0.35, rh * 0.35)
      }
    }

    drawSun() {
      const s = this.view.w / CANVAS_W
      const sx = this.skyX(560)
      const sy = this.skyY(54)

      this.bg.fillStyle(0xfff4a0, 0.22)
      this.bg.fillCircle(sx, sy, 46 * s)
      this.bg.fillStyle(0xfff4a0, 0.4)
      this.bg.fillCircle(sx, sy, 38 * s)

      this.bg.lineStyle(3, 0xffe066, 0.85)
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        this.bg.lineBetween(
          sx + Math.cos(angle) * 27 * s,
          sy + Math.sin(angle) * 27 * s,
          sx + Math.cos(angle) * 40 * s,
          sy + Math.sin(angle) * 40 * s,
        )
      }

      this.bg.fillStyle(0xffd700)
      this.bg.fillCircle(sx, sy, 24 * s)
      this.bg.fillStyle(0xfff2b0, 0.85)
      this.bg.fillCircle(sx - 6 * s, sy - 6 * s, 9 * s)
    }

    updateOverlays() {
      const tint = WEATHER_TINT[this.vars.weather] ?? WEATHER_TINT.sunny
      this.weatherTintOverlay.setFillStyle(tint.color, tint.alpha)
      this.nightOverlay.setAlpha(this.vars.time_of_day === 'night' ? 0.44 : 0)
      if (this.vars.time_of_day !== 'night') {
        this.nightSkyLayer.clear()
        this.shootingStar = null
      }
    }

    tickNightSky(time: number, delta: number) {
      this.nightSkyLayer.clear()

      // Overcast nights (rain clouds are drawn) hide the moon and stars —
      // otherwise the moon renders pasted on top of a storm cloud.
      if (this.vars.weather === 'rainy' || this.vars.weather === 'stormy') {
        this.shootingStar = null
        return
      }

      const scale = this.view.w / CANVAS_W
      this.nightSkyLayer.fillStyle(0xfff8dc)
      this.nightSkyLayer.fillCircle(this.skyX(540), this.skyY(42), 22 * scale)

      for (let i = 0; i < STAR_POSITIONS.length; i++) {
        const [sx, sy] = STAR_POSITIONS[i]
        const twinkle = 0.5 + 0.5 * Math.sin(time * 0.002 + i * 1.7)
        this.nightSkyLayer.fillStyle(0xffffff, 0.4 + twinkle * 0.6)
        const size = 1.5 + twinkle * 1.5
        this.nightSkyLayer.fillRect(this.skyX(sx), this.skyY(sy), size, size)
      }

      if (this.shootingStar) {
        const s = this.shootingStar
        s.x += s.vx
        s.y += s.vy
        s.ttl -= delta
        if (s.ttl <= 0) {
          this.shootingStar = null
        } else {
          this.nightSkyLayer.lineStyle(2, 0xffffff, Math.max(0, s.ttl / 500))
          this.nightSkyLayer.lineBetween(
            s.x,
            s.y,
            s.x - s.vx * 4,
            s.y - s.vy * 4,
          )
        }
      } else if (time > this.nextShootingStarAt) {
        this.shootingStar = {
          x: this.skyX(100 + Math.random() * 400),
          y: this.skyY(10 + Math.random() * 60),
          vx: 6 * scale,
          vy: 3 * scale,
          ttl: 500,
        }
        this.nextShootingStarAt = time + 4000 + Math.random() * 8000
      }
    }

    npcTextureKey(design: number): string {
      const { weather, season } = this.vars
      const state =
        weather === 'rainy' || weather === 'stormy' ? 'rain' : season
      return `${NPC_DESIGN_PREFIXES[design]}-${state}`
    }

    spawnNpcs(n: number) {
      for (let i = 0; i < n; i++) {
        const design = this.npcs.length % NPC_DESIGN_PREFIXES.length
        const { col, row } = randomFreeCell()
        const { x, y } = isoToScreen(col, row)
        const sprite = this.add.sprite(x, y, this.npcTextureKey(design))
        sprite.setOrigin(0.5, 0.88)
        sprite.setDepth(col + row + 0.5)
        sprite.play(npcWalkAnimKey(this.npcTextureKey(design), 'south'))

        // Soft contact shadow at the feet; syncNpcShadow keeps it glued to
        // the sprite through walking and the enter/exit fade tweens.
        const shadow = this.add.ellipse(x, y, 26, 10, 0x000000, 0.22)

        const npc: Npc = {
          sprite,
          shadow,
          design,
          col,
          row,
          targetCol: col,
          targetRow: row,
          state: 'wandering',
          buildingIdx: -1,
          insideUntil: 0,
          speed: 0.5 + Math.random() * 0.4,
          facing: 'south',
          facingFlipped: false,
        }
        this.pickNewWaypoint(npc)
        this.npcs.push(npc)
      }
    }

    resizeNpcs(n: number) {
      if (n > this.npcs.length) {
        this.spawnNpcs(n - this.npcs.length)
      } else if (n < this.npcs.length) {
        const excess = this.npcs.splice(n)
        for (const npc of excess) {
          npc.sprite.destroy()
          npc.shadow.destroy()
        }
      }
    }

    updateNpcTextures() {
      for (const npc of this.npcs) {
        npc.sprite.play(
          npcWalkAnimKey(this.npcTextureKey(npc.design), npc.facing),
          true,
        )
      }
    }

    clearNpcs() {
      for (const npc of this.npcs) {
        npc.sprite.destroy()
        npc.shadow.destroy()
      }
      this.npcs = []
    }

    pickNewWaypoint(npc: Npc) {
      if (Math.random() < 0.15) {
        const b = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)]
        npc.targetCol = b.door.col
        npc.targetRow = b.door.row
        return
      }
      // Bounded retry to avoid NPCs piling onto the same target cell; falls
      // back to the last candidate rather than looping forever on a full grid.
      let col = npc.col
      let row = npc.row
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidate = randomFreeCell()
        const isSelf =
          Math.abs(candidate.col - npc.col) < 0.1 &&
          Math.abs(candidate.row - npc.row) < 0.1
        const isTakenByOther = this.npcs.some(
          (other) =>
            other !== npc &&
            Math.abs(other.targetCol - candidate.col) < 0.1 &&
            Math.abs(other.targetRow - candidate.row) < 0.1,
        )
        col = candidate.col
        row = candidate.row
        if (!isSelf && !isTakenByOther) break
      }
      npc.targetCol = col
      npc.targetRow = row
    }

    // While walking through a doorway (entering/exiting), the NPC renders
    // behind the building sprite once past the midpoint between door and
    // inside cells — the front wall occludes them, reading as physically
    // going indoors instead of the old fade-out.
    placeNpc(npc: Npc) {
      const { x, y } = isoToScreen(npc.col, npc.row)
      npc.sprite.setPosition(x, y)
      if (
        (npc.state === 'entering' || npc.state === 'exiting') &&
        npc.buildingIdx >= 0
      ) {
        const b = BUILDINGS[npc.buildingIdx]
        const mid = (b.door.row + b.inside.row) / 2
        npc.sprite.setDepth(
          npc.row <= mid ? buildingDepth(b) - 0.2 : npc.col + npc.row + 0.5,
        )
      } else {
        npc.sprite.setDepth(npc.col + npc.row + 0.5)
      }
    }

    updateVars(newVars: SceneVars) {
      const prev = this.vars
      this.vars = { ...newVars }

      if (
        prev.season !== newVars.season ||
        prev.weather !== newVars.weather ||
        prev.time_of_day !== newVars.time_of_day
      ) {
        this.drawSky()
      }

      if (prev.season !== newVars.season) {
        for (let row = 0; row < GRID_SIZE; row++) {
          for (let col = 0; col < GRID_SIZE; col++) {
            this.groundTiles[row][col].setTexture(
              cellGroundKey(newVars.season, col, row),
            )
          }
        }
        for (const { tile, col, row } of this.decorativeTiles) {
          tile.setTexture(cellGroundKey(newVars.season, col, row))
        }
        for (const tree of this.treeSprites) {
          tree.setTexture(treeKey(newVars.season))
        }
        for (const prop of this.props) {
          prop.sprite.setVisible(
            PROP_SEASONS[prop.kind].includes(newVars.season),
          )
        }
      }

      // When weather switches into rain, snap all drops back to the clouds —
      // otherwise they'd start falling from wherever the last effect (or the
      // initial scatter) left them, mid-sky.
      const wasRaining = prev.weather === 'rainy' || prev.weather === 'stormy'
      const nowRaining =
        newVars.weather === 'rainy' || newVars.weather === 'stormy'
      if (nowRaining && !wasRaining) {
        for (const drop of this.drops) this.resetRainDrop(drop)
      }

      this.updateOverlays()
      this.updateNpcTextures()

      if (prev.npc_count !== newVars.npc_count) {
        this.resizeNpcs(newVars.npc_count)
      }
    }

    update(time: number, delta: number) {
      const { weather, season } = this.vars
      const windy = weather === 'windy'

      if (weather === 'rainy' || weather === 'stormy') {
        this.tickRain(weather === 'stormy')
      } else if (windy && season !== 'winter') {
        // Leaf particles don't belong on bare winter trees — winter's wind
        // is conveyed entirely by the snow blowing sideways instead.
        this.tickWind()
      } else {
        this.weatherLayer.clear()
      }

      if (windy) {
        this.tickTreeShake(time)
      } else {
        for (const tree of this.treeSprites) tree.setRotation(0)
      }

      if (season === 'winter') {
        this.tickSnow(delta, windy)
      } else {
        this.snowLayer.clear()
      }

      if (this.vars.time_of_day === 'night') {
        this.tickNightSky(time, delta)
      }

      for (const npc of this.npcs) {
        this.updateNpc(npc, time, delta)
      }
    }

    // Mirror the sprite's position/alpha/scale/visibility onto its shadow
    // every frame so the enter/exit tweens don't need to know about it.
    syncNpcShadow(npc: Npc) {
      npc.shadow.setPosition(npc.sprite.x, npc.sprite.y)
      npc.shadow.setDepth(npc.sprite.depth - 0.05)
      npc.shadow.setScale(npc.sprite.scaleX)
      npc.shadow.setAlpha(npc.sprite.visible ? npc.sprite.alpha : 0)
    }

    updateNpc(npc: Npc, time: number, delta: number) {
      this.syncNpcShadow(npc)

      if (npc.state === 'inside') {
        if (time >= npc.insideUntil) {
          const b = BUILDINGS[npc.buildingIdx]
          npc.col = b.inside.col
          npc.row = b.inside.row
          npc.targetCol = b.door.col
          npc.targetRow = b.door.row
          npc.state = 'exiting'
          npc.sprite.setVisible(true)
          this.placeNpc(npc)
        }
        return
      }

      const dx = npc.targetCol - npc.col
      const dy = npc.targetRow - npc.row
      const dist = Math.hypot(dx, dy)
      const step = (npc.speed * delta) / 1000

      if (dist <= step || dist < 0.02) {
        npc.col = npc.targetCol
        npc.row = npc.targetRow
        this.placeNpc(npc)

        if (npc.state === 'entering') {
          npc.sprite.setVisible(false)
          npc.state = 'inside'
          npc.insideUntil = time + 3000 + Math.random() * 4000
          return
        }
        if (npc.state === 'exiting') {
          npc.state = 'wandering'
          this.placeNpc(npc)
          this.pickNewWaypoint(npc)
          return
        }

        const doorIdx = BUILDINGS.findIndex(
          (b) => npc.col === b.door.col && npc.row === b.door.row,
        )
        if (doorIdx >= 0 && Math.random() < 0.35) {
          const b = BUILDINGS[doorIdx]
          npc.buildingIdx = doorIdx
          npc.state = 'entering'
          npc.targetCol = b.inside.col
          npc.targetRow = b.inside.row
        } else {
          this.pickNewWaypoint(npc)
        }
      } else {
        npc.col += (dx / dist) * step
        npc.row += (dy / dist) * step

        const screenDx = (dx - dy) * (TILE_W / 2)
        const screenDy = (dx + dy) * TILE_H_STEP
        const { facing, flipped } = facingFromScreenDelta(screenDx, screenDy)
        this.setNpcFacing(npc, facing, flipped)

        this.placeNpc(npc)
      }
    }

    setNpcFacing(npc: Npc, facing: NpcFacing, flipped: boolean) {
      if (npc.facing === facing && npc.facingFlipped === flipped) return
      npc.facing = facing
      npc.facingFlipped = flipped
      npc.sprite.setFlipX(flipped)
      npc.sprite.play(
        npcWalkAnimKey(this.npcTextureKey(npc.design), facing),
        true,
      )
    }

    tickRain(heavy: boolean) {
      this.weatherLayer.clear()
      const speed = heavy ? 9 : 5
      this.weatherLayer.lineStyle(heavy ? 2 : 1, 0x9bb8d8, heavy ? 0.8 : 0.6)
      for (const drop of this.drops) {
        drop.y += speed
        drop.x -= 1
        if (drop.y > this.view.y + this.view.h || drop.x < this.view.x - 10) {
          this.resetRainDrop(drop)
        }
        this.weatherLayer.lineBetween(
          drop.x,
          drop.y,
          drop.x - 2,
          drop.y + (heavy ? 12 : 7),
        )
      }
    }

    resetRainDrop(drop: { x: number; y: number }) {
      const cloud =
        this.cloudRects[Math.floor(Math.random() * this.cloudRects.length)]
      drop.x = cloud.x + (Math.random() - 0.5) * cloud.rw
      drop.y = cloud.y + cloud.rh * 0.6 + Math.random() * 6
    }

    // Gentle sway — reads as "some wind", not a storm (tuned down per
    // developer feedback: trees were shaking too vigorously).
    tickTreeShake(time: number) {
      for (let i = 0; i < this.treeSprites.length; i++) {
        const angle = Math.sin(time * 0.0045 + i * 1.3) * 0.028
        this.treeSprites[i].setRotation(angle)
      }
    }

    tickWind() {
      this.weatherLayer.clear()
      const leafColors = [0xcc6600, 0xaa4411, 0xdd8833, 0xbb7700]
      const { x: vx, y: vy, w: vw, h: vh } = this.view
      for (let i = 0; i < 20; i++) {
        const drop = this.drops[i]
        drop.x =
          vx + ((((drop.x - vx + 2.2) % (vw + 30)) + vw + 30) % (vw + 30))
        drop.y += Math.sin(drop.x * 0.025 + i * 0.7) * 1.2
        if (drop.y > vy + vh - 20) drop.y = vy + 8 + Math.random() * (vh - 40)
        if (drop.y < vy) drop.y = vy + vh - 20
        this.weatherLayer.fillStyle(leafColors[i % 4], 0.82)
        this.weatherLayer.fillEllipse(drop.x, drop.y, 10, 5)
      }
    }

    tickSnow(delta: number, windy: boolean) {
      this.snowLayer.clear()
      this.snowLayer.fillStyle(0xffffff, 0.9)
      const speed = (30 * delta) / 1000
      const windBlow = windy ? 2.5 : 0
      const { x: vx, y: vy, w: vw, h: vh } = this.view
      for (const flake of this.snowFlakes) {
        flake.y += speed
        flake.x += flake.drift + windBlow
        if (flake.y > vy + vh) {
          flake.y = vy - 5
          flake.x = vx + Math.random() * vw
        }
        if (flake.x < vx - 10) flake.x = vx + vw
        if (flake.x > vx + vw + 10) flake.x = vx
        this.snowLayer.fillCircle(flake.x, flake.y, 2)
      }
    }
  }
}

// ── React component ───────────────────────────────────────────────────────────

export default function VariablesInteractive() {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gameRef = useRef<any>(null)

  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [copiedChip, setCopiedChip] = useState<string | null>(null)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    preloadPyodide()
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  async function handleCopyValue(chipKey: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard unavailable (permissions/non-secure context) — the chip
      // simply won't confirm; the student can still select the text manually.
      return
    }
    setCopiedChip(chipKey)
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setCopiedChip(null), 1200)
  }

  useEffect(() => {
    if (!editorContainerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: DEFAULT_CODE,
        extensions: [basicSetup, python()],
      }),
      parent: editorContainerRef.current,
    })
    viewRef.current = view
    return () => view.destroy()
  }, [])

  useEffect(() => {
    const container = gameContainerRef.current
    if (!container) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let game: any
    import('phaser').then((module) => {
      const P = module.default
      const ParkScene = makeParkScene(P)
      game = new P.Game({
        type: P.AUTO,
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: '#87ceeb',
        scene: ParkScene,
        parent: container,
        banner: false,
        fps: { target: 30 },
        scale: {
          mode: P.Scale.FIT,
          autoCenter: P.Scale.CENTER_BOTH,
        },
      })
      gameRef.current = game
    })
    return () => {
      game?.destroy(true)
      gameRef.current = null
    }
  }, [])

  async function handleRun() {
    if (!viewRef.current || isRunning) return
    const code = viewRef.current.state.doc.toString()
    setIsRunning(true)
    setError(null)

    try {
      const { vars, error: pyError } = await runPythonExtractVars(
        code,
        VAR_NAMES,
      )

      if (pyError) {
        setError(formatPythonError(pyError))
        return
      }

      const valErr = validateVars(vars)
      if (valErr) {
        setError(valErr)
        return
      }

      const newVars: SceneVars = {
        season: String(vars.season),
        weather: String(vars.weather),
        time_of_day: String(vars.time_of_day),
        npc_count: Math.round(Number(vars.npc_count)),
      }

      const scene = gameRef.current?.scene?.getScene('Park')
      if (!scene?.sceneReady) {
        setError('Scene is still loading — try again in a moment.')
        return
      }
      scene.updateVars(newVars)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="my-6 flex flex-col gap-3">
      <div
        ref={editorContainerRef}
        className="overflow-hidden rounded border border-gray-300"
      />
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Available values
          <span className="ml-2 font-normal normal-case text-gray-400">
            click a value to copy it
          </span>
        </div>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
          {LEGEND_ROWS.map(({ name, values, copyable }) => (
            <Fragment key={name}>
              <dt className="font-mono text-sm font-medium text-gray-900">
                {name}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {values.map((v) => {
                  const chipKey = `${name}:${v}`
                  if (!copyable) {
                    return (
                      <span
                        key={v}
                        className="rounded border border-gray-300 bg-white px-2 py-0.5 font-mono text-xs text-gray-700"
                      >
                        {v}
                      </span>
                    )
                  }
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleCopyValue(chipKey, v)}
                      title="Copy to clipboard"
                      className="group inline-flex cursor-pointer items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 font-mono text-xs text-gray-700 transition-colors hover:border-blue-400 hover:text-blue-700"
                    >
                      {v}
                      {copiedChip === chipKey ? (
                        <span aria-hidden="true" className="text-green-600">
                          ✓
                        </span>
                      ) : (
                        <svg
                          aria-hidden="true"
                          className="h-3 w-3 text-gray-400 group-hover:text-blue-500"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
                          <path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </dd>
            </Fragment>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Running…' : 'Update Scene ▶'}
        </button>
        {error && (
          <div className="flex-1 whitespace-pre-line rounded border border-red-200 bg-red-50 px-3 py-2 font-mono text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
      <div
        ref={gameContainerRef}
        className="aspect-video w-full overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      />
    </div>
  )
}
