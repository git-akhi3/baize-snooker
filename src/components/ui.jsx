import { useEffect } from 'react'
import { BALL_BY_ID } from '../lib/snooker.js'
import { initials } from '../lib/format.js'
import Icon from './Icon.jsx'

export function Ball({ ball, size, showValue = false, className = '', ...rest }) {
  const b = typeof ball === 'string' ? BALL_BY_ID[ball] : ball
  if (!b) return null
  return (
    <span
      className={'ball ' + className}
      data-ball={b.id}
      style={{ '--ball': b.hex, ...(size ? { '--size': size + 'px' } : null) }}
      title={b.label}
      {...rest}
    >
      {showValue ? <span className="ball__value">{b.value}</span> : null}
    </span>
  )
}

export function Avatar({ name, accent, size = 'md' }) {
  const cls = size === 'lg' ? 'avatar avatar--lg' : size === 'sm' ? 'avatar avatar--sm' : 'avatar'
  return (
    <span className={cls} style={{ '--accent': accent }} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

export function Sheet({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="sheet-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="sheet">
        <div className="sheet__grab" />
        {title ? (
          <div className="stack" style={{ gap: 4, marginBottom: 16 }}>
            <h2 className="sheet__title">{title}</h2>
            {subtitle ? <p className="meta dim">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}

export function Empty({ icon = 'cue', title, body, action }) {
  return (
    <div className="empty">
      <span className="empty__art">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      {body ? (
        <p className="meta dim" style={{ maxWidth: 300 }}>
          {body}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: 6 }}>{action}</div> : null}
    </div>
  )
}

export function Tile({ value, label, note, accent }) {
  return (
    <div className="tile">
      <div className="tile__value" style={accent ? { color: accent } : null}>
        {value}
      </div>
      <div className="tile__label">{label}</div>
      {note ? <div className="tile__note">{note}</div> : null}
    </div>
  )
}

export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="seg" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={'seg__opt' + (o.value === value ? ' is-on' : '')}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      className="row-between"
      style={{ width: '100%', textAlign: 'left' }}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <span>{label}</span>
      <span className={'switch' + (on ? ' is-on' : '')} />
    </button>
  )
}

export function FormDots({ results, max = 5 }) {
  const recent = results.slice(0, max).reverse()
  if (!recent.length) return <span className="meta dim">No frames yet</span>
  return (
    <span className="form-dots" title="Recent form, oldest first">
      {recent.map((r) => (
        <span key={r.gameId} data-w={String(r.won)} />
      ))}
    </span>
  )
}
