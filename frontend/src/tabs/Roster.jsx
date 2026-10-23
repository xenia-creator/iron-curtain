import { python } from '@codemirror/lang-python'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { api, useAction } from '../api'
import { Button, Empty, ErrorBox, Field, Panel, Spinner, Stamp, inputClass } from '../components/ui'

const TIT_FOR_TAT = `def strategy(my_history, opp_history):
    """Cooperate first, then copy the opponent's last move."""
    if not opp_history:
        return 'C'
    return opp_history[-1]
`

const editorTheme = EditorView.theme({
  '&': { backgroundColor: '#08090a', fontSize: '15px' },
  '.cm-gutters': { backgroundColor: '#0d0f11', borderRight: '1px solid #262c33', color: '#5b6570' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'rgb(229 36 59 / 0.08)' },
  '.cm-content': { fontFamily: 'JetBrains Mono, monospace' },
})
const extensions = [python(), editorTheme]

const NAME_PATTERN = /^[A-Za-z0-9_-]{1,40}$/

export default function Roster({ reference }) {
  const { strategies, teams, reloadTeams } = reference
  const [viewing, setViewing] = useState(null)

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Panel title="Built-in Agents" right={<span className="label">{strategies.length} on file</span>}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {strategies.map((s, i) => (
              <motion.button
                key={s.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                onClick={() => setViewing(s)}
                className="cursor-pointer border border-steel-light bg-ink/70 p-3 text-left transition hover:border-alert"
              >
                <div className="font-bold text-paper">{s.name}</div>
                <div className="mt-1 line-clamp-2 text-sm text-muted">{s.description}</div>
                <div className="label mt-2 !text-xs !text-alert/80">View dossier ›</div>
              </motion.button>
            ))}
          </div>
        </Panel>
        <TeamList teams={teams} reloadTeams={reloadTeams} />
      </div>

      <DeployPanel reloadTeams={reloadTeams} />

      <AnimatePresence>
        {viewing && <CodeModal strategy={viewing} onClose={() => setViewing(null)} />}
      </AnimatePresence>
    </div>
  )
}

function TeamList({ teams, reloadTeams }) {
  const [state, setState] = useState({ busy: null, error: null })
  const [confirmClear, setConfirmClear] = useState(false)

  async function act(label, call) {
    setState({ busy: label, error: null })
    try {
      await call()
      await reloadTeams()
      setState({ busy: null, error: null })
    } catch (error) {
      setState({ busy: null, error })
    }
  }

  return (
    <Panel title="Field Teams" right={<span className="label !text-amber">{teams.length} deployed</span>}>
      <div className="flex gap-2">
        <Button className="flex-1 !px-2" disabled={!!state.busy} onClick={() => act('Loading demo', api.loadDemo)}>
          Load Demo Teams
        </Button>
        <Button
          variant="danger"
          className="flex-1 !px-2"
          disabled={!!state.busy || teams.length === 0}
          onClick={() => {
            if (!confirmClear) return setConfirmClear(true)
            setConfirmClear(false)
            act('Clearing', api.clearAll)
          }}
          onBlur={() => setConfirmClear(false)}
        >
          {confirmClear ? 'Confirm?' : 'Clear All'}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {state.busy && <Spinner label={state.busy} />}
        <ErrorBox error={state.error} />
      </div>
      <ul className="mt-2 max-h-[26rem] space-y-1 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {teams.map((name) => (
            <motion.li
              key={name}
              layout
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center justify-between border border-steel bg-ink/60 px-3 py-1.5"
            >
              <span className="truncate">{name}</span>
              <button
                title={`Delete ${name}`}
                disabled={!!state.busy}
                onClick={() => act(`Deleting ${name}`, () => api.deleteBot(name))}
                className="cursor-pointer px-1 text-muted hover:text-alert disabled:opacity-40"
              >
                ✕
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {teams.length === 0 && <Empty>No teams deployed</Empty>}
    </Panel>
  )
}

function DeployPanel({ reloadTeams }) {
  const [code, setCode] = useState(TIT_FOR_TAT)
  const [name, setName] = useState('')
  const [test, runTest] = useAction(api.testBot)
  const [deploy, runDeploy] = useAction(api.deployBot)
  const [lastAction, setLastAction] = useState(null)
  const nameValid = NAME_PATTERN.test(name)

  async function onDeploy() {
    setLastAction('deploy')
    const team = await runDeploy(name, code)
    if (team) {
      await reloadTeams().catch(() => {})
      setName('')
    }
  }

  const busy = test.loading || deploy.loading

  return (
    <Panel title="Agent Workshop" right={<Stamp className="text-xs">Eyes Only</Stamp>}>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-hidden border border-steel-light">
          <CodeMirror value={code} onChange={setCode} theme="dark" extensions={extensions} height="320px" />
        </div>
        <div className="flex flex-col gap-4">
          <Field label="Team name" hint={name && !nameValid ? 'A-Z 0-9 _ - only' : undefined}>
            <input
              className={inputClass}
              value={name}
              maxLength={40}
              placeholder="red_team"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Button disabled={busy} onClick={() => { setLastAction('test'); runTest(code) }}>
            Test
          </Button>
          <Button variant="primary" disabled={busy || !nameValid} onClick={onDeploy}>
            Deploy Agent
          </Button>
          {busy && <Spinner label={test.loading ? 'Running trials' : 'Deploying'} />}
          {!busy && lastAction === 'test' && <TestResult result={test.data} error={test.error} />}
          {!busy && lastAction === 'deploy' && (
            deploy.error ? <ErrorBox error={deploy.error} /> : deploy.data && (
              <motion.div initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-center">
                <Stamp className="text-coop">Deployed</Stamp>
                <div className="mt-2 text-sm">{deploy.data.team_name} is in the field.</div>
              </motion.div>
            )
          )}
        </div>
      </div>
    </Panel>
  )
}

function TestResult({ result, error }) {
  if (error) return <ErrorBox error={error} />
  if (!result) return null
  if (result.ok) {
    return (
      <motion.div initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <Stamp className="text-coop">Pass</Stamp>
        <div className="mt-2 text-sm text-muted">Survived trials vs tit_for_tat, always_defect, random_bot.</div>
      </motion.div>
    )
  }
  return <ErrorBox error={{ message: 'Failed testing', errors: result.errors }} />
}

function CodeModal({ strategy, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ y: 30, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl border border-alert bg-panel"
      >
        <header className="flex items-center justify-between border-b border-steel px-4 py-3">
          <div>
            <div className="label">Dossier</div>
            <div className="text-xl font-bold">{strategy.name}</div>
          </div>
          <Button onClick={onClose}>Close</Button>
        </header>
        <Stamp className="absolute top-16 right-6 rotate-[-10deg] text-xl opacity-80">Classified</Stamp>
        <p className="px-4 pt-3 text-muted">{strategy.description}</p>
        <div className="m-4 border border-steel-light">
          <CodeMirror value={strategy.source} theme="dark" extensions={extensions} editable={false} maxHeight="60vh" />
        </div>
      </motion.div>
    </motion.div>
  )
}
