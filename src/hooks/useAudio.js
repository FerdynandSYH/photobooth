import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook to play camera shutter, countdown beeps, and photobooth printer sounds
 * using high-fidelity Web Audio API synthesis.
 * Built-in browser autoplay unlock mechanism for 100% reliable playback.
 */
export function useAudio() {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef(null);

  // Safely get or create AudioContext and resume if suspended
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  // Explicit user gesture unlocker
  const unlockAudio = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        // Play an instantaneous silent buffer to truly unlock iOS Safari / mobile audio subsystem
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }
    } catch (e) {
      // Ignore
    }
  }, [getAudioContext]);

  // Global listener to immediately unlock AudioContext upon any user touch or click
  useEffect(() => {
    const handleUserGesture = () => {
      unlockAudio();
    };

    window.addEventListener('click', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('touchstart', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('pointerdown', handleUserGesture, { capture: true, passive: true });
    window.addEventListener('keydown', handleUserGesture, { capture: true, passive: true });

    return () => {
      window.removeEventListener('click', handleUserGesture, { capture: true });
      window.removeEventListener('touchstart', handleUserGesture, { capture: true });
      window.removeEventListener('pointerdown', handleUserGesture, { capture: true });
      window.removeEventListener('keydown', handleUserGesture, { capture: true });
    };
  }, [unlockAudio]);

  // Countdown timer beep (normal beep vs CHEESE final cue)
  const playBeep = useCallback((isFinal = false) => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const trigger = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Frekuensi yang nyaring & jelas terdengar di speaker HP / laptop:
        // Normal beep: 880 Hz (A5), Final CHEESE cue: 1200 Hz
        osc.type = isFinal ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isFinal ? 1200 : 880, now);

        gain.gain.setValueAtTime(isFinal ? 0.45 : 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.30 : 0.15));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + (isFinal ? 0.30 : 0.15));
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(trigger).catch(() => {});
      } else {
        trigger();
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, [isMuted, getAudioContext]);

  // Authentic mechanical photobooth SLR shutter sound
  const playShutter = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const trigger = () => {
        const now = ctx.currentTime;

        // 1. Shutter curtain mechanical snap (White noise burst)
        const bufferSize = Math.floor(ctx.sampleRate * 0.09);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.48, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        whiteNoise.start(now);

        // 2. Mirror slap punch (Low frequency thud)
        const mirrorOsc = ctx.createOscillator();
        const mirrorGain = ctx.createGain();
        mirrorOsc.type = 'triangle';
        mirrorOsc.frequency.setValueAtTime(140, now);
        mirrorOsc.frequency.exponentialRampToValueAtTime(35, now + 0.10);

        mirrorGain.gain.setValueAtTime(0.55, now);
        mirrorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.10);

        mirrorOsc.connect(mirrorGain);
        mirrorGain.connect(ctx.destination);
        mirrorOsc.start(now);
        mirrorOsc.stop(now + 0.10);

        // 3. Second shutter curtain close click (60ms delay)
        const secondClick = ctx.createOscillator();
        const secondGain = ctx.createGain();
        secondClick.type = 'sine';
        secondClick.frequency.setValueAtTime(600, now + 0.06);
        secondClick.frequency.exponentialRampToValueAtTime(150, now + 0.13);

        secondGain.gain.setValueAtTime(0, now);
        secondGain.gain.setValueAtTime(0.35, now + 0.06);
        secondGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        secondClick.connect(secondGain);
        secondGain.connect(ctx.destination);
        secondClick.start(now + 0.06);
        secondClick.stop(now + 0.13);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(trigger).catch(() => {});
      } else {
        trigger();
      }
    } catch (e) {
      console.warn('Shutter sound failed:', e);
    }
  }, [isMuted, getAudioContext]);

  // Photobooth mechanical printer roller & paper sliding sound while photo emerges
  const playPrintingSound = useCallback((duration = 3.0) => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      // 1. Mechanical motor rumble / gear hum
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.linearRampToValueAtTime(105, now + duration * 0.5);
      osc.frequency.linearRampToValueAtTime(80, now + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);

      oscGain.gain.setValueAtTime(0.12, now);
      oscGain.gain.setValueAtTime(0.18, now + 0.15);
      oscGain.gain.setValueAtTime(0.15, now + duration - 0.25);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);

      // 2. Paper sliding friction noise
      const bufferSize = Math.floor(ctx.sampleRate * 0.6);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(800, now);
      noiseFilter.Q.setValueAtTime(2.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, now);
      noiseGain.gain.linearRampToValueAtTime(0.09, now + 0.2);
      noiseGain.gain.setValueAtTime(0.07, now + duration - 0.25);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch (e) {
      console.warn('Printing sound error:', e);
    }
  }, [isMuted, getAudioContext]);

  // Photobooth paper release cutter snap & pleasant completion chime when photo fully emerges
  const playPrintComplete = useCallback(() => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      // 1. Mechanical paper cutter snap
      const bufferSize = Math.floor(ctx.sampleRate * 0.06);
      const clickBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const clickData = clickBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        clickData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const clickSource = ctx.createBufferSource();
      clickSource.buffer = clickBuffer;

      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = 'highpass';
      clickFilter.frequency.setValueAtTime(1400, now);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.4, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      clickSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickSource.start(now);

      // 2. Harmonic completion chime (F#5 -> B5)
      const playChimeNote = (freq, time, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + dur);
      };

      playChimeNote(739.99, now + 0.05, 0.50); // F#5
      playChimeNote(987.77, now + 0.18, 0.70); // B5
    } catch (e) {
      console.warn('Print complete sound failed:', e);
    }
  }, [isMuted, getAudioContext]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    isMuted,
    toggleMute,
    unlockAudio,
    playBeep,
    playShutter,
    playPrintingSound,
    playPrintComplete,
  };
}
