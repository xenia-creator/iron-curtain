import { useEffect, useState } from 'react'

/** Types out each line in turn, then loops. */
export default function Typewriter({ lines, speed = 45, pause = 1800 }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [length, setLength] = useState(0)
  const line = lines[lineIndex]

  useEffect(() => {
    const done = length >= line.length
    const timer = setTimeout(
      () => {
        if (!done) return setLength(length + 1)
        setLength(0)
        setLineIndex((lineIndex + 1) % lines.length)
      },
      done ? pause : speed,
    )
    return () => clearTimeout(timer)
  }, [length, line, lineIndex, lines.length, speed, pause])

  return <span className="caret">{line.slice(0, length)}</span>
}
