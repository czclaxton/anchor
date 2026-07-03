import { basicSetup } from 'codemirror'
import { python } from '@codemirror/lang-python'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef, useState } from 'react'
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
  'npc-summer',
  'npc-fall',
  'npc-winter',
  'npc-spring',
  'npc-rain',
]

const GRID_SIZE = 6
const TILE_W = 48
const TILE_H_STEP = 12
const ORIGIN_X = CANVAS_W / 2
const ORIGIN_Y = 100

const BUILDING_ANCHOR = { col: 1, row: 1 }
const DOOR_CELL = { col: 1, row: 2 }
const TREE_ANCHORS = [
  { col: 4, row: 0 },
  { col: 5, row: 3 },
  { col: 0, row: 4 },
]

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
  if (!Number.isInteger(n) || n < 1 || n > 8)
    return `npc_count must be a whole number between 1 and 8 (got: ${npc_count})`

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
    nightOverlay: any
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

      this.weatherLayer = this.add.graphics()
      this.weatherLayer.setDepth(1000)
      this.nightOverlay = this.add.rectangle(
        CANVAS_W / 2,
        CANVAS_H / 2,
        CANVAS_W,
        CANVAS_H,
        0x000000,
        0,
      )
      this.nightOverlay.setDepth(1001)

      this.drops = Array.from({ length: 100 }, () => ({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
      }))

      this.npcs = []
      this.spawnNpcs(this.vars.npc_count)

      this.drawSky()
      this.updateOverlays()
      this.sceneReady = true
    }

    drawSky() {
      this.bg.clear()

      const skyColor =
        this.vars.time_of_day === 'night'
          ? 0x0d0d2b
          : (SKY_DAY[this.vars.weather] ?? 0x87ceeb)
      this.bg.fillStyle(skyColor)
      this.bg.fillRect(0, 0, CANVAS_W, CANVAS_H)

      if (this.vars.time_of_day === 'night') {
        this.bg.fillStyle(0xfff8dc)
        this.bg.fillCircle(540, 42, 22)
        this.bg.fillStyle(0xffffff)
        for (const [sx, sy] of STAR_POSITIONS) {
          this.bg.fillRect(sx, sy, 2, 2)
        }
      } else if (this.vars.weather === 'sunny') {
        this.bg.fillStyle(0xfff4a0, 0.45)
        this.bg.fillCircle(560, 44, 42)
        this.bg.fillStyle(0xffd700)
        this.bg.fillCircle(560, 44, 30)
      } else {
        const cloudColor = this.vars.weather === 'stormy' ? 0x555555 : 0xcccccc
        this.bg.fillStyle(cloudColor, 0.9)
        for (const [cx, cy, rw, rh] of CLOUD_POSITIONS) {
          this.bg.fillEllipse(cx, cy, rw, rh)
        }
      }
    }

    updateOverlays() {
      this.nightOverlay.setAlpha(this.vars.time_of_day === 'night' ? 0.44 : 0)
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
        const sprite = this.add.image(x, y, this.currentNpcTextureKey())
        sprite.setOrigin(0.5, 0.88)
        sprite.setDepth(col + row + 0.5)

        const npc: Npc = {
          sprite,
          col,
          row,
          targetCol: col,
          targetRow: row,
          state: 'wandering',
          insideUntil: 0,
          speed: 0.5 + Math.random() * 0.4,
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
      const key = this.currentNpcTextureKey()
      for (const npc of this.npcs) npc.sprite.setTexture(key)
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
      let col: number
      let row: number
      do {
        ;({ col, row } = randomFreeCell())
      } while (Math.abs(col - npc.col) < 0.1 && Math.abs(row - npc.row) < 0.1)
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
      const { weather } = this.vars
      if (weather === 'rainy' || weather === 'stormy') {
        this.tickRain(weather === 'stormy')
      } else if (weather === 'windy') {
        this.tickWind()
      } else {
        this.weatherLayer.clear()
      }

      for (const npc of this.npcs) {
        this.updateNpc(npc, time, delta)
      }
    }

    updateNpc(npc: Npc, time: number, delta: number) {
      if (npc.state === 'entering') return

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
            },
          })
          this.pickNewWaypoint(npc)
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
        npc.sprite.setFlipX(dx < 0)
        this.placeNpc(npc)
      }
    }

    tickRain(heavy: boolean) {
      this.weatherLayer.clear()
      const speed = heavy ? 9 : 5
      this.weatherLayer.lineStyle(heavy ? 2 : 1, 0x9bb8d8, heavy ? 0.8 : 0.6)
      for (const drop of this.drops) {
        drop.y = (drop.y + speed) % CANVAS_H
        drop.x = (drop.x - 1 + CANVAS_W) % CANVAS_W
        this.weatherLayer.lineBetween(
          drop.x,
          drop.y,
          drop.x - 2,
          drop.y + (heavy ? 12 : 7),
        )
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
        className="overflow-hidden rounded-lg border border-gray-200 shadow-sm"
      />
    </div>
  )
}
