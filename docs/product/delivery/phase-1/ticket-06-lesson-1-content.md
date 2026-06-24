# P1.06 Lesson 1 Content — What is a Program?

Size: 3 points
Type: feat
Scope: lesson-1
Red: skip

## Outcome

- **DESIGN GATE MUST BE COMPLETED BEFORE ANY WRITING BEGINS** — see Design Gate section below
- `src/content/lessons/programming-fundamentals/what-is-a-program.mdx` exists and is complete
- Lesson covers: what a program is, the recipe analogy, how instructions execute in sequence, a simple Python example
- All lesson layout slots are filled: hook, analogy, explanation, summary, "Anchored!" button
- Image slot is filled if a suitable AI-generated image is produced during the design session; left empty otherwise
- Developer has explicitly approved the final lesson content before this ticket closes

## Design Gate

**This section must be completed and approved by the developer before Phase 2 (writing) begins.**

The orchestrator must pause here and surface the following to the developer as a design session:

1. **Hook** — What is the opening sentence or scenario that makes a beginner want to read on?
2. **Analogy framing** — The recipe analogy is approved in principle. How should it be introduced? What specific recipe or scenario should be used?
3. **Python example** — What is the simplest Python snippet that illustrates sequential execution without introducing syntax the reader hasn't seen yet?
4. **Visual** — Is there a moment in this lesson where an AI-generated image would strengthen the analogy? If yes, describe the image.
5. **Tone** — What is the voice? (e.g. conversational, slightly playful, direct — not academic)
6. **Interactive placement** — Where in the lesson does the interactive (Program the Robot) sit? After the explanation, before the summary?

Once the developer approves answers to the above, write the approved design into the Rationale section and proceed to writing.

## Red

`Red: skip` — lesson content is reviewed and approved by the developer, not by automated tests.

## Green

- Conduct the design session with the developer (see Design Gate above)
- Write the MDX draft based on the approved design
- Present the draft to the developer for review
- Iterate based on feedback until developer explicitly approves
- Commit the final approved lesson

## Refactor

- Ensure MDX frontmatter matches the content collection schema from T02
- Confirm the lesson renders correctly in the lesson layout with no broken slots

## Review Focus

- The hook makes a beginner want to read on — does not start with a definition
- The analogy appears before any Python syntax
- The Python example is the minimum needed to illustrate the point — no extra syntax
- The tone is plain and direct, not academic
- Developer has explicitly approved this content in writing (recorded in Rationale)

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

**Design gate approval:** [Record approved design decisions here before writing begins]

Red first: skipped — content quality is human-reviewed.
Why this path: [filled after design session]
Alternative considered: [filled after design session]
Deferred: [filled after design session]
Contract note: none.
