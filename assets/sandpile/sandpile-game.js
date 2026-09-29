/* Tutorial and two game categories. Rules are separate from the renderer and animation. */
(function (root) {
  'use strict';
  const Solver = typeof module !== 'undefined' && module.exports ? require('./sandpile-solver.js') : root.SandpileSolver;
  const Model = typeof module !== 'undefined' && module.exports ? require('./sandpile-model.js') : root.Sandpile;
  const levels = [
    {
      title: 'The tipping point',
      prompt: 'Two grains are already here. Add sand to the outlined square until it topples.',
      seeds: [[12, 2]], marked: [12], selected: 12,
      success: 'Four is the tipping point! The stack sends one grain to each neighbor.',
      goal: (model, toppled) => toppled.has(12)
    },
    {
      title: 'Start a chain reaction',
      prompt: 'Make all three outlined stacks topple.',
      hideHighlightsOnWin: true, seeds: [[11, 3], [12, 3], [13, 3]], marked: [11, 12, 13], selected: 12,
      success: 'A chain reaction! One topple can set off the next, and the next.',
      goal: (model, toppled) => [11, 12, 13].every(index => toppled.has(index))
    },
    {
      title: 'Over the edge',
      prompt: 'Tap the outlined corner and watch the sand fall off the edge.',
      seeds: [[24, 3]], marked: [24], selected: 24,
      success: 'Sand that goes over an edge leaves the board. A corner has two ways out!',
      goal: model => model.escaped > 0
    }
  ];

  levels.forEach(level => Object.assign(level, { kind: 'tutorial', size: 5 }));
  levels.push(
    {
      kind: 'match', order: 1, size: 3, title: 'Four neighbors', selected: 4, seeds: [[4, 2]], marked: [],
      prompt: 'Make your board match the target. Each grain is one move. Can you do it in two?',
      target: [0,1,0, 1,0,1, 0,1,0], optimalMoves: 2
    },
    {
      kind: 'match', order: 4, size: 5, title: 'Find the two drops', selected: 12, marked: [],
      prompt: 'Match every square of the target in as few moves as possible. Two moves is perfect.',
      start: [3,3,3,2,2, 2,3,2,3,2, 1,3,0,3,3, 3,3,2,2,3, 0,2,3,1,3],
      target: [1,2,2,3,0, 1,3,3,1,2, 0,3,1,0,3, 1,3,2,3,2, 2,0,2,0,1], optimalMoves: 2
    },
    {
      kind: 'avalanche', order: 2, size: 5, title: 'One grain, big avalanche', selected: 12, marked: [], budget: 1,
      start: [1,3,3,3,2, 3,1,3,3,2, 1,3,3,1,3, 1,1,2,3,3, 1,2,3,2,3], maxRemaining: 44, bestEscape: 13
    },
    {
      kind: 'match', order: 2, size: 4, title: 'Two tipping points', selected: 5, marked: [],
      prompt: 'Turn the two stacks into the target pattern. Each grain is one move.',
      start: [0,0,0,0, 0,3,0,0, 0,0,3,0, 0,0,0,0],
      target: [0,1,0,0, 1,0,2,0, 0,2,0,1, 0,0,1,0], optimalMoves: 2
    },
    {
      kind: 'match', order: 3, size: 3, title: 'Find the identity', selected: 4, marked: [], randomStart: true, maxSolutionMoves: 6,
      prompt: 'Match the identity from a random board. Use as few grains as possible.',
      target: [2,1,2, 1,0,1, 2,1,2]
    },
    {
      kind: 'avalanche', order: 1, size: 3, title: 'A little nudge', selected: 4, marked: [], budget: 1,
      start: [3,3,0, 1,3,0, 0,1,3], maxRemaining: 12, bestEscape: 3
    },
    {
      kind: 'avalanche', order: 3, size: 6, title: 'Find the opening', selected: 21, marked: [], budget: 1,
      start: [
        3,2,2,0,1,3,
        1,2,3,3,1,3,
        2,2,2,3,2,3,
        3,3,3,1,2,0,
        3,2,3,3,3,2,
        3,2,3,1,3,3
      ], maxRemaining: 66, bestEscape: 16
    },
    {
      kind: 'avalanche', order: 4, size: 7, title: 'The hidden connection', selected: 24, marked: [], budget: 1,
      start: [
        3,1,1,2,2,2,3,
        3,2,3,3,2,3,3,
        2,2,2,2,2,3,3,
        2,3,3,3,2,3,3,
        3,1,2,2,3,2,2,
        2,2,1,2,3,3,2,
        3,2,2,2,3,3,2
      ], maxRemaining: 93, bestEscape: 23
    },
    {
      kind: 'avalanche', order: 5, size: 8, title: 'Across the board', selected: 36, marked: [], budget: 1,
      start: [
        3,3,3,3,2,3,2,2,
        2,2,0,2,3,0,2,2,
        3,2,3,3,2,2,2,3,
        3,2,3,2,3,3,3,3,
        3,3,2,3,2,3,3,2,
        3,3,3,3,2,3,2,3,
        2,2,3,3,1,0,3,3,
        3,3,3,3,2,1,2,3
      ], maxRemaining: 125, bestEscape: 32
    },
    {
      kind: 'avalanche', order: 6, size: 9, title: 'The long cascade', selected: 40, marked: [], budget: 1,
      start: [
        3,2,3,2,2,3,2,3,3,
        3,3,3,3,3,3,2,0,2,
        3,3,3,1,3,1,3,3,3,
        1,3,3,3,2,2,3,3,1,
        3,2,0,2,2,2,2,3,2,
        2,3,3,2,3,3,3,3,1,
        2,3,3,1,2,3,3,3,2,
        2,2,2,3,3,3,2,2,1,
        2,3,3,2,2,3,3,2,3
      ], maxRemaining: 160, bestEscape: 36
    }
  );
  for (const level of levels) if (level.kind === 'avalanche') level.prompt = `Add one grain to make ${level.bestEscape} grains fall off the board.`;
  const tutorialCount = levels.filter(level => level.kind === 'tutorial').length;
  const categories = { tutorial: 'Tutorial', avalanche: 'Avalanche', match: 'Match the Pattern' };
  // Keep stored level indices stable while ordering the player-facing progression.
  const levelOrder = Object.keys(categories).flatMap(kind => levels.flatMap((level, index) => level.kind === kind ? [index] : []).sort((a, b) => (levels[a].order ?? a) - (levels[b].order ?? b)));

  class SandpileGame {
    constructor(progress = {}) {
      this.completed = new Set(Array.isArray(progress.completed) ? progress.completed.filter(i => Number.isInteger(i) && i >= 0 && i < levels.length) : []);
      this.best = {};
      for (const [index, score] of Object.entries(progress.best || {})) if (levels[index] && !levels[index].randomStart && Number.isSafeInteger(score) && score >= 0) this.best[index] = score;
      this.load(this.tutorialComplete ? levelOrder[tutorialCount] : Array.from({length: tutorialCount}, (_, i) => i).find(i => !this.completed.has(i)));
    }
    static migrateProgress(progress) {
      if (progress.version === 6) return progress;
      if (progress.version !== 5) {
        if (progress.version === 4) {
          // The former 5 × 5 identity was replaced by a random 3 × 3 puzzle.
          const completed = (Array.isArray(progress.completed) ? progress.completed : []).filter(index => index !== 8);
          const best = { ...progress.best }; delete best[8];
          progress = { completed, best };
        } else {
          const indices = progress.version === 3 ? [0, 1, 2, 3, 4, 5] : [0, null, 1, 2, null, 3, 4, 5];
          const completed = (Array.isArray(progress.completed) ? progress.completed : []).flatMap(index => Number.isInteger(index) && indices[index] != null ? [indices[index]] : []);
          const best = {};
          for (const [index, score] of Object.entries(progress.best || {})) if (indices[index] != null) best[indices[index]] = score;
          progress = { completed, best };
        }
      }
      // Remove former Patterns 4, 6, and 7; retain achievements by board identity.
      const indices = [0, 1, 2, 3, 4, 5, 6, null, 7, null, null, 8, 9, 10, 11, 12];
      const completed = (Array.isArray(progress.completed) ? progress.completed : []).flatMap(index => Number.isInteger(index) && indices[index] != null ? [indices[index]] : []);
      const best = {};
      for (const [index, score] of Object.entries(progress.best || {})) if (indices[index] != null) best[indices[index]] = score;
      return { version: 6, completed, best };
    }
    static levelsForCategory(kind) { return levelOrder.filter(index => levels[index].kind === kind); }
    get hideHighlights() { return !!this.level.hideHighlightsOnWin && this.status === 'won'; }
    get level() { return levels[this.index]; }
    get tutorialComplete() { return Array.from({length: tutorialCount}, (_, i) => i).every(i => this.completed.has(i)); }
    get allComplete() { return this.completed.size === levels.length; }
    get nextIndex() { return levelOrder[levelOrder.indexOf(this.index) + 1]; }
    get visibleLevels() { return SandpileGame.levelsForCategory(this.level.kind); }
    get remaining() { return this.moveLimit - this.used; }
    get progress() { return { version: 6, completed: [...this.completed], best: Object.fromEntries(Object.entries(this.best).filter(([index]) => !levels[index].randomStart)) }; }
    canLoad(index) {
      if (!Number.isInteger(index) || !levels[index]) return false;
      return index < tutorialCount ? Array.from({length: index}, (_, i) => i).every(i => this.completed.has(i)) : this.tutorialComplete;
    }
    load(index, random = Math.random) {
      if (!this.canLoad(index)) return false;
      this.index = index; this.used = 0; this.toppled = new Set();
      this.status = 'playing'; this.hint = ''; this.result = ''; this.scored = false;
      const level = this.level;
      this.start = level.randomStart ? Array.from({length: level.size ** 2}, () => Math.floor(random() * 4)) : level.start ? [...level.start] : Array(level.size ** 2).fill(0);
      if (level.seeds) level.seeds.forEach(([square, count]) => { this.start[square] = count; });
      this.moveLimit = level.kind === 'match' ? level.optimalMoves : level.budget ?? Infinity;
      if (level.randomStart) {
        // A fresh puzzle must need a move, even if the random draw hits the target.
        if (this.start.every((count, i) => count === level.target[i])) this.start[level.selected] = (this.start[level.selected] + 1) % 4;
        const path = Solver.shortestPath(level.size, this.start, level.target);
        const skip = Math.max(0, path.length - level.maxSolutionMoves);
        if (skip) {
          // A suffix of a shortest path is itself shortest. Advance harder draws
          // to a stable board exactly six moves away, without unbounded rerolls.
          const pile = new Model(level.size); pile.cells.set(this.start);
          path.slice(0, skip).forEach(square => pile.add(square));
          pile.stabilize(); this.start = Array.from(pile.cells);
        }
        this.moveLimit = path.length - skip;
        delete this.best[index];
      }
      return true;
    }
    canDrop(index) {
      return this.status === 'playing' && this.remaining > 0 && Number.isInteger(index) && index >= 0 && index < this.level.size ** 2;
    }
    drop(index) {
      if (!this.canDrop(index)) return false;
      this.used++; this.hint = ''; return true;
    }
    recordTopplings(sites) { sites.forEach(index => this.toppled.add(index)); }
    finish(model) {
      if (this.status !== 'playing') return false;
      const level = this.level;
      let won;
      if (level.kind === 'tutorial') {
        if (!level.goal(model, this.toppled)) return false;
        won = true;
        this.result = level.success;
      } else if (level.kind === 'match') {
        if (!this.used || !model.cells.every((count, i) => count === level.target[i])) return false;
        won = true;
        this.best[this.index] = Math.min(this.best[this.index] ?? Infinity, this.used);
        this.result = `Matched in ${this.used} ${this.used === 1 ? 'move' : 'moves'}! Perfect: that is the fewest possible.`;
      } else if (level.kind === 'avalanche') {
        if (this.remaining > 0) return false;
        this.best[this.index] = Math.max(this.best[this.index] ?? 0, model.escaped);
        won = model.grains <= level.maxRemaining;
        this.result = `${model.escaped} of ${level.bestEscape} grains fell off.${won ? ' Goal reached!' : ''}`;
      }
      this.status = won ? 'won' : 'retry';
      if (won) this.completed.add(this.index);
      return true;
    }
    get message() {
      if (this.status !== 'playing') return this.result;
      if (this.hint) return this.hint;
      if (this.level.kind === 'tutorial') return this.level.prompt;
      if (this.level.kind === 'match') return `${this.used} moves so far. Compare the numbers with the target.`;
      if (!this.remaining) return 'Watch what happens…';
      return this.remaining === 1 ? 'One grain. Choose your square!' : `${this.remaining} grains left. Tap to add one at a time.`;
    }
  }
  SandpileGame.levels = levels;
  SandpileGame.categories = categories;
  if (typeof module !== 'undefined' && module.exports) module.exports = SandpileGame;
  else root.SandpileGame = SandpileGame;
})(typeof globalThis !== 'undefined' ? globalThis : this);
