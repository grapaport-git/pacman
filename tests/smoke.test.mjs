// Pac-Man Phase 5 Smoke Tests
// Run: node tests/smoke.test.mjs
import { MAZE_DATA, getTile, isWall, isTunnel, getMazeWidth, getMazeHeight } from '../src/maze.js';
import { DIRECTION } from '../src/pacman.js';
import { GHOST_MODE, Pinky, Inky, Clyde, Blinky } from '../src/ghosts.js';

let passed = 0, failed = 0;
const eq = (a, b, msg) => {
  if (a === b) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
};

console.log('=== Pac-Man Phase 5 Smoke Tests ===\n');

// ── Maze ────────────────────────────────────────────────────────────────────
console.log('Maze:');
eq(MAZE_DATA[0].every(v => v === 1), true, 'Row 0 all walls');
eq(MAZE_DATA[14][0], 0, 'Tunnel row left edge is path');
eq(MAZE_DATA[14][27], 0, 'Tunnel row right edge is path');
eq(MAZE_DATA[1].includes(2), true, 'Row 1 has dots');
eq(MAZE_DATA[3].includes(3), true, 'Row 3 has power pellets');
eq(getMazeWidth(), 28, 'Width = 28');
eq(getMazeHeight(), 31, 'Height = 31');
eq(isWall(0, 0), true, 'Corner (0,0) is wall');
eq(isWall(1, 0), true, '(1,0) top row is wall');
eq(isWall(1, 1), false, '(1,1) row 1 is path/dot');
eq(isTunnel(-1, 14), true, 'Left tunnel x=-1,y=14');
eq(isTunnel(28, 14), true, 'Right tunnel x=28,y=14');
eq(isTunnel(0, 14), false, 'Non-tunnel at x=0,y=14 (wall)');
eq(isTunnel(10, 14), false, 'Non-tunnel at x=10,y=14 (path in tunnel row)');

// ── Pac-Man ─────────────────────────────────────────────────────────────────
console.log('\nPac-Man:');
eq(DIRECTION.UP, 'up', 'UP = up');
eq(DIRECTION.DOWN, 'down', 'DOWN = down');
eq(DIRECTION.LEFT, 'left', 'LEFT = left');
eq(DIRECTION.RIGHT, 'right', 'RIGHT = right');

// ── Ghost AI (Phase 5 QA: Pinky direction-based targeting) ─────────────────
console.log('\nGhost AI:');
const pinky = new Pinky();
for (const [dir, ex, ey] of [['up', 10, 6], ['right', 14, 10], ['left', 6, 10], ['down', 10, 14]]) {
  pinky.direction = dir;
  const t = pinky._chaseTarget({ x: 10, y: 10 }, { x: 5, y: 5 });
  eq(t.x, ex, `Pinky ${dir}: x=${ex}`);
  eq(t.y, ey, `Pinky ${dir}: y=${ey}`);
}

const inky = new Inky();
inky.direction = 'right';
const tInky = inky._chaseTarget({ x: 10, y: 10 }, { x: 3, y: 10 });
eq(tInky.x, 17, 'Inky flanker: x=2*pacX-blinkyX=17');
eq(tInky.y, 10, 'Inky flanker: y=2*pacY-blinkyY=10');

const clyde = new Clyde();
clyde.tileX = 14; clyde.tileY = 14;
const far = clyde._chaseTarget({ x: 5, y: 5 });
eq(far.x, 5, 'Clyde far: returns pacman x');
eq(far.y, 5, 'Clyde far: returns pacman y');
const close = clyde._chaseTarget({ x: 14, y: 10 });
eq(close.x, 0, 'Clyde close: scatter x=0');
eq(close.y, 30, 'Clyde close: scatter y=30');

const blinky = new Blinky();
blinky.tileX = 5; blinky.tileY = 5;
const tB = blinky._chaseTarget({ x: 10, y: 10 });
eq(tB.x, 10, 'Blinky: chases pacman x');
eq(tB.y, 10, 'Blinky: chases pacman y');

eq(GHOST_MODE.SCATTER, 'scatter', 'SCATTER mode');
eq(GHOST_MODE.CHASE, 'chase', 'CHASE mode');
eq(GHOST_MODE.FRIGHTENED, 'frightened', 'FRIGHTENED mode');
eq(GHOST_MODE.DEAD, 'dead', 'DEAD mode');

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
