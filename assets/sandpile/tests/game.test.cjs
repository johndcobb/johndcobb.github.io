const assert = require('node:assert/strict');
const test = require('node:test');
const Game = require('../sandpile-game.js');
const Sandpile = require('../sandpile-model.js');

function board(game) {
  const model = new Sandpile(game.level.size);
  if (game.level.start) model.cells.set(game.level.start);
  else game.level.seeds.forEach(([index, count]) => model.add(index, count));
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
    assert.equal(game.remaining, 0);
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
  assert.equal(add(game, model, 0), false);
  assert.equal(add(game, model, 24), true);
  assert.equal(model.escaped, 2); assert.equal(game.status, 'won');
  assert.equal(game.tutorialComplete, true);
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

test('Mountain accepts one center batch and evaluates only its stable result', () => {
  const game = new Game({completed: [0,1,2]});
  for (const index of [6,7]) {
    for (const delta of [-1, 0, 1]) {
      game.load(index); const model = board(game), count = game.level.maxSafe + delta;
      assert.equal(game.finish(model), false);
      assert.equal(game.drop(0), false);
      assert.equal(game.drop(game.level.selected), false);
      for (const invalid of [0, -1, 1.5, NaN, Infinity, 10001]) assert.equal(game.submitMountain(invalid), false);
      assert.equal(game.used, 0);
      assert.equal(game.submitMountain(count), true);
      assert.equal(game.submitMountain(count), false);
      assert.equal(game.finish(model), false, 'incoming batch has not landed');
      model.add(game.level.selected, count);
      assert.equal(game.finish(model), false, 'pile is still unstable');
      model.stabilize(); assert.equal(game.finish(model), true);
      assert.equal(model.grains + model.escaped, count);
      assert.equal(game.status, delta === 0 ? 'won' : 'retry');
      assert.equal(model.escaped > 0, delta > 0);
      assert.equal(game.best[index], game.level.maxSafe + Math.min(delta, 0));
    }
  }
});

test('tutorial completion and best scores round trip through saved progress', () => {
  const game = new Game(); assert.equal(game.canLoad(3), false);
  game.completed = new Set([0,1,2]); game.load(3);
  const model = board(game); add(game, model, 4); add(game, model, 4);
  const restored = new Game(JSON.parse(JSON.stringify(game.progress)));
  assert.equal(restored.tutorialComplete, true); assert.equal(restored.completed.has(3), true);
  assert.equal(restored.best[3], 2); assert.equal(restored.canLoad(7), true);
  assert.equal(restored.level.kind, 'avalanche');
  for (const [index, next] of [[2,5], [5,3], [3,4], [4,6], [6,7], [7,undefined]]) {
    restored.load(index); assert.equal(restored.nextIndex, next);
  }
});


test('old saved progress retains surviving tutorial steps and category scores', () => {
  const migrated = Game.migrateProgress({completed: [0,1,2,3,4,5,6,7,8,9], best: {5: 2, 6: 3, 7: 13, 8: 15, 9: 43}});
  const game = new Game(migrated);
  assert.equal(game.tutorialComplete, true); assert.equal(game.allComplete, true);
  assert.deepEqual(game.best, {3: 2, 4: 3, 5: 13, 6: 15, 7: 43});
  assert.deepEqual(Game.migrateProgress(game.progress), game.progress);
  const partial = new Game(Game.migrateProgress({completed: [0,1]}));
  assert.equal(partial.index, 1); assert.equal(partial.canLoad(2), false);
});
