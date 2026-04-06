// Pac-Man movement with corner-snapping and input buffering

export const DIRECTION = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
};

export const DIR_VECTORS = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 }
};

export class PacMan {
  constructor(tileX, tileY) {
    this.startTileX = tileX;
    this.startTileY = tileY;
    this.tileX = tileX;
    this.tileY = tileY;
    this.pixelX = tileX * 8;  // 8 pixels per tile
    this.pixelY = tileY * 8;
    this.direction = DIRECTION.RIGHT;
    this.nextDirection = null;
    this.speed = 7.5;  // tiles per second (7.5×8=60px/sec → lands on tile boundary every frame at 60fps)
    this.mouthFrame = 0;
    this.mouthTimer = 0;
    this.mouthInterval = 0.08;  // seconds between frames
    this.moveBufferTime = 0;
    this.moveBufferMax = 0.1;  // 100ms buffer
    this.moveTimer = 0;         // tile movement accumulator
  }

  setDirection(dir) {
    this.nextDirection = dir;
    this.moveBufferTime = this.moveBufferMax;
  }

  _tryTurn(isWallFn) {
    if (!this.nextDirection || this.nextDirection === this.direction) return;
    const vec = DIR_VECTORS[this.nextDirection];
    const nx = this.tileX + vec.dx;
    const ny = this.tileY + vec.dy;
    if (!isWallFn(nx, ny)) {
      this.direction = this.nextDirection;
      this.nextDirection = null;
    }
  }

  _centerOnTile() {
    const tx = this.tileX * 8;
    const ty = this.tileY * 8;
    this.pixelX = tx;
    this.pixelY = ty;
  }

  update(dt, isWallFn) {
    // Mouth animation
    this.mouthTimer += dt;
    if (this.mouthTimer >= this.mouthInterval) {
      this.mouthTimer = 0;
      this.mouthFrame = (this.mouthFrame + 1) % 3;
    }

    // Countdown move buffer
    if (this.moveBufferTime > 0) {
      this.moveBufferTime -= dt;
    }

    // Accumulate movement: speed is in tiles/sec
    // Each tick: moveTimer += speed * dt (in tile units)
    this.moveTimer += this.speed * dt;

    // Move one tile at a time when timer is ready
    while (this.moveTimer >= 1) {
      this.moveTimer -= 1;

      // Determine target tile from current direction
      const vec = DIR_VECTORS[this.direction];
      const nextTX = this.tileX + vec.dx;
      const nextTY = this.tileY + vec.dy;

      // Check if next tile is clear (wall check)
      if (nextTX < 0 || nextTX >= 28 || !isWallFn(nextTX, nextTY)) {
        // Advance to next tile
        this.tileX = nextTX;
        this.tileY = nextTY;

        // Tunnel wrapping
        if (this.tileX < 0)  this.tileX = 27;
        if (this.tileX >= 28) this.tileX = 0;

        // Update pixel position to match tile
        this.pixelX = this.tileX * 8;
        this.pixelY = this.tileY * 8;
      } else {
        // Hit wall — stop timer from accumulating while blocked
        this.moveTimer = 0;
      }

      // At each tile arrival, try buffered direction change
      this._tryTurn(isWallFn);
    }
  }

  respawn() {
    this.tileX = this.startTileX;
    this.tileY = this.startTileY;
    this.pixelX = this.startTileX * 8;
    this.pixelY = this.startTileY * 8;
    this.direction = DIRECTION.RIGHT;
    this.nextDirection = null;
    this.mouthFrame = 0;
    this.moveTimer = 0;
  }
}
