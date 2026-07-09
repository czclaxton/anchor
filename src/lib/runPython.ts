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
    // In browsers, Vite's bundled path can't serve .wasm so we point to CDN.
    // In Node.js (tests), let Pyodide auto-detect the local package path.
    const isBrowser = typeof window !== 'undefined'
    pyodideInstance = await loadPyodide(
      isBrowser
        ? { indexURL: 'https://cdn.jsdelivr.net/pyodide/v314.0.0/full/' }
        : {},
    )
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

export async function runPythonExtractVars(
  code: string,
  varNames: readonly string[],
): Promise<{
  stdout: string
  vars: Record<string, unknown>
  error: string | null
}> {
  const pyodide = await getPyodide()
  let stdout = ''
  let error: string | null = null

  pyodide.setStdout({ batched: (text: string) => (stdout += text + '\n') })
  pyodide.setStderr({ batched: (_text: string) => {} })

  try {
    await pyodide.runPythonAsync(code)
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    return { stdout, vars: {}, error }
  }

  const vars: Record<string, unknown> = {}
  for (const name of varNames) {
    try {
      const val = pyodide.globals.get(name)
      if (val !== undefined) {
        vars[name] =
          val !== null &&
          typeof val === 'object' &&
          typeof (val as { toJs?: () => unknown }).toJs === 'function'
            ? (val as { toJs: () => unknown }).toJs()
            : val
      }
    } catch {
      // Variable not defined — leave absent
    }
  }

  return { stdout, vars, error: null }
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
