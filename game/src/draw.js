// draw.js — everything the player sees, drawn with canvas vector art.
// One clear job: render the kitchen, the food, the chef and the HUD.
// No game rules live here; it only reads state.

import {
  VIEW_W, VIEW_H, HUD_H, COLORS, INGREDIENTS, RECIPES,
  CHEF_RADIUS, CHOP_SECONDS, COOK_SECONDS, STAR_COINS,
} from './config.js';
import { STATIONS, CRATE_ORDER, crateRect, itemLabel } from './kitchen.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// ---------------------------------------------------------------- food art
export function drawIngredient(ctx, ing, x, y, size, state = 'raw') {
  const def = INGREDIENTS[ing];
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#241a12';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.3);
    ctx.lineTo(r * 0.4, r * 0.4);
    ctx.moveTo(r * 0.5, -r * 0.4);
    ctx.lineTo(-r * 0.3, r * 0.5);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const cooked = state === 'cooked';
  const chopped = state === 'chopped';
  const main = cooked ? shade(def.color) : def.color;
  const dark = cooked ? '#6b4423' : def.dark;

  if (chopped) {
    // Chopped food reads as neat little pieces on the plate.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      const px = Math.cos(a) * r * 0.42;
      const py = Math.sin(a) * r * 0.42;
      ctx.fillStyle = i % 2 ? main : dark;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  switch (ing) {
    case 'tomato': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, r * 0.08, r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f9e4d';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.55);
      ctx.lineTo(-r * 0.35, -r * 0.95);
      ctx.lineTo(r * 0.05, -r * 0.6);
      ctx.lineTo(r * 0.4, -r * 0.9);
      ctx.lineTo(r * 0.15, -r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -r * 0.25, r * 0.22, r * 0.32, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = main;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'onion': {
      ctx.fillStyle = '#f7f0fa';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, r * (0.45 + Math.abs(i) * 0.18), Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
      ctx.fillStyle = '#7fb069';
      ctx.fillRect(-r * 0.08, -r * 1.05, r * 0.16, r * 0.35);
      break;
    }
    case 'cheese': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, r * 0.6);
      ctx.lineTo(r * 0.85, r * 0.6);
      ctx.lineTo(0, -r * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dark;
      [[-0.3, 0.2], [0.25, 0.3], [0, -0.3]].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px * r, py * r, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'bun': {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.85, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-r * 0.85, r * 0.15, r * 1.7, r * 0.28);
      ctx.fillStyle = '#fff3d6';
      [[-0.4, -0.35], [0, -0.55], [0.4, -0.35]].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.ellipse(px * r, py * r, r * 0.1, r * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'patty': {
      ctx.fillStyle = cooked ? '#6e4426' : '#9a6a44';
      roundRect(ctx, -r * 0.95, -r * 0.5, r * 1.9, r * 1.0, r * 0.45);
      ctx.fill();
      ctx.strokeStyle = cooked ? '#4a2c14' : '#7a4e2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.15);
      ctx.lineTo(r * 0.6, -r * 0.15);
      ctx.moveTo(-r * 0.6, r * 0.15);
      ctx.lineTo(r * 0.6, r * 0.15);
      ctx.stroke();
      break;
    }
    case 'pasta': {
      ctx.strokeStyle = main;
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, (i - 1) * r * 0.42, r * (0.55 - i * 0.08), 0.3, Math.PI * 1.7);
        ctx.stroke();
      }
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'mushroom': {
      ctx.fillStyle = cooked ? '#c98f5f' : '#e8d5bd';
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.85, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      [[-0.45, -0.45], [0.1, -0.65], [0.5, -0.35]].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px * r, py * r, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#f3e6d0';
      ctx.fillRect(-r * 0.22, -r * 0.1, r * 0.44, r * 0.7);
      break;
    }
    case 'dough': {
      ctx.fillStyle = cooked ? '#e0a95c' : main;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cooked ? '#b57e35' : dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    default: {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function shade(hex) {
  // Warm the colour toward brown for cooked food.
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * 0.75 + 60);
  const g = Math.min(255, ((n >> 8) & 255) * 0.6 + 30);
  const b = ((n & 255) * 0.5) | 0;
  return `rgb(${r | 0},${g | 0},${b})`;
}

// ---------------------------------------------------------------- plates
export function drawPlate(ctx, x, y, size, items) {
  ctx.fillStyle = '#f4f6f8';
  ctx.beginPath();
  ctx.ellipse(x, y, size, size * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c3ccd6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.78, size * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  const spots = [
    [-0.32, -0.08], [0.3, -0.12], [0, 0.22], [-0.05, -0.3], [0.42, 0.18], [-0.45, 0.2],
  ];
  items.forEach((item, i) => {
    const [px, py] = spots[i % spots.length];
    drawIngredient(ctx, item.ing, x + px * size, y + py * size * 0.8, size * 0.52, item.state);
  });
}

// ---------------------------------------------------------------- kitchen
function drawFloor(ctx) {
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  const tile = 64;
  for (let y = HUD_H; y < VIEW_H; y += tile) {
    for (let x = 0; x < VIEW_W; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) {
        ctx.fillStyle = COLORS.floorB;
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW_W; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_H);
    ctx.lineTo(x, VIEW_H);
    ctx.stroke();
  }
  for (let y = HUD_H; y <= VIEW_H; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_W, y);
    ctx.stroke();
  }
}

function drawCounter(ctx, s, label, highlight) {
  ctx.fillStyle = COLORS.counter;
  roundRect(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.counterTop;
  roundRect(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 14, 8);
  ctx.fill();
  ctx.strokeStyle = COLORS.counterEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.stroke();
  text(ctx, label, s.x + s.w / 2, s.y + s.h - 8, 11, '#f3e2c2', 'center', '700');
  if (highlight) {
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    roundRect(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawCrates(ctx, state, highlight) {
  drawCounter(ctx, STATIONS.crates, 'PANTRY', highlight);
  CRATE_ORDER.forEach((ing, i) => {
    const r = crateRect(i);
    ctx.fillStyle = '#6e4525';
    roundRect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 6);
    ctx.fill();
    ctx.fillStyle = '#f7ead2';
    roundRect(ctx, r.x, r.y, r.w, r.h, 5);
    ctx.fill();
    drawIngredient(ctx, ing, r.x + r.w / 2, r.y + r.h / 2 - 3, 30);
    text(ctx, INGREDIENTS[ing].name, r.x + r.w / 2, r.y + r.h - 8, 8.5, '#5d3a22');
  });
}

function drawBoard(ctx, state, highlight) {
  drawCounter(ctx, STATIONS.board, 'CHOPPING BOARD  (E)', highlight);
  ctx.fillStyle = '#e8d3a8';
  roundRect(ctx, STATIONS.board.x + 22, STATIONS.board.y + 12, 176, 52, 8);
  ctx.fill();
  ctx.strokeStyle = '#b99a67';
  ctx.lineWidth = 2;
  roundRect(ctx, STATIONS.board.x + 22, STATIONS.board.y + 12, 176, 52, 8);
  ctx.stroke();
  if (state.board) {
    const { item, progress, done } = state.board;
    drawIngredient(ctx, item.ing, STATIONS.board.x + 110, STATIONS.board.y + 38, 34, done ? 'chopped' : 'raw');
    if (!done) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, STATIONS.board.x + 40, STATIONS.board.y + 68, 140, 10, 5);
      ctx.fill();
      ctx.fillStyle = '#58b368';
      roundRect(ctx, STATIONS.board.x + 40, STATIONS.board.y + 68, 140 * progress, 10, 5);
      ctx.fill();
    } else {
      text(ctx, 'READY — take it!', STATIONS.board.x + 110, STATIONS.board.y + 72, 12, '#2f7d3d');
    }
  } else {
    text(ctx, 'chop here', STATIONS.board.x + 110, STATIONS.board.y + 38, 13, '#8a6b45');
  }
}

function drawStove(ctx, state, highlight) {
  drawCounter(ctx, STATIONS.stove, 'STOVE — cooks, then burns!  (E)', highlight);
  state.burners.forEach((b, i) => {
    const cx = STATIONS.stove.x + 65 + i * 130;
    const cy = STATIONS.stove.y + 34;
    ctx.fillStyle = '#2b2b30';
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#55555e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.stroke();
    if (b) {
      drawIngredient(ctx, b.ing, cx, cy, 42, b.state);
      // Cooking progress reads as a ring around the burner, never as a bar
      // over the station's label.
      if (b.state === 'raw') {
        ctx.strokeStyle = '#ff9d3c';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.cook));
        ctx.stroke();
      } else if (b.state === 'cooked') {
        // Cooked food pulses gently: take it before it burns. The red ring
        // is the time left before it burns.
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
        text(ctx, 'READY', cx, cy - 52, 13, '#58b368');
        ctx.strokeStyle = `rgba(88,179,104,${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 44 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#e5484d';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, b.cook - 1));
        ctx.stroke();
      } else {
        text(ctx, 'BURNT', cx, cy - 52, 13, '#e5484d');
      }
    } else {
      ctx.fillStyle = '#3a3a40';
      ctx.beginPath();
      ctx.arc(cx, cy, 27, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawAssembly(ctx, state, highlight) {
  drawCounter(ctx, STATIONS.assembly, 'ASSEMBLY — build the plate  (E)', highlight);
  const cx = STATIONS.assembly.x + STATIONS.assembly.w / 2;
  const cy = STATIONS.assembly.y + 40;
  if (state.plate) {
    drawPlate(ctx, cx, cy, 52, state.plate.items);
    if (state.plate.items.length === 0) {
      text(ctx, 'empty plate — add ingredients', cx, cy + 52, 12, '#f3e2c2');
    }
  } else {
    text(ctx, 'fresh plate on its way…', cx, cy, 13, '#f3e2c2');
  }
}

function drawServe(ctx, state, highlight) {
  const s = STATIONS.serve;
  ctx.fillStyle = '#3d2b1f';
  roundRect(ctx, s.x, s.y, s.w, s.h, 10);
  ctx.fill();
  ctx.fillStyle = '#fff6dd';
  roundRect(ctx, s.x + 8, s.y + 8, s.w - 16, s.h - 34, 6);
  ctx.fill();
  ctx.fillStyle = '#8a6b45';
  ctx.beginPath();
  ctx.moveTo(s.x + 20, s.y + s.h - 26);
  ctx.lineTo(s.x + s.w - 20, s.y + s.h - 26);
  ctx.lineWidth = 5;
  ctx.stroke();
  text(ctx, 'SERVE  (E)', s.x + s.w / 2, s.y + s.h - 12, 13, '#ffe27a');
  // The plate itself rides above the chef's head when carried, so the
  // window stays clean: one plate on screen, never two.
  const held = state.hands && state.hands.plate;
  if (!held) {
    text(ctx, 'bring a finished plate', s.x + s.w / 2, s.y + 34, 12, '#8a6b45');
  } else {
    text(ctx, 'drop it here!', s.x + s.w / 2, s.y + 34, 13, '#2f7d3d');
  }
  if (highlight) {
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    roundRect(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawTrash(ctx, highlight) {
  const s = STATIONS.trash;
  ctx.fillStyle = '#5d6b7a';
  roundRect(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  ctx.fillStyle = '#7d8b9b';
  roundRect(ctx, s.x + 6, s.y + 6, s.w - 12, 14, 5);
  ctx.fill();
  text(ctx, 'TRASH', s.x + s.w / 2, s.y + s.h - 12, 11, '#e8eef4');
  if (highlight) {
    ctx.strokeStyle = '#ffe27a';
    ctx.lineWidth = 4;
    roundRect(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 10);
    ctx.stroke();
  }
}

function drawChef(ctx, state) {
  const c = state.chef;
  const bob = c.moving ? Math.sin(performance.now() / 110) * 2 : 0;
  ctx.save();
  ctx.translate(c.x, c.y + bob * 0.3);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: apron.
  ctx.fillStyle = '#f4f6f8';
  roundRect(ctx, -16, -6, 32, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#3f7fbf';
  roundRect(ctx, -16, 2, 32, 18, 8);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f2c49b';
  ctx.beginPath();
  ctx.arc(0, -16, 13, 0, Math.PI * 2);
  ctx.fill();
  // Toque.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-7, -28, 8, 0, Math.PI * 2);
  ctx.arc(0, -32, 9, 0, Math.PI * 2);
  ctx.arc(7, -28, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -30, 26, 8);
  // Face: eyes toward the walking direction.
  const ex = c.dir === 'left' ? -3 : c.dir === 'right' ? 3 : 0;
  ctx.fillStyle = '#2b1d12';
  ctx.beginPath();
  ctx.arc(-5 + ex, -16, 1.8, 0, Math.PI * 2);
  ctx.arc(5 + ex, -16, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b1d12';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ex, -11, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Hands: what the chef carries, held up front.
  if (state.hands) {
    if (state.hands.plate) {
      drawPlate(ctx, 0, -44, 26, state.hands.items);
      text(ctx, 'Plate', 0, -62, 11, '#fff', 'center', '700');
    } else {
      drawIngredient(ctx, state.hands.ing, 0, -42, 26, state.hands.state);
      text(ctx, itemLabel(state.hands), 0, -62, 11, '#fff', 'center', '700');
    }
  }
  ctx.restore();
}

function drawPopups(ctx, state) {
  state.popups.forEach((p) => {
    ctx.globalAlpha = Math.min(1, p.life);
    text(ctx, p.text, p.x, p.y, 22, p.color, 'center', '800');
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 4;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.globalAlpha = 1;
  });
}

// ---------------------------------------------------------------- HUD
function drawOrderBoard(ctx, state) {
  ctx.fillStyle = COLORS.board;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#5d3a22';
  ctx.fillRect(0, HUD_H - 6, VIEW_W, 6);
  text(ctx, 'ORDER BOARD', 14, 18, 13, '#e8c98a', 'left', '800');
  text(ctx, 'Sizzle & Serve — Rush Hour Kitchen', 14, 40, 11, '#c9a06a', 'left', '600');

  const ticketW = 190;
  const ticketH = 76;
  const gap = 8;
  const x0 = 250;
  state.orders.forEach((order, i) => {
    const x = x0 + i * (ticketW + gap);
    const y = 12;
    const frac = Math.max(0, order.patience / order.patienceMax);
    const urgent = frac < 0.35;
    ctx.fillStyle = COLORS.ticket;
    roundRect(ctx, x, y, ticketW, ticketH, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#e5484d' : COLORS.ticketEdge;
    ctx.lineWidth = urgent ? 3 : 2;
    roundRect(ctx, x, y, ticketW, ticketH, 8);
    ctx.stroke();
    text(ctx, `#${order.id}  ${order.recipe.name}`, x + 10, y + 14, 13, COLORS.ink, 'left', '800');
    text(ctx, `$${order.recipe.coins}`, x + ticketW - 10, y + 14, 13, '#b57e35', 'right', '800');
    // Recipe steps as icons with checkmarks once plated.
    order.recipe.steps.forEach((step, j) => {
      const ix = x + 22 + j * 44;
      const iy = y + 40;
      drawIngredient(ctx, step.ing, ix, iy, 30, step.state);
      if (order.done[j]) {
        ctx.fillStyle = '#58b368';
        ctx.beginPath();
        ctx.arc(ix + 12, iy - 12, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ix + 7, iy - 12);
        ctx.lineTo(ix + 11, iy - 8);
        ctx.lineTo(ix + 18, iy - 17);
        ctx.stroke();
      }
    });
    // Patience bar.
    ctx.fillStyle = '#e8ddc4';
    roundRect(ctx, x + 10, y + ticketH - 12, ticketW - 20, 7, 3);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#58b368' : frac > 0.25 ? '#ff9d3c' : '#e5484d';
    roundRect(ctx, x + 10, y + ticketH - 12, (ticketW - 20) * frac, 7, 3);
    ctx.fill();
  });
  if (state.orders.length === 0) {
    text(ctx, 'No orders — the lunch crowd is coming…', x0 + 10, 50, 14, '#c9a06a', 'left', '600');
  }

  // Shift timer, top right.
  const tx = VIEW_W - 150;
  const mm = Math.max(0, Math.floor(state.timeLeft / 60));
  const ss = Math.max(0, Math.floor(state.timeLeft % 60));
  const timeStr = `${mm}:${String(ss).padStart(2, '0')}`;
  const timeColor = state.timeLeft < 30 ? '#ff6b6b' : '#fff8ea';
  text(ctx, 'SHIFT', tx, 18, 11, '#c9a06a', 'center', '800');
  text(ctx, timeStr, tx, 46, 30, timeColor, 'center', '800');
  const timeFrac = Math.max(0, state.timeLeft / 150);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(ctx, tx - 60, 68, 120, 8, 4);
  ctx.fill();
  ctx.fillStyle = state.timeLeft < 30 ? '#ff6b6b' : '#ffc93c';
  roundRect(ctx, tx - 60, 68, 120 * timeFrac, 8, 4);
  ctx.fill();

  // Coins, top right: a drawn gold coin, never an emoji (headless fonts vary).
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.arc(VIEW_W - 116, 22, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b57e35';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(VIEW_W - 116, 22, 6, 0, Math.PI * 2);
  ctx.stroke();
  text(ctx, `${state.coins}`, VIEW_W - 100, 22, 18, '#ffc93c', 'left', '800');
  if (state.combo >= 2) {
    ctx.fillStyle = '#e5484d';
    roundRect(ctx, VIEW_W - 92, 40, 76, 26, 13);
    ctx.fill();
    text(ctx, `COMBO x${state.combo}`, VIEW_W - 54, 53, 14, '#fff');
  }
  // Lost orders as burnt stars.
  for (let i = 0; i < 3; i++) {
    const sx = VIEW_W - 92 + i * 22;
    const sy = 84;
    ctx.fillStyle = i < state.lost ? '#e5484d' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, sx, sy, 9);
  }
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPrompt(ctx, state, prompt) {
  if (!prompt) return;
  ctx.fillStyle = 'rgba(43,29,18,0.88)';
  const w = ctx.measureText(prompt).width + 44;
  roundRect(ctx, VIEW_W / 2 - w / 2, VIEW_H - 52, w, 34, 17);
  ctx.fill();
  text(ctx, prompt, VIEW_W / 2, VIEW_H - 34, 15, '#ffe27a');
}

function drawRushBanner(ctx, state) {
  if (!state.rush) return;
  const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 200);
  ctx.globalAlpha = pulse;
  text(ctx, '★ RUSH HOUR ★', VIEW_W / 2, HUD_H + 30, 26, '#ff6b6b', 'center', '800');
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- screens
function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(30,18,10,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'SIZZLE & SERVE', VIEW_W / 2, 170, 64, '#ffc93c', 'center', '800');
  text(ctx, 'Rush Hour Kitchen', VIEW_W / 2, 224, 30, '#fff8ea', 'center', '700');
  text(ctx, 'The lunch crowd is hungry. Chop it, grill it, plate it, serve it — before they walk out.', VIEW_W / 2, 268, 17, '#e8d3a8');
  const lines = [
    ['Move', 'WASD / Arrow keys — or click a station and the chef walks there'],
    ['Interact', 'E or Space — grab, chop, grill, plate, serve'],
    ['Cook', 'Food on the stove burns if you leave it — watch the READY glow'],
    ['Serve', 'Match the plate to an order ticket to earn coins + tips'],
  ];
  lines.forEach(([k, v], i) => {
    const y = 322 + i * 34;
    text(ctx, k, VIEW_W / 2 - 240, y, 16, '#ffc93c', 'left', '800');
    text(ctx, v, VIEW_W / 2 - 150, y, 15, '#fff8ea', 'left', '600');
  });
  const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 300);
  ctx.globalAlpha = pulse;
  text(ctx, 'Press ENTER or click to start the shift  •  5 recipes unlock as the rush builds', VIEW_W / 2, 500, 18, '#fff');
  ctx.globalAlpha = 1;
  text(ctx, 'M mute  •  P pause', VIEW_W / 2, 534, 13, '#c9a06a');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(30,18,10,0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'PAUSED', VIEW_W / 2, VIEW_H / 2 - 10, 48, '#fff8ea', 'center', '800');
  text(ctx, 'Press P to get back to the kitchen', VIEW_W / 2, VIEW_H / 2 + 36, 16, '#e8d3a8');
}

function drawResults(ctx, state) {
  ctx.fillStyle = 'rgba(30,18,10,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'SHIFT OVER!', VIEW_W / 2, 150, 52, '#ffc93c', 'center', '800');
  const stars = STAR_COINS.filter((c) => state.earned >= c).length;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < stars ? '#ffc93c' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, VIEW_W / 2 + (i - 1) * 70, 220, 30);
  }
  const rows = [
    ['Coins earned', `$${state.earned}`],
    ['Orders served', `${state.served}`],
    ['Orders lost', `${state.lost}`],
    ['Best combo', `x${state.bestCombo}`],
    ['Food burnt', `${state.stats.burnt}`],
  ];
  rows.forEach(([k, v], i) => {
    const y = 300 + i * 36;
    text(ctx, k, VIEW_W / 2 - 130, y, 18, '#e8d3a8', 'left', '600');
    text(ctx, v, VIEW_W / 2 + 130, y, 18, '#fff8ea', 'right', '800');
  });
  const verdict = stars === 3 ? 'A flawless shift — the crowd wants you back tomorrow!'
    : stars === 2 ? 'A great shift — the regulars are already queuing.'
    : stars === 1 ? 'A decent shift — the stove forgives, the crowd remembers.'
    : 'A rough shift — the crowd walked out hungry. One more go?';
  text(ctx, verdict, VIEW_W / 2, 510, 17, '#fff8ea');
  const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 300);
  ctx.globalAlpha = pulse;
  text(ctx, 'Press R to run another shift', VIEW_W / 2, 556, 18, '#ffe27a');
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- entry
export function drawGame(ctx, state, prompt) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake * 8, (Math.random() - 0.5) * state.shake * 8);
  }
  drawFloor(ctx);
  const near = state.nearStation || null;
  drawCrates(ctx, state, near === 'crates');
  drawServe(ctx, state, near === 'serve');
  drawTrash(ctx, near === 'trash');
  drawBoard(ctx, state, near === 'board');
  drawStove(ctx, state, near === 'stove');
  drawAssembly(ctx, state, near === 'assembly');
  drawChef(ctx, state);
  drawPopups(ctx, state);
  drawRushBanner(ctx, state);
  ctx.restore();
  drawOrderBoard(ctx, state);
  if (state.screen === 'playing') drawPrompt(ctx, state, prompt);
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
  if (state.screen === 'over') drawResults(ctx, state);
}
