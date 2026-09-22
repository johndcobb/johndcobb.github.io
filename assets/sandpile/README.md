# Sandpile

A self-contained Abelian sandpile with a freely orbiting camera and an automatic overhead count map for touch screens and desktop browsers. Open `index.html` directly or serve this folder at `/assets/sandpile/`. All runtime assets and tests live here; there are no external libraries, fonts, or build dependencies.

The interface fits an iPad in portrait or landscape, with safe-area spacing and large touch controls. The manifest and Apple web-app metadata request a standalone window when saved to the Home Screen. This is not an offline-cached app; initial loading from a hosted URL requires a connection.

## Files

- `index.html`: app layout and Help dialog.
- `sandpile.css`: responsive layout and styles.
- `sandpile-model.js`: mathematical rules, independent of the UI.
- `sandpile-view.js`: yaw and pitch camera geometry, smooth overhead color blending, and escaping-grain trajectories.
- `sandpile-game.js`: tutorial and category definitions, budgets, target boards, scoring, progress, and win conditions.
- `sandpile-versus.js`: alternating turns, pile ownership, captures, and elimination rules.
- `sandpile.js`: rendering, input, animation, and switching between independent mode states.
- `icon.svg` and `manifest.webmanifest`: app identity and Home Screen launch settings.
- `tests/*.test.cjs`: mathematical, geometry, and interaction regression tests using Node's built-in test runner.

## Welcome screen and participant reset

Every page load opens an exhibit-style welcome screen with “Sandpiles,” “A game about toppling sand,” and “Tap anywhere to begin.” The softly transparent rotating board sits below the text and begins with several settled heaps, showing gaps and stacks of different heights. Single grains fall into a live 13 × 13 sandpile and trigger cascading topplings. Tap anywhere (or activate the welcome button with a keyboard) to open tutorial step one in **Play levels**, the default mode. The demonstration has its own board and cannot add grains to any playable mode. With reduced motion enabled, the welcome board stays still.

For the next participant, open **? → Next participant…**, then **hold “Hold 3 seconds to reset” for three seconds**. A filling bar shows the hold; releasing early, dragging off the button, cancelling, or leaving the page cancels it. Keyboard users can hold Space or Enter. Finishing the hold clears tutorial completion, completed levels, best scores, all active boards, and settings, then returns to the welcome screen. Keep playing dismisses the confirmation without clearing anything. The facilitator control is inside Help, away from normal game controls, and an ordinary tap cannot trigger the reset.

Reloading the page shows the welcome screen but retains saved achievements; use the protected participant reset to forget them.

## Modes and levels

**Sandbox** retains the original 19 × 19 board, adjustable drop sizes, continuous pouring, speed, and reset controls. **Play levels** opens the tutorial after the welcome screen. During a level, the top bar shows only a short level title, a small **← Levels** button, and Help. Instructions and feedback sit below the board. **← Levels** opens a separate category/level menu; browsing categories leaves the current attempt intact, and Continue level returns to it. Choosing a level loads that starting configuration. The menu also offers Versus and Sandbox. Completing all three tutorial steps checks off Tutorial and unlocks Match the Pattern, Avalanche, and Mountain. The first tutorial step starts in isometric view with two grains in the center and two more available to trigger its first topple. Game inputs add one grain per move.

| Category | Levels | Goal |
| --- | --- | --- |
| Tutorial | Tipping point, chain reaction, over the edge | Learn the toppling rules in three short steps. Chain-reaction outlines disappear after completion; the edge step demonstrates falling grains with no prediction. |
| Match the Pattern | A 3 × 3 board starting with two grains in the center; the supplied 5 × 5 starting board | Match the numbered target in as few moves as possible. Both targets can be reached in two moves. Any exact match completes the level; retry to improve the best move count. |
| Avalanche | The supplied 5 × 5 board, initially 56 grains | Add exactly one grain and leave at most 44 grains. The maximum possible loss is 13 grains. |
| Mountain | Empty 3 × 3 and 5 × 5 boards | Add grains only at the center and choose Stop here at the largest pile that loses no sand. Early stops and spills offer a retry. |

The target appears beside the interactive board as a numbered color grid. Choosing a level from the menu or using Start over cancels the current game attempt and loads the specified starting configuration. Win conditions and Stop here are evaluated only after all drops, toppling waves, and escaping particles settle. Tutorial completion, completed levels, and best scores are stored in localStorage under `sandpile-progress-v2`; unavailable storage falls back to the current session. Saved progress from the older five-step tutorial is migrated to the surviving levels, preserving challenge scores.

Switching between Sandbox and Play levels pauses the outgoing simulation and restores the incoming mode's exact pile, counters, selected square, camera angle, tilt, top-down lock, zoom, speed, and drop size. Pending drops, toppling waves, and escaping particles resume when that mode is revisited. Holding the Drop button stops at a mode switch. Active board states are kept for the current page session; completed levels and best scores survive a reload when storage is available.

