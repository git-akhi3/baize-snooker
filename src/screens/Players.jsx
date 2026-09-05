import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/AppStore.jsx'
import { playerStats } from '../lib/stats.js'
import Icon from '../components/Icon.jsx'
import { Avatar, Empty, FormDots } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

export default function Players() {
  const { players, games, addPlayer } = useStore()
  const toast = useToast()
  const [name, setName] = useState('')

  const rows = useMemo(
    () =>
      players
        .map((p) => ({ player: p, stats: playerStats(p.id, games) }))
        .sort((a, b) => b.stats.played - a.stats.played || a.player.name.localeCompare(b.player.name)),
    [players, games],
  )

  const submit = (e) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    const duplicate = players.some((p) => p.name.toLowerCase() === clean.toLowerCase())
    const player = addPlayer(clean)
    toast(duplicate ? player.name + ' is already on the roster' : player.name + ' added')
    setName('')
  }

  return (
    <div className="shell page">
      <div className="page-head">
        <div className="page-head__title">
          <span className="eyebrow">The regulars</span>
          <h1>Players</h1>
        </div>
        <span className="meta dim">{players.length}</span>
      </div>

      <form onSubmit={submit} className="row" style={{ gap: 8, marginBottom: 22 }}>
        <input
          className="input grow"
          placeholder="Add a player"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoComplete="off"
        />
        <button className="btn" type="submit" disabled={!name.trim()} aria-label="Add player">
          <Icon name="plus" />
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="panel">
          <Empty
            icon="users"
            title="No one on the roster"
            body="Add the people you play with. Their stats build up frame by frame."
          />
        </div>
      ) : (
        <div className="panel panel--flush">
          {rows.map(({ player, stats }) => (
            <Link className="list-row" to={'/players/' + player.id} key={player.id}>
              <Avatar name={player.name} accent={player.accent} />
              <span className="grow">
                <span style={{ fontWeight: 600, display: 'block' }}>{player.name}</span>
                <span className="row" style={{ gap: 8, marginTop: 3 }}>
                  <span className="meta dim" style={{ fontSize: 12 }}>
                    {stats.played === 0
                      ? 'No frames yet'
                      : stats.played + ' frames · ' + stats.winRate + '% won'}
                  </span>
                  {stats.played > 0 ? <FormDots results={stats.results} /> : null}
                </span>
              </span>
              {stats.streak.count >= 2 && stats.streak.type === 'W' ? (
                <span className="badge badge--brass">
                  <Icon name="flame" size={12} /> {stats.streak.count}
                </span>
              ) : null}
              <Icon name="forward" size={15} style={{ color: 'var(--faint)' }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
