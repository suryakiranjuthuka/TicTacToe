/**
 * Web Audio API Sound Synthesizer for Tic-Tac-Toe
 * 100% standalone, zero external audio assets required.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = this.loadMutePreference();
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  loadMutePreference() {
    try {
      const saved = localStorage.getItem('tictactoe_muted');
      return saved === 'true';
    } catch {
      return false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem('tictactoe_muted', this.muted);
    } catch (e) {
      console.warn('Could not save mute preference', e);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  playMove(player) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (player === 'X') {
      // Crisp, bright sine chirp
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      // Warm mellow triangle chirp
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.1); // E4
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  }

  playWin() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    // Triumphant ascending major arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const duration = idx === notes.length - 1 ? 0.4 : 0.18;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  playDraw() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    // Gentle descending neutral chord: G4 -> E4 -> C4
    const notes = [392.00, 329.63, 261.63];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  playClick() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

// Global instance for browser
window.soundFX = new SoundEffects();
