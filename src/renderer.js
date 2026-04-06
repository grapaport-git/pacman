// Canvas renderer for Pac-Man game

let canvas, ctx;
let tileSize = 8;
let viewportScale = 1;

export function initCanvas(id = 'game', ts = 8) {
  tileSize = ts;
  canvas = document.getElementById(id);
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const w = 28 * tileSize;
  const h = 31 * tileSize;
  canvas.width = w;
  canvas.height = h;
  return { width: w, height: h };
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
        ctx.fillStyle = '#2121de';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      } else if (tile === 2) {
        ctx.fillStyle = '#ffb8ae';
        ctx.beginPath();
        ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 3) {
        ctx.fillStyle = '#ffb8ae';
        ctx.beginPath();
        ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// Draw Pac-Man arc mouth
export function renderPacMan(ctx, pacman) {
  const px = pacman.pixelX + tileSize / 2;
  const py = pacman.pixelY + tileSize / 2;
  const r  = tileSize * 0.45;
  const mouthOpen = 0.2 + (pacman.mouthFrame === 1 ? 0.3 : 0);
  const dir = pacman.direction;
  const angleStart = dir === 'right' ? mouthOpen : dir === 'left' ? Math.PI + mouthOpen
                  : dir === 'up'    ? -Math.PI/2 + mouthOpen : Math.PI/2 + mouthOpen;
  const angleEnd   = dir === 'right' ? Math.PI - mouthOpen : dir === 'left' ? -mouthOpen
                   : dir === 'up'    ? -Math.PI/2 - mouthOpen : Math.PI/2 - mouthOpen;

  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(px, py, r, angleStart, angleEnd);
  ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
}

export function renderGhost(ctx, ghost) {
  const px = ghost.pixelX + tileSize / 2;
  const py = ghost.pixelY + tileSize / 2;
  const r  = tileSize * 0.45;

  let color = '#ff0000';
  if (ghost.mode === 'frightened') color = '#2121de';
  else if (ghost.mode === 'dead')   color = '#ffffff';
  else {
    const colors = { blinky:'#ff0000', pinky:'#ffb8ff', inky:'#00ffff', clyde:'#ffb852' };
    color = colors[ghost.name] || '#ff0000';
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, r, Math.PI, 0);
  ctx.lineTo(px + r, py + r);
  for (let i = 0; i < 3; i++) {
    const bx = px + r - (i + 1) * (r * 2 / 3);
    ctx.lineTo(bx, py + r + (i % 2 === 0 ? r * 0.5 : 0));
  }
  ctx.lineTo(px - r, py + r);
  ctx.closePath();
  ctx.fill();

  // Eyes
  if (ghost.mode !== 'frightened' && ghost.mode !== 'dead') {
    const ex = tileSize * 0.15;
    const ey = tileSize * 0.05;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - ex, py - ey, r * 0.28, 0, Math.PI * 2);
    ctx.arc(px + ex, py - ey, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - ex + ex * 0.3, py - ey + ey * 0.3, r * 0.14, 0, Math.PI * 2);
    ctx.arc(px + ex + ex * 0.3, py - ey + ey * 0.3, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderHUD(ctx, score, lives) {
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText(`SCORE ${score}`, 8, tileSize * 30 + 8);
  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(tileSize * 20 + i * tileSize * 2, tileSize * 30 + tileSize / 2, tileSize * 0.4, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(tileSize * 20 + i * tileSize * 2, tileSize * 30 + tileSize / 2);
    ctx.closePath();
    ctx.fill();
  }
}

export function getCtx() { return ctx; }
export function getTileSize() { return tileSize; }
