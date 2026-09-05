import { Link } from 'react-router-dom'
import { gameState } from '../lib/stats.js'
import { MODES } from '../lib/snooker.js'
import Icon from './Icon.jsx'
import { Avatar } from './ui.jsx'

/** One completed (or abandoned) frame, as a tappable row. */
export default function FrameRow({ game, subtitle }) {
  const st = gameState(game)
  const winnerId = game.winnerId ?? st.standings[0]?.id
  const winner = game.players.find((p) => p.id === winnerId)
  const scoreline = st.standings.map((s) => s.score).join(' – ')
  const abandoned = game.status === 'abandoned'

  return (
    <Link className="list-row" to={'/frames/' + game.id}>
      {abandoned ? (
        <span className="avatar avatar--sm" style={{ '--accent': 'var(--muted)' }}>
          <Icon name="minus" size={14} />
        </span>
      ) : (
        <Avatar name={winner?.name} accent={winner?.accent} size="sm" />
      )}
      <span className="grow">
        <span style={{ fontWeight: 600, display: 'block' }}>
          {abandoned ? 'Abandoned frame' : (winner?.name ?? 'Unfinished') + ' took it'}
        </span>
        <span className="meta dim" style={{ fontSize: 12 }}>
          {subtitle} · {game.players.length} players · {MODES[game.mode].label}
        </span>
      </span>
      <span className="num" style={{ color: 'var(--cream-2)', fontSize: 13, fontWeight: 600 }}>
        {scoreline}
      </span>
      <Icon name="forward" size={15} style={{ color: 'var(--faint)' }} />
    </Link>
  )
}
