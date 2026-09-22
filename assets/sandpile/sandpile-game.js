/* Tutorial and three game categories. Rules are separate from the renderer and animation. */
(function (root) {
  'use strict';
  const levels = [
    {
      title: 'The tipping point',
      prompt: 'Two grains are already here. Add sand to the outlined square until it topples.',
      seeds: [[12, 2]], marked: [12], allowed: [12], selected: 12, budget: 2,
      success: 'Four is the tipping point! The stack sends one grain to each neighbor.',
      failure: 'A stack topples when it reaches four grains.',
      goal: (model, toppled) => toppled.has(12)
    },
    {
      title: 'Start a chain reaction',
      prompt: 'Make all three outlined stacks topple using just one grain.',
      hideHighlightsOnWin: true, seeds: [[11, 3], [12, 3], [13, 3]], marked: [11, 12, 13], selected: 12, budget: 1,
      success: 'A chain reaction! One topple can set off the next, and the next.',
      failure: 'Try a stack that already has three grains. Its neighbors are ready, too.',
      goal: (model, toppled) => [11, 12, 13].every(index => toppled.has(index))
    },
    {
      title: 'Over the edge',
      prompt: 'Tap the outlined corner and watch the sand fall off the edge.',
      seeds: [[24, 3]], marked: [24], allowed: [24], selected: 24, budget: 1,
      success: 'Two fell off! A corner has two neighbors on the board and two ways out.',
      failure: 'Add a grain to the corner stack to send sand over the edge.',
      goal: model => model.escaped === 2
    }
  ];

  levels.forEach(level => Object.assign(level, { kind: 'tutorial', size: 5 }));
  levels.push(
    {
      kind: 'match', size: 3, title: 'Four neighbors', selected: 4, seeds: [[4, 2]], marked: [],
      prompt: 'Make your board match the target. Each grain is one move. Can you do it in two?',
      target: [0,1,0, 1,0,1, 0,1,0], optimalMoves: 2
    },
    {
      kind: 'match', size: 5, title: 'Find the two drops', selected: 12, marked: [],
      prompt: 'Match every square of the target in as few moves as possible. Two moves is perfect.',
      start: [3,3,3,2,2, 2,3,2,3,2, 1,3,0,3,3, 3,3,2,2,3, 0,2,3,1,3],
      target: [1,2,2,3,0, 1,3,3,1,2, 0,3,1,0,3, 1,3,2,3,2, 2,0,2,0,1], optimalMoves: 2
    },
    {
      kind: 'avalanche', size: 5, title: 'One grain, big avalanche', selected: 12, marked: [], budget: 1,
      prompt: 'Add one grain. Send as much sand over the edge as you can: leave 44 grains or fewer on the board.',
      start: [1,3,3,3,2, 3,1,3,3,2, 1,3,3,1,3, 1,1,2,3,3, 1,2,3,2,3], maxRemaining: 44, bestEscape: 13
    },
    ...[3, 5].map(size => ({
      kind: 'mountain', size, title: `${size} × ${size} mountain`, selected: Math.floor(size * size / 2),
      seeds: [], marked: [Math.floor(size * size / 2)], allowed: [Math.floor(size * size / 2)],
      prompt: 'Add sand only in the middle. Keep as much as possible without spilling, then choose “Stop here.”',
      maxSafe: size === 3 ? 15 : 43
    }))
  );
  const tutorialCount = levels.filter(level => level.kind === 'tutorial').length;
  const categories = { tutorial: 'Tutorial', match: 'Match the Pattern', avalanche: 'Avalanche', mountain: 'Mountain' };

  class SandpileGame {
    constructor(progress = {}) {
      this.completed = new Set(Array.isArray(progress.completed) ? progress.completed.filter(i => Number.isInteger(i) && i >= 0 && i < levels.length) : []);
      this.best = {};
      for (const [index, score] of Object.entries(progress.best || {})) if (levels[index] && Number.isSafeInteger(score) && score >= 0) this.best[index] = score;
      this.load(this.tutorialComplete ? tutorialCount : Array.from({length: tutorialCount}, (_, i) => i).find(i => !this.completed.has(i)));
    }
    static migrateProgress(progress) {
      if (progress.version === 3) return progress;
      // Preserve achievements from the old five-step tutorial by level identity.
      const indices = [0, null, 1, 2, null, 3, 4, 5, 6, 7];
      const completed = (Array.isArray(progress.completed) ? progress.completed : []).flatMap(index => Number.isInteger(index) && indices[index] != null ? [indices[index]] : []);
      const best = {};
      for (const [index, score] of Object.entries(progress.best || {})) if (indices[index] != null) best[indices[index]] = score;
      return { version: 3, completed, best };
    }
    get hideHighlights() { return !!this.level.hideHighlightsOnWin && this.status === 'won'; }
    get level() { return levels[this.index]; }
    get tutorialComplete() { return Array.from({length: tutorialCount}, (_, i) => i).every(i => this.completed.has(i)); }
    get allComplete() { return this.completed.size === levels.length; }
    get visibleLevels() { return levels.flatMap((level, i) => level.kind === this.level.kind ? [i] : []); }
    get remaining() { return this.level.budget === undefined ? Infinity : this.level.budget - this.used; }
    get progress() { return { version: 3, completed: [...this.completed], best: this.best }; }
    canLoad(index) {
      if (!Number.isInteger(index) || !levels[index]) return false;
      return index < tutorialCount ? Array.from({length: index}, (_, i) => i).every(i => this.completed.has(i)) : this.tutorialComplete;
    }
    load(index) {
      if (!this.canLoad(index)) return false;
      this.index = index; this.used = 0; this.toppled = new Set();
      this.status = 'playing'; this.hint = ''; this.result = ''; this.scored = false;
      return true;
    }
    canDrop(index) {
      return this.status === 'playing' && this.remaining > 0 && Number.isInteger(index) && index >= 0 && index < this.level.size ** 2 && (!this.level.allowed || this.level.allowed.includes(index)) && (this.level.kind !== 'mountain' || this.used <= this.level.maxSafe);
    }
    drop(index) {
      if (!this.canDrop(index)) {
        if (this.status === 'playing' && this.remaining > 0) this.hint = 'Tap an outlined square for this challenge.';
        return false;
      }
      this.used++; this.hint = ''; return true;
    }
    recordTopplings(sites) { sites.forEach(index => this.toppled.add(index)); }
    finish(model, stop = false) {
      if (this.status !== 'playing') return false;
      const level = this.level;
      let won;
      if (level.kind === 'tutorial') {
        if (this.remaining > 0) return false;
        won = level.goal(model, this.toppled);
        this.result = won ? level.success : level.failure;
      } else if (level.kind === 'match') {
        if (!model.cells.every((count, i) => count === level.target[i])) return false;
        won = true;
        this.best[this.index] = Math.min(this.best[this.index] ?? Infinity, this.used);
        this.result = `Matched in ${this.used} moves! ${this.used === level.optimalMoves ? 'Perfect: that is the fewest possible.' : 'Try again for a two-move solution.'}`;
      } else if (level.kind === 'avalanche') {
        if (this.remaining > 0) return false;
        this.best[this.index] = Math.max(this.best[this.index] ?? 0, model.escaped);
        won = model.grains <= level.maxRemaining;
        this.result = `${model.escaped} grains escaped; ${model.grains} remain. ${won ? 'That is the biggest avalanche possible with one grain!' : 'Try again: aim for 44 grains or fewer left.'}`;
      } else {
        if (!stop && !model.escaped) return false;
        won = !model.escaped && this.used === level.maxSafe;
        if (!model.escaped) this.best[this.index] = Math.max(this.best[this.index] ?? 0, this.used);
        this.result = model.escaped ? `Sand spilled after ${this.used} grains. Try again and stop sooner.` : won ? `${this.used} grains, no spills! One more would fall off. You built the biggest mountain.` : `${this.used} grains saved. There is room for more! Try again for the biggest mountain.`;
      }
      this.status = won ? 'won' : 'retry';
      if (won) this.completed.add(this.index);
      return true;
    }
    get message() {
      if (this.status !== 'playing') return this.result;
      if (this.hint) return this.hint;
      if (this.level.kind === 'mountain') return `${this.used} grains added. You decide when to stop.`;
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
