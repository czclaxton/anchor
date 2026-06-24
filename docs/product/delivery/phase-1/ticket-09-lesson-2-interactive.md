# P1.09 Lesson 2 Interactive — Mad Libs Machine

Size: 4 points
Type: feat
Scope: lesson-2
Red: skip

## Outcome

- **DEPENDS ON T08 DESIGN GATE APPROVAL** — interactive concept and tool choice were locked during the T08 design session; do not begin this ticket until T08 is merged
- The Mad Libs Machine interactive is built and embedded in the Lesson 2 MDX at the slot approved in the T08 design session
- The interactive functions as a gamified visual explanation of variables and I/O — mechanic, inputs, output assembly, and tool match the approved design from T08
- Developer has tested the interactive and explicitly approved it before this ticket closes

## Design Gate

The approved design for this interactive was recorded in the T08 ticket Rationale during the Lesson 2 design session. Read that section before beginning implementation.

Key decisions to confirm from T08 Rationale before building:
- Tool: Phaser.js or React?
- Input fields: what variables does the player assign? (e.g. `name`, `color`, `number`)
- Output: what sentence or story assembles from the player's inputs?
- Mechanic: does the player type values, drag them, or something else?
- Placement: where in the lesson does the interactive appear?

## Red

`Red: skip` — interactive behaviour is verified by manual play-testing with the developer.

## Green

- Read the approved design from T08 Rationale
- Build the Mad Libs Machine component per the approved design
- Embed it in `variables-and-io.mdx` at the approved slot
- Present to developer for play-testing and feedback
- Iterate until developer explicitly approves

## Refactor

- The component should be self-contained — variables are scoped to the interactive, not shared with the lesson page or `<PythonEditor />`
- Output text assembly should be purely driven by the input values — no hardcoded fallbacks

## Review Focus

- A player who fills in the inputs and clicks Run sees their values appear in the assembled output — the connection between variable assignment and output is immediate and clear
- Changing one value and running again produces a different output — reinforces that variables can change
- The interactive completes in under 2 minutes
- Developer has explicitly approved the interactive in writing (recorded in Rationale)

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

**Design reference:** See T08 Rationale for approved design decisions.

Red first: skipped — interactive quality is human-reviewed and play-tested.
Why this path: [filled after implementation]
Alternative considered: [filled after implementation]
Deferred: [filled after implementation]
Contract note: Size is 4 points — interactive build with design-session-determined tool and mechanic warrants a larger estimate than default.
