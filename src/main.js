// Entry point for Pac-Man game — Phase 2 + Phase 3 upgrades

import { initCanvas, clearFrame, renderMaze, renderPacMan, renderGhost,
         renderHUD, renderOverlay, renderGameOver, renderScorePopups,
         setViewportScale, getCtx, getTileSize, addScorePopup,
         spawnParticles, renderParticles, flashScreen,
         renderMagnetGlow, renderActivePowerUps } from './renderer.js';
import { GameState } from './game.js';
import { DIRECTION } from './pacman.js';
import { renderUpgradeScreen, handleUpgradeKey } from './ui/upgradeScreen.js';

let game;
let lastTime = 0;
let upgradeSelectedIndex = 0;

// ─── Phase 3: Power-up tree & manager (stub — Cody fills in backend) ────────

const UPGRADE_TREE = {
  speed:       { tier: 1, cost: 100, duration: 8 },
  triple:      { tier: 2, cost: 200, duration: 0  },
  ghostfreeze: { tier: 1, cost: 150, duration: 6 },
  scoreboost:  { tier: 1, cost: 120, duration: 10 },
  magnet:      { tier: 2, cost: 250, duration: 7 },
  shield:      { tier: 1, cost: 100, duration: 5 },
  ghostbomb:   { tier: 3, cost: 300, duration: 0 },
  slowmo:      { tier: 1, cost: 180, duration: 6 },
};

// Minimal PowerUpManager stub — replaced by Cody's full implementation
class MinimalPowerUpManager {
  constructor(game) { this.game = game; this.activePowerUps = {}; }
  update(dt) {}
  activate(type) {
    const cfg = UPGRADE_TREE[type];
    if (!cfg) return;
    this.activePowerUps[type] = { timer: cfg.duration, maxDuration: cfg.duration };
    // Wire game flags based on type
    if (type === 'magnet')      { this.game.magnetActive = true;  this.game.magnetRadius = 4; }
    if (type === 'shield')      { this.game.invincible    = true; }
    if (type === 'scoreboost')  { this.game.scoreMultiplier = 2; }
    if (type === 'speed')       { this.game.pacman.speedBoost = 1.4; }
  }
  isActive(type) { return !!this.activePowerUps[type]; }
}

// ─── Input ────────────────────────────────────────────────────────────────────

function handleKey(e) {
  const keyMap = {
    ArrowUp: DIRECTION.UP, ArrowDown: DIRECTION.DOWN,
    ArrowLeft: DIRECTION.LEFT, ArrowRight: DIRECTION.RIGHT,
    w: DIRECTION.UP, s: DIRECTION.DOWN, a: DIRECTION.LEFT, d: DIRECTION.RIGHT
  };

  // Upgrade screen navigation
  if (game && game.state === 'upgrade') {
    const types = Object.keys(UPGRADE_TREE);
    upgradeSelectedIndex = handleUpgradeKey(e.key, upgradeSelectedIndex, types,
      (type) => {
        const cfg = UPGRADE_TREE[type];
        if (!game.powerUpStore.purchasedUpgrades.includes(type) &&
            game.powerUpStore.coins >= cfg.cost) {
          game.powerUpStore.coins -= cfg.cost;
          game.powerUpStore.purchasedUpgrades.push(type);
          game.powerUpManager.activate(type);
          const c = getCtx();
          const t = getTileSize();
          spawnParticles(game.pacman.pixelX + t/2, game.pacman.pixelY + t/2,
                         '#ffdd00', 12);
          game.activeFlash = 0.3;
        }
        game.state = 'playing';
      }
    );
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key)) {
      e.preventDefault();
    }
    return;
  }

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

// ─── Game loop ───────────────────────────────────────────────────────────────

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (!game) { requestAnimationFrame(gameLoop); return; }

  const ctx = getCtx();
  const ts2 = getTileSize();
  const canvasW = 28 * ts2;
  const canvasH = 31 * ts2 + 16;

  // ── UPDATE ──
  const prevScore = game.score;
  game.update(dt);

  if (game.state === 'levelcomplete') {
    clearFrame();
    renderMaze(game.maze);
    renderOverlay('LEVEL COMPLETE!', `SCORE: ${game.score}`);
  } else if (game.state === 'upgrade') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderUpgradeScreen(ctx, canvasW, canvasH,
      game.powerUpStore.coins,
      game.powerUpStore.purchasedUpgrades,
      UPGRADE_TREE,
      upgradeSelectedIndex);
  } else if (game.state === 'playing') {
    game.activeFlash = Math.max(0, game.activeFlash - dt);

    clearFrame();
    renderMaze(game.maze);

    // Magnet glow
    if (game.magnetActive) {
      renderMagnetGlow(ctx, game.pacman.tileX, game.pacman.tileY, ts2);
    }

    renderPacMan(game.pacman);
    game.ghosts.forEach(g => renderGhost(g));
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderActivePowerUps(ctx, game.powerUpManager, ts2);
    renderParticles(ctx);
    if (game.activeFlash > 0) {
      flashScreen(ctx, canvasW, canvasH, game.activeFlash);
    }
    renderScorePopups(dt);

    if (game.state === 'start') {
      renderOverlay('PAC-MAN', 'PRESS ENTER TO START');
    }
  } else if (game.state === 'gameover') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderGameOver(game.score);
  } else if (game.state === 'dying' || game.state === 'levelcomplete') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
  }

  requestAnimationFrame(gameLoop);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  initCanvas('game', 8);
  setViewportScale(3);

  game = new GameState();

  // Wire Phase 3 power-up system (stub manager; Cody replaces with full impl)
  game.powerUpManager = new MinimalPowerUpManager(game);
  // Start with some coins for demo
  game.powerUpStore.coins = 500;

  window.addEventListener('keydown', handleKey);
  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
}

window.addEventListener('DOMContentLoaded', init);
