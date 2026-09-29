# Sandpile

A self-contained Abelian sandpile with a freely orbiting camera and an automatic overhead count map for touch screens and desktop browsers. Open `index.html` directly or serve this folder at `/assets/sandpile/`. All runtime assets and tests live here; there are no external libraries, fonts, or build dependencies.

The interface fits an iPad in portrait or landscape, with safe-area spacing and large touch controls. The manifest and Apple web-app metadata request a standalone window when saved to the Home Screen. This is not an offline-cached app; initial loading from a hosted URL requires a connection.

## Files

- `index.html`: app layout and Help dialog.
- `sandpile.css`: responsive layout and styles.
- `sandpile-model.js`: mathematical rules, independent of the UI.
- `sandpile-view.js`: yaw and pitch camera geometry, smooth overhead color blending, and escaping-grain trajectories.
- `sandpile-game.js`: tutorial and category definitions, budgets, target boards, scoring, progress, and win conditions.
- `sandpile-solver.js`: exact breadth-first search for the shortest grain-drop path on boards up to 3 × 3.
- `sandpile-graph.js`: immutable stable-state nodes, labeled drop edges, exact-state merging, shortest paths, and map camera geometry.
- `sandpile-versus.js`: alternating turns, pile ownership, captures, and elimination rules.
- `sandpile.js`: rendering, input, animation, and switching between independent mode states.
- `icon.svg` and `manifest.webmanifest`: app identity and Home Screen launch settings.
- `tests/*.test.cjs`: mathematical, geometry, and interaction regression tests using Node's built-in test runner.

## Welcome screen and participant reset

Every page load opens an exhibit-style welcome screen with “Sandpiles,” “A game about toppling sand,” and “Tap anywhere to begin.” The softly transparent rotating board sits below the text and begins with several settled heaps, showing gaps and stacks of different heights. Single grains fall into a live 13 × 13 sandpile and trigger cascading topplings. Tap anywhere (or activate the welcome button with a keyboard) to open tutorial step one in **Play levels**, the default mode. The demonstration has its own board and cannot add grains to any playable mode. With reduced motion enabled, the welcome board stays still.

For the next participant, open **? → Next participant…**, then **hold “Hold 3 seconds to reset” for three seconds**. A filling bar shows the hold; releasing early, dragging off the button, cancelling, or leaving the page cancels it. Keyboard users can hold Space or Enter. Finishing the hold clears tutorial completion, completed levels, best scores, all active boards, and settings, then returns to the welcome screen. Keep playing dismisses the confirmation without clearing anything. The facilitator control is inside Help, away from normal game controls, and an ordinary tap cannot trigger the reset.

Reloading the page shows the welcome screen but retains saved achievements; use the protected participant reset to forget them.

## Modes and levels

**Sandbox** starts with the original 19 × 19 center pile, adjustable drop sizes, continuous pouring, speed, and reset controls. **Board setup** offers 3, 5, 9, 19, 31, 51, or 101 squares per side and a Random, Blank, or Center pile start. Random independently fills each square with 0–3 grains; Blank leaves all squares empty. **Start new board** applies both choices, cancels pending drops and reactions, resets counters, selects the center, and fits the new board at 100% zoom. Cancel leaves the current board intact. Reset repeats the selected starting type (generating a fresh random board); Clear empties the current size. The size and starting type remain selected across mode switches for the page session. The facilitator reset restores the original 19 × 19 center pile. **Play levels** opens the tutorial after the welcome screen. During a level, the top bar shows only a short level title, a small **← Levels** button, and Help. A clear goal sits above the board; result feedback appears there after an attempt. Repeated instructions and camera hints are absent from the bottom of the play area. **← Levels** opens a separate category/level menu; browsing categories leaves the current attempt intact, and Continue level returns to it. Choosing a level loads that starting configuration. The menu also offers Versus and Sandbox. Completing all three tutorial steps checks off Tutorial and unlocks Avalanche and Match the Pattern, in that order. The first tutorial step starts in isometric view with two grains in the center. Tutorial highlights are guides: players may add sand to any square without a grain limit. A step completes after the board settles with its objective met: topple the outlined center, topple all three outlined stacks, or send sand off any edge. Exploratory drops never force a retry. Tutorial, Match the Pattern, and Avalanche inputs add one grain per move.

