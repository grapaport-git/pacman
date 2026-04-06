// Pause Screen — Phase 4
// Semi-transparent overlay with RESUME / RESTART / QUIT options

import { getCtx, getTileSize } from '../renderer.js';

const PAUSE_OPTIONS = ['RESUME', 'RESTART', 'QUIT'];

function drawPausedHeader(ctx, canvasW, tileSz) {
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${tileSz * 3}px monospace`;
  const text = 'PAUSED';
  const tw = ctx.measureText(text).width;
  ctx.fillText(text, canvasW / 2 - tw / 2, 110);
}

function drawOption(ctx, text, cx, y, selected, tileSz) {
  if (selected) {
    ctx.fillStyle = '#ffff00';
    ctx.font = `bold ${tileSz * 1.8}px monospace`;
    ctx.fillText('> ' + text, cx - ctx.measureText(text).width / 2 - tileSz, y);
  } else {
    ctx.fillStyle = '#aaaaaa';
    ctx.font = `${tileSz * 1.5}px monospace`;
    ctx.fillText(text, cx - ctx.measureText(text).width / 2, y);
  }
}

function drawDivider(ctx, canvasW, tileSz) {
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(canvasW / 4, 125);
  ctx.lineTo(canvasW * 3 / 4, 125);
  ctx.stroke();
}

/**
 * @param {number} selectedIndex  0=RESUME, 1=RESTART, 2=QUIT
 */
export function renderPauseMenu(ctx, canvasW, canvasH, selectedIndex) {
  const tileSz = 8;

  // Semi-transparent dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Divider line above options
  drawDivider(ctx, canvasW, tileSz);

  // Header
  drawPausedHeader(ctx, canvasW, tileSz);

  // Options
  const optionY = 165;
  const spacing = 32;
  for (let i = 0; i < PAUSE_OPTIONS.length; i++) {
    drawOption(ctx, PAUSE_OPTIONS[i], canvasW / 2, optionY + i * spacing, i === selectedIndex, tileSz);
  }

  // Hint
  ctx.fillStyle = '#555555';
  ctx.font = `${tileSz}px monospace`;
  const hint = 'ESC / P: resume';
  ctx.fillText(hint, canvasW / 2 - ctx.measureText(hint).width / 2, canvasH - 10);
}

export { PAUSE_OPTIONS };
