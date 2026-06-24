# P1.11 Lesson 3 Interactive — Sorting Machine

Size: 5 points
Type: feat
Scope: lesson-3
Red: skip

## Outcome

- **DEPENDS ON T10 DESIGN GATE APPROVAL** — interactive concept and tool choice were locked during the T10 design session; do not begin this ticket until T10 is merged
- The Sorting Machine interactive is built and embedded in the Lesson 3 MDX at the slot approved in the T10 design session
- The interactive functions as a gamified visual explanation of conditionals — the player's IF/ELIF/ELSE rules determine how items are sorted, and the mechanic directly demonstrates branching logic
- Tool choice (Phaser.js or React), item types, bin categories, and rule-setting UI match the approved design from T10
- Developer has tested the interactive and explicitly approved it before this ticket closes

## Design Gate

The approved design for this interactive was recorded in the T10 ticket Rationale during the Lesson 3 design session. Read that section before beginning implementation.

Key decisions to confirm from T10 Rationale before building:
- Tool: Phaser.js or React?
- Items: what comes down the conveyor/sorting mechanism? (shapes, colours, numbers, animals)
- Bins/outputs: how many categories? What are they?
- Rule-setting UI: does the player type conditions, drag blocks, or use dropdowns?
- Win condition: what does a correct sort look like?
- Placement: where in the lesson does the interactive appear?

## Red

`Red: skip` — interactive behaviour is verified by manual play-testing with the developer.

## Green

- Read the approved design from T10 Rationale
- Build the Sorting Machine component per the approved design
- Embed it in `conditionals.mdx` at the approved slot
- Present to developer for play-testing and feedback
- Iterate until developer explicitly approves

## Refactor

- The sorting logic (evaluating the player's rules against each item) should be a pure function — testable in isolation if needed
- The component should be self-contained with no shared state

## Review Focus

- A player cannot sort items correctly without understanding that different conditions produce different outcomes — the mechanic is the concept
- Wrong conditions produce visually obvious incorrect sorts — feedback is immediate and clear
- The interactive completes in under 3 minutes for a first-time player
- Developer has explicitly approved the interactive in writing (recorded in Rationale)

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

**Design reference:** See T10 Rationale for approved design decisions.

Red first: skipped — interactive quality is human-reviewed and play-tested.
Why this path: [filled after implementation]
Alternative considered: [filled after implementation]
Deferred: [filled after implementation]
Contract note: Size is 5 points — Sorting Machine is the most complex interactive in the phase; tool and mechanic TBD from design session.
