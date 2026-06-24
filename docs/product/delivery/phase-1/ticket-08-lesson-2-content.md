# P1.08 Lesson 2 Content — Variables + I/O

Size: 3 points
Type: feat
Scope: lesson-2
Red: skip

## Outcome

- **DESIGN GATE MUST BE COMPLETED BEFORE ANY WRITING BEGINS** — see Design Gate section below
- `src/content/lessons/programming-fundamentals/variables-and-io.mdx` exists and is complete
- Lesson covers: what a variable is, the sticky note analogy, `input()` and `print()` as the communication layer, a simple interactive Python example using `<PythonEditor />`
- All lesson layout slots are filled: hook, analogy, explanation, PythonEditor slot, summary, "Anchored!" button
- The `<PythonEditor />` component is embedded in the lesson with a starter code snippet the reader can run and modify
- Image slot is filled if a suitable AI-generated image is produced during the design session; left empty otherwise
- Developer has explicitly approved the final lesson content before this ticket closes

## Design Gate

**This section must be completed and approved by the developer before Phase 2 (writing) begins.**

The orchestrator must pause here and surface the following to the developer as a design session:

1. **Hook** — What scenario makes a beginner immediately understand why naming things matters?
2. **Analogy framing** — The sticky note analogy is approved in principle. What specific scenario grounds it? (e.g. sticky notes on a desk, labels on jars, name tags at a party)
3. **PythonEditor starter code** — What is the opening code snippet in the editor? Should it be a complete working example the reader just runs, or a partially complete example they finish?
4. **input() / print() framing** — How should these be introduced without making them feel like magic? The reader has seen `print()` in lesson 1 — how does lesson 2 close the loop?
5. **Visual** — Is there a moment where an AI-generated image reinforces the analogy?
6. **Interactive placement** — Where does `<PythonEditor />` sit relative to the explanation? Where does the Mad Libs Machine (T09) sit?
7. **Tone and pacing** — Lesson 2 introduces more concepts than lesson 1. How do we keep it from feeling dense?

Once the developer approves answers to the above, write the approved design into the Rationale section and proceed to writing.

## Red

`Red: skip` — lesson content is reviewed and approved by the developer, not by automated tests.

## Green

- Conduct the design session with the developer (see Design Gate above)
- Write the MDX draft based on the approved design
- Embed `<PythonEditor />` at the approved slot with the approved starter code
- Present the draft to the developer for review
- Iterate based on feedback until developer explicitly approves
- Commit the final approved lesson

## Refactor

- Confirm `<PythonEditor />` renders correctly inside MDX (client-only island inside an MDX file)
- Confirm the lesson renders without layout issues when the editor is present

## Review Focus

- The sticky note analogy is introduced before any Python syntax appears
- `print()` is connected back to lesson 1 — the reader understands they've been using a function all along
- The PythonEditor starter code is runnable as-is — a reader who just clicks Run gets satisfying output before they've changed anything
- Developer has explicitly approved this content in writing (recorded in Rationale)

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

**Design gate approval:** [Record approved design decisions here before writing begins]

Red first: skipped — content quality is human-reviewed.
Why this path: [filled after design session]
Alternative considered: [filled after design session]
Deferred: [filled after design session]
Contract note: none.
