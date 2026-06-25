import { basicSetup } from 'codemirror'
import { python } from '@codemirror/lang-python'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useEffect, useRef, useState } from 'react'
import { preloadPyodide, runPython } from '../lib/runPython'

const DEFAULT_CODE = 'print("Hello, World!")'

interface InputState {
  prompt: string
  onSubmit: (value: string) => void
}

export default function PythonEditor() {
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [inputState, setInputState] = useState<InputState | null>(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    preloadPyodide()
  }, [])

  useEffect(() => {
    if (!editorContainerRef.current) return
    const view = new EditorView({
      state: EditorState.create({
        doc: DEFAULT_CODE,
        extensions: [basicSetup, python()],
      }),
      parent: editorContainerRef.current,
    })
    viewRef.current = view
    return () => view.destroy()
  }, [])

  async function handleRun() {
    if (!viewRef.current || isRunning) return
    const code = viewRef.current.state.doc.toString()
    setOutput('')
    setIsRunning(true)
    try {
      const result = await runPython(code, (prompt) => {
        return new Promise((resolve) => {
          setInputState({ prompt, onSubmit: resolve })
        })
      })
      setOutput(result.stdout)
    } catch (err) {
      setOutput(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRunning(false)
      setInputState(null)
    }
  }

  function handleInputSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputState) return
    const value = inputValue
    inputState.onSubmit(value)
    setInputValue('')
    setInputState(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={editorContainerRef}
        className="overflow-hidden rounded border border-gray-300"
      />
      <button
        onClick={handleRun}
        disabled={isRunning}
        className="self-start rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isRunning ? 'Running…' : 'Run'}
      </button>
      {output && (
        <pre className="overflow-auto rounded border border-gray-200 bg-gray-50 p-3 font-mono text-sm">
          {output}
        </pre>
      )}
      {inputState && (
        <form
          onSubmit={handleInputSubmit}
          className="flex items-center gap-2 rounded border border-blue-300 bg-blue-50 p-3"
        >
          <label className="font-mono text-sm text-gray-700">
            {inputState.prompt || 'Input:'}
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Enter
          </button>
        </form>
      )}
    </div>
  )
}
