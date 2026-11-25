// main.js — the game loop and the rules of play: moving, picking up, chopping,
// grilling, plating and serving. One clear job: update the kitchen state each
// frame and hand it to draw.js. All numbers come from config.js.

import {
  VIEW_W, VIEW_H, HUD_H, SHIFT_SECONDS, RUSH_SECONDS, INGREDIENTS,
  CHEF_SPEED,
} from './config.js';
import {
  STATIONS, CRATE_ORDER, crateRect, newGame, newItem, itemLabel,
  unlockedRecipes, spawnOrder, orderMatchesPlate, plateProgress,
  addPopup, nearestStation, stationNear, moveChef,
  updateOrders, updateCooking, updatePopups,
} from './kitchen.js';
import { createInput } from './input.js';
import { drawGame } from './draw.js';
import { SoundFX } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const input = createInput(canvas);
const sfx = new SoundFX();

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1) || 1;
const shot = params.get('shot');
// A staged screenshot (?shot=) is a frozen diorama: the kitchen is shown
// exactly as shots.js staged it, so the render is deterministic.
const FROZEN = !!shot;

const state = newGame(seed);
state.plate = { plate: true, items: [] };
let prompt = '';
let lastTime = performance.now();
let lastTickSecond = -1;

if (shot) applyShot(state, shot);

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function startShift() {
  const fresh = newGame(seed === 1 ? (Date.now() % 100000) : seed);
  Object.assign(state, fresh);
  state.screen = 'playing';
  state.plate = { plate: true, items: [] };
  spawnOrder(state);
  sfx.ensure();
  sfx.startMusic();
  setStatus('Shift started. First order is on the board.');
}

// ------------------------------------------------------------ interactions
function crateAt(x, y) {
  for (let i = 0; i < CRATE_ORDER.length; i++) {
    const r = crateRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return CRATE_ORDER[i];
  }
  return null;
}

