# P1.05 Progress Tracking

Size: 3 points
Type: feat
Scope: progress
Red: required

## Outcome

- Each lesson page shows an "Anchored!" button at the bottom
- Clicking "Anchored!" triggers an anchor drop/settle CSS animation and marks the lesson complete in localStorage
- A progress bar appears on lesson pages (and the subject landing page) showing X of N lessons completed in the current unit/subject
- The progress bar uses an anchor motif — chain links filling in, or an anchor icon at the completion end
- Progress persists across page refreshes and browser sessions (localStorage)
- Completing the same lesson twice does not create duplicate entries or break the progress count
- Vitest tests pass for the localStorage read/write logic

## Red

- Write Vitest tests for a `useProgress` hook (or plain utility functions) that assert:
  - Marking a lesson complete stores its slug in localStorage under a known key
  - Reading progress for a subject returns the correct count of completed lessons
  - Marking the same lesson complete twice results in a count of 1, not 2
- Run the test suite and confirm all three tests fail before implementation
- Commit with suffix `[red]`: `test(P1.05): progress tracking localStorage logic [red]`

## Green

- Implement a `useProgress` React hook (or plain TS utility) with `markComplete(lessonSlug)` and `getProgress(subjectSlug, totalLessons)` functions
- Build `AnchoredButton.tsx` React component — renders the button, fires `markComplete` on click, triggers the CSS animation
- Build `ProgressBar.tsx` React component — reads progress via `getProgress`, renders the anchor-motif bar
- Wire both into `LessonLayout.astro` as client-only islands
- Wire `ProgressBar` into the subject landing page
- Make Vitest tests pass

## Refactor

- localStorage key schema should be namespaced (e.g. `anchor:progress:programming-fundamentals`) to avoid collisions if the site ever adds other localStorage usage
- Animation should be a CSS class toggled on click, not a JS animation loop

## Review Focus

- Click "Anchored!" on lesson 1, navigate to lesson 2 — confirm the progress bar on lesson 2 shows 1/3 complete
- Refresh the page — confirm progress is still 1/3
- Click "Anchored!" on lesson 1 again — confirm progress does not increment to 2/3
- Vitest tests pass in CI
- The anchor motif is visually present on the progress bar — not a plain fill bar

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

Red first: [what test failed first]
Why this path: [why this implementation was the smallest acceptable]
Alternative considered: [one rejected alternative and why]
Deferred: Reset functionality — not exposed in V1. Full animation theming system — anchor motif only, no site-wide system.
Contract note: none.
