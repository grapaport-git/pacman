// Entry point for Pac-Man game — Phase 2 + Phase 3 + Phase 4 upgrades

import { initCanvas, clearFrame, renderMaze, renderPacMan, renderGhost,
         renderHUD, renderOverlay, renderGameOver, renderScorePopups,
         setViewportScale, getCtx, getTileSize, addScorePopup,
         spawnParticles, renderParticles, flashScreen,
         renderMagnetGlow, renderActivePowerUps,
         screenShake, applyShake, screenWipe, flashModeShift } from './renderer.js';
import { GameState } from './game.js';
import { DIRECTION } from './pacman.js';
import { renderUpgradeScreen, handleUpgradeKey } from './ui/upgradeScreen.js';
import { PowerUpManager } from './powerups/powerup.js';
import { PowerUpStore, UPGRADE_TREE } from './powerups/upgrades.js';
import { COIN_TABLE } from './powerups/index.js';
import { AudioManager } from './audio.js';
import { Leaderboard, NameEntry, renderLeaderboard, renderNameEntry } from './systems/leaderboard.js';
import { renderMainMenu, tickMenuAnim } from './screens/menu.js';
import { renderPauseMenu } from './screens/pause.js';
import { renderProgressionMap } from './screens/progressionMap.js';
import { renderGameOverScreen } from './screens/gameOver.js';

let game;
let lastTime = 0;
let animFrame = 0;
let upgradeSelectedIndex = 0;
let store;
let audio;
let leaderboard;
let nameEntry;

// Menu state
let menuSelectedIndex = 0; // 0=START GAME, 1=HIGH SCORES, 2=CONTROLS
let pausedSelectedIndex = 0; // 0=RESUME, 1=RESTART, 2=QUIT
let mapSelectedLevel = 1; // selected level on progression map
let unlockedLevels = 1; // highest unlocked level

// ─── Input ────────────────────────────────────────────────────────────────────

