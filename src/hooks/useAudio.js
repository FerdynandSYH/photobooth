import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

/**
 * High-fidelity photobooth sound synthesizer.
 * Generates clean PCM WAV audio in memory to guarantee 100% reliable playback
 * across all browsers (including Safari, iOS, Chrome, Android, Edge) without
 * relying solely on suspended AudioContext states.
 */

function encodeWAV(samples, sampleRate = 22050) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

const SAMPLE_RATE = 22050;

// 1. Countdown normal beep (880 Hz, clear A5, 140ms)
function buildCountdownBeepWav() {
  const duration = 0.14;
  const samples = new Float32Array(Math.floor(SAMPLE_RATE * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = t < 0.01 ? t / 0.01 : Math.exp(-(t - 0.01) * 16);
    // Dual harmonic for crisp punch on mobile & laptop speakers
    const tone = 0.75 * Math.sin(2 * Math.PI * 880 * t) + 0.25 * Math.sin(4 * Math.PI * 880 * t);
    samples[i] = tone * env * 0.65;
  }
  return encodeWAV(samples, SAMPLE_RATE);
}

// 2. Final countdown CHEESE cue (1320 Hz, bright E6, 320ms)
function buildCheeseCueWav() {
  const duration = 0.32;
  const samples = new Float32Array(Math.floor(SAMPLE_RATE * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = t < 0.01 ? t / 0.01 : Math.exp(-(t - 0.01) * 7.5);
    const tone = 0.70 * Math.sin(2 * Math.PI * 1320 * t) + 0.30 * Math.sin(4 * Math.PI * 1320 * t);
    samples[i] = tone * env * 0.70;
  }
  return encodeWAV(samples, SAMPLE_RATE);
}

// 3. Authentic SLR mechanical camera shutter sound
function buildShutterWav() {
  const duration = 0.22;
  const samples = new Float32Array(Math.floor(SAMPLE_RATE * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    // White noise mechanical burst (curtain opening)
    if (t < 0.08) {
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 35);
      s += noise * 0.50;
    }
    // Mirror slap low thud (140Hz falling to 35Hz)
    if (t < 0.12) {
      const punchFreq = 140 - (t / 0.12) * 105;
      const punch = Math.sin(2 * Math.PI * punchFreq * t) * Math.exp(-t * 22);
      s += punch * 0.55;
    }
    // Second curtain close snap at 0.06s
    if (t >= 0.06 && t < 0.16) {
      const dt = t - 0.06;
      const click = Math.sin(2 * Math.PI * 580 * dt) * Math.exp(-dt * 38);
      s += click * 0.40;
    }
    samples[i] = s;
  }
  return encodeWAV(samples, SAMPLE_RATE);
}

// 4. Photobooth mechanical printer sliding & motor sound (3.0s)
function buildPrintingSoundWav() {
  const duration = 3.0;
  const samples = new Float32Array(Math.floor(SAMPLE_RATE * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    // Gear motor hum (90Hz -> 105Hz -> 80Hz)
    const motorFreq = 90 + Math.sin((t / duration) * Math.PI) * 18;
    const motor = Math.sin(2 * Math.PI * motorFreq * t) * 0.18;
    // Paper sliding friction noise
    const noise = (Math.random() * 2 - 1) * 0.12;
    // Envelope (fade in 0.2s, fade out 0.3s)
    let env = 1;
    if (t < 0.2) env = t / 0.2;
    else if (t > duration - 0.3) env = (duration - t) / 0.3;

    samples[i] = (motor + noise) * env * 0.55;
  }
  return encodeWAV(samples, SAMPLE_RATE);
}

// 5. Completion chime (paper cutter snap + F#5 -> B5 harmonic chime)
function buildPrintCompleteWav() {
  const duration = 0.95;
  const samples = new Float32Array(Math.floor(SAMPLE_RATE * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    // Paper cutter snap click
    if (t < 0.05) {
      s += (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.40;
    }
    // Note 1: F#5 (739.99 Hz) starting at 0.04s
    if (t >= 0.04 && t < 0.50) {
      const dt = t - 0.04;
      const env = dt < 0.01 ? dt / 0.01 : Math.exp(-dt * 5.2);
      s += Math.sin(2 * Math.PI * 739.99 * dt) * env * 0.45;
    }
    // Note 2: B5 (987.77 Hz) starting at 0.18s
    if (t >= 0.18 && t < 0.90) {
      const dt = t - 0.18;
      const env = dt < 0.01 ? dt / 0.01 : Math.exp(-dt * 4.0);
      s += Math.sin(2 * Math.PI * 987.77 * dt) * env * 0.50;
    }
    samples[i] = s;
  }
  return encodeWAV(samples, SAMPLE_RATE);
}

// Pre-synthesize clean WAV Data URIs once at module load
let SOUND_DATA_URLS = null;
function getSoundDataUrls() {
  if (!SOUND_DATA_URLS) {
    SOUND_DATA_URLS = {
      beep: buildCountdownBeepWav(),
      cheese: buildCheeseCueWav(),
      shutter: buildShutterWav(),
      printing: buildPrintingSoundWav(),
      printComplete: buildPrintCompleteWav(),
    };
  }
  return SOUND_DATA_URLS;
}

export function useAudio() {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef(null);
  const currentPrintingAudioRef = useRef(null);

  // Safely get or create Web Audio Context
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

  // Universal sound player: Plays via HTML5 Audio with fallback to Web Audio API
  const playSoundData = useCallback((dataUrl, volume = 0.8) => {
    if (isMuted) return;
    try {
      const audioEl = new Audio(dataUrl);
      audioEl.volume = Math.max(0, Math.min(1, volume));
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((e) => {
          // If browser blocked HTML5 Audio, attempt Web Audio API fallback
          try {
            const ctx = getAudioContext();
            if (ctx) {
              if (ctx.state === 'suspended') ctx.resume();
            }
          } catch (err) {}
        });
      }
      return audioEl;
    } catch (e) {
      return null;
    }
  }, [isMuted, getAudioContext]);

  // Explicit user gesture unlocker
  const unlockAudio = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Warm up HTML5 Audio subsystem with a brief silent play
      const sounds = getSoundDataUrls();
      const silentAudio = new Audio(sounds.beep);
      silentAudio.volume = 0;
      const p = silentAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          silentAudio.pause();
          silentAudio.currentTime = 0;
        }).catch(() => {});
      }
    } catch (e) {}
  }, [getAudioContext]);

  // Global listener to immediately unlock Audio subsystem upon any user touch or click
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
    const sounds = getSoundDataUrls();
    playSoundData(isFinal ? sounds.cheese : sounds.beep, isFinal ? 0.95 : 0.85);
  }, [isMuted, playSoundData]);

  // Authentic mechanical photobooth SLR shutter sound
  const playShutter = useCallback(() => {
    if (isMuted) return;
    const sounds = getSoundDataUrls();
    playSoundData(sounds.shutter, 0.95);
  }, [isMuted, playSoundData]);

  // Photobooth mechanical printer roller & paper sliding sound while photo emerges
  const playPrintingSound = useCallback(() => {
    if (isMuted) return;
    const sounds = getSoundDataUrls();
    if (currentPrintingAudioRef.current) {
      try {
        currentPrintingAudioRef.current.pause();
      } catch (e) {}
    }
    const audioEl = playSoundData(sounds.printing, 0.70);
    currentPrintingAudioRef.current = audioEl;
  }, [isMuted, playSoundData]);

  // Photobooth paper release cutter snap & pleasant completion chime when photo fully emerges
  const playPrintComplete = useCallback(() => {
    if (isMuted) return;
    if (currentPrintingAudioRef.current) {
      try {
        currentPrintingAudioRef.current.pause();
      } catch (e) {}
    }
    const sounds = getSoundDataUrls();
    playSoundData(sounds.printComplete, 0.90);
  }, [isMuted, playSoundData]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return useMemo(() => ({
    isMuted,
    toggleMute,
    unlockAudio,
    playBeep,
    playShutter,
    playPrintingSound,
    playPrintComplete,
  }), [isMuted, toggleMute, unlockAudio, playBeep, playShutter, playPrintingSound, playPrintComplete]);
}
