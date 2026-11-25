// audio.js — every sound is synthesized live with WebAudio. No audio files,
// no network, no samples: a chop is a filtered noise burst, a serve is a chime,
// the sizzle is looped noise while food cooks, and the music is a quiet
// two-bar loop of triangle-wave notes. Created lazily on the first gesture.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicOn = true;
    this.musicTimer = null;
    this.sizzleNodes = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, vol = 0.25, filterFreq = 1800, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  pickup() { this.tone(520, 0.09, 'triangle', 0.18, 0, 760); }
  place() { this.tone(330, 0.08, 'triangle', 0.15, 0, 240); }
  chop() { this.noise(0.09, 0.4, 900); this.tone(140, 0.07, 'square', 0.1); }
  chopDone() { this.tone(660, 0.1, 'triangle', 0.2); this.tone(880, 0.14, 'triangle', 0.18, 0.08); }
  cookDone() { this.tone(740, 0.12, 'sine', 0.2); this.tone(988, 0.16, 'sine', 0.18, 0.1); }
  burnt() { this.tone(220, 0.25, 'sawtooth', 0.14, 0, 110); }
  serve() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, i * 0.07));
  }
  wrong() { this.tone(180, 0.22, 'sawtooth', 0.16, 0, 120); }
  tick() { this.tone(980, 0.05, 'square', 0.08); }
  orderIn() { this.tone(440, 0.1, 'triangle', 0.16); this.tone(587, 0.12, 'triangle', 0.16, 0.09); }
  lost() { this.tone(392, 0.3, 'triangle', 0.18, 0, 262); this.tone(262, 0.4, 'triangle', 0.16, 0.22); }
  click() { this.tone(700, 0.05, 'square', 0.1); }
  fanfare() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.2, i * 0.11));
  }

  startSizzle() {
    if (!this.ctx || this.muted || this.sizzleNodes) return;
    const len = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3200;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.045;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    this.sizzleNodes = { src, gain };
  }

  stopSizzle() {
    if (!this.sizzleNodes) return;
    try { this.sizzleNodes.src.stop(); } catch { /* already stopped */ }
    this.sizzleNodes = null;
  }

  // A quiet two-bar music loop: bass note + plucked melody, scheduled ahead.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const melody = [523, 659, 784, 659, 587, 659, 784, 880, 784, 659, 587, 523];
    const bass = [131, 131, 175, 196];
    let step = 0;
    const beat = 0.24;
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const m = melody[step % melody.length];
      const b = bass[Math.floor(step / 3) % bass.length];
      this.tone(m, beat * 0.9, 'triangle', 0.055);
      if (step % 3 === 0) this.tone(b, beat * 2.4, 'sine', 0.09);
      step++;
    }, beat * 1000);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
