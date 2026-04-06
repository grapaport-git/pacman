// Progression Map Screen — Phase 4
// Vertical scrolling path through 15 level nodes

import { getCtx, getTileSize } from '../renderer.js';

const TOTAL_LEVELS = 15;
const NODE_RADIUS  = 14;
const NODE_SPACING = 52;
const HEADER_H     = 40;

function drawHeader(ctx, canvasW, currentLevel, tileSz) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, HEADER_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${tileSz * 1.8}px monospace`;
  const title = 'SELECT LEVEL';
  ctx.fillText(title, canvasW / 2 - ctx.measureText(title).width / 2, 18);
  ctx.fillStyle = '#aaaaaa';
  ctx.font = `${tileSz}px monospace`;
  const counter = `LEVEL ${currentLevel}/${TOTAL_LEVELS}`;
  ctx.fillText(counter, canvasW / 2 - ctx.measureText(counter).width / 2, 32);
}

function drawCoinBalance(ctx, canvasW, coins, tileSz) {
  ctx.fillStyle = '#ffdd00';
  ctx.font = `bold ${tileSz}px monospace`;
  const text = `COINS: ${coins}`;
  ctx.fillText(text, canvasW - ctx.measureText(text).width - 6, 20);
}

function drawNode(ctx, x, y, levelNum, status, selected, tileSz, animFrame) {
  // Status: 'locked' | 'unlocked' | 'current'
  let fillColor, borderColor, textColor;
  if (status === 'locked') {
    fillColor   = '#333333';
    borderColor = '#555555';
    textColor   = '#555555';
  } else if (status === 'current') {
    fillColor   = '#ffff00';
    borderColor = '#ffffff';
    textColor   = '#000000';
  } else {
    fillColor   = '#2121de';
    borderColor = selected ? '#ffffff' : '#4040ff';
    textColor   = '#ffffff';
  }

  // Glow for current level
  if (status === 'current') {
    const glow = 0.4 + 0.4 * Math.sin(animFrame * 0.08);
    ctx.save();
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur  = 12 * glow;
    ctx.beginPath();
    ctx.arc(x, y, NODE_RADIUS + 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,0,${glow * 0.5})`;
    ctx.fill();
    ctx.restore();
  }

  // Selection ring
  if (selected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(x, y, NODE_RADIUS + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Circle body
  ctx.fillStyle   = fillColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Level number text
  ctx.fillStyle = textColor;
  ctx.font = `bold ${tileSz}px monospace`;
  const num = String(levelNum);
  ctx.fillText(num, x - ctx.measureText(num).width / 2, y + tileSz * 0.35);

  // Lock icon for locked nodes
  if (status === 'locked') {
    const lx = x - 4;
    const ly = y - 5;
    ctx.fillStyle = '#666666';
    // Lock body
    ctx.fillRect(lx - 4, ly + 2, 8, 7);
    // Lock shackle
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(lx, ly + 2, 3, Math.PI, 0);
    ctx.stroke();
  }
}

function drawConnector(ctx, x1, y1, x2, y2, tileSz) {
  ctx.strokeStyle = '#404040';
  ctx.lineWidth   = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawControlsHint(ctx, canvasW, canvasH, tileSz) {
  ctx.fillStyle = '#444444';
  ctx.font = `${tileSz}px monospace`;
  const text = 'ARROWS: navigate   ENTER: select   ESC: back';
  ctx.fillText(text, canvasW / 2 - ctx.measureText(text).width / 2, canvasH - 6);
}

/**
 * @param {number} currentLevel  1-indexed level Pac-Man is currently on
 * @param {number[]} unlockedLevels  array of unlocked level numbers (1-indexed)
 * @param {number} selectedLevel  level number currently selected (must be unlocked)
 */
export function renderProgressionMap(ctx, canvasW, canvasH, currentLevel, unlockedLevels, selectedLevel) {
  const tileSz   = 8;
  const cx       = canvasW / 2;
  const startY   = HEADER_H + 20;

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Header
  drawHeader(ctx, canvasW, currentLevel, tileSz);

  // Clip to content area
  const contentH = canvasH - HEADER_H - 20;
  const totalH  = (TOTAL_LEVELS - 1) * NODE_SPACING;
  // Scroll so selected node is centered
  const selIdx  = unlockedLevels.indexOf(selectedLevel);
  const scrollOffset = Math.max(0, Math.min(
    (selIdx >= 0 ? selIdx : 0) * NODE_SPACING - contentH / 2 + NODE_SPACING / 2,
    totalH - contentH + NODE_SPACING
  ));

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HEADER_H, canvasW, canvasH - HEADER_H - 20);
  ctx.clip();

  // Draw connectors
  for (let i = 0; i < TOTAL_LEVELS - 1; i++) {
    const y1 = startY + i * NODE_SPACING - scrollOffset;
    const y2 = startY + (i + 1) * NODE_SPACING - scrollOffset;
    if (y1 < HEADER_H - 20 || y1 > canvasH + 20) continue;
    drawConnector(ctx, cx, y1, cx, y2, tileSz);
  }

  // Draw nodes
  for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
    const y = startY + (lvl - 1) * NODE_SPACING - scrollOffset;
    if (y < HEADER_H - 20 || y > canvasH + 20) continue;

    const isUnlocked = unlockedLevels.includes(lvl);
    const isCurrent  = lvl === currentLevel;
    const isSelected = lvl === selectedLevel && isUnlocked;

    const status = !isUnlocked ? 'locked' : isCurrent ? 'current' : 'unlocked';
    drawNode(ctx, cx, y, lvl, status, isSelected, tileSz, Math.floor(Date.now() / 100));
  }

  ctx.restore();

  // Controls hint
  drawControlsHint(ctx, canvasW, canvasH, tileSz);
}
