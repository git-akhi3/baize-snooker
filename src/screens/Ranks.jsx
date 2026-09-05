import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore.jsx'
import { LEADERBOARD_SORTS, buildLeaderboard } from '../lib/stats.js'
import Icon from '../components/Icon.jsx'
import { Avatar, Empty, FormDots, Segmented } from '../components/ui.jsx'

const METRIC = {
  wins: (s) => ({ value: s.won, suffix: 'W' }),
  winRate: (s) => ({ value: s.winRate, suffix: '%' }),
  break: (s) => ({ value: s.highestBreak, suffix: '' }),
  avg: (s) => ({ value: s.avgPoints, suffix: '' }),
}

export default function Ranks() {
  const navigate = useNavigate()
  const { players, games } = useStore()
  const [sort, setSort] = useState('wins')

  const rows = useMemo(
    () => buildLeaderboard(players, games, sort).filter((r) => r.stats.played > 0),
    [players, games, sort],
  )

  const podium = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div className="shell page">
      <div className="page-head">
        <div className="page-head__title">
          <span className="eyebrow">Season so far</span>
          <h1>Leaderboard</h1>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="panel">
          <Empty
            icon="trophy"
            title="Nobody on the board"
            body="Finish a frame and the table fills itself in."
            action={
              <button className="btn btn--primary" onClick={() => navigate('/new')}>
                <Icon name="plus" /> Start a frame
              </button>
            }
          />
        </div>
      ) : (
        <>
          <Segmented
            ariaLabel="Rank by"
            value={sort}
            onChange={setSort}
            options={LEADERBOARD_SORTS.map((s) => ({ value: s.id, label: s.label }))}
          />

          {podium.length >= 2 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: podium.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: 8,
                marginTop: 18,
                alignItems: 'end',
              }}
            >
              {[podium[1], podium[0], podium[2]]
                .filter(Boolean)
                .map((row) => {
                  const place = rows.indexOf(row) + 1
                  const m = METRIC[sort](row.stats)
                  return (
                    <Link
                      to={'/players/' + row.player.id}
                      key={row.player.id}
                      className="medal"
                      style={
                        place === 1
                          ? {
                              paddingTop: 20,
                              borderColor: 'rgba(211,165,60,.35)',
                              background:
                                'linear-gradient(170deg, rgba(211,165,60,.12), var(--surface))',
                            }
                          : null
                      }
                    >
                      <Avatar
                        name={row.player.name}
                        accent={row.player.accent}
                        size={place === 1 ? 'lg' : 'md'}
                      />
                      <span className="rank" data-top={place} style={{ width: 'auto' }}>
                        {place === 1 ? <Icon name="crown" size={18} /> : place}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
                        {row.player.name}
                      </span>
                      <span className="serif-num" style={{ fontSize: place === 1 ? 28 : 22 }}>
                        {m.value}
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{m.suffix}</span>
                      </span>
                    </Link>
                  )
                })}
            </div>
          ) : null}

          <div className="panel panel--flush" style={{ marginTop: 18 }}>
            {(podium.length >= 2 ? rest : rows).map((row) => {
              const place = rows.indexOf(row) + 1
              const m = METRIC[sort](row.stats)
              return (
                <Link className="list-row" to={'/players/' + row.player.id} key={row.player.id}>
                  <span className="rank" data-top={place}>
                    {place}
                  </span>
                  <Avatar name={row.player.name} accent={row.player.accent} size="sm" />
                  <span className="grow">
                    <span style={{ fontWeight: 600, display: 'block' }}>{row.player.name}</span>
                    <span className="row" style={{ gap: 8, marginTop: 3 }}>
                      <span className="meta dim" style={{ fontSize: 12 }}>
                        {row.stats.won}W · {row.stats.lost}L
                      </span>
                      <FormDots results={row.stats.results} />
                    </span>
                  </span>
                  <span className="serif-num" style={{ fontSize: 21 }}>
                    {m.value}
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{m.suffix}</span>
                  </span>
                </Link>
              )
            })}
          </div>

          <p className="meta dim" style={{ marginTop: 14, textAlign: 'center' }}>
            Ranked by {LEADERBOARD_SORTS.find((s) => s.id === sort).label.toLowerCase()} across{' '}
            {rows.reduce((n, r) => n + r.stats.played, 0)} player appearances.
          </p>
        </>
      )}
    </div>
  )
}
