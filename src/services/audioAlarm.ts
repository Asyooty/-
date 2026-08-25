// Audio Alarm Engine using HTML5 Web Audio API (Offline & zero-dependency)

let audioCtx: AudioContext | null = null;
let activeIntervalId: number | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playSingleBeep(freq = 880, type: OscillatorType = 'sine', durationSec = 0.25, volume = 0.3) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSec);

    // Also vibrate if supported on mobile
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([150, 50, 150]);
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.warn('AudioContext playback error:', err);
  }
}

export function playSirenAlarm(durationSec = 2) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + durationSec / 2);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + durationSec);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationSec);

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([300, 100, 300, 100, 400]);
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Siren alarm error:', err);
  }
}

export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.1);
      osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
    });
  } catch (err) {
    console.warn('Success chime error:', err);
  }
}

export function startRecurringAlarmLoop(onTrigger: () => void, intervalMinutes = 30) {
  stopRecurringAlarmLoop();
  
  // Trigger initial alarm chime
  playSirenAlarm(1.5);
  onTrigger();

  // Schedule interval (in production 30 minutes, or customizable)
  const intervalMs = Math.max(15000, intervalMinutes * 60 * 1000);
  activeIntervalId = window.setInterval(() => {
    playSirenAlarm(2);
    onTrigger();
  }, intervalMs);
}

export function stopRecurringAlarmLoop() {
  if (activeIntervalId !== null) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }
}