function interactAtStation(station) {
  if (!station) return false;
  const hands = state.hands;

  if (station === 'crates') {
    if (hands) { prompt = 'Hands full — serve or trash it first'; return true; }
    if (state.board) { prompt = 'The board is busy'; return true; }
    // Grab the crate nearest the chef (or under the mouse, if one is there).
    const mouseIng = crateAt(input.mouse.x, input.mouse.y);
    let picked = mouseIng;
    if (!picked) {
      let bestD = Infinity;
      CRATE_ORDER.forEach((ing, i) => {
        const r = crateRect(i);
        const d = Math.hypot(state.chef.x - (r.x + r.w / 2), state.chef.y - (r.y + r.h / 2));
        if (d < bestD) { bestD = d; picked = ing; }
      });
    }
    state.hands = newItem(picked);
    sfx.pickup();
    setStatus(`Picked up ${INGREDIENTS[picked].name}.`);
    return true;
  }

  if (station === 'board') {
    if (state.board) {
      if (!state.board.done) { prompt = 'Still chopping…'; return true; }
      // Take the chopped item off the board.
      if (hands) { prompt = 'Hands full'; return true; }
      state.hands = state.board.item;
      state.board = null;
      sfx.pickup();
      return true;
    }
    if (!hands || hands.plate) { prompt = 'Bring a raw ingredient to chop'; return true; }
    const def = INGREDIENTS[hands.ing];
    if (!def.chop || hands.state !== 'raw') {
      prompt = `${def.name} needs no chopping — grill it or plate it`;
      return true;
    }
    state.board = { item: hands, progress: 0 };
    state.hands = null;
    sfx.chop();
    return true;
  }

  if (station === 'stove') {
    const free = state.burners.findIndex((b) => !b);
    if (hands && !hands.plate) {
      const def = INGREDIENTS[hands.ing];
      if (!def.cook || hands.state !== 'raw') {
        prompt = `${def.name} does not go on the stove`;
        return true;
      }
      if (free === -1) { prompt = 'Both burners are busy'; return true; }
      state.burners[free] = hands;
      state.hands = null;
      sfx.place();
      return true;
    }
    if (!hands) {
      const taken = state.burners.findIndex((b) => b);
      if (taken === -1) { prompt = 'Stove is empty — bring something to cook'; return true; }
      state.hands = state.burners[taken];
      state.burners[taken] = null;
      sfx.pickup();
      return true;
    }
    prompt = 'Put the plate down first';
    return true;
  }

  if (station === 'assembly') {
    if (!state.plate) { prompt = 'A fresh plate is on its way'; return true; }
    if (hands && !hands.plate) {
      state.plate.items.push(hands);
      state.hands = null;
      sfx.place();
      // Refresh the checkmarks on every open ticket.
      state.orders.forEach((o) => plateProgress(o, state.plate.items));
      return true;
    }
    if (!hands) {
      state.hands = state.plate;
      state.plate = null;
      sfx.pickup();
      return true;
    }
    prompt = 'Hands full';
    return true;
  }

  if (station === 'serve') {
    if (!hands || !hands.plate) { prompt = 'Bring a finished plate to the window'; return true; }
    const match = state.orders.find((o) => orderMatchesPlate(o, hands.items));
    if (!match) {
      prompt = 'No ticket matches this plate — check the order board';
      sfx.wrong();
      state.shake = 1;
      return true;
    }
    const tip = Math.round((match.patience / match.patienceMax) * match.recipe.coins * 0.5);
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const mult = Math.min(2, 1 + (state.combo - 1) * 0.15);
    const earned = Math.round((match.recipe.coins + tip) * mult);
    state.coins += earned;
    state.earned += earned;
    state.tips += tip;
    state.served += 1;
    state.stats.served += 1;
    state.orders = state.orders.filter((o) => o !== match);
    state.hands = null;
    state.plateTimer = 1.2;
    addPopup(state, STATIONS.serve.x + 95, STATIONS.serve.y - 12, `+${earned} coins`, '#ffc93c');
    if (tip > 0) addPopup(state, STATIONS.serve.x + 95, STATIONS.serve.y - 40, `incl. $${tip} tip`, '#58b368');
    sfx.serve();
    setStatus(`Served ${match.recipe.name} for ${earned} coins. Combo x${state.combo}.`);
    return true;
  }

  if (station === 'trash') {
    if (!hands) { prompt = 'Nothing to throw away'; return true; }
    if (hands.plate) {
      // Dumping a plate wastes its food but keeps the plate coming.
      state.hands = null;
      state.plateTimer = 1.2;
    } else {
      state.hands = null;
    }
    sfx.place();
    prompt = 'Tossed it';
    return true;
  }
  return false;
}

function promptFor(station) {
  if (!station) return '';
  const hands = state.hands;
  switch (station) {
    case 'crates':
      return hands ? 'Hands full' : 'E: grab an ingredient from the pantry';
    case 'board':
      if (state.board) return state.board.done ? 'E: take the chopped food' : 'Chopping…';
      if (!hands || hands.plate) return 'E: chopping board — bring something to chop';
      return `E: chop the ${INGREDIENTS[hands.ing].name}`;
    case 'stove':
      if (hands && !hands.plate) return `E: cook the ${INGREDIENTS[hands.ing].name}`;
      if (!hands) return 'E: take food off the stove';
      return 'E: stove';
    case 'assembly':
      if (!state.plate) return 'A fresh plate is on its way…';
      if (hands && !hands.plate) return `E: add ${itemLabel(hands)} to the plate`;
      if (!hands) return 'E: pick up the plate';
      return 'E: assembly counter';
    case 'serve':
      if (hands && hands.plate) return 'E: SERVE this plate!';
      return 'E: serving window — bring a finished plate';
    case 'trash':
      return hands ? 'E: throw it away' : 'Trash';
    default:
      return '';
  }
}

