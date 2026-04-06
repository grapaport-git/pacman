// Canvas renderer for Pac-Man — Phase 2 visual polish

let canvas, ctx;
let tileSize = 8;
let viewportScale = 1;
let scorePopups = [];  // { text, x, y, timer, color }

export function initCanvas(id = 'game', ts = 8) {
  tileSize = ts;
  canvas = document.getElementById(id);
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  canvas.width  = 28 * tileSize;
  canvas.height = 31 * tileSize + 16;  // extra for HUD
  return { width: canvas.width, height: canvas.height };
}

export function clearFrame() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function setViewportScale(scale) {
  viewportScale = scale;
  if (canvas) {
    canvas.style.width  = (canvas.width  * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
  }
}

export function renderMaze(maze) {
  const h = maze.length;
  const w = maze[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tile = maze[y][x];
      if (tile === 1) {
        // Classic blue walls
        ctx.fillStyle = '#2121de';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        // Subtle inner bevel
        ctx.fillStyle = '#3030ff';
        ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, 2);
      } else if (tile === 2) {
        ctx.fillStyle = '#ffb8ae';
        ctx.beginPath();
        ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 3) {
        // Power pellets — pulsing size
        const pulse = tileSize / 3 * (0.7 + 0.3 * Math.sin(Date.now() / 200));
        ctx.fillStyle = '#ffb8ae';
        ctx.beginPath();
        ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

const MOUTH_ANGLES = [0.2, 0.5, 0.2];  // mouth size per frame

export function renderPacMan(pacman) {
  const px = pacman.pixelX + tileSize / 2;
  const py = pacman.pixelY + tileSize / 2;
  const r  = tileSize * 0.45;
  const dir = pacman.direction;
  const mouth = MOUTH_ANGLES[pacman.mouthFrame];

  let angleStart, angleEnd;
  switch (dir) {
    case 'right': angleStart =  mouth; angleEnd = Math.PI * 2 - mouth; break;
    case 'left':  angleStart = Math.PI + mouth; angleEnd = Math.PI - mouth; break;
    case 'up':    angleStart = -Math.PI/2 + mouth; angleEnd = -Math.PI/2 - mouth + Math.PI * 2; break;
    case 'down':  angleStart = Math.PI/2 + mouth; angleEnd = Math.PI/2 - mouth; break;
    default:      angleStart = mouth; angleEnd = Math.PI * 2 - mouth;
  }

  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(px, py, r, angleStart, angleEnd);
  ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
}

export function renderGhost(ghost) {
  const px = ghost.pixelX + tileSize / 2;
  const py = ghost.pixelY + tileSize / 2;
  const r  = tileSize * 0.45;

  let color;
  if (ghost.mode === 'frightened') {
    const flashing = Math.floor(Date.now() / 200) % 2 === 0;
    color = flashing ? '#ffffff' : '#2121de';
  } else if (ghost.mode === 'dead') {
    color = '#ffffff';
  } else {
    const colors = { blinky:'#ff0000', pinky:'#ffb8ff', inky:'#00ffff', clyde:'#ffb852' };
    color = colors[ghost.name] || '#ff0000';
  }

  ctx.fillStyle = color;
  // Rounded top
  ctx.beginPath();
  ctx.arc(px, py - tileSize * 0.05, r, Math.PI, 0);
  ctx.lineTo(px + r, py + r * 0.7);
  // Wavy bottom
  const waves = 3;
  for (let i = 0; i < waves; i++) {
    const wx = px + r - (i + 1) * (r * 2 / waves);
    const wy = py + r * 0.7 + (i % 2 === 0 ? r * 0.35 : 0);
    ctx.lineTo(wx, wy);
  }
  ctx.lineTo(px - r, py + r * 0.7);
  ctx.closePath();
  ctx.fill();

  // Eyes (not on dead/blue ghosts)
  if (ghost.mode !== 'dead' && ghost.mode !== 'frightened') {
    const ex = tileSize * 0.18;
    const ey = tileSize * 0.08;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - ex, py - ey, r * 0.3, 0, Math.PI * 2);
    ctx.arc(px + ex, py - ey, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Pupils track direction
    const pdx = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
    const [pdx2, pdy] = pdx[ghost.direction] || [0, 0];
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - ex + pdx2 * 1.5, py - ey + pdy * 1.5, r * 0.15, 0, Math.PI * 2);
    ctx.arc(px + ex + pdx2 * 1.5, py - ey + pdy * 1.5, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vulnerable mouth
  if (ghost.mode === 'frightened') {
    ctx.fillStyle = '#fff';
    ctx.font = `${tileSize * 0.5}px monospace`;
    ctx.fillText('~', px - tileSize * 0.2, py + tileSize * 0.2);
  }
}

export function addScorePopup(text, x, y, color = '#fff') {
  scorePopups.push({ text, x, y, timer: 0.8, color });
}

export function renderScorePopups(dt) {
  scorePopups = scorePopups.filter(p => p.timer > 0);
  for (const p of scorePopups) {
    p.timer -= dt;
    ctx.globalAlpha = Math.min(1, p.timer * 2);
    ctx.fillStyle = p.color;
    ctx.font = `bold ${tileSize}px monospace`;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

export function renderHUD(score, lives, level, highScore) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 31 * tileSize, canvas.width, 16);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${tileSize}px monospace`;
  ctx.fillText(`SCORE ${String(score).padStart(6,'0')}`, 4, 31 * tileSize + 12);
  ctx.fillText(`HI ${String(highScore).padStart(6,'0')}`, 80, 31 * tileSize + 12);
  ctx.fillText(`LVL ${level}`, 160, 31 * tileSize + 12);
  // Life icons
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(208 + i * 20, 31 * tileSize + 6, tileSize * 0.4, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(208 + i * 20, 31 * tileSize + 6);
    ctx.closePath();
    ctx.fill();
  }
}

export function renderOverlay(text, subtext) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 100, canvas.width, 80);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${tileSize * 2}px monospace`;
  ctx.fillText(text, 30, 145);
  if (subtext) {
    ctx.font = `${tileSize}px monospace`;
    ctx.fillText(subtext, 50, 168);
  }
}

export function renderGameOver(score) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff0000';
  ctx.font = `bold ${tileSize * 2}px monospace`;
  ctx.fillText('GAME OVER', 55, 130);
  ctx.fillStyle = '#fff';
  ctx.font = `${tileSize}px monospace`;
  ctx.fillText(`FINAL SCORE: ${score}`, 55, 155);
  ctx.fillText('PRESS ENTER TO RETRY', 40, 180);
}

export function getCtx() { return ctx; }
export function getTileSize() { return tileSize; }

// ─── Phase 3: Power-up HUD, Particles & Visual Effects ─────────────────────

const _particles = [];  // { x, y, vx, vy, color, life, maxLife, size }

const POWERUP_COLORS_HUD = {
  speed:        '#00ff88',
  triple:       '#ff44ff',
  ghostfreeze:  '#44aaff',
  scoreboost:   '#ffdd00',
  magnet:       '#ffaa00',
  shield:       '#ff4444',
  ghostbomb:    '#ff8800',
  slowmo:       '#88ccff',
};

export function spawnParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 30 + Math.random() * 40;
    _particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 0.6,
      maxLife: 0.6,
      size: tileSize * 0.35,
    });
  }
}

