// Entry point for Pac-Man game — Phase 2 + 3 + 4 upgrades

import { initCanvas, clearFrame, renderMaze, renderPacMan, renderGhost,
         renderHUD, renderOverlay, renderGameOver, renderScorePopups,
         setViewportScale, getCtx, getTileSize, addScorePopup,
         spawnParticles, renderParticles, flashScreen,
         renderMagnetGlow, renderActivePowerUps,
         renderMenu } from './renderer.js';
import { GameState } from './game.js';
import { DIRECTION } from './pacman.js';
import { renderUpgradeScreen, handleUpgradeKey } from './ui/upgradeScreen.js';
import { PowerUpManager } from './powerups/powerup.js';
import { PowerUpStore, UPGRADE_TREE } from './powerups/upgrades.js';
import { COIN_TABLE } from './powerups/index.js';
import { AudioManager } from './audio.js';
import { Leaderboard, NameEntry, renderLeaderboard, renderNameEntry } from './systems/leaderboard.js';

let game;
let lastTime = 0;
let upgradeSelectedIndex = 0;
let store;

// Phase 4 — Audio & Leaderboard
let audio;
let leaderboard;
let nameEntry;
let menuSelectedIndex = 0;  // 0=start game, 1=leaderboard
let enteringName = false;

const MENU_ITEMS = ['START GAME', 'HIGH SCORES'];

// ─── Input ────────────────────────────────────────────────────────────────────

