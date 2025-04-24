# Cymatics Visualizer

An interactive web application that visualizes cymatics patterns - the geometric patterns that form on vibrating surfaces at different frequencies.

## Features

- **Real-time visualization** of nodal patterns on vibrating plates and membranes
- **Interactive frequency control** from 50Hz to 4000Hz
- **Two geometric modes**:
  - Square plate (Chladni patterns)
  - Circular membrane (drum-like patterns)
- **Audio playback** of the selected frequency
- **Responsive design** that works on various screen sizes

## How It Works

The application uses mathematical models to simulate the standing wave patterns that would form on vibrating surfaces:

1. For square plates, it uses the equation: `z = sin(n π x/L) · sin(m π y/L) · cos(2πf t)`
2. For circular membranes, it uses a simplified Bessel function approximation

The nodal lines (where the amplitude is zero) appear as dark lines in the visualization, similar to how sand would collect on a physical Chladni plate.

## Usage

1. Use the frequency slider to select a frequency between 50Hz and 4000Hz
2. Toggle between square plate and circular membrane using the dropdown
3. Click "Play" to hear the selected frequency
4. Observe how the pattern changes as you adjust the frequency

## Technologies Used

- HTML5 Canvas for visualization
- p5.js for graphics rendering
- Tone.js for audio synthesis
- Pure JavaScript for UI interaction

## License

MIT License © 2025 Andrew J. Green
