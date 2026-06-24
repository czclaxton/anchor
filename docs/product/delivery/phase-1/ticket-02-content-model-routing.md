# P1.02 Content Model + Routing

Size: 3 points
Type: feat
Scope: routing
Red: skip

## Outcome

- Astro content collections defined for `subjects`, `units` (optional), and `lessons`
- Dynamic routes resolve: `/[subject]/[lesson]` for standalone lessons and `/[subject]/[unit]/[lesson]` for unit-grouped lessons
- A single MDX lesson layout component exists with named slots: hook, analogy, image (optional), explanation, editor (optional), interactive (optional), summary, and the "Anchored!" button placeholder
- Navigating to a valid lesson URL renders the layout with placeholder content — no 404
- Navigating to an invalid URL returns a proper 404 page

## Red

`Red: skip` — route existence is verified by the Vercel preview deploy and manual navigation, not a unit test.

## Green

- Define Astro content collections in `src/content/config.ts`:
  - `lessons` collection with schema: `title`, `subject`, `unit` (optional), `order`, `analogy`, `hook`
- Create dynamic route files:
  - `src/pages/[subject]/[lesson].astro` — standalone lesson
  - `src/pages/[subject]/[unit]/[lesson].astro` — unit-grouped lesson
- Create `src/layouts/LessonLayout.astro` with all named slots and placeholder copy for each
- Add one stub MDX file per route type to confirm both resolve correctly
- Add a `src/pages/404.astro` page

## Refactor

- Ensure content collection schema is strict enough to catch missing required fields at build time
- Confirm both route patterns coexist without conflict in Astro's file-based router

## Review Focus

- Both route patterns render without errors on the preview URL
- The layout slots are named clearly and match the lesson structure: hook → analogy → image → explanation → editor → interactive → summary → anchored-button
- The content schema enforces required fields — a lesson MDX missing `title` or `subject` should fail the build, not silently render broken
- Standalone and unit-grouped lessons both resolve correctly in the same build

## Rationale

> Append here (do not edit above) when behaviour or trade-offs change during implementation.

Red first: skipped — route correctness is verified by build + preview navigation.
Why this path: Astro content collections give type-safe frontmatter validation at build time, which catches content errors before they reach production.
Alternative considered: flat file structure with no collections — rejected; loses build-time validation and makes querying lessons for the home page harder.
Deferred: actual lesson content — stub MDX files only in this ticket.
Contract note: TypeScript inference for `getCollection('lessons')` returns `any[]` in this project's Astro 5 setup under strict TypeScript (likely a type-generation ordering issue). Workaround: explicitly type the result as `Array<CollectionEntry<'lessons'>>` in both `getStaticPaths` functions. This is type-safe and should be revisited if Astro resolves the inference.
