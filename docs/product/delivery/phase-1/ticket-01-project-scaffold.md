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
Why this path: minimal Astro template keeps the starting surface area small; integrations added explicitly so each one is intentional.
Alternative considered: Next.js — rejected; Astro's island architecture is a better fit for a mostly-static content site with selective React/Phaser hydration.
Deferred: Phaser.js — not installed here; added in the first interactive ticket that needs it based on design session outcome.
Contract note: none.
