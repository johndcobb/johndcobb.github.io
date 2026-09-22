const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const Sandpile = require('../sandpile-model.js');
const View = require('../sandpile-view.js');
const SandpileGame = require('../sandpile-game.js');
const SandpileVersus = require('../sandpile-versus.js');

// Deterministic animation clock and minimal DOM. Exercise the real controller,
// including pointer picking and particle lifetime, without a browser dependency.
function app(reduced = false, progress = null, start = 'sandbox') {
  const storage = new Map(progress ? [["sandpile-progress-v2", JSON.stringify({version: 3, ...progress})]] : []);
  let clock = 0, callback, view, versus;
  const models = [];
  const currentModel = () => [...models].reverse().find(model => model.size === view.size);
  const poses = [], elements = new Map(), paintedColors = new Set(), strokedColors = new Set();
  const ctx = new Proxy({}, { get: (target, key) => target[key] ?? (() => {}), set: (target, key, value) => { if (key === 'fillStyle') paintedColors.add(value); if (key === 'strokeStyle') strokedColors.add(value); target[key] = value; return true; } });
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '1', textContent: '', events: {}, style: { setProperty(key, value) { this[key] = value; } }, classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(name, fn) { this.events[name] = fn; },
      getContext() { return ctx; }, getBoundingClientRect() { return { left: 0, top: 0, right: 984, bottom: 590, width: 984, height: 590 }; },
      setAttribute(name, value) { this[name] = value; }, setPointerCapture() {}, focus() {}, showModal() { this.open = true; }, close() { this.open = false; this.events.close?.(); }
    });
    return elements.get(id);
  }
  const sandbox = {
    document: { getElementById: element, addEventListener() {} },
    window: { localStorage: { getItem(key) { return storage.get(key) ?? null; }, setItem(key, value) { storage.set(key, value); } }, matchMedia: () => ({ matches: reduced }), devicePixelRatio: 1, addEventListener() {} },
    performance: { now: () => clock },
    requestAnimationFrame(fn) { callback = fn; return 1; },
    ResizeObserver: class { observe() {} },
    SandpileGame,
    SandpileVersus: class extends SandpileVersus { constructor(model) { super(model); versus = this; } },
    Sandpile: class extends Sandpile { constructor(n) { super(n); models.push(this); } },
    SandpileView: class extends View {
      constructor(n) { super(n); view = this; }
      static escapePose(particle) { const pose = View.escapePose(particle); poses.push(pose); return pose; }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sandpile.js'), 'utf8'), sandbox);
  function advance(ms) { for (let i = 0; i < ms; i += 16) { clock += 16; const fn = callback; callback = null; if (fn) fn(clock); } }
  function event(id, type, data = {}) { element(id).events[type]({ pointerId: 1, pointerType: 'touch', button: 0, clientX: 300, clientY: 300, preventDefault() {}, ...data }); }
  function tap(row, col) {
    const model = currentModel();
    const p = view.point(row + .5, col + .5, Math.sin(view.pitch) >= 0 ? Math.min(8, model.cells[row * model.size + col]) : -.85);
    event('sandpile', 'pointerdown', { clientX: p.x, clientY: p.y });
    event('sandpile', 'pointerup', { clientX: p.x, clientY: p.y });
  }
  if (start !== 'welcome') {
    event('welcome', 'click');
    if (start === 'sandbox') event('mode-sandbox', 'click');
  }
  advance(32);
  return { element, event, advance, tap, poses, paintedColors, strokedColors, get progress() { return JSON.parse(storage.get("sandpile-progress-v2") || "{}"); }, get model() { return currentModel(); }, get view() { return view; }, get versus() { return versus; }, get running() { return !!callback; } };
}

test('tap picking follows the same world square through a full orbit', () => {
  const a = app();
  for (let i = 0; i < 4; i++) {
    a.event('clear', 'click'); a.advance(32);
    a.tap(5, 13); a.advance(600);
    assert.equal(a.model.cells[5 * 19 + 13], 1);
    assert.equal(a.model.grains, 1);
    a.event('rotate-right', 'click'); a.advance(400);
  }
  assert.equal(a.element('view-angle').textContent, '0°');
});

test('drag, cancellation, and multitouch do not add grains', () => {
  const a = app();
  a.event('clear', 'click'); a.advance(32);
  a.event('sandpile', 'pointerdown');
  a.event('sandpile', 'pointermove', { clientX: 420 });
  a.event('sandpile', 'pointerup', { clientX: 420 }); a.advance(600);
  assert.equal(a.element('view-angle').textContent, '305°'); assert.equal(a.model.grains, 0);
  a.event('sandpile', 'pointerdown'); a.event('sandpile', 'pointercancel');
  a.event('sandpile', 'pointerdown'); a.event('sandpile', 'pointerdown', { pointerId: 2 });
  a.event('sandpile', 'pointerup'); a.event('sandpile', 'pointerup', { pointerId: 2 }); a.advance(600);
  assert.equal(a.model.grains, 0);
  a.tap(3, 12); a.advance(600); assert.equal(a.model.cells[3 * 19 + 12], 1);
});

test('corner particles keep falling after the topple, without double-counting escaped grains', () => {
  const a = app();
  a.event('clear', 'click'); a.advance(32);
  a.tap(18, 18);
  for (let i = 0; i < 3; i++) a.event('drop', 'click');
  a.advance(500);
  assert.equal(a.model.escaped, 2); assert.equal(a.model.grains, 2); assert.equal(a.model.topplings, 1);
  assert.ok(a.running);
  a.advance(1200);
  assert.ok(a.poses.some(p => p.z < -1 && p.opacity === 1));
  assert.equal(a.model.escaped, 2); assert.equal(a.running, false);
});

test('clear cancels pending particles; reduced motion skips particles and camera tweening', () => {
  const a = app();
  a.event('clear', 'click'); a.advance(32); a.tap(18, 18);
  for (let i = 0; i < 3; i++) a.event('drop', 'click');
  a.advance(500); a.event('clear', 'click'); a.advance(32);
  const count = a.poses.length; a.advance(2000);
  assert.equal(a.poses.length, count); assert.equal(a.model.grains, 0); assert.equal(a.running, false);
  const b = app(true);
  b.event('clear', 'click'); b.advance(32); b.tap(18, 18);
  for (let i = 0; i < 3; i++) b.event('drop', 'click');
  b.event('rotate-right', 'click'); assert.equal(b.element('view-angle').textContent, '90°');
  b.advance(2000); assert.equal(b.model.escaped, 2); assert.equal(b.poses.length, 0);
});


test('25-grain batches arrive during an avalanche and capture their size at input time', () => {
  const a = app();
  a.event('clear', 'click'); a.advance(32);
  a.element('drop-size').value = '25'; a.event('drop', 'click'); a.advance(200);
  assert.equal(a.model.grains, 25);
  a.event('drop', 'click');
  a.element('drop-size').value = '1'; a.event('drop', 'click');
  a.advance(200);
  assert.equal(a.model.grains + a.model.escaped, 51);
  assert.ok(a.model.topplings > 0);
  a.advance(15000);
  const expected = new Sandpile(19); expected.add(180, 51); expected.stabilize();
  assert.deepEqual([...a.model.cells], [...expected.cells]);
  assert.equal(a.model.topplings, expected.topplings);
});

test('holding pours repeatedly, pointer clicks do not double-add, and release stops pouring', () => {
  const a = app(); a.event('clear', 'click'); a.advance(32);
  a.element('drop-size').value = '25';
  a.event('drop', 'pointerdown'); a.advance(800);
  a.event('drop', 'pointerup'); a.event('drop', 'click', { detail: 1 }); a.advance(250);
  const poured = a.model.grains + a.model.escaped;
  assert.equal(poured, 100);
  a.advance(3000); assert.equal(a.model.grains + a.model.escaped, poured);
  a.event('drop', 'pointerdown'); a.event('drop', 'pointercancel'); a.advance(250);
  assert.equal(a.model.grains + a.model.escaped, poured + 25);
  a.advance(1000); assert.equal(a.model.grains + a.model.escaped, poured + 25);
});

test('clear cancels incoming batches and a held pour', () => {
  const a = app(); a.element('drop-size').value = '100';
  a.event('drop', 'pointerdown'); a.advance(80); a.event('clear', 'click'); a.advance(1500);
  assert.equal(a.model.grains, 0); assert.equal(a.model.escaped, 0); assert.equal(a.running, false);
});


test('top-down mode preserves state and supports batch drops at rotated world squares', () => {
  const a = app(); a.event('clear', 'click'); a.advance(32);
  a.event('view-top', 'click'); a.advance(400);
  assert.equal(a.view.topBlend, 1); assert.equal(a.element('height-legend').hidden, false);
  a.element('drop-size').value = '25';
  a.tap(6, 12); a.advance(200);
  assert.equal(a.model.cells[6 * 19 + 12], 25);
  const before = [...a.model.cells], count = a.model.topplings;
  a.event('view-isometric', 'click');
  assert.deepEqual([...a.model.cells], before); assert.equal(a.model.topplings, count);
  a.advance(400); assert.equal(a.element('height-legend').hidden, true);
  a.event('view-top', 'click'); a.event('rotate-right', 'click'); a.advance(400);
  a.element('drop-size').value = '1'; a.tap(2, 3); a.advance(200);
  assert.equal(a.model.cells[2 * 19 + 3], 1);
  assert.equal(a.model.grains + a.model.escaped, 26);
  a.advance(15000);
  const expected = new Sandpile(19); expected.add(6 * 19 + 12, 25); expected.add(2 * 19 + 3); expected.stabilize();
  assert.deepEqual([...a.model.cells], [...expected.cells]);
});

test('three tutorial steps clear chain highlights and demonstrate falling sand without prediction', () => {
  const a = app();
  const sandbox = a.model, original = [...sandbox.cells];
  a.event('mode-game', 'click'); a.advance(32);
  assert.equal(a.model.size, 5); assert.equal(a.view.pitch, View.isometricPitch);
  a.event('level-3', 'click'); assert.equal(a.element('game-title').textContent, 'Tutorial');
  for (let i = 0; i < 8; i++) a.tap(2, 2);
  a.advance(1000);
  assert.equal(a.model.grains, 4); assert.equal(a.model.topplings, 1);
  a.event('game-next', 'click'); a.advance(32);
  a.event('view-top', 'click'); a.advance(400);
  a.tap(0, 0); a.advance(400);
  assert.equal(a.element('game-retry').textContent, 'Try again');
  a.event('game-retry', 'click'); a.advance(32);
  a.tap(2, 1); a.advance(1200);
  assert.equal(a.model.topplings, 3);
  assert.equal(a.element('game-next').hidden, false);
  a.strokedColors.clear(); a.event('zoom-in', 'click'); a.advance(32);
  assert.equal(a.strokedColors.has('#397698'), false, 'blue challenge outlines disappear');
  assert.equal(a.strokedColors.has('#35624e'), false, 'selected-square outline also disappears');
  a.event('game-next', 'click'); a.advance(32);
  assert.match(a.element('game-prompt').textContent, /watch the sand fall/);
  assert.equal(a.element('drop').disabled, false);
  a.tap(4, 4); a.advance(1800);
  assert.equal(a.model.escaped, 2);
  assert.equal(a.element('game-eyebrow').textContent, 'Tutorial complete!');
  assert.equal(a.element('category-match').disabled, false);
  assert.equal(a.element('category-tutorial').textContent, 'Tutorial ✓');
  assert.equal(a.element('game-next').textContent, 'Match the Pattern →');
  a.event('mode-sandbox', 'click'); a.advance(32);
  assert.equal(a.model, sandbox); assert.deepEqual([...sandbox.cells], original);
  a.event('mode-game', 'click'); a.advance(32);
  assert.equal(a.element('game-eyebrow').textContent, 'Tutorial complete!');
});

test('switching modes pauses and restores incoming drops, reactions, selection, and settings', () => {
  const a = app(); a.event('clear', 'click'); a.advance(32);
  a.event('view-top', 'click'); a.event('rotate-right', 'click'); a.advance(400);
  a.element('drop-size').value = '25'; a.element('speed').value = '2';
  a.tap(18, 18); a.advance(80);
  const sandbox = a.model;
  a.event('mode-game', 'click'); a.advance(32);
  for (let i = 0; i < 4; i++) a.event('drop', 'click');
  a.advance(80);
  const game = a.model;
  assert.equal(sandbox.grains, 0);
  a.event('mode-sandbox', 'click');
  assert.equal(a.element('drop-size').value, '25'); assert.equal(a.element('speed').value, '2');
  assert.equal(a.element('square').textContent, 'Square 19, 19');
  assert.equal(a.element('view-angle').textContent, '90°'); assert.equal(a.view.topBlend, 1);
  a.advance(160);
  assert.equal(sandbox.grains + sandbox.escaped, 25);
  assert.equal(game.grains, 2);
  const frozen = [...sandbox.cells], escaped = sandbox.escaped, topplings = sandbox.topplings;
  a.event('mode-game', 'click'); a.advance(1800);
  assert.equal(game.grains, 4); assert.equal(a.element('game-next').hidden, false);
  assert.deepEqual([...sandbox.cells], frozen); assert.equal(sandbox.escaped, escaped); assert.equal(sandbox.topplings, topplings);
  a.event('mode-sandbox', 'click'); a.advance(8000);
  const expected = new Sandpile(19); expected.add(360, 25); expected.stabilize();
  assert.deepEqual([...sandbox.cells], [...expected.cells]); assert.equal(sandbox.escaped, expected.escaped);
  assert.equal(sandbox.topplings, expected.topplings);
});

test('game input cannot pour, change batch size, or reset the sandbox', () => {
  const a = app(); const sandbox = a.model, original = [...sandbox.cells];
  a.event('mode-game', 'click'); a.advance(32);
  a.element('drop-size').value = '100';
  a.event('drop', 'pointerdown'); a.advance(1200);
  a.event('drop', 'pointerup'); a.event('drop', 'click', { detail: 1 });
  assert.equal(a.model.grains, 3);
  a.event('clear', 'click'); a.event('pattern', 'click');
  assert.equal(a.model.grains, 3); assert.deepEqual([...sandbox.cells], original);
  a.event('view-isometric', 'click'); a.event('rotate-right', 'click'); a.advance(400);
  a.event('mode-sandbox', 'click'); a.event('mode-game', 'click');
  assert.equal(a.view.topBlend, 0); assert.equal(a.element('view-angle').textContent, '90°');
});

test('two-axis drags stay within tilt limits without dropping; picking follows the board', () => {
  const a = app();
  for (const degrees of [-30, 15, 35, 65, 80, 90, 100, 145, 200, 270, 395]) {
    a.event('clear', 'click'); a.advance(32);
    const pitch = degrees * Math.PI / 180, dy = (a.view.pitch - pitch) / .008;
    a.event('sandpile', 'pointerdown');
    a.event('sandpile', 'pointermove', { clientX: 350, clientY: 300 + dy }); a.advance(32);
    a.event('sandpile', 'pointerup', { clientX: 350, clientY: 300 + dy });
    assert.ok(Math.abs(a.view.pitch - View.clampPitch(pitch)) < 1e-10);
    assert.equal(a.model.grains, 0);
    assert.equal(a.element('height-legend').hidden, a.view.topBlend < .01);
    a.tap(7, 11); a.advance(600);
    assert.equal(a.model.cells[7 * 19 + 11], 1, `cell picking at ${degrees} degrees`);
    assert.equal(a.model.grains, 1);
  }
});

test('top down locks tilt, retains rotation, and restores lock across mode switches', () => {
  const a = app(); const original = [...a.model.cells];
  a.event('view-top', 'click'); a.advance(400);
  a.event('sandpile', 'pointerdown');
  a.event('sandpile', 'pointermove', { clientX: 350, clientY: 425 });
  a.event('sandpile', 'pointerup', { clientX: 350, clientY: 425 }); a.advance(32);
  assert.equal(a.view.pitch, Math.PI / 2); assert.equal(a.view.topLocked, true);
  assert.ok(a.view.angle < 0);
  a.event('sandpile', 'keydown', {key: 's'}); a.advance(400);
  assert.equal(a.view.pitch, Math.PI / 2);
  const angle = a.view.angle;
  a.event('mode-game', 'click'); a.advance(32);
  a.event('mode-sandbox', 'click'); a.advance(32);
  assert.equal(a.view.topLocked, true); assert.equal(a.view.angle, angle);
  assert.deepEqual([...a.model.cells], original);
  a.event('view-home', 'click'); a.advance(400);
  assert.equal(a.view.pitch, Math.PI / 2);
  a.event('view-isometric', 'click'); a.advance(400);
  assert.equal(a.view.topLocked, false);
  assert.ok(Math.abs(a.view.pitch - View.isometricPitch) < 1e-10);
});

test('camera motion resumes across mode changes and reduced motion snaps presets', () => {
  const a = app(); a.event('view-top', 'click'); a.advance(32);
  const pitch = a.view.pitch;
  a.event('mode-game', 'click'); a.advance(800);
  a.event('mode-sandbox', 'click'); assert.equal(a.view.pitch, pitch);
  a.advance(400); assert.equal(a.view.topBlend, 1);
  const b = app(true); b.event('view-top', 'click');
  assert.equal(b.view.pitch, Math.PI / 2);
  b.event('sandpile', 'keydown', { key: 's' });
  assert.equal(b.view.pitch, Math.PI / 2);
  b.event('view-isometric', 'click');
  assert.equal(b.view.pitch, View.isometricPitch);
});

test('reversing a drag at either tilt limit responds immediately', () => {
  const a = app(); const original = [...a.model.cells];
  a.event('sandpile', 'pointerdown');
  a.event('sandpile', 'pointermove', { clientY: -700 });
  assert.equal(a.view.pitch, Math.PI / 2);
  a.event('sandpile', 'pointermove', { clientY: -690 });
  assert.ok(a.view.pitch < Math.PI / 2);
  a.event('sandpile', 'pointermove', { clientY: 1300 });
  assert.equal(a.view.pitch, View.minPitch);
  a.event('sandpile', 'pointermove', { clientY: 1290 });
  assert.ok(a.view.pitch > View.minPitch);
  a.event('sandpile', 'pointerup', { clientY: 1290 }); a.advance(32);
  assert.deepEqual([...a.model.cells], original);
});

test('repeated keyboard tilts cannot queue motion past either limit', () => {
  const a = app();
  for (let i = 0; i < 20; i++) a.event('sandpile', 'keydown', { key: 'w' });
  a.advance(400); assert.equal(a.view.pitch, Math.PI / 2);
  a.event('sandpile', 'keydown', { key: 's' }); a.advance(400);
  assert.ok(Math.abs(a.view.pitch - 75 * Math.PI / 180) < 1e-10);
  for (let i = 0; i < 20; i++) a.event('sandpile', 'keydown', { key: 's' });
  a.advance(400); assert.equal(a.view.pitch, View.minPitch);
  a.event('sandpile', 'keydown', { key: 'w' }); a.advance(400);
  assert.ok(Math.abs(a.view.pitch - 20 * Math.PI / 180) < 1e-10);
});

test('wheel zoom is bounded, preserves the pile, and is separate for each mode', () => {
  const a = app(); const original = [...a.model.cells];
  a.event('sandpile', 'wheel', {deltaY: -200, deltaMode: 0}); a.advance(32);
  assert.ok(a.view.zoom > 1);
  const zoom = a.view.zoom;
  a.event('mode-game', 'click'); a.advance(32); assert.equal(a.view.zoom, 1);
  a.event('mode-sandbox', 'click'); a.advance(32); assert.equal(a.view.zoom, zoom);
  for (let i = 0; i < 8; i++) a.event('sandpile', 'wheel', {deltaY: -10000, deltaMode: 0});
  assert.equal(a.view.zoom, 3);
  for (let i = 0; i < 8; i++) a.event('sandpile', 'wheel', {deltaY: 10000, deltaMode: 1});
  assert.equal(a.view.zoom, .5);
  assert.deepEqual([...a.model.cells], original);
  a.event('zoom-reset', 'click'); a.advance(32); assert.equal(a.view.zoom, 1);
});

test('category selection loads the pictured boards, shows targets, and saves scores', () => {
  const a = app(false, {completed: [0,1,2]});
  a.event('mode-game', 'click'); a.event('level-menu-open', 'click'); a.event('category-match', 'click'); a.event('level-1', 'click'); a.advance(32);
  assert.equal(a.model.size, 3); assert.equal(a.element('category-tutorial').textContent, 'Tutorial ✓');
  assert.equal(a.element('target-panel').hidden, false);
  a.event('drop', 'click'); a.event('drop', 'click'); a.advance(1200);
  assert.equal(a.element('game-best').textContent, 'Best: 2 moves');
  assert.ok(a.progress.completed.includes(3));
  a.event('level-menu-open', 'click'); a.event('level-2', 'click'); a.advance(32);
  assert.equal(a.model.grains, 57);
  assert.ok(a.element('target-grid')['aria-label'].includes('1, 2, 2, 3, 0'));
  a.tap(0,3); a.advance(2000); a.tap(1,3); a.advance(5000);
  assert.equal(a.element('game-next').hidden, false);
  a.event('level-menu-open', 'click'); a.event('category-avalanche', 'click'); a.event('level-1', 'click'); a.advance(32);
  assert.equal(a.element('target-panel').hidden, true); assert.equal(a.model.grains, 56);
  a.tap(4,4); a.advance(6000);
  assert.equal(a.model.grains, 44); assert.equal(a.element('game-next').hidden, false);
});

test('Mountain waits for settling before Stop here and offers retry for a small pile', () => {
  const a = app(false, {completed: [0,1,2]});
  a.event('mode-game', 'click'); a.event('level-menu-open', 'click'); a.event('category-mountain', 'click'); a.event('level-1', 'click'); a.advance(32);
  assert.equal(a.model.size, 3); assert.equal(a.element('game-stop').hidden, false);
  a.event('drop', 'click'); a.event('game-stop', 'click');
  assert.equal(a.element('game-stop').hidden, false);
  a.advance(500); a.event('game-stop', 'click');
  assert.equal(a.element('game-retry').textContent, 'Try again');
  a.event('game-retry', 'click');
  for (let i = 0; i < 15; i++) a.event('drop', 'click');
  a.advance(5000); a.event('game-stop', 'click');
  assert.equal(a.model.escaped, 0); assert.equal(a.element('game-next').hidden, false);
  assert.ok(a.progress.completed.includes(6));
  a.event('game-next', 'click'); a.advance(32); assert.equal(a.model.size, 5);
});


test('welcome rotates a real cascading pile, then a tap starts a clean tutorial without dropping', () => {
  const a = app(false, null, 'welcome');
  assert.equal(a.element('welcome').hidden, false);
  assert.equal(a.element('workspace').inert, true);
  assert.deepEqual([...new Set(a.model.cells)].sort(), [0, 1, 2, 3]);
  const angle = a.view.angle;
  a.advance(6000);
  assert.notEqual(a.view.angle, angle);
  assert.ok(a.model.topplings > 0);
  a.event('welcome', 'click'); a.advance(800);
  assert.equal(a.element('welcome').hidden, true);
  assert.equal(a.element('workspace').inert, false);
  assert.equal(a.element('mode-game')['aria-pressed'], 'true');
  assert.equal(a.element('game-title').textContent, 'Tutorial');
  assert.equal(a.model.size, 5);
  assert.equal(a.model.grains, 2);
  assert.equal(a.element('game-budget').textContent, '2 grains left');
  assert.equal(a.running, false);
  a.event('mode-sandbox', 'click'); a.advance(32);
  assert.equal(a.model.size, 19);
  assert.equal(a.model.grains, 711);
  assert.equal(a.model.topplings, 0);
});

test('welcome respects reduced motion and still opens the tutorial with saved completion', () => {
  const a = app(true, {completed: [0,1,2,3], best: {3: 2}}, 'welcome');
  const angle = a.view.angle;
  a.advance(8000);
  assert.equal(a.view.angle, angle);
  assert.equal(a.model.topplings, 0);
  assert.equal(a.running, false);
  a.event('welcome', 'click'); a.advance(32);
  assert.equal(a.element('game-title').textContent, 'Tutorial');
  assert.equal(a.element('category-tutorial').textContent, 'Tutorial ✓');
  assert.equal(a.progress.best[3], 2);
});

test('participant reset requires an uninterrupted hold, forgets scores, and returns to the sign', () => {
  const a = app(false, {completed: [0,1,2,3], best: {3: 2}}, 'game');
  a.event('help-open', 'click'); a.event('participant-open', 'click');
  assert.equal(a.element('participant-dialog').open, true);
  a.event('participant-reset', 'pointerdown'); a.advance(1600);
  a.event('participant-reset', 'pointerup'); a.advance(2000);
  assert.equal(a.element('welcome').hidden, true);
  assert.equal(a.progress.best[3], 2);
  a.event('participant-reset', 'pointerdown'); a.advance(2000);
  a.event('participant-reset', 'pointermove', {clientX: -1}); a.advance(2000);
  assert.equal(a.element('welcome').hidden, true);
  a.event('participant-reset', 'pointerdown'); a.advance(2900);
  assert.equal(a.element('welcome').hidden, true);
  a.advance(160);
  assert.equal(a.element('welcome').hidden, false);
  assert.equal(a.element('participant-dialog').open, false);
  assert.deepEqual(a.progress, {version: 3, completed: [], best: {}});
  a.event('participant-reset', 'pointerup');
  a.event('welcome', 'click'); a.advance(32);
  assert.equal(a.element('game-title').textContent, 'Tutorial');
  assert.equal(a.element('category-match').disabled, true);
  assert.equal(a.model.grains, 2);
  a.event('mode-sandbox', 'click'); a.advance(32);
  assert.equal(a.model.size, 19);
  assert.equal(a.model.grains, 711);
});

test('reset cancellation and keyboard release cannot erase progress', () => {
  const a = app(true, {completed: [0]}, 'game');
  a.event('help-open', 'click'); a.event('participant-open', 'click');
  a.event('participant-reset', 'keydown', {key: 'Enter'}); a.advance(1500);
  a.event('participant-reset', 'keyup', {key: 'Enter'}); a.advance(2000);
  assert.deepEqual(a.progress.completed, [0]);
  a.event('participant-reset', 'pointerdown'); a.advance(1500);
  a.event('participant-cancel', 'click'); a.advance(2000);
  assert.equal(a.element('participant-dialog').open, false);
  assert.equal(a.element('welcome').hidden, true);
  assert.deepEqual(a.progress.completed, [0]);
  a.event('participant-open', 'click');
  a.event('participant-reset', 'keydown', {key: ' '}); a.advance(3050);
  assert.equal(a.element('welcome').hidden, false);
  assert.deepEqual(a.progress.completed, []);
});

test('Versus starts empty, enforces ownership, and ignores extra taps and batch sizes', () => {
  const a = app(); a.event('mode-versus', 'click'); a.advance(32);
  assert.equal(a.model.size, 4); assert.equal(a.model.grains, 0);
  assert.equal(a.element('versus-title').textContent, 'Red’s turn');
  assert.equal(a.element('height-legend').hidden, true);
  a.tap(0,0); a.tap(0,1); a.advance(400);
  assert.equal(a.model.grains, 1); assert.equal(a.versus.owners[0], 1);
  assert.equal(a.element('versus-title').textContent, 'Blue’s turn');
  a.tap(0,0); a.advance(400);
  assert.equal(a.model.grains, 1); assert.equal(a.versus.moves, 1);
  assert.match(a.element('versus-message').textContent, /empty square/);
  a.element('drop-size').value = '100'; a.tap(0,1); a.advance(400);
  assert.equal(a.model.grains, 2); assert.equal(a.versus.owners[1], 2);
  assert.equal(a.element('versus-red').textContent, 1);
  assert.equal(a.element('versus-blue').textContent, 1);
  assert.ok(a.paintedColors.has('#f4b2a8')); assert.ok(a.paintedColors.has('#afd3f3'));
  a.paintedColors.clear();
  a.event('view-isometric', 'click'); a.advance(400);
  assert.ok(a.paintedColors.has('#d85a4d')); assert.ok(a.paintedColors.has('#4f91d2'));
  a.tap(0,0); a.advance(400);
  assert.equal(a.model.cells[0], 2);
  assert.equal(a.element('versus-title').textContent, 'Blue’s turn');
});

test('Versus waits for captured cascades and escaped grains before announcing a winner, then rematches', () => {
  const a = app(); a.event('mode-versus', 'click'); a.advance(32);
  for (const index of [0,1,0,1,0,1]) { a.tap(0,index); a.advance(400); }
  a.tap(0,0); a.advance(500);
  assert.equal(a.versus.resolving, true);
  assert.equal(a.versus.winner, 0);
  const moves = a.versus.moves;
  a.tap(3,3); a.advance(1800);
  assert.equal(a.versus.moves, moves);
  assert.equal(a.element('versus-title').textContent, 'Red wins!');
  assert.equal(a.model.grains, 4); assert.equal(a.model.escaped, 3);
  assert.equal(a.element('versus-blue').textContent, 0);
  assert.equal(a.element('drop').disabled, true);
  a.event('versus-new', 'click'); a.advance(32);
  assert.equal(a.model.grains, 0); assert.equal(a.versus.moves, 0);
  assert.equal(a.element('versus-title').textContent, 'Red’s turn');
});

test('Versus preserves its pending turn and camera through both other modes', () => {
  const a = app(); const sandbox = [...a.model.cells];
  a.event('mode-versus', 'click'); a.advance(32);
  a.event('zoom-in', 'click'); a.advance(32); const zoom = a.view.zoom;
  a.tap(0,0); const match = a.versus;
  a.event('mode-game', 'click'); a.advance(1000);
  assert.equal(match.model.grains, 0); assert.equal(match.pending, 0);
  a.event('mode-sandbox', 'click'); a.advance(1000);
  assert.deepEqual([...a.model.cells], sandbox);
  a.event('mode-versus', 'click'); a.advance(600);
  assert.equal(a.view.zoom, zoom); assert.equal(a.model.cells[0], 1);
  assert.equal(a.versus.owners[0], 1); assert.equal(a.versus.turn, 2);
  a.tap(0,1); a.advance(400);
  a.event('help-open', 'click'); a.event('participant-open', 'click');
  a.event('participant-reset', 'pointerdown'); a.advance(3050);
  assert.equal(a.element('welcome').hidden, false);
  a.event('welcome', 'click'); a.event('mode-versus', 'click'); a.advance(32);
  assert.equal(a.model.grains, 0); assert.equal(a.versus.moves, 0);
  assert.equal(a.versus.turn, 1);
});


test('compact level header opens a separate menu without resetting an attempt', () => {
  const a = app(false, {completed: [0,1,2]}, 'game');
  assert.equal(a.element('game-title').textContent, 'Tutorial');
  assert.equal(a.element('level-header').hidden, false);
  a.event('drop', 'click'); a.advance(400);
  const board = a.model;
  assert.equal(board.grains, 3);
  a.event('level-menu-open', 'click');
  assert.equal(a.element('level-menu').open, true);
  a.event('category-avalanche', 'click');
  assert.equal(a.model, board);
  assert.equal(a.model.grains, 3);
  assert.equal(a.element('level-1').textContent, 'Avalanche 1');
  a.event('level-menu-resume', 'click');
  assert.equal(a.element('level-menu').open, false);
  assert.equal(a.element('game-title').textContent, 'Tutorial');
  a.event('level-menu-open', 'click');
  assert.equal(a.element('category-tutorial')['aria-pressed'], 'true');
  a.event('category-avalanche', 'click'); a.event('level-1', 'click'); a.advance(32);
  assert.equal(a.element('level-menu').open, false);
  assert.equal(a.element('game-title').textContent, 'Avalanche 1');
  assert.equal(a.model.grains, 56);
  a.event('level-menu-open', 'click'); a.event('category-mountain', 'click'); a.event('level-2', 'click'); a.advance(32);
  assert.equal(a.element('game-title').textContent, 'Mountain 2');
  assert.equal(a.model.size, 5);
});

test('level menu respects tutorial locks and provides routes to other modes', () => {
  const a = app(false, null, 'game');
  a.event('level-menu-open', 'click');
  assert.equal(a.element('category-avalanche').disabled, true);
  a.event('category-avalanche', 'click');
  assert.equal(a.element('category-tutorial')['aria-pressed'], 'true');
  a.event('level-3', 'click');
  assert.equal(a.element('level-menu').open, true);
  assert.equal(a.element('game-title').textContent, 'Tutorial');
  a.event('menu-versus', 'click'); a.advance(32);
  assert.equal(a.element('level-menu').open, false);
  assert.equal(a.element('level-header').hidden, true);
  assert.equal(a.model.size, 4);
  a.event('mode-game', 'click'); a.event('level-menu-open', 'click');
  a.event('menu-sandbox', 'click'); a.advance(32);
  assert.equal(a.element('level-menu').open, false);
  assert.equal(a.element('level-header').hidden, true);
  assert.equal(a.model.size, 19);
});