function handleKey(e) {
  const keyMap = {
    ArrowUp: DIRECTION.UP, ArrowDown: DIRECTION.DOWN,
    ArrowLeft: DIRECTION.LEFT, ArrowRight: DIRECTION.RIGHT,
    w: DIRECTION.UP, s: DIRECTION.DOWN, a: DIRECTION.LEFT, d: DIRECTION.RIGHT
  };

  // ── Menu state ──
  if (game && game.state === 'menu') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'w' || e.key === 's') {
      audio.play('menuSelect');
      menuSelectedIndex = (menuSelectedIndex + (e.key === 'ArrowDown' || e.key === 's' ? 1 : -1) + MENU_ITEMS.length) % MENU_ITEMS.length;
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      audio.play('menuSelect');
      if (menuSelectedIndex === 0) {
        game.state = 'playing';
        audio.stopMusic();
        audio.play('gameStart');
        audio.playMusic('gameplay');
      } else {
        game.state = 'leaderboard';
      }
      e.preventDefault();
      return;
    }
    return;
  }

  // ── Leaderboard state ──
  if (game && game.state === 'leaderboard') {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      game.state = 'menu';
      audio.play('menuSelect');
      e.preventDefault();
      return;
    }
    return;
  }

  // ── Paused state ──
  if (game && game.state === 'paused') {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      game.state = 'playing';
      audio.play('menuSelect');
      e.preventDefault();
      return;
    }
    if (e.key === 'q' || e.key === 'Q') {
      game.state = 'menu';
      audio.stopMusic();
      audio.playMusic('menu');
      e.preventDefault();
      return;
    }
    return;
  }

  // ── Game over + name entry ──
  if (game && game.state === 'gameover' && enteringName) {
    if (e.key === 'ArrowLeft') {
      nameEntry.moveCursor(-1);
      audio.play('menuSelect');
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      nameEntry.moveCursor(1);
      audio.play('menuSelect');
      e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.key === 'w') {
      nameEntry.cycleChar(1);
      audio.play('menuSelect');
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 's') {
      nameEntry.cycleChar(-1);
      audio.play('menuSelect');
      e.preventDefault();
    } else if (e.key === 'Enter') {
      nameEntry.confirm();
      const isTop = leaderboard.isHighScore(game.score);
      if (isTop) {
        leaderboard.addEntry({
          name: nameEntry.getName(),
          score: game.score,
          level: game.level,
          date: new Date().toLocaleDateString()
        });
      }
      enteringName = false;
      nameEntry = null;
      game.state = 'leaderboard';
      audio.play('menuSelect');
      e.preventDefault();
    }
    return;
  }

  // ── Game over (waiting for Enter to restart or name entry) ──
  if (game && game.state === 'gameover') {
    if (e.key === 'Enter' || e.key === ' ') {
      if (!enteringName) {
        enteringName = true;
        nameEntry = new NameEntry();
        audio.play('menuSelect');
      }
      e.preventDefault();
    }
    return;
  }

  // ── Upgrade screen navigation ──
  if (game && game.state === 'upgrade') {
    const types = Object.keys(UPGRADE_TREE_BY_TYPE);
    upgradeSelectedIndex = handleUpgradeKey(e.key, upgradeSelectedIndex, types,
      (powerUpType) => {
        const purchased = store.getMaxTier(powerUpType);
        const nextTier = purchased + 1;
        const upgradeId = `${powerUpType}_t${nextTier}`;
        const upgrade = UPGRADE_TREE.find(u => u.id === upgradeId);
        if (!upgrade) return;

        const result = store.purchase(upgradeId);
        if (result) {
          game.powerUpManager.activate(upgrade.powerUpType, result);
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

  // ── Playing state ──
  const dir = keyMap[e.key];
  if (dir && game && game.state === 'playing') {
    game.pacman.setDirection(dir);
    e.preventDefault();
  }

  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (game && game.state === 'playing') {
      game.state = 'paused';
      audio.play('menuSelect');
      e.preventDefault();
    }
    return;
  }

  if (e.key === ' ' || e.key === 'Enter') {
    if (!game) return;
    if (game.state === 'start') {
      game.state = 'playing';
      audio.play('gameStart');
      audio.playMusic('gameplay');
    }
  }
}

// ─── Tab blur → auto-pause ─────────────────────────────────────────────────────
window.addEventListener('blur', () => {
  if (game && game.state === 'playing') {
    game.state = 'paused';
  }
});

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

  // ── RENDER by state ──
  if (game.state === 'menu') {
    clearFrame();
    renderMenu(ctx, canvasW, canvasH, menuSelectedIndex, MENU_ITEMS);
    return; // skip further render

  } else if (game.state === 'leaderboard') {
    clearFrame();
    renderLeaderboard(ctx, leaderboard, canvasW, canvasH, -1);
    return;

  } else if (game.state === 'paused') {
    clearFrame();
    renderMaze(game.maze);
    renderPacMan(game.pacman);
    game.ghosts.forEach(g => renderGhost(g));
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderOverlay('PAUSED', 'ESC: RESUME   Q: QUIT');
    return;

  } else if (game.state === 'upgrade') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderUpgradeScreen(ctx, canvasW, canvasH,
      store.coins,
      store.purchasedUpgrades,
      UPGRADE_TREE_BY_TYPE,
      upgradeSelectedIndex);
    return;

  } else if (game.state === 'playing') {
    game.activeFlash = Math.max(0, game.activeFlash - dt);

    clearFrame();
    renderMaze(game.maze);

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

    // Name entry overlay
    if (enteringName && nameEntry) {
      renderNameEntry(ctx, nameEntry, canvasW, canvasH);
    }

  } else if (game.state === 'dying') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
  } else if (game.state === 'levelcomplete') {
    clearFrame();
    renderMaze(game.maze);
    renderOverlay('LEVEL COMPLETE!', `SCORE: ${game.score}`);
  }

  requestAnimationFrame(gameLoop);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  initCanvas('game', 8);
  setViewportScale(3);

  // Phase 4 — Audio Manager
  audio = new AudioManager();
  window.audio = audio;
  audio.init();
  audio.playMusic('menu');

  // Phase 4 — Leaderboard
  leaderboard = new Leaderboard();
  leaderboard.load();
  window.leaderboard = leaderboard;

  game = new GameState();
  game.state = 'menu'; // start at menu
  menuSelectedIndex = 0;

  // Wire Phase 3 power-up system
  store = new PowerUpStore();
  game.powerUpManager = new PowerUpManager(game);
  game.powerUpStore = store;
  store.earnCoins(COIN_TABLE(game.level));

  // Listen for first interaction to unlock audio
  const unlockAudio = () => {
    audio.init();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
  };
  document.addEventListener('click', unlockAudio);
  document.addEventListener('keydown', unlockAudio);

  window.addEventListener('keydown', handleKey);
  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
}

window.addEventListener('DOMContentLoaded', init);

// ─── Upgrade tree organised by power-up type ──────────────────────────────────
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

// ─── Game event audio hooks (called from game.js / main.js) ────────────────────

/**
 * Call these from game.js methods to trigger audio:
 *   window.audio.play('munch');
 *   window.audio.play('powerup');
 *   window.audio.playGhostEat(ghostEatCount);
 *   window.audio.play('death');
 *   window.audio.play('levelComplete');
 *   window.audio.play('gameStart');
 */