| Category | Levels | Goal |
| --- | --- | --- |
| Tutorial | Tipping point, chain reaction, over the edge | Learn the toppling rules in three short steps. Chain-reaction outlines disappear after completion; the edge step demonstrates falling grains with no prediction. |
| Avalanche | Six boards in increasing difficulty: 3 × 3, the original 5 × 5, then 6 × 6, 7 × 7, 8 × 8, and 9 × 9 | Add exactly one grain and trigger the maximum possible loss. Each board states how many grains must fall off; the result reports the number that fell off against that target. |
| Match the Pattern | Four boards, in order: Four neighbors (3 × 3), Two tipping points (4 × 4), Find the identity (random 3 × 3), and Find the two drops (5 × 5) | Match the target within its shortest-path move allowance. A prominent counter above the board shows the selected branch’s remaining moves and total allowance. Earlier boards stay available for trying another route. |

The target uses the same 3D renderer and orientation as every board; it turns and tilts with the board camera, with numbers and count colors visible overhead. Choosing a level from the menu or using Start over cancels the current game attempt and loads the specified starting configuration. Win conditions are evaluated only after all drops, toppling waves, and escaping particles settle. Tutorial completion, completed levels, and best scores are stored in localStorage under `sandpile-progress-v2`; unavailable storage falls back to the current session. Saved progress from the older five-step tutorial is migrated to the surviving levels, preserving challenge scores. Progress schema version 6 migrates older saves by board identity, preserving tutorial, Avalanche, and surviving pattern achievements while discarding removed levels. The former Patterns 4, 6, and 7 are removed; the surviving patterns are ordered as former 1, 3, 5, and 2. Saves predating the random identity puzzle also discard the replaced 5 × 5 identity achievement.

Avalanche starts with a small, lightly filled board. The supplied challenge is now Avalanche 2 with its starting board, target, and saved score unchanged. Later levels expand the search area, reduce the proportion of winning placements among stacks of three, and require longer cascades; several tempting drops spill sand but miss the maximum. Difficulty is a design estimate to refine through playtesting. All five additions start incomplete in existing saves. Display order is separate from saved level indices, and completing Avalanche 6 leads to Match the Pattern 1.

Switching between Sandbox and Play levels pauses the outgoing simulation and restores the incoming mode's exact pile, counters, selected square, camera angle, tilt, top-down lock, zoom, speed, and drop size. Pending drops, toppling waves, and escaping particles resume when that mode is revisited. Holding the Drop button stops at a mode switch. Active board states are kept for the current page session; completed levels and best scores survive a reload when storage is available.

Match the Pattern 3 targets the 3 × 3 identity, with rows `2,1,2 / 1,0,1 / 2,1,2`. Each load or **New board** generates a random stable board whose shortest solution takes 1–6 moves. It first samples 0–3 grains per square, adjusts an already-solved draw, and finds the exact shortest path. If that path exceeds six moves, it advances along the path to a stable board six moves from the target. This guarantees a short, nonempty solution without repeated random retries. Switching modes or browsing the menu preserves the current draw and its state graph. New board clears that graph and any pending drops. Best move counts apply only to the current draw and reset with a new board; completion is still remembered. Its move allowance comes from exact breadth-first search over the at most 4⁹ stable states; a suffix of a shortest path is also shortest. The three fixed puzzles each allow two moves.

## First-use introductions

Tutorial opens directly without a popup. Avalanche, Match the Pattern, Versus, and Sandbox each show a short modal introduction on first entry. Browsing the category menu alone does not trigger it. Got it, the close button, Escape, or a click outside the box dismisses it without changing the board. The box traps focus while open and blocks board input; dismissal returns focus to the canvas. Help offers a button to show the current game type’s introduction again, except during Tutorial. The Avalanche introduction explains the goal of spilling as much sand as possible; its numerical target stays above the board. Match the Pattern explains matching the target, playing on previous states, and using as few grains as possible.

Dismissed introductions are remembered separately under `sandpile-intros-v1`, with session-only memory if browser storage is unavailable. Reloading, retrying, or choosing another level in the same category does not repeat a dismissed introduction. Existing achievements are unaffected. The facilitator’s Next participant reset clears introduction history along with progress, so the next visitor sees the explanations again.

