import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStore } from '../store/AppStore.jsx'
import { gameState, ballBreakdown } from '../lib/stats.js'
import { BALL_BY_ID, FOUL_RULES, MODES, describeEvent } from '../lib/snooker.js'
import { formatDate, formatShortDuration, formatTime, pct, plural } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { Avatar, Ball, Sheet, Tile } from '../components/ui.jsx'

export default function FrameDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { games, deleteGame } = useStore()
  const [confirm, setConfirm] = useState(false)
  const [openPlayer, setOpenPlayer] = useState(null)

  const game = games.find((g) => g.id === id)
  const st = useMemo(() => (game ? gameState(game) : null), [game])

  if (!game) {
    return (
      <div className="shell page">
        <p className="meta dim">That frame is not here any more.</p>
        <button className="btn btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate('/frames')}>
          Back to frames
        </button>
      </div>
    )
  }

  const winnerId = game.winnerId ?? st.standings[0]?.id
  const winner = game.players.find((p) => p.id === winnerId)
  const abandoned = game.status === 'abandoned'
  const duration = (game.endedAt || game.createdAt) - game.startedAt
  const runnerUp = st.standings[1]?.score ?? 0
  const margin = (st.standings[0]?.score ?? 0) - runnerUp
  const bestBreak = game.players.reduce(
    (acc, p) => (st.per[p.id].highestBreak > acc.value ? { value: st.per[p.id].highestBreak, name: p.name } : acc),
    { value: 0, name: null },
  )

  return (
    <div className="shell page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" />
        </button>
        <div className="grow" />
        <button className="icon-btn" onClick={() => setConfirm(true)} aria-label="Delete frame">
          <Icon name="trash" />
        </button>
      </div>

      <div className="hero" style={{ textAlign: 'center' }}>
        {abandoned ? (
          <>
            <p className="eyebrow">Abandoned</p>
            <h1 className="hero__title" style={{ marginTop: 8 }}>
              No result
            </h1>
          </>
        ) : (
          <>
            <p className="eyebrow">Frame won by</p>
            <div style={{ display: 'grid', placeItems: 'center', gap: 10, margin: '14px 0 4px' }}>
              <Avatar name={winner?.name} accent={winner?.accent} size="lg" />
              <h1 className="hero__title">{winner?.name}</h1>
            </div>
            <p className="meta dim">
              {margin > 0 ? 'by ' + margin + ' points' : 'level on points'}
            </p>
          </>
        )}
        <p className="meta dim" style={{ marginTop: 14 }}>
          {formatDate(game.createdAt)} · {formatTime(game.createdAt)} · {formatShortDuration(duration)}
        </p>
      </div>

      <div className="tiles" style={{ marginTop: 18 }}>
        <Tile value={bestBreak.value || '—'} label="Top break" note={bestBreak.name || ''} accent="var(--brass)" />
        <Tile value={game.events.filter((e) => e.type === 'pot').length} label="Pots" />
        <Tile value={game.events.filter((e) => e.type === 'foul').length} label="Fouls" />
      </div>

      <section style={{ marginTop: 28 }}>
        <div className="section-head">
          <h2>Scorecard</h2>
          <span className="meta dim">tap for detail</span>
        </div>
        <div className="panel panel--flush">
          {st.standings.map((row, i) => {
            const p = game.players.find((x) => x.id === row.id)
            const s = st.per[row.id]
            return (
              <button className="list-row" key={row.id} onClick={() => setOpenPlayer(row.id)}>
                <span className="rank" data-top={i + 1}>
                  {i + 1}
                </span>
                <Avatar name={p.name} accent={p.accent} size="sm" />
                <span className="grow">
                  <span style={{ fontWeight: 600, display: 'block' }}>{p.name}</span>
                  <span className="meta dim" style={{ fontSize: 12 }}>
                    {plural(s.pots, 'pot')} · top break {s.highestBreak} · {plural(s.fouls, 'foul')}
                  </span>
                </span>
                <span className="serif-num" style={{ fontSize: 26 }}>
                  {row.score}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Setup</h2>
        <div className="panel">
          <div className="stack stack-8">
            <span className="row-between">
              <span className="meta dim">Format</span>
              <span className="meta">{MODES[game.mode].label}</span>
            </span>
            {game.mode === 'frame' ? (
              <span className="row-between">
                <span className="meta dim">Reds</span>
                <span className="meta">{game.settings.redsCount}</span>
              </span>
            ) : null}
            <span className="row-between">
              <span className="meta dim">Fouls</span>
              <span className="meta">{FOUL_RULES[game.settings.foulRule].label}</span>
            </span>
            {game.settings.targetScore ? (
              <span className="row-between">
                <span className="meta dim">Target</span>
                <span className="meta">{game.settings.targetScore}</span>
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 12 }}>Shot by shot</h2>
        <div className="panel">
          <div className="stack">
            {[...game.events].reverse().map((ev) => (
              <div className="feed__row" key={ev.id}>
                {ev.type === 'pot' ? (
                  <Ball ball={ev.ball} size={16} />
                ) : (
                  <span
                    style={{
                      width: 16,
                      display: 'grid',
                      placeItems: 'center',
                      color: ev.type === 'foul' ? 'var(--danger)' : 'var(--faint)',
                    }}
                  >
                    <Icon
                      name={ev.type === 'foul' ? 'close' : ev.type === 'safe' ? 'target' : ev.type === 'switch' ? 'swap' : 'minus'}
                      size={13}
                    />
                  </span>
                )}
                <span className="feed__text">{describeEvent(ev, game)}</span>
                {ev.type === 'pot' ? (
                  <span className="feed__pts">+{BALL_BY_ID[ev.ball]?.value}</span>
                ) : ev.type === 'foul' ? (
                  <span className="feed__pts feed__pts--foul">
                    {ev.rule === 'deduct' ? '−' : '+'}
                    {ev.value}
                  </span>
                ) : null}
                <span className="feed__time">{formatTime(ev.ts)}</span>
              </div>
            ))}
            {game.events.length === 0 ? <p className="meta dim">No shots were recorded.</p> : null}
          </div>
        </div>
      </section>

      <Sheet
        open={!!openPlayer}
        onClose={() => setOpenPlayer(null)}
        title={game.players.find((p) => p.id === openPlayer)?.name}
        subtitle="In this frame"
      >
        {openPlayer ? <PlayerFrameDetail stats={st.per[openPlayer]} /> : null}
        <Link
          className="btn btn--ghost btn--block"
          style={{ marginTop: 14 }}
          to={'/players/' + openPlayer}
        >
          Full player profile
        </Link>
      </Sheet>

      <Sheet
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this frame?"
        subtitle="It disappears from history and from everyone's stats. This cannot be undone."
      >
        <div className="stack stack-8">
          <button
            className="btn btn--danger btn--block btn--lg"
            onClick={() => {
              deleteGame(game.id)
              navigate('/frames', { replace: true })
            }}
          >
            <Icon name="trash" /> Delete frame
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => setConfirm(false)}>
            Keep it
          </button>
        </div>
      </Sheet>
    </div>
  )
}

function PlayerFrameDetail({ stats }) {
  const breakdown = ballBreakdown(stats.ballCounts).filter((b) => b.count > 0)
  const topBreaks = [...stats.breaks].sort((a, b) => b - a).slice(0, 3)
  return (
    <div className="stack stack-16">
      <div className="tiles">
        <Tile value={stats.score} label="Points" />
        <Tile value={stats.highestBreak} label="Top break" accent="var(--brass)" />
        <Tile value={pct(stats.pots, stats.shots) + '%'} label="Accuracy" />
      </div>

      <div className="tiles">
        <Tile value={stats.pots} label="Pots" />
        <Tile value={stats.fouls} label="Fouls" />
        <Tile value={stats.safes} label="Safeties" />
      </div>

      {breakdown.length ? (
        <div>
          <div className="label" style={{ marginBottom: 10 }}>
            Balls potted
          </div>
          <div className="stack stack-8">
            {breakdown.map(({ ball, count, share }) => (
              <div className="row" key={ball.id} style={{ gap: 10 }}>
                <Ball ball={ball} size={16} />
                <span className="meta" style={{ width: 52 }}>
                  {ball.label}
                </span>
                <span className="bar grow">
                  <span
                    className="bar__fill"
                    style={{ width: Math.max(share * 100, 4) + '%', '--fill': ball.hex }}
                  />
                </span>
                <span className="num meta" style={{ width: 20, textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {topBreaks.length ? (
        <div>
          <div className="label" style={{ marginBottom: 8 }}>
            Best visits
          </div>
          <div className="row wrap" style={{ gap: 6 }}>
            {topBreaks.map((b, i) => (
              <span className="badge badge--brass" key={i}>
                {b}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
