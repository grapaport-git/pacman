// Entry point for Pac-Man game — Phase 2

import { initCanvas, clearFrame, renderMaze, renderPacMan, renderGhost, renderHUD, renderOverlay, renderGameOver, renderScorePopups, setViewportScale, getCtx, getTileSize, addScorePopup } from './renderer.js';
import { GameState } from './game.js';
import { DIRECTION } from './pacman.js';

let game;
let lastTime = 0;

function handleKey(e) {
  const keyMap = {
    ArrowUp: DIRECTION.UP, ArrowDown: DIRECTION.DOWN,
    ArrowLeft: DIRECTION.LEFT, ArrowRight: DIRECTION.RIGHT,
    w: DIRECTION.UP, s: DIRECTION.DOWN, a: DIRECTION.LEFT, d: DIRECTION.RIGHT
  };
  const dir = keyMap[e.key];
  if (dir && game && game.state === 'playing') {
    game.pacman.setDirection(dir);
    e.preventDefault();
  }
  if (e.key === ' ' || e.key === 'Enter') {
    if (!game) return;
    if (game.state === 'gameover') {
      game.restartGame();
    } else if (game.state === 'start') {
      game.state = 'playing';
    }
  }
}

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (game) {
    const prevScore = game.score;
    game.update(dt);

    // Detect dot eaten for sound trigger
    if (game.score > prevScore) {
      // Sound placeholder — Web Audio API integration point
    }

    if (game.state === 'levelcomplete') {
      const ctx = getCtx();
      clearFrame();
      renderMaze(game.maze);
      renderOverlay('LEVEL COMPLETE!', `SCORE: ${game.score}`);
    } else {
      const ctx = getCtx();
      const ts2 = getTileSize();
      clearFrame();
      renderMaze(game.maze);
      renderPacMan(game.pacman);
      game.ghosts.forEach(g => renderGhost(g));
      renderHUD(game.score, game.lives, game.level, game.highScore);
      renderScorePopups(dt);

      if (game.state === 'start') {
        renderOverlay('PAC-MAN', 'PRESS ENTER TO START');
      }
      if (game.state === 'gameover') {
        renderGameOver(game.score);
      }
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
