# P1.04 PythonEditor Component

Size: 5 points
Type: feat
Scope: python-editor
Red: required

## Outcome

- `<PythonEditor />` React component exists at `src/components/PythonEditor.tsx`
- Component renders a CodeMirror editor, a Run button, and an output console
- Clicking Run executes the Python code via Pyodide and displays stdout in the output console
- When running code calls `input()`, execution pauses and an inline text input appears below the output console; the user types a value, presses Enter, and execution resumes with that value
- Component is a client-only Astro island (`client:load`) — does not attempt SSR
- Pyodide is lazy-loaded on component mount — pages without `<PythonEditor />` are unaffected
- A temporary dev-only validation page at `/dev/python-editor` embeds the component and is used to verify behaviour manually
- Vitest tests pass for the core execution and `input()` interception logic

## Red

- Write a Vitest test that imports the Pyodide execution utility (extracted from the component into a pure function) and asserts:
  - `runPython("print('hello')")` resolves with stdout `"hello\n"`
  - `runPython("x = input('name?')\nprint(x)")` pauses and resolves with the provided mock input
- Run the test suite and confirm both tests fail before implementation
- Commit with suffix `[red]`: `test(P1.04): python execution and input interception [red]`

## Green

- Install dependencies: `pyodide`, `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-python`
- Extract a `runPython(code, inputHandler)` utility function — keeps Pyodide logic testable independently of React
- Intercept `input()` by overriding `sys.stdin` in Pyodide's Python environment with a JS-backed async reader
- Build `PythonEditor.tsx`: CodeMirror editor + Run button + output div + conditional input field
- Wrap in an Astro component `src/components/PythonEditor.astro` with `client:load`
- Add `/dev/python-editor.astro` validation page (excluded from sitemap)
- Make tests pass

## Refactor

- Ensure `runPython` is a pure async function with no React dependency — it should be importable in tests without a DOM
- The `input()` input field should be visually distinct from the output console (different background or border)

## Review Focus

- Pyodide loads lazily — confirm Network tab shows pyodide assets loading only on pages that use the component, not on the home page
- `input()` interception: run a multi-input script (two `input()` calls) and confirm each one pauses and resumes correctly in sequence
- Vitest tests pass in CI
- The `/dev/python-editor` page is excluded from the sitemap and not linked from navigation

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

Red first: [what test failed first]
Why this path: [why this implementation was the smallest acceptable]
Alternative considered: [one rejected alternative and why]
Deferred: [what was intentionally left out of this ticket]
Contract note: Size is 5 points rather than the default 2 — Pyodide integration and input() interception are non-trivial and warrant the larger estimate.
