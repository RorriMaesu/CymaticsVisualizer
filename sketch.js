/* global Tone */

// Global variables
let freq = 440;
let mode = 'square';
let playing = false;
let synth, slider, freqInput, playBtn, geomSel;
let startTime; // To track animation time
let lastFreqChange = 0; // To track when frequency was last changed
let animationIntensity = 1.0; // Animation intensity factor

// Cymatics physics constants
const CHLADNI_CONSTANT = 0.054; // Physical constant for square plates (steel)
const MEMBRANE_CONSTANT = 0.961; // Physical constant for circular membranes

// Color palette for visualization
const COLORS = {
  background: [10, 10, 20],
  nodal: [58, 134, 255], // Blue
  antiNodal: [255, 255, 255], // White
  highlight: [255, 100, 100], // Red highlight
  glow: [58, 134, 255, 100] // Glow effect
};

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

  // Create additional graphics buffer for effects
  effectsLayer = createGraphics(width, height);

  // Use loop() for continuous animation
  frameRate(60); // Higher frame rate for smoother animation
  loop();

  // Initialize animation time
  startTime = millis() / 1000;

  // Make redraw function available globally
  window.redraw = redraw;

  // Set text properties
  textFont('Segoe UI, system-ui, sans-serif');

  // Set blend mode for more interesting visual effects
  blendMode(BLEND);
}

function draw() {
  // Calculate current time for animation
  const currentTime = millis() / 1000 - startTime;

  // Calculate time since last frequency change for transition effects
  const timeSinceFreqChange = millis() - lastFreqChange;
  const transitionEffect = constrain(map(timeSinceFreqChange, 0, 500, 0, 1), 0, 1);

  // Clear the graphics buffer with a dark background
  pg.background(COLORS.background);
  effectsLayer.clear();

  // Draw the cymatics pattern
  drawCymaticsPattern(currentTime, transitionEffect);

  // Apply post-processing effects
  applyPostProcessing(currentTime);

  // Draw the final image to the canvas
  background(0);
  image(pg, 0, 0, width, height);
  image(effectsLayer, 0, 0, width, height);

  // Display information overlay
  displayInfoOverlay();
}

// Function to draw the cymatics pattern
function drawCymaticsPattern(currentTime, transitionEffect) {
  pg.loadPixels();

  // Calculate the animation intensity based on frequency
  const animSpeed = map(freq, 50, 4000, 0.5, 2.0);

  // Use a more physically accurate time factor
  const timeFactor = TWO_PI * freq * currentTime * 0.1 * animSpeed;

  // Draw the pattern pixel by pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Get the pattern value at this point
      const value = mode === 'square'
        ? squarePlatePattern(x / width, y / height, currentTime)
        : circularMembranePattern(x, y, currentTime);

      // Apply animation oscillation
      const animatedValue = value * cos(timeFactor) * animationIntensity;

      // Calculate color based on the pattern value
      let r, g, b;

      // Create more interesting color mapping for nodal lines and antinodes
      if (abs(animatedValue) < 0.05) {
        // Nodal lines (near zero) - blue glow
        const intensity = map(abs(animatedValue), 0, 0.05, 1, 0);
        r = lerp(COLORS.background[0], COLORS.nodal[0], intensity);
        g = lerp(COLORS.background[1], COLORS.nodal[1], intensity);
        b = lerp(COLORS.background[2], COLORS.nodal[2], intensity);
      } else {
        // Antinodal regions - white to blue gradient
        const intensity = map(abs(animatedValue), 0.05, 1, 0, 1);
        r = lerp(COLORS.nodal[0], COLORS.antiNodal[0], intensity);
        g = lerp(COLORS.nodal[1], COLORS.antiNodal[1], intensity);
        b = lerp(COLORS.nodal[2], COLORS.antiNodal[2], intensity);
      }

      // Apply transition effect when frequency changes
      r = lerp(r, COLORS.highlight[0], (1 - transitionEffect) * 0.3);

      // Set the pixel color
      const idx = 4 * (y * width + x);
      pg.pixels[idx    ] = r;
      pg.pixels[idx + 1] = g;
      pg.pixels[idx + 2] = b;
      pg.pixels[idx + 3] = 255;
    }
  }

  pg.updatePixels();
}

