import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { DefconChip } from './components/Defcon'
import { ErrorBox, Spinner } from './components/ui'
import Briefing from './tabs/Briefing'
import Endgame from './tabs/Endgame'
import Replay from './tabs/Replay'
import Roster from './tabs/Roster'
import WarRoom from './tabs/WarRoom'

const TABS = [
  ['Briefing', Briefing],
  ['Roster', Roster],
  ['War Room', WarRoom],
  ['Replay', Replay],
  ['Endgame', Endgame],
]

/** Games, built-ins and teams, shared by every tab. */
function useReference() {
  const [state, setState] = useState({ games: [], strategies: [], teams: [], loading: true, error: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [games, strategies, teams] = await Promise.all([api.games(), api.strategies(), api.teams()])
      setState({ games, strategies, teams: teams.map((t) => t.team_name), loading: false, error: null })
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }))
    }
  }, [])

  const reloadTeams = useCallback(async () => {
    const teams = await api.teams()
    setState((s) => ({ ...s, teams: teams.map((t) => t.team_name) }))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const builtins = useMemo(() => new Set(state.strategies.map((s) => s.name)), [state.strategies])
  return { ...state, builtins, reload: load, reloadTeams }
}

export default function App() {
  const [tab, setTab] = useState(0)
  const [defcon, setDefcon] = useState(null)
  const ref = useReference()

  return (
    <div className="min-h-screen">
      <div className="scanlines" />
      <nav className="sticky top-0 z-40 border-b border-steel bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse bg-alert shadow-[0_0_12px_var(--color-alert)]" />
            <span className="text-lg font-extrabold tracking-[0.3em] text-alert">IRON CURTAIN</span>
          </div>
          <ul className="flex flex-1 flex-wrap">
            {TABS.map(([name], i) => (
              <li key={name} className="relative">
                <button
                  onClick={() => { setTab(i); window.scrollTo(0, 0) }}
                  className={`cursor-pointer px-4 py-2 text-sm font-semibold tracking-[0.2em] uppercase transition ${
                    tab === i ? 'text-paper' : 'text-muted hover:text-paper'
                  }`}
                >
                  <span className="mr-1 text-alert/70">{String(i + 1).padStart(2, '0')}</span> {name}
                </button>
                {tab === i && (
                  <motion.div layoutId="tab-underline" className="absolute inset-x-2 -bottom-[13px] h-0.5 bg-alert" />
                )}
              </li>
            ))}
          </ul>
          <DefconChip defcon={defcon} />
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {ref.loading && <Spinner label="Contacting command server" />}
        {ref.error && (
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1"><ErrorBox error={ref.error} /></div>
            <button onClick={ref.reload} className="cursor-pointer border border-steel-light px-4 py-2 text-sm uppercase">Retry</button>
          </div>
        )}
        {/* Tabs stay mounted so results survive switching */}
        {TABS.map(([name, Tab], i) => (
          <div key={name} hidden={tab !== i}>
            <Tab reference={ref} defcon={defcon} setDefcon={setDefcon} />
          </div>
        ))}
      </main>
    </div>
  )
}
