// ─── Leaderboard — Persistent High Score via localStorage ─────────────────────

const STORAGE_KEY = 'pacman_leaderboard';
const MAX_ENTRIES = 10;

export class Leaderboard {
  constructor() {
    this.entries = [];
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.entries = raw ? JSON.parse(raw) : [];
    } catch {
      this.entries = [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    } catch {}
  }

  addEntry({ name, score, level, date }) {
    this.entries.push({ name: String(name).toUpperCase(), score, level, date });
    this.entries.sort((a, b) => b.score - a.score);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }
    this.save();
  }

  getTop(n = 10) {
    return this.entries.slice(0, n);
  }

  isHighScore(score) {
    if (this.entries.length < MAX_ENTRIES) return true;
    return score > (this.entries[this.entries.length - 1]?.score ?? 0);
  }

  clear() {
    this.entries = [];
    this.save();
  }
}

// ─── Name Entry ───────────────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export class NameEntry {
  constructor(defaultName = 'AAA') {
    this.chars = defaultName.split('').slice(0, 3);
    while (this.chars.length < 3) this.chars.push('A');
    this.cursor = 0;
    this.confirmed = false;
  }

  charAt(i) { return this.chars[i] ?? 'A'; }

  moveCursor(dir) { // -1 left, +1 right
    this.cursor = (this.cursor + dir + 3) % 3;
  }

  cycleChar(dir) { // -1 down, +1 up
    const idx = CHARS.indexOf(this.charAt(this.cursor));
    const next = (idx + dir + CHARS.length) % CHARS.length;
    this.chars[this.cursor] = CHARS[next];
  }

  confirm() { this.confirmed = true; }

  getName() { return this.chars.join(''); }
}

// ─── Canvas Renderer ──────────────────────────────────────────────────────────

export function renderLeaderboard(ctx, leaderboard, canvasW, canvasH, selectedIndex = -1) {
  const entries = leaderboard.getTop(MAX_ENTRIES);

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Border
  ctx.strokeStyle = '#2244ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, canvasW - 8, canvasH - 8);

  // Header
  ctx.fillStyle = '#ffdd00';
  ctx.font = `bold ${Math.floor(canvasH * 0.06)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('HIGH SCORES', canvasW / 2, canvasH * 0.1);

  // Divider
  ctx.strokeStyle = '#ffdd00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvasW * 0.1, canvasH * 0.14);
  ctx.lineTo(canvasW * 0.9, canvasH * 0.14);
  ctx.stroke();

  const rowH = (canvasH * 0.72) / MAX_ENTRIES;
  const startY = canvasH * 0.17;

  entries.forEach((entry, i) => {
    const y = startY + i * rowH;
    const isSelected = i === selectedIndex;

    // Row background
    if (isSelected) {
      ctx.fillStyle = '#2244ff44';
      ctx.fillRect(canvasW * 0.08, y, canvasW * 0.84, rowH * 0.85);
    }

    // Rank
    ctx.fillStyle = isSelected ? '#ffdd00' : '#888';
    ctx.font = `${Math.floor(canvasH * 0.04)}px "Courier New", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${i + 1}.`, canvasW * 0.18, y + rowH * 0.65);

    // Name
    ctx.fillStyle = isSelected ? '#ffdd00' : '#fff';
    ctx.font = `bold ${Math.floor(canvasH * 0.045)}px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(entry.name, canvasW * 0.2, y + rowH * 0.65);

    // Score
    ctx.fillStyle = isSelected ? '#ffdd00' : '#fff';
    ctx.font = `${Math.floor(canvasH * 0.04)}px "Courier New", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(entry.score.toString().padStart(8, ' '), canvasW * 0.85, y + rowH * 0.65);

    // Level
    ctx.fillStyle = '#888';
    ctx.font = `${Math.floor(canvasH * 0.035)}px "Courier New", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`LV${entry.level}`, canvasW * 0.92, y + rowH * 0.65);
  });

  // Footer hint
  ctx.fillStyle = '#555';
  ctx.font = `${Math.floor(canvasH * 0.03)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('PRESS ENTER TO CONTINUE', canvasW / 2, canvasH * 0.97);
}

export function renderNameEntry(ctx, nameEntry, canvasW, canvasH) {
  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = '#ffdd00';
  ctx.font = `bold ${Math.floor(canvasH * 0.07)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('NEW HIGH SCORE!', canvasW / 2, canvasH * 0.25);
  ctx.fillText('ENTER YOUR NAME', canvasW / 2, canvasH * 0.35);

  // 3-char boxes
  const boxW = canvasW * 0.12;
  const boxH = canvasH * 0.14;
  const totalW = boxW * 3 + 20 * 2;
  const startX = (canvasW - totalW) / 2;
  const boxY = canvasH * 0.45;

  for (let i = 0; i < 3; i++) {
    const bx = startX + i * (boxW + 20);
    const isCursor = i === nameEntry.cursor;

    // Box border
    ctx.strokeStyle = isCursor ? '#ffdd00' : '#4444ff';
    ctx.lineWidth = isCursor ? 4 : 2;
    ctx.strokeRect(bx, boxY, boxW, boxH);

    // Char
    ctx.fillStyle = isCursor ? '#ffdd00' : '#fff';
    ctx.font = `bold ${Math.floor(canvasH * 0.1)}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(nameEntry.charAt(i), bx + boxW / 2, boxY + boxH * 0.78);

    // Cursor blink
    if (isCursor) {
      ctx.fillStyle = `rgba(255,221,0,${0.5 + 0.5 * Math.sin(Date.now() / 200)})`;
      ctx.fillRect(bx + 4, boxY + boxH + 4, boxW - 8, 6);
    }
  }

  // Instructions
  ctx.fillStyle = '#888';
  ctx.font = `${Math.floor(canvasH * 0.035)}px "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('UP/DOWN: CHANGE   LEFT/RIGHT: MOVE   ENTER: CONFIRM', canvasW / 2, canvasH * 0.72);
}
