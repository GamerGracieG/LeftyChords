/**
 * SVG Chord Diagram Renderer for Left-Handed Guitarists
 * Renders chord diagrams with low E string on the RIGHT side
 */

const ChordDiagram = {
  // SVG dimensions and layout
  config: {
    width: 200,
    height: 240,
    padding: { top: 50, right: 20, bottom: 20, left: 30 },
    strings: 6,
    frets: 4,
    dotRadius: 12,
    fontSize: 11,
    nutHeight: 6
  },

  /**
   * Create an SVG chord diagram
   * @param {Object} position - Chord position data from database
   * @param {string} chordName - Full chord name (e.g., "Cmaj7")
   * @param {boolean} isLeftHanded - Render for left-handed (default true)
   * @returns {SVGElement} - The rendered SVG element
   */
  render(position, chordName = '', isLeftHanded = true) {
    const { width, height, padding, strings, frets, dotRadius, nutHeight } = this.config;

    // Calculate grid dimensions
    const gridWidth = width - padding.left - padding.right;
    const gridHeight = height - padding.top - padding.bottom;
    const stringSpacing = gridWidth / (strings - 1);
    const fretSpacing = gridHeight / frets;

    // Create SVG element
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'chord-diagram');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Chord diagram for ${chordName}`);

    // For left-handed: reverse the frets and fingers arrays
    const fretPositions = isLeftHanded ? [...position.frets].reverse() : position.frets;
    const fingerPositions = isLeftHanded ? [...position.fingers].reverse() : position.fingers;
    const barres = position.barres || [];
    const baseFret = position.baseFret || 1;

    // Draw components
    this._drawNutOrPosition(svg, baseFret, padding, gridWidth, nutHeight);
    this._drawFretGrid(svg, padding, gridWidth, gridHeight, strings, frets, stringSpacing, fretSpacing);
    this._drawBarres(svg, barres, fretPositions, baseFret, padding, stringSpacing, fretSpacing, dotRadius, isLeftHanded);
    this._drawFingerDots(svg, fretPositions, fingerPositions, baseFret, padding, stringSpacing, fretSpacing, dotRadius);
    this._drawOpenMutedMarkers(svg, fretPositions, padding, stringSpacing);

    return svg;
  },

  /**
   * Draw nut (thick line at top) or position number
   */
  _drawNutOrPosition(svg, baseFret, padding, gridWidth, nutHeight) {
    if (baseFret === 1) {
      // Draw nut
      const nut = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      nut.setAttribute('x', padding.left);
      nut.setAttribute('y', padding.top - nutHeight);
      nut.setAttribute('width', gridWidth);
      nut.setAttribute('height', nutHeight);
      nut.setAttribute('class', 'chord-nut');
      svg.appendChild(nut);
    } else {
      // Draw position number
      const posText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      posText.setAttribute('x', padding.left - 18);
      posText.setAttribute('y', padding.top + 20);
      posText.setAttribute('class', 'chord-position-number');
      posText.textContent = baseFret;
      svg.appendChild(posText);
    }
  },

  /**
   * Draw the fret grid (strings and frets)
   */
  _drawFretGrid(svg, padding, gridWidth, gridHeight, strings, frets, stringSpacing, fretSpacing) {
    // Draw strings (vertical lines)
    for (let i = 0; i < strings; i++) {
      const x = padding.left + (i * stringSpacing);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', padding.top);
      line.setAttribute('x2', x);
      line.setAttribute('y2', padding.top + gridHeight);
      line.setAttribute('class', 'chord-string');
      svg.appendChild(line);
    }

    // Draw frets (horizontal lines)
    for (let i = 0; i <= frets; i++) {
      const y = padding.top + (i * fretSpacing);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.left);
      line.setAttribute('y1', y);
      line.setAttribute('x2', padding.left + gridWidth);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'chord-fret');
      svg.appendChild(line);
    }
  },

  /**
   * Draw barre indicators
   */
  _drawBarres(svg, barres, fretPositions, baseFret, padding, stringSpacing, fretSpacing, dotRadius, isLeftHanded) {
    barres.forEach(barreFret => {
      // Find which strings the barre covers
      const relativeFret = barreFret;
      let startString = -1;
      let endString = -1;

      for (let i = 0; i < fretPositions.length; i++) {
        if (fretPositions[i] === relativeFret) {
          if (startString === -1) startString = i;
          endString = i;
        }
      }

      if (startString !== -1 && endString !== -1 && startString !== endString) {
        const x1 = padding.left + (startString * stringSpacing);
        const x2 = padding.left + (endString * stringSpacing);
        const y = padding.top + ((relativeFret - 0.5) * fretSpacing);

        // Draw barre as rounded rectangle
        const barre = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        barre.setAttribute('x', x1 - dotRadius);
        barre.setAttribute('y', y - dotRadius);
        barre.setAttribute('width', (x2 - x1) + (dotRadius * 2));
        barre.setAttribute('height', dotRadius * 2);
        barre.setAttribute('rx', dotRadius);
        barre.setAttribute('class', 'chord-barre');
        svg.appendChild(barre);
      }
    });
  },

  /**
   * Draw finger position dots with numbers
   */
  _drawFingerDots(svg, fretPositions, fingerPositions, baseFret, padding, stringSpacing, fretSpacing, dotRadius) {
    fretPositions.forEach((fret, index) => {
      if (fret > 0) { // Skip open (0) and muted (-1) strings
        const x = padding.left + (index * stringSpacing);
        const y = padding.top + ((fret - 0.5) * fretSpacing);
        const finger = fingerPositions[index];

        // Draw dot
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', dotRadius);
        dot.setAttribute('class', 'chord-dot');
        svg.appendChild(dot);

        // Draw finger number (if specified and not 0)
        if (finger > 0) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', x);
          text.setAttribute('y', y + 4);
          text.setAttribute('class', 'chord-finger-number');
          text.textContent = finger;
          svg.appendChild(text);
        }
      }
    });
  },

  /**
   * Draw open (O) and muted (X) string markers above the nut
   */
  _drawOpenMutedMarkers(svg, fretPositions, padding, stringSpacing) {
    const markerY = padding.top - 20;
    const markerRadius = 6;

    fretPositions.forEach((fret, index) => {
      const x = padding.left + (index * stringSpacing);

      if (fret === 0) {
        // Open string - draw circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', markerY);
        circle.setAttribute('r', markerRadius);
        circle.setAttribute('class', 'chord-open');
        svg.appendChild(circle);
      } else if (fret === -1) {
        // Muted string - draw X
        const x1 = x - markerRadius;
        const x2 = x + markerRadius;
        const y1 = markerY - markerRadius;
        const y2 = markerY + markerRadius;

        const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line1.setAttribute('x1', x1);
        line1.setAttribute('y1', y1);
        line1.setAttribute('x2', x2);
        line1.setAttribute('y2', y2);
        line1.setAttribute('class', 'chord-muted');
        svg.appendChild(line1);

        const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line2.setAttribute('x1', x2);
        line2.setAttribute('y1', y1);
        line2.setAttribute('x2', x1);
        line2.setAttribute('y2', y2);
        line2.setAttribute('class', 'chord-muted');
        svg.appendChild(line2);
      }
    });
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChordDiagram;
}
