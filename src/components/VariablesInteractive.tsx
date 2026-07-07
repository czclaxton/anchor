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

const LEGEND_ROWS: { name: string; values: string[] }[] = [
  { name: 'season', values: VALID.season.map((s) => `"${s}"`) },
  { name: 'weather', values: VALID.weather.map((s) => `"${s}"`) },
  { name: 'time_of_day', values: VALID.time_of_day.map((s) => `"${s}"`) },
  { name: 'npc_count', values: [`${NPC_COUNT_MIN}–${NPC_COUNT_MAX}`] },
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

const groundKey = (season: string) => `ground-${season}`
const treeKey = (season: string) => `tree-${season}`
const npcKey = (season: string) => `npc-${season}`
const NPC_RAIN_KEY = 'npc-rain'
const BUILDING_KEY = 'building'

const NPC_STATE_KEYS = [
  'npc-summer',
  'npc-fall',
  'npc-winter',
  'npc-spring',
  NPC_RAIN_KEY,
]
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
  'tree-summer',
  'tree-fall',
  'tree-winter',
  'tree-spring',
  'building',
  ...NPC_STATE_KEYS,
  ...NPC_STATE_KEYS.flatMap((stateKey) =>
    NPC_FACINGS.flatMap((facing) =>
      Array.from({ length: NPC_WALK_FRAME_COUNT }, (_, i) =>
        npcWalkFrameKey(stateKey, facing, i),
      ),
    ),
  ),
]

const GRID_SIZE = 12
const TILE_W = 48
const TILE_H_STEP = 12
const ORIGIN_X = CANVAS_W / 2
const ORIGIN_Y = 100

// Building/door/tree layout is unchanged relative to the original 6×6 grid,
// just recentered (+3 col/row) so the single building doesn't sit in a
// corner of the larger 12×12 field. Later phases (school, streets, cars)
// will place additional content around this anchor.
const BUILDING_ANCHOR = { col: 4, row: 4 }
const DOOR_CELL = { col: 4, row: 5 }
const TREE_ANCHORS = [
  { col: 7, row: 3 },
  { col: 8, row: 6 },
  { col: 3, row: 7 },
]

// Padding (in screen px) added around the grid's projected bounding box when
// fitting the camera, to account for sprites that extend beyond their anchor
// point (building/tree height, tile width) rather than clipping them at the
// grid edge.
const CAMERA_FIT_PAD_X = TILE_W
const CAMERA_FIT_PAD_TOP = 140
const CAMERA_FIT_PAD_BOTTOM = 60
const CAMERA_MIN_ZOOM = 0.3
const CAMERA_MAX_ZOOM = 1

function isoToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: ORIGIN_X + (col - row) * (TILE_W / 2),
    y: ORIGIN_Y + (col + row) * TILE_H_STEP,
  }
}

function isBuildingCell(col: number, row: number): boolean {
  return col === BUILDING_ANCHOR.col && row === BUILDING_ANCHOR.row
}

function randomFreeCell(): { col: number; row: number } {
  let col: number
  let row: number
  do {
    col = Math.floor(Math.random() * GRID_SIZE)
    row = Math.floor(Math.random() * GRID_SIZE)
  } while (isBuildingCell(col, row))
  return { col, row }
}

type NpcMoveState = 'wandering' | 'entering' | 'inside' | 'exiting'

interface Npc {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sprite: any
  col: number
  row: number
  targetCol: number
  targetRow: number
  state: NpcMoveState
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
    treeSprites: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildingSprite: any
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
      this.bg = this.add.graphics()
      this.bg.setDepth(-2000)

      this.groundTiles = []
      for (let row = 0; row < GRID_SIZE; row++) {
        const rowTiles = []
        for (let col = 0; col < GRID_SIZE; col++) {
          const { x, y } = isoToScreen(col, row)
          const tile = this.add.image(x, y, groundKey(this.vars.season))
          tile.setOrigin(0.5, 0.25)
          tile.setDepth(-1000)
          rowTiles.push(tile)
        }
        this.groundTiles.push(rowTiles)
      }

      const bPos = isoToScreen(BUILDING_ANCHOR.col, BUILDING_ANCHOR.row)
      this.buildingSprite = this.add.image(bPos.x, bPos.y, BUILDING_KEY)
      this.buildingSprite.setOrigin(0.5, 0.85)
      this.buildingSprite.setDepth(BUILDING_ANCHOR.col + BUILDING_ANCHOR.row)

