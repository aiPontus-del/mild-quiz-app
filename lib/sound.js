'use client';
// WebAudio sound: effects + a looping background music bed. No audio files.
let ctx = null;
let muted = false;
let master = null;      // master gain for music
let schedTimer = null;  // music scheduler
let nextTime = 0;
let step = 0;

function ac() {
  if (typeof window === 'undefined') return null;
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.18, dest = null) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest || c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

// ---- music: gentle 4-chord loop (Am F C G) with pad + arpeggio + soft pulse ----
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz
// each chord: [bass midi, [arp midi notes]]
const PROG = [
  [45, [69, 72, 76]], // Am
  [41, [65, 69, 72]], // F
  [48, [72, 76, 79]], // C
  [43, [67, 71, 74]], // G
];
const BPM = 96;
const EIGHTH = 30 / BPM; // seconds per eighth note

function scheduleStep(c, s) {
  const chord = PROG[Math.floor(s / 8) % PROG.length];
  const inChord = s % 8;
  const t = nextTime;
  // soft pulse on each quarter
  if (inChord % 2 === 0) {
    const o = c.createOscillator(); const g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2);
  }
  // bass on beat 1 and 3
  if (inChord === 0 || inChord === 4) {
    tone(NOTE(chord[0]), t - c.currentTime, 0.9, 'triangle', 0.10, master);
  }
  // arpeggio eighth notes
  const arp = chord[1];
  const note = arp[inChord % arp.length] + (inChord >= 4 ? 12 : 0);
  tone(NOTE(note), t - c.currentTime, 0.28, 'triangle', 0.05, master);
  // pad sustained on chord change
  if (inChord === 0) {
    arp.forEach((m) => tone(NOTE(m - 12), t - c.currentTime, EIGHTH * 8, 'sine', 0.025, master));
  }
  nextTime += EIGHTH;
}

export const Sound = {
  setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 1;
    if (m) { /* keep scheduler but silent */ }
  },
  isMuted() { return muted; },
  tick() { tone(660, 0, 0.08, 'square', 0.12); },
  go() { tone(523, 0, 0.1, 'triangle'); tone(784, 0.08, 0.14, 'triangle'); },
  correct() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle', 0.2)); },
  wrong() { tone(300, 0, 0.22, 'sawtooth', 0.16); tone(220, 0.12, 0.3, 'sawtooth', 0.16); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.12, 0.4, 'triangle', 0.2)); },
  startMusic() {
    const c = ac(); if (!c || schedTimer) return;
    master = c.createGain(); master.gain.value = muted ? 0 : 1; master.connect(c.destination);
    nextTime = c.currentTime + 0.1; step = 0;
    const tickFn = () => {
      while (nextTime < c.currentTime + 0.2) { scheduleStep(c, step); step = (step + 1) % (PROG.length * 8); }
    };
    tickFn();
    schedTimer = setInterval(tickFn, 25);
  },
  stopMusic() {
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
    if (master) { try { master.disconnect(); } catch (e) {} master = null; }
  },
};
