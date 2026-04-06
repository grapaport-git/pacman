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

    // Move buffer countdown
    if (this.moveBufferTime > 0) {
      this.moveBufferTime -= dt;
    }

    // Determine next tile based on current direction
    const vec = DIR_VECTORS[this.direction];
    const nextTX = this.tileX + vec.dx;
    const nextTY = this.tileY + vec.dy;

    // Only enter next tile if it's not a wall (or is tunnel)
    const canMove = (nextTX < 0 || nextTX >= 28) || !isWallFn(nextTX, nextTY);

    if (canMove) {
      // Move pixel-wise along current direction
      const speedPPS = this.speed * 8;
      this.pixelX += vec.dx * speedPPS * dt;
      this.pixelY += vec.dy * speedPPS * dt;

      // Tunnel wrapping
      if (this.pixelX < 0) this.pixelX += 28 * 8;
      if (this.pixelX >= 28 * 8) this.pixelX -= 28 * 8;

      // Derive tile from pixel position
      let tX = Math.floor(this.pixelX / 8);
      let tY = Math.floor(this.pixelY / 8);
      // Handle tunnel wrap for tile tracking
      if (tX < 0) tX += 28;
      if (tX >= 28) tX -= 28;

      // If tile changed, snap and try buffered turn
      if (tX !== this.tileX || tY !== this.tileY) {
        this.tileX = tX;
        this.tileY = tY;
        this.pixelX = tX * 8;
        this.pixelY = tY * 8;
        this._tryTurn(isWallFn);
      }
    } else {
      // At wall — snap pixel position to edge of current tile
      this.pixelX = this.tileX * 8;
      this.pixelY = this.tileY * 8;
      // Still try buffered turn so direction change applies at next opening
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
  }
}
