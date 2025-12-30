type SoundType = 
  | 'bead-drop' 
  | 'bead-click' 
  | 'bead-merge' 
  | 'rewrite-slide' 
  | 'rewrite-straighten' 
  | 'rewrite-thread' 
  | 'rewrite-snake'
  | 'qed'
  | 'node-place'
  | 'node-delete'
  | 'undo'
  | 'error';

interface OscillatorConfig {
  type: OscillatorType;
  frequency: number;
  duration: number;
  gain: number;
  attack?: number;
  decay?: number;
  detune?: number;
}

interface NoiseConfig {
  duration: number;
  gain: number;
  filterFreq?: number;
}

type SoundConfig = {
  oscillators?: OscillatorConfig[];
  noise?: NoiseConfig;
  delay?: number;
};

const SOUND_CONFIGS: Record<SoundType, SoundConfig[]> = {
  'bead-drop': [
    { oscillators: [{ type: 'sine', frequency: 880, duration: 0.1, gain: 0.3, attack: 0.01 }] },
    { oscillators: [{ type: 'sine', frequency: 660, duration: 0.1, gain: 0.2 }], delay: 0.05 },
  ],
  'bead-click': [
    { oscillators: [{ type: 'square', frequency: 1200, duration: 0.03, gain: 0.15 }] },
  ],
  'bead-merge': [
    { oscillators: [
      { type: 'sine', frequency: 440, duration: 0.15, gain: 0.25 },
      { type: 'sine', frequency: 550, duration: 0.15, gain: 0.2 },
    ]},
  ],
  'rewrite-slide': [
    { oscillators: [{ type: 'sine', frequency: 330, duration: 0.15, gain: 0.2, detune: -50 }] },
    { oscillators: [{ type: 'sine', frequency: 440, duration: 0.15, gain: 0.2 }], delay: 0.08 },
  ],
  'rewrite-straighten': [
    { oscillators: [{ type: 'sine', frequency: 523, duration: 0.1, gain: 0.25 }] },
    { oscillators: [{ type: 'sine', frequency: 659, duration: 0.1, gain: 0.2 }], delay: 0.05 },
    { oscillators: [{ type: 'sine', frequency: 784, duration: 0.15, gain: 0.15 }], delay: 0.1 },
  ],
  'rewrite-thread': [
    { oscillators: [{ type: 'triangle', frequency: 392, duration: 0.2, gain: 0.2 }] },
    { oscillators: [{ type: 'triangle', frequency: 523, duration: 0.15, gain: 0.15 }], delay: 0.1 },
  ],
  'rewrite-snake': [
    { oscillators: [{ type: 'sine', frequency: 392, duration: 0.08, gain: 0.2 }] },
    { oscillators: [{ type: 'sine', frequency: 494, duration: 0.08, gain: 0.2 }], delay: 0.06 },
    { oscillators: [{ type: 'sine', frequency: 587, duration: 0.08, gain: 0.2 }], delay: 0.12 },
    { oscillators: [{ type: 'sine', frequency: 784, duration: 0.2, gain: 0.25 }], delay: 0.18 },
  ],
  'qed': [
    { oscillators: [{ type: 'sine', frequency: 523, duration: 0.15, gain: 0.3 }] },
    { oscillators: [{ type: 'sine', frequency: 659, duration: 0.15, gain: 0.25 }], delay: 0.12 },
    { oscillators: [{ type: 'sine', frequency: 784, duration: 0.15, gain: 0.25 }], delay: 0.24 },
    { oscillators: [{ type: 'sine', frequency: 1047, duration: 0.4, gain: 0.3 }], delay: 0.36 },
  ],
  'node-place': [
    { oscillators: [{ type: 'sine', frequency: 600, duration: 0.08, gain: 0.2 }] },
  ],
  'node-delete': [
    { oscillators: [{ type: 'sawtooth', frequency: 200, duration: 0.15, gain: 0.15 }] },
  ],
  'undo': [
    { oscillators: [{ type: 'sine', frequency: 440, duration: 0.08, gain: 0.15 }] },
    { oscillators: [{ type: 'sine', frequency: 330, duration: 0.1, gain: 0.1 }], delay: 0.05 },
  ],
  'error': [
    { oscillators: [{ type: 'sawtooth', frequency: 150, duration: 0.2, gain: 0.2 }] },
    { oscillators: [{ type: 'sawtooth', frequency: 120, duration: 0.25, gain: 0.15 }], delay: 0.1 },
  ],
};

class SoundEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private volume = 0.5;

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.context;
  }

  private getMasterGain(): GainNode {
    this.getContext();
    return this.masterGain!;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }

  play(soundType: SoundType): void {
    if (!this.enabled) return;

    const configs = SOUND_CONFIGS[soundType];
    if (!configs) return;

    const ctx = this.getContext();
    const master = this.getMasterGain();

    for (const config of configs) {
      const startTime = ctx.currentTime + (config.delay ?? 0);

      if (config.oscillators) {
        for (const oscConfig of config.oscillators) {
          this.playOscillator(ctx, master, oscConfig, startTime);
        }
      }

      if (config.noise) {
        this.playNoise(ctx, master, config.noise, startTime);
      }
    }
  }

  private playOscillator(
    ctx: AudioContext,
    destination: AudioNode,
    config: OscillatorConfig,
    startTime: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = config.type;
    osc.frequency.value = config.frequency;
    if (config.detune) {
      osc.detune.value = config.detune;
    }

    const attack = config.attack ?? 0.01;
    const decay = config.decay ?? config.duration * 0.3;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(config.gain, startTime + attack);
    gain.gain.linearRampToValueAtTime(config.gain * 0.7, startTime + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + config.duration + 0.1);
  }

  private playNoise(
    ctx: AudioContext,
    destination: AudioNode,
    config: NoiseConfig,
    startTime: number
  ): void {
    const bufferSize = ctx.sampleRate * config.duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(config.gain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration);

    if (config.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = config.filterFreq;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }

    gain.connect(destination);
    source.start(startTime);
  }

  playBeadDrop(): void {
    this.play('bead-drop');
  }

  playBeadClick(): void {
    this.play('bead-click');
  }

  playRewrite(rule: string): void {
    switch (rule) {
      case 'slide':
        this.play('rewrite-slide');
        break;
      case 'straighten':
        this.play('rewrite-straighten');
        break;
      case 'thread':
        this.play('rewrite-thread');
        break;
      case 'snake':
        this.play('rewrite-snake');
        break;
      default:
        this.play('rewrite-slide');
    }
  }

  playQED(): void {
    this.play('qed');
  }

  playNodePlace(): void {
    this.play('node-place');
  }

  playNodeDelete(): void {
    this.play('node-delete');
  }

  playUndo(): void {
    this.play('undo');
  }

  playError(): void {
    this.play('error');
  }
}

export const soundEngine = new SoundEngine();

export function initSoundOnInteraction(): void {
  const handler = () => {
    soundEngine.play('bead-click');
    document.removeEventListener('click', handler);
    document.removeEventListener('touchstart', handler);
  };
  document.addEventListener('click', handler, { once: true });
  document.addEventListener('touchstart', handler, { once: true });
}

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
  if (!('vibrate' in navigator)) return;
  
  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 40,
    success: [10, 50, 20],
    error: [50, 30, 50],
  };
  
  try {
    navigator.vibrate(patterns[style]);
  } catch {
    // Vibration API not available or permission denied
  }
}
