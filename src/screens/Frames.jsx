import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore.jsx'
import { relativeDay, formatTime } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { Empty } from '../components/ui.jsx'
import FrameRow from '../components/FrameRow.jsx'

export default function Frames() {
  const navigate = useNavigate()
  const { games, players } = useStore()
  const [filter, setFilter] = useState('all')

  const list = useMemo(
    () =>
      games
        .filter((g) => g.status !== 'active')
        .filter((g) => filter === 'all' || g.players.some((p) => p.id === filter))
        .sort((a, b) => (b.endedAt || b.createdAt) - (a.endedAt || a.createdAt)),
    [games, filter],
  )

  const grouped = useMemo(() => {
    const out = []
    for (const g of list) {
      const day = relativeDay(g.endedAt || g.createdAt)
      const last = out[out.length - 1]
      if (last && last.day === day) last.items.push(g)
      else out.push({ day, items: [g] })
    }
    return out
  }, [list])

  const withHistory = players.filter((p) => games.some((g) => g.players.some((x) => x.id === p.id)))

  return (
    <div className="shell page">
      <div className="page-head">
        <div className="page-head__title">
          <span className="eyebrow">Archive</span>
          <h1>Frames</h1>
        </div>
        <span className="meta dim">{list.length} played</span>
      </div>

      {withHistory.length > 1 ? (
        <div className="scroll-x" style={{ marginBottom: 20 }}>
          <button
            className={'chip' + (filter === 'all' ? ' is-on' : '')}
            onClick={() => setFilter('all')}
            style={{ paddingLeft: 14 }}
          >
            Everyone
          </button>
          {withHistory.map((p) => (
            <button
              key={p.id}
              className={'chip' + (filter === p.id ? ' is-on' : '')}
              style={{ '--accent': p.accent, paddingLeft: 14, whiteSpace: 'nowrap' }}
              onClick={() => setFilter(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      ) : null}

      {grouped.length === 0 ? (
        <div className="panel">
          <Empty
            icon="frames"
            title="Nothing in the book yet"
            body="Play a frame and it will be filed here with every pot, foul and break."
            action={
              <button className="btn btn--primary" onClick={() => navigate('/new')}>
                <Icon name="plus" /> Start a frame
              </button>
            }
          />
        </div>
      ) : (
        <div className="stack stack-24">
          {grouped.map((group) => (
            <section key={group.day}>
              <div className="label" style={{ marginBottom: 8, paddingLeft: 2 }}>
                {group.day}
              </div>
              <div className="panel panel--flush">
                {group.items.map((g) => (
                  <FrameRow key={g.id} game={g} subtitle={formatTime(g.endedAt || g.createdAt)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
