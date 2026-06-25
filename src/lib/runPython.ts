export interface RunPythonResult {
  stdout: string
}

export async function runPython(
  _code: string,
  _onInput?: (prompt: string) => Promise<string>,
): Promise<RunPythonResult> {
  throw new Error('runPython: not yet implemented')
}
