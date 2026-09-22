/* The open-boundary Abelian sandpile, independent of rendering and timing. */
(function (root) {
  'use strict';

  class Sandpile {
    constructor(size = 19) {
      if (!Number.isInteger(size) || size < 1) throw new RangeError('Size must be a positive integer.');
      this.size = size;
      this.cells = new Float64Array(size * size);
      this.topplings = 0;
      this.escaped = 0;
    }

    add(index, count = 1) {
      if (!Number.isInteger(index) || index < 0 || index >= this.cells.length) throw new RangeError('Invalid square.');
      if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Grains must be a nonnegative integer.');
      this.cells[index] += count;
    }

    neighbors(index) {
      const n = this.size;
      const row = Math.floor(index / n);
      const col = index % n;
      return [row > 0 ? index - n : -1, col < n - 1 ? index + 1 : -1, row < n - 1 ? index + n : -1, col > 0 ? index - 1 : -1];
    }

    unstable() {
      return Array.from(this.cells.keys()).filter(index => this.cells[index] >= 4);
    }

    // Default to one topple per unstable site. The animation controller can
    // supply a captured wave with multiple legal topplings per site.
    step(active = this.unstable(), counts = active.map(() => 1)) {
      if (counts.length !== active.length || new Set(active).size !== active.length || active.some((index, i) => !Number.isInteger(index) || index < 0 || index >= this.cells.length || !Number.isSafeInteger(counts[i]) || counts[i] < 1 || counts[i] * 4 > this.cells[index])) throw new RangeError('Invalid toppling wave.');
      for (const [i, index] of active.entries()) {
        const count = counts[i];
        this.cells[index] -= 4 * count;
        for (const neighbor of this.neighbors(index)) {
          if (neighbor < 0) this.escaped += count;
          else this.cells[neighbor] += count;
        }
        this.topplings += count;
      }
      return active;
    }

    stabilize() {
      while (this.step().length) { /* Used only to prepare a starting pattern. */ }
      return this;
    }

    get grains() {
      return this.cells.reduce((sum, count) => sum + count, 0);
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = Sandpile;
  else root.Sandpile = Sandpile;
})(typeof globalThis !== 'undefined' ? globalThis : this);
