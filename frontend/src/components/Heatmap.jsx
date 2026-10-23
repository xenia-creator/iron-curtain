import { useState } from 'react'

const STOPS = ['#14171b', '#6b1520', '#e5243b', '#f5a524']

function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16))
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`
}

function heat(t) {
  const scaled = t * (STOPS.length - 1)
  const i = Math.min(STOPS.length - 2, Math.floor(scaled))
  return mix(STOPS[i], STOPS[i + 1], scaled - i)
}

/** matrix[a][b] = a's average score per match against b. Rows are `order`. */
export default function Heatmap({ matrix, order, builtins }) {
  const [hover, setHover] = useState(null)
  const names = order.filter((n) => matrix[n])
  const values = names.flatMap((a) => names.map((b) => matrix[a][b]).filter((v) => v != null))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const scale = (v) => (max === min ? 0.5 : (v - min) / (max - min))
  const showValues = names.length <= 14

  return (
    <div className="relative overflow-x-auto" onMouseLeave={() => setHover(null)}>
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: `minmax(7rem,auto) repeat(${names.length}, minmax(1.4rem,1fr))` }}
      >
        <div />
        {names.map((b) => (
          <div key={b} className={`h-28 truncate pb-1 text-xs [writing-mode:vertical-rl] rotate-180 ${builtins.has(b) ? 'text-muted' : 'text-paper'}`}>
            {b}
          </div>
        ))}
        {names.map((a) => (
          <Row key={a} a={a} names={names} matrix={matrix} builtins={builtins}
            scale={scale} showValues={showValues} hover={hover} setHover={setHover} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>{min.toFixed(0)}</span>
        <div className="h-2 w-40" style={{ background: `linear-gradient(to right, ${STOPS.join(',')})` }} />
        <span>{max.toFixed(0)}</span>
        <span className="label ml-2">row's avg score per match vs column</span>
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 border border-amber bg-ink px-3 py-2 text-xs shadow-xl"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="font-bold text-amber">{hover.a} vs {hover.b}</div>
          <div>{hover.a}: <b>{matrix[hover.a][hover.b]?.toFixed(1)}</b> per match</div>
          <div className="text-muted">{hover.b}: {matrix[hover.b]?.[hover.a]?.toFixed(1)} per match</div>
        </div>
      )}
    </div>
  )
}

function Row({ a, names, matrix, builtins, scale, showValues, hover, setHover }) {
  return (
    <>
      <div className={`truncate pr-2 text-right text-xs leading-[1.4rem] ${builtins.has(a) ? 'text-muted' : 'text-paper'} ${hover?.a === a ? '!text-amber' : ''}`}>
        {a}
      </div>
      {names.map((b) => {
        const v = matrix[a][b]
        const t = v == null ? 0 : scale(v)
        const active = hover && (hover.a === a || hover.b === b)
        return (
          <div
            key={b}
            onMouseMove={(e) => {
              const parent = e.currentTarget.offsetParent
              const box = parent.getBoundingClientRect()
              setHover({ a, b, x: e.clientX - box.left + parent.scrollLeft, y: e.clientY - box.top })
            }}
            className={`flex aspect-square min-h-[1.4rem] items-center justify-center text-[0.65rem] font-semibold transition ${active ? 'ring-1 ring-amber/60' : ''}`}
            style={{ background: v == null ? '#000' : heat(t), color: t > 0.6 ? '#000' : '#d9dde2' }}
          >
            {showValues && v != null ? Math.round(v) : ''}
          </div>
        )
      })}
    </>
  )
}
