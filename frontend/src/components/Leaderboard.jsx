import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

/**
 * Animated horizontal bars. New results first appear in the previous order,
 * then slide into rank order so the reshuffle is visible.
 */
export default function Leaderboard({ rows, builtins }) {
  const [order, setOrder] = useState([])

  useEffect(() => {
    const names = rows.map((r) => r.name)
    setOrder((prev) => [
      ...prev.filter((n) => names.includes(n)),
      ...names.filter((n) => !prev.includes(n)).sort(),
    ])
    const timer = setTimeout(() => setOrder(names), 700)
    return () => clearTimeout(timer)
  }, [rows])

  const byName = Object.fromEntries(rows.map((r) => [r.name, r]))
  // Scale from just below the lowest score so close totals still look different
  const totals = rows.map((r) => r.total)
  const max = Math.max(...totals)
  const floor = Math.min(...totals) * 0.9
  const width = (total) => (max === floor ? 100 : 8 + (92 * (total - floor)) / (max - floor))

  return (
    <ol className="space-y-1.5">
      {order.filter((name) => byName[name]).map((name, i) => {
        const row = byName[name]
        const builtin = builtins.has(name)
        return (
          <motion.li
            key={name}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ layout: { type: 'spring', stiffness: 260, damping: 30 }, delay: i * 0.02 }}
            className="grid grid-cols-[2.5rem_minmax(8rem,14rem)_1fr_5.5rem] items-center gap-3"
          >
            <span className={`text-right text-lg font-extrabold ${row.rank === 1 ? 'text-amber' : 'text-muted'}`}>
              {row.rank}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span className={`truncate font-semibold ${builtin ? 'text-muted' : 'text-paper'}`}>{name}</span>
              {builtin && (
                <span className="shrink-0 border border-steel-light px-1 text-[0.6rem] tracking-widest text-muted">BUILT-IN</span>
              )}
            </span>
            <div className="h-6 bg-ink">
              <motion.div
                className={`h-full ${builtin ? 'bg-[repeating-linear-gradient(135deg,#3a424c_0_6px,#262c33_6px_12px)]' : row.rank === 1 ? 'bg-amber' : 'bg-alert'}`}
                initial={{ width: 0 }}
                animate={{ width: `${width(row.total)}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>
            <span className="text-right">
              <span className="font-bold">{row.total}</span>
              <span className="block text-xs text-muted">{row.avg_per_turn.toFixed(2)}/turn</span>
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}