      this.treeSprites = TREE_ANCHORS.map(({ col, row }) => {
        const { x, y } = isoToScreen(col, row)
        const tree = this.add.image(x, y, treeKey(this.vars.season))
        tree.setOrigin(0.5, 0.92)
        tree.setDepth(col + row)
        return tree
      })

      this.nightSkyLayer = this.add.graphics()
      this.nightSkyLayer.setDepth(-1999)
      this.shootingStar = null
      this.nextShootingStarAt = 3000 + Math.random() * 5000

      this.weatherLayer = this.add.graphics()
      this.weatherLayer.setDepth(1000)
      this.snowLayer = this.add.graphics()
      this.snowLayer.setDepth(1000)
      this.snowFlakes = Array.from({ length: 60 }, () => ({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        drift: (Math.random() - 0.5) * 1.5,
      }))
      this.nightOverlay = this.add.rectangle(
        CANVAS_W / 2,
        CANVAS_H / 2,
        CANVAS_W,
        CANVAS_H,
        0x000000,
        0,
      )
      this.nightOverlay.setDepth(1001)

      this.drops = Array.from({ length: 100 }, () => {
        const drop = { x: 0, y: 0 }
        this.resetRainDrop(drop)
        drop.y = Math.random() * CANVAS_H
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

      this.fitCameraToGrid()
      this.drawSky()
      this.updateOverlays()
      this.sceneReady = true
    }

    // Static zoomed-out view of the whole grid (not a scrollable/pannable
    // camera) — computed from the grid's projected iso bounds so it stays
    // correct as GRID_SIZE grows in later phases.
    fitCameraToGrid() {
      const corners = [
        isoToScreen(0, 0),
        isoToScreen(GRID_SIZE - 1, 0),
        isoToScreen(0, GRID_SIZE - 1),
        isoToScreen(GRID_SIZE - 1, GRID_SIZE - 1),
      ]
      const minX = Math.min(...corners.map((c) => c.x)) - CAMERA_FIT_PAD_X
      const maxX = Math.max(...corners.map((c) => c.x)) + CAMERA_FIT_PAD_X
      const minY = Math.min(...corners.map((c) => c.y)) - CAMERA_FIT_PAD_TOP
      const maxY = Math.max(...corners.map((c) => c.y)) + CAMERA_FIT_PAD_BOTTOM

      const width = maxX - minX
      const height = maxY - minY
      const zoom = Math.min(
        CAMERA_MAX_ZOOM,
        Math.max(
          CAMERA_MIN_ZOOM,
          Math.min(CANVAS_W / width, CANVAS_H / height),
        ),
      )

      this.cameras.main.setZoom(zoom)
      this.cameras.main.centerOn((minX + maxX) / 2, (minY + maxY) / 2)
    }

    drawSky() {
      this.bg.clear()

      const skyColor =
        this.vars.time_of_day === 'night'
          ? 0x0d0d2b
          : (SKY_DAY[this.vars.weather] ?? 0x87ceeb)
      this.bg.fillStyle(skyColor)
      this.bg.fillRect(0, 0, CANVAS_W, CANVAS_H)

      if (this.vars.time_of_day !== 'night') {
        if (this.vars.weather === 'sunny') {
          this.drawSun()
        } else {
          this.drawClouds()
        }
      }
    }

    drawClouds() {
      const stormy = this.vars.weather === 'stormy'
      const base = stormy ? 0x4a4a52 : 0xcccccc
      const shadow = stormy ? 0x33333c : 0xaaaaaa
      const highlight = stormy ? 0x6b6b76 : 0xffffff

      for (const [cx, cy, rw, rh] of CLOUD_POSITIONS) {
        this.bg.fillStyle(shadow, 0.9)
        this.bg.fillEllipse(cx, cy + rh * 0.25, rw * 0.9, rh * 0.7)

        this.bg.fillStyle(base, 0.95)
        this.bg.fillEllipse(cx - rw * 0.3, cy, rw * 0.55, rh * 0.75)
        this.bg.fillEllipse(cx + rw * 0.32, cy + rh * 0.05, rw * 0.5, rh * 0.7)
        this.bg.fillEllipse(cx, cy - rh * 0.15, rw * 0.65, rh * 0.85)

        this.bg.fillStyle(highlight, stormy ? 0.25 : 0.55)
        this.bg.fillEllipse(cx - rw * 0.1, cy - rh * 0.3, rw * 0.35, rh * 0.35)
      }
    }

    drawSun() {
      const sx = 560
      const sy = 44

      this.bg.fillStyle(0xfff4a0, 0.22)
      this.bg.fillCircle(sx, sy, 52)
      this.bg.fillStyle(0xfff4a0, 0.4)
      this.bg.fillCircle(sx, sy, 38)

      this.bg.lineStyle(3, 0xffe066, 0.85)
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2
        this.bg.lineBetween(
          sx + Math.cos(angle) * 27,
          sy + Math.sin(angle) * 27,
          sx + Math.cos(angle) * 40,
          sy + Math.sin(angle) * 40,
        )
      }

      this.bg.fillStyle(0xffd700)
      this.bg.fillCircle(sx, sy, 24)
      this.bg.fillStyle(0xfff2b0, 0.85)
      this.bg.fillCircle(sx - 6, sy - 6, 9)
    }

