# P1.03 Site Shell

Size: 3 points
Type: feat
Scope: shell
Red: skip

## Outcome

- Home page (`/`) renders a feed of the latest lessons, ordered by `order` field, with title and subject visible
- Subject landing page (`/[subject]`) lists all lessons under that subject with breadcrumb: `Home > Subject`
- Lesson pages show breadcrumbs: `Home > Subject > Lesson` (or `Home > Subject > Unit > Lesson`)
- Prev/next navigation links appear at the bottom of each lesson, linking to the adjacent lesson in order
- Site header shows the Anchor name/logo and a link back to home
- Site footer is minimal — no content required beyond basic structure
- Site renders without layout errors on desktop viewport

## Red

`Red: skip` — shell layout and navigation verified by visual review on the Vercel preview, not unit tests.

## Green

- Create `src/pages/index.astro` — query the `lessons` content collection, sort by `order`, render a list
- Create `src/pages/[subject]/index.astro` — filter lessons by subject, render list with breadcrumb
- Add breadcrumb component `src/components/Breadcrumb.astro` — accepts an array of `{ label, href }` items
- Add prev/next navigation to `LessonLayout.astro` — derive adjacent lessons from the ordered collection
- Create `src/components/SiteHeader.astro` and `src/components/SiteFooter.astro`
- Wire header and footer into a `src/layouts/BaseLayout.astro` used by all pages

## Refactor

- Breadcrumb and prev/next logic should be computed once in the layout, not duplicated across route files
- Ensure the home page lesson query is reusable for the subject page (shared utility or collection helper)

## Review Focus

- A visitor can navigate from home → subject → lesson → next lesson → previous lesson using only on-page links (no URL typing required)
- Breadcrumbs correctly reflect the current page's position in the hierarchy for both route patterns (standalone and unit-grouped)
- Prev/next links do not appear on the first and last lessons respectively — no broken links
- **After this PR merges: share the preview URL with the friend-tester**

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

Red first: skipped — navigation correctness is verified by clicking through the preview.
Why this path: shell ships before lesson content so the friend-tester gets a real navigable experience from lesson 1 onward.
Alternative considered: home page as a marketing/intro page — deferred; a latest-lessons feed is simpler and more useful for a personal knowledge library at this stage.
Deferred: categories/tags page, search, per-subject landing page polish — all deferred to future phases.
Contract note: none.
