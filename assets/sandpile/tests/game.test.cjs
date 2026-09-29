const assert = require('node:assert/strict');
const test = require('node:test');
const Game = require('../sandpile-game.js');
const Sandpile = require('../sandpile-model.js');
const Solver = require('../sandpile-solver.js');

function board(game) {
  const model = new Sandpile(game.level.size);
  model.cells.set(game.start);
  return model;
}
function add(game, model, index) {
  if (!game.drop(index)) return false;
  model.add(index);
  while (model.unstable().length) {
    const sites = model.unstable();
    model.step(sites); game.recordTopplings(sites);
  }
  game.finish(model);
  return true;
}

test('all three tutorial solutions win and conserve sand including escaped grains', () => {
  const game = new Game();
  for (let level = 0; level < 3; level++) {
    assert.equal(game.load(level), true);
    const model = board(game), initial = model.grains;
    const drops = level === 0 ? 2 : 1;
    for (let i = 0; i < drops; i++) assert.equal(add(game, model, game.level.selected), true);
    assert.equal(game.status, 'won');
    assert.equal(model.grains + model.escaped, initial + drops);
    assert.equal(game.remaining, Infinity);
    assert.equal(add(game, model, game.level.selected), false);
  }
  assert.equal(game.tutorialComplete, true);
});

test('a chain can start at either end or the middle', () => {
  for (const index of [11, 12, 13]) {
    const game = new Game(); game.completed = new Set([0]); game.load(1);
    const model = board(game); add(game, model, index);
    assert.equal(game.status, 'won'); assert.equal(game.toppled.size, 3);
  }
});

test('chain highlights disappear on completion and the edge step needs only a drop', () => {
  const game = new Game({completed: [0]});
  let model = board(game);
  assert.equal(game.hideHighlights, false);
  add(game, model, 12);
  assert.equal(game.status, 'won'); assert.equal(game.hideHighlights, true);
  game.load(1); assert.equal(game.hideHighlights, false);
  game.load(2); model = board(game);
  assert.equal(game.canDrop(24), true);
  assert.equal(add(game, model, 0), true);
  assert.equal(game.status, 'playing');
  assert.equal(add(game, model, 24), true);
  assert.equal(model.escaped, 2); assert.equal(game.status, 'won');
  assert.equal(game.tutorialComplete, true);
});

test('tutorials accept every square and keep playing until their goal is reached', () => {
  const game = new Game({completed: [0,1,2]});
  for (let level = 0; level < 3; level++) {
    game.load(level); const model = board(game), initial = model.grains;
    assert.equal(game.finish(model), false);
    for (let square = 0; square < 25; square++) assert.equal(game.canDrop(square), true);
    assert.equal(game.canDrop(-1), false); assert.equal(game.canDrop(25), false);
    // Spend more than the old budget exploring somewhere other than the highlights.
    for (let i = 0; i < 8; i++) {
      assert.equal(add(game, model, level === 2 ? 12 : 0), true);
      assert.equal(game.status, 'playing');
    }
    const drops = level === 0 ? 2 : 1;
    for (let i = 0; i < drops; i++) assert.equal(add(game, model, game.level.selected), true);
    assert.equal(game.status, 'won');
    assert.equal(model.grains + model.escaped, initial + 8 + drops);
    assert.equal(game.canDrop(0), false);
  }
});

test('the edge tutorial completes when sand escapes from an unhighlighted edge', () => {
  const game = new Game({completed: [0,1]});
  const model = board(game);
  for (let i = 0; i < 4; i++) assert.equal(add(game, model, 1), true);
  assert.equal(model.escaped, 1);
  assert.equal(game.status, 'won');
  assert.equal(game.toppled.has(24), false);
});

test('both pictured targets have two-move solutions and no zero- or one-move solution', () => {
  const game = new Game({completed: [0,1,2]});
  for (const [index, solution] of [[3, [4,4]], [4, [3,8]]]) {
    game.load(index);
    const initial = board(game);
    assert.equal(game.finish(initial), false);
    for (let cell = 0; cell < initial.cells.length; cell++) {
      game.load(index); const model = board(game); add(game, model, cell);
      assert.equal(game.status, 'playing');
    }
    game.load(index); const model = board(game);
    solution.forEach(cell => add(game, model, cell));
    assert.equal(game.status, 'won'); assert.equal(game.best[index], 2);
    assert.deepEqual([...model.cells], game.level.target);
  }
});