    updateOverlays() {
      this.nightOverlay.setAlpha(this.vars.time_of_day === 'night' ? 0.44 : 0)
      if (this.vars.time_of_day !== 'night') {
        this.nightSkyLayer.clear()
        this.shootingStar = null
      }
    }

    tickNightSky(time: number, delta: number) {
      this.nightSkyLayer.clear()

      this.nightSkyLayer.fillStyle(0xfff8dc)
      this.nightSkyLayer.fillCircle(540, 42, 22)

      for (let i = 0; i < STAR_POSITIONS.length; i++) {
        const [sx, sy] = STAR_POSITIONS[i]
        const twinkle = 0.5 + 0.5 * Math.sin(time * 0.002 + i * 1.7)
        this.nightSkyLayer.fillStyle(0xffffff, 0.4 + twinkle * 0.6)
        const size = 1.5 + twinkle * 1.5
        this.nightSkyLayer.fillRect(sx, sy, size, size)
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
          x: 100 + Math.random() * 400,
          y: 10 + Math.random() * 60,
          vx: 6,
          vy: 3,
          ttl: 500,
        }
        this.nextShootingStarAt = time + 4000 + Math.random() * 8000
      }
    }

    currentNpcTextureKey(): string {
      const { weather, season } = this.vars
      if (weather === 'rainy' || weather === 'stormy') return NPC_RAIN_KEY
      return npcKey(season)
    }

    spawnNpcs(n: number) {
      for (let i = 0; i < n; i++) {
        const { col, row } = randomFreeCell()
        const { x, y } = isoToScreen(col, row)
        const sprite = this.add.sprite(x, y, this.currentNpcTextureKey())
        sprite.setOrigin(0.5, 0.88)
        sprite.setDepth(col + row + 0.5)
        sprite.play(npcWalkAnimKey(this.currentNpcTextureKey(), 'south'))

        const npc: Npc = {
          sprite,
          col,
          row,
          targetCol: col,
          targetRow: row,
          state: 'wandering',
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
          this.tweens.killTweensOf(npc.sprite)
          npc.sprite.destroy()
        }
      }
    }

    updateNpcTextures() {
      const stateKey = this.currentNpcTextureKey()
      for (const npc of this.npcs) {
        npc.sprite.play(npcWalkAnimKey(stateKey, npc.facing), true)
      }
    }

    clearNpcs() {
      for (const npc of this.npcs) {
        this.tweens.killTweensOf(npc.sprite)
        npc.sprite.destroy()
      }
      this.npcs = []
    }

    pickNewWaypoint(npc: Npc) {
      if (Math.random() < 0.15) {
        npc.targetCol = DOOR_CELL.col
        npc.targetRow = DOOR_CELL.row
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

    placeNpc(npc: Npc) {
      const { x, y } = isoToScreen(npc.col, npc.row)
      npc.sprite.setPosition(x, y)
      npc.sprite.setDepth(npc.col + npc.row + 0.5)
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
        for (const row of this.groundTiles) {
          for (const tile of row) tile.setTexture(groundKey(newVars.season))
        }
        for (const tree of this.treeSprites) {
          tree.setTexture(treeKey(newVars.season))
        }
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

    updateNpc(npc: Npc, time: number, delta: number) {
      if (npc.state === 'entering' || npc.state === 'exiting') return

      if (npc.state === 'inside') {
        if (time >= npc.insideUntil) {
          npc.col = DOOR_CELL.col
          npc.row = DOOR_CELL.row
          npc.state = 'exiting'
          this.placeNpc(npc)
          npc.sprite.setVisible(true)
          npc.sprite.setAlpha(0)
          npc.sprite.setScale(0.4)
          this.tweens.add({
            targets: npc.sprite,
            alpha: 1,
            scale: 1,
            duration: 400,
            onComplete: () => {
              npc.state = 'wandering'
              this.pickNewWaypoint(npc)
            },
          })
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

        const atDoor = npc.col === DOOR_CELL.col && npc.row === DOOR_CELL.row
        if (atDoor && npc.state === 'wandering' && Math.random() < 0.35) {
          npc.state = 'entering'
          this.tweens.add({
            targets: npc.sprite,
            alpha: 0,
            scale: 0.4,
            duration: 400,
            onComplete: () => {
              npc.sprite.setVisible(false)
              npc.state = 'inside'
              npc.insideUntil = time + 3000 + Math.random() * 4000
            },
          })
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
      npc.sprite.play(npcWalkAnimKey(this.currentNpcTextureKey(), facing), true)
    }

    tickRain(heavy: boolean) {
      this.weatherLayer.clear()
      const speed = heavy ? 9 : 5
      this.weatherLayer.lineStyle(heavy ? 2 : 1, 0x9bb8d8, heavy ? 0.8 : 0.6)
      for (const drop of this.drops) {
        drop.y += speed
        drop.x -= 1
        if (drop.y > CANVAS_H || drop.x < 0) {
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
      const [cx, cy, rw] =
        CLOUD_POSITIONS[Math.floor(Math.random() * CLOUD_POSITIONS.length)]
      drop.x = cx + (Math.random() - 0.5) * rw
      drop.y = cy + 12 + Math.random() * 14
    }

    tickTreeShake(time: number) {
      for (let i = 0; i < this.treeSprites.length; i++) {
        const angle = Math.sin(time * 0.006 + i * 1.3) * 0.06
        this.treeSprites[i].setRotation(angle)
      }
    }

    tickWind() {
      this.weatherLayer.clear()
      const leafColors = [0xcc6600, 0xaa4411, 0xdd8833, 0xbb7700]
      for (let i = 0; i < 20; i++) {
        const drop = this.drops[i]
        drop.x = (drop.x + 4.5) % (CANVAS_W + 30)
        drop.y += Math.sin(drop.x * 0.025 + i * 0.7) * 1.8
        if (drop.y > CANVAS_H - 20) drop.y = 8 + Math.random() * (CANVAS_H - 40)
        if (drop.y < 0) drop.y = CANVAS_H - 20
        this.weatherLayer.fillStyle(leafColors[i % 4], 0.82)
        this.weatherLayer.fillEllipse(drop.x, drop.y, 10, 5)
      }
    }

    tickSnow(delta: number, windy: boolean) {
      this.snowLayer.clear()
      this.snowLayer.fillStyle(0xffffff, 0.9)
      const speed = (40 * delta) / 1000
      const windBlow = windy ? 6 : 0
      for (const flake of this.snowFlakes) {
        flake.y += speed
        flake.x += flake.drift + windBlow
        if (flake.y > CANVAS_H) {
          flake.y = -5
          flake.x = Math.random() * CANVAS_W
        }
        if (flake.x < -10) flake.x = CANVAS_W
        if (flake.x > CANVAS_W + 10) flake.x = 0
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

  useEffect(() => {
    preloadPyodide()
  }, [])

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
        </div>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
          {LEGEND_ROWS.map(({ name, values }) => (
            <Fragment key={name}>
              <dt className="font-mono text-sm font-medium text-gray-900">
                {name}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {values.map((v) => (
                  <span
                    key={v}
                    className="rounded border border-gray-300 bg-white px-2 py-0.5 font-mono text-xs text-gray-700"
                  >
                    {v}
                  </span>
                ))}
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
