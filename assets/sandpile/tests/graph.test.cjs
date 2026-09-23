const assert = require('node:assert/strict');
const test = require('node:test');
const Graph = require('../sandpile-graph.js');
const Sandpile = require('../sandpile-model.js');
const View = require('../sandpile-view.js');

function drop(graph, source, index) {
  const from = graph.begin(source, index);
  assert.ok(from);
  const pile = new Sandpile(graph.size); pile.cells.set(from.cells);
  pile.topplings = from.topplings; pile.escaped = from.escaped;
  pile.add(index); pile.stabilize();
  return graph.finish(pile);
}

test('graph branches preserve stable source boards and record labeled directed edges', () => {
  const initial = [0,0,0,0,3,0,0,0,0], target = [0,1,0,1,0,1,0,1,0];
  const graph = new Graph(3, initial, target);
  const result = drop(graph, 0, 4);
  assert.deepEqual(graph.nodes[0].cells, initial);
  assert.equal(Object.isFrozen(graph.nodes[0].cells), true);
  assert.deepEqual(result.node.cells, target);
  assert.equal(result.node.moves, 1); assert.equal(graph.targetNode.id, 1);
  assert.deepEqual(graph.edges, [{from: 0, to: 1, index: 4}]);
  drop(graph, 0, 0);
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.nodes[2].cells[4], 3);
  assert.equal(graph.nodes[2].cells[0], 1);
  assert.equal(graph.nodes[2].moves, 1);
  assert.deepEqual(graph.nodes[1].cells, target);
});

test('different drop orders merge into the same board and repeating an edge adds no duplicates', () => {
  const graph = new Graph(3, Array(9).fill(0), Array(9).fill(3));
  const a = drop(graph, 0, 0).node;
  const ab = drop(graph, a.id, 1).node;
  const b = drop(graph, 0, 1).node;
  const ba = drop(graph, b.id, 0);
  assert.equal(ba.merged, true); assert.equal(ba.node.id, ab.id);
  assert.equal(graph.nodes.length, 4); assert.equal(graph.edges.length, 4);
  assert.equal(graph.current.moves, 2);
  drop(graph, b.id, 0);
  assert.equal(graph.nodes.length, 4); assert.equal(graph.edges.length, 4);
  assert.match(graph.notice, /paths join/);
});

test('cycles merge into existing states without changing the root distance', () => {
  const graph = new Graph(1, [0], [3]);
  for (let i = 0; i < 4; i++) drop(graph, graph.activeId, 0);
  assert.equal(graph.nodes.length, 4); assert.equal(graph.edges.length, 4);
  assert.equal(graph.activeId, 0); assert.equal(graph.current.moves, 0);
  assert.equal(graph.targetNode.moves, 3);
});

test('unfinished cascades cannot become nodes or overwrite the pending branch', () => {
  const graph = new Graph(3, [0,0,0,0,3,0,0,0,0], Array(9).fill(0));
  const original = graph.nodes[0].cells;
  graph.begin(0, 4);
  assert.equal(graph.begin(0, 1), null);
  const pile = new Sandpile(3); pile.cells.set(original); pile.add(4);
  assert.equal(graph.finish(pile), null);
  assert.equal(graph.nodes.length, 1); assert.equal(graph.edges.length, 0);
  pile.stabilize(); assert.ok(graph.finish(pile));
  assert.deepEqual(graph.nodes[0].cells, original);
});

test('zoom keeps the point under the cursor fixed and fit includes all branches', () => {
  const graph = new Graph(3, Array(9).fill(0), Array(9).fill(3));
  for (const cell of [0,1,2,3,4,5]) drop(graph, 0, cell);
  graph.fit(900, 600);
  const anchor = {x: 250, y: 370}, before = graph.fromScreen(anchor, 900, 600);
  graph.zoomAt(1.7, anchor, 900, 600);
  const after = graph.fromScreen(anchor, 900, 600);
  assert.ok(Math.abs(before.x - after.x) < 1e-8 && Math.abs(before.y - after.y) < 1e-8);
  graph.fit(900, 600);
  for (const node of graph.nodes) {
    const p = graph.toScreen(node, 900, 600);
    assert.ok(p.x - 170 * graph.camera.zoom >= 0 && p.x + 170 * graph.camera.zoom <= 900);
    assert.ok(p.y - 140 * graph.camera.zoom >= 126 && p.y + 140 * graph.camera.zoom <= 560);
  }
});

test('target and map cameras share orientation and project every cell consistently', () => {
  const view = new View(5), graph = new Graph(5, Array(25).fill(0), Array(25).fill(1));
  for (const pitch of [View.isometricPitch, Math.PI / 2]) for (const angle of [0, .73, -1.5, Math.PI]) {
    view.pitch = pitch; view.angle = angle;
    const board = graph.boardCamera(view, graph.current, 800, 600);
    const target = View.forBoard(view, 5, 80, 94, 10);
    for (let row = 0; row < 5; row++) for (let col = 0; col < 5; col++) {
      const a = board.point(row + .5, col + .5, 3), b = target.point(row + .5, col + .5, 3);
      assert.ok(Math.abs((a.x - board.origin.x) / board.cellSize - (b.x - target.origin.x) / target.cellSize) < 1e-8);
      assert.ok(Math.abs((a.y - board.origin.y) / board.cellSize - (b.y - target.origin.y) / target.cellSize) < 1e-8);
    }
  }
});

test('a newly discovered shortcut updates an existing target and its descendants', () => {
  const initial = [3,3,3,3], targetPile = new Sandpile(2);
  targetPile.cells.set(initial); targetPile.add(0); targetPile.stabilize();
  const graph = new Graph(2, initial, targetPile.cells);
  let seed = 97;
  for (let move = 0; move < 500 && !graph.targetNode; move++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    drop(graph, graph.activeId, move === 0 ? 1 : Math.floor(seed / 2 ** 32 * 4));
  }
  assert.ok(graph.targetNode.moves > 1);
  const targetId = graph.targetNode.id;
  const descendant = drop(graph, targetId, 2).node;
  drop(graph, 0, 0);
  assert.equal(graph.targetNode.id, targetId);
  assert.equal(graph.targetNode.moves, 1);
  assert.ok(descendant.moves <= 2);
});
