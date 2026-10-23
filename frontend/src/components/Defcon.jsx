import { motion } from 'framer-motion'
import { defconLevel } from '../defcon'

const LEVEL_COLORS = { 5: '#3b82f6', 4: '#22c55e', 3: '#f5a524', 2: '#f97316', 1: '#e5243b' }
const LEVEL_TEXT = {
  5: 'Fade out. Peaceful cooperation.',
  4: 'Double take. Trust holding.',
  3: 'Round house. Tensions rising.',
  2: 'Fast pace. Widespread betrayal.',
  1: 'Cocked pistol. Total war.',
}

/** Compact chip for the nav bar. */
export function DefconChip({ defcon }) {
  const level = defcon ? defconLevel(defcon.rate) : 5
  return (
    <div className="flex items-center gap-2 border border-steel-light px-3 py-1.5" title={defcon?.source}>
      <span className="label">Defcon</span>
      <motion.span
        key={level}
        initial={{ scale: 1.8 }}
        animate={{ scale: 1, opacity: level === 1 ? [1, 0.4, 1] : 1 }}
        transition={level === 1 ? { opacity: { repeat: Infinity, duration: 0.9 } } : {}}
        className="text-xl font-extrabold"
        style={{ color: LEVEL_COLORS[level] }}
      >
        {defcon ? level : '–'}
      </motion.span>
    </div>
  )
}

/** Full panel indicator for the briefing. */
export default function Defcon({ defcon }) {
  const level = defcon ? defconLevel(defcon.rate) : null
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {[5, 4, 3, 2, 1].map((n) => {
          const active = n === level
          return (
            <motion.div
              key={n}
              animate={{
                backgroundColor: active ? LEVEL_COLORS[n] : '#0d0f11',
                opacity: active && n === 1 ? [1, 0.5, 1] : 1,
              }}
              transition={active && n === 1 ? { opacity: { repeat: Infinity, duration: 0.9 } } : {}}
              className="flex h-20 items-center justify-center border text-3xl font-extrabold"
              style={{ borderColor: LEVEL_COLORS[n], color: active ? '#000' : LEVEL_COLORS[n] }}
            >
              {n}
            </motion.div>
          )
        })}
      </div>
      <div className="mt-3 font-type text-lg" style={{ color: level ? LEVEL_COLORS[level] : undefined }}>
        {level ? LEVEL_TEXT[level] : 'Awaiting first engagement.'}
      </div>
      {defcon && (
        <div className="label mt-1">
          Defection rate {Math.round(defcon.rate * 100)}% · {defcon.source}
        </div>
      )}
    </div>
  )
}
