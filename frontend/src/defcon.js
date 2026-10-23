/** Share of D moves (0..1) to a DEFCON level, 5 = peace, 1 = war. */
export const defconLevel = (rate) => Math.max(1, 5 - Math.floor(rate * 5))

/**
 * Estimate the defection rate from average score per turn: mutual cooperation
 * scores payoffs.C.C, mutual defection payoffs.D.D, and we interpolate between.
 */
export function estimateDefection(leaderboard, game) {
  if (!leaderboard?.length || !game) return null
  const reward = game.payoffs.C.C[0]
  const punish = game.payoffs.D.D[0]
  if (reward === punish) return null
  const avg = leaderboard.reduce((sum, row) => sum + row.avg_per_turn, 0) / leaderboard.length
  return Math.min(1, Math.max(0, (reward - avg) / (reward - punish)))
}

export function defectionShare(timeline) {
  if (!timeline?.length) return null
  const defects = timeline.reduce((n, t) => n + (t.moves[0] === 'D') + (t.moves[1] === 'D'), 0)
  return defects / (timeline.length * 2)
}
