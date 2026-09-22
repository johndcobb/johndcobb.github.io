/* Camera geometry and escaping-grain trajectories, independent of the canvas. */
(function (root) {
  'use strict';
  class SandpileView {
    constructor(size) {
      this.size = size;
      this.angle = 0;
      this.pitch = SandpileView.isometricPitch;
      this.topLocked = false;
      this.zoom = 1;
      this.resize(800, 600);
    }

    resize(width, height) {
      this.width = width;
      this.height = height;
    }

    static get isometricPitch() { return Math.asin(1 / Math.sqrt(3)); }
    static get minPitch() { return 5 * Math.PI / 180; }
    static clampPitch(pitch) { return Math.max(SandpileView.minPitch, Math.min(Math.PI / 2, pitch)); }

    get pitch() { return this._pitch; }
    set pitch(pitch) { this._pitch = SandpileView.clampPitch(pitch); }
    get zoom() { return this._zoom; }
    set zoom(zoom) { this._zoom = Math.max(.5, Math.min(3, zoom)); }

    // Stay above the table, from a low viewing angle to directly overhead.
    get topBlend() {
      const start = Math.sin(65 * Math.PI / 180);
      const t = Math.max(0, Math.min(1, (Math.sin(this.pitch) - start) / (1 - start)));
      return t * t * (3 - 2 * t);
    }

    get cellSize() {
      const heading = this.angle + Math.PI / 4;
      const extent = this.size * (Math.abs(Math.cos(heading)) + Math.abs(Math.sin(heading)));
      return this.zoom * Math.max(1, Math.min((this.width - 80) / extent, (this.height - 190) / (extent * Math.max(.58, Math.abs(Math.sin(this.pitch))))));
    }

    get halfW() { return this.cellSize / Math.SQRT2; }

    rotate(row, col) {
      const x = col - this.size / 2, y = row - this.size / 2;
      const c = Math.cos(this.angle), s = Math.sin(this.angle);
      return { x: x * c - y * s, y: x * s + y * c };
    }

    depth(row, col, z = 0) {
      const p = this.rotate(row, col);
      return (p.x + p.y) / Math.SQRT2 * Math.cos(this.pitch) + z * .52 * Math.sin(this.pitch);
    }

    point(row, col, z = 0) {
      const p = this.rotate(row, col);
      const sin = Math.sin(this.pitch), cos = Math.cos(this.pitch);
      return { x: this.width / 2 + (p.x - p.y) / Math.SQRT2 * this.cellSize, y: this.height / 2 - 12 + 47 * this.topBlend + ((p.x + p.y) / Math.SQRT2 * sin - z * .52 * cos) * this.cellSize };
    }

    static cellStyle(grains) {
      const stable = ['#f0eadc', '#e9c28c', '#bd8546', '#704a2d'];
      if (grains < 4) return { fill: stable[grains], ink: grains < 2 ? '#4c3826' : '#fffdf5' };
      const depth = Math.min(1, Math.log2(grains / 4) / 5);
      const light = [184, 67, 48], dark = [88, 23, 44];
      return { fill: `rgb(${light.map((v, i) => Math.round(v + (dark[i] - v) * depth)).join(',')})`, ink: '#fffdf5' };
    }

    diamond(row, col, z, span = 1) {
      return [this.point(row, col, z), this.point(row, col + span, z), this.point(row + span, col + span, z), this.point(row + span, col, z)];
    }

    visibleEdges() {
      return [[-1, 0], [0, 1], [1, 0], [0, -1]].flatMap(([dr, dc], edge) => this.depth(dr, dc) - this.depth(0, 0) > 1e-8 ? [edge] : []);
    }

    // One world-space particle per grain lost to the sink. Rotation changes
    // only its projection, never its trajectory or the mathematical counters.
    static escapePose(particle) {
      const t = Math.max(0, Math.min(1, particle.age / particle.duration));
      const arc = Math.min(1, t / .38);
      const distance = 1.1 * arc + Math.max(0, t - .38) * .8;
      return {
        row: particle.row + particle.dr * distance,
        col: particle.col + particle.dc * distance,
        z: particle.z + Math.sin(arc * Math.PI) * 1.2 - 12 * Math.max(0, (t - .22) / .78) ** 2,
        opacity: t < .82 ? 1 : Math.max(0, (1 - t) / .18)
      };
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = SandpileView;
  else root.SandpileView = SandpileView;
})(typeof globalThis !== 'undefined' ? globalThis : this);
