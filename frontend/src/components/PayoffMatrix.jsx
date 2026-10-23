const MOVES = [
  ['C', 'Cooperate'],
  ['D', 'Defect'],
]

/** 2x2 payoff table: rows are your move, columns the opponent's. */
export default function PayoffMatrix({ game }) {
  return (
    <table className="w-full table-fixed border-collapse text-center">
      <thead>
        <tr>
          <th className="label p-2 text-left">You ↓ / Them →</th>
          {MOVES.map(([m, name]) => (
            <th key={m} className={`label p-2 ${m === 'C' ? '!text-coop' : '!text-alert'}`}>{name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {MOVES.map(([mine, name]) => (
          <tr key={mine}>
            <th className={`label p-2 text-left ${mine === 'C' ? '!text-coop' : '!text-alert'}`}>{name}</th>
            {MOVES.map(([theirs]) => {
              const [me, them] = game.payoffs[mine][theirs]
              return (
                <td key={theirs} className="border border-steel-light bg-ink p-4">
                  <span className="text-4xl font-extrabold text-paper">{me}</span>
                  <span className="mx-2 text-muted">/</span>
                  <span className="text-2xl text-muted">{them}</span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
