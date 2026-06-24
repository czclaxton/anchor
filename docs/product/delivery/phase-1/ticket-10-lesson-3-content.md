# P1.10 Lesson 3 Content — Conditionals

Size: 3 points
Type: feat
Scope: lesson-3
Red: skip

## Outcome

- **DESIGN GATE MUST BE COMPLETED BEFORE ANY WRITING BEGINS** — see Design Gate section below
- `src/content/lessons/programming-fundamentals/conditionals.mdx` exists and is complete
- Lesson covers: what a conditional is, the traffic light analogy, IF/ELIF/ELSE as branching decision paths, a Python example
- All lesson layout slots are filled: hook, analogy, explanation, summary, "Anchored!" button
- Image slot is filled if a suitable AI-generated image is produced during the design session; left empty otherwise
- Developer has explicitly approved the final lesson content before this ticket closes

## Design Gate

**This section must be completed and approved by the developer before Phase 2 (writing) begins.**

The orchestrator must pause here and surface the following to the developer as a design session:

1. **Hook** — What everyday decision-making scenario makes a beginner immediately recognise that they already understand branching logic?
2. **Analogy framing** — The traffic light analogy is approved in principle. Does it fully cover IF/ELIF/ELSE, or does a second analogy help (e.g. a bouncer at a door, a vending machine selection)?
3. **Python example** — What is the minimum Python snippet that shows IF/ELIF/ELSE clearly without introducing new syntax? Should the reader be able to run it in a `<PythonEditor />`, or is a static code block sufficient for this lesson?
4. **PythonEditor** — Does lesson 3 include a runnable Python editor, or is the code shown as a static block? (Lesson 2 already introduced the editor — lesson 3 can choose to reinforce it or keep it simpler.)
5. **Visual** — Is there a moment where an AI-generated image of the traffic light or branching scenario reinforces the analogy?
6. **Interactive placement** — Where does the Sorting Machine (T11) sit relative to the explanation?
7. **Complexity ceiling** — Lesson 3 is the most conceptually complex of the three. What is the hardest thing a reader should be expected to understand by the end, and what is explicitly left for a future lesson?

Once the developer approves answers to the above, write the approved design into the Rationale section and proceed to writing.

## Red

`Red: skip` — lesson content is reviewed and approved by the developer, not by automated tests.

## Green

- Conduct the design session with the developer (see Design Gate above)
- Write the MDX draft based on the approved design
- Embed `<PythonEditor />` if approved in design session
- Present the draft to the developer for review
- Iterate based on feedback until developer explicitly approves
- Commit the final approved lesson

## Refactor

- Confirm the lesson does not assume knowledge beyond what was covered in lessons 1 and 2
- Ensure any Python example uses only `input()`, `print()`, variables, and conditionals — no new syntax

## Review Focus

- The traffic light analogy (or approved alternative) is introduced before any Python syntax
- IF/ELIF/ELSE all appear in the example — the reader understands the full pattern, not just IF/ELSE
- The complexity ceiling agreed in the design session is respected — no concepts beyond what was approved
- Developer has explicitly approved this content in writing (recorded in Rationale)

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

**Design gate approval:** [Record approved design decisions here before writing begins]

Red first: skipped — content quality is human-reviewed.
Why this path: [filled after design session]
Alternative considered: [filled after design session]
Deferred: [filled after design session]
Contract note: none.
