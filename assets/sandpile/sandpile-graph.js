/* Immutable stable states, directed grain-drop edges, and a navigable map. */
(function (root) {
  'use strict';
  const View = typeof module !== 'undefined' && module.exports ? require('./sandpile-view.js') : root.SandpileView;
  class SandpileGraph {
    constructor(size, cells, target) {
      this.size = size;
      this.targetKey = this.key(target);
      this.nodes = []; this.edges = []; this.byState = new Map();
      this.activeId = 0; this.pending = null;
      this.camera = { x: 0, y: 0, zoom: 1 };
      this.notice = '';
      this.addNode(cells, { x: 0, y: 0, layer: 0 }, { topplings: 0, escaped: 0 });
      this.distances();
    }
    key(cells) { return Array.from(cells).join(','); }
    get current() { return this.nodes[this.activeId]; }
    get targetNode() { return this.byState.get(this.targetKey); }
    addNode(cells, position, stats) {
      if (cells.length !== this.size ** 2 || Array.from(cells).some(n => !Number.isInteger(n) || n < 0 || n >= 4)) throw new Error('A graph node must be a stable sandpile.');
      const key = this.key(cells);
      const node = { id: this.nodes.length, size: this.size, cells: Object.freeze(Array.from(cells)), grains: Array.from(cells).reduce((a, b) => a + b, 0), topplings: stats.topplings, escaped: stats.escaped, ...position, moves: Infinity, target: key === this.targetKey };
      this.nodes.push(node); this.byState.set(key, node);
      return node;
    }
    begin(sourceId, index) {
      const source = this.nodes[sourceId];
      if (this.pending || !source || !Number.isInteger(index) || index < 0 || index >= this.size ** 2) return null;
      const layer = source.layer + 1;
      const count = this.nodes.filter(node => node.layer === layer).length;
      const row = count === 0 ? 0 : (count % 2 ? 1 : -1) * Math.ceil(count / 2);
      this.pending = { sourceId, index, x: layer * 400, y: row * 310, layer };
      this.notice = 'The new board is settling. Your original board stays unchanged.';
      return source;
    }
    finish(model) {
      if (!this.pending || model.cells.some(n => n >= 4)) return null;
      const pending = this.pending;
      let node = this.byState.get(this.key(model.cells));
      const merged = !!node;
      if (!node) node = this.addNode(model.cells, pending, model);
      if (!this.edges.some(edge => edge.from === pending.sourceId && edge.index === pending.index)) this.edges.push({ from: pending.sourceId, to: node.id, index: pending.index });
      this.pending = null; this.activeId = node.id; this.distances();
      this.notice = merged ? 'That board already exists — the paths join here.' : 'New board created. Drop on any board to explore another path.';
      return { node, merged, source: this.nodes[pending.sourceId] };
    }
    distances() {
      this.nodes.forEach(node => { node.moves = Infinity; });
      this.nodes[0].moves = 0;
      const queue = [0], outgoing = new Map();
      for (const edge of this.edges) {
        if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
        outgoing.get(edge.from).push(edge.to);
      }
      for (let i = 0; i < queue.length; i++) {
        const source = this.nodes[queue[i]];
        for (const id of outgoing.get(source.id) || []) if (this.nodes[id].moves > source.moves + 1) {
          this.nodes[id].moves = source.moves + 1; queue.push(id);
        }
      }
    }
    toScreen(node, width, height) { return { x: width / 2 + (node.x - this.camera.x) * this.camera.zoom, y: height / 2 + 43 + (node.y - this.camera.y) * this.camera.zoom }; }
    fromScreen(point, width, height) { return { x: this.camera.x + (point.x - width / 2) / this.camera.zoom, y: this.camera.y + (point.y - height / 2 - 43) / this.camera.zoom }; }
    zoomAt(factor, point, width, height) {
      const before = this.fromScreen(point, width, height);
      this.camera.zoom = Math.max(.08, Math.min(3, this.camera.zoom * factor));
      const after = this.fromScreen(point, width, height);
      this.camera.x += before.x - after.x; this.camera.y += before.y - after.y;
    }
    focus(node = this.current) { this.camera.x = node.x; this.camera.y = node.y; this.camera.zoom = 1.25; }
    fit(width, height, nodes = this.nodes) {
      const x0 = Math.min(...nodes.map(n => n.x)) - 175, x1 = Math.max(...nodes.map(n => n.x)) + 175;
      const y0 = Math.min(...nodes.map(n => n.y)) - 145, y1 = Math.max(...nodes.map(n => n.y)) + 145;
      this.camera.x = (x0 + x1) / 2; this.camera.y = (y0 + y1) / 2;
      this.camera.zoom = Math.max(.08, Math.min(1.25, (width - 24) / (x1 - x0), (height - 170) / (y1 - y0)));
    }
    boardCamera(source, node, width, height) {
      const point = this.toScreen(node, width, height);
      return View.forBoard(source, this.size, point.x, point.y + 10 * this.camera.zoom, 190 / (this.size * Math.SQRT2) * this.camera.zoom);
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = SandpileGraph;
  else root.SandpileGraph = SandpileGraph;
})(typeof globalThis !== 'undefined' ? globalThis : this);
