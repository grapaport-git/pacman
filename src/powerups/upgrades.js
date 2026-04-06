// Upgrade tree and persistent store
// Phase 3 — back-end

// Polyfill for Node.js test environments (browser already has localStorage)
const _nodeStore = {};
const _ls = (() => {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem ? localStorage : null; } catch { return null; }
})();
const _local = _ls ? (k) => _ls.getItem(k) : (k) => _nodeStore[k];
const _setLocal = _ls ? (k, v) => _ls.setItem(k, v) : (k, v) => { _nodeStore[k] = v; };

/**
 * Full upgrade tree: 3 tiers per power-up type.
 * @type {Array<{
 *   id: string,
 *   powerUpType: string,
 *   tier: number,
 *   cost: number,
 *   duration: number,
 *   speedMult?: number,
 *   shieldHits?: number,
 *   magnetRadius?: number,
 *   multiplier?: number
 * }>}
 */
export const UPGRADE_TREE = [
  // speed_boost
  { id: 'speed_boost_t1', powerUpType: 'speed_boost', tier: 1, cost: 100, duration: 5000, speedMult: 1.5 },
  { id: 'speed_boost_t2', powerUpType: 'speed_boost', tier: 2, cost: 250, duration: 7000, speedMult: 1.75 },
  { id: 'speed_boost_t3', powerUpType: 'speed_boost', tier: 3, cost: 500, duration: 10000, speedMult: 2.0 },

  // shield
  { id: 'shield_t1', powerUpType: 'shield', tier: 1, cost: 100, duration: 5000, shieldHits: 1 },
  { id: 'shield_t2', powerUpType: 'shield', tier: 2, cost: 250, duration: 7000, shieldHits: 2 },
  { id: 'shield_t3', powerUpType: 'shield', tier: 3, cost: 500, duration: 10000, shieldHits: 3 },

  // ghost_rush
  { id: 'ghost_rush_t1', powerUpType: 'ghost_rush', tier: 1, cost: 100, duration: 6000 },
  { id: 'ghost_rush_t2', powerUpType: 'ghost_rush', tier: 2, cost: 250, duration: 8000 },
  { id: 'ghost_rush_t3', powerUpType: 'ghost_rush', tier: 3, cost: 500, duration: 12000 },

  // magnet
  { id: 'magnet_t1', powerUpType: 'magnet', tier: 1, cost: 100, duration: 8000, magnetRadius: 3 },
  { id: 'magnet_t2', powerUpType: 'magnet', tier: 2, cost: 250, duration: 10000, magnetRadius: 5 },
  { id: 'magnet_t3', powerUpType: 'magnet', tier: 3, cost: 500, duration: 15000, magnetRadius: 8 },

  // score_multiplier
  { id: 'score_multiplier_t1', powerUpType: 'score_multiplier', tier: 1, cost: 100, duration: 10000, multiplier: 2 },
  { id: 'score_multiplier_t2', powerUpType: 'score_multiplier', tier: 2, cost: 250, duration: 15000, multiplier: 3 },
  { id: 'score_multiplier_t3', powerUpType: 'score_multiplier', tier: 3, cost: 500, duration: 20000, multiplier: 5 }
];

const _upgradeMap = {};
for (const u of UPGRADE_TREE) {
  _upgradeMap[u.id] = u;
}

/**
 * Persisted upgrade store backed by localStorage.
 */
export class PowerUpStore {
  constructor() {
    this.coins = 0;
    this.purchasedUpgrades = [];
    this.load();
  }

  load() {
    this.coins = parseInt(_local('pacman_coins') || '0');
    const raw = _local('pacman_upgrades');
    if (raw) {
      try {
        this.purchasedUpgrades = JSON.parse(raw);
      } catch {
        this.purchasedUpgrades = [];
      }
    }
  }

  save() {
    _setLocal('pacman_coins', String(this.coins));
    _setLocal('pacman_upgrades', JSON.stringify(this.purchasedUpgrades));
  }

  /**
   * @param {string} upgradeId
   * @returns {boolean}
   */
  canAfford(upgradeId) {
    const upgrade = _upgradeMap[upgradeId];
    return !!upgrade && this.coins >= upgrade.cost;
  }

  /**
   * Attempt to purchase an upgrade.
   * @param {string} upgradeId
   * @returns {object|null} the upgrade object, or null if cannot afford
   */
  purchase(upgradeId) {
    if (!this.canAfford(upgradeId)) return null;
    const upgrade = _upgradeMap[upgradeId];
    this.coins -= upgrade.cost;
    if (!this.purchasedUpgrades.includes(upgradeId)) {
      this.purchasedUpgrades.push(upgradeId);
    }
    this.save();
    return upgrade;
  }

  /**
   * Highest tier purchased for a given power-up type.
   * @param {string} powerUpType
   * @returns {number}
   */
  getMaxTier(powerUpType) {
    let max = 0;
    for (const id of this.purchasedUpgrades) {
      const u = _upgradeMap[id];
      if (u && u.powerUpType === powerUpType && u.tier > max) {
        max = u.tier;
      }
    }
    return max;
  }

  /**
   * Add coins (e.g. from coin pickup or level completion).
   * @param {number} amount
   */
  earnCoins(amount) {
    this.coins += amount;
    this.save();
  }
}
