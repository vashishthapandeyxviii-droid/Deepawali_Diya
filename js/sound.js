// Sound for lighting the diya, synthesised with the Web Audio API (no audio files needed).
let audio;   // created on the first tap (browsers only allow sound after a click or tap)

export function playIgnite() {
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
  const ctx = audio, now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.value = 0.5;                       // overall volume
  master.connect(ctx.destination);

  // Two seconds of white noise to shape into sounds
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // One shaped burst of noise: the filter sweeps from f0 to f1 while the volume rises and fades
  const burst = (start, dur, f0, f1, vol, type, q) => {
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), 
    gain = ctx.createGain();
    src.buffer = buf;
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, now + start);
    filter.frequency.exponentialRampToValueAtTime(f1, now + start + dur);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(vol, now + start + dur * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(now + start, Math.random(), dur + 0.05);
  };

  burst(0, 0.28, 4500, 1500, 0.5, 'bandpass', 0.8);     // match scratch
  burst(0.22, 0.9, 350, 1800, 0.7, 'bandpass', 0.7);    // soft "whoomp" as the flame catches
  burst(0.22, 0.7, 150, 400, 0.6, 'lowpass', 0.7);      // low body of the whoomp
  for (let i = 0; i < 9; i++) {                         // tiny crackles from the oil and wick
    burst(0.5 + Math.random() * 1.5, 0.03 + Math.random() * 0.03,
          3000 + Math.random() * 3000, 1500, 0.15 + Math.random() * 0.25, 
          'bandpass', 2);
  }
}