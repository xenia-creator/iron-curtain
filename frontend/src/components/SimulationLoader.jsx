import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const LOG = [
  'Establishing secure uplink',
  'Spinning up sandboxed agents',
  'Exchanging opening moves',
  'Monitoring for betrayal',
  'Tallying payoffs',
  'Decrypting results',
]

export default function SimulationLoader({ active, title = 'Running simulation' }) {
  return <AnimatePresence>{active && <Loader title={title} />}</AnimatePresence>
}

function Loader({ title }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, LOG.length - 1)), 700)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border border-amber/60 bg-ink/90 p-5"
    >
      <div className="flex items-center justify-between">
        <motion.span
          className="font-type text-xl tracking-widest text-amber uppercase"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.1 }}
        >
          ▲ {title}
        </motion.span>
        <span className="label">Do not disconnect</span>
      </div>
      <div className="relative mt-4 h-2 overflow-hidden bg-steel">
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-amber to-transparent"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        />
      </div>
      <ul className="mt-4 space-y-1 text-sm">
        {LOG.slice(0, step + 1).map((line, i) => (
          <motion.li key={line} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            className={i === step ? 'text-amber' : 'text-muted'}>
            {i === step ? '>' : '✓'} {line}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
