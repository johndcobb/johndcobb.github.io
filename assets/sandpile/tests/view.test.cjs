const assert = require('node:assert/strict');
const test = require('node:test');
const View = require('../sandpile-view.js');

test('a full orbit returns every corner to the same position and keeps the center fixed', () => {
  const view = new View(19);
  const original = view.diamond(0, 0, 0, 19);
  for (let i = 0; i <= 24; i++) {
    view.angle = i * Math.PI / 12;
    assert.deepEqual(view.point(9.5, 9.5), { x: 400, y: 288 });
    const corners = view.diamond(0, 0, 0, 19);
    assert.ok(corners.every(p => p.x > 0 && p.x < 800 && p.y > 0 && p.y < 600));
    const visible = view.visibleEdges(corners);
    assert.ok(visible.length >= 1 && visible.length <= 2);
  }
  view.diamond(0, 0, 0, 19).forEach((p, i) => {
    assert.ok(Math.abs(p.x - original[i].x) < 1e-8);
    assert.ok(Math.abs(p.y - original[i].y) < 1e-8);
  });
});

test('escaping grains cross each edge, remain opaque while falling, then disappear below the platform', () => {
  for (const [row, col, dr, dc] of [[.5, 9.5, -1, 0], [18.5, 9.5, 1, 0], [9.5, .5, 0, -1], [9.5, 18.5, 0, 1]]) {
    const particle = { row, col, dr, dc, z: 3, age: 0, duration: 1100 };
    const start = View.escapePose(particle);
    assert.equal(start.row, row); assert.equal(start.col, col); assert.equal(start.z, 3);
    const falling = View.escapePose({ ...particle, age: 880 });
    assert.ok(falling.row < 0 || falling.row > 19 || falling.col < 0 || falling.col > 19);
    assert.ok(falling.z < -1); assert.equal(falling.opacity, 1);
    const end = View.escapePose({ ...particle, age: 1100 });
    assert.ok(end.z < falling.z); assert.equal(end.opacity, 0);
  }
});


test('overhead projection is flat, square, and stays inside the viewport during rotation', () => {
  const view = new View(19); view.pitch = Math.PI / 2;
  for (const [width, height] of [[984, 560], [728, 740]]) {
    view.resize(width, height);
    for (let i = 0; i < 16; i++) {
      view.angle = i * Math.PI / 8;
      assert.ok(Math.abs(view.point(3, 7, 0).y - view.point(3, 7, 100).y) < 1e-8);
      const face = view.diamond(3, 7, 0);
      const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      assert.ok(Math.abs(length(face[0], face[1]) - length(face[1], face[2])) < 1e-8);
      assert.ok(view.diamond(0, 0, 0, 19).every(p => p.x >= 32 && p.x <= width - 32 && p.y >= 120 && p.y <= height - 50));
    }
  }
});

test('stable counts have four distinct shades; unstable shades darken with count', () => {
  assert.equal(new Set([0, 1, 2, 3].map(n => View.cellStyle(n).fill)).size, 4);
  const brightness = n => View.cellStyle(n).fill.match(/\d+/g).map(Number).reduce((a, b) => a + b, 0);
  assert.ok(brightness(4) > brightness(25)); assert.ok(brightness(25) > brightness(100));
});

test('the count map blends near overhead and stays there at the tilt limit', () => {
  const view = new View(19);
  const blendAt = degrees => { view.pitch = degrees * Math.PI / 180; return view.topBlend; };
  assert.equal(blendAt(35), 0); assert.equal(blendAt(65), 0);
  assert.ok(blendAt(70) > 0 && blendAt(70) < blendAt(80));
  assert.equal(blendAt(90), 1);
  assert.equal(blendAt(105), 1); assert.equal(blendAt(270), 1);
  assert.equal(blendAt(-90), 0);
  assert.equal(blendAt(450), 1);
});

test('tilt is clamped above the table, with continuous projection at both limits', () => {
  const view = new View(19);
  view.pitch = -Math.PI; assert.equal(view.pitch, View.minPitch);
  view.pitch = 4 * Math.PI; assert.equal(view.pitch, Math.PI / 2);
  for (const boundary of [View.minPitch, Math.PI / 2]) {
    view.pitch = boundary - 1e-7; const before = view.point(4, 12, 3);
    view.pitch = boundary + 1e-7; const after = view.point(4, 12, 3);
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < .001);
  }
  view.pitch = Math.PI / 2; assert.equal(view.visibleEdges().length, 0);
});
