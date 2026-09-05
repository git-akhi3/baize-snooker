import { Link, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useStore } from '../store/AppStore.jsx'
import { activeGame, buildLeaderboard, finishedGames, gameState, overview } from '../lib/stats.js'
import { MODES } from '../lib/snooker.js'
import { relativeDay } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { Avatar, Empty, Tile } from '../components/ui.jsx'
import FrameRow from '../components/FrameRow.jsx'

export default function Home() {
  const navigate = useNavigate()
  const { players, games } = useStore()

  const live = useMemo(() => activeGame(games), [games])
  const stats = useMemo(() => overview(players, games), [players, games])
  const top = useMemo(() => buildLeaderboard(players, games).filter((r) => r.stats.played > 0), [players, games])
  const recent = useMemo(
    () =>
      finishedGames(games)
        .sort((a, b) => (b.endedAt || b.createdAt) - (a.endedAt || a.createdAt))
        .slice(0, 3),
    [games],
  )

  const liveState = live ? gameState(live) : null

  return (
    <div className="shell page">
      <header className="row-between" style={{ padding: '10px 0 22px' }}>
        <span className="wordmark">
          <span className="wordmark__mark">
            <Icon name="cue" />
          </span>
          <span className="wordmark__text">Baize</span>
        </span>
        <Link to="/settings" className="icon-btn" aria-label="Settings">
          <Icon name="gear" />
        </Link>
      </header>

      {live ? (
        <button
          className="hero"
          style={{ width: '100%', textAlign: 'left', display: 'block' }}
          onClick={() => navigate('/play/' + live.id)}
        >
          <span className="row-between" style={{ marginBottom: 14 }}>
            <span className="badge badge--live">
              <span className="dot" /> Frame in play
            </span>
            <span className="meta dim">{MODES[live.mode].label}</span>
          </span>
          <div className="stack stack-8">
            {liveState.standings.map((row) => {
              const p = live.players.find((x) => x.id === row.id)
              const isOn = row.id === liveState.currentPlayerId
              return (
                <span className="row-between" key={row.id}>
                  <span className="row">
                    <Avatar name={p.name} accent={p.accent} size="sm" />
                    <span style={{ fontWeight: isOn ? 700 : 500, color: isOn ? 'var(--cream)' : 'var(--cream-2)' }}>
                      {p.name}
                    </span>
                    {isOn ? <span className="badge badge--felt">at the table</span> : null}
                  </span>
                  <span className="serif-num" style={{ fontSize: 26 }}>
                    {row.score}
                  </span>
                </span>
              )
            })}
          </div>
          <span className="btn btn--primary btn--block" style={{ marginTop: 18 }}>
            <Icon name="play" /> Resume scoring
          </span>
        </button>
      ) : (
        <div className="hero">
          <p className="eyebrow" style={{ marginBottom: 10 }}>
            {stats.frames > 0 ? 'Table is free' : 'Welcome'}
          </p>
          <h1 className="hero__title">
            {stats.frames > 0 ? 'Rack them up.' : 'Scoring, without the arguments.'}
          </h1>
          <p className="meta dim" style={{ marginTop: 10, maxWidth: 380 }}>
            {stats.frames > 0
              ? 'Pick who is playing and start a frame. Everything saves to this device.'
              : 'Add the people at your table, tap the ball that went down, and Baize keeps the breaks, fouls and frame history straight.'}
          </p>
          <button className="btn btn--primary btn--block btn--lg" style={{ marginTop: 18 }} onClick={() => navigate('/new')}>
            <Icon name="plus" /> Start a frame
          </button>
        </div>
      )}

      {stats.frames > 0 ? (
        <section style={{ marginTop: 24 }}>
          <div className="tiles">
            <Tile value={stats.frames} label="Frames" note={stats.thisWeek + ' this week'} />
            <Tile
              value={stats.topBreak.value || '—'}
              label="Top break"
              note={stats.topBreak.name || 'Not set yet'}
              accent="var(--brass)"
            />
            <Tile value={stats.players} label="Players" note={stats.totalPoints.toLocaleString() + ' pts'} />
          </div>
        </section>
      ) : null}

      {top.length > 0 ? (
        <section style={{ marginTop: 28 }}>
          <div className="section-head">
            <h2>Standings</h2>
            <Link to="/ranks" className="meta" style={{ color: 'var(--brass)' }}>
              Full table
            </Link>
          </div>
          <div className="panel panel--flush">
            {top.slice(0, 3).map((row, i) => (
              <Link className="list-row" to={'/players/' + row.player.id} key={row.player.id}>
                <span className="rank" data-top={i + 1}>
                  {i + 1}
                </span>
                <Avatar name={row.player.name} accent={row.player.accent} size="sm" />
                <span className="grow">
                  <span style={{ fontWeight: 600 }}>{row.player.name}</span>
                  <span className="meta dim" style={{ display: 'block', fontSize: 12 }}>
                    {row.stats.won}W · {row.stats.lost}L · top break {row.stats.highestBreak}
                  </span>
                </span>
                <span className="serif-num" style={{ fontSize: 20 }}>
                  {row.stats.winRate}%
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: 28 }}>
        <div className="section-head">
          <h2>Recent frames</h2>
          {recent.length > 0 ? (
            <Link to="/frames" className="meta" style={{ color: 'var(--brass)' }}>
              All frames
            </Link>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <div className="panel">
            <Empty
              icon="frames"
              title="No frames yet"
              body="Finished frames land here with the full shot-by-shot timeline."
            />
          </div>
        ) : (
          <div className="panel panel--flush">
            {recent.map((g) => (
              <FrameRow key={g.id} game={g} subtitle={relativeDay(g.endedAt || g.createdAt)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
