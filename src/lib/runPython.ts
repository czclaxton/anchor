import type { PyodideInterface } from 'pyodide'

export interface RunPythonResult {
  stdout: string
}

let pyodideInstance: PyodideInterface | null = null
let pyodideLoading: Promise<PyodideInterface> | null = null

async function getPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance
  if (pyodideLoading) return pyodideLoading
  const p = (async () => {
    const { loadPyodide } = await import('pyodide')
    pyodideInstance = await loadPyodide()
    return pyodideInstance
  })()
  // Reset on failure so callers can retry after a transient network error.
  p.catch(() => {
    pyodideLoading = null
  })
  pyodideLoading = p
  return pyodideLoading
}

export function preloadPyodide(): void {
  getPyodide().catch(() => {})
}

export async function runPython(
  code: string,
  onInput?: (prompt: string) => Promise<string>,
): Promise<RunPythonResult> {
  const pyodide = await getPyodide()

  let stdout = ''
  pyodide.setStdout({ batched: (text: string) => (stdout += text + '\n') })
  pyodide.setStderr({ batched: (_text: string) => {} })

  if (onInput) {
    pyodide.globals.set('_onInput', (prompt: string) => onInput(prompt))
    await pyodide.runPythonAsync(`
import builtins as _builtins_mod
_original_input = _builtins_mod.input

async def _async_input(prompt=''):
    return str(await _onInput(str(prompt)))

_builtins_mod.input = _async_input
`)
    try {
      await pyodide.runPythonAsync(wrapWithAsyncInput(code))
    } finally {
      // Restore the original input() so subsequent calls without onInput work correctly.
      await pyodide.runPythonAsync('_builtins_mod.input = _original_input')
    }
  } else {
    await pyodide.runPythonAsync(code)
  }

  return { stdout }
}

function wrapWithAsyncInput(code: string): string {
  const transformed = code.replace(/\binput\s*\(/g, 'await input(')
  const indented = transformed
    .split('\n')
    .map((line) => '  ' + line)
    .join('\n')
  return `async def _user_main():\n${indented}\n\nawait _user_main()\n`
}