// ------------------------------------------------------------ click-to-move
function handleClick() {
  if (!input.click) return;
  const { x, y } = input.click;
  if (state.screen === 'title') { startShift(); return; }
  if (state.screen === 'over') { startShift(); return; }
  if (state.screen !== 'playing') return;
  sfx.ensure();
  // Clicked a station: walk to its open side, then interact on arrival.
  for (const [name, s] of Object.entries(STATIONS)) {
    if (x >= s.x - 8 && x <= s.x + s.w + 8 && y >= s.y - 8 && y <= s.y + s.h + 8) {
      // Approach from the open floor: the pantry from the right, the bottom
      // counters from above, the serving window from below.
      let tx;
      let ty;
      if (name === 'crates' || name === 'trash') {
        tx = s.x + s.w + 30;
        ty = Math.min(Math.max(y, s.y + 10), s.y + s.h - 10);
      } else if (name === 'serve') {
        tx = Math.min(Math.max(x, s.x + 10), s.x + s.w - 10);
        ty = s.y + s.h + 30;
      } else {
        tx = Math.min(Math.max(x, s.x + 10), s.x + s.w - 10);
        ty = s.y - 30;
      }
      state.chef.target = { x: tx, y: ty };
      state.chef.targetStation = name;
      // Already adjacent: interact at once.
      if (stationNear(state, name, 30)) interactAtStation(name);
      return;
    }
  }
  // Clicked open floor: just walk there.
  state.chef.target = { x, y };
  state.chef.targetStation = null;
}

function updateChefTarget(dt) {
  const c = state.chef;
  if (!c.target) return;
  const dx = c.target.x - c.x;
  const dy = c.target.y - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 12) {
    c.target = null;
    if (c.targetStation) {
      interactAtStation(c.targetStation);
      c.targetStation = null;
    }
    return;
  }
  moveChef(state, dx, dy, dt);
}

// ------------------------------------------------------------ main loop
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state.nearStation = nearestStation(state);
  prompt = '';

  if (input.consume('mute')) {
    state.muted = !state.muted;
    sfx.setMuted(state.muted);
  }

  if (state.screen === 'title') {
    if (input.consume('interact')) startShift();
    handleClick();
  } else if (state.screen === 'playing') {
    if (!FROZEN) {
      // Timer and rush.
      state.time += dt;
      state.timeLeft = Math.max(0, SHIFT_SECONDS - state.time);
      state.rush = state.timeLeft <= RUSH_SECONDS && state.timeLeft > 0;
      if (state.timeLeft <= 10 && state.timeLeft > 0) {
        const sec = Math.ceil(state.timeLeft);
        if (sec !== lastTickSecond) {
          lastTickSecond = sec;
          sfx.tick();
        }
      }
      if (state.timeLeft <= 0) {
        state.screen = 'over';
        sfx.stopSizzle();
        sfx.stopMusic();
        sfx.fanfare();
        setStatus(`Shift over. ${state.served} orders served, ${state.earned} coins earned.`);
      } else {
        updateOrders(state, dt, sfx);
        updateCooking(state, dt, sfx);
        updatePopups(state, dt);
      }
    }
    if (state.screen === 'playing' && !FROZEN) {
      // Movement: keys win over a click target.
      const { dx, dy } = input.moveVector();
      if (dx || dy) {
        state.chef.target = null;
        state.chef.targetStation = null;
        moveChef(state, dx, dy, dt);
        state.chef.moving = true;
      } else {
        updateChefTarget(dt);
        state.chef.moving = !!state.chef.target;
      }

      if (input.consume('interact')) {
        sfx.ensure();
        interactAtStation(state.nearStation);
      }
      if (input.consume('pause')) {
        state.screen = 'paused';
        sfx.stopSizzle();
      }
      prompt = promptFor(state.nearStation);
      handleClick();
    } else if (state.screen === 'playing') {
      prompt = promptFor(state.nearStation);
    }
  } else if (state.screen === 'paused') {
    if (input.consume('pause') || input.consume('interact')) {
      state.screen = 'playing';
      sfx.ensure();
    }
    handleClick();
  } else if (state.screen === 'over') {
    if (input.consume('restart') || input.consume('interact')) startShift();
    handleClick();
  }

  drawGame(ctx, state, prompt);
  input.endFrame();
  requestAnimationFrame(frame);
}

setStatus('Sizzle and Serve: press Enter or click to start the shift.');
// Exposed for debugging and automated play-tests; the game never reads it.
window.__sizzle = state;
requestAnimationFrame(frame);
