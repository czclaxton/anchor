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

**Design gate approval:** Full design session completed and approved by developer. See `.agents/delivery/phase-1/p1-06-design-session.md` for full context.

Red first: skipped — content quality is human-reviewed.

Why this path: Curriculum restructured during design gate. The original standalone "What is a Program?" lesson was repurposed as a brief intro page (`what-is-a-program.mdx`, already drafted in P1.05 handoff context). P1.06 became the first real lesson: Variables. The novel-placeholder analogy (author uses `hero_name` throughout a manuscript) was chosen because it captures propagation — the "change once, updates everywhere" insight — without requiring any code to explain it.

Alternative considered: Labeled-box analogy (standard CS101 framing). Rejected because it explains storage but not propagation, which is the deeper insight worth teaching first.

Deferred: I/O (input/output) was originally scoped alongside Variables but decoupled into a future lesson so Variables can pair with its own interactive (the isometric park scene, P1.07).

Contract note: `variables-and-io.mdx` placeholder (created in P1.02) deleted and replaced with `variables.mdx`. Route changes from `/programming-fundamentals/unit-1/variables-and-io` to `/programming-fundamentals/unit-1/variables`.

Python example dropped from intro page: The original ticket outcome listed "a simple Python example" for `what-is-a-program.mdx`. During the design session this was explicitly deferred — the chef/volunteer analogy works better as pure prose for a beginner's very first page, and the Variables lesson (which follows immediately) introduces Python syntax with real code. The `what-is-a-program.mdx` is intentionally code-free.

Design session artifact: `.agents/delivery/phase-1/p1-06-design-session.md` — committed to this branch with the full locked design context.
