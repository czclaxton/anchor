const KEY_PREFIX = 'anchor:progress:'

function storageKey(subjectSlug: string): string {
  return `${KEY_PREFIX}${subjectSlug}`
}

export function markComplete(lessonSlug: string, subjectSlug: string): void {
  const key = storageKey(subjectSlug)
  const existing = localStorage.getItem(key)
  const slugs: string[] = existing ? (JSON.parse(existing) as string[]) : []
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
  const slugs: string[] = existing ? (JSON.parse(existing) as string[]) : []
  return { completed: slugs.length, total: totalLessons }
}

export function isComplete(lessonSlug: string, subjectSlug: string): boolean {
  const key = storageKey(subjectSlug)
  const existing = localStorage.getItem(key)
  if (!existing) return false
  const slugs = JSON.parse(existing) as string[]
  return slugs.includes(lessonSlug)
}
