/* Exact shortest grain-drop paths for small, open-boundary boards. */
(function (root) {
  'use strict';
  function shortestPath(size, start, target) {
    if (!Number.isInteger(size) || size < 1 || size > 3) throw new RangeError('Exact search supports boards up to 3 by 3.');
    const count = size * size;
    if ([start, target].some(board => board.length !== count || Array.from(board).some(n => !Number.isInteger(n) || n < 0 || n > 3))) throw new RangeError('Search requires stable boards.');
    const encode = board => Array.from(board).reduce((state, n, i) => state | (n << (2 * i)), 0);
    const initial = encode(start), goal = encode(target);
    if (initial === goal) return [];
    // Two bits per square give a bounded search of at most 4^9 stable states.
    const parents = new Int32Array(4 ** count); parents.fill(-1);
    const drops = new Uint8Array(parents.length), queue = new Uint32Array(parents.length);
    const cells = new Uint8Array(count);
    const neighbors = Array.from({length: count}, (_, i) => [i >= size ? i - size : -1, i < count - size ? i + size : -1, i % size ? i - 1 : -1, i % size < size - 1 ? i + 1 : -1].filter(j => j >= 0));
    let head = 0, tail = 1;
    queue[0] = initial; parents[initial] = initial;
    while (head < tail) {
      const state = queue[head++];
      for (let square = 0; square < count; square++) {
        let next;
        if (((state >>> (2 * square)) & 3) < 3) next = state + (1 << (2 * square));
        else {
          for (let i = 0; i < count; i++) cells[i] = (state >>> (2 * i)) & 3;
          cells[square]++;
          // Legal sequential topplings have the same stable result as animation's waves.
          let stable = false;
          while (!stable) {
            stable = true;
            for (let i = 0; i < count; i++) if (cells[i] >= 4) {
              stable = false; cells[i] -= 4;
              for (const neighbor of neighbors[i]) cells[neighbor]++;
            }
          }
          next = 0;
          for (let i = 0; i < count; i++) next |= cells[i] << (2 * i);
        }
        if (parents[next] !== -1) continue;
        parents[next] = state; drops[next] = square;
        if (next === goal) {
          const path = [];
          for (let current = goal; current !== initial; current = parents[current]) path.push(drops[current]);
          return path.reverse();
        }
        queue[tail++] = next;
      }
    }
    return null;
  }
  const solver = { shortestPath };
  if (typeof module !== 'undefined' && module.exports) module.exports = solver;
  else root.SandpileSolver = solver;
})(typeof globalThis !== 'undefined' ? globalThis : this);
