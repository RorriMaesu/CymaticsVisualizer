/* global Tone */

// Global variables
let freq = 440;
let mode = 'square';
let playing = false;
let synth, slider, freqInput, playBtn, geomSel;
let startTime; // To track animation time

// Cymatics physics constants
const CHLADNI_CONSTANT = 0.054; // Physical constant for square plates (steel)
const MEMBRANE_CONSTANT = 0.961; // Physical constant for circular membranes

// Initialize UI elements after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // We'll initialize the synth only when needed (on play button click)
  // to avoid AudioContext errors

  // Get UI elements
  slider = document.getElementById('freqSlider');
  freqInput = document.getElementById('freqInput');
  playBtn = document.getElementById('playBtn');
  geomSel = document.getElementById('geomMode');

  // Set up event listeners for slider
  slider.addEventListener('input', () => {
    freq = +slider.value;
    freqInput.value = freq;
    updateFrequency(freq);
  });

  // Set up event listeners for manual frequency input
  freqInput.addEventListener('input', () => {
    let newFreq = +freqInput.value;

    // Validate frequency range
    if (newFreq < 50) newFreq = 50;
    if (newFreq > 4000) newFreq = 4000;

    freq = newFreq;
    slider.value = freq;
    updateFrequency(freq);
  });

  // Handle Enter key on frequency input
  freqInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      freqInput.blur(); // Remove focus
    }
  });

  playBtn.addEventListener('click', async () => {
    if (!playing) {
      try {
        // Initialize synth only when needed (on first play)
        if (!synth) {
          synth = new Tone.Synth().toDestination();
        }

        // Start audio context with user interaction
        await Tone.start();
        synth.triggerAttack(freq);
        playing = true;
        playBtn.textContent = 'Stop';

        // Reset animation time when starting playback
        startTime = millis() / 1000;
      } catch (error) {
        console.error("Error starting audio:", error);
        alert("Could not start audio. Please try again.");
      }
    } else {
      if (synth) {
        synth.triggerRelease();
      }
      playing = false;
      playBtn.textContent = 'Play';
    }
  });

  geomSel.addEventListener('change', () => {
    mode = geomSel.value;
    // Reset animation time for smooth transition
    startTime = millis() / 1000;
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

  // Use loop() for continuous animation
  frameRate(30); // Set frame rate to 30 fps
  loop();

  // Initialize animation time
  startTime = millis() / 1000;

  // Make redraw function available globally
  window.redraw = redraw;
}

function draw() {
  // Calculate current time for animation
  const currentTime = millis() / 1000 - startTime;

  pg.loadPixels();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = mode === 'square'
        ? squarePlatePattern(x / width, y / height, currentTime)
        : circularMembranePattern(x, y, currentTime);

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

  // Display information overlay
  displayInfoOverlay();
}

// Function to display information overlay
function displayInfoOverlay() {
  // Semi-transparent background for text
  fill(0, 0, 0, 150);
  noStroke();
  rect(5, 5, 200, 60, 5);

  // Display current frequency
  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  text(`Frequency: ${freq} Hz`, 15, 15);

  // Display mode information
  let modeInfo;
  if (mode === 'square') {
    // Calculate mode numbers for display
    const eigenValue = sqrt(freq / CHLADNI_CONSTANT);
    let bestN = 1, bestM = 1;
    let minDiff = Infinity;

    for (let n = 1; n <= 10; n++) {
      for (let m = 1; m <= 10; m++) {
        const modeFreq = CHLADNI_CONSTANT * sqrt(n*n + m*m);
        const diff = abs(modeFreq - freq);

        if (diff < minDiff) {
          minDiff = diff;
          bestN = n;
          bestM = m;
        }
      }
    }

    modeInfo = `Square Plate: Mode (${bestN},${bestM})`;
  } else {
    const radialMode = max(1, floor(sqrt(freq / MEMBRANE_CONSTANT) / 2));
    const angularMode = max(0, floor(sqrt(freq / MEMBRANE_CONSTANT) / 3));
    modeInfo = `Circular Membrane: Mode (${radialMode},${angularMode})`;
  }

  text(modeInfo, 15, 35);
}

// Function to update frequency and related components
function updateFrequency(newFreq) {
  // Update synth if playing
  if (playing && synth) synth.frequency.value = newFreq;

  // Reset animation time for smooth transition
  startTime = millis() / 1000;
}

// Handle window resize
function windowResized() {
  const s = min(windowHeight * 0.75, windowWidth * 0.9);
  resizeCanvas(s, s);
  pg = createGraphics(width, height);
  // No need to call redraw() as we're using loop()
}

// -------- pattern functions --------
function squarePlatePattern(x, y, time) {
  // Calculate mode numbers based on physical properties of the plate
  // Using Chladni's formula: f = C * sqrt((n^2 + m^2) / L^2) where C is a constant
  // We solve for n and m given f

  // Calculate the eigenvalue parameter (based on frequency)
  const eigenValue = sqrt(freq / CHLADNI_CONSTANT);

  // Calculate mode numbers (n,m) using more accurate physics
  // We use a more accurate approach to find the closest mode numbers
  let bestN = 1, bestM = 1;
  let minDiff = Infinity;

  // Search for the best mode numbers that match the frequency
  for (let n = 1; n <= 10; n++) {
    for (let m = 1; m <= 10; m++) {
      const modeFreq = CHLADNI_CONSTANT * sqrt(n*n + m*m);
      const diff = abs(modeFreq - freq);

      if (diff < minDiff) {
        minDiff = diff;
        bestN = n;
        bestM = m;
      }
    }
  }

  // Use the best mode numbers
  const n = bestN;
  const m = bestM;

  // Add time component for animation (2πft)
  const oscillation = cos(TWO_PI * freq * time);

  // Standing wave pattern with time oscillation
  return sin(PI * n * x) * sin(PI * m * y) * oscillation;
}

function circularMembranePattern(px, py, time) {
  const r = 0.5 * min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const dx = px - cx;
  const dy = py - cy;
  const rho = sqrt(dx * dx + dy * dy) / r;  // 0‒1
  if (rho > 1) return 0;

  const theta = atan2(dy, dx);

  // Calculate mode numbers based on physical properties of the membrane
  // Using the formula: f = C * α_nm / R where C is a constant, α_nm is the zero of the Bessel function
  // We use a simplified approach to find the closest mode numbers

  // Calculate radial and angular mode numbers
  const radialMode = max(1, floor(sqrt(freq / MEMBRANE_CONSTANT) / 2));
  const angularMode = max(0, floor(sqrt(freq / MEMBRANE_CONSTANT) / 3));

  // Use more accurate Bessel function approximation
  // For a real Bessel function, we would use a lookup table of zeros
  // This is a better approximation than the previous one
  let J;
  if (rho === 0) {
    J = (angularMode === 0) ? 1 : 0;
  } else {
    // Better Bessel approximation for small orders
    const z = PI * radialMode * rho;
    if (angularMode === 0) {
      J = besselJ0(z);
    } else {
      J = besselJ1(z) * sin(angularMode * theta) / (z);
    }
  }

  // Add time component for animation (2πft)
  const oscillation = cos(TWO_PI * freq * time);

  // Standing wave pattern with time oscillation
  return J * oscillation;
}

// Approximation of Bessel function J0
function besselJ0(x) {
  if (x === 0) return 1;

  // Approximation valid for small x
  if (abs(x) < 3) {
    return cos(x);
  }

  // Better approximation for larger x
  return sqrt(2 / (PI * abs(x))) * cos(abs(x) - PI/4);
}

// Approximation of Bessel function J1
function besselJ1(x) {
  if (x === 0) return 0;

  // Approximation valid for small x
  if (abs(x) < 3) {
    return sin(x) / 2;
  }

  // Better approximation for larger x
  return sqrt(2 / (PI * abs(x))) * sin(abs(x) - 3*PI/4);
}
