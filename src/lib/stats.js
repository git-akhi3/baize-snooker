import { deriveState, BALL_BY_ID, BALLS } from './snooker.js'

/** Cheap memo so replaying finished frames doesn't happen on every render. */
const cache = new Map()

export function gameState(game) {
  const key = game.id + ':' + game.events.length + ':' + game.status + ':' + (game.endedAt ?? 0)
  const hit = cache.get(key)
  if (hit) return hit
  const state = deriveState(game)
  if (cache.size > 200) cache.clear()
  cache.set(key, state)
  return state
}

export function finishedGames(games) {
  return games.filter((g) => g.status === 'completed')
}

export function activeGame(games) {
  return games.find((g) => g.status === 'active') || null
}

function emptyStats() {
  return {
    played: 0,
    won: 0,
    lost: 0,
    points: 0,
    pointsAgainst: 0,
    pots: 0,
    shots: 0,
    fouls: 0,
    misses: 0,
    safes: 0,
    breaks: [],
    highestBreak: 0,
    ballCounts: {},
    timeAtTable: 0,
    results: [], // newest first: { gameId, won, score, ts, margin }
    bestFrameScore: 0,
  }
}

/**
 * Aggregate one player's record across every completed frame they appear in.
 */
export function playerStats(playerId, games) {
  const s = emptyStats()
  const done = finishedGames(games)
    .filter((g) => g.players.some((p) => p.id === playerId))
    .sort((a, b) => (b.endedAt || b.createdAt) - (a.endedAt || a.createdAt))

  for (const game of done) {
    const st = gameState(game)
    const mine = st.per[playerId]
    if (!mine) continue
    const best = st.standings[0]
    const others = st.standings.filter((x) => x.id !== playerId)
    const bestOther = others.length ? Math.max(...others.map((o) => o.score)) : 0
    const won = game.winnerId ? game.winnerId === playerId : best?.id === playerId

    s.played += 1
    if (won) s.won += 1
    else s.lost += 1
    s.points += mine.score
    s.pointsAgainst += bestOther
    s.pots += mine.pots
    s.shots += mine.shots
    s.fouls += mine.fouls
    s.misses += mine.misses
    s.safes += mine.safes
    s.timeAtTable += mine.timeAtTable
    s.breaks.push(...mine.breaks)
    if (mine.highestBreak > s.highestBreak) s.highestBreak = mine.highestBreak
    if (mine.score > s.bestFrameScore) s.bestFrameScore = mine.score
    for (const [ball, n] of Object.entries(mine.ballCounts)) {
      s.ballCounts[ball] = (s.ballCounts[ball] || 0) + n
    }
    s.results.push({
      gameId: game.id,
      won,
      score: mine.score,
      opponentBest: bestOther,
      margin: mine.score - bestOther,
      ts: game.endedAt || game.createdAt,
      players: game.players.length,
    })
  }

  s.winRate = s.played ? Math.round((s.won / s.played) * 100) : 0
  s.accuracy = s.shots ? Math.round((s.pots / s.shots) * 100) : 0
  s.avgPoints = s.played ? Math.round(s.points / s.played) : 0
  s.avgBreak = s.breaks.length
    ? Math.round(s.breaks.reduce((a, b) => a + b, 0) / s.breaks.length)
    : 0
  s.streak = currentStreak(s.results)
  s.bestStreak = bestStreak(s.results)
  s.favouriteBall = favouriteBall(s.ballCounts)
  return s
}

function currentStreak(results) {
  if (!results.length) return { type: null, count: 0 }
  const type = results[0].won ? 'W' : 'L'
  let count = 0
  for (const r of results) {
    if ((r.won ? 'W' : 'L') !== type) break
    count += 1
  }
  return { type, count }
}

function bestStreak(results) {
  let best = 0
  let run = 0
  // results are newest first; direction does not matter for a max run
  for (const r of results) {
    if (r.won) {
      run += 1
      if (run > best) best = run
    } else run = 0
  }
  return best
}

function favouriteBall(counts) {
  const entries = Object.entries(counts).filter(([id]) => id !== 'red')
  if (!entries.length) return null
  entries.sort((a, b) => b[1] - a[1])
  return { ball: BALL_BY_ID[entries[0][0]], count: entries[0][1] }
}

export const LEADERBOARD_SORTS = [
  { id: 'wins', label: 'Wins', get: (r) => [r.stats.won, r.stats.winRate, r.stats.highestBreak] },
  {
    id: 'winRate',
    label: 'Win %',
    get: (r) => [r.stats.winRate, r.stats.won, r.stats.highestBreak],
  },
  {
    id: 'break',
    label: 'Break',
    get: (r) => [r.stats.highestBreak, r.stats.won, r.stats.winRate],
  },
  {
    id: 'avg',
    label: 'Avg',
    get: (r) => [r.stats.avgPoints, r.stats.won, r.stats.winRate],
  },
]