test('Avalanche uses exactly one grain and the supplied board has a maximum loss of thirteen', () => {
  const game = new Game({completed: [0,1,2]});
  let maximum = 0, wins = 0;
  for (let index = 0; index < 25; index++) {
    game.load(5); const model = board(game);
    assert.equal(model.grains, 56);
    add(game, model, index); maximum = Math.max(maximum, model.escaped);
    assert.equal(game.status === 'won', model.grains <= 44);
    if (game.status === 'won') wins++;
    assert.equal(game.drop(index), false);
    assert.equal(model.grains + model.escaped, 57);
  }
  assert.equal(maximum, 13); assert.equal(wins, 4); assert.equal(game.best[5], 13);
});

test('all six Avalanches have exact attainable maxima and increasingly selective, longer cascades', () => {
  const game = new Game({completed: [0,1,2]});
  const expected = [
    {index: 8, size: 3, initial: 14, escaped: 3, winners: [0,1,4]},
    {index: 5, size: 5, initial: 56, escaped: 13, winners: [14,18,19,24]},
    {index: 9, size: 6, initial: 81, escaped: 16, winners: [8,9,15]},
    {index: 10, size: 7, initial: 115, escaped: 23, winners: [32,39,40]},
    {index: 11, size: 8, initial: 156, escaped: 32, winners: [35,42,43]},
    {index: 12, size: 9, initial: 195, escaped: 36, winners: [24,25,33]}
  ];
  assert.deepEqual(Game.levelsForCategory('avalanche'), expected.map(level => level.index));
  let previousFraction = 1, previousTopplings = 0, previousEscape = 0;
  for (const {index, size, initial, escaped, winners} of expected) {
    game.load(index);
    const level = game.level, winningTopplings = [], actualWinners = [];
    assert.equal(level.size, size);
    assert.equal(level.start.length, size * size);
    assert.ok(level.start.every(count => Number.isInteger(count) && count >= 0 && count < 4));
    assert.equal(level.budget, 1);
    assert.equal(level.bestEscape, escaped);
    assert.equal(level.maxRemaining, initial + 1 - escaped);
    assert.ok(level.prompt.includes(`${level.bestEscape} grains fall off`));
    let maximum = 0;
    for (let cell = 0; cell < size * size; cell++) {
      game.load(index); const model = board(game);
      assert.equal(model.grains, initial);
      assert.equal(game.finish(model), false, 'loading a board cannot complete it');
      assert.equal(add(game, model, cell), true);
      maximum = Math.max(maximum, model.escaped);
      assert.equal(game.status === 'won', winners.includes(cell), `${level.title}, cell ${cell}`);
      assert.equal(game.remaining, 0);
      assert.equal(game.drop(cell), false);
      assert.equal(model.grains + model.escaped, initial + 1);
      assert.equal(model.unstable().length, 0);
      if (game.status === 'won') {
        actualWinners.push(cell); winningTopplings.push(model.topplings);
        assert.match(game.result, /Goal reached/);
      } else {
        assert.ok(game.result.includes(`${model.escaped} of ${level.bestEscape} grains fell off`));
        assert.doesNotMatch(game.result, /Try again/);
      }
    }
    assert.deepEqual(actualWinners, winners);
    assert.equal(maximum, escaped);
    assert.equal(game.best[index], escaped, 'later failed attempts retain the best score');
    // Compare only plausible starting squares (stacks of three), not empty padding.
    const fraction = winners.length / level.start.filter(count => count === 3).length;
    assert.ok(fraction < previousFraction);
    assert.ok(Math.min(...winningTopplings) > previousTopplings);
    assert.ok(escaped > previousEscape);
    previousFraction = fraction; previousTopplings = Math.max(...winningTopplings); previousEscape = escaped;
  }
});

