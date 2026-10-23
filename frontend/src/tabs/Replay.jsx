import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, parseSeed, useAction } from '../api'
import { defectionShare } from '../defcon'
import SimulationLoader from '../components/SimulationLoader'
import { Button, ErrorBox, Field, Panel, Segmented, inputClass } from '../components/ui'

const SPEEDS = [1, 2, 4, 8]
const BASE_DELAY = 160
const LINE = 50
const P1_COLOR = '#e5243b'
const P2_COLOR = '#f5a524'

export default function Replay({ reference, setDefcon }) {
  const { games, teams, strategies } = reference
  const [form, setForm] = useState({
    p1: 'tit_for_tat', p2: 'always_defect', game: 'prisoners_dilemma', turns: 50, noise: 0, seed: '',
  })
  const [match, load] = useAction(api.match, 900)
  const [shown, setShown] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const timeline = match.data?.timeline ?? []

  useEffect(() => {
    if (!playing || shown >= timeline.length) return
    const timer = setTimeout(() => setShown((n) => n + 1), BASE_DELAY / speed)
    return () => clearTimeout(timer)
  }, [playing, shown, speed, timeline.length])

  async function onLoad() {
    setPlaying(false)
    setShown(0)
    const data = await load({ ...form, seed: parseSeed(form.seed) })
    if (!data) return
    const rate = defectionShare(data.timeline)
    if (rate != null) setDefcon({ rate, source: `D moves in ${data.p1} vs ${data.p2}` })
    setPlaying(true)
  }

  const data = match.data
  const visible = timeline.slice(0, shown)
  const totals = visible.at(-1)?.totals ?? [0, 0]
  const finished = data && shown >= timeline.length
  const running = playing && !finished

  return (
    <div className="space-y-6">
      <Panel title="Match Setup">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <BotSelect label="Player 1" value={form.p1} onChange={set('p1')} teams={teams} strategies={strategies} />
          <BotSelect label="Player 2" value={form.p2} onChange={set('p2')} teams={teams} strategies={strategies} />
          <Field label="Turns">
            <input type="number" min={1} max={2000} className={inputClass} value={form.turns}
              onChange={(e) => set('turns')(e.target.value)} />
          </Field>
          <Field label="Seed (blank = random)">
            <input type="number" className={inputClass} value={form.seed} placeholder="2026"
              onChange={(e) => set('seed')(e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Game">
              <Segmented value={form.game} onChange={set('game')}
                options={games.map((g) => ({ value: g.key, label: g.name }))} />
            </Field>
          </div>
          <Field label="Noise" hint={`${Math.round(form.noise * 100)}%`}>
            <input type="range" min={0} max={0.5} step={0.01} value={form.noise}
              onChange={(e) => set('noise')(Number(e.target.value))} className="mt-2" />
          </Field>
          <div className="flex items-end">
            <Button variant="primary" className="w-full py-3" disabled={match.loading || form.p1 === '' || form.p2 === ''}
              onClick={onLoad}>
              ▶ Load Match
            </Button>
          </div>
        </div>
        <div className="mt-4"><ErrorBox error={match.error} /></div>
      </Panel>

      <SimulationLoader active={match.loading} title="Retrieving match tapes" />

      {data && (
        <>
          <Panel
            title={`Match Tape · ${data.p1} vs ${data.p2}`}
            right={<span className="label">Turn {shown} / {timeline.length}</span>}
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <Scoreboard p1={data.p1} p2={data.p2} totals={finished ? data.final_scores : totals} />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => { setShown(0); setPlaying(true) }}>⟲</Button>
                <Button variant={running ? 'ghost' : 'primary'} className="w-28"
                  onClick={() => (finished ? (setShown(0), setPlaying(true)) : setPlaying(!playing))}>
                  {running ? '❚❚ Pause' : '▶ Play'}
                </Button>
                <Button onClick={() => { setPlaying(false); setShown(timeline.length) }}>⏭</Button>
                <div className="ml-2 w-44">
                  <Segmented value={speed} onChange={setSpeed} options={SPEEDS.map((s) => ({ value: s, label: `${s}x` }))} />
                </div>
              </div>
            </div>

            {data.forfeit && finished && (
              <div className="mb-4 border border-alert bg-alert/10 p-3 text-alert">
                <b>FORFEIT:</b> {data.forfeit.bot} (player {data.forfeit.player}) — {data.forfeit.reason}
              </div>
            )}

            <Tape timeline={visible} p1={data.p1} p2={data.p2} />
          </Panel>

          <Panel title="Running Score">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visible.map((t) => ({ turn: t.turn, p1: t.totals[0], p2: t.totals[1] }))}>
                  <CartesianGrid stroke="#262c33" strokeDasharray="3 3" />
                  <XAxis dataKey="turn" stroke="#8b96a3" type="number" domain={[1, Math.max(timeline.length, 2)]} />
                  <YAxis stroke="#8b96a3" />
                  <Tooltip contentStyle={{ background: '#08090a', border: '1px solid #f5a524' }} />
                  <Legend />
                  <Line type="monotone" dataKey="p1" name={data.p1} stroke={P1_COLOR} strokeWidth={3} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="p2" name={data.p2} stroke={P2_COLOR} strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}

function BotSelect({ label, value, onChange, teams, strategies }) {
  return (
    <Field label={label}>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {teams.length > 0 && (
          <optgroup label="Teams">
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </optgroup>
        )}
        <optgroup label="Built-ins">
          {strategies.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </optgroup>
      </select>
    </Field>
  )
}

function Scoreboard({ p1, p2, totals }) {
  return (
    <div className="flex items-center gap-6">
      <Score name={p1} value={totals[0]} color={P1_COLOR} />
      <span className="font-type text-2xl text-muted">vs</span>
      <Score name={p2} value={totals[1]} color={P2_COLOR} />
    </div>
  )
}

function Score({ name, value, color }) {
  return (
    <div>
      <div className="label max-w-[14rem] truncate" style={{ color }}>{name}</div>
      <div className="text-5xl font-extrabold tabular-nums">{value}</div>
    </div>
  )
}

/** Two rows of tiles per line of LINE turns: p1 on top, p2 below. */
function Tape({ timeline, p1, p2 }) {
  const lines = []
  for (let i = 0; i < timeline.length; i += LINE) lines.push(timeline.slice(i, i + LINE))
  if (lines.length === 0) lines.push([])

  return (
    <div className="space-y-4">
      {lines.map((turns, li) => (
        <div key={li} className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1">
          <span className="label col-span-2 !text-[0.65rem]">Turns {li * LINE + 1}–{li * LINE + LINE}</span>
          {[0, 1].map((side) => (
            <div key={side} className="contents">
              <span className="truncate text-xs leading-5" style={{ color: side ? P2_COLOR : P1_COLOR }} title={side ? p2 : p1}>
                {side ? p2 : p1}
              </span>
              <div className="flex gap-[3px]">
                {turns.map((t) => (
                  <motion.div
                    key={t.turn}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    title={`Turn ${t.turn}: ${t.moves[side]} (+${t.scores[side]})`}
                    className={`h-5 flex-1 max-w-5 ${t.moves[side] === 'C' ? 'bg-coop shadow-[0_0_6px_#22c55e80]' : 'bg-alert shadow-[0_0_6px_#e5243b80]'}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-coop" /> Cooperate</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 bg-alert" /> Defect</span>
      </div>
    </div>
  )
}
