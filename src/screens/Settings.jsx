import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/AppStore.jsx'
import { exportState, parseImport } from '../lib/storage.js'
import { BALLS, FOUL_RULES, MODES, RED_OPTIONS } from '../lib/snooker.js'
import Icon from '../components/Icon.jsx'
import { Ball, Segmented, Sheet, Switch } from '../components/ui.jsx'
import { useToast } from '../components/Toasts.jsx'

export default function Settings() {
  const navigate = useNavigate()
  const toast = useToast()
  const { players, games, prefs, setPrefs, replaceState, resetAll } = useStore()
  const fileRef = useRef(null)
  const [sheet, setSheet] = useState(null)
  const [pasted, setPasted] = useState('')

  const download = () => {
    const blob = new Blob([exportState({ version: 1, players, games, prefs })], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'baize-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast('Backup downloaded', { icon: 'download' })
  }

  const applyImport = (text) => {
    const result = parseImport(text)
    if (!result.ok) {
      toast(result.error)
      return
    }
    replaceState(result.state)
    setSheet(null)
    setPasted('')
    toast('Restored ' + result.state.games.length + ' frames', { tone: 'brass', icon: 'check' })
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => applyImport(String(reader.result))
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="shell page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <Icon name="back" />
        </button>
        <div className="page-head__title grow" style={{ alignItems: 'flex-end' }}>
          <h1 style={{ fontSize: 28 }}>Settings</h1>
        </div>
      </div>

      <section className="stack stack-12">
        <h2>Defaults for a new frame</h2>
        <Segmented
          ariaLabel="Default mode"
          value={prefs.defaultMode}
          onChange={(v) => setPrefs({ defaultMode: v })}
          options={Object.values(MODES).map((m) => ({ value: m.id, label: m.label }))}
        />
        <div className="label" style={{ marginTop: 4 }}>
          Reds
        </div>
        <Segmented
          ariaLabel="Default reds"
          value={prefs.defaultReds}
          onChange={(v) => setPrefs({ defaultReds: v })}
          options={RED_OPTIONS.map((r) => ({ value: r, label: String(r) }))}
        />
        <div className="label" style={{ marginTop: 4 }}>
          Foul points
        </div>
        <div className="panel panel--flush">
          {Object.values(FOUL_RULES).map((r) => (
            <button
              key={r.id}
              className="list-row"
              onClick={() => setPrefs({ defaultFoulRule: r.id })}
              aria-pressed={prefs.defaultFoulRule === r.id}
            >
              <span className="grow">
                <span style={{ fontWeight: 600, display: 'block' }}>{r.label}</span>
                <span className="meta dim" style={{ fontSize: 12 }}>
                  {r.hint}
                </span>
              </span>
              {prefs.defaultFoulRule === r.id ? (
                <Icon name="check" size={18} style={{ color: 'var(--brass)' }} />
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="stack stack-12" style={{ marginTop: 30 }}>
        <h2>Feel</h2>
        <div className="panel">
          <Switch
            on={prefs.haptics}
            onChange={(v) => setPrefs({ haptics: v })}
            label="Vibrate when a ball goes down"
          />
          <p className="meta dim" style={{ marginTop: 8 }}>
            Uses your phone's vibration motor. Silently ignored on devices without one.
          </p>
        </div>
      </section>

      <section className="stack stack-12" style={{ marginTop: 30 }}>
        <h2>Your data</h2>
        <div className="panel">
          <p className="meta dim" style={{ marginBottom: 14 }}>
            Everything is stored on this device only — {players.length} players and {games.length}{' '}
            frames. Nothing is uploaded anywhere. Clearing your browser data clears Baize, so keep a
            backup if these records matter.
          </p>
          <div className="stack stack-8">
            <button className="btn btn--block" onClick={download} disabled={!games.length && !players.length}>
              <Icon name="download" /> Download a backup
            </button>
            <button className="btn btn--block" onClick={() => setSheet('import')}>
              <Icon name="upload" /> Restore from backup
            </button>
            <button className="btn btn--danger btn--block" onClick={() => setSheet('reset')}>
              <Icon name="trash" /> Erase everything
            </button>
          </div>
        </div>
      </section>

      <section className="stack stack-12" style={{ marginTop: 30 }}>
        <h2>Ball values</h2>
        <div className="panel">
          <div className="row wrap" style={{ gap: 14, justifyContent: 'space-between' }}>
            {BALLS.map((b) => (
              <span
                key={b.id}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
              >
                <Ball ball={b} size={34} />
                <span className="num meta" style={{ fontWeight: 700 }}>
                  {b.value}
                </span>
              </span>
            ))}
          </div>
          <p className="meta dim" style={{ marginTop: 16 }}>
            In a full frame, a red is followed by a colour, which is respotted while reds remain.
            Once the last red and its colour are gone, the colours are cleared yellow through black.
            A foul is worth four points, or the value of the ball involved if that is higher.
          </p>
        </div>
      </section>

      <p className="meta dim" style={{ textAlign: 'center', marginTop: 34 }}>
        Baize · a scoreboard for shared tables
      </p>

      <Sheet
        open={sheet === 'import'}
        onClose={() => setSheet(null)}
        title="Restore from backup"
        subtitle="This replaces everything currently on this device."
      >
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} hidden />
        <button className="btn btn--block btn--lg" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" /> Choose a backup file
        </button>
        <div className="row" style={{ gap: 10, margin: '18px 0 12px' }}>
          <hr className="divider grow" />
          <span className="label">or paste it</span>
          <hr className="divider grow" />
        </div>
        <textarea
          className="input"
          placeholder="Paste the contents of a Baize backup file"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <button
          className="btn btn--primary btn--block"
          style={{ marginTop: 12 }}
          disabled={!pasted.trim()}
          onClick={() => applyImport(pasted)}
        >
          Restore
        </button>
      </Sheet>

      <Sheet
        open={sheet === 'reset'}
        onClose={() => setSheet(null)}
        title="Erase everything?"
        subtitle="Every player, frame and record on this device is deleted. There is no undo, so download a backup first if you might want it back."
      >
        <button
          className="btn btn--danger btn--block btn--lg"
          onClick={() => {
            resetAll()
            setSheet(null)
            toast('All data erased')
            navigate('/', { replace: true })
          }}
        >
          <Icon name="trash" /> Erase everything
        </button>
        <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} onClick={() => setSheet(null)}>
          Cancel
        </button>
      </Sheet>
    </div>
  )
}
