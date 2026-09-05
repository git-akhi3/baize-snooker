/**
 * Snooker domain model.
 *
 * A game is stored as an ordered list of events. Every piece of live state
 * (scores, whose turn it is, the current break, reds left) is derived by
 * replaying those events. That makes undo a matter of dropping the last event,
 * and it means the frame history is an exact record of what happened.
 */

export const BALLS = [
  { id: 'red', label: 'Red', value: 1, hex: '#C2352C' },
  { id: 'yellow', label: 'Yellow', value: 2, hex: '#E2A924' },
  { id: 'green', label: 'Green', value: 3, hex: '#1C7A4B' },
  { id: 'brown', label: 'Brown', value: 4, hex: '#7E5231' },
  { id: 'blue', label: 'Blue', value: 5, hex: '#245E9E' },
  { id: 'pink', label: 'Pink', value: 6, hex: '#D8788F' },
  { id: 'black', label: 'Black', value: 7, hex: '#1A1613' },
]

export const BALL_BY_ID = Object.fromEntries(BALLS.map((b) => [b.id, b]))
export const COLOURS = BALLS.filter((b) => b.id !== 'red')
export const RED = BALL_BY_ID.red

/** Points left on the table once every red is gone: 2+3+4+5+6+7 */
const CLEARANCE_TOTAL = COLOURS.reduce((s, b) => s + b.value, 0)

export const RED_OPTIONS = [6, 10, 15]

export const FOUL_RULES = {
  opponents: {
    id: 'opponents',
    label: 'Every opponent',
    hint: 'Standard snooker. All other players receive the foul points.',
  },
  next: {
    id: 'next',
    label: 'Next player only',
    hint: 'A common house rule when several people share one table.',
  },
  deduct: {
    id: 'deduct',
    label: 'Offender loses points',
    hint: 'Points come off the score of the player at fault.',
  },
}

export const MODES = {
  casual: {
    id: 'casual',
    label: 'Open table',
    tagline: 'Any ball, any time',
    hint: 'No rules enforced. Best for a group sharing a table: tap who is on and the ball they potted.',
  },
  frame: {
    id: 'frame',
    label: 'Full frame',
    tagline: 'Reds, then colours',
    hint: 'Guides you red to colour to clearance, and tracks points remaining and snookers required.',
  },
}

export const ACCENTS = [
  '#D8A93C',
  '#4A9BC4',
  '#59A96A',
  '#D8788F',
  '#C2352C',
  '#9B7BD4',
  '#E08A3C',
  '#5FC2B0',
]

export function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function defaultGameSettings() {
  return { redsCount: 15, foulRule: 'opponents', targetScore: null }
}

export function createGame({ players, mode = 'casual', settings = {} }) {
  const now = Date.now()
  return {
    id: uid('g'),
    mode,
    createdAt: now,
    startedAt: now,
    endedAt: null,
    status: 'active',
    winnerId: null,
    settings: { ...defaultGameSettings(), ...settings },
    // Names are snapshotted, so renaming or removing someone from the roster
    // later never rewrites the record of a frame already played.
    players: players.map((p, i) => ({
      id: p.id,
      name: p.name,
      accent: p.accent || ACCENTS[i % ACCENTS.length],
    })),
    events: [],
  }
}

/** Who receives the points for a foul committed by `strikerId`. */
export function foulBeneficiaries(game, strikerId) {
  const ids = game.players.map((p) => p.id)
  const rule = game.settings.foulRule
  if (rule === 'deduct') return []
  if (rule === 'next') {
    const i = ids.indexOf(strikerId)
    return [ids[(i + 1) % ids.length]]
  }
  return ids.filter((id) => id !== strikerId)
}

// Don't let a game left paused on the table skew "time at the table".
const TIME_PER_SHOT_CAP = 4 * 60 * 1000

/**
 * Replay a game's events into live state. Pure: same game in, same state out.
 */
