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
    this.speed = 6;
    this.path = [];
    this.distTraveled = 0;  // accumulate distance to detect tile crossings
    this.deadPath = null;
    this._scatterTarget = () => ({ x: 25, y: 0 });
  }

  getTargetTile(pacmanTile, blinkyTile) {
    if (this.mode === GHOST_MODE.SCATTER) return this._scatterTarget();
    if (this.mode === GHOST_MODE.FRIGHTENED) {
      return { x: Math.floor(Math.random() * 28), y: Math.floor(Math.random() * 31) };
    }
    if (this.mode === GHOST_MODE.DEAD) {
      return { x: 13, y: 14 };
    }
    return this._chaseTarget(pacmanTile, blinkyTile);
  }

  _chaseTarget(pacmanTile, blinkyTile) {
    return pacmanTile;
  }

  _movePixel(dt) {
    const dirVec = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
    const [dx, dy] = dirVec[this.direction];
    const speedPPS = this.speed * 8;
    this.pixelX += dx * speedPPS * dt;
    this.pixelY += dy * speedPPS * dt;
  }

  // Fixed: use tolerance instead of exact modulo (matches Pac-Man fix)
  _reachedTile() {
    return Math.abs(this.pixelX % 8) < 0.5 && Math.abs(this.pixelY % 8) < 0.5;
  }

  update(dt, isWallFn, pacmanTile, blinkyTile) {
    // Accumulate distance traveled
    this.distTraveled += this.speed * dt;

    const onTile = this._reachedTile() || this.distTraveled >= 1;

    if (onTile) {
      this.distTraveled = 0;

      // Snap pixel position to tile centre before pathfinding
      this.pixelX = Math.round(this.pixelX / 8) * 8;
      this.pixelY = Math.round(this.pixelY / 8) * 8;
      this.tileX = Math.round(this.pixelX / 8);
      this.tileY = Math.round(this.pixelY / 8);

      if (this.mode === GHOST_MODE.DEAD && this.tileX === 13 && this.tileY === 14) {
        this.mode = GHOST_MODE.CHASE;
        this.speed = 6;
      }

      const target = this.getTargetTile(pacmanTile, blinkyTile);
      this.path = bfsPath(this.tileX, this.tileY, target.x, target.y, isWallFn);

      if (this.path.length > 0) {
        const next = this.path[0];
        const dirs = ['up', 'down', 'left', 'right'];
        for (const d of dirs) {
          const vec = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
          const nx = this.tileX + vec[d][0];
          const ny = this.tileY + vec[d][1];
          if (nx === next.x && ny === next.y) {
            this.direction = d;
            break;
          }
        }
        this.path.shift();
      }
    }

    this._movePixel(dt);

    // Tunnel wrapping
    if (this.pixelX < 0) this.pixelX += 28 * 8;
    if (this.pixelX >= 28 * 8) this.pixelX -= 28 * 8;
  }

  enterFrightened() {
    this.mode = GHOST_MODE.FRIGHTENED;
    this.speed = 4;
  }

  enterDead() {
    this.mode = GHOST_MODE.DEAD;
    this.speed = 10;
  }

  enterChase() {
    this.mode = GHOST_MODE.CHASE;
    this.speed = 6;
  }

  enterScatter() {
    this.mode = GHOST_MODE.SCATTER;
    this.speed = 6;
  }

  respawn() {
    this.tileX = this.startTileX;
    this.tileY = this.startTileY;
    this.pixelX = this.startTileX * 8;
    this.pixelY = this.startTileY * 8;
    this.direction = 'up';
    this.mode = GHOST_MODE.SCATTER;
    this.speed = 6;
    this.path = [];
    this.distTraveled = 0;
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
