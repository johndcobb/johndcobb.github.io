// Run from assets/sandpile: node --test tests/sandpile.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const Sandpile = require('../sandpile-model.js');

test('four grains go to the four orthogonal neighbors', () => {
  const pile = new Sandpile(3);
  pile.add(4, 4);
  assert.deepEqual(pile.step(), [4]);
  assert.deepEqual([...pile.cells], [0, 1, 0, 1, 0, 1, 0, 1, 0]);
  assert.equal(pile.topplings, 1);
});

test('open corners lose two grains; a one-square board loses all four', () => {
  const corner = new Sandpile(3);
  corner.add(0, 4);
  corner.step();
  assert.equal(corner.escaped, 2);
  assert.equal(corner.grains, 2);
  const single = new Sandpile(1);
  single.add(0, 8);
  single.stabilize();
  assert.equal(single.escaped, 8);
  assert.equal(single.grains, 0);
  assert.equal(single.topplings, 2);
});

test('incoming grains trigger the next wave, not the current wave', () => {
  const pile = new Sandpile(3);
  pile.add(4, 4);
  pile.add(5, 3);
  assert.deepEqual(pile.step(), [4]);
  assert.equal(pile.cells[5], 4);
  assert.deepEqual(pile.step(), [5]);
});

test('parallel waves agree with random sequential legal topplings and conserve grains', () => {
  let seed = 2718;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  for (let trial = 0; trial < 30; trial++) {
    const size = 3 + trial % 5;
    const pile = new Sandpile(size);
    for (let i = 0; i < size * size; i++) pile.add(i, Math.floor(random() * 12));
    const initial = pile.grains;
    const cells = [...pile.cells];
    let escaped = 0, topplings = 0;
    pile.stabilize();
    // Independent reference implementation, choosing a random unstable site.
    while (cells.some(count => count >= 4)) {
      const candidates = cells.map((count, i) => count >= 4 ? i : -1).filter(i => i >= 0);
      const index = candidates[Math.floor(random() * candidates.length)];
      cells[index] -= 4;
      topplings++;
      const row = Math.floor(index / size), col = index % size;
      for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
        const r = row + dr, c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) escaped++;
        else cells[r * size + c]++;
      }
    }
    assert.deepEqual([...pile.cells], cells);
    assert.equal(pile.topplings, topplings);
    assert.equal(pile.escaped, escaped);
    assert.equal(pile.grains + pile.escaped, initial);
    assert.ok(pile.cells.every(count => count >= 0 && count < 4));
  }
});


test('batched waves match one-at-a-time stabilization and retain later arrivals', () => {
  const pile = new Sandpile(5), reference = new Sandpile(5);
  pile.add(0, 100); pile.add(12, 525);
  const sites = pile.unstable(), counts = sites.map(i => Math.floor(pile.cells[i] / 4));
  pile.add(12, 25);
  pile.step(sites, counts);
  assert.equal(pile.cells[12], 26);
  while (pile.unstable().length) {
    const active = pile.unstable(); pile.step(active, active.map(i => Math.floor(pile.cells[i] / 4)));
  }
  reference.add(0, 100); reference.add(12, 550); reference.stabilize();
  assert.deepEqual([...pile.cells], [...reference.cells]);
  assert.equal(pile.escaped, reference.escaped); assert.equal(pile.topplings, reference.topplings);
});
