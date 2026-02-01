/**
 * Modal Component for Enlarged Chord Views
 * Features: backdrop click-to-close, escape key, focus trap, position cycling
 */

const Modal = {
  // Current state
  isOpen: false,
  chord: null,
  positions: [],
  currentPositionIndex: 0,
  previouslyFocused: null,

  // DOM elements (set during init)
  modalElement: null,
  backdropElement: null,
  contentElement: null,
  closeButton: null,
  diagramContainer: null,
  chordNameElement: null,
  positionIndicator: null,
  prevButton: null,
  nextButton: null,

  /**
   * Initialize modal - creates DOM structure
   */
  init() {
    this.createModalDOM();
    this.bindEvents();
    return this;
  },

  /**
   * Create modal DOM structure
   */
  createModalDOM() {
    // Create backdrop
    this.backdropElement = document.createElement('div');
    this.backdropElement.className = 'modal-backdrop';
    this.backdropElement.setAttribute('aria-hidden', 'true');

    // Create modal container
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'modal';
    this.modalElement.setAttribute('role', 'dialog');
    this.modalElement.setAttribute('aria-modal', 'true');
    this.modalElement.setAttribute('aria-labelledby', 'modal-chord-name');

    // Modal content structure
    this.modalElement.innerHTML = `
      <button class="modal-close" aria-label="Close modal">&times;</button>
      <h2 class="modal-chord-name" id="modal-chord-name"></h2>
      <div class="modal-diagram-container"></div>
      <div class="modal-navigation">
        <button class="modal-nav-btn modal-prev" aria-label="Previous position">&larr;</button>
        <span class="modal-position-indicator"></span>
        <button class="modal-nav-btn modal-next" aria-label="Next position">&rarr;</button>
      </div>
    `;

    // Get references to elements
    this.closeButton = this.modalElement.querySelector('.modal-close');
    this.chordNameElement = this.modalElement.querySelector('.modal-chord-name');
    this.diagramContainer = this.modalElement.querySelector('.modal-diagram-container');
    this.positionIndicator = this.modalElement.querySelector('.modal-position-indicator');
    this.prevButton = this.modalElement.querySelector('.modal-prev');
    this.nextButton = this.modalElement.querySelector('.modal-next');

    // Create wrapper
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'modal-wrapper';
    this.contentElement.appendChild(this.backdropElement);
    this.contentElement.appendChild(this.modalElement);

    // Add to document (hidden initially)
    document.body.appendChild(this.contentElement);
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Close on backdrop click
    this.backdropElement.addEventListener('click', () => this.close());

    // Close button
    this.closeButton.addEventListener('click', () => this.close());

    // Navigation buttons
    this.prevButton.addEventListener('click', () => this.prevPosition());
    this.nextButton.addEventListener('click', () => this.nextPosition());

    // Keyboard handling
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          this.close();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.prevPosition();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.nextPosition();
          break;
      }
    });

    // Touch feedback on buttons
    const addTouchFeedback = (button) => {
      button.addEventListener('touchstart', () => {
        button.classList.add('pressed');
      }, { passive: true });
      button.addEventListener('touchend', () => {
        button.classList.remove('pressed');
      }, { passive: true });
      button.addEventListener('touchcancel', () => {
        button.classList.remove('pressed');
      }, { passive: true });
    };

    addTouchFeedback(this.closeButton);
    addTouchFeedback(this.prevButton);
    addTouchFeedback(this.nextButton);
  },

  /**
   * Open modal with chord data
   * @param {Object} chord - Chord object with positions array
   * @param {string} chordName - Display name for the chord
   * @param {number} initialPosition - Position index to start at (default 0)
   */
  open(chord, chordName, initialPosition = 0) {
    if (!chord || !chord.positions || chord.positions.length === 0) {
      console.error('Invalid chord data for modal');
      return;
    }

    // Store state
    this.chord = chord;
    this.positions = chord.positions;
    this.currentPositionIndex = Math.min(initialPosition, this.positions.length - 1);
    this.previouslyFocused = document.activeElement;

    // Update content
    this.chordNameElement.textContent = chordName;
    this.renderCurrentPosition();
    this.updateNavigationState();

    // Show modal
    this.contentElement.classList.add('open');
    this.isOpen = true;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus trap - focus the close button
    this.closeButton.focus();

    // Announce to screen readers
    this.modalElement.setAttribute('aria-label', `${chordName} chord diagram, position ${this.currentPositionIndex + 1} of ${this.positions.length}`);
  },

  /**
   * Close modal
   */
  close() {
    if (!this.isOpen) return;

    this.contentElement.classList.remove('open');
    this.isOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus
    if (this.previouslyFocused) {
      this.previouslyFocused.focus();
    }

    // Clear state
    this.chord = null;
    this.positions = [];
    this.currentPositionIndex = 0;
  },

  /**
   * Navigate to previous position
   */
  prevPosition() {
    if (this.currentPositionIndex > 0) {
      this.currentPositionIndex--;
      this.renderCurrentPosition();
      this.updateNavigationState();
    }
  },

  /**
   * Navigate to next position
   */
  nextPosition() {
    if (this.currentPositionIndex < this.positions.length - 1) {
      this.currentPositionIndex++;
      this.renderCurrentPosition();
      this.updateNavigationState();
    }
  },

  /**
   * Render the current position diagram
   */
  renderCurrentPosition() {
    const position = this.positions[this.currentPositionIndex];
    this.diagramContainer.innerHTML = '';

    // Use the existing ChordDiagram renderer
    if (typeof ChordDiagram !== 'undefined') {
      // Calculate intervals if ChordDegrees is available
      let intervals = null;
      if (typeof ChordDegrees !== 'undefined' && this.chord) {
        intervals = ChordDegrees.calculateIntervals(position, this.chord.key, this.chord.suffix);
      }

      const svg = ChordDiagram.render(position, '', true, intervals);
      svg.classList.add('modal-diagram');
      this.diagramContainer.appendChild(svg);
    }

    // Update position indicator
    this.positionIndicator.textContent = `Position ${this.currentPositionIndex + 1} of ${this.positions.length}`;
  },

  /**
   * Update navigation button states
   */
  updateNavigationState() {
    // Hide nav if only one position
    const showNav = this.positions.length > 1;
    this.prevButton.style.visibility = showNav ? 'visible' : 'hidden';
    this.nextButton.style.visibility = showNav ? 'visible' : 'hidden';
    this.positionIndicator.style.visibility = showNav ? 'visible' : 'hidden';

    // Disable at bounds
    this.prevButton.disabled = this.currentPositionIndex === 0;
    this.nextButton.disabled = this.currentPositionIndex === this.positions.length - 1;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Modal;
}
