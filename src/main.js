// Entry point for Pac-Man game — Phase 2 + Phase 3 + Phase 4
// Main Menu, Progression Map, Pause, Game Over + Visual Polish

import { initCanvas, clearFrame, renderMaze, renderPacMan, renderGhost,
         renderHUD, renderOverlay, renderScorePopups,
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
let upgradeSelectedIndex = 0;
let store;
let audio;
let leaderboard;
let nameEntry;

// ── Menu / Navigation State ────────────────────────────────────────────────────
let menuSelectedIndex = 0;       // 0=START GAME, 1=HIGH SCORES, 2=CONTROLS
let pausedSelectedIndex = 0;      // 0=RESUME, 1=RESTART, 2=QUIT
let mapSelectedLevel  = 1;        // currently selected level on progression map
let unlockedLevels   = [1];      // array of unlocked level numbers (1-indexed)
let gameOverAnimFrame = 0;        // frame counter for game over screen animations
const MAX_NAME_LEN = 3;

// ── Input ─────────────────────────────────────────────────────────────────────

function handleKey(e) {
  const keyMap = {
    ArrowUp: DIRECTION.UP, ArrowDown: DIRECTION.DOWN,
    ArrowLeft: DIRECTION.LEFT, ArrowRight: DIRECTION.RIGHT,
    w: DIRECTION.UP, s: DIRECTION.DOWN, a: DIRECTION.LEFT, d: DIRECTION.RIGHT,
  };

  // ── Menu ─────────────────────────────────────────────────────────────────
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
      } else {
        game.state = 'controls';
      }
    }
    e.preventDefault();
    return;
  }

  // ── Controls overlay ────────────────────────────────────────────────────
  if (game && game.state === 'controls') {
    if (e.key === 'Enter' || e.key === 'Escape') {
      game.state = 'menu';
    }
    e.preventDefault();
    return;
  }

  // ── Leaderboard screen ─────────────────────────────────────────────────
  if (game && game.state === 'leaderboard') {
    if (e.key === 'Enter' || e.key === 'Escape') {
      game.state = 'menu';
    }
    e.preventDefault();
    return;
  }

  // ── Progression map ────────────────────────────────────────────────────
  if (game && game.state === 'map') {
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      const idx = unlockedLevels.indexOf(mapSelectedLevel);
      if (idx > 0) { mapSelectedLevel = unlockedLevels[idx - 1]; audio.play('menuSelect'); }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      const idx = unlockedLevels.indexOf(mapSelectedLevel);
      if (idx < unlockedLevels.length - 1) { mapSelectedLevel = unlockedLevels[idx + 1]; audio.play('menuSelect'); }
    } else if (e.key === 'Enter') {
      audio.play('menuSelect');
      const chosen = mapSelectedLevel;
      game.restartGame();
      game.level = chosen;
      game._initLevel();
      game.state = 'playing';
      audio.stopMusic();
      audio.play('gameStart');
    } else if (e.key === 'Escape') {
      game.state = 'menu';
    }
    e.preventDefault();
    return;
  }

  // ── Pause menu ─────────────────────────────────────────────────────────
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
      } else {
        game.state = 'menu';
        menuSelectedIndex = 0;
      }
    } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      game.state = 'playing';
    }
    e.preventDefault();
    return;
  }

  // ── Game Over — name entry ─────────────────────────────────────────────
  if (game && game.state === 'gameover' && enteringName) {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cur   = nameEntry.chars[nameEntry.position];
    const idx   = alpha.indexOf(cur);
    if (e.key === 'ArrowLeft') {
      nameEntry.position = (nameEntry.position - 1 + MAX_NAME_LEN) % MAX_NAME_LEN;
      audio.play('menuSelect');
    } else if (e.key === 'ArrowRight') {
      nameEntry.position = (nameEntry.position + 1) % MAX_NAME_LEN;
      audio.play('menuSelect');
    } else if (e.key === 'ArrowUp') {
      nameEntry.chars[nameEntry.position] = alpha[(idx + 1) % 26];
      audio.play('menuSelect');
    } else if (e.key === 'ArrowDown') {
      nameEntry.chars[nameEntry.position] = alpha[(idx - 1 + 26) % 26];
      audio.play('menuSelect');
    } else if (e.key === 'Enter') {
      nameEntry.confirm();
      const isTop = leaderboard.isHighScore(game.score);
      if (isTop) {
        leaderboard.addEntry({ name: nameEntry.getName(), score: game.score, level: game.level });
      }
      enteringName = false;
      showLeaderboard = true;
      audio.play('menuSelect');
    }
    e.preventDefault();
    return;
  }

  // ── Game Over — showing leaderboard ────────────────────────────────────
  if (game && game.state === 'gameover' && game.showLeaderboard) {
    if (e.key === 'Enter') {
      game.state = 'menu';
      menuSelectedIndex = 0;
    }
    e.preventDefault();
    return;
  }

  // ── Game Over — waiting to start name entry ────────────────────────────
  if (game && game.state === 'gameover') {
    if (!enteringName && !showLeaderboard && (e.key === 'Enter' || e.key === ' ')) {
      enteringName = true;
      nameEntry = new NameEntry();
      audio.play('menuSelect');
    }
    e.preventDefault();
    return;
  }

  // ── Upgrade screen ─────────────────────────────────────────────────────
  if (game && game.state === 'upgrade') {
    const types = Object.keys(UPGRADE_TREE_BY_TYPE);
    upgradeSelectedIndex = handleUpgradeKey(e.key, upgradeSelectedIndex, types,
      (powerUpType) => {
        const purchased = store.getMaxTier(powerUpType);
        const nextTier  = purchased + 1;
        const upgradeId = `${powerUpType}_t${nextTier}`;
        const upgrade  = UPGRADE_TREE.find(u => u.id === upgradeId);
        if (!upgrade) return;
        const result = store.purchase(upgradeId);
        if (result) {
          game.powerUpManager.activate(upgrade.powerUpType, result);
          const c = getCtx();
          const t = getTileSize();
          spawnParticles(game.pacman.pixelX + t / 2, game.pacman.pixelY + t / 2, '#ffdd00', 12);
          game.activeFlash = 0.3;
          audio.play('powerup');
        }
        // After purchase, return to progression map
        game.state = 'map';
      }
    );
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key)) {
      e.preventDefault();
    }
    return;
  }

  // ── Gameplay ───────────────────────────────────────────────────────────
  const dir = keyMap[e.key];
  if (dir && game && (game.state === 'playing' || game.state === 'dying')) {
    game.pacman.setDirection(dir);
    e.preventDefault();
  }

  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && game) {
    if (game.state === 'playing') {
      game.state = 'paused';
      pausedSelectedIndex = 0;
      audio.play('menuSelect');
    }
    e.preventDefault();
    return;
  }

  if ((e.key === ' ') || (e.key === 'Enter')) {
    if (!game) return;
    if (game.state === 'start') {
      game.state = 'playing';
      audio.play('gameStart');
      audio.stopMusic();
    }
  }
}

