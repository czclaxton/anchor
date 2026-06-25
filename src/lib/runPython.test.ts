import { describe, expect, it, vi } from 'vitest'
import { runPython } from './runPython'

describe('runPython', () => {
  it("resolves with stdout for print('hello')", async () => {
    const result = await runPython("print('hello')")
    expect(result.stdout).toBe('hello\n')
  })

  it('pauses on input() and resumes with provided value', async () => {
    const mockInput = vi.fn().mockResolvedValueOnce('Alice')
    const result = await runPython("x = input('name?')\nprint(x)", mockInput)
    expect(mockInput).toHaveBeenCalledWith('name?')
    expect(result.stdout).toBe('Alice\n')
  })
})