export function buildLeaderboard(players, games, sortId = 'wins') {
  const rows = players.map((p) => ({ player: p, stats: playerStats(p.id, games) }))
  const sort = LEADERBOARD_SORTS.find((s) => s.id === sortId) || LEADERBOARD_SORTS[0]
  rows.sort((a, b) => {
    const av = sort.get(a)
    const bv = sort.get(b)
    for (let i = 0; i < av.length; i++) {
      if (bv[i] !== av[i]) return bv[i] - av[i]
    }
    return a.player.name.localeCompare(b.player.name)
  })
  return rows
}

/** Wins and losses between two players across every frame they both played. */
export function headToHead(aId, bId, games) {
  let a = 0
  let b = 0
  let frames = 0
  for (const game of finishedGames(games)) {
    const ids = game.players.map((p) => p.id)
    if (!ids.includes(aId) || !ids.includes(bId)) continue
    const st = gameState(game)
    const as = st.per[aId]?.score ?? 0
    const bs = st.per[bId]?.score ?? 0
    if (as === bs) continue
    frames += 1
    if (as > bs) a += 1
    else b += 1
  }
  return { frames, a, b }
}

export function rivalsFor(playerId, players, games) {
  return players
    .filter((p) => p.id !== playerId)
    .map((p) => ({ player: p, ...headToHead(playerId, p.id, games) }))
    .filter((r) => r.frames > 0)
    .sort((x, y) => y.frames - x.frames)
}

export const ACHIEVEMENTS = [
  {
    id: 'first-frame',
    name: 'Chalk Up',
    detail: 'Play your first frame',
    test: (s) => s.played >= 1,
  },
  { id: 'first-win', name: 'On the Board', detail: 'Win a frame', test: (s) => s.won >= 1 },
  {
    id: 'break-20',
    name: 'Twenty Up',
    detail: 'Put together a break of 20',
    test: (s) => s.highestBreak >= 20,
  },
  {
    id: 'break-50',
    name: 'Half Century',
    detail: 'Put together a break of 50',
    test: (s) => s.highestBreak >= 50,
  },
  {
    id: 'break-100',
    name: 'Century Maker',
    detail: 'Put together a break of 100',
    test: (s) => s.highestBreak >= 100,
  },
  {
    id: 'ton',
    name: 'Ton Up',
    detail: 'Score 100 or more in a single frame',
    test: (s) => s.bestFrameScore >= 100,
  },
  {
    id: 'sharp',
    name: 'Sharpshooter',
    detail: 'Hold a potting accuracy of 70% over 5 frames',
    test: (s) => s.played >= 5 && s.accuracy >= 70,
  },
  {
    id: 'nerve',
    name: 'Nerves of Steel',
    detail: 'Win a frame by 7 points or fewer',
    test: (s) => s.results.some((r) => r.won && r.margin > 0 && r.margin <= 7),
  },
  {
    id: 'runaway',
    name: 'Runaway',
    detail: 'Win a frame by 50 or more',
    test: (s) => s.results.some((r) => r.won && r.margin >= 50),
  },
  {
    id: 'streak-3',
    name: 'On the Run',
    detail: 'Win three frames in a row',
    test: (s) => s.bestStreak >= 3,
  },
  {
    id: 'streak-5',
    name: 'Table Owner',
    detail: 'Win five frames in a row',
    test: (s) => s.bestStreak >= 5,
  },
  {
    id: 'regular',
    name: 'Club Regular',
    detail: 'Play 25 frames',
    test: (s) => s.played >= 25,
  },
  {
    id: 'crowd',
    name: 'The More the Merrier',
    detail: 'Win a frame with four or more at the table',
    test: (s) => s.results.some((r) => r.won && r.players >= 4),
  },
  {
    id: 'clean',
    name: 'Clean Hands',
    detail: 'Win a frame without a single foul',
    test: (s, games, playerId) =>
      finishedGames(games).some((g) => {
        const st = gameState(g)
        const mine = st.per[playerId]
        return mine && mine.fouls === 0 && mine.pots > 0 && (g.winnerId ?? st.standings[0]?.id) === playerId
      }),
  },
]

export function achievementsFor(playerId, games, stats) {
  const s = stats || playerStats(playerId, games)
  return ACHIEVEMENTS.map((a) => ({ ...a, earned: !!a.test(s, games, playerId) }))
}

/** Ball-by-ball totals for a chart, always in ball order. */
export function ballBreakdown(counts) {
  const total = Object.values(counts || {}).reduce((a, b) => a + b, 0)
  return BALLS.map((ball) => ({
    ball,
    count: counts?.[ball.id] || 0,
    share: total ? (counts?.[ball.id] || 0) / total : 0,
  }))
}

/** Headline numbers for the home screen. */
export function overview(players, games) {
  const done = finishedGames(games)
  let topBreak = { value: 0, name: null }
  let totalPoints = 0
  for (const g of done) {
    const st = gameState(g)
    for (const p of g.players) {
      const stat = st.per[p.id]
      if (!stat) continue
      totalPoints += stat.score
      if (stat.highestBreak > topBreak.value) {
        topBreak = { value: stat.highestBreak, name: p.name }
      }
    }
  }
  const weekAgo = Date.now() - 7 * 86400000
  return {
    frames: done.length,
    players: players.length,
    topBreak,
    totalPoints,
    thisWeek: done.filter((g) => (g.endedAt || g.createdAt) >= weekAgo).length,
  }
}
