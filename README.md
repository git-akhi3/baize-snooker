# Baize

A snooker scoreboard for tables that people share.

Keeping score with three or four players around one table is where snooker breaks down: someone
loses track of whose break it is, nobody remembers what the last foul was worth, and by the end of
the night there is no record of who actually won. Baize fixes that with two taps — **tap the player,
tap the ball** — and keeps the frame history, breaks and leaderboard on your phone.

<!-- Mobile-first. No account, no server, no network. -->

## What it does

**Scoring**

- Tap the ball that went down and the points land on whoever is at the table. Tap another player's
  card to hand the table over.
- The red is a full-width button because it is half of every frame. The six colours sit beneath it,
  in the thumb zone, showing their values.
- Live break counter with the balls in the current visit, plus a callout when a break passes 20, 30,
  50 or 100.
- **Miss**, **Safe**, **Foul** and multi-level **Undo** are one tap each.
- Fouls are worth 4–7 and can be scored three ways: to every opponent (standard), to the next player
  only (a common house rule), or off the offender's own score.

**Two formats**

| | Open table | Full frame |
|---|---|---|
| Rules | Nothing enforced — any ball, any time | Red → colour → yellow-to-black clearance |
| Best for | A group sharing a table casually | A proper frame |
| Extras | Optional target score (first to 30/50/100) | Reds remaining, points remaining, snookers required |

In full-frame mode illegal balls are dimmed and disabled, the frame knows when the last red has gone
and moves into the clearance on its own, and it offers to close the frame when the black goes down.

**Records**

- Every frame is stored shot by shot, so the timeline is an exact account of what happened.
- Frame summaries: winner, margin, top break, potting accuracy, ball-by-ball breakdown, time at the
  table.
- Player profiles: win rate, average score, average visit, top break, ball preferences, form guide,
  current streak, and head-to-head records against everyone else.
- Leaderboard, sortable by wins, win rate, top break or average score.
- Fourteen honours to chase, from *Chalk Up* to *Century Maker*.

**Your data**

Everything is in `localStorage` on the device — nothing is uploaded anywhere. Settings has JSON
export and restore so records survive a new phone or a cleared cache.

## Running it

```bash
npm install
npm run dev
```

Then open the printed URL. `npm run build` produces a static `dist/` that can be hosted anywhere;
routing uses hashes, so it works from a subdirectory with no server config.

## How it is built

React 19 and Vite, with `react-router-dom` for routing. No UI framework, no component library, no CSS
framework — the interface is hand-written CSS driven by custom properties in
[`src/styles/index.css`](src/styles/index.css).

### Event sourcing

The one design decision worth knowing about: **a frame stores only an ordered list of events**, never
a score. Scores, whose turn it is, the current break, reds remaining and points remaining are all
derived by replaying those events through `deriveState()` in
[`src/lib/snooker.js`](src/lib/snooker.js).

That buys three things for free:

- **Undo** is dropping the last event — it rewinds the scores *and* the rule state together, so
  undoing a red correctly puts you back on a red.
- **History** is exact rather than reconstructed.
- Every statistic in the app is computed from the same source, so nothing can drift.

Events carry the player who struck the ball, so a replay can never misattribute points even if
something upstream desynchronises.

```
src/
  lib/snooker.js    ball values, rules, createGame, deriveState  ← the engine
  lib/stats.js      aggregation: player records, leaderboard, head-to-head, honours
  lib/storage.js    versioned localStorage load/save/export/import
  store/AppStore.jsx  reducer + context, persisted on every change
  screens/          Home, NewFrame, Play, Frames, FrameDetail, Ranks, Players, PlayerProfile, Settings
  components/       Icon set, Ball, Avatar, Sheet, Toasts, tiles
```

### Interface

Dark by design: a snooker room after hours. Warm near-black surfaces with a green cast, baize green
and brass for accent, cream for text — no neutral greys. Display type is Instrument Serif, UI type is
Archivo, and every number is tabular so scores do not jitter as they climb.

Mobile-first: a bottom tab bar with a centre action, safe-area insets, 44px minimum tap targets,
haptics on a pot, and a layout that gives room back to the timeline on short handsets. From 880px the
tab bar becomes a left rail. Respects `prefers-reduced-motion`. Installable to the home screen via
the web manifest.
