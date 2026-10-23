import { useCallback, useState } from 'react'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, errors = []) {
    super(message)
    this.errors = errors
  }
}

// FastAPI errors come as a string, {message, errors}, or a list of validation issues
function toError(data, status) {
  const detail = data?.detail
  if (typeof detail === 'string') return new ApiError(detail)
  if (detail?.message) return new ApiError(detail.message, detail.errors || [])
  if (Array.isArray(detail)) {
    return new ApiError('Invalid request.', detail.map((d) => `${d.loc.slice(1).join('.')}: ${d.msg}`))
  }
  return new ApiError(`Request failed (HTTP ${status}).`)
}

async function request(path, { method = 'GET', body, params } = {}) {
  let url = BASE + path
  if (params) {
    const entries = Object.entries(params).filter(([, v]) => v !== '' && v != null)
    url += '?' + new URLSearchParams(entries)
  }
  let res
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(`Cannot reach command server at ${BASE}.`)
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw toError(data, res.status)
  return data
}

export const api = {
  games: () => request('/games'),
  strategies: () => request('/strategies'),
  teams: () => request('/bots'),
  testBot: (code) => request('/bots/test', { method: 'POST', body: { code } }),
  deployBot: (team_name, code) => request('/bots', { method: 'POST', body: { team_name, code } }),
  deleteBot: (name) => request(`/bots/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  loadDemo: () => request('/demo/load', { method: 'POST' }),
  clearAll: () => request('/demo/clear', { method: 'POST' }),
  tournament: (body) => request('/tournament', { method: 'POST', body }),
  event: (body) => request('/event', { method: 'POST', body }),
  match: (params) => request('/match', { params }),
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wrap an async call with loading/error/data state. `fn` must be stable.
 * `minMs` keeps the loading state up long enough for its animation to read.
 */
export function useAction(fn, minMs = 0) {
  const [state, setState] = useState({ loading: false, error: null, data: null })
  const run = useCallback(
    async (...args) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const [data] = await Promise.all([fn(...args), delay(minMs)])
        setState({ loading: false, error: null, data })
        return data
      } catch (error) {
        setState((s) => ({ ...s, loading: false, error }))
        return undefined
      }
    },
    [fn, minMs],
  )
  return [state, run]
}

/** Seed input is a string; blank means unseeded. */
export const parseSeed = (seed) => (seed.trim() === '' ? null : Number(seed))
