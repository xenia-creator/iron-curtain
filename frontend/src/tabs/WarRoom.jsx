import { useState } from 'react'
import { api, parseSeed, useAction } from '../api'
import { estimateDefection } from '../defcon'
import Disqualified from '../components/Disqualified'
import Heatmap from '../components/Heatmap'
import Leaderboard from '../components/Leaderboard'
import SimulationLoader from '../components/SimulationLoader'
import { Button, Empty, ErrorBox, Field, Panel, Segmented, Toggle, inputClass } from '../components/ui'

export default function WarRoom({ reference, setDefcon }) {
  const { games, teams, builtins } = reference
  const [form, setForm] = useState({
    game: 'prisoners_dilemma', turns: 200, noise: 0, repetitions: 1, includeBuiltins: true, seed: '',
  })
  const [result, run] = useAction(api.tournament, 1800)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  async function onRun() {
    const data = await run({
      bots: teams,
      include_builtins: form.includeBuiltins,
      game: form.game,
      turns: Number(form.turns),
      noise: form.noise,
      repetitions: Number(form.repetitions),
      seed: parseSeed(form.seed),
    })
    // The tournament reports scores, not moves, so estimate defection from them
    const rate = estimateDefection(data?.leaderboard, games.find((g) => g.key === form.game))
    if (rate != null) setDefcon({ rate, source: 'estimated from avg score, War Room' })
  }

  const data = result.data
  const order = data?.leaderboard.map((r) => r.name) ?? []

  return (
    <div className="space-y-6">
      <Panel title="Operation Parameters" right={
        <span className="label">Field: {teams.length} teams{form.includeBuiltins && ` + ${builtins.size} built-ins`}</span>
      }>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Game">
            <Segmented value={form.game} onChange={set('game')}
              options={games.map((g) => ({ value: g.key, label: g.name }))} />
          </Field>
          <Field label="Turns per match">
            <input type="number" min={1} max={2000} className={inputClass} value={form.turns}
              onChange={(e) => set('turns')(e.target.value)} />
          </Field>
          <Field label="Noise" hint={`${Math.round(form.noise * 100)}%`}>
            <input type="range" min={0} max={0.5} step={0.01} value={form.noise}
              onChange={(e) => set('noise')(Number(e.target.value))} className="mt-2" />
          </Field>
          <Field label="Repetitions">
            <input type="number" min={1} max={20} className={inputClass} value={form.repetitions}
              onChange={(e) => set('repetitions')(e.target.value)} />
          </Field>
          <Field label="Seed (blank = random)">
            <input type="number" className={inputClass} value={form.seed} placeholder="2026"
              onChange={(e) => set('seed')(e.target.value)} />
          </Field>
          <div className="flex flex-col justify-end gap-3">
            <Toggle checked={form.includeBuiltins} onChange={set('includeBuiltins')} label="Include built-ins" />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button variant="primary" className="px-10 py-3 text-base" disabled={result.loading} onClick={onRun}>
            ▶ Run Tournament
          </Button>
          <div className="min-w-[16rem] flex-1"><ErrorBox error={result.error} /></div>
        </div>
      </Panel>

      <SimulationLoader active={result.loading} />

      {data && (
        <>
          <Disqualified disqualified={data.disqualified} forfeits={data.forfeits} />
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Leaderboard" right={<span className="label">Total score</span>}>
              {data.leaderboard.length ? <Leaderboard rows={data.leaderboard} builtins={builtins} /> : <Empty>No survivors</Empty>}
            </Panel>
            <Panel title="Engagement Heatmap">
              {order.length ? <Heatmap matrix={data.matrix} order={order} builtins={builtins} /> : <Empty>No data</Empty>}
            </Panel>
          </div>
        </>
      )}
      {!data && !result.loading && <Empty>Configure parameters and run the tournament</Empty>}
    </div>
  )
}
