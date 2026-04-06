// Upgrade screen UI for Pac-Man — Phase 3

const CARD_W = 90;
const CARD_H = 70;
const COLS = 3;

const POWERUP_COLORS = {
  speed_boost:        '#00ff88',
  shield:              '#44aaff',
  ghost_rush:          '#ff44ff',
  magnet:              '#ffaa00',
  score_multiplier:    '#ffdd00',
};

const POWERUP_ICONS = {
  speed_boost:     '⚡',
  shield:           '◈',
  ghost_rush:       '👻',
  magnet:           '⊛',
  score_multiplier: '$',
};

export function renderUpgradeScreen(ctx, canvasW, canvasH, coinBalance, purchasedUpgrades, UPGRADE_TREE_BY_TYPE, selectedIndex) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Header
  ctx.fillStyle = '#ffdd00';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('— CHOOSE POWER-UP —', canvasW / 2, 35);

  // Coin balance
  ctx.fillStyle = '#ffaa00';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`◆ ${coinBalance} COINS`, canvasW / 2, 52);

  const types = Object.keys(UPGRADE_TREE_BY_TYPE);
  const rows = Math.ceil(types.length / COLS);
  const startX = (canvasW - COLS * (CARD_W + 10)) / 2;
  const startY = 65;

  types.forEach((type, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = startX + col * (CARD_W + 10);
    const cy = startY + row * (CARD_H + 10);

    const data = UPGRADE_TREE_BY_TYPE[type];
    const tiers = data.tiers || [];
    const purchasedTierCount = purchasedUpgrades
      ? tiers.filter(t => purchasedUpgrades.includes(t.id)).length
      : 0;
    const owned = purchasedTierCount >= tiers.length;
    const selected = i === selectedIndex;

    // Next upgrade to buy
    const nextTier = tiers[purchasedTierCount];
    const cost = nextTier ? nextTier.cost : 0;

    // Card background
    ctx.fillStyle = selected
      ? 'rgba(255,255,255,0.15)'
      : 'rgba(255,255,255,0.05)';
    ctx.fillRect(cx, cy, CARD_W, CARD_H);

    // Border
    ctx.strokeStyle = selected ? '#ffffff' : '#555555';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(cx, cy, CARD_W, CARD_H);

    // Icon circle
    const color = POWERUP_COLORS[type] || '#ffffff';
    const iconR = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + CARD_W / 2, cy + 22, iconR, 0, Math.PI * 2);
    ctx.fill();

    // Icon symbol
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(POWERUP_ICONS[type] || '?', cx + CARD_W / 2, cy + 26);

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(type.replace(/_/g, ' ').toUpperCase(), cx + CARD_W / 2, cy + 44);

    // Tier stars (filled = purchased)
    let stars = '';
    for (let t = 0; t < 3; t++) {
      stars += t < purchasedTierCount ? '★' : '☆';
    }
    ctx.fillStyle = '#ffdd00';
    ctx.font = '8px monospace';
    ctx.fillText(stars, cx + CARD_W / 2, cy + 54);

    // Cost or owned
    ctx.fillStyle = owned ? '#44ff88' : '#ffaa00';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(owned ? 'MAXED' : `◆ ${cost}`, cx + CARD_W / 2, cy + 64);
  });

  // Controls hint
  ctx.fillStyle = '#888888';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ARROWS: navigate   ENTER: select', canvasW / 2, canvasH - 15);

  ctx.textAlign = 'left';
}

export function handleUpgradeKey(key, selectedIndex, types, onSelect) {
  const max = types.length - 1;
  if (key === 'ArrowUp') {
    return Math.max(0, selectedIndex - 3);
  }
  if (key === 'ArrowDown') {
    return Math.min(max, selectedIndex + 3);
  }
  if (key === 'ArrowLeft') {
    return Math.max(0, selectedIndex - 1);
  }
  if (key === 'ArrowRight') {
    return Math.min(max, selectedIndex + 1);
  }
  if (key === 'Enter' && typeof onSelect === 'function') {
    onSelect(types[selectedIndex]);
  }
  return selectedIndex;
}
