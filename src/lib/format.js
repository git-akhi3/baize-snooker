export function formatDuration(ms) {
  if (!ms || ms < 0) return '0:00'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (v) => String(v).padStart(2, '0')
  return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s)
}

export function formatShortDuration(ms) {
  const mins = Math.round((ms || 0) / 60000)
  if (mins < 1) return 'under a minute'
  if (mins < 60) return mins + ' min'
  const h = Math.floor(mins / 60)
  const r = mins % 60
  return r ? h + 'h ' + r + 'm' : h + 'h'
}

/** Tight enough to sit inside a stat tile: 45s, 12m, 1h 4m. */
export function formatCompactDuration(ms) {
  const secs = Math.round((ms || 0) / 1000)
  if (secs < 60) return secs + 's'
  const mins = Math.round(secs / 60)
  if (mins < 60) return mins + 'm'
  const h = Math.floor(mins / 60)
  const r = mins % 60
  return r ? h + 'h ' + r + 'm' : h + 'h'
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function relativeDay(ts) {
  const d = new Date(ts)
  const now = new Date()
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return days + ' days ago'
  return formatDate(ts)
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function pct(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

export function plural(count, one, many) {
  return count + ' ' + (count === 1 ? one : many || one + 's')
}
