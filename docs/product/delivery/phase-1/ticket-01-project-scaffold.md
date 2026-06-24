# P1.01 Project Scaffold

Size: 3 points
Type: chore
Scope: scaffold
Red: skip

## Outcome

- Astro project initialised with Tailwind CSS, MDX support, and React integration configured
- Project runs locally with `bun run dev` without errors
- Vercel project wired; every push to main triggers a deploy and every PR gets a preview URL
- Bun scripts in `package.json`: `dev`, `build`, `preview`, `format`, `ci:quiet`
- Basic folder structure exists: `src/`, `public/`, `src/components/`, `src/layouts/`, `src/content/`

## Red

`Red: skip` — scaffold is infrastructure, not testable user behaviour.

## Green

- Run `bunx create astro@latest` with the minimal template
- Add `@astrojs/tailwind`, `@astrojs/mdx`, `@astrojs/react` integrations via `astro add`
- Confirm `astro.config.mjs` includes all three integrations
- Add `bun run format` (Prettier), `bun run ci:quiet` (build + type-check, silent on success)
- Create Vercel project, link repo, set framework to Astro
- Push to main and confirm Vercel deploy succeeds

## Refactor

- Ensure `tsconfig.json` uses strict mode
- Confirm `.gitignore` covers `node_modules/`, `dist/`, `.vercel/`

## Review Focus

- All three Astro integrations (Tailwind, MDX, React) are present in `astro.config.mjs` and resolve without warnings
- Vercel deploy succeeds on the preview URL — paste the URL in the PR description
- `bun run build` exits 0 locally before opening the PR

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

Red first: skipped — no testable user behaviour at scaffold stage.
Why this path: Tailwind v4 via `@tailwindcss/vite` rather than `@astrojs/tailwind` + v3 — v4 is the current standard and the Vite plugin approach requires no config file. Manual scaffold rather than `bunx create-astro` to preserve the existing SoA `package.json` scripts and `tsconfig.json` during merge.
Alternative considered: `bunx create-astro` — rejected because it would overwrite the existing `package.json` (SoA deliver scripts) and `tsconfig.json`; manual setup gave full control over what was merged.
Deferred: Vercel project link — requires interactive `vercel link`; code is deploy-ready but Vercel wiring is a manual step for the developer. `.prettierrc` added here but `.gitignore` `dist/` and `.vercel/` entries were already present from the initial commit.
Contract note: none.

Advisory observations (subagent review, no patches applied):
- `tools/delivery/*.ts` is now excluded from TypeScript coverage — the new `"include": ["src", "*.mjs", "*.ts"]` in `tsconfig.json` omits `tools/`. The tools run fine via Bun at runtime but are no longer statically type-checked in CI. A future ticket should add a separate `tsconfig.tools.json` with Bun types if coverage over delivery tooling is desired.
- `src/styles/global.css` is imported with a relative path (`../styles/global.css`) in `src/pages/index.astro`. Pages in subdirectories (e.g. `src/pages/subjects/lesson.astro`) will silently miss this import. T02/T03 should move the global CSS import into the base layout rather than individual pages.
- Outcome bullet 3 ("Vercel project wired") and Green steps 5–6 ("Create Vercel project") are stale — Vercel wiring was deferred per Rationale. The Outcome and Green sections were written pre-implementation and were not updated post-implementation; the Rationale is the authoritative record of what was actually delivered.
