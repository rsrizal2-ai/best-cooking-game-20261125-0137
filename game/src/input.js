// input.js — keyboard and mouse, one clear job: turn presses and clicks into
// intents the main loop reads. WASD / arrows move, E or Space interacts,
// P pauses, M mutes, R restarts on the results screen. Clicking a station
// walks the chef there and interacts on arrival; clicking the pantry picks
// the crate under the cursor.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(), // edge-triggered: consumed by the main loop each frame
    click: null, // { x, y } in canvas pixels, consumed by the main loop
    mouse: { x: 0, y: 0 },
  };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyE: 'interact', Space: 'interact', Enter: 'interact',
    KeyP: 'pause', Escape: 'pause',
    KeyM: 'mute',
    KeyR: 'restart',
  };

  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) input.pressed.add(action);
    input.keys.add(action);
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) input.keys.delete(action);
  });
  window.addEventListener('blur', () => input.keys.clear());

  function toCanvas(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    input.click = toCanvas(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    input.mouse = toCanvas(e);
  });

  input.moveVector = function moveVector() {
    let dx = 0;
    let dy = 0;
    if (input.keys.has('left')) dx -= 1;
    if (input.keys.has('right')) dx += 1;
    if (input.keys.has('up')) dy -= 1;
    if (input.keys.has('down')) dy += 1;
    return { dx, dy };
  };

  input.consume = function consume(action) {
    if (input.pressed.has(action)) {
      input.pressed.delete(action);
      return true;
    }
    return false;
  };

  input.endFrame = function endFrame() {
    input.pressed.clear();
    input.click = null;
  };

  return input;
}
