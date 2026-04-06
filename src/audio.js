// ─── Audio Manager — Pure Web Audio API synthesis ─────────────────────────────
// No external audio files. All sounds are synthesized on the fly.

const _AUDIO_POLYFILL = `
  if (typeof AudioContext === 'undefined' && typeof webkitAudioContext !== 'undefined') {
    window.AudioContext = webkitAudioContext;
  }
`;

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.currentMusic = null;
    this.musicOscillators = [];
    this._musicPlaying = false;
    this._visible = true;
  }

  // Unlock AudioContext on first user interaction
  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain.gain.value = 0.4;
    this.sfxGain.gain.value = 0.7;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.ctx.suspend();
        this._visible = false;
      } else {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this._visible = true;
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  _tone(freq, type, startTime, duration, gainNode, volume = 0.5) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(volume, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g);
    g.connect(gainNode || this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
    return osc;
  }

  _sweep(freqStart, freqEnd, type, startTime, duration, gainNode, volume = 0.5) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
    g.gain.setValueAtTime(volume, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g);
    g.connect(gainNode || this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
    return osc;
  }

  _noise(startTime, duration, gainNode, volume = 0.3) {
    const bufSize = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;
    g.gain.setValueAtTime(volume, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(gainNode || this.sfxGain);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  // ── Sound Effects ───────────────────────────────────────────────────────────

  play(name) {
    this._resume();
    const t = this.ctx.currentTime;

    switch (name) {
      case 'munch': {
        // White noise burst, 50ms
        this._noise(t, 0.05, this.sfxGain, 0.25);
        break;
      }

      case 'powerup': {
        // Sine sweep 200→800Hz over 300ms
        this._sweep(200, 800, 'sine', t, 0.3, this.sfxGain, 0.5);
        break;
      }

      case 'ghostEat': {
        // Frequency based on ghostEatCount (passed via game instance)
        // Default 400Hz; caller can override by calling playGhostEat(freq)
        const freq = this._ghostEatFreq || 400;
        this._tone(freq, 'square', t, 0.15, this.sfxGain, 0.4);
        break;
      }

      case 'death': {
        // Sine sweep 600→100Hz over 800ms with detune wobble
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.8);
        // Slight detune wobble via LFO
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 8;
        lfoGain.gain.value = 15;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.detune);
        g.gain.setValueAtTime(0.6, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(g);
        g.connect(this.sfxGain);
        lfo.start(t);
        lfo.stop(t + 0.85);
        osc.start(t);
        osc.stop(t + 0.85);
        break;
      }

      case 'levelComplete': {
        // Ascending arpeggio C5-E5-G5-C6, 80ms per note
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          const nt = t + i * 0.08;
          this._tone(freq, 'square', nt, 0.07, this.sfxGain, 0.35);
        });
        break;
      }

      case 'menuSelect': {
        this._tone(800, 'sine', t, 0.03, this.sfxGain, 0.4);
        break;
      }

      case 'gameStart': {
        this._sweep(300, 600, 'sawtooth', t, 0.2, this.sfxGain, 0.5);
        break;
      }
    }
  }

  // Variant for ghostEat with escalating pitch
  playGhostEat(ghostEatCount) {
    const freqs = [400, 500, 600, 800];
    this._ghostEatFreq = freqs[Math.min(ghostEatCount || 0, 3)];
    this.play('ghostEat');
  }

  // ── Background Music ────────────────────────────────────────────────────────

  _note(freq, type, startBeat, beats, bpm, gainNode, vol = 0.3) {
    const beatDur = 60 / bpm;
    const t = this.ctx.currentTime + startBeat * beatDur;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const dur = beats * beatDur * 0.85;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur - 0.03);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g);
    g.connect(gainNode || this.musicGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
    this.musicOscillators.push(osc);
  }

  _playMelody(notes, bpm, loop = true) {
    this._stopMusicInternal();
    const beatDur = 60 / bpm;
    const totalBeats = notes.length;
    let offset = 0;

    const schedule = () => {
      if (!this._musicPlaying) return;
      notes.forEach(([freq, type, beats, vol]) => {
        this._note(freq, type || 'square', offset, beats, bpm, null, vol || 0.3);
        offset += beats;
      });
      const totalDur = totalBeats * beatDur * 1000;
      this._musicTimeout = setTimeout(() => {
        if (this._musicPlaying) {
          offset = 0;
          schedule();
        }
      }, totalDur);
    };

    this._musicPlaying = true;
    schedule();
  }

  playMusic(name) {
    this._resume();
    switch (name) {
      case 'menu': {
        // Calm 4-bar melody, 100 BPM
        const bars = [
          // Bar 1
          [392, 'triangle', 1, 0.25], [440, 'triangle', 1, 0.25],
          [494, 'triangle', 1, 0.25], [523, 'triangle', 1, 0.25],
          // Bar 2
          [494, 'triangle', 2, 0.25],
          [440, 'triangle', 2, 0.25],
          // Bar 3
          [392, 'triangle', 1, 0.25], [523, 'triangle', 1, 0.25],
          [440, 'triangle', 1, 0.25], [494, 'triangle', 1, 0.25],
          // Bar 4
          [392, 'triangle', 4, 0.25],
        ];
        this._playMelody(bars, 100, true);
        break;
      }
      case 'gameplay': {
        // Faster 4-bar melody, 130 BPM — more energetic
        const bars = [
          // Bar 1
          [262, 'square', 0.5, 0.2], [330, 'square', 0.5, 0.2],
          [392, 'square', 0.5, 0.2], [523, 'square', 0.5, 0.2],
          // Bar 2
          [494, 'square', 1, 0.25], [440, 'square', 1, 0.25],
          // Bar 3
          [392, 'square', 0.5, 0.2], [330, 'square', 0.5, 0.2],
          [262, 'square', 0.5, 0.2], [294, 'square', 0.5, 0.2],
          // Bar 4
          [330, 'square', 2, 0.25],
        ];
        this._playMelody(bars, 130, true);
        break;
      }
    }
  }

  _stopMusicInternal() {
    this._musicPlaying = false;
    if (this._musicTimeout) {
      clearTimeout(this._musicTimeout);
      this._musicTimeout = null;
    }
    this.musicOscillators.forEach(o => {
      try { o.stop(); } catch (_) {}
    });
    this.musicOscillators = [];
  }

  stopMusic() {
    this._stopMusicInternal();
  }

  setMusicVolume(v) {
    if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, v)) * 0.4;
  }

  setSFXVolume(v) {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v)) * 0.7;
  }
}
