const KEY_PREFIX = 'anchor:progress:'

function storageKey(subjectSlug: string): string {
  return `${KEY_PREFIX}${subjectSlug}`
}

function parseSlugArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function markComplete(lessonSlug: string, subjectSlug: string): void {
  const key = storageKey(subjectSlug)
  const existing = localStorage.getItem(key)
  const slugs = existing ? parseSlugArray(existing) : []
  if (!slugs.includes(lessonSlug)) {
    slugs.push(lessonSlug)
    localStorage.setItem(key, JSON.stringify(slugs))
  }
}

export function getProgress(
  subjectSlug: string,
  totalLessons: number,
): { completed: number; total: number } {
  const key = storageKey(subjectSlug)
  const existing = localStorage.getItem(key)
  const slugs = existing ? parseSlugArray(existing) : []
  return { completed: slugs.length, total: totalLessons }
}

export function markIncomplete(lessonSlug: string, subjectSlug: string): void {
  const key = storageKey(subjectSlug)
  const existing = localStorage.getItem(key)
  const slugs = existing ? parseSlugArray(existing) : []
  const filtered = slugs.filter((s) => s !== lessonSlug)
  localStorage.setItem(key, JSON.stringify(filtered))
}

export function isComplete(lessonSlug: string, subjectSlug: string): boolean {
  const key = storageKey(subjectSlug)
  const existing = localStorage.getItem(key)
  if (!existing) return false
  return parseSlugArray(existing).includes(lessonSlug)
}
