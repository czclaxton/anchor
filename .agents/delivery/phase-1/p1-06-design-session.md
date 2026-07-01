# P1.06 Design Session — Variables Lesson

Status: **DESIGN GATE CLOSED — P1.06 nearly complete, context reset in progress**

---

## Curriculum restructuring decisions (locked)

- The standalone "What is a Program?" lesson (original P1.06 scope) became a **brief intro page** (`what-is-a-program.mdx`, order: 1, no unit) — chef/volunteer analogy
- P1.06 is **Variables** — first real lesson (unit-1, order: 2)
- P1.07 is redesigned as the **Variables interactive** (isometric Phaser.js scene)
- Lesson 2 topic decided after Variables interactive is complete

---

## Intro page (what-is-a-program.mdx) — locked

- Hook: "Imagine a world-class chef who can't touch a single pan. How does dinner still get made?"
- Body: chef analogy (paralyzed chef + volunteer crew), computer analogy, bug definition
- Summary: "A program is a list of instructions you write for a computer to follow — one at a time, in order, exactly as written."
- No Python code (intentional — Python intro happens in Variables lesson)
- Route: `/programming-fundamentals/what-is-a-program/`

---

## Variables lesson (P1.06) — locked

### Hook (frontmatter)

"What if you wrote something once and it showed up everywhere it was needed — and updated everywhere the moment you changed it?"

### Analogy (frontmatter one-liner)

"An author uses a placeholder like `hero_name` throughout an entire manuscript instead of writing the actual name. Change the value once — every page updates automatically."

### Body (MDX body → Explanation slot)

Full analogy narrative: author writing a novel, `hero_name` placeholder, 2000-page update on one assignment. Flows into Python syntax: `hero_name = "Jordan"`, assignment mechanics, three type examples (string/int/boolean). Interactive placeholder comment at bottom.

### Summary (frontmatter)

"A variable is a named placeholder for a value. Set it once, use it everywhere. Change the value in one place and everything that references it updates automatically."

### CRITICAL ARCHITECTURE DECISION — Astro v5 slot limitation

**MDX `<Fragment slot="...">` declarations do NOT project to parent slots via `entry.render()` + `<Content />` in Astro v5.** Only works with `layout:` frontmatter (deprecated/removed in Astro v5 content collections).

**Correct pattern for this codebase:**

- Short fields (`hook`, `analogy`, `summary`) → frontmatter read by routing pages
- Rich body content → MDX body rendered via `<Content />` in `explanation` slot
- Routing pages: `<p slot="hook">{entry.data.hook}</p>`, `<p slot="analogy">{entry.data.analogy}</p>`, `<Fragment slot="explanation"><Content /></Fragment>`, `<p slot="summary">{entry.data.summary}</p>`
- `summary` field added to `src/content/config.ts` Zod schema

---

## Variables interactive (P1.07) — locked design

### Variables (4 total)

```python
season = "summer"      # "summer" | "fall" | "winter" | "spring"
weather = "sunny"      # "sunny" | "rainy" | "stormy" | "windy"
time_of_day = "day"    # "day" | "night"
npc_count = 4          # integer, min 1, max ~8
```

### Scene mapping

- `season` → trees (lush/colorful/bare+snow/flowers), ground, clothing (tank tops/hoodie/coat+beanie/light jacket)
- `weather` → sky, clouds, precipitation, NPC accessories (umbrellas)
- `time_of_day` → sky color, sun/moon/stars, ambient overlay
- `npc_count` → number of NPCs (min 1, max ~8)
- **Winter = bare branches WITH snow** (one combined state)

### NPCs

Multiple wandering NPCs (not one character). They walk paths, go off-screen, re-enter buildings. Clothing driven by season + weather. Activity emerges from variable combinations.

### Mechanic

**Pure sandbox** — any combination valid. No goal. Tank tops in winter are intentional.

### Error handling (REQUIRED per developer)

Robust error handling for beginner Python mistakes:

- Missing quotes: `season = summer` → helpful error, show valid string syntax
- Typos/invalid values: `season = "summre"` → show valid options for that variable
- Syntax errors → clear human-readable message (not raw Python traceback)

### Tech

- Phaser.js (needs `bun add phaser`)
- PythonEditor / Pyodide (P1.04, already built)
- React component, `client:only` Astro island
- PixelLab MCP for pixel art assets (2000 generations, Tier 1 active)

---

## P1.06 DELIVERY STATE AT CONTEXT RESET

**Branch:** `agents/p1-06-lesson-1-content-what-is-a-program`
**Worktree:** `C:\Repos\anchor_p1_06`
**Orchestrator status:** `subagent_review_complete` — reconcile BLOCKED due to actionable findings (now patched)

### Committed on branch

- Commit 1 (cfb4728): `feat(lesson-1): add Variables lesson and What is a Program intro page [P1.06]`
  - Files had Fragment slot wrappers (old broken pattern — patched below)

### STAGED but NOT YET COMMITTED (the [subagent-review] patch)

These files are staged in `C:\Repos\anchor_p1_06` RIGHT NOW. Must commit next:

- `src/content/config.ts` — added `summary: z.string()` to Zod schema
- `src/content/lessons/programming-fundamentals/what-is-a-program.mdx` — removed Fragment wrappers, added summary frontmatter
- `src/content/lessons/programming-fundamentals/unit-1/variables.mdx` — same treatment
- `src/pages/[subject]/[lesson].astro` — frontmatter slot pattern + summary slot
- `src/pages/[subject]/[unit]/[lesson].astro` — same
- `docs/product/delivery/phase-1/ticket-06-lesson-1-content.md` — rationale v2
- `.agents/delivery/phase-1/p1-06-design-session.md` — this file

### Exact next steps to complete P1.06

**Step 1 — From `C:\Repos\anchor_p1_06`, commit the staged patch:**

```bash
cd C:\Repos\anchor_p1_06
git status  # confirm staged files match list above
git commit -m "fix(lesson-1): frontmatter-based slot pattern, add summary field [subagent-review]"
```

**Step 2 — Record patched (use the SHA from step 1):**

```bash
bun run deliver --plan docs/product/delivery/phase-1/implementation-plan.md subagent-review patched <SHA>
```

**Step 3 — Reconcile:**

```bash
bun run deliver --plan docs/product/delivery/phase-1/implementation-plan.md reconcile-subagent-review
```

**Step 4 — Format before open-pr (CLAUDE.md requirement):**

```bash
bun run format
# then selectively re-stage only the P1.06 files (NOT .son-of-anton/ files)
# git checkout -- . to restore unstaged noise
```

**Step 5 — Open PR:**

```bash
bun run deliver --plan docs/product/delivery/phase-1/implementation-plan.md open-pr
```

**Step 6 — Poll review (prReview: disabled → auto-skips immediately):**

```bash
bun run deliver --plan docs/product/delivery/phase-1/implementation-plan.md poll-review
```

**Step 7 — Advance (gated mode → prints P1.07 resume prompt):**

```bash
bun run deliver --plan docs/product/delivery/phase-1/implementation-plan.md advance
```

**Step 8 — P1.07 begins.** Start with `/soa resume phase-1` and read this file.

---

## Resume instructions

After `/clear`, start a new session and run:

```
/soa resume phase-1
```

Read `.agents/delivery/phase-1/p1-06-design-session.md` for full locked design + exact next steps.