## Match the Pattern: state map

Each grain creates a branch from a stable board. The source remains unchanged while a new copy receives the grain, topples in red, and settles into a new state. Only settled boards become graph nodes; the temporary animated copy is labeled Settling. Finish that cascade before making another drop. Directed arrows label each move with its one-based row and column, such as `+1 (2,3)`.

Tap a square on a visible board to branch from it, including older boards, provided its shortest discovered distance from Start is below the move allowance. Boards at the allowance cannot accept another grain via touch, mouse, keyboard, or the Drop button. Selecting one shows zero moves left and directs the player to an earlier board; it does not discard the graph or force a restart. Drag inside a board’s box to rotate all boards together; drag outside the boxes to pan the map. Use the mouse wheel or pinch to zoom at the pointer, and tap the zoom percentage to fit the entire graph. Tapping a board’s blank margin focuses it. At overview scale, the first tap zooms into a board without dropping a grain. The target always shares the boards’ orientation. Keyboard users can focus the canvas and use [ / ] to choose a board, arrows to select a square, and Space/Enter to branch. State captions, a state dropdown, separate map controls, and aggregate grain/toppling/escape counters are omitted in this mode.

Stable states are equal when every square has the same grain count in the same board coordinates. Equal states merge into one node, so different paths can join or form cycles. Repeating the same drop from the same source reuses its edge. Each board’s move count is the shortest discovered route from Start; new connections recalculate those distances, including previously found targets. Best scores count moves along that route, not all exploratory clicks. Finding the target unlocks the next level while allowing further exploration from boards below the move limit. A discovered shortcut can reduce a board’s distance and restore its remaining allowance. Only moves on that route consume the allowance, so trying another branch does not spend a shared pool of moves.

Mode switches pause and preserve the whole graph, including a pending cascade, map pan/zoom, board orientation, and selected state. Choosing a level, Start over, or the facilitator reset discards its graph. Graphs last for the current page session; completion and best scores retain the existing device-storage behavior.

## Versus

Choose **Versus** for a local two-player match on an empty 3 × 3 board. Red starts; players alternate adding exactly one grain to an empty square or a pile of their own color. An illegal move does not use a turn. Each turn waits for all falling grains and topplings to finish, so extra taps and holding the Drop button cannot add extra grains.

A pile of four or more sends one grain to each orthogonal neighbor per topple. Incoming grains add to the existing count and convert the entire receiving pile to the mover’s color; captured piles carry that color through further topplings. The threshold remains four even on edges and corners, and grains outside the board are lost. After both players have made their opening move, a settled board with only one color declares that player the winner. This opening exception prevents the first red grain from winning immediately.

Red and blue colors appear on stacks, incoming grains, and escaping grains in every camera angle. Overhead shades and numbers show the count; gold outlines identify active topplings without changing a blue pile to red. The panel shows whose turn it is and each player’s grain total. **New match** (or **Play again** after a win) starts a fresh board with Red to move. Switching modes preserves the entire match, including an unfinished cascade and its camera. The facilitator’s participant reset clears the match as well as level progress and sandbox state.

### Instructor notes

The four pattern puzzles use one-based row/column coordinates:

- Pattern 1, 3 × 3: two grains at the center, for two moves.
- Pattern 2, 4 × 4: one grain each at (2,2) and (3,3), for two moves.
- Pattern 3, random 3 × 3: the recurrent sandpile identity is `2,1,2 / 1,0,1 / 2,1,2`. Every stable starting board is solvable: filling to `6,6,6 / 6,4,6 / 6,6,6` and stabilizing produces the identity. The generator uses an exact shortest path to keep the playable starting board within 1–6 moves of the identity. Harder raw draws, including the empty and all-threes boards, are advanced toward the target before play starts.
- Pattern 4, 5 × 5: one grain at (1,4) and one at (2,4), in either order, for two moves. Exhaustive one-move checks establish minimality for this puzzle and Pattern 1. Pattern 2’s minimum follows from its net increase of two grains, attained without loss.

