import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api, parseSeed, useAction } from '../api'
import { estimateDefection } from '../defcon'
import SimulationLoader from '../components/SimulationLoader'
import { Button, ErrorBox, Field, Panel, Stamp, Toggle, inputClass } from '../components/ui'

const STEP_MS = 1400
const GAME_NAMES = { prisoners_dilemma: "Prisoner's Dilemma", chicken: 'Chicken', stag_hunt: 'Stag Hunt' }

export default function Endgame({ reference, setDefcon }) {
  const { games, teams } = reference
  const [seed, setSeed] = useState('')
  const [includeBuiltins, setIncludeBuiltins] = useState(false)
  const [event, run] = useAction(api.event, 2200)
  // Each round takes two steps: entrants appear, then the cut is applied
  const [step, setStep] = useState(0)
  const [showChampion, setShowChampion] = useState(false)

  const rounds = event.data?.rounds ?? []
  const lastStep = rounds.length * 2

  useEffect(() => {
    if (!event.data) return
    if (step >= lastStep) {
      const timer = setTimeout(() => setShowChampion(true), 600)
      return () => clearTimeout(timer)
    }
    const timer = setTimeout(() => setStep((s) => s + 1), STEP_MS)
    return () => clearTimeout(timer)
  }, [event.data, step, lastStep])

  async function onRun() {
    setStep(0)
    setShowChampion(false)
    const data = await run({ seed: parseSeed(seed), include_builtins: includeBuiltins })
    const rates = (data?.rounds ?? [])
      .map((r) => estimateDefection(r.leaderboard, games.find((g) => g.key === r.game)))
      .filter((r) => r != null)
    if (rates.length) {
      setDefcon({ rate: rates.reduce((a, b) => a + b) / rates.length, source: 'estimated from avg score, full event' })
    }
  }

  const data = event.data

  return (
    <div className="space-y-6">
      <Panel title="Final Operation" right={<span className="label">{teams.length} teams registered</span>}>
        <div className="flex flex-wrap items-end gap-5">
          <div className="w-48">
            <Field label="Seed (blank = random)">
              <input type="number" className={inputClass} value={seed} placeholder="2026"
                onChange={(e) => setSeed(e.target.value)} />
            </Field>
          </div>
          <div className="pb-2">
            <Toggle checked={includeBuiltins} onChange={setIncludeBuiltins} label="Built-ins as background" />
          </div>
          <Button variant="primary" className="px-10 py-3 text-base" disabled={event.loading} onClick={onRun}>
            ☢ Run Full Event
          </Button>
          {data && step < lastStep && (
            <Button onClick={() => setStep(lastStep)}>Skip ⏭</Button>
          )}
        </div>
        <div className="mt-4"><ErrorBox error={event.error} /></div>
      </Panel>

      <SimulationLoader active={event.loading} title="Executing four-round event" />

      {data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rounds.map((round, i) => (
            <RoundColumn key={round.name} round={round} index={i} stage={Math.max(0, Math.min(2, step - i * 2))} />
          ))}
        </div>
      )}

      {data && step >= lastStep && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="border border-amber/60 bg-amber/5 p-6 text-center">
          <div className="label">Champion</div>
          <div className="mt-1 text-4xl font-extrabold text-amber">{data.champion ?? 'No survivors'}</div>
          <Button className="mt-4" onClick={() => setShowChampion(true)}>Replay reveal</Button>
        </motion.div>
      )}

      <AnimatePresence>
        {showChampion && data && (
          <ChampionReveal champion={data.champion} onClose={() => setShowChampion(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function RoundColumn({ round, index, stage }) {
  const totals = Object.fromEntries(round.leaderboard.map((r) => [r.name, r.total]))
  const disqualified = new Set(round.disqualified)
  const advanced = new Set(round.advanced)
  // Built-ins can appear on the leaderboard but are never entrants
  const entrants = [
    ...round.advanced,
    ...round.eliminated.filter((n) => !disqualified.has(n)),
    ...round.eliminated.filter((n) => disqualified.has(n)),
  ]

  return (
    <motion.section
      initial={{ opacity: 0.25 }}
      animate={{ opacity: stage > 0 ? 1 : 0.25 }}
      className={`border bg-panel/90 ${stage > 0 ? 'border-steel-light' : 'border-steel'}`}
    >
      <header className="border-b border-steel bg-steel/40 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-extrabold text-alert">{['I', 'II', 'III', 'IV'][index] ?? index + 1}</span>
          <span className="label !text-xs">{entrants.length} entrants</span>
        </div>
        <div className="mt-1 font-bold tracking-wider uppercase">{round.name}</div>
        <div className="text-xs text-muted">
          {GAME_NAMES[round.game]} · {round.hide_turn_count ? '?? turns' : `${round.turns} turns`}
          {round.noise > 0 && ` · ${Math.round(round.noise * 100)}% noise`}
        </div>
      </header>
      <ul className="space-y-1 p-3">
        {stage === 0 && <li className="label py-6 text-center">Awaiting orders</li>}
        {stage > 0 && entrants.map((name, i) => {
          const cut = stage === 2
          const dq = disqualified.has(name)
          const out = cut && !advanced.has(name)
          return (
            <motion.li
              key={name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: out && !dq ? 0.35 : 1, x: 0 }}
              transition={{ delay: cut ? 0 : i * 0.04 }}
              className={`flex justify-between gap-2 border px-2 py-1 text-sm transition-colors ${
                cut && dq ? 'border-alert bg-alert/15 text-alert'
                  : out ? 'border-transparent text-muted line-through'
                    : cut ? 'border-coop/50 bg-coop/10 text-paper' : 'border-steel text-paper'
              }`}
            >
              <span className="truncate">{name}</span>
              <span className="shrink-0 tabular-nums text-xs leading-5">
                {cut && dq ? 'DQ' : totals[name] ?? '—'}
              </span>
            </motion.li>
          )
        })}
      </ul>
    </motion.section>
  )
}

function ChampionReveal({ champion, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-black/90"
    >
      <motion.div
        className="absolute h-[80vmin] w-[80vmin] rounded-full bg-[radial-gradient(circle,rgb(229_36_59/0.45),transparent_65%)]"
        animate={{ scale: [0.6, 1.15, 1], opacity: [0, 1, 0.8] }}
        transition={{ duration: 1.6 }}
      />
      <motion.div
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      />
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="label relative !text-lg">
        Last agent standing
      </motion.div>
      <motion.h2
        initial={{ scale: 3, opacity: 0, filter: 'blur(12px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
        className="relative mt-4 px-4 text-center text-6xl font-extrabold break-all text-amber drop-shadow-[0_0_30px_rgb(245_165_36/0.7)] md:text-8xl"
      >
        {champion ?? 'NO SURVIVORS'}
      </motion.h2>
      <motion.div
        initial={{ scale: 4, opacity: 0, rotate: 10 }}
        animate={{ scale: 1, opacity: 1, rotate: -8 }}
        transition={{ delay: 1.8, type: 'spring', stiffness: 300, damping: 14 }}
        className="relative mt-10 text-4xl md:text-6xl"
      >
        <Stamp>{champion ? 'Champion' : 'Mutual destruction'}</Stamp>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
        className="label relative mt-12">
        Click to dismiss
      </motion.div>
    </motion.div>
  )
}
