// Generated sound effects (Web Audio) + global mute
let ctx, muted = localStorage.getItem('gz-muted') === '1';

function audio() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noise(dur, { type = 'bandpass', freq = 1200, q = 1, gain = .3, at = 0 } = {}) {
  const c = audio(), n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + at;
  src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  src.connect(f).connect(g).connect(c.destination); src.start(t);
}

function tone(from, to, dur, { type = 'sine', gain = .25, at = 0 } = {}) {
  const c = audio(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur);
}

const SOUNDS = {
  clack() { noise(.05, { type: 'highpass', freq: 2500, gain: .35 }); tone(900, 300, .06, { type: 'square', gain: .08 }); noise(.06, { type: 'highpass', freq: 1800, gain: .25, at: .09 }); },
  rustle() { for (let i = 0; i < 4; i++) noise(.16, { freq: 3000 + i * 600, q: .7, gain: .12, at: i * .09 }); },
  thud() { tone(140, 38, .28, { gain: .6 }); noise(.09, { type: 'lowpass', freq: 500, gain: .5 }); },
  siren() { for (let i = 0; i < 3; i++) { tone(620, 960, .22, { type: 'sawtooth', gain: .07, at: i * .44 }); tone(960, 620, .22, { type: 'sawtooth', gain: .07, at: i * .44 + .22 }); } },
  pop() { tone(320, 880, .09, { type: 'triangle', gain: .2 }); },
  boing() { tone(180, 520, .18, { type: 'triangle', gain: .18 }); },
};

export function play(name) {
  if (muted) return;
  try { SOUNDS[name]?.(); } catch { /* audio not available: stay silent */ }
}

export function initSound() {
  const btn = document.querySelector('#mute');
  const paint = () => { btn.textContent = muted ? '🔇' : '🔊'; btn.setAttribute('aria-pressed', muted); };
  paint();
  btn.addEventListener('click', () => {
    muted = !muted;
    localStorage.setItem('gz-muted', muted ? '1' : '0');
    paint();
    play('pop');
  });
  document.addEventListener('gazette:stamp', () => play('thud'));
}