function handleKey(e) {
  const keyMap = {
    ArrowUp: DIRECTION.UP, ArrowDown: DIRECTION.DOWN,
    ArrowLeft: DIRECTION.LEFT, ArrowRight: DIRECTION.RIGHT,
    w: DIRECTION.UP, s: DIRECTION.DOWN, a: DIRECTION.LEFT, d: DIRECTION.RIGHT
  };

  // Menu navigation
  if (game && game.state === 'menu') {
    if (e.key === 'ArrowUp') {
      menuSelectedIndex = (menuSelectedIndex - 1 + 3) % 3;
      audio.play('menuSelect');
    } else if (e.key === 'ArrowDown') {
      menuSelectedIndex = (menuSelectedIndex + 1) % 3;
      audio.play('menuSelect');
    } else if (e.key === 'Enter') {
      audio.play('menuSelect');
      if (menuSelectedIndex === 0) {
        // START GAME → progression map
        game.state = 'map';
      } else if (menuSelectedIndex === 1) {
        game.state = 'leaderboard';
      } else if (menuSelectedIndex === 2) {
        // CONTROLS — just show controls overlay briefly
        game.state = 'controls';
      }
    }
    e.preventDefault();
    return;
  }

  // Controls overlay
  if (game && game.state === 'controls') {
    if (e.key === 'Enter' || e.key === 'Escape') {
      game.state = 'menu';
    }
    e.preventDefault();
    return;
  }

  // Leaderboard screen
  if (game && game.state === 'leaderboard') {
    if (e.key === 'Enter' || e.key === 'Escape') {
      game.state = 'menu';
    }
    e.preventDefault();
    return;
  }

  // Progression map
  if (game && game.state === 'map') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      const idx = unlockedLevels.indexOf(mapSelectedLevel);
      if (idx > 0) { mapSelectedLevel = unlockedLevels[idx - 1]; audio.play('menuSelect'); }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      const idx = unlockedLevels.indexOf(mapSelectedLevel);
      if (idx < unlockedLevels.length - 1) { mapSelectedLevel = unlockedLevels[idx + 1]; audio.play('menuSelect'); }
    } else if (e.key === 'Enter') {
      audio.play('menuSelect');
      // Start selected level
      const chosenLevel = mapSelectedLevel;
      game.restartGame();
      game.level = chosenLevel;
      game._initLevel();
      game.state = 'start';
      audio.play('gameStart');
      audio.stopMusic();
    } else if (e.key === 'Escape') {
      game.state = 'menu';
    }
    e.preventDefault();
    return;
  }

  // Pause menu
  if (game && game.state === 'paused') {
    if (e.key === 'ArrowUp') {
      pausedSelectedIndex = (pausedSelectedIndex - 1 + 3) % 3;
      audio.play('menuSelect');
    } else if (e.key === 'ArrowDown') {
      pausedSelectedIndex = (pausedSelectedIndex + 1) % 3;
      audio.play('menuSelect');
    } else if (e.key === 'Enter') {
      audio.play('menuSelect');
      if (pausedSelectedIndex === 0) {
        game.state = 'playing';
      } else if (pausedSelectedIndex === 1) {
        game.restartGame();
        game.state = 'playing';
      } else if (pausedSelectedIndex === 2) {
        game.state = 'menu';
        menuSelectedIndex = 0;
      }
    }
    e.preventDefault();
    return;
  }

  // Game Over — name entry
  if (game && game.state === 'gameover' && game.enteringName) {
    if (e.key === 'Enter') {
      const name = nameEntry.getName();
      leaderboard.addEntry({ name, score: game.score, level: game.level });
      game.enteringName = false;
      game.showLeaderboard = true;
      audio.play('menuSelect');
    } else {
      nameEntry.handleKey(e.key);
    }
    e.preventDefault();
    return;
  }

  // Game Over — showing leaderboard
  if (game && game.state === 'gameover' && game.showLeaderboard) {
    if (e.key === 'Enter') {
      game.state = 'menu';
      menuSelectedIndex = 0;
    }
    e.preventDefault();
    return;
  }

  // Upgrade screen navigation
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
          audio.play('powerup');
        }
        // After buying upgrade, return to level select
        game.state = 'map';
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

  // Pause toggle
  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && game) {
    if (game.state === 'playing') {
      game.state = 'paused';
      pausedSelectedIndex = 0;
    } else if (game.state === 'paused') {
      game.state = 'playing';
    }
    e.preventDefault();
  }

  // Start/restart
  if (e.key === ' ' || e.key === 'Enter') {
    if (!game) return;
    if (game.state === 'start') {
      game.state = 'playing';
      audio.play('gameStart');
      audio.stopMusic();
    } else if (game.state === 'gameover' && !game.enteringName && !game.showLeaderboard) {
      game.restartGame();
      game.state = 'playing';
    }
    e.preventDefault();
  }
}

