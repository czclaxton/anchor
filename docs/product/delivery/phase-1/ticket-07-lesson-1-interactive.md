# P1.07 Lesson 1 Interactive — Program the Robot

Size: 5 points
Type: feat
Scope: lesson-1
Red: skip

## Outcome

- **DEPENDS ON T06 DESIGN GATE APPROVAL** — the interactive concept and tool choice were locked during the T06 design session; do not begin this ticket until T06 is merged
- The Program the Robot interactive is built and embedded in the Lesson 1 MDX at the slot approved in the T06 design session
- The interactive functions as a gamified visual explanation — mechanic, win condition, and tool (Phaser.js or React) match the approved design from T06
- If Phaser.js was chosen: it is installed in this ticket and the integration with Astro is validated before the interactive is considered done
- Developer has tested the interactive and explicitly approved it before this ticket closes

## Design Gate

The approved design for this interactive was recorded in the T06 ticket Rationale during the Lesson 1 design session. Read that section before beginning implementation. Do not deviate from the approved design without a new developer discussion.

Key decisions to confirm from T06 Rationale before building:

- Tool: Phaser.js or React?
- Mechanic: exact description of how the player interacts
- Win condition: what does success look like?
- Placement: where in the lesson does the interactive appear?

## Red

`Red: skip` — interactive behaviour is verified by manual play-testing with the developer, not automated tests.

## Green

- Read the approved design from T06 Rationale
- If Phaser.js: install `phaser` package, create a client-only Astro island wrapper, confirm it loads without SSR errors
- Build the interactive component per the approved design
- Embed it in `what-is-a-program.mdx` at the approved slot
- Present to developer for play-testing and feedback
- Iterate until developer explicitly approves

## Refactor

- If Phaser.js was added: ensure it is loaded dynamically (`import('phaser')`) so it never runs during SSR
- The interactive component should be self-contained — no global state shared with the lesson page

## Review Focus

- The mechanic directly illustrates sequential execution — a player cannot complete it without understanding that order matters
- The interactive completes in under 3 minutes for a first-time player
- If Phaser.js was installed: confirm it does not affect page load time for lessons that do not use it (check Network tab)
- Developer has explicitly approved the interactive in writing (recorded in Rationale)

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

**Design reference:** Design locked in `.agents/delivery/phase-1/p1-06-design-session.md` — Variables interactive (Phaser.js park scene, 4 Python variables: season/weather/time_of_day/npc_count).

Red first: skipped — interactive quality is human-reviewed and play-tested.

Why this path: Phaser 4 (`phaser@4.2.0`) used for the scene. `client:only="react"` island prevents SSR. Phaser loaded via dynamic `import('phaser')` so the bundle is lazy-loaded only on the Variables lesson page. `runPythonExtractVars` added to `runPython.ts` to read Pyodide globals after user code runs. Scene factory pattern (`makeParkScene(P)`) extends `Phaser.Scene` after dynamic import resolves. Programmatic Graphics API used for all scene elements (sky, ground, trees, NPCs, weather), which loads instantly and doesn't require external assets.

Alternative considered: Canvas 2D API (no Phaser) — rejected because the locked design specified Phaser.js. PixelLab pixel-art sprites — deferred; programmatic shapes communicate the concept clearly and the architecture supports replacing Graphics with sprites later.

Deferred: True isometric (diamond tile) rendering — scene uses 2D side-view. PixelLab sprites for NPCs and trees. NPC pathfinding around obstacles.

Contract note: Developer play-test required. Ticket closes only after developer explicitly approves the interactive.
