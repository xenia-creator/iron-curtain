import { motion } from 'framer-motion'

/** Red panel listing disqualified bots with their distinct forfeit reasons. */
export default function Disqualified({ disqualified, forfeits }) {
  if (!disqualified?.length) return null
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border-2 border-alert bg-alert/10 p-4 shadow-[0_0_30px_-10px_var(--color-alert)]"
    >
      <h3 className="stamp mb-3 inline-block text-alert">Disqualified</h3>
      <ul className="space-y-3">
        {disqualified.map((bot) => {
          const reasons = [...new Set(forfeits.filter((f) => f.bot === bot).map((f) => f.reason))]
          return (
            <li key={bot}>
              <div className="font-bold text-alert line-through decoration-2">{bot}</div>
              {reasons.map((r) => (
                <div key={r} className="ml-3 text-sm whitespace-pre-wrap text-paper/80">› {r}</div>
              ))}
            </li>
          )
        })}
      </ul>
    </motion.section>
  )
}
