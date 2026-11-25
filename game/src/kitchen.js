// kitchen.js — the world: stations, orders, the plate, the stove, the chef.
// One clear job: the state of the kitchen and the rules that change it.
// Drawing lives in draw.js, the loop in main.js.

import {
  VIEW_W, VIEW_H, HUD_H, SHIFT_SECONDS, MAX_ORDERS, MAX_LOST,
  INGREDIENTS, RECIPES, CHOP_SECONDS, COOK_SECONDS,
  PATIENCE_START, PATIENCE_END, SPAWN_START, SPAWN_END,
  CHEF_SPEED, CHEF_RADIUS,
} from './config.js';
import { makeRng, pick } from './random.js';

export const STATIONS = {
  crates: { x: 36, y: 150, w: 150, h: 420, label: 'PANTRY' },
  board: { x: 300, y: 560, w: 220, h: 92, label: 'Chopping Board' },
  stove: { x: 600, y: 560, w: 260, h: 92, label: 'Stove' },
  assembly: { x: 920, y: 560, w: 300, h: 92, label: 'Assembly Counter' },
  serve: { x: 1050, y: 150, w: 190, h: 84, label: 'Serving Window' },
  trash: { x: 36, y: 600, w: 84, h: 64, label: 'Trash' },
};

// The nine pantry crates, in the order they hang on the left wall.
export const CRATE_ORDER = ['tomato', 'lettuce', 'onion', 'cheese', 'bun', 'patty', 'pasta', 'mushroom', 'dough'];

export function crateRect(index) {
  const cols = 3;
  const cw = 46;
  const ch = 46;
  const gap = 4;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: STATIONS.crates.x + 4 + col * (cw + gap),
    y: STATIONS.crates.y + 34 + row * (ch + gap),
    w: cw,
    h: ch,
  };
}

export function newItem(ing) {
  return { ing, state: 'raw', chop: 0, cook: 0 };
}

export function itemLabel(item) {
  const def = INGREDIENTS[item.ing];
  if (item.state === 'burnt') return `Burnt ${def.name}`;
  if (item.state === 'cooked') return `Cooked ${def.name}`;
  if (item.state === 'chopped') return `Chopped ${def.name}`;
  return def.name;
}

export function newGame(seed = 1) {
  const rng = makeRng(seed);
  return {
    seed,
    rng,
    screen: 'title', // title | playing | paused | over
    time: 0, // seconds into the shift
    timeLeft: SHIFT_SECONDS,
    spawnIn: 2.5,
    nextOrderId: 1,
    orders: [],
    lost: 0,
    served: 0,
    coins: 0,
    earned: 0,
    combo: 0,
    bestCombo: 0,
    tips: 0,
    chef: { x: VIEW_W / 2, y: 420, dir: 'down', moving: false, target: null, targetStation: null },
    hands: null, // one carried item, or a plate { plate: true, items: [...] }
    board: null, // item being chopped { item, progress }
    burners: [null, null], // items cooking on the two stove burners
    plate: null, // plate resting on the assembly counter: { items: [...] }
    plateTimer: 0, // delay before a fresh empty plate appears after serving
    popups: [], // floating "+24" texts { x, y, text, color, life }
    rush: false,
    muted: false,
    shake: 0,
    stats: { served: 0, lost: 0, burnt: 0, chopped: 0, cooked: 0 },
  };
}

export function unlockedRecipes(state) {
  return RECIPES.filter((r) => state.time >= r.unlockAt);
}

export function spawnOrder(state) {
  const pool = unlockedRecipes(state);
  if (!pool.length) return;
  const recipe = pick(state.rng, pool);
  const progress = Math.min(1, state.time / SHIFT_SECONDS);
  const patience = PATIENCE_START + (PATIENCE_END - PATIENCE_START) * progress;
  state.orders.push({
    id: state.nextOrderId++,
    recipe,
    patience,
    patienceMax: patience,
    done: recipe.steps.map(() => false),
  });
}

export function spawnInterval(state) {
  const progress = Math.min(1, state.time / SHIFT_SECONDS);
  const base = SPAWN_START + (SPAWN_END - SPAWN_START) * progress;
  return state.rush ? base * 0.65 : base;
}

export function orderMatchesPlate(order, plateItems) {
  // Every recipe step must be present on the plate, each used once.
  const remaining = plateItems.slice();
  for (const step of order.recipe.steps) {
    const i = remaining.findIndex((it) => it.ing === step.ing && it.state === step.state);
    if (i === -1) return false;
    remaining.splice(i, 1);
  }
  return remaining.length === 0;
}

export function plateProgress(order, plateItems) {
  // How many of this order's steps the plate already satisfies (for checkmarks).
  const remaining = plateItems.slice();
  let n = 0;
  order.recipe.steps.forEach((step, i) => {
    const j = remaining.findIndex((it) => it.ing === step.ing && it.state === step.state);
    if (j !== -1) {
      remaining.splice(j, 1);
      order.done[i] = true;
      n++;
    } else {
      order.done[i] = false;
    }
  });
  return n;
}

