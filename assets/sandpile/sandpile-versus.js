/* Two-player ownership layered over the ordinary open-edge sandpile rules. */
(function (root) {
  'use strict';
  class SandpileVersus {
    constructor(model) {
      this.model = model;
      this.owners = new Uint8Array(model.cells.length); // 0 empty, 1 red, 2 blue
      this.turn = 1;
      this.moves = 0;
      this.winner = 0;
      this.resolving = false;
      this.pending = null;
      this.hint = '';
    }

    static playerName(player) { return player === 1 ? 'Red' : 'Blue'; }

    canDrop(index) {
      return !this.winner && !this.resolving && Number.isInteger(index) && index >= 0 && index < this.owners.length && (!this.model.cells[index] || this.owners[index] === this.turn);
    }

    begin(index) {
      if (!this.canDrop(index)) {
        this.hint = this.winner ? `${SandpileVersus.playerName(this.winner)} wins! Start a new match to play again.` : this.resolving ? 'Let the cascade finish before the next turn.' : 'Choose an empty square or one of your own color.';
        return false;
      }
      this.pending = index;
      this.resolving = true;
      this.moves++;
      this.hint = '';
      return true;
    }

    land() {
      if (this.pending === null) return;
      this.model.add(this.pending, 1);
      this.owners[this.pending] = this.turn;
      this.pending = null;
    }

    step(sites, counts) {
      this.model.step(sites, counts);
      // A turn starts from a stable board. Every unstable pile in its cascade
      // belongs to the mover, including enemy piles captured by earlier waves.
      for (const index of sites) {
        for (const neighbor of this.model.neighbors(index)) {
          if (neighbor >= 0) this.owners[neighbor] = this.turn;
        }
      }
      this.owners.forEach((owner, index) => { if (!this.model.cells[index]) this.owners[index] = 0; });
    }

    finish() {
      if (!this.resolving || this.pending !== null || this.model.unstable().length) return false;
      this.resolving = false;
      this.hint = '';
      const present = new Set(this.owners.filter(owner => owner !== 0));
      // Each player must get an opening move before elimination can win.
      if (this.moves >= 2 && present.size === 1) this.winner = [...present][0];
      if (!this.winner) this.turn = 3 - this.turn;
      return true;
    }

    get message() {
      if (this.hint) return this.hint;
      if (this.winner) return `All the sand is ${SandpileVersus.playerName(this.winner).toLowerCase()}. Play again?`;
      return this.resolving ? 'Watch the cascade. The next turn starts when the board settles.' : 'Drop one grain on an empty square or your own color. Capture every enemy pile to win.';
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = SandpileVersus;
  else root.SandpileVersus = SandpileVersus;
})(typeof globalThis !== 'undefined' ? globalThis : this);
