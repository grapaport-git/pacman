// Game state manager for Pac-Man

import { MAZE_DATA, getTile, isWall, isTunnel, countDots, countPowerPellets } from './maze.js';
import { PacMan, DIRECTION } from './pacman.js';
import { Ghost, Blinky, Pinky, Inky, Clyde, GHOST_MODE } from './ghosts.js';

export class GameState {
  constructor() {
    this.state = 'start';
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.powerMode = false;
    this.powerTimer = 0;
    this.powerDuration = 7000;
    this.ghostEatScore = 0;  // Escalates: 200, 400, 800, 1600
    this.dyingTimer = 0;
    this.dyingMax = 0.5;
    this.dotsRemaining = 0;
    this.maze = [];
    this.pacman = null;
    this.ghosts = [];
    this._initLevel();
  }

  _initLevel() {
    // Deep copy maze
    this.maze = MAZE_DATA.map(row => [...row]);
    this.dotsRemaining = countDots();
    this.powerMode = false;
    this.powerTimer = 0;
    this.ghostEatScore = 0;

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
  }

  activatePowerMode() {
    this.powerMode = true;
    this.powerTimer = this.powerDuration;
    this.ghostEatScore = 0;
    this.ghosts.forEach(g => {
      if (g.mode !== GHOST_MODE.DEAD) g.enterFrightened();
    });
  }

  eatDot(x, y) {
    if (this.maze[y] && this.maze[y][x] === 2) {
      this.maze[y][x] = 0;
      this.score += 10;
      this.dotsRemaining--;
      return true;
    }
    if (this.maze[y] && this.maze[y][x] === 3) {
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

  update(dt) {
    if (this.state === 'dying') {
      this.dyingTimer -= dt;
      if (this.dyingTimer <= 0) {
        this.respawn();
      }
      return;
    }

    if (this.state !== 'playing') return;

    // Power mode countdown
    if (this.powerMode) {
      this.powerTimer -= dt * 1000;
      if (this.powerTimer <= 0) {
        this.powerMode = false;
        this.ghosts.forEach(g => {
          if (g.mode === GHOST_MODE.FRIGHTENED) g.enterChase();
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
      this.state = 'start';  // Placeholder for level transition
    }
  }
}