export function addPopup(state, x, y, text, color = '#ffc93c') {
  state.popups.push({ x, y, text, color, life: 1.4 });
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function stationNear(state, station, pad = 46) {
  const s = STATIONS[station];
  const c = state.chef;
  const box = { x: s.x - pad, y: s.y - pad, w: s.w + pad * 2, h: s.h + pad * 2 };
  return c.x > box.x && c.x < box.x + box.w && c.y > box.y && c.y < box.y + box.h;
}

export function nearestStation(state) {
  const c = state.chef;
  let best = null;
  let bestD = Infinity;
  for (const [name, s] of Object.entries(STATIONS)) {
    const cx = Math.max(s.x, Math.min(c.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(c.y, s.y + s.h));
    const d = Math.hypot(c.x - cx, c.y - cy);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return bestD < 78 ? best : null;
}

export function walkable(x, y) {
  // The chef walks the open floor: below the HUD, inside the walls, around counters.
  if (x < 30 || x > VIEW_W - 30 || y < HUD_H + 22 || y > VIEW_H - 26) return false;
  for (const s of Object.values(STATIONS)) {
    if (x > s.x - 4 && x < s.x + s.w + 4 && y > s.y - 4 && y < s.y + s.h + 4) return false;
  }
  return true;
}

export function moveChef(state, dx, dy, dt) {
  const c = state.chef;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return;
  const nx = c.x + (dx / len) * CHEF_SPEED * dt;
  const ny = c.y + (dy / len) * CHEF_SPEED * dt;
  if (walkable(nx, c.y)) c.x = nx;
  if (walkable(c.x, ny)) c.y = ny;
  c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  c.moving = true;
}

export function updateOrders(state, dt, sfx) {
  // Spawn new orders.
  state.spawnIn -= dt;
  if (state.spawnIn <= 0 && state.orders.length < MAX_ORDERS) {
    spawnOrder(state);
    state.spawnIn = spawnInterval(state);
    if (sfx) sfx.orderIn();
  }
  // Drain patience; an order that runs out is lost.
  const drain = state.rush ? 1.5 : 1;
  for (let i = state.orders.length - 1; i >= 0; i--) {
    const o = state.orders[i];
    o.patience -= dt * drain;
    if (o.patience <= 0) {
      state.orders.splice(i, 1);
      state.lost++;
      state.combo = 0;
      state.stats.lost++;
      if (sfx) sfx.lost();
      addPopup(state, VIEW_W - 300, HUD_H + 40, 'Order walked out!', '#e5484d');
      if (state.lost >= MAX_LOST) {
        // Three walk-outs end the shift early: the kitchen's reputation is spent.
        state.timeLeft = Math.min(state.timeLeft, 0.01);
      }
    }
  }
}

export function updateCooking(state, dt, sfx) {
  // Chopping board progress. The chopped food stays on the board, ready to
  // pick up, once the cut is done.
  if (state.board && !state.board.done) {
    state.board.progress += dt / CHOP_SECONDS;
    if (Math.random() < dt * 6 && sfx) sfx.chop();
    if (state.board.progress >= 1) {
      state.board.item.state = 'chopped';
      state.board.item.chop = 1;
      state.board.done = true;
      state.stats.chopped++;
      if (sfx) sfx.chopDone();
    }
  }
  // Stove burners: raw -> cooked -> burnt.
  let anyCooking = false;
  state.burners.forEach((b, i) => {
    if (!b) return;
    anyCooking = true;
    b.cook += dt / COOK_SECONDS;
    if (b.cook >= 1 && b.state === 'raw') {
      b.state = 'cooked';
      state.stats.cooked++;
      if (sfx) sfx.cookDone();
      addPopup(state, STATIONS.stove.x + 65 + i * 130, STATIONS.stove.y - 8, 'Ready!', '#58b368');
    } else if (b.cook >= 2 && b.state !== 'burnt') {
      b.state = 'burnt';
      state.stats.burnt++;
      if (sfx) sfx.burnt();
      addPopup(state, STATIONS.stove.x + 65 + i * 130, STATIONS.stove.y - 8, 'Burnt!', '#e5484d');
    }
  });
  if (sfx) {
    if (anyCooking) sfx.startSizzle();
    else sfx.stopSizzle();
  }
  // A fresh empty plate slides onto the assembly counter shortly after serving.
  if (!state.plate && state.plateTimer > 0) {
    state.plateTimer -= dt;
    if (state.plateTimer <= 0) state.plate = { plate: true, items: [] };
  }
}

export function updatePopups(state, dt) {
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const p = state.popups[i];
    p.life -= dt;
    p.y -= 34 * dt;
    if (p.life <= 0) state.popups.splice(i, 1);
  }
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 3);
}

export { CHEF_RADIUS };
