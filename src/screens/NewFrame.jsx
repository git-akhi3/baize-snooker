import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore.jsx'
import { FOUL_RULES, MODES, RED_OPTIONS } from '../lib/snooker.js'
import { activeGame } from '../lib/stats.js'
import Icon from '../components/Icon.jsx'
import { Avatar, Segmented } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

const TARGETS = [
  { label: 'None', value: null },
  { label: '30', value: 30 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
]

export default function NewFrame() {
  const navigate = useNavigate()
  const toast = useToast()
  const { players, games, prefs, addPlayer, startGame, endGame, deleteGame } = useStore()

  const live = useMemo(() => activeGame(games), [games])

  const [picked, setPicked] = useState([])
  const [name, setName] = useState('')
  const [mode, setMode] = useState(prefs.defaultMode)
  const [reds, setReds] = useState(prefs.defaultReds)
  const [foulRule, setFoulRule] = useState(prefs.defaultFoulRule)
  const [target, setTarget] = useState(null)

  const toggle = (id) =>
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  const submitName = (e) => {
    e.preventDefault()
    const player = addPlayer(name)
    if (!player) return
    setPicked((list) => (list.includes(player.id) ? list : [...list, player.id]))
    setName('')
  }

  const start = () => {
    if (picked.length < 2) {
      toast('Pick at least two players')
      return
    }
    const chosen = picked.map((id) => players.find((p) => p.id === id)).filter(Boolean)
    const game = startGame({
      players: chosen,
      mode,
      settings: { redsCount: reds, foulRule, targetScore: mode === 'casual' ? target : null },
    })
    navigate('/play/' + game.id, { replace: true })
  }

  return (
    <div className="shell page">
      <div className="page-head">
        <div className="page-head__title">
          <span className="eyebrow">Set up</span>
          <h1>New frame</h1>
        </div>
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      {live ? (
        <div className="panel panel--raised" style={{ marginBottom: 22 }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className="badge badge--live">
              <span className="dot" /> Frame in play
            </span>
            <span className="meta dim">{live.players.map((p) => p.name).join(' · ')}</span>
          </div>
          <p className="meta dim" style={{ marginBottom: 14 }}>
            Finish or discard the frame on the table before racking up another.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--primary grow" onClick={() => navigate('/play/' + live.id)}>
              Resume
            </button>
            <button
              className="btn btn--danger grow"
              onClick={() => {
                if (live.events.length === 0) deleteGame(live.id)
                else endGame(live.id, null, 'abandoned')
                toast('Frame discarded')
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      <section className="stack stack-12">
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h2>Who is playing?</h2>
          <span className="meta dim">{picked.length} picked</span>
        </div>

        {players.length > 0 ? (
          <div className="row wrap" style={{ gap: 8 }}>
            {players.map((p) => {
              const idx = picked.indexOf(p.id)
              const on = idx >= 0
              return (
                <button
                  key={p.id}
                  className={'chip' + (on ? ' is-on' : '')}
                  style={{ '--accent': p.accent }}
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                >
                  {on ? (
                    <span className="chip__order">{idx + 1}</span>
                  ) : (
                    <Avatar name={p.name} accent={p.accent} size="sm" />
                  )}
                  {p.name}
                </button>
              )
            })}
          </div>
        ) : null}

        <form onSubmit={submitName} className="row" style={{ gap: 8 }}>
          <input
            className="input grow"
            placeholder={players.length ? 'Add someone else' : 'First player’s name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="off"
          />
          <button className="btn" type="submit" disabled={!name.trim()} aria-label="Add player">
            <Icon name="plus" />
          </button>
        </form>
        {picked.length > 1 ? (
          <p className="meta dim">
            Order of play: {picked.map((id) => players.find((p) => p.id === id)?.name).join(' → ')}
          </p>
        ) : null}
      </section>

      <section className="stack stack-12" style={{ marginTop: 30 }}>
        <h2>How are you playing?</h2>
        <Segmented
          ariaLabel="Game mode"
          value={mode}
          onChange={setMode}
          options={Object.values(MODES).map((m) => ({ value: m.id, label: m.label }))}
        />
        <p className="meta dim">{MODES[mode].hint}</p>
      </section>

      {mode === 'frame' ? (
        <section className="stack stack-12" style={{ marginTop: 26 }}>
          <div className="label">Reds on the table</div>
          <Segmented
            ariaLabel="Number of reds"
            value={reds}
            onChange={setReds}
            options={RED_OPTIONS.map((r) => ({ value: r, label: String(r) }))}
          />
        </section>
      ) : (
        <section className="stack stack-12" style={{ marginTop: 26 }}>
          <div className="label">Play to a target</div>
          <Segmented
            ariaLabel="Target score"
            value={target}
            onChange={setTarget}
            options={TARGETS.map((t) => ({ value: t.value, label: t.label }))}
          />
          <p className="meta dim">
            {target
              ? 'Baize will offer to close the frame when someone reaches ' + target + '.'
              : 'Finish the frame whenever you like from the frame menu.'}
          </p>
        </section>
      )}

      <section className="stack stack-12" style={{ marginTop: 26 }}>
        <div className="label">Foul points go to</div>
        <div className="panel panel--flush">
          {Object.values(FOUL_RULES).map((r) => (
            <button
              key={r.id}
              className="list-row"
              onClick={() => setFoulRule(r.id)}
              aria-pressed={foulRule === r.id}
            >
              <span className="grow">
                <span style={{ fontWeight: 600, display: 'block' }}>{r.label}</span>
                <span className="meta dim" style={{ fontSize: 12 }}>
                  {r.hint}
                </span>
              </span>
              {foulRule === r.id ? (
                <Icon name="check" size={18} style={{ color: 'var(--brass)' }} />
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <button
        className="btn btn--felt btn--block btn--lg"
        style={{ marginTop: 30 }}
        onClick={start}
        disabled={!!live || picked.length < 2}
      >
        <Icon name="play" /> Break off
      </button>
      {picked.length < 2 && !live ? (
        <p className="meta dim" style={{ textAlign: 'center', marginTop: 10 }}>
          Pick at least two players to begin.
        </p>
      ) : null}
    </div>
  )
}
