import { useEffect, useState } from 'react'
import { getProgress } from '../lib/progress'

interface Props {
  subjectSlug: string
  totalLessons: number
}

export default function ProgressBar({ subjectSlug, totalLessons }: Props) {
  const [progress, setProgress] = useState({
    completed: 0,
    total: totalLessons,
  })

  useEffect(() => {
    const refresh = () => setProgress(getProgress(subjectSlug, totalLessons))
    refresh()
    window.addEventListener('anchor:progress-updated', refresh)
    return () => window.removeEventListener('anchor:progress-updated', refresh)
  }, [subjectSlug, totalLessons])

  const pct =
    progress.total > 0 ? (progress.completed / progress.total) * 100 : 0
  const allDone = progress.completed >= progress.total && progress.total > 0

  return (
    <div className="mb-6">
      <div className="mb-1 flex items-center justify-between text-sm font-medium text-gray-600">
        <span>Progress</span>
        <span>
          {progress.completed}/{progress.total} lessons anchored
        </span>
      </div>
      <div className="relative h-5 overflow-visible rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
        {[...Array(progress.total)].map((_, i) => {
          const linkPct = ((i + 1) / progress.total) * 100
          const filled = i < progress.completed
          return (
            <span
              key={i}
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs transition-all duration-300 ${filled ? 'opacity-100' : 'opacity-30'}`}
              style={{ left: `${linkPct}%` }}
              title={`Lesson ${i + 1}`}
            >
              ⛓
            </span>
          )
        })}
        <span
          className="absolute top-1/2 text-base transition-all duration-500"
          style={{
            left: `${pct}%`,
            transform: 'translateX(-50%) translateY(-50%)',
          }}
        >
          ⚓
        </span>
      </div>
    </div>
  )
}
