

// Web Audio API Context
const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

const playTone = (freq: number, type: OscillatorType, duration: number, delay = 0) => {
  if (audioCtx.state === 'suspended') {
    // Attempt to resume if suspended
    audioCtx.resume().catch(e => console.warn("Audio Context resume failed (interaction required)", e));
  }
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
  
  return osc;
};

export const playNotificationSound = () => {
  // Futuristic "Blip"
  playTone(800, 'sine', 0.1);
  playTone(1200, 'sine', 0.1, 0.1);
};

export const playCompletionSound = () => {
  // Success "Chime"
  playTone(400, 'sine', 0.1, 0);
  playTone(600, 'sine', 0.1, 0.1);
  playTone(1000, 'sine', 0.3, 0.2);
};

// --- Alarm Logic ---
let alarmInterval: any = null;
let stopTimeout: any = null;

const playAlarmSequence = () => {
   // Urgent "Red Alert" siren pattern
   playTone(880, 'sawtooth', 0.3, 0);   // High
   playTone(440, 'sawtooth', 0.3, 0.3); // Low
};

export const startAlarmLoop = () => {
  // Clear any existing alarms first
  stopAlarmLoop();

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(e => console.warn("Audio Context resume failed (interaction required)", e));
  }

  // Play immediately
  playAlarmSequence();

  // Loop every 800ms
  alarmInterval = setInterval(playAlarmSequence, 800);

  // Auto-stop after 30 seconds
  stopTimeout = setTimeout(() => {
    stopAlarmLoop();
  }, 30000);
};

export const stopAlarmLoop = () => {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (stopTimeout) {
    clearTimeout(stopTimeout);
    stopTimeout = null;
  }
};

// --- PCM Audio Decoding for Gemini TTS ---

function base64ToArrayBuffer(base64: string) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export const playPCM = async (base64Audio: string) => {
  try {
    // Explicitly resume context for reliable playback
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    
    // Gemini 2.5 TTS uses 24000Hz sample rate usually, but we need to decode raw PCM manually 
    // because it has no WAV header.
    // The Gemini API returns raw PCM.
    // Let's assume Int16 little-endian, mono, 24kHz (standard for Gemini output)
    
    const dataView = new DataView(arrayBuffer);
    const numChannels = 1;
    const sampleRate = 24000;
    const pcmData = new Int16Array(arrayBuffer);
    const float32Data = new Float32Array(pcmData.length);
    
    // Convert Int16 to Float32
    for (let i = 0; i < pcmData.length; i++) {
       float32Data[i] = pcmData[i] / 32768.0;
    }

    const audioBuffer = audioCtx.createBuffer(numChannels, float32Data.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();

  } catch (e) {
    console.error("Error playing PCM audio", e);
  }
};
