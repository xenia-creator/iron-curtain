import { AnimatePresence, motion } from 'framer-motion'

export function Panel({ title, right, className = '', children }) {
  return (
    <section className={`relative border border-steel bg-panel/90 shadow-[0_0_0_1px_#000,0_10px_30px_-10px_#000] ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-steel bg-steel/40 px-4 py-2">
          <h2 className="label !text-paper">{title}</h2>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

const BUTTON_STYLES = {
  primary: 'bg-alert text-white border-alert hover:bg-[#ff3b52] shadow-[0_0_20px_-4px_var(--color-alert)]',
  ghost: 'bg-transparent text-paper border-steel-light hover:border-paper',
  danger: 'bg-transparent text-alert border-alert-dim hover:border-alert',
}

export function Button({ variant = 'ghost', className = '', ...props }) {
  return (
    <button
      className={`cursor-pointer border px-4 py-2 font-mono text-sm font-semibold uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-40 ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label flex justify-between">
        {label}
        {hint && <span className="text-paper">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full border border-steel-light bg-ink px-3 py-2 font-mono text-paper outline-none focus:border-alert'

export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap border border-steel-light">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
            value === opt.value ? 'bg-alert text-white' : 'text-muted hover:text-paper'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center gap-3 text-left"
    >
      <span className={`relative h-6 w-11 border transition ${checked ? 'border-alert bg-alert/30' : 'border-steel-light bg-ink'}`}>
        <motion.span
          layout
          className={`absolute top-0.5 h-4 w-4 ${checked ? 'right-0.5 bg-alert' : 'left-0.5 bg-muted'}`}
        />
      </span>
      <span className="label">{label}</span>
    </button>
  )
}

export function ErrorBox({ error }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="border border-alert bg-alert/10 px-3 py-2 text-sm text-alert"
        >
          <div className="font-semibold">⚠ {error.message}</div>
          {error.errors?.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs whitespace-pre-wrap">
              {error.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Spinner({ label = 'Transmitting' }) {
  return (
    <span className="label inline-flex items-center gap-2 !text-amber">
      <motion.span
        className="inline-block h-2 w-2 bg-amber"
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
      />
      {label}…
    </span>
  )
}

export function Stamp({ children = 'Classified', className = '' }) {
  return <span className={`stamp inline-block text-alert ${className}`}>{children}</span>
}

export function Empty({ children }) {
  return <p className="label py-6 text-center">{children}</p>
}