export function deriveState(game) {
  const ids = game.players.map((p) => p.id)
  const n = ids.length
  const redsCount = game.settings.redsCount ?? 15
  const strict = game.mode === 'frame'

  const per = {}
  for (const id of ids) {
    per[id] = {
      score: 0,
      pots: 0,
      fouls: 0,
      misses: 0,
      safes: 0,
      shots: 0,
      breaks: [],
      highestBreak: 0,
      ballCounts: {},
      pointsFromBalls: 0,
      pointsFromFouls: 0,
      pointsConceded: 0,
      timeAtTable: 0,
    }
  }

  let turn = 0
  let curBreak = 0
  let breakBalls = []
  let redsPotted = 0
  let inClearance = false
  let clearanceIndex = 0 // 0 means yellow is next
  let expect = 'red' // 'red' | 'colour', only meaningful while reds are on
  let lastTs = game.startedAt

  const closeBreak = () => {
    if (curBreak > 0) {
      const id = ids[turn]
      per[id].breaks.push(curBreak)
      if (curBreak > per[id].highestBreak) per[id].highestBreak = curBreak
    }
    curBreak = 0
    breakBalls = []
  }

  const advance = () => {
    closeBreak()
    turn = (turn + 1) % n
  }

  // Once the last red is down and the colour after it has been dealt with,
  // the frame moves into the yellow-to-black clearance.
  const maybeEnterClearance = () => {
    if (!inClearance && redsPotted >= redsCount) {
      inClearance = true
      clearanceIndex = 0
    }
  }

  for (const ev of game.events) {
    const strikerIdx = ids.indexOf(ev.playerId)

    if (typeof lastTs === 'number' && typeof ev.ts === 'number' && ev.ts > lastTs) {
      per[ids[turn]].timeAtTable += Math.min(ev.ts - lastTs, TIME_PER_SHOT_CAP)
    }
    lastTs = ev.ts

    if (ev.type === 'switch') {
      closeBreak()
      if (strikerIdx >= 0) turn = strikerIdx
      continue
    }

    if (ev.type === 'adjust') {
      if (per[ev.playerId]) per[ev.playerId].score += ev.delta
      continue
    }

    // Events carry their striker, so a desync can never misattribute points.
    if (strikerIdx >= 0 && strikerIdx !== turn) {
      closeBreak()
      turn = strikerIdx
    }
    const pid = ids[turn]
    if (!per[pid]) continue

    if (ev.type === 'pot') {
      const ball = BALL_BY_ID[ev.ball]
      if (!ball) continue
      per[pid].score += ball.value
      per[pid].pointsFromBalls += ball.value
      per[pid].pots += 1
      per[pid].shots += 1
      per[pid].ballCounts[ball.id] = (per[pid].ballCounts[ball.id] || 0) + 1
      curBreak += ball.value
      breakBalls.push(ball.id)

      if (inClearance) {
        clearanceIndex = Math.min(clearanceIndex + 1, COLOURS.length)
      } else if (ball.id === 'red') {
        redsPotted += 1
        expect = 'colour'
      } else {
        expect = 'red'
        maybeEnterClearance()
      }
      continue
    }

    if (ev.type === 'foul') {
      per[pid].fouls += 1
      per[pid].shots += 1
      per[pid].pointsConceded += ev.value
      if (ev.rule === 'deduct') {
        per[pid].score -= ev.value
      } else {
        for (const b of ev.beneficiaries || []) {
          if (!per[b]) continue
          per[b].score += ev.value
          per[b].pointsFromFouls += ev.value
        }
      }
      if (expect === 'colour') maybeEnterClearance()
      expect = 'red'
      advance()
      continue
    }

    if (ev.type === 'miss' || ev.type === 'safe') {
      per[pid][ev.type === 'miss' ? 'misses' : 'safes'] += 1
      per[pid].shots += 1
      if (expect === 'colour') maybeEnterClearance()
      expect = 'red'
      advance()
      continue
    }
  }

  const currentPlayerId = ids[turn]
  // The break in progress counts too. It is real, it just is not over yet.
  if (curBreak > 0 && per[currentPlayerId]) {
    per[currentPlayerId].breaks.push(curBreak)
    if (curBreak > per[currentPlayerId].highestBreak) {
      per[currentPlayerId].highestBreak = curBreak
    }
  }

  const redsRemaining = Math.max(0, redsCount - redsPotted)
  const coloursRemaining = inClearance ? COLOURS.slice(clearanceIndex) : COLOURS

  let pointsRemaining
  if (inClearance) {
    pointsRemaining = coloursRemaining.reduce((s, b) => s + b.value, 0)
  } else {
    // Each remaining red can be followed by a black, then the full clearance.
    pointsRemaining = redsRemaining * 8 + CLEARANCE_TOTAL + (expect === 'colour' ? 7 : 0)
  }

  let nextLegal
  if (!strict) nextLegal = BALLS.map((b) => b.id)
  else if (inClearance) nextLegal = coloursRemaining.length ? [coloursRemaining[0].id] : []
  else if (expect === 'colour') nextLegal = COLOURS.map((b) => b.id)
  else nextLegal = ['red']

  const standings = ids
    .map((id) => ({ id, score: per[id].score }))
    .sort((a, b) => b.score - a.score)
  const leaderId = standings.length ? standings[0].id : null
  const gap = standings.length > 1 ? standings[0].score - standings[1].score : 0
  const behind = standings.length ? standings[0].score - (per[currentPlayerId]?.score ?? 0) : 0
  const snookersRequired =
    strict && behind > pointsRemaining ? Math.ceil((behind - pointsRemaining) / 4) : 0

  return {
    per,
    turn,
    currentPlayerId,
    currentBreak: curBreak,
    breakBalls,
    redsCount,
    redsPotted,
    redsRemaining,
    inClearance,
    clearanceIndex,
    coloursRemaining,
    expect,
    nextLegal,
    pointsRemaining,
    standings,
    leaderId,
    gap,
    snookersRequired,
    frameComplete: strict && inClearance && clearanceIndex >= COLOURS.length,
    targetReached:
      game.settings.targetScore != null &&
      standings.length > 0 &&
      standings[0].score >= game.settings.targetScore,
  }
}

/** Build an event ready to be appended to a game. */
export function makeEvent(type, payload) {
  return { id: uid('e'), ts: Date.now(), type, ...payload }
}

/** One-line description for a timeline row. */
export function describeEvent(ev, game) {
  const name = game.players.find((p) => p.id === ev.playerId)?.name ?? 'Player'
  switch (ev.type) {
    case 'pot':
      return name + ' potted the ' + (BALL_BY_ID[ev.ball]?.label.toLowerCase() ?? 'ball')
    case 'foul':
      return name + ' fouled'
    case 'miss':
      return name + ' missed'
    case 'safe':
      return name + ' played safe'
    case 'switch':
      return name + ' came to the table'
    case 'adjust':
      return name + ' adjusted by ' + (ev.delta > 0 ? '+' : '') + ev.delta
    default:
      return name
  }
}

export const BREAK_MILESTONES = [
  { at: 147, label: 'A maximum break' },
  { at: 100, label: 'Century break' },
  { at: 50, label: 'Half century' },
  { at: 30, label: 'Thirty up' },
  { at: 20, label: 'Twenty up' },
]

export function milestoneFor(before, after) {
  return BREAK_MILESTONES.find((m) => before < m.at && after >= m.at) || null
}
