import { useEffect, useState } from 'react'
import { isComplete, markComplete } from '../lib/progress'

interface Props {
  lessonSlug: string
  subjectSlug: string
}

export default function AnchoredButton({ lessonSlug, subjectSlug }: Props) {
  const [anchored, setAnchored] = useState(false)
  const [dropping, setDropping] = useState(false)

  useEffect(() => {
    setAnchored(isComplete(lessonSlug, subjectSlug))
  }, [lessonSlug, subjectSlug])

  function handleClick() {
    if (anchored) return
    markComplete(lessonSlug, subjectSlug)
    setDropping(true)
    setTimeout(() => {
      setDropping(false)
      setAnchored(true)
    }, 600)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={anchored}
      className={[
        'inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-all duration-300',
        anchored
          ? 'cursor-default bg-green-600'
          : 'cursor-pointer bg-blue-600 hover:bg-blue-700 active:scale-95',
        dropping ? 'animate-anchor-drop' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={dropping ? 'animate-bounce' : ''}>⚓</span>
      {anchored ? 'Anchored!' : 'Mark as Anchored!'}
    </button>
  )
}
