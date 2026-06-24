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

**Design reference:** See T06 Rationale for approved design decisions.

Red first: skipped — interactive quality is human-reviewed and play-tested.
Why this path: [filled after implementation]
Alternative considered: [filled after implementation]
Deferred: [filled after implementation]
Contract note: Size is 5 points — interactive design and implementation with an unknown tool (decided in design session) warrants a larger estimate.
