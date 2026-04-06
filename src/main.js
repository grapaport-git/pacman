// Entry point for Pac-Man game

import { initCanvas, clearFrame, renderMaze, renderPacMan, renderGhost, renderHUD, setViewportScale, getCtx, getTileSize } from './renderer.js';
import { GameState } from './game.js';
import { DIRECTION } from './pacman.js';

let game;
let lastTime = 0;

function handleKey(e) {
  const keyMap = {
    ArrowUp:    DIRECTION.UP,
    ArrowDown:  DIRECTION.DOWN,
    ArrowLeft:  DIRECTION.LEFT,
    ArrowRight: DIRECTION.RIGHT,
    w: DIRECTION.UP, s: DIRECTION.DOWN, a: DIRECTION.LEFT, d: DIRECTION.RIGHT
  };
  const dir = keyMap[e.key];
  if (dir && game && game.state === 'playing') {
    game.pacman.setDirection(dir);
    e.preventDefault();
  }
  if (e.key === ' ' || e.key === 'Enter') {
    if (game && (game.state === 'start' || game.state === 'gameover')) {
      if (game.state === 'gameover') {
        game.lives = 3;
        game.score = 0;
        game._initLevel();
      }
      game.state = 'playing';
    }
  }
}

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);  // cap at 50ms
  lastTime = ts;

  if (game) game.update(dt);

  const ctx = getCtx();
  const ts2 = getTileSize();
  clearFrame();
  if (game) {
    renderMaze(game.maze);
    renderPacMan(ctx, game.pacman);
    game.ghosts.forEach(g => renderGhost(ctx, g));
    renderHUD(ctx, game.score, game.lives);

    if (game.state === 'start') {
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText('PRESS ENTER TO START', 50, 140);
    }
    if (game.state === 'gameover') {
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText('GAME OVER', 90, 140);
      ctx.fillText(`SCORE ${game.score}`, 85, 160);
    }
  }

  requestAnimationFrame(gameLoop);
}

function init() {
  initCanvas('game', 8);
  setViewportScale(3);
  game = new GameState();
  window.addEventListener('keydown', handleKey);
  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
}

window.addEventListener('DOMContentLoaded', init);
