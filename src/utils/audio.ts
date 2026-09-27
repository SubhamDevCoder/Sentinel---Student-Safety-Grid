class SoundManager {
  private ctx: AudioContext | null = null;
  private currentSirenNodes: {
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    gain: GainNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
  } | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Starts ascending warning siren over the specified duration (e.g. 3.0s).
   * Sounds authentic industrial siren using dual detuned oscillators and rising pitch.
   */
  public startAscendingSiren(durationSeconds: number = 3.0): () => void {
    try {
      this.stopAscendingSiren();

      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Master gain for the siren
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.35, now + 0.15);

      // Primary oscillator (Sawtooth for industrial edge)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(1280, now + durationSeconds);

      // Secondary oscillator (Detuned triangle for punch and presence)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(326, now);
      osc2.frequency.exponentialRampToValueAtTime(1292, now + durationSeconds);

      // LFO for periodic pitch wobble / authentic wail
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(6.5, now); // 6.5 Hz warble
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(25, now);
      lfoGain.gain.linearRampToValueAtTime(60, now + durationSeconds);

      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      // Filter to take off harsh digital highs and feel mechanical
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      this.currentSirenNodes = { osc1, osc2, gain: masterGain, lfo, lfoGain };

      // Haptic warning pulses
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([100, 50, 150, 50, 200, 50, 300]);
        } catch {
          // ignore if denied
        }
      }

      return () => this.stopAscendingSiren();
    } catch (e) {
      console.warn('Audio synthesis failed to initialize:', e);
      return () => {};
    }
  }

  /**
   * Smoothly ceases the siren with no click or pop
   */
  public stopAscendingSiren(): void {
    if (!this.currentSirenNodes || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const { osc1, osc2, lfo, gain } = this.currentSirenNodes;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          lfo.stop();
          osc1.disconnect();
          osc2.disconnect();
          lfo.disconnect();
          gain.disconnect();
        } catch {
          // Already stopped
        }
      }, 100);

      this.currentSirenNodes = null;

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(0);
        } catch {
          // ignore
        }
      }
    } catch {
      this.currentSirenNodes = null;
    }
  }

  /**
   * High-contrast authoritative success confirmation chime
   * Frequencies: C5 (523Hz), E5 (659Hz), G5 (784Hz), High C6 (1046Hz)
   */
  public playSuccessChime(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.3 },
        { freq: 659.25, time: 0.09, dur: 0.3 },
        { freq: 783.99, time: 0.18, dur: 0.35 },
        { freq: 1046.5, time: 0.28, dur: 0.7 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.0001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.28, now + time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 120]);
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn('Success chime failed:', e);
    }
  }

  /**
   * Tactile micro-click sound for buttons & switches
   */
  public playClickTick(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.025);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // ignore
    }
  }

  /**
   * Attention chime when Admin updates status to "Help is on the way"
   */
  public playHelpOnTheWayAlert(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      [0, 0.15, 0.3].forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880 + i * 110, now + t);
        gain.gain.setValueAtTime(0.0001, now + t);
        gain.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.13);
      });
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Cancellation tone
   */
  public playCancelTone(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // ignore
    }
  }

  private broadcastAlarmInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Continuous urgent emergency siren when an incoming SOS broadcast is detected
   * Sounds on all devices that have this app open
   */
  public startEmergencyBroadcastSiren(): void {
    if (this.broadcastAlarmInterval) return;
    this.playBroadcastAlarmBurst();
    this.broadcastAlarmInterval = setInterval(() => {
      this.playBroadcastAlarmBurst();
    }, 1500);
  }

  public stopEmergencyBroadcastSiren(): void {
    if (this.broadcastAlarmInterval) {
      clearInterval(this.broadcastAlarmInterval);
      this.broadcastAlarmInterval = null;
    }
  }

  public playBroadcastAlarmBurst(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Two-tone piercing klaxon alert (940Hz and 740Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      // 1st beep
      osc.frequency.setValueAtTime(940, now);
      osc.frequency.setValueAtTime(740, now + 0.22);
      // 2nd beep
      osc.frequency.setValueAtTime(940, now + 0.44);
      osc.frequency.setValueAtTime(740, now + 0.66);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain.gain.setValueAtTime(0.3, now + 0.82);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.95);

      // Lowpass filter to ensure tone isn't uncomfortably screechy
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.0);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 500]);
      }
    } catch (e) {
      console.warn('Emergency broadcast audio synthesis error:', e);
    }
  }

  public playEmergencyNotificationSound(): void {
    this.playBroadcastAlarmBurst();
  }
}

export const soundManager = new SoundManager();
