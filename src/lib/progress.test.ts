import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markComplete, getProgress } from './progress'

const store = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
  clear: () => {
    store.clear()
  },
  length: 0,
  key: (_index: number) => null,
}

beforeEach(() => {
  store.clear()
  vi.stubGlobal('localStorage', localStorageMock)
})

describe('progress tracking', () => {
  it('marks a lesson complete and stores its slug in localStorage', () => {
    markComplete('what-is-a-program', 'programming-fundamentals')
    const raw = localStorage.getItem('anchor:progress:programming-fundamentals')
    expect(raw).not.toBeNull()
    const stored = JSON.parse(raw!) as string[]
    expect(stored).toContain('what-is-a-program')
  })

  it('returns correct completed count for a subject', () => {
    markComplete('what-is-a-program', 'programming-fundamentals')
    markComplete('variables-and-io', 'programming-fundamentals')
    const { completed, total } = getProgress('programming-fundamentals', 3)
    expect(completed).toBe(2)
    expect(total).toBe(3)
  })

  it('marking the same lesson twice results in a count of 1, not 2', () => {
    markComplete('what-is-a-program', 'programming-fundamentals')
    markComplete('what-is-a-program', 'programming-fundamentals')
    const { completed } = getProgress('programming-fundamentals', 3)
    expect(completed).toBe(1)
  })
})
