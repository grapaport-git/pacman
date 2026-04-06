// Entry point for Pac-Man game — Phase 2 + Phase 3 upgrades

import { initCanvas, clearFrame, renderMaze, renderPacMan, renderGhost,
         renderHUD, renderOverlay, renderGameOver, renderScorePopups,
         setViewportScale, getCtx, getTileSize, addScorePopup,
         spawnParticles, renderParticles, flashScreen,
         renderMagnetGlow, renderActivePowerUps } from './renderer.js';
import { GameState } from './game.js';
import { DIRECTION } from './pacman.js';
import { renderUpgradeScreen, handleUpgradeKey } from './ui/upgradeScreen.js';
import { PowerUpManager } from './powerups/powerup.js';
import { PowerUpStore, UPGRADE_TREE } from './powerups/upgrades.js';
import { COIN_TABLE } from './powerups/index.js';

let game;
let lastTime = 0;
let upgradeSelectedIndex = 0;
let store;

// ─── Input ────────────────────────────────────────────────────────────────────

function handleKey(e) {
  const keyMap = {
    ArrowUp: DIRECTION.UP, ArrowDown: DIRECTION.DOWN,
    ArrowLeft: DIRECTION.LEFT, ArrowRight: DIRECTION.RIGHT,
    w: DIRECTION.UP, s: DIRECTION.DOWN, a: DIRECTION.LEFT, d: DIRECTION.RIGHT
  };

  // Upgrade screen navigation
  if (game && game.state === 'upgrade') {
    const types = Object.keys(UPGRADE_TREE_BY_TYPE);
    upgradeSelectedIndex = handleUpgradeKey(e.key, upgradeSelectedIndex, types,
      (powerUpType) => {
        // Find highest unpurchased tier for this type
        const purchased = store.getMaxTier(powerUpType);
        const nextTier = purchased + 1;
        const upgradeId = `${powerUpType}_t${nextTier}`;
        const upgrade = UPGRADE_TREE.find(u => u.id === upgradeId);
        if (!upgrade) return;

        const result = store.purchase(upgradeId);
        if (result) {
          game.powerUpManager.activate(upgrade.powerUpType, result);
          // Visual feedback
          const c = getCtx();
          const t = getTileSize();
          spawnParticles(
            game.pacman.pixelX + t / 2,
            game.pacman.pixelY + t / 2,
            '#ffdd00', 12
          );
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
  game.update(dt);

  // Tick power-up manager (ms)
  if (game.powerUpManager) {
    game.powerUpManager.update(dt * 1000);
  }

  if (game.state === 'levelcomplete') {
    clearFrame();
    renderMaze(game.maze);
    renderOverlay('LEVEL COMPLETE!', `SCORE: ${game.score}`);
  } else if (game.state === 'upgrade') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderUpgradeScreen(ctx, canvasW, canvasH,
      store.coins,
      store.purchasedUpgrades,
      UPGRADE_TREE_BY_TYPE,
      upgradeSelectedIndex);
  } else if (game.state === 'playing') {
    game.activeFlash = Math.max(0, game.activeFlash - dt);

    clearFrame();
    renderMaze(game.maze);

    // Magnet glow effect
    if (game.magnetActive) {
      renderMagnetGlow(ctx, game.pacman.tileX, game.pacman.tileY, ts2,
        game.magnetRadius || 4);
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
  } else if (game.state === 'dying') {
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

  // Wire Phase 3 power-up system (Cody's backend)
  store = new PowerUpStore();
  game.powerUpManager = new PowerUpManager(game);
  game.powerUpStore = store;
  // Earn coins for the level completed
  store.earnCoins(COIN_TABLE(game.level));

  window.addEventListener('keydown', handleKey);
  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
}

window.addEventListener('DOMContentLoaded', init);

// ─── Upgrade tree organised by power-up type (for upgradeScreen) ──────────────
// Map of type id → { name, icon, color, tiers: [...] }
// This feeds the upgrade screen's card layout.

const _types = {};
for (const u of UPGRADE_TREE) {
  if (!_types[u.powerUpType]) {
    _types[u.powerUpType] = {
      name: u.powerUpType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      tiers: [],
    };
  }
  _types[u.powerUpType].tiers.push(u);
}

const UPGRADE_TREE_BY_TYPE = {};
for (const [id, data] of Object.entries(_types)) {
  UPGRADE_TREE_BY_TYPE[id] = data;
}