// ─── Game loop ───────────────────────────────────────────────────────────────

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (!game) { requestAnimationFrame(gameLoop); return; }

  const ctx = getCtx();
  const t = getTileSize();
  const canvasW = 28 * t;
  const canvasH = 31 * t + 16;

  ctx.save();
  applyShake(ctx);

  // ── UPDATE ──
  if (game.state === 'playing' || game.state === 'dying') {
    game.update(dt);
    if (game.powerUpManager) {
      game.powerUpManager.update(dt * 1000);
    }
  }

  // ── RENDER by state ──
  if (game.state === 'menu') {
    clearFrame();
    tickMenuAnim(dt);
    renderMainMenu(ctx, canvasW, canvasH, menuSelectedIndex);

  } else if (game.state === 'controls') {
    clearFrame();
    renderControlsOverlay(ctx, canvasW, canvasH);

  } else if (game.state === 'leaderboard') {
    clearFrame();
    renderLeaderboard(ctx, leaderboard, canvasW, canvasH);

  } else if (game.state === 'map') {
    clearFrame();
    renderProgressionMap(ctx, canvasW, canvasH, game.level, unlockedLevels, mapSelectedLevel);

  } else if (game.state === 'paused') {
    clearFrame();
    renderMaze(game.maze);
    renderPacMan(game.pacman);
    game.ghosts.forEach(g => renderGhost(g));
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderPauseMenu(ctx, canvasW, canvasH, pausedSelectedIndex);

  } else if (game.state === 'start') {
    clearFrame();
    renderMaze(game.maze);
    renderPacMan(game.pacman);
    game.ghosts.forEach(g => renderGhost(g));
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderOverlay('PAC-MAN', 'PRESS ENTER TO START');

  } else if (game.state === 'playing') {
    game.activeFlash = Math.max(0, game.activeFlash - dt);

    clearFrame();
    renderMaze(game.maze);

    // Flash maze walls during mode-shift (power-pellet)
    if (game.modeShiftFrames > 0) {
      flashModeShift(ctx, game.maze, game.modeShiftFrames);
    }

    if (game.magnetActive) {
      renderMagnetGlow(ctx, game.pacman.tileX, game.pacman.tileY, t, game.magnetRadius || 4);
    }

    renderPacMan(game.pacman);
    game.ghosts.forEach(g => renderGhost(g));
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderActivePowerUps(ctx, game.powerUpManager, t);
    renderParticles(ctx);
    if (game.activeFlash > 0) {
      flashScreen(ctx, canvasW, canvasH, game.activeFlash);
    }
    renderScorePopups(dt);

  } else if (game.state === 'dying') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);

  } else if (game.state === 'levelcomplete') {
    clearFrame();
    renderMaze(game.maze);
    renderOverlay('LEVEL COMPLETE!', `SCORE: ${game.score}`);
    const wp = Math.min(1, 1 - game.levelCompleteTimer / (game.levelCompleteMax || 2));
    screenWipe(ctx, canvasW, canvasH, wp, 'left');

  } else if (game.state === 'upgrade') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderUpgradeScreen(ctx, canvasW, canvasH,
      store.coins,
      store.purchasedUpgrades,
      UPGRADE_TREE_BY_TYPE,
      upgradeSelectedIndex);

  } else if (game.state === 'gameover') {
    clearFrame();
    if (game.enteringName) {
      renderNameEntry(ctx, nameEntry, game.score, canvasW, canvasH);
    } else if (game.showLeaderboard) {
      renderMaze(game.maze);
      renderHUD(game.score, game.lives, game.level, game.highScore);
      renderLeaderboard(ctx, leaderboard, canvasW, canvasH);
    } else {
      renderMaze(game.maze);
      renderHUD(game.score, game.lives, game.level, game.highScore);
      renderGameOver(game.score, leaderboard.isHighScore(game.score));
    }
  }

  requestAnimationFrame(gameLoop);

  ctx.restore();
}

function renderControlsOverlay(ctx, canvasW, canvasH) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.floor(canvasH * 0.04)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('CONTROLS', canvasW / 2, canvasH * 0.15);

  const lines = [
    'ARROWS / WASD — Move',
    'ESC / P — Pause',
    'ENTER — Start / Confirm',
    '',
    'Eat dots and power pellets',
    'Avoid ghosts!',
  ];
  ctx.font = `${Math.floor(canvasH * 0.03)}px monospace`;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvasW / 2, canvasH * (0.28 + i * 0.07));
  });

  ctx.fillStyle = '#888';
  ctx.font = `${Math.floor(canvasH * 0.025)}px monospace`;
  ctx.fillText('Press ENTER or ESC to return', canvasW / 2, canvasH * 0.82);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  initCanvas('game', 8);
  setViewportScale(3);

  // Phase 4: level unlock callback (called by game.js nextLevel)
  window.__onLevelComplete = function(level) {
    if (!unlockedLevels.includes(level) && level <= 15) {
      unlockedLevels.push(level);
      unlockedLevels.sort((a, b) => a - b);
    }
  };

  // Phase 4 audio + leaderboard
  audio = new AudioManager();
  audio.init();
  leaderboard = new Leaderboard();
  leaderboard.load();
  nameEntry = new NameEntry();

  game = new GameState();

  // Wire Phase 3 power-up system
  store = new PowerUpStore();
  game.powerUpManager = new PowerUpManager(game);
  game.powerUpStore = store;
  store.earnCoins(COIN_TABLE(game.level));

  // Start at menu
  game.state = 'menu';
  menuSelectedIndex = 0;
  audio.playMusic('menu');

  window.addEventListener('keydown', handleKey);

  // Tab blur → auto-pause
  window.addEventListener('blur', () => {
    if (game && game.state === 'playing') {
      game.state = 'paused';
      pausedSelectedIndex = 0;
    }
  });

  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
}

window.addEventListener('DOMContentLoaded', init);

// ─── Upgrade tree by type ──────────────────────────────────────────────────────
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
