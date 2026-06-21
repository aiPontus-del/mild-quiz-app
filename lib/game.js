// Brand colours + the 4 answer shapes (matches the Mild design).
export const SHAPES = [
  { color: '#EF5350', name: 'triangle' },
  { color: '#3FA4F5', name: 'diamond' },
  { color: '#FFAE38', name: 'circle', dark: true },
  { color: '#00BFA5', name: 'square' },
];

// Classic Kahoot scoring: 0 if wrong; up to 1000 for correct, scaled by speed.
export function scoreAnswer({ correct, timeUsedMs, timeLimitMs }) {
  if (!correct) return 0;
  const frac = Math.min(1, Math.max(0, timeUsedMs / timeLimitMs));
  return Math.round(1000 * (1 - frac / 2));
}

export function makePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const NAMES = ['Nova','Pixel','Quartz','Mango','Zephyr','Comet','Indigo','Maple','Echo','Frost','Lumen','Cobalt','Wren','Juniper','Ziggy','Lark','Banjo','Mochi','Cleo','Vega'];
const PALETTE = ['#EF5350','#3FA4F5','#FFAE38','#00BFA5','#7E57C2'];

export function makePlayer(name) {
  const color = PALETTE[(name.charCodeAt(0) + name.length) % PALETTE.length];
  return { id: name + Math.random().toString(36).slice(2, 6), name, color, initial: name[0].toUpperCase(), score: 0 };
}

export const namePool = NAMES;
