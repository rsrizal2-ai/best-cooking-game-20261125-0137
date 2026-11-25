// shots.js — screenshot staging: ?shot=start|play|serve|end (&seed=) puts the
// kitchen into a fixed, readable moment so every screenshot is a real render
// of the game's own code, showing the brief's checklist at a glance:
// a kitchen and an order board, ingredients on the counter, one dish
// mid-assembly, a timer, and a plate ready to serve.

import { RECIPES, SHIFT_SECONDS } from './config.js';
import { newItem, spawnOrder } from './kitchen.js';

function makeOrder(state, recipeId, patienceFrac, servedSteps) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  const patienceMax = 48;
  const order = {
    id: state.nextOrderId++,
    recipe,
    patience: patienceMax * patienceFrac,
    patienceMax,
    done: recipe.steps.map((_, i) => i < servedSteps),
  };
  state.orders.push(order);
  return order;
}

export function applyShot(state, shot) {
  state.time = 63; // recipes up to pasta are unlocked; the board reads busy
  state.timeLeft = 107; // 1:47 on the shift timer
  state.plate = { plate: true, items: [] };
  state.chef.x = 410;
  state.chef.y = 470;
  state.chef.dir = 'right';

  if (shot === 'start') {
    state.screen = 'title';
    state.time = 0;
    state.timeLeft = SHIFT_SECONDS;
    makeOrder(state, 'salad', 0.9, 0);
    makeOrder(state, 'burger', 0.75, 0);
    state.hands = null; // the title keeps the kitchen clean behind it
    return;
  }

  if (shot === 'play') {
    // The money shot: three tickets on the board, a burger mid-assembly on
    // the plate, a patty sizzling on the stove, the chef chopping a tomato,
    // coins and a combo already earned.
    state.screen = 'playing';
    makeOrder(state, 'burger', 0.62, 2);
    makeOrder(state, 'salad', 0.45, 1);
    makeOrder(state, 'pasta', 0.8, 0);
    state.plate.items = [
      { ing: 'bun', state: 'raw' },
      { ing: 'patty', state: 'cooked' },
    ];
    state.burners[0] = { ing: 'patty', state: 'raw', chop: 0, cook: 0.72 };
    state.board = { item: newItem('tomato'), progress: 0.55, done: false };
    state.chef.x = 410;
    state.chef.y = 535;
    state.chef.dir = 'down';
    state.coins = 86;
    state.earned = 86;
    state.combo = 2;
    state.bestCombo = 3;
    state.served = 4;
    state.nearStation = 'board';
    return;
  }

  if (shot === 'serve') {
    // A finished burger on the plate in the chef's hands at the serving
    // window, its ticket checked off and glowing, coins popping.
    state.screen = 'playing';
    const order = makeOrder(state, 'burger', 0.5, 4);
    makeOrder(state, 'soup', 0.7, 0);
    makeOrder(state, 'salad', 0.35, 0);
    state.plate = null;
    state.plateTimer = 0;
    state.hands = {
      plate: true,
      items: [
        { ing: 'bun', state: 'raw' },
        { ing: 'patty', state: 'cooked' },
        { ing: 'cheese', state: 'raw' },
        { ing: 'lettuce', state: 'chopped' },
      ],
    };
    state.chef.x = 1140;
    state.chef.y = 300;
    state.chef.dir = 'up';
    state.coins = 110;
    state.earned = 110;
    state.combo = 3;
    state.bestCombo = 3;
    state.served = 5;
    state.nearStation = 'serve';
    state.popups.push({ x: 990, y: 330, text: '+24  TIP!', color: '#ffc93c', life: 1.4 });
    void order;
    return;
  }

  if (shot === 'end') {
    state.screen = 'over';
    state.timeLeft = 0;
    state.earned = 148;
    state.coins = 148;
    state.served = 9;
    state.lost = 1;
    state.bestCombo = 5;
    state.combo = 0;
    state.stats = { served: 9, lost: 1, burnt: 1, chopped: 22, cooked: 9 };
    makeOrder(state, 'pizza', 0.6, 0);
    return;
  }

  // Unknown shot: just play normally.
  state.screen = 'playing';
  spawnOrder(state);
}
