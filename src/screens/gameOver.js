// Game Over Screen — Phase 4
// Shows score, new high score banner with glow, 3-char name entry, top 10 leaderboard

import { getCtx, getTileSize } from '../renderer.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MAX_NAME_LEN = 3;

function drawAlphabetWheel(ctx, x, y, letter, tileSz) {
  const wheel = [
    ALPHABET[(ALPHABET.indexOf(letter) - 1 + 26) % 26],
    letter,
    ALPHABET[(ALPHABET.indexOf(letter) + 1) % 26],
  ];
  // Dim rows above/below
  ctx.fillStyle = '#333333';
  ctx.font = `${tileSz * 1.4}px monospace`;
  ctx.fillText(wheel[0], x - ctx.measureText(wheel[0]).width / 2, y - tileSz * 1.4);
  ctx.fillText(wheel[2], x - ctx.measureText(wheel[2]).width / 2, y + tileSz * 1.8);
  // Bright center
  ctx.fillStyle = '#ffff00';
  ctx.font = `bold ${tileSz * 2}px monospace`;
  ctx.fillText(wheel[1], x - ctx.measureText(wheel[1]).width / 2, y);
}

function drawGameOverHeader(ctx, canvasW, tileSz) {
  // Shadow
  ctx.fillStyle = '#aa0000';
  ctx.font = `bold ${tileSz * 3}px monospace`;
  const text = 'GAME OVER';
  ctx.fillText(text, canvasW / 2 - ctx.measureText(text).width / 2 + 3, 63 + 3);
  ctx.fillStyle = '#ff0000';
  ctx.fillText(text, canvasW / 2 - ctx.measureText(text).width / 2, 63);
}

function drawScore(ctx, canvasW, score, tileSz) {
  ctx.fillStyle = '#ffffff';
  ctx.font = `${tileSz * 1.8}px monospace`;
  const label = `SCORE  ${String(score).padStart(6, '0')}`;
  ctx.fillText(label, canvasW / 2 - ctx.measureText(label).width / 2, 105);
}

function drawHighScoreBanner(ctx, canvasW, tileSz, frame) {
  const text = 'NEW HIGH SCORE!';
  const glow = 0.5 + 0.5 * Math.sin(frame * 0.15);
  ctx.save();
  ctx.shadowColor = '#ffff00';
  ctx.shadowBlur = 10 * glow;
  ctx.fillStyle = `rgba(255, 255, 0, ${0.7 + 0.3 * glow})`;
  ctx.font = `bold ${tileSz * 1.5}px monospace`;
  ctx.fillText(text, canvasW / 2 - ctx.measureText(text).width / 2, 133);
  ctx.restore();
}

function drawLeaderboard(ctx, canvasW, leaderboard, tileSz) {
  const cols = Math.min(2, leaderboard.length);
  const rows = Math.ceil(leaderboard.length / cols);
  const colW = canvasW / cols;
  const startY = 185;

  ctx.fillStyle = '#888888';
  ctx.font = `bold ${tileSz}px monospace`;
  ctx.fillText('TOP SCORES', canvasW / 2 - ctx.measureText('TOP SCORES').width / 2, startY);

  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * colW + colW / 2;
    const y = startY + 20 + row * 16;

    ctx.fillStyle = entry.isNew ? '#ffff00' : '#cccccc';
    ctx.font = `${tileSz}px monospace`;
    const rank = `${i + 1}.`;
    const scoreStr = String(entry.score).padStart(6, '0');
    const text = `${rank} ${entry.name} ${scoreStr}`;
    ctx.fillText(text, x - ctx.measureText(text).width / 2, y);
  }
}

function drawNameEntry(ctx, canvasW, tileSz, nameInput, activeChar, frame) {
  const labelY = 155;
  ctx.fillStyle = '#aaaaff';
  ctx.font = `${tileSz * 1.2}px monospace`;
  const label = 'ENTER YOUR NAME';
  ctx.fillText(label, canvasW / 2 - ctx.measureText(label).width / 2, labelY);

  // 3 character boxes
  const boxW = tileSz * 3;
  const gap  = tileSz * 1.5;
  const totalW = 3 * boxW + 2 * gap;
  const startX = canvasW / 2 - totalW / 2;
  const boxY   = labelY + 14;

  for (let i = 0; i < MAX_NAME_LEN; i++) {
    const bx = startX + i * (boxW + gap);
    // Box border
    ctx.strokeStyle = i === activeChar ? '#ffff00' : '#555555';
    ctx.lineWidth = i === activeChar ? 2 : 1;
    ctx.strokeRect(bx, boxY, boxW, tileSz * 3);
    // Letter
    if (nameInput[i]) {
      drawAlphabetWheel(ctx, bx + boxW / 2, boxY + tileSz * 1.8, nameInput[i], tileSz);
    }
  }

  // Blinking "press enter" prompt below boxes
  const promptY = boxY + tileSz * 4 + 8;
  if (Math.floor(frame / 20) % 2 === 0) {
    ctx.fillStyle = '#888888';
    ctx.font = `${tileSz}px monospace`;
    const hint = 'ARROWS: change   ENTER: confirm';
    ctx.fillText(hint, canvasW / 2 - ctx.measureText(hint).width / 2, promptY);
  }
}

function drawRetryPrompt(ctx, canvasW, canvasH, tileSz, frame) {
  if (Math.floor(frame / 25) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${tileSz}px monospace`;
    const text = 'PRESS ENTER TO CONTINUE';
    ctx.fillText(text, canvasW / 2 - ctx.measureText(text).width / 2, canvasH - 12);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * @param {number} score
 * @param {boolean} isNewHighScore
 * @param {Array<{name:string,score:number}>} leaderboard
 * @param {string[]} nameInput  array of 3 letters
 * @param {number} animFrame  frame counter for animations
 */
export function renderGameOverScreen(ctx, canvasW, canvasH, score, isNewHighScore, leaderboard, nameInput, animFrame) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const tileSz = 8;

  // Header
  drawGameOverHeader(ctx, canvasW, tileSz);

  // Score
  drawScore(ctx, canvasW, score, tileSz);

  if (isNewHighScore) {
    drawHighScoreBanner(ctx, canvasW, tileSz, animFrame);
    drawNameEntry(ctx, canvasW, tileSz, nameInput, nameInput.filter(Boolean).length < MAX_NAME_LEN ? nameInput.filter(Boolean).length : -1, animFrame);
  } else {
    drawRetryPrompt(ctx, canvasW, canvasH, tileSz, animFrame);
  }

  if (leaderboard && leaderboard.length > 0 && (!isNewHighScore || nameInput.join('').length === MAX_NAME_LEN)) {
    drawLeaderboard(ctx, canvasW, leaderboard, tileSz);
  }
}
