const assert = require('node:assert/strict');
const test = require('node:test');
const Sandpile = require('../sandpile-model.js');
const Versus = require('../sandpile-versus.js');

function play(game, index) {
  assert.equal(game.begin(index), true);
  game.land();
  while (game.model.unstable().length) {
    const sites = game.model.unstable();
    assert.ok(sites.every(index => game.owners[index] === game.turn));
    game.step(sites, sites.map(index => Math.floor(game.model.cells[index] / 4)));
  }
  assert.equal(game.finish(), true);
}

test('Versus alternates single grains, protects enemy piles, and permits both opening moves', () => {
  const game = new Versus(new Sandpile(4));
  assert.equal(game.begin(0), true);
  assert.equal(game.begin(1), false);
  assert.equal(game.finish(), false);
  game.land(); game.finish();
  assert.equal(game.winner, 0);
  assert.equal(game.turn, 2);
  assert.equal(game.begin(0), false);
  assert.equal(game.moves, 1);
  assert.equal(game.model.cells[0], 1);
  for (const invalid of [-1, 16, 1.5, NaN]) assert.equal(game.begin(invalid), false);
  play(game, 15);
  assert.equal(game.winner, 0);
  assert.equal(game.turn, 1);
  play(game, 0);
  assert.equal(game.model.cells[0], 2);
  assert.equal(game.owners[0], 1);
  assert.equal(game.owners[15], 2);
});

test('capture adds a grain, converts an enemy pile, and propagates its color through the next topple', () => {
  const game = new Versus(new Sandpile(4));
  for (const index of [0,1,0,1,0,1]) play(game, index);
  assert.equal(game.begin(0), true); game.land();
  game.step([0], [1]);
  assert.equal(game.model.cells[1], 4);
  assert.equal(game.owners[1], 1);
  assert.equal(game.owners[0], 0);
  assert.equal(game.model.escaped, 2);
  assert.equal(game.finish(), false, 'unstable board cannot declare victory');
  assert.equal(game.begin(4), false, 'no extra drop during cascade');
  game.step([1], [1]); game.finish();
  assert.equal(game.winner, 1);
  assert.equal(game.model.escaped, 3);
  assert.equal(game.model.grains, 4);
  assert.equal(game.model.grains + game.model.escaped, game.moves);
  assert.equal(game.owners[1], 0);
  assert.ok(game.owners.every(owner => owner === 0 || owner === 1));
  assert.equal(game.begin(15), false);
});

test('Blue can win by capturing every red pile and empty cells lose their owner', () => {
  const game = new Versus(new Sandpile(4));
  for (const index of [1,0,1,0,1,0,4,0]) play(game, index);
  assert.equal(game.winner, 2);
  assert.ok(game.owners.every(owner => owner === 0 || owner === 2));
  game.model.cells.forEach((count, index) => assert.equal(game.owners[index] === 0, count === 0));
});

test('legal randomized matches preserve ordinary sandpile math and ownership invariants', () => {
  let seed = 837;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }
  for (let match = 0; match < 20; match++) {
    const game = new Versus(new Sandpile(4)), reference = new Sandpile(4);
    for (let move = 0; move < 100 && !game.winner; move++) {
      const allowed = Array.from({length: 16}, (_, index) => index).filter(index => game.canDrop(index));
      assert.ok(allowed.length);
      const index = allowed[Math.floor(random() * allowed.length)];
      reference.add(index); reference.stabilize(); play(game, index);
      assert.deepEqual([...game.model.cells], [...reference.cells]);
      assert.equal(game.model.escaped, reference.escaped);
      assert.equal(game.model.grains + game.model.escaped, game.moves);
      game.model.cells.forEach((count, cell) => assert.equal(game.owners[cell] === 0, count === 0));
    }
  }
});
