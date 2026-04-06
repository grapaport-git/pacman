// Power-up state machine
// Phase 3 — back-end

import { POWERUP_TYPES } from './index.js';

/**
 * Represents a single power-up instance.
 */
export class PowerUp {
  constructor(type) {
    this.type = type.id;
    this.name = type.name;
    this.icon = type.icon;
    this.color = type.color;
    this.duration = type.duration;
    this.maxDuration = type.duration;
    this.active = false;
    this.timer = 0;
  }
}

/**
 * Manages activation, deactivation, and tick-down of all power-ups.
 */
export class PowerUpManager {
  /**
   * @param {object} game - reference to GameState
   */
  constructor(game) {
    this.game = game;
    this._powerUps = {};
    for (const type of POWERUP_TYPES) {
      this._powerUps[type.id] = new PowerUp(type);
    }
  }

  /**
   * Activate a power-up by id.
   * @param {string} typeId
   */
  activate(typeId) {
    const pu = this._powerUps[typeId];
    if (!pu) return;
    pu.active = true;
    pu.timer = pu.maxDuration;
    this._applyEffect(typeId, true);
  }

  _applyEffect(typeId, on) {
    const g = this.game;
    switch (typeId) {
      case 'speed_boost':
        if (on) g.pacman.speed *= 1.5;
        else g.pacman.speed /= 1.5;
        break;
      case 'shield':
        g.invincible = on ? true : false;
        break;
      case 'ghost_rush':
        if (on) {
          g.ghosts.forEach(ghost => {
            if (ghost.enterDead) ghost.enterDead();
          });
        }
        break;
      case 'magnet':
        g.magnetActive = on ? true : false;
        g.magnetRadius = on ? 3 : 0;
        break;
      case 'score_multiplier':
        g.scoreMultiplier = on ? 2 : 1;
        break;
    }
  }

  /**
   * Deactivate a power-up by id.
   * @param {string} typeId
   */
  deactivate(typeId) {
    const pu = this._powerUps[typeId];
    if (!pu) return;
    pu.active = false;
    pu.timer = 0;
    this._applyEffect(typeId, false);
  }

  /**
   * Call each frame with delta-time in milliseconds.
   * @param {number} dt - delta time in ms
   */
  update(dt) {
    for (const typeId of Object.keys(this._powerUps)) {
      const pu = this._powerUps[typeId];
      if (!pu.active) continue;
      pu.timer -= dt;
      if (pu.timer <= 0) {
        pu.timer = 0;
        this.deactivate(typeId);
      }
    }
  }

  /**
   * @param {string} typeId
   * @returns {boolean}
   */
  isActive(typeId) {
    return !!(this._powerUps[typeId] && this._powerUps[typeId].active);
  }

  /**
   * @param {string} typeId
   * @returns {number} remaining ms
   */
  getTimeRemaining(typeId) {
    const pu = this._powerUps[typeId];
    return pu ? Math.max(0, pu.timer) : 0;
  }

  /**
   * @returns {string[]} ids of currently active power-ups
   */
  getActiveList() {
    return Object.keys(this._powerUps).filter(id => this._powerUps[id].active);
  }

  /**
   * Spawn particles into the game particle system (if available).
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} count
   */
  spawnParticles(x, y, color, count = 8) {
    if (this.game.particleSystem && typeof this.game.particleSystem.add === 'function') {
      for (let i = 0; i < count; i++) {
        this.game.particleSystem.add({
          x,
          y,
          color,
          life: 0.5,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60
        });
      }
    }
  }
}
