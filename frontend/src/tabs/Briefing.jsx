import { motion } from 'framer-motion'
import { useState } from 'react'
import Defcon from '../components/Defcon'
import PayoffMatrix from '../components/PayoffMatrix'
import Typewriter from '../components/Typewriter'
import { Panel, Segmented, Stamp } from '../components/ui'

const SUBTITLES = [
  'Cooperate or defect. Every move is remembered.',
  'Trust is a strategy. So is betrayal.',
  'Four rounds. Changing rules. One survivor.',
]

const ROUNDS = [
  ['I', 'Opening Moves', "Prisoner's Dilemma · 200 turns · top half advance"],
  ['II', 'Fog of War', "Prisoner's Dilemma · 5% noise flips moves · top half advance"],
  ['III', 'Brinkmanship', 'Chicken · 2% noise · only the top 2 advance'],
  ['IV', 'Endgame', 'Stag Hunt · 2% noise · turn count hidden · one champion'],
]

const EXAMPLE = `def strategy(my_history, opp_history):
    # histories are lists of 'C' and 'D'
    if not opp_history:
        return 'C'
    return opp_history[-1]`

export default function Briefing({ reference, defcon }) {
  const { games } = reference
  const [gameKey, setGameKey] = useState('prisoners_dilemma')
  const game = games.find((g) => g.key === gameKey)

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden border border-steel bg-panel/60 px-6 py-14 text-center md:py-20">
        <motion.div
          initial={{ opacity: 0, scale: 2.5, rotate: -30 }}
          animate={{ opacity: 0.9, scale: 1, rotate: -12 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 12 }}
          className="absolute top-6 right-6 text-2xl md:top-10 md:right-14 md:text-4xl"
        >
          <Stamp>Top Secret</Stamp>
        </motion.div>
        <div className="label mb-4">Eyes only · Directorate of Game Theory · File 1983-RG</div>
        <motion.h1
          initial={{ opacity: 0, letterSpacing: '0.6em' }}
          animate={{ opacity: 1, letterSpacing: '0.12em' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="text-5xl font-extrabold text-alert drop-shadow-[0_0_25px_rgb(229_36_59/0.5)] md:text-8xl"
        >
          IRON CURTAIN
        </motion.h1>
        <p className="mt-6 min-h-[2em] font-type text-xl text-paper md:text-3xl">
          <Typewriter lines={SUBTITLES} />
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Payoff Matrix"
          right={<span className="label !text-amber">{game?.name}</span>}
        >
          {games.length > 0 && (
            <Segmented
              value={gameKey}
              onChange={setGameKey}
              options={games.map((g) => ({ value: g.key, label: g.name }))}
            />
          )}
          <div className="mt-4">
            {game ? <PayoffMatrix game={game} /> : <p className="label">No game data.</p>}
          </div>
          <p className="label mt-3">Points per turn: yours / theirs</p>
        </Panel>

        <Panel title="Threat Level">
          <Defcon defcon={defcon} />
          <p className="mt-4 text-sm text-muted">
            Reflects the defection rate of the last tournament, replay or event you ran.
          </p>
        </Panel>
      </div>

      <Panel title="Rules of Engagement" right={<Stamp className="text-xs">Classified</Stamp>}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p>
              Write a Python function <code className="text-amber">strategy(my_history, opp_history)</code> that
              returns <b className="text-coop">'C'</b> to cooperate or <b className="text-alert">'D'</b> to defect.
            </p>
            <p className="text-muted">
              Every bot plays every other bot. Points come from the payoff matrix. Crash, time out or return
              anything else and you are disqualified.
            </p>
            <pre className="overflow-x-auto border border-steel-light bg-ink p-3 text-sm text-paper">{EXAMPLE}</pre>
          </div>
          <ol className="space-y-3">
            {ROUNDS.map(([num, name, twist]) => (
              <li key={num} className="flex gap-4 border-l-2 border-alert bg-ink/60 px-4 py-3">
                <span className="w-8 text-2xl font-extrabold text-alert">{num}</span>
                <span>
                  <span className="block font-bold tracking-wider uppercase">{name}</span>
                  <span className="text-sm text-muted">{twist}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Panel>
    </div>
  )
}
