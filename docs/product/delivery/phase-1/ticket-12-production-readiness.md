# P1.12 Production Readiness

Size: 2 points
Type: chore
Scope: deploy
Red: skip

## Outcome

- Each page has a meaningful `<title>` and `<meta name="description">` tag
- An Open Graph image exists for the site (used when the URL is shared on social/messaging apps)
- The site renders without obvious layout breaks on a mobile viewport (375px width)
- The `/dev/python-editor` validation page from T04 is removed or gated behind a dev-only check
- `bun run ci:quiet` exits 0 on main
- The production Vercel URL is confirmed live and shareable
- Developer has reviewed the site end-to-end on the production URL before signing off

## Red

`Red: skip` — production readiness is verified by the developer reviewing the live URL, not automated tests.

## Green

- Add a `<BaseHead>` component to `BaseLayout.astro` that accepts `title` and `description` props and renders the appropriate `<head>` tags
- Pass meaningful `title` and `description` from each page: home, subject landing, and each lesson
- Create a simple OG image (1200×630) — can be a static image generated with an AI image tool; store in `public/og-image.png`
- Add `<meta property="og:image">` pointing to the OG image
- Check the site at 375px viewport width; fix any obvious overflow or unreadable text
- Remove or conditionally exclude the `/dev/python-editor` page from production builds
- Run `bun run ci:quiet` and confirm it exits 0
- Share the production URL with the friend-tester and confirm it loads

## Refactor

- Ensure `BaseHead` is the single place where all `<head>` metadata is managed — no duplicate meta tags across layouts

## Review Focus

- Paste the production URL into a messaging app and confirm the OG image and description appear correctly in the link preview
- Open the site on an actual mobile device or browser dev tools at 375px — all three lessons must be readable and navigable
- The `/dev/python-editor` page is not accessible in production
- `bun run ci:quiet` exits 0

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

Red first: skipped — production readiness is human-verified on the live URL.
Why this path: minimal meta and OG coverage is the smallest change that makes the site shareable without embarrassment.
Alternative considered: full SEO audit — deferred; this is a personal portfolio site, not a search-optimised product.
Deferred: sitemap.xml, robots.txt, per-page OG images, structured data — all deferred to future phases.
Contract note: none.