## Versus

Choose **Versus** for a local two-player match on an empty 4 × 4 board. Red starts; players alternate adding exactly one grain to an empty square or a pile of their own color. An illegal move does not use a turn. Each turn waits for all falling grains and topplings to finish, so extra taps and holding the Drop button cannot add extra grains.

A pile of four or more sends one grain to each orthogonal neighbor per topple. Incoming grains add to the existing count and convert the entire receiving pile to the mover’s color; captured piles carry that color through further topplings. The threshold remains four even on edges and corners, and grains outside the board are lost. After both players have made their opening move, a settled board with only one color declares that player the winner. This opening exception prevents the first red grain from winning immediately.

Red and blue colors appear on stacks, incoming grains, and escaping grains in every camera angle. Overhead shades and numbers show the count; gold outlines identify active topplings without changing a blue pile to red. The panel shows whose turn it is and each player’s grain total. **New match** (or **Play again** after a win) starts a fresh board with Red to move. Switching modes preserves the entire match, including an unfinished cascade and its camera. The facilitator’s participant reset clears the match as well as level progress and sandbox state.

### Instructor notes

The first Match the Pattern solution is two grains at the center. The supplied 5 × 5 target is reached by adding one grain at row 1, column 4 and one at row 2, column 4 (one-based coordinates, in either order). Exhaustive one-move checks establish that each target needs at least two moves.

For Avalanche, optimal placements are row/column (3,5), (4,4), (4,5), or (5,5). Each loses 13 grains and leaves 44. All 25 placements are checked in the tests. For Mountain, the largest safe center-only amounts are 15 on the 3 × 3 board and 43 on the 5 × 5 board; the next grain loses four grains. These thresholds are verified against the actual sandpile rules. The thresholds are not shown to the player before an attempt.

## Checks

Run from this folder:

```sh
node --test tests/*.test.cjs
```

The 19 × 19 grid topples at four grains, transferring one to each orthogonal neighbor. Grains crossing an open edge leave the board. Animation uses parallel waves. Each wave captures the legal toppling counts at its start, so large stacks can perform several topplings together; incoming grains cannot join an already animated wave. Reset restores the prepared pattern and Clear empties the board; both cancel pending drops and reset the counters.

Choose 1, 5, 10, 25, 50, or 100 grains per drop. Tap to add that batch, or hold the Drop button to pour repeatedly (after a 350 ms hold delay, every 160 ms). Each batch captures its target and size at input time, arrives after a short 180 ms flight independent of the animation-speed setting, and can land during an avalanche. Release, cancellation, loss of focus, opening Help, Reset, or Clear stops a held pour. Tall stacks are visually capped at eight blocks with exact count labels.

Drag horizontally to orbit and vertically to tilt. Rotation around the table is unrestricted; tilt is limited to 5°–90°, from just above the table to straight overhead, so the table cannot turn upside down. The curved arrow buttons (or Q/E while the board has keyboard focus) turn by 90 degrees; W/S tilt by 15 degrees. The view buttons are grouped with rotation and zoom inside the board window. Top down locks tilt overhead while allowing rotation; Isometric unlocks tilt and moves to the isometric angle. W/S cannot break the top-down lock. The angle button resets the orientation while respecting the lock (an aligned square grid overhead, or the original isometric angle). Camera changes leave the model and square identities intact. A drag, cancelled pointer gesture, or multitouch gesture does not add a grain.

Grains sent outside the grid get animated blocks that arc outward, accelerate downward, and fade below the board. These visual particles do not re-enter the simulation or increment counters twice. Large outgoing batches use representative particles (up to eight per outgoing edge per wave, up to 512 in flight) to keep drawing responsive; model counters still include every grain. The camera projects them in world coordinates, with the board hiding grains falling behind it. Reduced-motion mode skips falling particles and animates button-driven camera changes instantly. Reset and Clear also remove particles still in flight.

Grain-count colors and numbers fade in as the camera approaches an overhead angle, starting at 65° elevation and reaching full opacity at 90°. They fade out again when tilting back toward a lower angle. The board uses one continuous orthographic projection throughout, so there is no separate flat rendering mode or jump in cell positions. Stable counts 0–3 have distinct shades; unstable shades darken with increasing counts. The color key follows the same fade. Toppling, falling grains, hit testing, game outlines, and selection share the camera transform. Visible block faces are drawn in depth order. Camera pitch and any in-progress camera movement are saved independently for game and sandbox.

Scroll over the board to zoom between 50% and 300%. The wheel handler accepts pixel, line, and page deltas and prevents page scrolling over the canvas. The − and + buttons provide touch-accessible zoom, and tapping the percentage restores 100%. Zoom changes only the projection; picking uses the rendered faces at the same scale.
