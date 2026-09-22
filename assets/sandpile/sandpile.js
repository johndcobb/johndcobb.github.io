/* Isometric canvas view and animation controller. No dependencies or build step. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('sandpile');
  const ctx = canvas.getContext('2d');
  let size = 19;
  let center = Math.floor(size * size / 2);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = { top: '#efac69', seam: '#af693732', redTop: '#f07861', green: '#35624e' };
  const playerColors = {
    1: { top: '#d85a4d', dark: [132, 43, 39], bright: [208, 79, 64], shades: ['#f4b2a8', '#d85a4d', '#a6352d'] },
    2: { top: '#4f91d2', dark: [34, 67, 113], bright: [67, 130, 191], shades: ['#afd3f3', '#4f91d2', '#245c9a'] }
  };
  let model, selected = center, phase = null, drops = [], hold = null, active = new Set();
  let width = 0, height = 0;
  const view = new SandpileView(size);
  let particles = [], rotation = null, gesture = null;
  const pointers = new Set();
  let hitAreas = [], frame = 0, previousTime = 0, dirty = true, ticking = false;
  let avalancheStart = 0;
  let mode = 'sandbox';
  let landing = false, demoElapsed = 0, demoDrops = 0, resetHold = null;
  const saved = { sandbox: null, game: null, versus: null };
  let versus = null;
  let menuKind = 'tutorial';
  const progressKey = 'sandpile-progress-v2';
  function readProgress() {
    try { const data = JSON.parse(window.localStorage.getItem(progressKey)); return data && typeof data === 'object' ? SandpileGame.migrateProgress(data) : {}; } catch { return {}; }
  }
  let game = new SandpileGame(readProgress());
  function saveProgress() {
    try { window.localStorage.setItem(progressKey, JSON.stringify(game.progress)); } catch { /* Private browsing can disable storage. */ }
  }

  function showWelcome() {
    // Keep the exhibit animation separate from both playable boards.
    saved.sandbox = captureState();
    landing = true; demoElapsed = 0; demoDrops = 0;
    $('app').classList.add('landing-active');
    $('welcome').hidden = false;
    $('app-bar').inert = $('workspace').inert = true;
    size = 13; center = Math.floor(size * size / 2); view.size = size;
    model = new Sandpile(size);
    // Several settled heaps leave gaps and varied stack heights for the sign.
    model.add(center, 300);
    for (const offset of [-2 * size - 3, -size + 3, 3 * size + 1]) model.add(center + offset, 80);
    model.stabilize();
    model.cells[center] = 3;
    model.topplings = 0; model.escaped = 0;
    selected = -1; phase = null; drops = []; active = new Set(); particles = []; rotation = null;
    view.angle = -.25; view.pitch = SandpileView.isometricPitch; view.topLocked = false; view.zoom = .88;
    $('speed').value = '1';
    $('welcome').focus({ preventScroll: true });
    resize();
  }

  function startParticipant() {
    if (!landing) return;
    landing = false;
    $('welcome').hidden = true;
    $('app').classList.remove('landing-active');
    $('app-bar').inert = $('workspace').inert = false;
    restoreState(saved.sandbox);
    game.load(0);
    switchMode('game');
    canvas.focus({ preventScroll: true });
  }

  function cancelParticipantReset() {
    resetHold = null;
    $('participant-reset').style.setProperty('--reset-progress', '0');
    $('participant-label').textContent = 'Hold 3 seconds to reset';
  }

  function resetParticipant() {
    cancelParticipantReset(); stopPouring();
    $('participant-dialog').close();
    if ($('help').open) $('help').close();
    game = new SandpileGame();
    saveProgress();
    saved.game = null; saved.sandbox = null; saved.versus = null; versus = null;
    mode = 'sandbox'; size = 19; center = Math.floor(size * size / 2); view.size = size;
    view.angle = 0; view.pitch = SandpileView.isometricPitch; view.topLocked = false; view.zoom = 1;
    rotation = null; gesture = null; pointers.clear(); hitAreas = [];
    canvas.classList.remove('rotating');
    $('app').classList.remove('game-active');
    $('level-header').hidden = true;
    if ($('level-menu').open) $('level-menu').close();
    menuKind = 'tutorial';
    $('app').classList.remove('versus-active');
    $('mode-versus').setAttribute('aria-pressed', 'false');
    $('versus-panel').hidden = true;
    $('mode-game').setAttribute('aria-pressed', 'true');
    $('mode-sandbox').setAttribute('aria-pressed', 'false');
    $('game-panel').hidden = $('game-actions').hidden = true;
    $('drop-size').value = '1'; $('speed').value = '1'; $('speed-value').textContent = '1×';
    updateTarget(); reset(true); showWelcome();
    $('announcement').textContent = 'Progress cleared. Ready for the next participant.';
  }

  // Inactive modes own their entire simulation, including unfinished animations.
  // No grains are added, stabilized, or lost while that mode is paused.
  function captureState() {
    return { model, versus, selected, phase, drops, active, particles, rotation, avalancheStart, angle: view.angle, pitch: view.pitch, topLocked: view.topLocked, zoom: view.zoom, speed: $('speed').value, dropSize: $('drop-size').value };
  }

  function restoreState(state) {
    ({ model, versus, selected, phase, drops, active, particles, rotation, avalancheStart } = state);
    size = model.size; center = Math.floor(size * size / 2); view.size = size;
    view.angle = state.angle; view.pitch = state.pitch; view.topLocked = state.topLocked; view.zoom = state.zoom;
    $('speed').value = state.speed; $('speed-value').textContent = `${state.speed}×`;
    $('drop-size').value = state.dropSize;
    updateAngle();
  }

  function switchMode(next) {
    if (mode === next) return;
    if ($('level-menu').open) $('level-menu').close();
    stopPouring();
    saved[mode] = captureState();
    mode = next;
    gesture = null; pointers.clear(); hitAreas = []; canvas.classList.remove('rotating');
    $('app').classList.toggle('game-active', mode === 'game');
    $('level-header').hidden = mode !== 'game';
    $('app').classList.toggle('versus-active', mode === 'versus');
    $('mode-versus').setAttribute('aria-pressed', String(mode === 'versus'));
    $('versus-panel').hidden = mode !== 'versus';
    $('mode-game').setAttribute('aria-pressed', String(mode === 'game'));
    $('mode-sandbox').setAttribute('aria-pressed', String(mode === 'sandbox'));
    $('game-panel').hidden = $('game-actions').hidden = mode !== 'game';
    $('board-subtitle').textContent = mode === 'game' ? `${SandpileGame.categories[game.level.kind]} · ${game.level.size} × ${game.level.size}` : mode === 'versus' ? 'Versus · 4 × 4 · open edges' : 'Abelian · 19 × 19 · open edges';
    $('canvas-help').textContent = mode === 'game' ? 'Blue outlines mark the challenge · Drag to orbit' : mode === 'versus' ? 'Tap an empty square or your color · Drag to orbit' : 'Tap to add · Drag any direction to orbit';
    $('drop').title = mode !== 'sandbox' ? 'Add one grain to the selected square' : 'Tap to drop; hold to keep pouring';
    if (saved[mode]) restoreState(saved[mode]);
    else {
      view.topLocked = true; view.angle = -Math.PI / 4; view.pitch = Math.PI / 2; view.zoom = 1;
      if (mode === 'versus') newMatch();
      else loadLevel(game.index);
    }
    previousTime = performance.now();
    updateTarget(); updateReadout(); resize();
    $('announcement').textContent = mode === 'game' ? `Level ${game.index + 1}. ${game.level.title}. ${game.level.prompt}` : mode === 'versus' ? `${$('versus-title').textContent}. ${versus.message}` : 'Sandbox resumed. Your pile and settings are restored.';
  }

  function newMatch() {
    hold = null; gesture = null; pointers.clear(); hitAreas = [];
    phase = null; drops = []; particles = []; active = new Set(); rotation = null; avalancheStart = 0;
    size = 4; center = 5; selected = center; view.size = size;
    model = new Sandpile(size); versus = new SandpileVersus(model);
    $('drop-size').value = '1'; $('speed').value = '1'; $('speed-value').textContent = '1×';
    canvas.classList.remove('rotating');
    updateTarget(); updateReadout(); updateAngle(); resize();
    $('announcement').textContent = 'New match. Red goes first. Choose an empty square.';
  }

  function updateVersus() {
    if (mode !== 'versus') return;
    const player = versus.winner || versus.turn, name = SandpileVersus.playerName(player);
    $('versus-title').textContent = versus.winner ? `${name} wins!` : versus.resolving ? `${name}’s cascade` : `${name}’s turn`;
    $('versus-panel').setAttribute('data-player', String(player));
    $('versus-message').textContent = versus.message;
    for (const [owner, id] of [[1, 'versus-red'], [2, 'versus-blue']]) {
      $(id).textContent = model.cells.reduce((sum, count, index) => sum + (versus.owners[index] === owner ? count : 0), 0);
    }
    $('drop').disabled = !versus.canDrop(selected);
    $('drop').setAttribute('data-player', String(player));
    $('drop-label').textContent = `Drop ${name.toLowerCase()}`;
    $('versus-new').textContent = versus.winner ? 'Play again' : 'New match';
    const owner = versus.owners[selected];
    $('square').textContent += owner ? ` · ${SandpileVersus.playerName(owner)}` : ' · Empty';
  }

  function loadLevel(index) {
    if (!game.load(index)) return;
    menuKind = game.level.kind;
    if ($('level-menu').open) { $('level-menu').close(); canvas.focus({ preventScroll: true }); }
    hold = null; gesture = null; pointers.clear(); hitAreas = [];
    phase = null; drops = []; particles = []; active = new Set(); rotation = null; avalancheStart = 0;
    size = game.level.size; center = Math.floor(size * size / 2); view.size = size;
    model = new Sandpile(size);
    if (game.level.start) model.cells.set(game.level.start);
    else game.level.seeds.forEach(([index, count]) => model.add(index, count));
    selected = game.level.selected;
    if (index === 0) { view.angle = 0; view.pitch = SandpileView.isometricPitch; view.topLocked = false; view.zoom = 1; }
    $('drop-size').value = '1'; $('speed').value = '1'; $('speed-value').textContent = '1×';
    updateTarget(); updateReadout(); updateAngle(); resize();
    $('announcement').textContent = `Level ${index + 1}. ${game.level.title}. ${game.level.prompt}`;
  }

  function updateTarget() {
    const target = mode === 'game' ? game.level.target : null;
    $('target-panel').hidden = !target;
    if (!target) return;
    $('target-grid').style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    $('target-grid').innerHTML = target.map(count => {
      const style = SandpileView.cellStyle(count);
      return `<span style="background:${style.fill};color:${style.ink}" aria-hidden="true">${count}</span>`;
    }).join('');
    $('target-grid').setAttribute('aria-label', `Target, ${size} by ${size}. Rows: ${Array.from({length: size}, (_, row) => target.slice(row * size, (row + 1) * size).join(', ')).join('; ')}.`);
  }

  function updateGame() {
    if (mode !== 'game') { $('drop').disabled = false; return; }
    const won = game.status === 'won', level = game.level, visible = game.visibleLevels;
    $('board-subtitle').textContent = `${SandpileGame.categories[level.kind]} · ${size} × ${size}`;
    $('game-title').textContent = level.kind === 'tutorial' ? 'Tutorial' : `${SandpileGame.categories[level.kind]} ${visible.indexOf(game.index) + 1}`;
    $('game-prompt').textContent = level.prompt;
    if ($('game-message').textContent !== game.message) $('game-message').textContent = game.message;
    $('game-panel').setAttribute('data-status', game.status);
    $('game-budget').textContent = Number.isFinite(game.remaining) ? `${game.remaining} ${game.remaining === 1 ? 'grain' : 'grains'} left` : `${game.used} ${level.kind === 'match' ? 'moves' : 'grains added'}`;
    $('game-best').textContent = game.best[game.index] === undefined ? '' : `Best: ${game.best[game.index]} ${level.kind === 'match' ? 'moves' : level.kind === 'avalanche' ? 'escaped' : 'saved'}`;
    $('game-retry').textContent = game.status === 'retry' ? 'Try again' : 'Start over';
    $('game-next').hidden = !won;
    const nextLevel = SandpileGame.levels[game.index + 1];
    $('game-next').textContent = !nextLevel ? 'Sandbox →' : nextLevel.kind !== level.kind ? `${SandpileGame.categories[nextLevel.kind]} →` : 'Next level →';
    $('game-stop').hidden = level.kind !== 'mountain' || game.status !== 'playing';
    $('game-stop').disabled = !!phase || drops.length > 0 || particles.length > 0;
    $('drop').disabled = !game.canDrop(selected);
    updateLevelMenu();
  }

  function menuLevels() {
    return SandpileGame.levels.flatMap((level, index) => level.kind === menuKind ? [index] : []);
  }

  function updateLevelMenu() {
    const visible = menuLevels();
    $('game-eyebrow').textContent = menuKind === 'tutorial' && game.tutorialComplete ? 'Tutorial complete!' : SandpileGame.categories[menuKind];
    for (const [kind, label] of Object.entries(SandpileGame.categories)) {
      const button = $(`category-${kind}`);
      const complete = kind === 'tutorial' ? game.tutorialComplete : SandpileGame.levels.every((item, index) => item.kind !== kind || game.completed.has(index));
      button.textContent = `${label}${complete ? ' ✓' : ''}`;
      button.disabled = kind !== 'tutorial' && !game.tutorialComplete;
      button.setAttribute('aria-pressed', String(menuKind === kind));
      button.setAttribute('aria-label', `${label}${complete ? ', complete' : ''}${button.disabled ? ', finish the tutorial to unlock' : ''}`);
    }
    for (let i = 0; i < 3; i++) {
      const button = $(`level-${i + 1}`), index = visible[i];
      button.hidden = index === undefined;
      if (index === undefined) continue;
      button.disabled = !game.canLoad(index);
      button.textContent = menuKind === 'tutorial' ? `${i + 1}. ${SandpileGame.levels[index].title}` : `${SandpileGame.categories[menuKind]} ${i + 1}`;
      button.setAttribute('aria-current', index === game.index ? 'step' : 'false');
      button.setAttribute('aria-label', `${menuKind === 'tutorial' ? 'Tutorial step' : 'Level'} ${i + 1}: ${SandpileGame.levels[index].title}${game.completed.has(index) ? ', complete' : ''}`);
      button.classList.toggle('complete', game.completed.has(index));
    }
  }

  function drawGameMarker(index, row, col, z) {
    if (mode !== 'game' || game.hideHighlights || !game.level.marked.includes(index)) return;
    const face = view.diamond(row + .1, col + .1, z, .8);
    polygon(face, null, '#fffef5', 5);
    polygon(face, null, '#397698', 2.5);
  }

  const visualHeight = grains => Math.min(grains, 8);
  const point = (row, col, z = 0) => view.point(row, col, z);
  const diamond = (row, col, z) => view.diamond(row, col, z);

  function sideColor(edge, red, owner = 0) {
    const normals = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const [x, y] = normals[edge];
    const c = Math.cos(view.angle), s = Math.sin(view.angle);
    const light = ((x * c - y * s - x * s - y * c) / Math.SQRT2 + 1) / 2;
    const dark = owner ? playerColors[owner].dark : red ? [175, 54, 45] : [167, 96, 51];
    const bright = owner ? playerColors[owner].bright : red ? [224, 88, 68] : [223, 151, 83];
    return `rgb(${dark.map((v, i) => Math.round(v + (bright[i] - v) * light)).join(',')})`;
  }

  function polygon(points, fill, stroke = null, lineWidth = 1) {
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }

  function countLabel(row, col, z, text) {
    const p = point(row + .5, col + .5, z);
    ctx.save(); ctx.font = '600 12px -apple-system, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#fffff8'; ctx.strokeText(String(text), p.x, p.y - 8);
    ctx.fillStyle = colors.green; ctx.fillText(String(text), p.x, p.y - 8); ctx.restore();
  }

  function setView(preset) {
    view.topLocked = preset === 'top';
    const pitch = preset === 'top' ? Math.PI / 2 : SandpileView.isometricPitch;
    moveCamera(view.angle, pitch);
    gesture = null; pointers.clear(); canvas.classList.remove('rotating');
    $('announcement').textContent = preset === 'top' ? 'Top down locked. Drag to rotate; choose Isometric to tilt again.' : 'Isometric camera position. Drag in any direction to orbit.';
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    hitAreas = [];
    const faces = [], blend = view.topBlend, above = Math.sin(view.pitch) >= 0;
    ctx.save(); ctx.shadowColor = '#65523920'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 10;
    polygon(view.diamond(0, 0, -.85, size), '#b17e4d'); ctx.restore();
    const edges = view.visibleEdges();
    const corners = (row, col, z, span = 1) => [[row, col, z], [row, col + span, z], [row + span, col + span, z], [row + span, col, z]];
    function face(vertices, fill, options = {}) {
      faces.push({ points: vertices.map(v => point(...v)), depth: vertices.reduce((sum, v) => sum + view.depth(...v), 0) / vertices.length, fill, ...options });
    }
    function sides(row, col, bottom, top, red = false, index = null, span = 1, opacity = 1, allowed = edges, owner = 0) {
      // Split tall walls at grain boundaries, so the painter's ordering stays
      // correct as the camera crosses the horizon or moves below the platform.
      for (let z = bottom; z < top; z += 1) {
        const lower = corners(row, col, z, span), upper = corners(row, col, Math.min(top, z + 1), span);
        for (const edge of allowed) {
          const next = (edge + 1) % 4;
          face([upper[edge], upper[next], lower[next], lower[edge]], sideColor(edge, red, owner), { index, opacity, stroke: colors.seam });
        }
      }
    }
    function grain(row, col, z, span, red, opacity = 1, label = null) {
      const owner = mode === 'versus' ? versus.turn : 0;
      sides(row, col, z, z + span, red, null, span, opacity, edges, owner);
      face(corners(row, col, above ? z + span : z, span), owner ? playerColors[owner].top : red ? colors.redTop : colors.top, { opacity, label: label ? { row, col, z: z + span, text: label } : null });
    }
    for (let index = 0; index < model.cells.length; index++) {
      const row = Math.floor(index / size), col = index % size;
      const grains = model.cells[index], stack = visualHeight(grains), red = active.has(index);
      const owner = mode === 'versus' ? versus.owners[index] : 0;
      const border = edges.filter(edge => [row === 0, col === size - 1, row === size - 1, col === 0][edge]);
      sides(row, col, -.85, 0, false, index, 1, 1, border);
      if (grains) sides(row, col, 0, stack, red, index, 1, 1, edges, owner);
      if (above) {
        face(corners(row, col, stack), grains ? (owner ? playerColors[owner].top : red ? colors.redTop : colors.top) : ((row + col) % 2 ? '#ebd4af' : '#efdcbc'), { index, cell: { row, col, z: stack, grains } });
      } else {
        // An opaque tiled underside also makes cell picking work from below.
        face(corners(row, col, -.85), '#b17e4d', { index, cell: { row, col, z: -.85, grains }, underside: true });
      }
    }
    if (!reducedMotion.matches) {
      for (const packet of drops) {
        const row = Math.floor(packet.index / size), col = packet.index % size;
        const progress = Math.min(1, packet.elapsed / packet.duration);
        const z = visualHeight(model.cells[packet.index]) + (1 - progress * progress) * 9;
        grain(row, col, z, 1, false, 1, packet.count > 1 ? `+${packet.count}` : null);
      }
      for (const particle of particles) {
        if (particle.age < 0) continue;
        const pose = SandpileView.escapePose(particle);
        grain(pose.row - .32, pose.col - .32, pose.z, .64, true, pose.opacity);
      }
      if (phase && phase.elapsed / phase.duration > .25) {
        const t = Math.min(1, (phase.elapsed / phase.duration - .25) / .75);
        for (const index of active) {
          const row = Math.floor(index / size), col = index % size;
          for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
            const nextRow = row + dr, nextCol = col + dc;
            if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue;
            const z = visualHeight(model.cells[index]) * (1 - t) + visualHeight(model.cells[nextRow * size + nextCol]) * t + Math.sin(t * Math.PI) * 1.7;
            grain(row + .35 + dr * t, col + .35 + dc * t, z, .3, true);
          }
        }
      }
    }
    faces.sort((a, b) => a.depth - b.depth);
    for (const f of faces) {
      ctx.save(); ctx.globalAlpha = f.opacity ?? 1;
      polygon(f.points, f.fill, f.stroke || '#fff6dd35', .65);
      if (f.index !== null && f.index !== undefined) hitAreas.push({ index: f.index, faces: [f.points] });
      if (f.cell) {
        const { row, col, z, grains } = f.cell;
        const owner = mode === 'versus' ? versus.owners[f.index] : 0;
        const style = owner ? { fill: playerColors[owner].shades[Math.min(2, grains - 1)], ink: grains === 1 ? '#263340' : '#fffdf5' } : SandpileView.cellStyle(grains);
        if (blend > 0 && !f.underside) {
          ctx.globalAlpha = blend;
          polygon(f.points, style.fill, '#fffdf565', .7);
          ctx.globalAlpha = 1;
        }
        drawGameMarker(f.index, row, col, z);
        if (active.has(f.index) && !f.underside) polygon(view.diamond(row + .06, col + .06, z, .88), null, mode === 'versus' ? '#ffe07d' : '#ffb2a1', Math.max(1.5, view.cellSize * .08));
        if (f.index === selected && !(mode === 'game' && game.hideHighlights)) {
          const selectedFace = view.diamond(row + .04, col + .04, z, .92);
          polygon(selectedFace, '#35624e15', '#fffef3', 4);
          polygon(selectedFace, null, colors.green, 2);
        }
        if (blend > 0 && !f.underside) {
          const p = point(row + .5, col + .5, z);
          ctx.globalAlpha = blend;
          const fontSize = Math.max(7, Math.min(mode !== 'sandbox' ? 24 : 13, view.cellSize * .5, view.cellSize * 1.5 / String(grains).length));
          ctx.font = `500 ${fontSize}px -apple-system, sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = style.ink;
          ctx.fillText(String(grains), p.x, p.y);
          ctx.globalAlpha = 1;
        }
        if (grains > 8 && !f.underside && blend < 1) {
          ctx.globalAlpha = 1 - blend; countLabel(row, col, z, grains); ctx.globalAlpha = 1;
        }
      }
      if (f.label) countLabel(f.label.row, f.label.col, f.label.z, f.label.text);
      ctx.restore();
    }
    if (blend > 0 && !reducedMotion.matches) for (const packet of drops) {
      const progress = Math.min(1, packet.elapsed / packet.duration);
      const span = .4 + .6 * progress, inset = (1 - span) / 2;
      ctx.save(); ctx.globalAlpha = blend;
      polygon(view.diamond(Math.floor(packet.index / size) + inset, packet.index % size + inset, visualHeight(model.cells[packet.index]), span), null, colors.green, 2);
      ctx.restore();
    }
  }

  function emitEscapingGrains() {
    if (reducedMotion.matches) return;
    for (const [i, index] of phase.sites.entries()) {
      const row = Math.floor(index / size), col = index % size;
      for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) {
        if (row + dr >= 0 && row + dr < size && col + dc >= 0 && col + dc < size) continue;
        for (let grain = 0; grain < Math.min(8, phase.counts[i]); grain++) particles.push({ row: row + .5, col: col + .5, dr, dc, z: visualHeight(model.cells[index]) - 1, age: -phase.duration * .25 - grain * 18, duration: 1100 });
      }
    }
  }

  function updateAngle() {
    const degrees = ((Math.round(view.angle * 180 / Math.PI) % 360) + 360) % 360;
    $('view-angle').textContent = `${degrees}°`;
    $('zoom-level').textContent = `${Math.round(view.zoom * 100)}%`;
    $('view-isometric').setAttribute('aria-pressed', String(!view.topLocked));
    $('view-top').setAttribute('aria-pressed', String(view.topLocked));
    $('height-legend').hidden = mode === 'versus' || view.topBlend < .01;
    $('height-legend').style.opacity = view.topBlend;
    $('view-home').title = `Reset camera · rotation ${degrees}°, tilt ${Math.round(view.pitch * 180 / Math.PI) % 360}°`;
  }

  const nearestAngle = (from, target) => from + Math.atan2(Math.sin(target - from), Math.cos(target - from));

  function moveCamera(angle, pitch) {
    pitch = view.topLocked ? Math.PI / 2 : SandpileView.clampPitch(pitch);
    rotation = reducedMotion.matches ? null : { from: view.angle, to: angle, fromPitch: view.pitch, toPitch: pitch, elapsed: 0 };
    if (!rotation) { view.angle = angle; view.pitch = pitch; }
    updateAngle(); redraw();
  }

  function turn(delta, home = false) {
    moveCamera(home ? nearestAngle(view.angle, view.topLocked ? -Math.PI / 4 : 0) : (rotation ? rotation.to : view.angle) + delta, home ? SandpileView.isometricPitch : (rotation ? rotation.toPitch : view.pitch));
  }

  function updateReadout() {
    if (landing) return;
    $('square').textContent = `Square ${Math.floor(selected / size) + 1}, ${selected % size + 1}`;
    $('height').textContent = model.cells[selected];
    $('grain-label').textContent = model.cells[selected] === 1 ? 'grain' : 'grains';
    for (const name of ['grains', 'topplings', 'escaped']) $(name).textContent = model[name].toLocaleString();
    const incoming = drops.reduce((sum, packet) => sum + packet.count, 0);
    $('queue').textContent = hold ? 'Pouring · release to stop' : incoming ? `+${incoming} incoming` : '';
    $('drop-label').textContent = `Drop ${$('drop-size').value}`;
    $('state').textContent = active.size ? `${active.size} toppling` : drops.length ? 'Dropping' : particles.length ? 'Grains falling' : 'Stable';
    $('state').classList.toggle('active', active.size > 0);
    updateGame();
    updateVersus();
  }

  function beginNextPhase() {
    const sites = model.unstable();
    active = new Set(sites);
    if (sites.length) {
      // Capture the entire wave before new drops arrive. A new arrival cannot
      // secretly join a toppling that has already started its red animation.
      phase = { type: 'topple', sites, counts: sites.map(index => Math.floor(model.cells[index] / 4)), elapsed: 0, duration: reducedMotion.matches ? 90 : 220 };
      emitEscapingGrains();
      // Bound decorative work during sustained pouring; counters remain exact.
      if (particles.length > 512) particles.splice(0, particles.length - 512);
    } else {
      phase = null;
      if (!drops.length && !landing) {
        const count = model.topplings - avalancheStart;
        $('announcement').textContent = `The pile is stable. ${count} ${count === 1 ? 'toppling' : 'topplings'} in this reaction. ${model.grains} grains on the board.`;
      }
    }
    updateReadout();
  }

  function tick(now) {
    frame = 0; ticking = true;
    const elapsed = Math.min(64, now - previousTime);
    previousTime = now;
    if (resetHold) {
      resetHold.elapsed += elapsed;
      const progress = Math.min(1, resetHold.elapsed / 3000);
      $('participant-reset').style.setProperty('--reset-progress', String(progress));
      $('participant-label').textContent = `Keep holding… ${Math.max(1, Math.ceil((3000 - resetHold.elapsed) / 1000))}`;
      if (progress === 1) resetParticipant();
    }
    if (landing && !reducedMotion.matches && !document.hidden) {
      view.angle = (view.angle + elapsed * .00009) % (Math.PI * 2);
      // Give each reaction time to settle, including grains falling off the edge.
      demoElapsed = !phase && !drops.length && !particles.length ? demoElapsed + elapsed : 0;
      if (demoElapsed >= 1000) {
        demoElapsed = 0;
        const offset = [0, 0, -1, 0, 1, -size, 0, size][demoDrops++ % 8];
        drops.push({ index: center + offset, count: 1, elapsed: 0, duration: 650 });
      }
      dirty = true;
    }
    if (hold) {
      hold.elapsed += elapsed;
      if (hold.elapsed >= hold.next) { drop(hold.index, hold.count); hold.next += 160; }
    }
    if (rotation) {
      rotation.elapsed += elapsed;
      const t = Math.min(1, rotation.elapsed / 360);
      view.angle = rotation.from + (rotation.to - rotation.from) * (1 - (1 - t) ** 3);
      view.pitch = rotation.fromPitch + (rotation.toPitch - rotation.fromPitch) * (1 - (1 - t) ** 3);
      if (t === 1) rotation = null;
      updateAngle(); dirty = true;
    }
    if (particles.length) {
      for (const particle of particles) particle.age += elapsed * Number($('speed').value);
      particles = reducedMotion.matches ? [] : particles.filter(particle => particle.age < particle.duration);
      if (!particles.length) updateReadout();
      dirty = true;
    }
    if (drops.length) {
      for (const packet of drops) packet.elapsed += elapsed;
      const landed = drops.filter(packet => packet.elapsed >= packet.duration);
      drops = drops.filter(packet => packet.elapsed < packet.duration);
      for (const packet of landed) {
        if (mode === 'versus') versus.land();
        else model.add(packet.index, packet.count);
      }
      if (landed.length) {
        if (!phase) beginNextPhase();
        else updateReadout();
      }
      dirty = true;
    }
    if (phase) {
      phase.elapsed += elapsed * Number($('speed').value);
      if (phase.elapsed >= phase.duration) {
        if (mode === 'versus') versus.step(phase.sites, phase.counts);
        else model.step(phase.sites, phase.counts);
        if (mode === 'game') game.recordTopplings(phase.sites);
        beginNextPhase();
      }
      dirty = true;
    }
    if (mode === 'game' && !phase && !drops.length && !particles.length && game.finish(model)) {
      saveProgress(); updateReadout(); dirty = true;
      $('announcement').textContent = `${game.status === 'won' ? 'Level complete! ' : ''}${game.message}`;
    }
    if (mode === 'versus' && !phase && !drops.length && !particles.length && versus.finish()) {
      updateReadout(); dirty = true;
      $('announcement').textContent = `${$('versus-title').textContent}. ${versus.message}`;
    }
    if (dirty) { render(); dirty = false; }
    ticking = false;
    if (phase || drops.length || particles.length || rotation || hold || resetHold || (landing && !reducedMotion.matches && !document.hidden)) frame = requestAnimationFrame(tick);
  }

  function redraw() {
    dirty = true;
    if (!frame && !ticking) { previousTime = performance.now(); frame = requestAnimationFrame(tick); }
  }

  function drop(index = selected, count = Number($('drop-size').value)) {
    if (landing) return;
    if (mode === 'versus') {
      count = 1;
      if (!versus.begin(index)) { updateReadout(); redraw(); return; }
    }
    if (mode === 'game') {
      count = 1;
      if (!game.drop(index)) { updateReadout(); redraw(); return; }
    }
    if (![1, 5, 10, 25, 50, 100].includes(count)) return;
    if (!phase && !drops.length) avalancheStart = model.topplings;
    // Each input gets a short, independent flight, even during an avalanche.
    drops.push({ index, count, elapsed: 0, duration: reducedMotion.matches ? 32 : 180 });
    updateReadout(); redraw();
  }

  function stopPouring() {
    hold = null; $('drop').classList.remove('pouring'); updateReadout();
  }

  function reset(pattern) {
    if (mode !== 'sandbox') return;
    phase = null; drops = []; particles = []; hold = null; $('drop').classList.remove('pouring'); active.clear(); selected = center;
    model = new Sandpile(size);
    if (pattern) {
      model.add(center, 1800);
      model.stabilize();
      // A center with three grains invites a first-click demonstration.
      model.add(center, 3 - model.cells[center]);
    }
    model.topplings = 0; model.escaped = 0; avalancheStart = 0;
    updateReadout();
    $('announcement').textContent = pattern ? 'Starting pattern restored. Center square selected.' : 'Board cleared. Center square selected.';
    redraw();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    view.resize(width, height);
    redraw();
  }

  function inside(p, vertices) {
    let hit = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const a = vertices[i], b = vertices[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) hit = !hit;
    }
    return hit;
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    const p = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    for (let i = hitAreas.length - 1; i >= 0; i--) {
      if (hitAreas[i].faces.some(face => inside(p, face))) return hitAreas[i].index;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointers.add(event.pointerId);
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size > 1) { if (gesture) gesture.cancelled = true; return; }
    rotation = null;
    if (view.topLocked) view.pitch = Math.PI / 2;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, lastY: event.clientY, angle: view.angle, moved: false, cancelled: false };
  });
  canvas.addEventListener('pointermove', event => {
    if (gesture) {
      if (gesture.id !== event.pointerId || gesture.cancelled) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (Math.hypot(dx, dy) > 8) gesture.moved = true;
      if (gesture.moved) {
        view.angle = gesture.angle - dx * .008;
        if (!view.topLocked) view.pitch -= (event.clientY - gesture.lastY) * .008;
        gesture.lastY = event.clientY;
        canvas.classList.add('rotating'); updateAngle(); redraw();
      }
      return;
    }
    if (event.pointerType === 'touch' || pointers.size) return;
    const index = pick(event);
    if (index !== null && index !== selected) { selected = index; updateReadout(); redraw(); }
  });
  function finishPointer(event, cancelled = false) {
    pointers.delete(event.pointerId);
    if (gesture?.id !== event.pointerId) return;
    const tap = !cancelled && !gesture.cancelled && !gesture.moved && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 8;
    gesture = null; canvas.classList.remove('rotating');
    if (tap) {
      const index = pick(event);
      if (index !== null) { selected = index; drop(index); canvas.focus({ preventScroll: true }); }
    }
  }
  canvas.addEventListener('pointerup', event => finishPointer(event));
  canvas.addEventListener('pointercancel', event => finishPointer(event, true));
  canvas.addEventListener('lostpointercapture', event => finishPointer(event, true));
  canvas.addEventListener('keydown', event => {
    let row = Math.floor(selected / size), col = selected % size;
    switch (event.key) {
      case 'q': case 'Q': event.preventDefault(); turn(-Math.PI / 2); return;
      case 'e': case 'E': event.preventDefault(); turn(Math.PI / 2); return;
      case 'w': case 'W': event.preventDefault(); moveCamera(view.angle, (rotation ? rotation.toPitch : view.pitch) + Math.PI / 12); return;
      case 's': case 'S': event.preventDefault(); moveCamera(view.angle, (rotation ? rotation.toPitch : view.pitch) - Math.PI / 12); return;
      case 'ArrowUp': row = Math.max(0, row - 1); break;
      case 'ArrowDown': row = Math.min(size - 1, row + 1); break;
      case 'ArrowLeft': col = Math.max(0, col - 1); break;
      case 'ArrowRight': col = Math.min(size - 1, col + 1); break;
      case ' ': case 'Enter': event.preventDefault(); drop(); return;
      default: return;
    }
    event.preventDefault();
    selected = row * size + col; updateReadout(); redraw();
    $('announcement').textContent = `Square ${row + 1}, ${col + 1}, ${model.cells[selected]} grains.`;
  });
  function zoomBy(factor) {
    view.zoom *= factor; hitAreas = []; updateAngle(); redraw();
  }
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    zoomBy(Math.exp(-Math.max(-500, Math.min(500, event.deltaY * unit)) * .0015));
  }, { passive: false });
  $('zoom-in').addEventListener('click', () => zoomBy(1.2));
  $('zoom-out').addEventListener('click', () => zoomBy(1 / 1.2));
  $('zoom-reset').addEventListener('click', () => { view.zoom = 1; updateAngle(); redraw(); });
  $('view-isometric').addEventListener('click', () => setView('isometric'));
  $('view-top').addEventListener('click', () => setView('top'));
  $('rotate-left').addEventListener('click', () => turn(-Math.PI / 2));
  $('rotate-right').addEventListener('click', () => turn(Math.PI / 2));
  $('view-home').addEventListener('click', () => turn(0, true));
  $('drop-size').addEventListener('change', updateReadout);
  $('drop').addEventListener('pointerdown', event => {
    if (event.button !== 0 || hold) return;
    if (mode !== 'sandbox') { drop(); return; }
    hold = { index: selected, count: Number($('drop-size').value), elapsed: 0, next: 350 };
    $('drop').setPointerCapture(event.pointerId); $('drop').classList.add('pouring');
    drop(hold.index, hold.count);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('drop').addEventListener(type, stopPouring);
  $('drop').addEventListener('pointermove', event => {
    if (!hold) return;
    const rect = $('drop').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) stopPouring();
  });
  // Pointer input was handled on press; keyboard and assistive clicks still work.
  $('drop').addEventListener('click', event => { if (!event.detail) drop(); });
  $('drop').addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('blur', () => { stopPouring(); cancelParticipantReset(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopPouring(); cancelParticipantReset(); }
    else redraw();
  });
  $('clear').addEventListener('click', () => reset(false));
  $('pattern').addEventListener('click', () => reset(true));
  $('mode-game').addEventListener('click', () => switchMode('game'));
  $('mode-sandbox').addEventListener('click', () => switchMode('sandbox'));
  $('mode-versus').addEventListener('click', () => switchMode('versus'));
  $('versus-new').addEventListener('click', () => { if (mode === 'versus') newMatch(); });
  $('game-retry').addEventListener('click', () => { if (mode === 'game') loadLevel(game.index); });
  $('game-next').addEventListener('click', () => {
    if (mode !== 'game' || game.status !== 'won') return;
    if (game.index === SandpileGame.levels.length - 1) switchMode('sandbox');
    else loadLevel(game.index + 1);
  });
  $('game-stop').addEventListener('click', () => {
    if (mode !== 'game' || game.level.kind !== 'mountain' || phase || drops.length || particles.length) return;
    if (game.finish(model, true)) { saveProgress(); updateReadout(); redraw(); }
  });
  for (let i = 0; i < 3; i++) $(`level-${i + 1}`).addEventListener('click', () => { if (mode === 'game') loadLevel(menuLevels()[i]); });
  for (const kind of Object.keys(SandpileGame.categories)) $(`category-${kind}`).addEventListener('click', () => {
    if (mode !== 'game' || (kind !== 'tutorial' && !game.tutorialComplete)) return;
    menuKind = kind; updateLevelMenu();
  });
  $('speed').addEventListener('input', () => { $('speed-value').textContent = `${$('speed').value}×`; });
  $('help-open').addEventListener('click', () => { stopPouring(); $('help').showModal(); });
  $('help-close').addEventListener('click', () => $('help').close());
  $('help').addEventListener('click', event => {
    const rect = $('help').getBoundingClientRect();
    if (event.target === $('help') && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) $('help').close();
  });
  $('level-menu-open').addEventListener('click', () => {
    if (mode !== 'game') return;
    stopPouring(); menuKind = game.level.kind; updateLevelMenu(); $('level-menu').showModal();
  });
  function closeLevelMenu() { $('level-menu').close(); canvas.focus({ preventScroll: true }); }
  $('level-menu-close').addEventListener('click', closeLevelMenu);
  $('level-menu-resume').addEventListener('click', closeLevelMenu);
  $('menu-versus').addEventListener('click', () => { switchMode('versus'); canvas.focus({ preventScroll: true }); });
  $('menu-sandbox').addEventListener('click', () => { switchMode('sandbox'); canvas.focus({ preventScroll: true }); });
  $('welcome').addEventListener('click', startParticipant);
  $('participant-open').addEventListener('click', () => {
    $('help').close(); cancelParticipantReset(); $('participant-dialog').showModal();
  });
  $('participant-cancel').addEventListener('click', () => {
    cancelParticipantReset(); $('participant-dialog').close(); $('help-open').focus();
  });
  for (const type of ['close', 'cancel']) $('participant-dialog').addEventListener(type, cancelParticipantReset);
  const resetButton = $('participant-reset');
  resetButton.addEventListener('pointerdown', event => {
    if (event.button !== 0 || resetHold || !$('participant-dialog').open) return;
    resetButton.setPointerCapture(event.pointerId);
    resetHold = { elapsed: 0, pointerId: event.pointerId }; redraw();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) resetButton.addEventListener(type, cancelParticipantReset);
  resetButton.addEventListener('pointermove', event => {
    if (!resetHold || resetHold.pointerId !== event.pointerId) return;
    const rect = resetButton.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) cancelParticipantReset();
  });
  resetButton.addEventListener('keydown', event => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat && !resetHold && $('participant-dialog').open) { resetHold = { elapsed: 0 }; redraw(); }
  });
  resetButton.addEventListener('keyup', event => {
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); cancelParticipantReset(); }
  });
  resetButton.addEventListener('blur', cancelParticipantReset);
  resetButton.addEventListener('contextmenu', event => event.preventDefault());
  new ResizeObserver(resize).observe(canvas);
  reset(true);
  updateAngle();
  showWelcome();
})();
