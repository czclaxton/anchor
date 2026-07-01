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
const GROUND_Y = 225

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

// ── Color palettes ────────────────────────────────────────────────────────────

const SKY_DAY: Record<string, number> = {
  sunny: 0x87ceeb,
  rainy: 0x708090,
  stormy: 0x3e4852,
  windy: 0x9eb8cc,
}

const GROUND_COLORS: Record<string, number> = {
  summer: 0x4a8c42,
  fall: 0x7d6020,
  winter: 0xdeeef2,
  spring: 0x5eb838,
}

const CANOPY_COLORS: Record<string, number | null> = {
  summer: 0x2e8b57,
  fall: 0xcc6600,
  winter: null,
  spring: 0x7cbf47,
}

const NPC_PALETTES: Record<string, number[]> = {
  summer: [
    0xffd700, 0xff6b35, 0xff1493, 0x00ced1, 0xadff2f, 0xff4500, 0x9400d3,
    0x00ff7f,
  ],
  fall: [
    0xcc6622, 0xaa4411, 0xbb7733, 0x885522, 0x996633, 0xaa5544, 0x774422,
    0xbb6611,
  ],
  winter: [
    0x4488bb, 0x336699, 0x557799, 0x2255aa, 0x3366bb, 0x4477aa, 0x5588cc,
    0x2244aa,
  ],
  spring: [
    0x88dd44, 0xcc88ff, 0xff99bb, 0x44aadd, 0x77cc55, 0xbb77ee, 0xff88aa,
    0x33bbdd,
  ],
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
  if (msg.includes('SyntaxError') || msg.includes('invalid syntax')) {
    return `Syntax error. Each line should look like:\n  variable = "value"  or  variable = 4`
  }
  const firstLine = msg.split('\n').find((l) => l.trim())
  return `Python error: ${firstLine ?? msg}`
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bg: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    treeLayer: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weatherLayer: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nightOverlay: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    npcs: any[] = []
    drops: Array<{ x: number; y: number }> = []

    constructor() {
      super({ key: 'Park' })
    }

    create() {
      this.bg = this.add.graphics()
      this.treeLayer = this.add.graphics()
      this.treeLayer.setDepth(1)
      this.weatherLayer = this.add.graphics()
      this.weatherLayer.setDepth(9)
      this.nightOverlay = this.add.rectangle(
        CANVAS_W / 2,
        CANVAS_H / 2,
        CANVAS_W,
        CANVAS_H,
        0x000000,
        0,
      )
      this.nightOverlay.setDepth(10)

      this.drops = Array.from({ length: 100 }, () => ({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
      }))

      this.drawBackground()
      this.drawTrees()
      this.updateOverlays()
      this.spawnNpcs(this.vars.npc_count)
    }

    drawBackground() {
      this.bg.clear()

      const skyColor =
        this.vars.time_of_day === 'night'
          ? 0x0d0d2b
          : (SKY_DAY[this.vars.weather] ?? 0x87ceeb)
      this.bg.fillStyle(skyColor)
      this.bg.fillRect(0, 0, CANVAS_W, GROUND_Y)

      if (this.vars.time_of_day === 'night') {
        // Moon
        this.bg.fillStyle(0xfff8dc)
        this.bg.fillCircle(540, 42, 22)
        // Stars (fixed positions)
        this.bg.fillStyle(0xffffff)
        for (const [sx, sy] of [
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
        ]) {
          this.bg.fillRect(sx, sy, 2, 2)
        }
      } else if (this.vars.weather === 'sunny') {
        // Sun with glow
        this.bg.fillStyle(0xfff4a0, 0.45)
        this.bg.fillCircle(560, 44, 42)
        this.bg.fillStyle(0xffd700)
        this.bg.fillCircle(560, 44, 30)
      } else {
        // Clouds
        const cloudColor = this.vars.weather === 'stormy' ? 0x555555 : 0xcccccc
        this.bg.fillStyle(cloudColor, 0.9)
        for (const [cx, cy, rw, rh] of [
          [100, 52, 84, 36],
          [162, 46, 52, 28],
          [370, 62, 92, 42],
          [432, 56, 56, 30],
          [528, 42, 72, 32],
        ] as [number, number, number, number][]) {
          this.bg.fillEllipse(cx, cy, rw, rh)
        }
      }

      // Ground
      const groundColor = GROUND_COLORS[this.vars.season] ?? 0x4a8c42
      this.bg.fillStyle(groundColor)
      this.bg.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y)

      this.drawGroundDetails()
    }

    drawGroundDetails() {
      if (this.vars.season === 'fall') {
        const leafColors = [0xcc6600, 0xdd8800, 0xaa4411, 0xbb7700]
        for (let i = 0; i < 30; i++) {
          this.bg.fillStyle(leafColors[i % 4], 0.7)
          this.bg.fillEllipse(
            20 + ((i * 37) % 600),
            GROUND_Y + 22 + ((i * 13) % 100),
            8,
            5,
          )
        }
      } else if (this.vars.season === 'spring') {
        const flowerColors = [0xff69b4, 0xffff00, 0xff6b35, 0xbb33ff]
        for (let i = 0; i < 25; i++) {
          this.bg.fillStyle(flowerColors[i % 4], 0.85)
          this.bg.fillCircle(
            30 + ((i * 45) % 580),
            GROUND_Y + 20 + ((i * 17) % 100),
            3,
          )
        }
      } else if (this.vars.season === 'winter') {
        this.bg.fillStyle(0xffffff, 0.55)
        for (let i = 0; i < 8; i++) {
          this.bg.fillEllipse(
            40 + i * 80,
            GROUND_Y + 16,
            60 + ((i * 13) % 40),
            20,
          )
        }
      }
    }

    drawTrees() {
      this.treeLayer.clear()
      const trunkColor = 0x6b4226

      for (const tx of [95, 320, 545]) {
        this.treeLayer.fillStyle(trunkColor)
        this.treeLayer.fillRect(tx - 8, GROUND_Y - 58, 16, 58)

        const canopyColor = CANOPY_COLORS[this.vars.season]

        if (this.vars.season === 'winter') {
          this.treeLayer.lineStyle(2, trunkColor, 1)
          this.treeLayer.lineBetween(tx, GROUND_Y - 58, tx - 30, GROUND_Y - 98)
          this.treeLayer.lineBetween(tx, GROUND_Y - 58, tx + 30, GROUND_Y - 98)
          this.treeLayer.lineBetween(
            tx - 15,
            GROUND_Y - 76,
            tx - 24,
            GROUND_Y - 104,
          )
          this.treeLayer.lineBetween(
            tx + 15,
            GROUND_Y - 76,
            tx + 24,
            GROUND_Y - 104,
          )
          // Snow patches on branches
          this.treeLayer.fillStyle(0xeef5f7, 0.88)
          this.treeLayer.fillEllipse(tx - 24, GROUND_Y - 100, 26, 9)
          this.treeLayer.fillEllipse(tx + 24, GROUND_Y - 100, 26, 9)
          this.treeLayer.fillEllipse(tx, GROUND_Y - 110, 18, 8)
        } else if (canopyColor !== null) {
          this.treeLayer.fillStyle(canopyColor)
          this.treeLayer.fillCircle(tx, GROUND_Y - 80, 44)

          if (this.vars.season === 'fall') {
            this.treeLayer.fillStyle(0xdd8800, 0.7)
            this.treeLayer.fillCircle(tx - 20, GROUND_Y - 88, 24)
            this.treeLayer.fillStyle(0xee6600, 0.65)
            this.treeLayer.fillCircle(tx + 14, GROUND_Y - 72, 19)
          } else if (this.vars.season === 'spring') {
            this.treeLayer.fillStyle(0xffb7c5, 0.72)
            this.treeLayer.fillCircle(tx - 24, GROUND_Y - 94, 18)
            this.treeLayer.fillCircle(tx + 18, GROUND_Y - 75, 15)
            this.treeLayer.fillCircle(tx + 2, GROUND_Y - 62, 12)
          }
        }
      }
    }

    updateOverlays() {
      this.nightOverlay.setAlpha(this.vars.time_of_day === 'night' ? 0.44 : 0)
    }

    spawnNpcs(n: number) {
      const palette = NPC_PALETTES[this.vars.season] ?? NPC_PALETTES.summer
      const isRainy =
        this.vars.weather === 'rainy' || this.vars.weather === 'stormy'
      const isWinter = this.vars.season === 'winter'

      for (let i = 0; i < n; i++) {
        const spread = n > 1 ? (i / (n - 1)) * 520 : 260
        const x = Math.max(
          55,
          Math.min(585, 60 + spread + (Math.random() - 0.5) * 50),
        )
        const y = 272 + (Math.random() - 0.5) * 10
        const color = palette[i % palette.length]

        const body = this.add.ellipse(0, 0, 16, 26, color)
        const head = this.add.circle(0, -20, 9, color)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [body, head]

        if (isWinter) {
          parts.push(this.add.rectangle(0, -29, 16, 8, 0x223366))
        }

        if (isRainy) {
          const umb = this.add.graphics()
          umb.fillStyle(0x4466aa, 0.88)
          umb.fillEllipse(0, -37, 34, 13)
          umb.lineStyle(2, 0x223355, 1)
          umb.lineBetween(0, -30, 0, -20)
          parts.push(umb)
        }

        const container = this.add.container(x, y, parts)
        container.setDepth(5)

        const dist = 55 + Math.random() * 90
        const dir = Math.random() > 0.5 ? 1 : -1
        const targetX = Math.max(50, Math.min(590, x + dir * dist))
        this.tweens.add({
          targets: container,
          x: targetX,
          duration: 2200 + Math.random() * 2800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 1200,
        })

        this.npcs.push(container)
      }
    }

    clearNpcs() {
      for (const npc of this.npcs) {
        this.tweens.killTweensOf(npc)
        npc.destroy()
      }
      this.npcs = []
    }

    updateVars(newVars: SceneVars) {
      this.vars = { ...newVars }
      this.drawBackground()
      this.drawTrees()
      this.updateOverlays()
      this.clearNpcs()
      this.spawnNpcs(newVars.npc_count)
    }

    update() {
      const { weather } = this.vars
      if (weather === 'rainy' || weather === 'stormy') {
        this.tickRain(weather === 'stormy')
      } else if (weather === 'windy') {
        this.tickWind()
      } else {
        this.weatherLayer.clear()
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
        if (drop.y > GROUND_Y + 10) drop.y = 8 + Math.random() * (GROUND_Y - 20)
        if (drop.y < 0) drop.y = GROUND_Y - 20
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
      scene?.updateVars(newVars)
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
