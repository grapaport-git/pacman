// Leaderboard — persistent high score table with 3-char arcade name entry
export class Leaderboard {
  constructor() {
    this.entries = [];
    this.load();
  }

  load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('pacman_leaderboard');
      this.entries = raw ? JSON.parse(raw) : [];
    } catch {
      this.entries = [];
    }
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('pacman_leaderboard', JSON.stringify(this.entries));
    } catch {}
  }

  addEntry({ name, score, level }) {
    const entry = {
      name: name || 'AAA',
      score: score || 0,
      level: level || 1,
      date: new Date().toISOString().split('T')[0]
    };
    this.entries.push(entry);
    this.entries.sort((a, b) => b.score - a.score);
    this.entries = this.entries.slice(0, 10);
    this.save();
    return entry;
  }

  getTop(n = 10) {
    return this.entries.slice(0, n);
  }

  isHighScore(score) {
    if (this.entries.length < 10) return true;
    return score > (this.entries[this.entries.length - 1]?.score || 0);
  }

  getRank(score) {
    for (let i = 0; i < this.entries.length; i++) {
      if (score >= this.entries[i].score) return i + 1;
    }
    return this.entries.length + 1;
  }

  clear() {
    this.entries = [];
    this.save();
  }
}

// Name input state machine
export class NameEntry {
  constructor() {
    this.chars = ['A', 'A', 'A'];
    this.position = 0;
  }

  reset() {
    this.chars = ['A', 'A', 'A'];
    this.position = 0;
  }

  getName() {
    return this.chars.join('');
  }

  handleKey(key) {
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (key === 'ArrowLeft') {
      this.position = (this.position - 1 + 3) % 3;
      return this.position;
    }
    if (key === 'ArrowRight') {
      this.position = (this.position + 1) % 3;
      return this.position;
    }
    if (key === 'ArrowUp') {
      const idx = LETTERS.indexOf(this.chars[this.position]);
      this.chars[this.position] = LETTERS[(idx + 1) % 26];
      return this.position;
    }
    if (key === 'ArrowDown') {
      const idx = LETTERS.indexOf(this.chars[this.position]);
      this.chars[this.position] = LETTERS[(idx - 1 + 26) % 26];
      return this.position;
    }
    return this.position;
  }
}

// Canvas rendering for leaderboard
export function renderLeaderboard(ctx, leaderboard, canvasW, canvasH) {
  // Dark background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Header
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(canvasH * 0.06)}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('HIGH SCORES', canvasW / 2, canvasH * 0.12);

  // Divider line
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvasW * 0.1, canvasH * 0.18);
  ctx.lineTo(canvasW * 0.9, canvasH * 0.18);
  ctx.stroke();

  // Entries
  const top = leaderboard.getTop(10);
  ctx.font = `${Math.floor(canvasH * 0.04)}px "Press Start 2P", monospace`;
  ctx.textAlign = 'left';

  for (let i = 0; i < 10; i++) {
    const y = canvasH * (0.25 + i * 0.065);
    const entry = top[i];

    if (entry) {
      ctx.fillStyle = i === 0 ? '#ffd700' : '#fff';
      ctx.fillText(`${i + 1}.`, canvasW * 0.1, y);
      ctx.fillText(entry.name, canvasW * 0.22, y);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(entry.score.toString().padStart(8, ' '), canvasW * 0.9, y);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = '#555';
      ctx.fillText(`${i + 1}. ---`, canvasW * 0.1, y);
    }
  }
}

// Render name entry screen
export function renderNameEntry(ctx, nameEntry, score, canvasW, canvasH) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = '#ff0000';
  ctx.font = `bold ${Math.floor(canvasH * 0.05)}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('NEW HIGH SCORE!', canvasW / 2, canvasH * 0.2);

  ctx.fillStyle = '#fff';
  ctx.font = `${Math.floor(canvasH * 0.04)}px "Press Start 2P", monospace`;
  ctx.fillText(score.toString(), canvasW / 2, canvasH * 0.32);

  ctx.fillStyle = '#ffff00';
  ctx.fillText('ENTER YOUR NAME', canvasW / 2, canvasH * 0.44);

  // 3-char boxes
  const boxW = canvasW * 0.1;
  const boxH = canvasH * 0.1;
  const startX = canvasW / 2 - boxW * 1.5;

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (boxW + canvasW * 0.02);

    // Highlight active box
    if (i === nameEntry.position) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, canvasH * 0.5, boxW, boxH);
    } else {
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, canvasH * 0.5, boxW, boxH);
    }

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(canvasH * 0.07)}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(nameEntry.chars[i], x + boxW / 2, canvasH * 0.5 + boxH * 0.72);
  }

  ctx.fillStyle = '#888';
  ctx.font = `${Math.floor(canvasH * 0.025)}px "Press Start 2P", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('^  /  v  CHANGE   <  >  SELECT', canvasW / 2, canvasH * 0.72);
  ctx.fillText('ENTER TO CONFIRM', canvasW / 2, canvasH * 0.78);
}
