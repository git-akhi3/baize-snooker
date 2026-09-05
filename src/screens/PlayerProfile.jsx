import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/AppStore.jsx'
import { achievementsFor, ballBreakdown, playerStats, rivalsFor } from '../lib/stats.js'
import { formatCompactDuration, plural, relativeDay } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { Avatar, Ball, Empty, FormDots, Sheet, Tile } from '../components/ui.jsx'
import FrameRow from '../components/FrameRow.jsx'
import { useToast } from '../components/Toasts.jsx'

export default function PlayerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { players, games, updatePlayer, removePlayer } = useStore()

  const player = players.find((p) => p.id === id)
  const [sheet, setSheet] = useState(null)
  const [draftName, setDraftName] = useState('')

  const stats = useMemo(() => (player ? playerStats(player.id, games) : null), [player, games])
  const rivals = useMemo(() => (player ? rivalsFor(player.id, players, games) : []), [player, players, games])
  const trophies = useMemo(
    () => (player ? achievementsFor(player.id, games, stats) : []),
    [player, games, stats],
  )
  const recent = useMemo(
    () =>
      games
        .filter((g) => g.status !== 'active' && g.players.some((p) => p.id === id))
        .sort((a, b) => (b.endedAt || b.createdAt) - (a.endedAt || a.createdAt))
        .slice(0, 5),
    [games, id],
  )

  if (!player) {
    return (
      <div className="shell page">
        <p className="meta dim">That player is no longer on the roster.</p>
        <button className="btn btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate('/players')}>
          Back to players
        </button>
      </div>
    )
  }

  const earned = trophies.filter((t) => t.earned)
  const breakdown = ballBreakdown(stats.ballCounts).filter((b) => b.count > 0)
  const bestRival = rivals[0]

  return (
    <div className="shell page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" />
        </button>
        <div className="grow" />
        <button
          className="icon-btn"
          onClick={() => {
            setDraftName(player.name)
            setSheet('edit')
          }}
          aria-label="Edit player"
        >
          <Icon name="edit" />
        </button>
      </div>

      <div className="hero" style={{ textAlign: 'center' }}>
        <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
          <Avatar name={player.name} accent={player.accent} size="lg" />
          <h1 className="hero__title">{player.name}</h1>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 12 }}>
          <FormDots results={stats.results} />
          {stats.streak.count >= 2 ? (
            <span className={'badge ' + (stats.streak.type === 'W' ? 'badge--brass' : '')}>
              <Icon name={stats.streak.type === 'W' ? 'flame' : 'minus'} size={12} />
              {stats.streak.count} {stats.streak.type === 'W' ? 'wins' : 'losses'} running
            </span>
          ) : null}
        </div>
      </div>

      {stats.played === 0 ? (
        <div className="panel" style={{ marginTop: 20 }}>
          <Empty
            icon="cue"
            title="No frames on record"
            body={player.name + ' has not finished a frame yet. Pick them for the next one.'}
            action={
              <button className="btn btn--primary" onClick={() => navigate('/new')}>
                <Icon name="plus" /> Start a frame
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="tiles" style={{ marginTop: 18 }}>
            <Tile value={stats.played} label="Frames" note={stats.won + 'W · ' + stats.lost + 'L'} />
            <Tile value={stats.winRate + '%'} label="Win rate" accent="var(--felt)" />
            <Tile value={stats.highestBreak} label="Top break" accent="var(--brass)" />
          </div>

          <div className="tiles" style={{ marginTop: 8 }}>
            <Tile value={stats.avgPoints} label="Avg score" note={'best ' + stats.bestFrameScore} />
            <Tile value={stats.accuracy + '%'} label="Pot success" note={stats.pots + ' of ' + stats.shots} />
            <Tile value={stats.avgBreak} label="Avg visit" note={plural(stats.breaks.length, 'visit')} />
          </div>

          <div className="tiles" style={{ marginTop: 8 }}>
            <Tile value={stats.points.toLocaleString()} label="Total points" />
            <Tile value={stats.fouls} label="Fouls" />
            <Tile value={formatCompactDuration(stats.timeAtTable)} label="At the table" />
          </div>

          {breakdown.length ? (
            <section style={{ marginTop: 28 }}>
              <div className="section-head">
                <h2>Ball diet</h2>
                {stats.favouriteBall ? (
                  <span className="meta dim">
                    favours the {stats.favouriteBall.ball.label.toLowerCase()}
                  </span>
                ) : null}
              </div>
              <div className="panel stack stack-8">
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
                    <span className="num meta" style={{ width: 28, textAlign: 'right' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {rivals.length ? (
            <section style={{ marginTop: 28 }}>
              <div className="section-head">
                <h2>Head to head</h2>
                {bestRival ? <span className="meta dim">most played: {bestRival.player.name}</span> : null}
              </div>
              <div className="panel panel--flush">
                {rivals.map((r) => {
                  const total = r.a + r.b || 1
                  return (
                    <div className="list-row" key={r.player.id}>
                      <Avatar name={r.player.name} accent={r.player.accent} size="sm" />
                      <span className="grow">
                        <span style={{ fontWeight: 600, display: 'block', fontSize: 14 }}>
                          {r.player.name}
                        </span>
                        <span
                          className="bar"
                          style={{ marginTop: 6, background: 'rgba(207,85,64,.35)' }}
                        >
                          <span
                            className="bar__fill"
                            style={{ width: (r.a / total) * 100 + '%', '--fill': 'var(--felt)' }}
                          />
                        </span>
                      </span>
                      <span className="num" style={{ fontWeight: 700, fontSize: 14 }}>
                        <span style={{ color: r.a >= r.b ? 'var(--felt)' : 'var(--cream-2)' }}>{r.a}</span>
                        <span className="dim"> – </span>
                        <span style={{ color: r.b > r.a ? 'var(--danger)' : 'var(--cream-2)' }}>{r.b}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section style={{ marginTop: 28 }}>
            <div className="section-head">
              <h2>Honours</h2>
              <span className="meta dim">
                {earned.length} of {trophies.length}
              </span>
            </div>
            <div className="stack stack-8">
              {[...trophies].sort((a, b) => Number(b.earned) - Number(a.earned)).map((t) => (
                <div className={'trophy-card' + (t.earned ? '' : ' is-locked')} key={t.id}>
                  <span className="trophy-card__icon">
                    <Icon name={t.earned ? 'medal' : 'lock'} />
                  </span>
                  <span>
                    <span style={{ fontWeight: 600, display: 'block' }}>{t.name}</span>
                    <span className="meta dim" style={{ fontSize: 12.5 }}>
                      {t.detail}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 28 }}>
            <h2 style={{ marginBottom: 12 }}>Latest frames</h2>
            <div className="panel panel--flush">
              {recent.map((g) => (
                <FrameRow key={g.id} game={g} subtitle={relativeDay(g.endedAt || g.createdAt)} />
              ))}
            </div>
          </section>
        </>
      )}

      <Sheet open={sheet === 'edit'} onClose={() => setSheet(null)} title="Edit player">
        <div className="field">
          <label className="label" htmlFor="pname">
            Name
          </label>
          <input
            id="pname"
            className="input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={24}
          />
        </div>

        <div className="field" style={{ marginTop: 18 }}>
          <span className="label">Colour</span>
          <div className="row wrap" style={{ gap: 8 }}>
            {['#D8A93C', '#4A9BC4', '#59A96A', '#D8788F', '#C2352C', '#9B7BD4', '#E08A3C', '#5FC2B0'].map(
              (c) => (
                <button
                  key={c}
                  onClick={() => updatePlayer(player.id, { accent: c })}
                  aria-label={'Use colour ' + c}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: c,
                    boxShadow:
                      player.accent === c
                        ? '0 0 0 2px var(--bg), 0 0 0 4px ' + c
                        : 'inset 0 0 0 1px rgba(255,255,255,.2)',
                  }}
                />
              ),
            )}
          </div>
        </div>

        <button
          className="btn btn--primary btn--block btn--lg"
          style={{ marginTop: 20 }}
          disabled={!draftName.trim()}
          onClick={() => {
            updatePlayer(player.id, { name: draftName.trim() })
            setSheet(null)
            toast('Saved')
          }}
        >
          Save
        </button>
        <button
          className="btn btn--danger btn--block"
          style={{ marginTop: 8 }}
          onClick={() => setSheet('delete')}
        >
          <Icon name="trash" /> Remove from roster
        </button>
      </Sheet>

      <Sheet
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title={'Remove ' + player.name + '?'}
        subtitle="Frames already played keep their record — they just drop off the roster and the leaderboard."
      >
        <button
          className="btn btn--danger btn--block btn--lg"
          onClick={() => {
            removePlayer(player.id)
            navigate('/players', { replace: true })
          }}
        >
          Remove
        </button>
        <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} onClick={() => setSheet(null)}>
          Cancel
        </button>
      </Sheet>
    </div>
  )
}
