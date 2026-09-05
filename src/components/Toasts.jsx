import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const toast = useCallback((message, opts = {}) => {
    const id = ++seq.current
    setItems((list) => [...list, { id, message, ...opts }])
    setTimeout(() => {
      setItems((list) => list.filter((t) => t.id !== id))
    }, opts.duration ?? 2600)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'toast' + (t.tone === 'brass' ? ' toast--brass' : '')}>
            {t.icon ? <Icon name={t.icon} size={16} /> : null}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)?.toast ?? (() => {})
}
