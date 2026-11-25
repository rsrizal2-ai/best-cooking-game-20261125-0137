// config.js — every tunable number, ingredient and recipe for Sizzle & Serve.
// One clear job: the game's data. No logic lives here, so tuning never risks a bug.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 104; // top order-board strip

export const SHIFT_SECONDS = 150;
export const RUSH_SECONDS = 30; // last stretch: faster orders, faster patience drain
export const MAX_ORDERS = 4;
export const MAX_LOST = 3; // lost orders shown as burnt stars; shift still runs to the timer

// Ingredients. chop: must visit the chopping board. cook: must visit the stove.
// state on an item: 'raw' -> 'chopped' and/or 'cooked' -> 'burnt' (only on the stove).
export const INGREDIENTS = {
  tomato:   { name: 'Tomato',   color: '#e5484d', dark: '#b3272e', chop: true,  cook: false, price: 1 },
  lettuce:  { name: 'Lettuce',  color: '#58b368', dark: '#2f7d3d', chop: true,  cook: false, price: 1 },
  onion:    { name: 'Onion',    color: '#f3e5f5', dark: '#c9a7d4', chop: true,  cook: false, price: 1 },
  cheese:   { name: 'Cheese',   color: '#ffc93c', dark: '#e0a100', chop: false, cook: false, price: 2 },
  bun:      { name: 'Bun',      color: '#e8b06a', dark: '#b57e35', chop: false, cook: false, price: 2 },
  patty:    { name: 'Patty',    color: '#8a5a3b', dark: '#5d3a22', chop: false, cook: true,  price: 3 },
  pasta:    { name: 'Pasta',    color: '#f2c14e', dark: '#c98f1b', chop: false, cook: true,  price: 3 },
  mushroom: { name: 'Mushroom', color: '#d9c1a3', dark: '#a98a68', chop: false, cook: true,  price: 3 },
  dough:    { name: 'Dough',    color: '#f6e3c1', dark: '#d9b98a', chop: false, cook: true,  price: 3 },
};

// A recipe step is an ingredient id plus the state it must be in when plated.
export const RECIPES = [
  {
    id: 'salad', name: 'Garden Salad', coins: 8, unlockAt: 0,
    steps: [
      { ing: 'lettuce', state: 'chopped' },
      { ing: 'tomato', state: 'chopped' },
    ],
  },
  {
    id: 'burger', name: 'Sizzle Burger', coins: 18, unlockAt: 20,
    steps: [
      { ing: 'bun', state: 'raw' },
      { ing: 'patty', state: 'cooked' },
      { ing: 'cheese', state: 'raw' },
      { ing: 'lettuce', state: 'chopped' },
    ],
  },
  {
    id: 'pasta', name: 'Tomato Pasta', coins: 12, unlockAt: 50,
    steps: [
      { ing: 'pasta', state: 'cooked' },
      { ing: 'tomato', state: 'chopped' },
    ],
  },
  {
    id: 'soup', name: 'Mushroom Soup', coins: 14, unlockAt: 80,
    steps: [
      { ing: 'mushroom', state: 'cooked' },
      { ing: 'onion', state: 'chopped' },
    ],
  },
  {
    id: 'pizza', name: 'Cheesy Pizza', coins: 20, unlockAt: 110,
    steps: [
      { ing: 'dough', state: 'cooked' },
      { ing: 'tomato', state: 'chopped' },
      { ing: 'cheese', state: 'raw' },
    ],
  },
];

export const CHOP_SECONDS = 1.4;
export const COOK_SECONDS = 4.0; // done at this point, then the same again to burn
export const PATIENCE_START = 52; // seconds an order waits, shrinking as the shift goes on
export const PATIENCE_END = 34;
export const SPAWN_START = 16; // seconds between new orders, shrinking as the shift goes on
export const SPAWN_END = 8.5;

export const CHEF_SPEED = 265; // px per second
export const CHEF_RADIUS = 20;

// Stars on the results screen, by coins earned in one shift.
export const STAR_COINS = [60, 120, 200];

export const COLORS = {
  floorA: '#c98f5f',
  floorB: '#bd8252',
  wall: '#7a4a2b',
  counter: '#8d5a33',
  counterTop: '#b5773f',
  counterEdge: '#6e4525',
  steel: '#c8ccd4',
  steelDark: '#9aa0ab',
  board: '#3d2b1f',
  ticket: '#fff6dd',
  ticketEdge: '#d9c08a',
  cream: '#fff8ea',
  ink: '#2b1d12',
  red: '#e5484d',
  green: '#58b368',
  gold: '#ffc93c',
};
