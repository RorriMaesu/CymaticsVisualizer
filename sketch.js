/* global Tone */

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  let freq = 440;
  let mode = 'square';
  let playing = false;

  // Initialize Tone.js with user interaction
  const synth = new Tone.Synth().toDestination();
  const slider = document.getElementById('freqSlider');
  const label  = document.getElementById('freqLabel');
  const playBtn= document.getElementById('playBtn');
  const geomSel= document.getElementById('geomMode');

  // Make variables accessible to p5.js
  window.freq = freq;
  window.mode = mode;

  slider.addEventListener('input', () => {
    freq = +slider.value;
    window.freq = freq; // Update global freq for p5.js
    label.textContent = freq;
    if (playing) synth.frequency.value = freq;
    // Use p5's redraw function if it's available
    if (typeof window.redraw === 'function') {
      window.redraw();
    }
  });

  playBtn.addEventListener('click', async () => {
    if (!playing) {
      try {
        // Start audio context with user interaction
        await Tone.start();
        synth.triggerAttack(freq);
        playing = true;
        playBtn.textContent = 'Stop';
      } catch (error) {
        console.error("Error starting audio:", error);
        alert("Audio couldn't start. Please try again.");
      }
    } else {
      synth.triggerRelease();
      playing = false;
      playBtn.textContent = 'Play';
    }
  });

  geomSel.addEventListener('change', () => {
    mode = geomSel.value;
    window.mode = mode; // Update global mode for p5.js
    // Use p5's redraw function if it's available
    if (typeof window.redraw === 'function') {
      window.redraw();
    }
  });

} // End of initializeApp function

// ----------  p5.js  ----------
let pg;

function setup() {
  const s = min(window.innerHeight * 0.75, window.innerWidth * 0.9);
  const canvas = createCanvas(s, s);
  canvas.parent('canvas-holder');
  pixelDensity(1);           // smoother colour bands
  pg = createGraphics(width, height);
  noLoop(); // We'll manually control when to redraw

  // Make redraw function available globally
  window.redraw = redraw;

  // Initial draw
  setTimeout(() => {
    redraw();
  }, 100); // Small delay to ensure DOM is ready
}

function draw() {
  pg.loadPixels();

  // Use global freq and mode variables
  const currentFreq = window.freq || 440;
  const currentMode = window.mode || 'square';

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = currentMode === 'square'
        ? squarePlatePattern(x / width, y / height, currentFreq)
        : circularMembranePattern(x, y, currentFreq);

      // Map value ∈ [-1,1] to colour
      const c = map(abs(value), 0, 1, 0, 255);
      const idx = 4 * (y * width + x);
      pg.pixels[idx  ] = c;          // R
      pg.pixels[idx+1] = 255 - c;    // G
      pg.pixels[idx+2] = 255;        // B
      pg.pixels[idx+3] = 255;        // α
    }
  }

  pg.updatePixels();
  image(pg, 0, 0, width, height);
}

// -------- pattern functions --------
function squarePlatePattern(x, y, frequency) {
  const n = floor(sqrt(frequency / 110)) + 1;
  const m = floor(sqrt(frequency / 55)) + 1;
  return sin(PI * n * x) * sin(PI * m * y);
}

function circularMembranePattern(px, py, frequency) {
  const r   = 0.5 * min(width, height);
  const cx  = width  / 2;
  const cy  = height / 2;
  const dx  = px - cx;
  const dy  = py - cy;
  const rho = sqrt(dx * dx + dy * dy) / r;  // 0‒1
  if (rho > 1) return 0;

  const theta = atan2(dy, dx);
  const n = max(1, floor(frequency / 500));
  const m = (floor(frequency / 100) % 5) + 1;

  // crude Bessel-J approx: J_n ≈ sin(k_n ρ) / (k_n ρ)
  const k = PI * m;
  const J = rho === 0 ? 1 : sin(k * rho) / (k * rho);
  return cos(n * theta) * J;
}
