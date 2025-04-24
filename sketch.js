/* global Tone */

// Global variables
let freq = 440;
let mode = 'square';
let playing = false;
let synth, slider, label, playBtn, geomSel;

// Initialize UI elements after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Tone.js synth
  synth = new Tone.Synth().toDestination();

  // Get UI elements
  slider = document.getElementById('freqSlider');
  label = document.getElementById('freqLabel');
  playBtn = document.getElementById('playBtn');
  geomSel = document.getElementById('geomMode');

  // Set up event listeners
  slider.addEventListener('input', () => {
    freq = +slider.value;
    label.textContent = freq;
    if (playing) synth.frequency.value = freq;
    if (typeof window.redraw === 'function') {
      window.redraw();
    }
  });

  playBtn.addEventListener('click', async () => {
    if (!playing) {
      try {
        await Tone.start();
        synth.triggerAttack(freq);
        playing = true;
        playBtn.textContent = 'Stop';
      } catch (error) {
        console.error("Error starting audio:", error);
      }
    } else {
      synth.triggerRelease();
      playing = false;
      playBtn.textContent = 'Play';
    }
  });

  geomSel.addEventListener('change', () => {
    mode = geomSel.value;
    if (typeof window.redraw === 'function') {
      window.redraw();
    }
  });
});

// ----------  p5.js  ----------
let pg;

function setup() {
  const s = min(windowHeight * 0.75, windowWidth * 0.9);
  const canvas = createCanvas(s, s);
  canvas.parent('canvas-holder');
  pixelDensity(1);           // smoother colour bands
  pg = createGraphics(width, height);
  noLoop();

  // Make redraw function available globally
  window.redraw = redraw;

  // Initial draw
  redraw();
}

function draw() {
  pg.loadPixels();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = mode === 'square'
        ? squarePlatePattern(x / width, y / height)
        : circularMembranePattern(x, y);

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

// Handle window resize
function windowResized() {
  const s = min(windowHeight * 0.75, windowWidth * 0.9);
  resizeCanvas(s, s);
  pg = createGraphics(width, height);
  redraw();
}

// -------- pattern functions --------
function squarePlatePattern(x, y) {
  const n = floor(sqrt(freq / 110)) + 1;
  const m = floor(sqrt(freq / 55)) + 1;
  return sin(PI * n * x) * sin(PI * m * y);
}

function circularMembranePattern(px, py) {
  const r   = 0.5 * min(width, height);
  const cx  = width  / 2;
  const cy  = height / 2;
  const dx  = px - cx;
  const dy  = py - cy;
  const rho = sqrt(dx * dx + dy * dy) / r;  // 0‒1
  if (rho > 1) return 0;

  const theta = atan2(dy, dx);
  const n = max(1, floor(freq / 500));
  const m = (floor(freq / 100) % 5) + 1;

  // crude Bessel-J approx: J_n ≈ sin(k_n ρ) / (k_n ρ)
  const k = PI * m;
  const J = rho === 0 ? 1 : sin(k * rho) / (k * rho);
  return cos(n * theta) * J;
}