export function renderParticles(ctx) {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.x += p.vx * (1 / 60);
    p.y += p.vy * (1 / 60);
    p.life -= 1 / 60;
    if (p.life <= 0) { _particles.splice(i, 1); continue; }
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function flashScreen(ctx, canvasW, canvasH, timer) {
  if (timer <= 0) return;
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 0, canvasW, canvasH);
}

export function renderMagnetGlow(ctx, pacmanX, pacmanY, tileSz, radius = 4) {
  const cx = pacmanX * tileSz + tileSz / 2;
  const cy = pacmanY * tileSz + tileSz / 2;
  const px = cx + tileSz * radius;
  const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, px);
  gradient.addColorStop(0,   'rgba(255,170,0,0.35)');
  gradient.addColorStop(0.5, 'rgba(255,170,0,0.12)');
  gradient.addColorStop(1,   'rgba(255,170,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, px, 0, Math.PI * 2);
  ctx.fill();
}

export function renderActivePowerUps(ctx, powerupManager, tileSz) {
  if (!powerupManager || !powerupManager.activePowerUps) return;
  const active = Object.entries(powerupManager.activePowerUps);
  if (active.length === 0) return;

  const iconSize = 12;
  const barW = 36;
  const barH = 4;
  const hudY = 31 * tileSz + 4;
  let slotX = 4;

  for (const [type, data] of active) {
    const color = POWERUP_COLORS_HUD[type] || '#ffffff';
    // Icon circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(slotX + iconSize / 2, hudY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();
    // Timer bar
    const max = data.maxDuration || 1;
    const frac = Math.max(0, data.timer / max);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(slotX, hudY + iconSize + 1, barW, barH);
    ctx.fillStyle = color;
    ctx.fillRect(slotX, hudY + iconSize + 1, barW * frac, barH);
    slotX += iconSize + barW + 6;
  }
}
