import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/AppStore.jsx'
import {
  BALL_BY_ID,
  COLOURS,
  FOUL_RULES,
  MODES,
  deriveState,
  describeEvent,
  foulBeneficiaries,
  makeEvent,
  milestoneFor,
} from '../lib/snooker.js'
import { formatDuration, formatTime } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import { Avatar, Ball, Sheet } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

const FOUL_OPTIONS = [
  { value: 4, note: 'Standard' },
  { value: 5, note: 'Blue' },
  { value: 6, note: 'Pink' },
  { value: 7, note: 'Black' },
]

export default function Play() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { games, pushEvent, undo, endGame, deleteGame, haptic } = useStore()
  const toast = useToast()

  const game = games.find((g) => g.id === id)
  const [sheet, setSheet] = useState(null) // 'foul' | 'menu' | 'end' | 'adjust'
  const [pop, setPop] = useState(null)
  const [winnerId, setWinnerId] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const endedPrompt = useRef(false)

  const state = useMemo(() => (game ? deriveState(game) : null), [game])

  useEffect(() => {
    if (!game || game.status !== 'active') return
    const tick = () => setElapsed(Date.now() - game.startedAt)
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [game])

  // Offer to close the frame the moment the table runs out of balls, or the
  // agreed target is hit — but only once, so it can be dismissed.
  useEffect(() => {
    if (!game || !state || game.status !== 'active' || endedPrompt.current) return
    if (state.frameComplete || state.targetReached) {
      endedPrompt.current = true
      setWinnerId(state.standings[0]?.id ?? null)
      setSheet('end')
    }
  }, [game, state])

  useEffect(() => {
    if (game && game.status !== 'active') navigate('/frames/' + game.id, { replace: true })
  }, [game, navigate])

  const players = game?.players ?? []
  const current = players.find((p) => p.id === state?.currentPlayerId)

  const pot = useCallback(
    (ballId) => {
      if (!game || !state) return
      const ball = BALL_BY_ID[ballId]
      const before = state.currentBreak
      const striker = state.currentPlayerId
      pushEvent(game.id, makeEvent('pot', { playerId: striker, ball: ballId }))
      haptic(12)
      setPop({ key: Date.now(), playerId: striker, value: ball.value })
      const milestone = milestoneFor(before, before + ball.value)
      if (milestone) {
        const name = game.players.find((p) => p.id === striker)?.name ?? 'Player'
        toast(milestone.label + ' — ' + name, { tone: 'brass', icon: 'sparkle', duration: 3200 })
        haptic([16, 60, 16])
      }
    },
    [game, state, pushEvent, haptic, toast],
  )

  const endTurn = useCallback(
    (type) => {
      if (!game || !state) return
      pushEvent(game.id, makeEvent(type, { playerId: state.currentPlayerId }))
      haptic(6)
    },
    [game, state, pushEvent, haptic],
  )

  const commitFoul = useCallback(
    (value) => {
      if (!game || !state) return
      const striker = state.currentPlayerId
      pushEvent(
        game.id,
        makeEvent('foul', {
          playerId: striker,
          value,
          rule: game.settings.foulRule,
          beneficiaries: foulBeneficiaries(game, striker),
        }),
      )
      haptic([10, 40, 10])
      setSheet(null)
    },
    [game, state, pushEvent, haptic],
  )

  const switchTo = useCallback(
    (playerId) => {
      if (!game || !state || playerId === state.currentPlayerId) return
      pushEvent(game.id, makeEvent('switch', { playerId }))
      haptic(8)
    },
    [game, state, pushEvent, haptic],
  )

  const adjust = useCallback(
    (playerId, delta) => {
      if (!game) return
      pushEvent(game.id, makeEvent('adjust', { playerId, delta }))
      haptic(6)
    },
    [game, pushEvent, haptic],
  )

  if (!game) {
    return (
      <div className="shell page">
        <p className="meta dim">That frame is no longer here.</p>
        <button className="btn btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    )
  }

  const dense = players.length >= 3
  const legal = new Set(state.nextLegal)
  const strict = game.mode === 'frame'
  const recent = game.events.slice(-70).reverse()

  return (
    <div className="play">
      <header className="play__bar">
        <button className="icon-btn icon-btn--bare" onClick={() => navigate('/')} aria-label="Leave frame">
          <Icon name="back" />
        </button>
        <div className="play__bar-title">
          <span className="eyebrow">{MODES[game.mode].label}</span>
          <span className="meta num" style={{ color: 'var(--cream)' }}>
            {formatDuration(elapsed)}
          </span>
        </div>
        <button className="icon-btn icon-btn--bare" onClick={() => setSheet('menu')} aria-label="Frame options">
          <Icon name="more" />
        </button>
      </header>

      <div className="play__body">
        <div
          className="scorers"
          data-count={
            players.length === 1 ? '1' : players.length === 3 ? '3' : players.length > 3 ? 'many' : '2'
          }
          data-dense={String(dense)}
        >
          {players.map((p) => {
            const s = state.per[p.id]
            const isActive = p.id === state.currentPlayerId
            const isLeader = state.leaderId === p.id && s.score > 0
            return (
              <button
                key={p.id}
                className={'scorer' + (isActive ? ' is-active' : '')}
                style={{ '--accent': p.accent }}
                onClick={() => switchTo(p.id)}
                aria-pressed={isActive}
              >
                <span className="scorer__top">
                  <Avatar name={p.name} accent={p.accent} size="sm" />
                  <span className="scorer__name">{p.name}</span>
                  {isLeader ? <Icon name="crown" className="crown" /> : null}
                </span>
                <span className="scorer__score num">{s.score}</span>
                <span className="scorer__sub">
                  {isActive && state.currentBreak > 0 ? (
                    <span className="scorer__break">break {state.currentBreak}</span>
                  ) : s.highestBreak > 0 ? (
                    <span>top {s.highestBreak}</span>
                  ) : (
                    <span>—</span>
                  )}
                </span>
                {pop && pop.playerId === p.id ? (
                  <span className="pop" key={pop.key}>
                    +{pop.value}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="strip">
          <span className="strip__break">
            <span className="label">Break</span>
            <span className="strip__break-value">{state.currentBreak}</span>
          </span>
          <span className="break-balls">
            {state.breakBalls.slice(-8).map((b, i) => (
              <Ball key={i} ball={b} className="ball--dot" />
            ))}
          </span>
          <span className="strip__facts">
            {strict ? (
              <>
                <span>
                  Reds <b>{state.redsRemaining}</b>
                </span>
                <span>
                  Remaining <b>{state.pointsRemaining}</b>
                </span>
                {state.snookersRequired > 0 ? (
                  <span className="snookers">
                    {state.snookersRequired} snooker{state.snookersRequired > 1 ? 's' : ''} needed
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <span>
                  Shots <b>{game.events.filter((e) => e.type === 'pot').length}</b>
                </span>
                {game.settings.targetScore ? (
                  <span>
                    Target <b>{game.settings.targetScore}</b>
                  </span>
                ) : (
                  <span>
                    Lead <b>{state.gap}</b>
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        <div className="feed">
          {recent.length === 0 ? (
            <p className="meta dim" style={{ padding: '18px 2px' }}>
              Tap a ball below to record the first pot. Tap a player card to hand over the table.
            </p>
          ) : (
            recent.map((ev) => {
              const p = players.find((x) => x.id === ev.playerId)
              return (
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
                  <span className="feed__text" style={{ color: p ? 'var(--cream)' : undefined }}>
                    {describeEvent(ev, game)}
                  </span>
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
              )
            })
          )}
        </div>
      </div>

      <div className="rack">
        <div className="rack__inner">
          <div className="on-strip">
            <Avatar name={current?.name} accent={current?.accent} size="sm" />
            <span>
              <b>{current?.name}</b> is at the table
            </span>
            {strict ? (
              <span className="dim">
                ·{' '}
                {state.inClearance
                  ? state.coloursRemaining.length
                    ? 'on the ' + state.coloursRemaining[0].label.toLowerCase()
                    : 'frame over'
                  : state.expect === 'red'
                    ? 'on a red'
                    : 'on a colour'}
              </span>
            ) : null}
          </div>

          <button
            className="rack__red"
            onClick={() => pot('red')}
            disabled={strict && !legal.has('red')}
            style={strict && !legal.has('red') ? { opacity: 0.32, filter: 'saturate(.5)' } : null}
          >
            Red <span style={{ opacity: 0.7 }}>+1</span>
            {strict ? <span className="badge-count">{state.redsRemaining} left</span> : null}
          </button>

          <div className="rack__colours">
            {COLOURS.map((b) => {
              const off = strict && !legal.has(b.id)
              return (
                <button
                  key={b.id}
                  className={'rack__ball' + (off ? ' is-illegal' : '')}
                  onClick={() => pot(b.id)}
                  disabled={off}
                  aria-label={'Pot the ' + b.label + ', ' + b.value + ' points'}
                >
                  <Ball ball={b} showValue />
                  <span className="rack__ball-label">{b.label}</span>
                </button>
              )
            })}
          </div>

          <div className="rack__actions">
            <button className="rack__action" onClick={() => endTurn('safe')}>
              <Icon name="target" />
              Safe
            </button>
            <button className="rack__action" onClick={() => endTurn('miss')}>
              <Icon name="swap" />
              Miss
            </button>
            <button className="rack__action rack__action--foul" onClick={() => setSheet('foul')}>
              <Icon name="close" />
              Foul
            </button>
            <button
              className="rack__action"
              onClick={() => {
                undo(game.id)
                haptic(6)
              }}
              disabled={game.events.length === 0}
            >
              <Icon name="undo" />
              Undo
            </button>
          </div>
        </div>
      </div>

      <Sheet
        open={sheet === 'foul'}
        onClose={() => setSheet(null)}
        title="Foul"
        subtitle={
          game.settings.foulRule === 'deduct'
            ? (current?.name ?? 'The striker') + ' loses the points.'
            : 'Points go to ' + FOUL_RULES[game.settings.foulRule].label.toLowerCase() + '.'
        }
      >
        <div className="stack-8 stack">
          {FOUL_OPTIONS.map((f) => (
            <button key={f.value} className="btn btn--block btn--lg" onClick={() => commitFoul(f.value)}>
              <span className="grow" style={{ textAlign: 'left' }}>
                {f.value} points
              </span>
              <span className="dim" style={{ fontWeight: 500 }}>
                {f.note}
              </span>
            </button>
          ))}
        </div>
        <button className="btn btn--ghost btn--block" style={{ marginTop: 12 }} onClick={() => setSheet(null)}>
          Cancel
        </button>
      </Sheet>

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="Frame options">
        <div className="stack stack-8">
          <button
            className="btn btn--block btn--lg"
            onClick={() => {
              setWinnerId(state.standings[0]?.id ?? null)
              setSheet('end')
            }}
          >
            <Icon name="check" /> Finish frame
          </button>
          <button className="btn btn--block btn--lg" onClick={() => setSheet('adjust')}>
            <Icon name="edit" /> Adjust scores
          </button>
          <div className="panel" style={{ marginTop: 6 }}>
            <div className="label" style={{ marginBottom: 6 }}>
              This frame
            </div>
            <p className="meta dim">
              {MODES[game.mode].label} · {game.settings.redsCount} reds ·{' '}
              {FOUL_RULES[game.settings.foulRule].label.toLowerCase()} on a foul
              {game.settings.targetScore ? ' · first to ' + game.settings.targetScore : ''}
            </p>
          </div>
          <button
            className="btn btn--danger btn--block"
            onClick={() => {
              if (game.events.length === 0) deleteGame(game.id)
              else endGame(game.id, null, 'abandoned')
              navigate('/', { replace: true })
            }}
          >
            <Icon name="trash" /> Abandon frame
          </button>
        </div>
      </Sheet>

      <Sheet
        open={sheet === 'adjust'}
        onClose={() => setSheet(null)}
        title="Adjust scores"
        subtitle="For when a pot went in the book wrong. Every change is kept in the timeline."
      >
        <div className="stack stack-8">
          {players.map((p) => (
            <div className="panel row-between" key={p.id}>
              <span className="row">
                <Avatar name={p.name} accent={p.accent} size="sm" />
                <span style={{ fontWeight: 600 }}>{p.name}</span>
              </span>
              <span className="row" style={{ gap: 8 }}>
                <button className="icon-btn" onClick={() => adjust(p.id, -1)} aria-label={'Remove a point from ' + p.name}>
                  <Icon name="minus" />
                </button>
                <span className="num" style={{ minWidth: 34, textAlign: 'center', fontSize: 19, fontWeight: 600 }}>
                  {state.per[p.id].score}
                </span>
                <button className="icon-btn" onClick={() => adjust(p.id, 1)} aria-label={'Add a point to ' + p.name}>
                  <Icon name="plus" />
                </button>
              </span>
            </div>
          ))}
        </div>
        <button className="btn btn--primary btn--block" style={{ marginTop: 14 }} onClick={() => setSheet(null)}>
          Done
        </button>
      </Sheet>

      <Sheet
        open={sheet === 'end'}
        onClose={() => setSheet(null)}
        title="Finish frame"
        subtitle="Confirm who takes it. The frame is then saved to history and the leaderboard."
      >
        <div className="stack stack-8">
          {state.standings.map((row, i) => {
            const p = players.find((x) => x.id === row.id)
            const picked = winnerId === row.id
            return (
              <button
                key={row.id}
                className={'chip' + (picked ? ' is-on' : '')}
                style={{ '--accent': p.accent, width: '100%', justifyContent: 'flex-start', minHeight: 54, borderRadius: 14 }}
                onClick={() => setWinnerId(row.id)}
              >
                <span className="rank" data-top={i + 1}>
                  {i + 1}
                </span>
                <Avatar name={p.name} accent={p.accent} size="sm" />
                <span className="grow" style={{ textAlign: 'left', fontWeight: 600 }}>
                  {p.name}
                </span>
                <span className="serif-num" style={{ fontSize: 22 }}>
                  {row.score}
                </span>
                {picked ? <Icon name="check" size={17} /> : null}
              </button>
            )
          })}
        </div>
        <button
          className="btn btn--primary btn--block btn--lg"
          style={{ marginTop: 16 }}
          disabled={!winnerId}
          onClick={() => {
            endGame(game.id, winnerId)
            haptic([14, 50, 14])
            navigate('/frames/' + game.id, { replace: true })
          }}
        >
          <Icon name="trophy" /> Save frame
        </button>
        <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} onClick={() => setSheet(null)}>
          Keep playing
        </button>
      </Sheet>
    </div>
  )
}
