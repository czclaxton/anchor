# Phase 1: Anchor — Foundation and First Lessons

**Delivery status:** Product plan approved. Pending decomposition.

## TL;DR

**Goal:** Build and ship the foundation of Anchor — a personal knowledge library with a proven lesson template, embedded Python editor, and three complete beginner lessons on Programming Fundamentals.

**Ships:**

- Deployed Vercel site at a public URL
- Knowledge library architecture: Subject → optional Unit/Series → Lesson (standalone lessons supported)
- One Subject: Programming Fundamentals (Python)
- Three lessons: What is a Program?, Variables + I/O, Conditionals
- Reusable embedded Python editor component (Pyodide + CodeMirror) with paired I/O UI
- One gamified interactive per lesson (tool and design decided per-lesson before implementation)
- "Anchored!" completion button with anchor drop/settle animation per lesson
- Unit progress bar with anchor motif, persisted in localStorage
- Optional AI-generated images per lesson where they strengthen the analogy

**Defers:**

- Lessons 4–5 (Loops, Functions) — follow-on in this phase after lessons 1–3 are complete and validated
- Search, additional subjects, multiple units
- User accounts, authentication, any backend
- Dark mode, mobile-first optimization, QOL features
- Lesson feedback, comments, ratings, achievements

---

Anchor does not exist yet. This phase builds the entire site from scratch — architecture, content pipeline, lesson template, and the first three lessons of a longer Programming Fundamentals series. The forcing function is a real first reader (a friend who is learning to code) and a portfolio piece that demonstrates both teaching ability and an AI-assisted delivery workflow. Every decision made here establishes the pattern for all future content — programming lessons, finance topics, AI concepts, and whatever else the library grows to cover — so the architecture must support standalone lessons, loose series, and full deep-dive courses as equal first-class content types.

## Phase Goal

This phase should leave the product in a state where:

- A beginner with no programming experience can visit the site, read through the first three lessons, run Python code directly in the browser without leaving the page, interact with each gamified visual, and click "Anchored!" on each lesson watching the progress bar fill
- A portfolio viewer can arrive at the URL and understand the teaching model — plain language, analogy-first, interactive, embedded code execution — within the first lesson, without any explanation
- The architecture supports adding a standalone lesson on any topic (Finance, AI, Bitcoin) or a new unit under Programming Fundamentals without restructuring the project

## Committed Scope

### Site Architecture

- Astro project with Tailwind CSS, MDX content pipeline, React component integration, and Phaser.js support
- Vercel deployment with a public URL
- Flexible content hierarchy: Subject → optional Unit/Series → Lesson; standalone lessons can live directly under a Subject without a containing Unit
- Lesson MDX template: hook, analogy, optional image slot, plain-language explanation, embedded Python editor slot (where applicable), gamified interactive slot, summary, "Anchored!" button

### Embedded Python Editor

- Reusable `<PythonEditor />` React component built on Pyodide (CPython via WebAssembly) and CodeMirror
- Includes: code input area, Run button, output console, and a dynamic input field that appears when the running code calls `input()` — Pyodide intercepts the `input()` call and pauses execution until the user responds
- Lazy-loaded as a client-only Astro island — does not affect page load time on lessons that don't use it
- Built as an early standalone ticket and validated before any lesson content depends on it
- Designed to be dropped into any lesson, quiz, or interactive across any subject as the library grows

### Lesson Content — Programming Fundamentals

**V1 lessons (committed):**

- **Lesson 1:** What is a Program? — A recipe analogy. Instructions execute in sequence, exactly as written.
- **Lesson 2:** Variables + I/O — A sticky note analogy. Naming and storing values; `input()` and `print()` as the communication layer. Uses `<PythonEditor />`.
- **Lesson 3:** Conditionals — A traffic light analogy. IF/ELIF/ELSE as branching decision paths.

**Follow-on lessons (same phase, after lessons 1–3 are validated with a real reader):**

- **Lesson 4:** Loops — A planting machine analogy. One instruction, repeated until the job is done.
- **Lesson 5:** Functions — A vending machine analogy. Define once, call many times with different inputs.

Each lesson is written to beginner standard: plain language, no assumed knowledge, analogy before syntax, short and complete. Content goes through a write → test with real reader → iterate loop before a lesson is considered done.

### Gamified Interactives

- One interactive per lesson across all five lessons
- Interactive concepts (approved, design deferred): Program the Robot (L1), Mad Libs Machine (L2), Sorting Machine (L3), Planting Machine (L4), Recipe Factory (L5)
- Tool choice (Phaser.js vs. React) and full mechanic design decided in a dedicated design session per lesson, just-in-time before that lesson's interactive is built
- Interactives function as gamified visual explanations — short, intuitive, illustrative — not standalone games

### AI-Generated Images

- Optional per lesson — not a blocker for lesson completion
- Generated during content writing when a visual would strengthen the analogy
- Consistent flat illustration style applied across all images regardless of tool used
- Tool: Google Gemini or ChatGPT (whichever is available)

### Progress Tracking

- Completion button labeled **"Anchored!"** — reinforces the site's concept-anchoring philosophy at the exact moment a lesson lands
- "Anchored!" triggers a simple anchor drop/settle animation on click
- Unit progress bar uses an anchor motif (chain links filling in, or an anchor icon at the completion end of the bar)
- Progress bar updates and persists in localStorage
- Progress survives page refresh; resets are not exposed in V1

## Explicit Deferrals

- **Lessons 4–5** — Loops and Functions are scoped to this phase but begin only after lessons 1–3 are complete and validated with a real reader
- **Search** — no lesson or subject search; deferred until there is enough content to warrant it
- **Additional subjects** — JavaScript, Finance, AI, Bitcoin, and others are the long-term vision but deferred until the teaching model and architecture are proven in Phase 1
- **User accounts / backend** — personal site, single user; no authentication or server in V1
- **Dark mode** — QOL feature, not a teaching feature; deferred
- **Mobile-first optimization** — site must render without breaking on mobile but is not optimized for small screens in V1
- **Lesson feedback forms, comments, ratings** — no user-generated content in V1
- **Achievements or certificates** — progress bar is the only completion signal in V1
- **Full animation and theming system** — anchor motif is present in V1 as a targeted detail (button + progress bar); a site-wide themed animation system is deferred to V2
- **Quizzes** — explicitly deferred to V2; the `<PythonEditor />` component lays groundwork for interactive assessment but no quiz UI ships in V1
- **Non-sequential lesson navigation** — lessons are presented in order in V1; free navigation between lessons is deferred
- **Per-subject theming** — V1 uses the anchor brand consistently across all content; per-subject accent palettes and iconography (e.g. green/dollar motifs for Finance, circuit aesthetics for AI) are deferred to V2 once multiple subjects exist to design around

## Exit Condition

The site is live on Vercel at a shareable URL. A first-time visitor with no programming background can navigate to Programming Fundamentals, read through the first three lessons, run Python code in the browser on lesson 2, interact with each gamified visual, click "Anchored!" on each lesson, and see the progress bar advance. The lesson template and `<PythonEditor />` component are clean enough that adding a new lesson — on any topic, under any subject — requires only writing an MDX file and dropping in the component. The URL can be sent to a friend or included in a portfolio without qualification.

## Retrospective

`required` — Phase 1 establishes the lesson template, content model, embedded editor pattern, and interactive design pattern that every future lesson in the knowledge library will inherit. What works and what doesn't here directly shapes how all future subjects and topics are built.
