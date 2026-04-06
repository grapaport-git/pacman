// Power-up type definitions and coin economy
// Phase 3 — back-end spec

export const POWERUP_TYPES = [
  {
    id: 'speed_boost',
    name: 'Speed Boost',
    icon: '⚡',
    color: '#00ff00',
    duration: 5000,
    description: 'Move 1.5× faster'
  },
  {
    id: 'shield',
    name: 'Shield',
    icon: '🛡️',
    color: '#00ffff',
    duration: 5000,
    description: 'Survive one ghost collision'
  },
  {
    id: 'ghost_rush',
    name: 'Ghost Rush',
    icon: '👻',
    color: '#ff00ff',
    duration: 6000,
    description: 'All ghosts enter dead mode'
  },
  {
    id: 'magnet',
    name: 'Magnet',
    icon: '🧲',
    color: '#ffaa00',
    duration: 8000,
    description: 'Attract nearby coins'
  },
  {
    id: 'score_multiplier',
    name: 'Score ×2',
    icon: '✖️2️⃣',
    color: '#ffff00',
    duration: 10000,
    description: 'Double all point gains'
  }
];

/**
 * Coin earnings per level.
 * @param {number} level
 * @param {number} dotBonus - dot base score for this level
 * @returns {number}
 */
export function COIN_TABLE(level, dotBonus = 10) {
  return level * 10 + Math.floor(dotBonus / 2);
}
