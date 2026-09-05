/**
 * Everything lives in localStorage under one versioned key. Small payload,
 * synchronous reads, no server. Every access is guarded because private
 * browsing modes can throw on read as well as write.
 */

const KEY = 'baize.snooker.v1'
export const SCHEMA_VERSION = 1

export function emptyState() {
  return {
    version: SCHEMA_VERSION,
    players: [],
    games: [],
    prefs: {
      haptics: true,
      defaultMode: 'casual',
      defaultReds: 15,
      defaultFoulRule: 'opponents',
    },
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    return migrate(parsed)
  } catch {
    return emptyState()
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

function migrate(data) {
  const base = emptyState()
  if (!data || typeof data !== 'object') return base
  return {
    version: SCHEMA_VERSION,
    players: Array.isArray(data.players) ? data.players : [],
    games: Array.isArray(data.games) ? data.games : [],
    prefs: { ...base.prefs, ...(data.prefs || {}) },
  }
}

export function exportState(state) {
  return JSON.stringify(
    { ...state, exportedAt: new Date().toISOString(), app: 'Baize' },
    null,
    2,
  )
}

/** Returns { ok, state } or { ok: false, error }. */
export function parseImport(text) {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || !Array.isArray(parsed.games) || !Array.isArray(parsed.players)) {
      return { ok: false, error: 'That file does not look like a Baize backup.' }
    }
    return { ok: true, state: migrate(parsed) }
  } catch {
    return { ok: false, error: 'Could not read that file as JSON.' }
  }
}
