// AudioManager — pure Web Audio API synthesis, no external files
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.currentMusic = null;
    this.musicGainNode = null;
    this._initialized = false;
  }

  _createContext() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.ctx = new window.AudioContext();
    } else if (typeof window !== 'undefined' && window.webkitAudioContext) {
      this.ctx = new window.webkitAudioContext();
    }
    // Node.js polyfill
    if (!this.ctx && typeof process !== 'undefined') {
      this.ctx = null; // skip in node, init() will retry
    }
    this.musicGain = this.ctx ? this.ctx.createGain() : null;
    this.sfxGain = this.ctx ? this.ctx.createGain() : null;
    if (this.musicGain) {
      this.musicGain.gain.value = 0.4;
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.ctx.destination);
    }
  }

  init() {
    if (this._initialized) return;
    this._createContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this._initialized = true;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (this.ctx) {
          if (document.hidden) {
            this.ctx.suspend();
          } else {
            this.ctx.resume();
          }
        }
      });
    }
  }

  _playTone(freq, duration, type = 'sine', volume = 0.5, gainNode = null, detune = 0) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(gainNode || this.sfxGain || this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _playNoise(duration, volume = 0.3) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(this.sfxGain || this.ctx.destination);
    source.start();
    source.stop(this.ctx.currentTime + duration);
  }

  _playSweep(startFreq, endFreq, duration, type = 'sine', volume = 0.5, gainNode = null) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(gainNode || this.sfxGain || this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  play(name) {
    if (!this.ctx || !this._initialized) this.init();
    if (!this.ctx) return;

    switch (name) {
      case 'munch':
        this._playNoise(0.05, 0.25);
        break;
      case 'powerup':
        this._playSweep(200, 800, 0.3, 'sine', 0.6);
        break;
      case 'ghostEat': {
        // Frequency set by caller via playGhostEat
        break;
      }
      case 'death':
        this._playSweep(600, 100, 0.8, 'sawtooth', 0.4);
        break;
      case 'levelComplete':
        this._playTone(523, 0.08, 'square', 0.3);
        setTimeout(() => this._playTone(659, 0.08, 'square', 0.3), 90);
        setTimeout(() => this._playTone(784, 0.08, 'square', 0.3), 180);
        setTimeout(() => this._playTone(1047, 0.15, 'square', 0.3), 270);
        break;
      case 'menuSelect':
        this._playTone(800, 0.03, 'sine', 0.4);
        break;
      case 'gameStart':
        this._playSweep(300, 600, 0.2, 'sine', 0.5);
        break;
    }
  }

  playGhostEat(ghostIndex) {
    if (!this.ctx) return;
    const freqs = [400, 500, 600, 800];
    this._playTone(freqs[Math.min(ghostIndex, 3)] || 400, 0.15, 'square', 0.5);
  }

  playMusic(name) {
    if (!this.ctx) return;
    this.stopMusic();
    if (name === 'menu') {
      this._playMenuMusic();
    } else if (name === 'gameplay') {
      this._playGameplayMusic();
    }
  }

  _playMenuMusic() {
    if (!this.ctx || !this.musicGain) return;
    const notes = [392, 440, 494, 523, 494, 440, 392, 349];
    const tempo = 0.35;
    let offset = 0;
    const playNote = (i) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i % notes.length];
      g.gain.setValueAtTime(0.3, this.ctx.currentTime + offset);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + offset + tempo * 0.9);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(this.ctx.currentTime + offset);
      osc.stop(this.ctx.currentTime + offset + tempo);
      offset += tempo;
      if (offset < notes.length * tempo * 2) {
        setTimeout(() => playNote(Math.floor(offset / tempo)), tempo * 1000);
      } else {
        setTimeout(() => this._playMenuMusic(), 200);
      }
    };
    playNote(0);
  }

  _playGameplayMusic() {
    if (!this.ctx || !this.musicGain) return;
    const notes = [262, 330, 392, 523, 392, 330, 262, 294];
    const tempo = 0.22;
    let offset = 0;
    const playNote = (i) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i % notes.length];
      g.gain.setValueAtTime(0.25, this.ctx.currentTime + offset);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + offset + tempo * 0.85);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(this.ctx.currentTime + offset);
      osc.stop(this.ctx.currentTime + offset + tempo);
      offset += tempo;
      if (offset < notes.length * tempo * 2) {
        setTimeout(() => playNote(Math.floor(offset / tempo)), tempo * 1000);
      } else {
        setTimeout(() => this._playGameplayMusic(), 150);
      }
    };
    playNote(0);
  }

  stopMusic() {
    if (!this.ctx) return;
    // Music loops are handled by setTimeout recursion — stop by nulling gain
    if (this.musicGain) {
      this.musicGain.disconnect();
      this.musicGain = null;
    }
  }

  setMusicVolume(v) {
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, v)) * 0.4;
    }
  }

  setSFXVolume(v) {
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.value = Math.max(0, Math.min(1, v)) * 0.8;
    }
  }
}