// ─── Game loop ───────────────────────────────────────────────────────────────

function gameLoop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (!game) { requestAnimationFrame(gameLoop); return; }

  const ctx      = getCtx();
  const t        = getTileSize();
  const canvasW  = 28 * t;
  const canvasH  = 31 * t + 16;

  ctx.save();
  applyShake(ctx);

  // ── UPDATE ────────────────────────────────────────────────────────────
  // NOTE: 'dying' state is a visual freeze only — no physics updates.
  if (game.state === 'playing') {
    game.update(dt);
    if (game.powerUpManager) {
      game.powerUpManager.update(dt * 1000);
    }
  }

  // ── RENDER by state ────────────────────────────────────────────────────
  if (game.state === 'menu') {
    clearFrame();
    tickMenuAnim(dt);
    renderMainMenu(ctx, canvasW, canvasH, menuSelectedIndex);

  } else if (game.state === 'controls') {
    clearFrame();
    renderControlsScreen(ctx, canvasW, canvasH);

  } else if (game.state === 'leaderboard') {
    clearFrame();
    renderLeaderboardScreen(ctx, canvasW, canvasH);

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

    // Flash maze walls during mode-shift (power-pellet, ~6 frames)
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
    if (game.activeFlash > 0) flashScreen(ctx, canvasW, canvasH, game.activeFlash);
    renderScorePopups(dt);

  } else if (game.state === 'dying') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
    // Red flash during death freeze
    if (game.dyingTimer > game.dyingMax * 0.5) {
      flashScreen(ctx, canvasW, canvasH, (game.dyingTimer / game.dyingMax) * 0.4);
    }

  } else if (game.state === 'levelcomplete') {
    clearFrame();
    renderMaze(game.maze);
    renderOverlay('LEVEL COMPLETE!', `SCORE: ${game.score}`);
    // Wipe transition animation
    const elapsed = game.levelCompleteMax - game.levelCompleteTimer;
    const wp = Math.min(1, elapsed / (game.levelCompleteMax || 2));
    screenWipe(ctx, canvasW, canvasH, wp, 'left');

  } else if (game.state === 'upgrade') {
    clearFrame();
    renderMaze(game.maze);
    renderHUD(game.score, game.lives, game.level, game.highScore);
    renderUpgradeScreen(ctx, canvasW, canvasH,
      store.coins, store.purchasedUpgrades, UPGRADE_TREE_BY_TYPE, upgradeSelectedIndex);

  } else if (game.state === 'gameover') {
    clearFrame();
    gameOverAnimFrame++;
    if (enteringName && nameEntry) {
      // Render game scene behind, then name entry on top
      renderMaze(game.maze);
      renderHUD(game.score, game.lives, game.level, game.highScore);
      renderNameEntry(ctx, nameEntry, canvasW, canvasH);
    } else if (game.showLeaderboard) {
      renderMaze(game.maze);
      renderHUD(game.score, game.lives, game.level, game.highScore);
      renderLeaderboard(ctx, leaderboard, canvasW, canvasH);
    } else {
      renderMaze(game.maze);
      renderHUD(game.score, game.lives, game.level, game.highScore);
      renderGameOverScreen(ctx, canvasW, canvasH, game.score,
        leaderboard.isHighScore(game.score),
        leaderboard.getTop(10).map((e, i) => ({ ...e, isNew: i === 0 && e.score === game.score })),
        ['A','A','A'],
        gameOverAnimFrame);
    }
  }

  ctx.restore();
  requestAnimationFrame(gameLoop);
}