// Function to apply post-processing effects
function applyPostProcessing(currentTime) {
  // Draw glow effect for nodal lines
  effectsLayer.noFill();
  effectsLayer.strokeWeight(2);

  if (mode === 'square') {
    drawNodalLinesSquare(effectsLayer, currentTime);
  } else {
    drawNodalLinesCircular(effectsLayer, currentTime);
  }
}

// Function to draw nodal lines for square plate
function drawNodalLinesSquare(layer, currentTime) {
  // Calculate mode numbers based on frequency
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

  // Draw nodal lines with glow effect
  layer.push();

  // Animate the glow based on time
  const glowIntensity = map(sin(currentTime * 2), -1, 1, 100, 200);

  // Draw horizontal nodal lines
  for (let i = 1; i < bestN; i++) {
    const y = (i / bestN) * height;
    layer.stroke(COLORS.nodal[0], COLORS.nodal[1], COLORS.nodal[2], glowIntensity);
    layer.line(0, y, width, y);
  }

  // Draw vertical nodal lines
  for (let i = 1; i < bestM; i++) {
    const x = (i / bestM) * width;
    layer.stroke(COLORS.nodal[0], COLORS.nodal[1], COLORS.nodal[2], glowIntensity);
    layer.line(x, 0, x, height);
  }

  layer.pop();
}

// Function to draw nodal lines for circular membrane
function drawNodalLinesCircular(layer, currentTime) {
  // Calculate radial and angular mode numbers
  const radialMode = max(1, floor(sqrt(freq / MEMBRANE_CONSTANT) / 2));
  const angularMode = max(0, floor(sqrt(freq / MEMBRANE_CONSTANT) / 3));

  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = min(width, height) / 2;

  layer.push();
  layer.translate(cx, cy);

  // Animate the glow based on time
  const glowIntensity = map(sin(currentTime * 2), -1, 1, 100, 200);

  // Draw radial nodal lines (circles)
  for (let i = 1; i <= radialMode; i++) {
    const radius = (i / (radialMode + 1)) * maxRadius;
    layer.stroke(COLORS.nodal[0], COLORS.nodal[1], COLORS.nodal[2], glowIntensity);
    layer.ellipse(0, 0, radius * 2, radius * 2);
  }

  // Draw angular nodal lines (diameters)
  if (angularMode > 0) {
    for (let i = 0; i < angularMode; i++) {
      const angle = (i / angularMode) * PI;
      const x1 = cos(angle) * maxRadius;
      const y1 = sin(angle) * maxRadius;
      const x2 = -x1;
      const y2 = -y1;
      layer.stroke(COLORS.nodal[0], COLORS.nodal[1], COLORS.nodal[2], glowIntensity);
      layer.line(x1, y1, x2, y2);
    }
  }

  layer.pop();
}

// Function to display information overlay
function displayInfoOverlay() {
  // Semi-transparent background for text
  fill(0, 0, 0, 180);
  noStroke();
  rect(10, 10, 220, 70, 8);

  // Display current frequency
  fill(255);
  textAlign(LEFT, TOP);
  textSize(16);
  textStyle(BOLD);
  text(`Frequency: ${freq} Hz`, 20, 20);
  textStyle(NORMAL);

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

  textSize(14);
  text(modeInfo, 20, 50);
}

// Function to update frequency and related components
function updateFrequency(newFreq) {
  // Update synth if playing
  if (playing && synth) synth.frequency.value = newFreq;

  // Track when frequency was last changed for transition effects
  lastFreqChange = millis();

  // Reset animation time for smooth transition
  startTime = millis() / 1000;

  // Briefly increase animation intensity for visual feedback
  animationIntensity = 1.5;

  // Reset animation intensity after a short delay
  setTimeout(() => {
    animationIntensity = 1.0;
  }, 300);
}

// Handle window resize
function windowResized() {
  const s = min(windowHeight * 0.75, windowWidth * 0.9);
  resizeCanvas(s, s);
  pg = createGraphics(width, height);
  effectsLayer = createGraphics(width, height);
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