test('the two tipping points have a two-move optimum', () => {
  const game = new Game({completed: [0,1,2]}); game.load(6);
  const model = board(game), initial = model.grains;
  [5,10].forEach(cell => assert.equal(add(game, model, cell), true));
  assert.deepEqual([...model.cells], game.level.target);
  assert.equal(game.status, 'won');
  assert.equal(model.grains - initial, game.moveLimit);
  assert.equal(model.escaped, 0);
});

test('fixed patterns stop accepting grains at their exact move allowance', () => {
  for (const index of [3,4,6]) {
    const game = new Game({completed: [0,1,2]}); game.load(index);
    const model = board(game);
    assert.equal(game.moveLimit, 2);
    assert.equal(add(game, model, 0), true);
    assert.equal(game.remaining, 1);
    assert.equal(add(game, model, 0), true);
    assert.equal(game.remaining, 0);
    assert.equal(add(game, model, 0), false);
  }
});

test('Pattern 3 randomizes stable boards with exact minima between one and six moves', () => {
  const game = new Game({completed: [0,1,2]});
  const identity = [2,1,2, 1,0,1, 2,1,2];
  game.load(7, () => 0);
  assert.equal(game.level.size, 3);
  assert.deepEqual(game.level.target, identity);
  assert.notDeepEqual(game.start, Array(9).fill(0), 'a twelve-move draw is shortened');
  assert.equal(game.moveLimit, 6);
  assert.equal(Solver.shortestPath(3, game.start, identity).length, 6);
  game.load(7, () => .999);
  assert.notDeepEqual(game.start, Array(9).fill(3), 'a thirteen-move draw is shortened');
  assert.equal(game.moveLimit, 6);
  assert.equal(Solver.shortestPath(3, game.start, identity).length, 6);
  let square = 0;
  game.load(7, () => identity[square++] / 4);
  assert.notDeepEqual(game.start, identity, 'the initial draw must not already match');
  assert.equal(game.finish(board(game)), false);
  assert.ok(game.moveLimit > 0 && game.moveLimit < 7);
  let seed = 20260929;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  const starts = new Set();
  for (let draw = 0; draw < 100; draw++) {
    game.load(7, random);
    assert.equal(game.start.length, 9);
    assert.ok(game.start.every(count => Number.isInteger(count) && count >= 0 && count <= 3));
    assert.notDeepEqual(game.start, identity);
    starts.add(game.start.join(','));
    const path = Solver.shortestPath(3, game.start, identity);
    assert.ok(path.length > 0 && path.length < 7);
    assert.equal(game.moveLimit, path.length, 'the displayed allowance is the actual minimum');
    const model = board(game);
    for (const square of path) assert.equal(add(game, model, square), true);
    assert.deepEqual([...model.cells], identity);
    assert.equal(game.status, 'won');
    assert.equal(game.remaining, 0);
    assert.equal(add(game, model, 0), false);
  }
  assert.ok(starts.size > 70, 'shortening retains a varied set of random boards');
});

test('random identity scores and exact move limits belong to the current draw', () => {
  const game = new Game({completed: [0,1,2]});
  const start = [1,1,2, 1,0,1, 2,1,2]; let square = 0;
  game.load(7, () => start[square++] / 4);
  const model = board(game);
  assert.equal(game.moveLimit, 1);
  add(game, model, 0);
  assert.equal(game.status, 'won');
  assert.equal(game.result, 'Matched in 1 move! Perfect: that is the fewest possible.');
  assert.equal(game.best[7], 1);
  assert.equal(game.progress.best[7], undefined);
  assert.ok(game.progress.completed.includes(7));
  game.load(7, () => 0);
  assert.equal(game.best[7], undefined);
  assert.equal(game.status, 'playing');
  assert.equal(game.used, 0);
  assert.equal(game.moveLimit, 6);
});