// ─── Inline screen renderers ───────────────────────────────────────────────────

function renderControlsScreen(ctx, canvasW, canvasH) {
  const t = 8;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${t * 2.5}px monospace`;
  ctx.textAlign = 'center';
  const title = 'CONTROLS';
  ctx.fillText(title, canvasW / 2, 55);
  const lines = [
    'ARROWS / WASD  —  Move Pac-Man',
    'ESC / P        —  Pause game',
    'ENTER / SPACE  —  Confirm',
    '',
    'Eat dots, avoid ghosts!',
    'Power pellets make ghosts',
    'vulnerable (blue flash).',
  ];
  ctx.font = `${t * 1.2}px monospace`;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvasW / 2, 105 + i * 22);
  });
  ctx.fillStyle = '#888888';
  ctx.font = `${t}px monospace`;
  const hint = 'Press ENTER or ESC to go back';
  ctx.fillText(hint, canvasW / 2, canvasH - 16);
  ctx.textAlign = 'left';
}

function renderLeaderboardScreen(ctx, canvasW, canvasH) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);
  const t = 8;
  ctx.fillStyle = '#ffff00';
  ctx.font = `bold ${t * 2.5}px monospace`;
  ctx.textAlign = 'center';
  const title = 'HIGH SCORES';
  ctx.fillText(title, canvasW / 2, 60);
  const top = leaderboard.getTop(10);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${t * 1.4}px monospace`;
  for (let i = 0; i < Math.min(top.length, 10); i++) {
    const e = top[i];
    const text = `${i + 1}.  ${e.name}    ${String(e.score).padStart(6, '0')}`;
    ctx.fillText(text, canvasW / 2, 100 + i * 18);
  }
  ctx.fillStyle = '#888888';
  ctx.font = `${t}px monospace`;
  const hint = 'PRESS ENTER TO GO BACK';
  ctx.fillText(hint, canvasW / 2, canvasH - 16);
  ctx.textAlign = 'left';
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  initCanvas('game', 8);
  setViewportScale(3);

  audio = new AudioManager();
  window.audio = audio;
  audio.init();
  audio.playMusic('menu');

  leaderboard = new Leaderboard();
  leaderboard.load();

  game = new GameState();
  game.state = 'menu';

  store = new PowerUpStore();
  game.powerUpManager = new PowerUpManager(game);
  game.powerUpStore   = store;
  store.earnCoins(COIN_TABLE(game.level));

  // Phase 4: level unlock callback (called by game.js nextLevel)
  window.__onLevelComplete = function(level) {
    if (!unlockedLevels.includes(level) && level <= 15) {
      unlockedLevels.push(level);
      unlockedLevels.sort((a, b) => a - b);
    }
  };

  window.addEventListener('keydown', handleKey);
  window.addEventListener('blur', () => {
    if (game && game.state === 'playing') {
      game.state = 'paused';
      pausedSelectedIndex = 0;
    }
  });

  requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });
}

window.addEventListener('DOMContentLoaded', init);

// ─── Upgrade tree organised by power-up type ────────────────────────────────────

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
