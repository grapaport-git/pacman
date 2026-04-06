// Main Menu Screen — Phase 4
// Renders animated Pac-Man + ghost parade with navigable options

import { getCtx, getTileSize } from '../renderer.js';

const MENU_OPTIONS = ['START GAME', 'HIGH SCORES', 'CONTROLS'];
const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
const GHOST_NAMES  = ['blinky', 'pinky', 'ink', 'clyde'];

// Ghost parade positions and direction (moving right)
const GHOST_START_X = -40;
const GHOST_END_X   = 400;
const GHOST_Y       = 105;
const GHOST_SPACING = 22;

let animFrame = 0;
let ghostX = GHOST_START_X;
let pacmanFrame = 0;

export function resetMenuAnim() {
  animFrame    = 0;
  ghostX       = GHOST_START_X;
  pacmanFrame  = 0;
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawPacMan(ctx, x, y, size, frame) {
  const mouthAngles = [0.2, 0.5, 0.2];
  const mouth = mouthAngles[frame % 3];
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.9, mouth, Math.PI * 2 - mouth);
  ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

function drawGhostBody(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.05, size * 0.9, Math.PI, 0);
  ctx.lineTo(x + size * 0.9, y + size * 0.65);
  for (let i = 0; i < 3; i++) {
    const wx = x + size * 0.9 - (i + 1) * (size * 1.8 / 3);
    const wy = y + size * 0.65 + (i % 2 === 0 ? size * 0.35 : 0);
    ctx.lineTo(wx, wy);
  }
  ctx.lineTo(x - size * 0.9, y + size * 0.65);
  ctx.closePath();
  ctx.fill();
}

function drawGhostEyes(ctx, x, y, size) {
  const ex = size * 0.28;
  const ey = size * 0.08;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - ex, y - ey, size * 0.28, 0, Math.PI * 2);
  ctx.arc(x + ex, y - ey, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(x - ex + 1.5, y - ey, size * 0.14, 0, Math.PI * 2);
  ctx.arc(x + ex + 1.5, y - ey, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

function drawTitle(ctx, canvasW, tileSz) {
  const titleSize = tileSz * 3;
  ctx.save();
  // Shadow
  ctx.fillStyle = '#b87a00';
  ctx.font = `bold ${titleSize}px monospace`;
  ctx.fillText('PAC-MAN', canvasW / 2 - ctx.measureText('PAC-MAN').width / 2 + 3, 62 + 3);
  // Main
  ctx.fillStyle = '#ffff00';
  ctx.fillText('PAC-MAN', canvasW / 2 - ctx.measureText('PAC-MAN').width / 2, 62);
  ctx.restore();
}

function drawOption(ctx, text, cx, y, selected, tileSz) {
  ctx.fillStyle = selected ? '#ffffff' : '#888888';
  ctx.font = `${tileSz * 1.5}px monospace`;
  if (selected) {
    ctx.fillText('> ' + text, cx - ctx.measureText(text).width / 2 - tileSz, y);
  } else {
    ctx.fillText(text, cx - ctx.measureText(text).width / 2, y);
  }
}

function drawControlsHint(ctx, canvasW, canvasH, tileSz) {
  ctx.fillStyle = '#666666';
  ctx.font = `${tileSz}px monospace`;
  ctx.fillText('ARROWS: select    ENTER: confirm', canvasW / 2 - ctx.measureText('ARROWS: select    ENTER: confirm').width / 2, canvasH - 8);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {number} selectedIndex  0=START GAME, 1=HIGH SCORES, 2=CONTROLS
 */
export function renderMainMenu(ctx, canvasW, canvasH, selectedIndex) {
  const tileSz = 8;

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Title
  drawTitle(ctx, canvasW, tileSz);

  // Animated Pac-Man on left
  const pacX = 40;
  const pacY = 100;
  drawPacMan(ctx, pacX, pacY, tileSz * 2.5, pacmanFrame);

  // Ghost parade on right (animated)
  for (let i = 0; i < 4; i++) {
    const gx = ghostX + i * GHOST_SPACING;
    if (gx < -30 || gx > canvasW + 30) continue;
    drawGhostBody(ctx, gx, GHOST_Y, tileSz * 2.5, GHOST_COLORS[i]);
    drawGhostEyes(ctx, gx, GHOST_Y, tileSz * 2.5);
  }

  // Menu options
  const optionY = 185;
  const spacing = 28;
  for (let i = 0; i < MENU_OPTIONS.length; i++) {
    drawOption(ctx, MENU_OPTIONS[i], canvasW / 2, optionY + i * spacing, i === selectedIndex, tileSz);
  }

  // Controls hint
  drawControlsHint(ctx, canvasW, canvasH, tileSz);
}

/**
 * Tick menu animation counters (call once per frame in game loop).
 * @param {number} dt  delta time in seconds
 */
export function tickMenuAnim(dt) {
  animFrame++;
  if (animFrame % 4 === 0) pacmanFrame++;

  // Advance ghost parade
  ghostX += 28 * dt;
  if (ghostX > GHOST_END_X) ghostX = GHOST_START_X;
}

export { MENU_OPTIONS };
