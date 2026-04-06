// Game state manager for Pac-Man — Phase 2

import { MAZE_DATA, getTile, isWall, isTunnel, countDots, countPowerPellets } from './maze.js';
import { PacMan, DIRECTION } from './pacman.js';
import { Ghost, Blinky, Pinky, Inky, Clyde, GHOST_MODE } from './ghosts.js';
import { LEVEL_CONFIG, LEVELS, generateLevel } from './levels/index.js';

export class GameState {
  constructor() {
    this.state = 'start';
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pacman_highscore') || '0');
    this.lives = 3;
    this.level = 1;
    this.powerMode = false;
    this.powerTimer = 0;
    this.ghostEatScore = 0;
    this.dyingTimer = 0;
    this.dyingMax = 0.5;
    this.levelCompleteTimer = 0;
    this.levelCompleteMax = 2.0;
    this.dotsRemaining = 0;
    this.maze = [];
    this.pacman = null;
    this.ghosts = [];
    this._initLevel();
  }

  _initLevel() {
    this.maze = (this.level > 2)
      ? generateLevel(this.level).map(row => [...row])
      : (this.level === 2 ? LEVELS[1].map(row => [...row]) : MAZE_DATA.map(row => [...row]));
    this.dotsRemaining = countDotsInMaze(this.maze);
    this.powerMode = false;
    this.powerTimer = 0;
    this.ghostEatScore = 0;

    const cfg = LEVEL_CONFIG[Math.min(this.level - 1, 14)];

    if (!this.pacman) {
      this.pacman = new PacMan(14, 23);
      this.ghosts = [
        new Blinky(),
        new Pinky(),
        new Inky(),
        new Clyde()
      ];
    } else {
      this.pacman.respawn();
      this.ghosts.forEach(g => g.respawn());
    }

    // Apply level speed config
    this.ghosts.forEach((g, i) => {
      g.speed = i === 0 ? cfg.blinkySpeed : cfg.ghostSpeed;
    });
  }

  _currentConfig() {
    return LEVEL_CONFIG[Math.min(this.level - 1, 14)];
  }

  activatePowerMode() {
    const cfg = this._currentConfig();
    this.powerMode = true;
    this.powerTimer = cfg.frightenedDuration;
    this.ghostEatScore = 0;
    this.ghosts.forEach(g => {
      if (g.mode !== GHOST_MODE.DEAD) {
        g.enterFrightened();
        g.speed = Math.max(3, g.speed - 2);
      }
    });
  }

  eatDot(x, y) {
    if (!this.maze[y] || this.maze[y][x] === undefined) return false;
    const tile = this.maze[y][x];
    const cfg = this._currentConfig();
    if (tile === 2) {
      this.maze[y][x] = 0;
      this.score += cfg.dotBonus;
      this.dotsRemaining--;
      return true;
    }
    if (tile === 3) {
      this.maze[y][x] = 0;
      this.score += 50;
      this.dotsRemaining--;
      this.activatePowerMode();
      return true;
    }
    return false;
  }

  loseLife() {
    this.lives--;
    this.state = 'dying';
    this.dyingTimer = this.dyingMax;
  }

  respawn() {
    if (this.lives <= 0) {
      this.state = 'gameover';
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('pacman_highscore', String(this.score));
      }
    } else {
      this.pacman.respawn();
      this.ghosts.forEach(g => g.respawn());
      this.state = 'playing';
    }
  }

  isLevelComplete() {
    return this.dotsRemaining <= 0;
  }

  checkGhostCollision() {
    if (this.state !== 'playing') return;
    const px = this.pacman.tileX;
    const py = this.pacman.tileY;

    for (const ghost of this.ghosts) {
      const dist = Math.abs(ghost.tileX - px) + Math.abs(ghost.tileY - py);
      if (dist < 1) {
        if (ghost.mode === GHOST_MODE.FRIGHTENED) {
          ghost.enterDead();
          this.ghostEatScore = this.ghostEatScore === 0 ? 200
            : this.ghostEatScore === 200 ? 400
            : this.ghostEatScore === 400 ? 800 : 1600;
          this.score += this.ghostEatScore;
        } else if (ghost.mode === GHOST_MODE.CHASE || ghost.mode === GHOST_MODE.SCATTER) {
          this.loseLife();
        }
      }
    }
  }

  nextLevel() {
    this.level++;
    this._initLevel();
    this.state = 'playing';
  }

  restartGame() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this._initLevel();
    this.state = 'playing';
  }

  update(dt) {
    if (this.state === 'dying') {
      this.dyingTimer -= dt;
      if (this.dyingTimer <= 0) this.respawn();
      return;
    }

    if (this.state === 'levelcomplete') {
      this.levelCompleteTimer -= dt;
      if (this.levelCompleteTimer <= 0) this.nextLevel();
      return;
    }

    if (this.state === 'gameover' || this.state === 'start') return;

    // Power mode countdown
    if (this.powerMode) {
      this.powerTimer -= dt * 1000;
      if (this.powerTimer <= 0) {
        this.powerMode = false;
        const cfg = this._currentConfig();
        this.ghosts.forEach(g => {
          if (g.mode === GHOST_MODE.FRIGHTENED) {
            g.enterChase();
            g.speed = g.name === 'blinky' ? cfg.blinkySpeed : cfg.ghostSpeed;
          }
        });
      }
    }

    // Update Pac-Man
    this.pacman.update(dt, (x, y) => {
      if (isTunnel(x, y)) return false;
      return isWall(x, y);
    });

    // Eat dot at current tile
    this.eatDot(this.pacman.tileX, this.pacman.tileY);

    // Update ghosts
    const blinky = this.ghosts[0];
    this.ghosts.forEach(g => {
      g.update(dt,
        (x, y) => { if (isTunnel(x, y)) return false; return isWall(x, y); },
        { x: this.pacman.tileX, y: this.pacman.tileY },
        { x: blinky.tileX, y: blinky.tileY }
      );
    });

    // Collision check
    this.checkGhostCollision();

    // Level complete
    if (this.isLevelComplete()) {
      this.state = 'levelcomplete';
      this.levelCompleteTimer = this.levelCompleteMax;
    }
  }
}

function countDotsInMaze(maze) {
  let count = 0;
  for (let row of maze) {
    for (let cell of row) {
      if (cell === 2 || cell === 3) count++;
    }
  }
  return count;
}
