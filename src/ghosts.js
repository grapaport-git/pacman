// Ghost AI: base class and four personality behaviors

export const GHOST_MODE = {
  SCATTER: 'scatter',
  CHASE: 'chase',
  FRIGHTENED: 'frightened',
  DEAD: 'dead'
};

export const GHOST_COLORS = {
  blinky: '#ff0000',
  pinky:  '#ffb8ff',
  inky:   '#00ffff',
  clyde:  '#ffb852'
};

function bfsPath(startX, startY, targetX, targetY, isWallFn, maxIter = 500) {
  if (startX === targetX && startY === targetY) return [];
  const visited = new Map();
  const queue = [[startX, startY, []]];
  let iter = 0;

  while (queue.length > 0 && iter++ < maxIter) {
    const [x, y, path] = queue.shift();
    if (visited.has(`${x},${y}`)) continue;
    visited.set(`${x},${y}`, true);

    const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (isWallFn(nx, ny)) continue;
      const newPath = [...path, { x: nx, y: ny }];
      if (nx === targetX && ny === targetY) return newPath;
      queue.push([nx, ny, newPath]);
    }
  }
  return [];
}

function oppositeDir(dir) {
  const map = { up: 'down', down: 'up', left: 'right', right: 'left' };
  return map[dir] || dir;
}

export class Ghost {
  constructor(name, tileX, tileY) {
    this.name = name;
    this.startTileX = tileX;
    this.startTileY = tileY;
    this.tileX = tileX;
    this.tileY = tileY;
    this.pixelX = tileX * 8;
    this.pixelY = tileY * 8;
    this.direction = 'up';
    this.mode = GHOST_MODE.SCATTER;
    this.speed = 6;  // tiles per second
    this.moveTimer = 0;  // tile movement accumulator
    this.path = [];
    this.deadPath = null;
    this._scatterTarget = () => ({ x: 25, y: 0 });  // Override per ghost
  }

  getTargetTile(pacmanTile, blinkyTile) {
    if (this.mode === GHOST_MODE.SCATTER) return this._scatterTarget();
    if (this.mode === GHOST_MODE.FRIGHTENED) {
      return { x: Math.floor(Math.random() * 28), y: Math.floor(Math.random() * 31) };
    }
    if (this.mode === GHOST_MODE.DEAD) {
      return { x: 13, y: 14 };  // Ghost house entrance
    }
    return this._chaseTarget(pacmanTile, blinkyTile);
  }

  _chaseTarget(pacmanTile, blinkyTile) {
    return pacmanTile;  // Base class uses pacman position
  }

  // ── Tile-timer update (matches Pac-Man movement approach) ─────────────
  update(dt, isWallFn, pacmanTile, blinkyTile) {
    // Accumulate movement: speed is in tiles/sec
    this.moveTimer += this.speed * dt;

    while (this.moveTimer >= 1) {
      this.moveTimer -= 1;

      // Recalculate path toward current target
      const target = this.getTargetTile(pacmanTile, blinkyTile);
      this.path = bfsPath(this.tileX, this.tileY, target.x, target.y, isWallFn);

      // Determine next tile from path (or current direction if no path)
      let nx = this.tileX;
      let ny = this.tileY;

      if (this.path.length > 0) {
        nx = this.path[0].x;
        ny = this.path[0].y;
        this.path.shift();
      } else {
        // No path — try to keep moving in current direction
        const dirVec = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
        const [dx, dy] = dirVec[this.direction];
        nx = this.tileX + dx;
        ny = this.tileY + dy;
      }

      // Move if next tile is a tunnel or not a wall
      if (nx < 0 || nx >= 28 || !isWallFn(nx, ny)) {
        this.tileX = nx;
        this.tileY = ny;

        // Tunnel wrapping
        if (this.tileX < 0)  this.tileX = 27;
        if (this.tileX >= 28) this.tileX = 0;

        // Snap to tile centre
        this.pixelX = this.tileX * 8;
        this.pixelY = this.tileY * 8;

        // ── DEAD ghost reached ghost house entrance ──
        if (this.mode === GHOST_MODE.DEAD && this.tileX === 13 && this.tileY === 14) {
          this.mode = GHOST_MODE.CHASE;
          this.speed = 6;
        }

        // Update direction to match movement
        if (this.path.length > 0) {
          const ddx = this.path[0].x - this.tileX;
          const ddy = this.path[0].y - this.tileY;
          if (ddx === 1) this.direction = 'right';
          else if (ddx === -1) this.direction = 'left';
          else if (ddy === 1) this.direction = 'down';
          else if (ddy === -1) this.direction = 'up';
        } else {
          // Set direction from tile delta (for non-path movement)
          const dirVec = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
          for (const [d, [dx, dy]] of Object.entries(dirVec)) {
            if (this.tileX + dx === nx && this.tileY + dy === ny) {
              this.direction = d;
              break;
            }
          }
        }
      }
    }
  }

  enterFrightened() {
    this.mode = GHOST_MODE.FRIGHTENED;
    this.speed = 4;
    this.path = [];
  }

  enterDead() {
    this.mode = GHOST_MODE.DEAD;
    this.speed = 10;
    this.path = [];
  }

  enterChase() {
    this.mode = GHOST_MODE.CHASE;
    this.speed = 6;
    this.path = [];
  }

  enterScatter() {
    this.mode = GHOST_MODE.SCATTER;
    this.speed = 6;
    this.path = [];
  }

  respawn() {
    this.tileX = this.startTileX;
    this.tileY = this.startTileY;
    this.pixelX = this.startTileX * 8;
    this.pixelY = this.startTileY * 8;
    this.direction = 'up';
    this.mode = GHOST_MODE.SCATTER;
    this.speed = 6;
    this.moveTimer = 0;
    this.path = [];
  }
}

export class Blinky extends Ghost {
  constructor() {
    super('blinky', 13, 11);
    this.speed = 7;
  }
  _chaseTarget(pacmanTile) {
    return pacmanTile;
  }
  _scatterTarget() {
    return { x: 25, y: 0 };
  }
}

export class Pinky extends Ghost {
  constructor() {
    super('pinky', 13, 14);
  }
  _chaseTarget(pacmanTile, blinkyTile) {
    // 4 tiles ahead of pacman (based on actual facing direction)
    const dirs = { up:[0,-4], down:[0,4], left:[-4,0], right:[4,0] };
    const ahead = dirs[this.direction] || [0, 0];
    return {
      x: pacmanTile.x + ahead[0],
      y: pacmanTile.y + ahead[1]
    };
  }
  _scatterTarget() {
    return { x: 2, y: 0 };
  }
}

export class Inky extends Ghost {
  constructor() {
    super('inky', 11, 14);
  }
  _chaseTarget(pacmanTile, blinkyTile) {
    // Flanker: midpoint between blinky and 2 tiles ahead of pacman
    if (!blinkyTile) return pacmanTile;
    const aheadX = pacmanTile.x * 2 - blinkyTile.x;
    const aheadY = pacmanTile.y * 2 - blinkyTile.y;
    return { x: aheadX, y: aheadY };
  }
  _scatterTarget() {
    return { x: 27, y: 30 };
  }
}

export class Clyde extends Ghost {
  constructor() {
    super('clyde', 14, 14);
  }
  _chaseTarget(pacmanTile) {
    const dist = Math.abs(this.tileX - pacmanTile.x) + Math.abs(this.tileY - pacmanTile.y);
    if (dist > 8) return pacmanTile;
    return { x: 0, y: 30 };
  }
  _scatterTarget() {
    return { x: 0, y: 30 };
  }
}