The Avalanche solutions below use one-based row/column coordinates. Every listed placement achieves the maximum loss with exactly one grain; all other placements fall short. Tests exhaustively check all 264 placements across the six boards, including conservation, single-grain budgets, retry targets, and saved scores.

| Level | Board | Starting grains | Maximum escaped | Remaining target | Optimal placements |
| --- | --- | --- | --- | --- | --- |
| 1 · A little nudge | 3 × 3 | 14 | 3 | 12 | (1,1), (1,2), (2,2) |
| 2 · One grain, big avalanche (original) | 5 × 5 | 56 | 13 | 44 | (3,5), (4,4), (4,5), (5,5) |
| 3 · Find the opening | 6 × 6 | 81 | 16 | 66 | (2,3), (2,4), (3,4) |
| 4 · The hidden connection | 7 × 7 | 115 | 23 | 93 | (5,5), (6,5), (6,6) |
| 5 · Across the board | 8 × 8 | 156 | 32 | 125 | (5,4), (6,3), (6,4) |
| 6 · The long cascade | 9 × 9 | 195 | 36 | 160 | (3,7), (3,8), (4,7) |

## Checks

Run from this folder:

```sh
node --test tests/*.test.cjs
```

Every grid size topples at four grains, transferring one to each orthogonal neighbor. Grains crossing an open edge leave the board. Animation uses parallel waves. Each wave captures the legal toppling counts at its start, so large stacks can perform several topplings together; incoming grains cannot join an already animated wave. Reset repeats the selected starting type and Clear empties the board; both cancel pending drops and reset the counters.

Choose 1, 5, 10, 25, 50, or 100 grains per drop. Tap to add that batch, or hold the Drop button to pour repeatedly (after a 350 ms hold delay, every 160 ms). Each batch captures its target and size at input time, arrives after a short 180 ms flight independent of the animation-speed setting, and can land during an avalanche. Release, cancellation, loss of focus, opening Help, Reset, or Clear stops a held pour. Tall stacks are visually capped at eight blocks with exact count labels.

Drag horizontally to orbit and vertically to tilt. Rotation around the table is unrestricted; tilt is limited to 5°–90°, from just above the table to straight overhead, so the table cannot turn upside down. The curved arrow buttons (or Q/E while the board has keyboard focus) turn by 90 degrees; W/S tilt by 15 degrees. The view buttons are grouped with rotation and zoom inside the board window. Top down aligns the square with the screen and locks tilt overhead while allowing rotation; Isometric unlocks tilt and moves to the isometric angle. W/S cannot break the top-down lock. The angle button resets the orientation while respecting the lock (an aligned square grid overhead, or the original isometric angle). Rotation and tilt preserve the board’s scale; only explicit zoom, viewport resizing, or board-size changes affect it. Camera changes leave the model and square identities intact. A drag, cancelled pointer gesture, or multitouch gesture does not add a grain.

Grains sent outside the grid get animated blocks that arc outward, accelerate downward, and fade below the board. These visual particles do not re-enter the simulation or increment counters twice. Large outgoing batches use representative particles (up to eight per outgoing edge per wave, up to 512 in flight) to keep drawing responsive; model counters still include every grain. The camera projects them in world coordinates, with the board hiding grains falling behind it. Reduced-motion mode skips falling particles and animates button-driven camera changes instantly. Reset and Clear also remove particles still in flight.

Grain-count colors and numbers fade in as the camera approaches an overhead angle, starting at 65° elevation and reaching full opacity at 90°. They fade out again when tilting back toward a lower angle. The board uses one continuous orthographic projection throughout, so there is no separate flat rendering mode or jump in cell positions. Stable counts 0–3 have distinct shades; unstable shades darken with increasing counts. The color key follows the same fade. Toppling, falling grains, hit testing, game outlines, and selection share the camera transform. Visible block faces are drawn in depth order. Camera pitch and any in-progress camera movement are saved independently for game and sandbox.

Scroll over the board to zoom between 50% and 300%. The wheel handler accepts pixel, line, and page deltas and prevents page scrolling over the canvas. The − and + buttons provide touch-accessible zoom, and tapping the percentage restores 100%. Zoom changes only the projection; picking uses the rendered faces at the same scale.
