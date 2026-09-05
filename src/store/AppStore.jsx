import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { loadState, saveState, emptyState } from '../lib/storage.js'
import { ACCENTS, createGame, uid } from '../lib/snooker.js'

const StoreContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'replace':
      return action.state

    case 'insertPlayer':
      return { ...state, players: [...state.players, action.player] }

    case 'updatePlayer':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p,
        ),
      }

    case 'removePlayer':
      return { ...state, players: state.players.filter((p) => p.id !== action.id) }

    case 'startGame':
      return { ...state, games: [action.game, ...state.games] }

    case 'pushEvent':
      return {
        ...state,
        games: state.games.map((g) =>
          g.id === action.gameId ? { ...g, events: [...g.events, action.event] } : g,
        ),
      }

    case 'undo':
      return {
        ...state,
        games: state.games.map((g) =>
          g.id === action.gameId ? { ...g, events: g.events.slice(0, -1) } : g,
        ),
      }

    case 'endGame':
      return {
        ...state,
        games: state.games.map((g) =>
          g.id === action.gameId
            ? {
                ...g,
                status: action.status || 'completed',
                winnerId: action.winnerId ?? null,
                endedAt: Date.now(),
              }
            : g,
        ),
      }

    case 'deleteGame':
      return { ...state, games: state.games.filter((g) => g.id !== action.gameId) }

    case 'prefs':
      return { ...state, prefs: { ...state.prefs, ...action.patch } }

    case 'reset':
      return emptyState()

    default:
      return state
  }
}

export function AppStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)
  const first = useRef(true)
  // Lets the action creators read current data without re-memoising on every
  // change. Kept in sync after commit, which is before any handler can fire.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    // Skip the write on mount so a failed read never clobbers stored data.
    if (first.current) {
      first.current = false
      return
    }
    saveState(state)
  }, [state])

  const haptic = useCallback(
    (pattern = 8) => {
      if (!state.prefs.haptics) return
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(pattern)
        } catch {
          /* not supported, no harm */
        }
      }
    },
    [state.prefs.haptics],
  )

  const actions = useMemo(
    () => ({
      /** Creates the player (or returns the existing one) and hands it straight back. */
      addPlayer: (rawName) => {
        const name = String(rawName || '').trim()
        if (!name) return null
        const roster = stateRef.current.players
        const existing = roster.find((p) => p.name.toLowerCase() === name.toLowerCase())
        if (existing) return existing
        const player = {
          id: uid('p'),
          name,
          accent: ACCENTS[roster.length % ACCENTS.length],
          createdAt: Date.now(),
        }
        dispatch({ type: 'insertPlayer', player })
        return player
      },
      updatePlayer: (id, patch) => dispatch({ type: 'updatePlayer', id, patch }),
      removePlayer: (id) => dispatch({ type: 'removePlayer', id }),
      startGame: (config) => {
        const game = createGame(config)
        dispatch({ type: 'startGame', game })
        return game
      },
      pushEvent: (gameId, event) => dispatch({ type: 'pushEvent', gameId, event }),
      undo: (gameId) => dispatch({ type: 'undo', gameId }),
      endGame: (gameId, winnerId, status) =>
        dispatch({ type: 'endGame', gameId, winnerId, status }),
      deleteGame: (gameId) => dispatch({ type: 'deleteGame', gameId }),
      setPrefs: (patch) => dispatch({ type: 'prefs', patch }),
      replaceState: (next) => dispatch({ type: 'replace', state: next }),
      resetAll: () => dispatch({ type: 'reset' }),
    }),
    [],
  )

  const value = useMemo(() => ({ ...state, ...actions, haptic }), [state, actions, haptic])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside AppStoreProvider')
  return ctx
}
