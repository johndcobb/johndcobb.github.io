const assert = require('node:assert/strict');
const test = require('node:test');
const Solver = require('../sandpile-solver.js');
const Sandpile = require('../sandpile-model.js');

function apply(size, start, path) {
  const pile = new Sandpile(size); pile.cells.set(start);
  for (const square of path) { pile.add(square); pile.stabilize(); }
  return [...pile.cells];
}

// Independent, string-keyed BFS using the production toppling model.
function oracle(size, start, target) {
  const queue = [{cells: start, moves: 0}], seen = new Set([start.join(',')]), key = target.join(',');
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    if (node.cells.join(',') === key) return node.moves;
    for (let square = 0; square < size * size; square++) {
      const cells = apply(size, node.cells, [square]), next = cells.join(',');
      if (!seen.has(next)) { seen.add(next); queue.push({cells, moves: node.moves + 1}); }
    }
  }
  return null;
}

test('packed-state search agrees with independent shortest paths, including unreachable targets', () => {
  let seed = 319;
  const draw = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 30; };
  for (let i = 0; i < 24; i++) {
    const start = Array.from({length: 4}, draw), target = Array.from({length: 4}, draw);
    const path = Solver.shortestPath(2, start, target);
    assert.equal(path?.length ?? null, oracle(2, start, target));
    if (path) assert.deepEqual(apply(2, start, path), target);
  }
  assert.equal(Solver.shortestPath(2, [3,3,3,3], [0,0,0,0]), null);
  assert.deepEqual(Solver.shortestPath(3, Array(9).fill(0), Array(9).fill(0)), []);
});

test('random 3 by 3 identity limits come with attainable solutions under the actual rules', () => {
  const identity = [2,1,2, 1,0,1, 2,1,2];
  let seed = 9703;
  for (let i = 0; i < 16; i++) {
    const start = Array.from({length: 9}, () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed >>> 30; });
    const path = Solver.shortestPath(3, start, identity);
    assert.ok(path.length > 0);
    assert.deepEqual(apply(3, start, path), identity);
  }
  assert.equal(Solver.shortestPath(3, Array(9).fill(0), identity).length, 12);
  assert.equal(Solver.shortestPath(3, [1,1,2, 1,0,1, 2,1,2], identity).length, 1);
  assert.throws(() => Solver.shortestPath(4, Array(16).fill(0), Array(16).fill(1)), RangeError);
  assert.throws(() => Solver.shortestPath(3, Array(9).fill(4), identity), RangeError);
});
