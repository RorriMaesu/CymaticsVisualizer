// Global variables for p5.js
let freq = 440;
let mode = 'square';
let playing = false;
let pg;
let synth;

// p5.js setup function - runs once at the beginning
function setup() {
  // Create canvas with responsive size
  const s = min(windowHeight * 0.75, windowWidth * 0.9);
  const canvas = createCanvas(s, s);
  canvas.parent('canvas-holder');
  pixelDensity(1); // For smoother color bands

  // Create graphics buffer for pixel manipulation
  pg = createGraphics(width, height);

  // Don't continuously loop - we'll call redraw() when needed
  noLoop();

  // Initialize UI elements
  initializeUI();

  // Initial draw
  redraw();
}

// p5.js draw function - called when redraw() is invoked
function draw() {
  pg.loadPixels();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = mode === 'square'
        ? squarePlatePattern(x / width, y / height)
        : circularMembranePattern(x, y);

      // Map value ∈ [-1,1] to color
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

// Initialize UI elements and event listeners
function initializeUI() {
  // Initialize Tone.js synth
  synth = new Tone.Synth().toDestination();

  // Get UI elements
  const slider = document.getElementById('freqSlider');
  const label = document.getElementById('freqLabel');
  const playBtn = document.getElementById('playBtn');
  const geomSel = document.getElementById('geomMode');

  // Set initial label value
  label.textContent = freq;

  // Frequency slider event
  slider.addEventListener('input', () => {
    freq = +slider.value;
    label.textContent = freq;
    if (playing) synth.frequency.value = freq;
    redraw(); // Update visualization
  });

  // Play/Stop button event
  playBtn.addEventListener('click', async () => {
    if (!playing) {
      try {
        // This must be called within a user gesture event handler
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

  // Geometry mode selection event
  geomSel.addEventListener('change', () => {
    mode = geomSel.value;
    redraw(); // Update visualization
  });
}

// Handle window resize
function windowResized() {
  const s = min(windowHeight * 0.75, windowWidth * 0.9);
  resizeCanvas(s, s);
  pg = createGraphics(width, height);
  redraw();
}

// -------- Pattern functions --------
function squarePlatePattern(x, y) {
  const n = floor(sqrt(freq / 110)) + 1;
  const m = floor(sqrt(freq / 55)) + 1;
  return sin(PI * n * x) * sin(PI * m * y);
}

function circularMembranePattern(px, py) {
  const r = 0.5 * min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const dx = px - cx;
  const dy = py - cy;
  const rho = sqrt(dx * dx + dy * dy) / r;  // 0‒1
  if (rho > 1) return 0;

  const theta = atan2(dy, dx);
  const n = max(1, floor(freq / 500));
  const m = (floor(freq / 100) % 5) + 1;

  // Crude Bessel-J approximation: J_n ≈ sin(k_n ρ) / (k_n ρ)
  const k = PI * m;
  const J = rho === 0 ? 1 : sin(k * rho) / (k * rho);
  return cos(n * theta) * J;
}
