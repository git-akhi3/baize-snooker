import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'

const ITEMS = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/frames', icon: 'frames', label: 'Frames' },
  { fab: true },
  { to: '/ranks', icon: 'trophy', label: 'Ranks' },
  { to: '/players', icon: 'users', label: 'Players' },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // The play screen takes over the viewport; a tab bar under it would just
  // steal thumb room from the ball rack.
  if (pathname.startsWith('/play/')) return null

  return (
    <nav className="nav" aria-label="Primary">
      <div className="nav__inner">
        {ITEMS.map((item) =>
          item.fab ? (
            <button
              key="fab"
              className="nav__fab"
              onClick={() => navigate('/new')}
              aria-label="Start a new frame"
            >
              <Icon name="plus" />
              <span className="nav__fab-label">New frame</span>
            </button>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav__item' + (isActive ? ' is-active' : '')}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ),
        )}
      </div>
    </nav>
  )
}
