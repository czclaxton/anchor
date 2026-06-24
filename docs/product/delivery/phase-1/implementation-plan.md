# Phase 1 — Anchor: Foundation and First Lessons

> Builds the entire Anchor knowledge library from scratch: architecture, content pipeline, embedded Python editor, and three complete beginner lessons on Programming Fundamentals.

## Epic

Product plan: `docs/product/plans/phase-1.md`

## Product contract

When this phase is complete, a beginner with no programming experience can visit the site at a public Vercel URL, navigate from the home page through three lessons on Programming Fundamentals, run Python code in the browser, interact with a gamified visual on each lesson, click "Anchored!" to mark it complete, and watch a progress bar fill — all without leaving the page or needing any setup.

## Grill-Me decisions locked

- **Shell early** → Site shell (home page, nav, breadcrumbs, prev/next) ships in PR2 (T03) so the friend-tester has a navigable site before lesson content ships
- **Vercel in T01, friend link held** → CI/CD proven from day one; shareable URL held until shell + Lesson 1 are done
- **Phaser.js deferred from scaffold** → Not installed in T01; added in whichever interactive ticket first needs it based on design session outcome
- **Vitest only** → Tests scoped to PythonEditor (T04) and progress tracking (T05); all other tickets are `Red: skip`
- **Combined design gate per lesson** → Each lesson content ticket (T06, T08, T10) opens with a design session covering content structure, analogy, visual placement, and interactive concept together — nothing gets written or built until developer approves the design in writing inside the ticket's Rationale section
- **Design gates are queued, not blocking** → Orchestrator surfaces blocked design gates as a prioritized list so the developer can address them on their schedule; other unblocked tickets continue in parallel
- **Content closes on developer approval** → AI drafts and iterates; ticket is not done until developer explicitly approves the final lesson
- **Interactive closes on developer approval** → Built against the design approved in the paired content ticket

## Ticket Order

1. `P1.01 Project Scaffold`
2. `P1.02 Content Model + Routing`
3. `P1.03 Site Shell`
4. `P1.04 PythonEditor Component`
5. `P1.05 Progress Tracking`
6. `P1.06 Lesson 1 Content — What is a Program?`
7. `P1.07 Lesson 1 Interactive — Program the Robot`
8. `P1.08 Lesson 2 Content — Variables + I/O`
9. `P1.09 Lesson 2 Interactive — Mad Libs Machine`
10. `P1.10 Lesson 3 Content — Conditionals`
11. `P1.11 Lesson 3 Interactive — Sorting Machine`
12. `P1.12 Production Readiness`

## Ticket Files

- `ticket-01-project-scaffold.md`
- `ticket-02-content-model-routing.md`
- `ticket-03-site-shell.md`
- `ticket-04-python-editor.md`
- `ticket-05-progress-tracking.md`
- `ticket-06-lesson-1-content.md`
- `ticket-07-lesson-1-interactive.md`
- `ticket-08-lesson-2-content.md`
- `ticket-09-lesson-2-interactive.md`
- `ticket-10-lesson-3-content.md`
- `ticket-11-lesson-3-interactive.md`
- `ticket-12-production-readiness.md`

## PR Slices

| PR | Tickets | Milestone |
|----|---------|-----------|
| PR1 | T01 + T02 | Scaffold + content model on main; Vercel preview active |
| PR2 | T03 | Site shell live; friend-tester notified |
| PR3 | T04 + T05 | Shared components done; PythonEditor + progress tracking validated |
| PR4 | T06 + T07 | Lesson 1 complete (content approved + interactive built) |
| PR5 | T08 + T09 | Lesson 2 complete |
| PR6 | T10 + T11 | Lesson 3 complete |
| PR7 | T12 | Production-ready; site shareable as portfolio piece |

## Exit Condition

The site is live on Vercel at a shareable URL. A first-time visitor with no programming background can navigate from the home page to Programming Fundamentals, work through all three lessons in order, run Python code in the browser on lesson 2, interact with each gamified visual, click "Anchored!" on each lesson, and see the progress bar advance. The lesson template and PythonEditor component are clean enough that adding a fourth lesson requires only a design session, writing an MDX file, and building one component. The URL can be sent to a friend or included in a portfolio without qualification.

## CI Baseline

> Baseline recorded: pending — record after T01 scaffold is merged to main.

## Review Rules

- Tickets must be merged in order within each PR.
- Each PR must pass CI before the next PR begins.
- Pre-existing CI failures documented in CI Baseline above do not block a ticket; newly introduced failures do.
- **Design gate rule:** T06, T08, T10 each require explicit developer approval of the written design before the Green phase begins. Orchestrator must not proceed to writing or building until approval is recorded in the ticket Rationale.
- **Interactive dependency rule:** T07, T09, T11 may not begin until the paired content ticket's design is approved and the content ticket is merged.
- **Shell rule:** PR2 (T03) must be merged before lesson content PRs begin.

## Explicit Deferrals

- Lessons 4–5 (Loops, Functions) — begin only after lessons 1–3 are validated with a real reader
- Phaser.js in scaffold — added in first interactive ticket that needs it
- Search, categories/tags page, additional subjects
- User accounts, authentication, any backend
- Dark mode, mobile-first optimization
- Lesson feedback, comments, ratings, achievements
- Full animation and theming system — anchor motif only in V1
- Quizzes — deferred to V2
- Per-subject theming — deferred to V2

## Stop Conditions

- Developer has not approved a design gate — do not proceed to writing or building; add to design queue and surface to developer
- Developer has not approved lesson content — do not merge content ticket or begin interactive ticket
- Broken CI that cannot be resolved within ticket scope
- Pyodide bundle size or SSR/hydration issues discovered in T04 — surface before any lesson depends on the component
- Phaser.js + Astro integration friction in an interactive ticket — surface and pause rather than working around it silently

## Phase Closeout

Retrospective: required
Why: Phase 1 establishes the lesson template, content model, embedded editor pattern, and interactive design pattern that every future lesson in the knowledge library inherits. What works and what doesn't here directly shapes all future subjects.
Trigger: Developer approval of final PR merge (T12).
Artifact: `docs/product/retrospectives/phase-1-anchor-foundation-retrospective.md`