test('tutorial completion and best scores round trip through saved progress', () => {
  const game = new Game(); assert.equal(game.canLoad(3), false);
  game.completed = new Set([0,1,2]); game.load(3);
  const model = board(game); add(game, model, 4); add(game, model, 4);
  const restored = new Game(JSON.parse(JSON.stringify(game.progress)));
  assert.equal(restored.tutorialComplete, true); assert.equal(restored.completed.has(3), true);
  assert.equal(restored.best[3], 2); assert.equal(restored.canLoad(7), true);
  assert.equal(restored.level.kind, 'avalanche');
  assert.equal(restored.index, 8);
  for (const [index, next] of [[2,8], [8,5], [5,9], [9,10], [10,11], [11,12], [12,3], [3,6], [6,7], [7,4], [4,undefined]]) {
    restored.load(index); assert.equal(restored.nextIndex, next);
  }
});


test('old saved progress retains surviving tutorial steps and category scores', () => {
  const migrated = Game.migrateProgress({completed: [0,1,2,3,4,5,6,7,8,9], best: {5: 2, 6: 3, 7: 13, 8: 15, 9: 43}});
  const game = new Game(migrated);
  assert.equal(game.tutorialComplete, true); assert.equal(game.allComplete, false);
  assert.deepEqual(game.best, {3: 2, 4: 3, 5: 13});
  assert.deepEqual(Game.migrateProgress(game.progress), game.progress);
  const partial = new Game(Game.migrateProgress({completed: [0,1]}));
  assert.equal(partial.index, 1); assert.equal(partial.canLoad(2), false);
});

test('version three progress drops removed levels without completing new patterns', () => {
  const progress = Game.migrateProgress({version: 3, completed: [0,1,2,3,4,5,6,7], best: {3: 2, 4: 2, 5: 13, 6: 15, 7: 43}});
  assert.deepEqual(progress, {version: 6, completed: [0,1,2,3,4,5], best: {3: 2, 4: 2, 5: 13}});
  const game = new Game(progress);
  assert.equal(game.allComplete, false);
  assert.deepEqual(Object.keys(Game.categories), ['tutorial', 'avalanche', 'match']);
  assert.equal(Game.levels.filter(level => level.kind === 'match').length, 4);
});

test('version four saves clear only the replaced identity puzzle and preserve other achievements', () => {
  const progress = {version: 4, completed: Array.from({length: 11}, (_, i) => i), best: {3: 2, 4: 2, 5: 13, 6: 2, 7: 8, 8: 5, 9: 8, 10: 6}};
  const game = new Game(Game.migrateProgress(JSON.parse(JSON.stringify(progress))));
  assert.deepEqual(game.progress, {version: 6, completed: [0,1,2,3,4,5,6], best: {3: 2, 4: 2, 5: 13, 6: 2}});
  assert.equal(game.allComplete, false);
  assert.equal(game.index, 8);
  game.load(5);
  assert.equal(game.visibleLevels.indexOf(game.index), 1);
  assert.equal(game.best[5], 13);
  assert.ok([8,9,10,11,12].every(index => !game.completed.has(index) && game.best[index] === undefined));
  game.load(7, () => 0); const model = board(game);
  Solver.shortestPath(3, game.start, game.level.target).forEach(square => add(game, model, square));
  const restored = new Game(Game.migrateProgress(JSON.parse(JSON.stringify(game.progress))));
  assert.ok(restored.completed.has(7), 'new identity completions survive a reload');
  assert.equal(restored.best[7], undefined);
});


test('version five progress follows surviving boards through removal and reordering', () => {
  const old = {version: 5, completed: Array.from({length: 16}, (_, i) => i), best: {3: 2, 4: 2, 5: 13, 6: 2, 7: 8, 9: 8, 10: 6, 11: 3, 12: 16, 13: 23, 14: 32, 15: 36}};
  const game = new Game(Game.migrateProgress(old));
  assert.deepEqual(Game.levelsForCategory('match'), [3,6,7,4]);
  assert.deepEqual(game.progress, {version: 6, completed: Array.from({length: 13}, (_, i) => i), best: {3: 2, 4: 2, 5: 13, 6: 2, 8: 3, 9: 16, 10: 23, 11: 32, 12: 36}});
  assert.equal(game.allComplete, true);
  assert.deepEqual(Game.migrateProgress(game.progress), game.progress);
});
