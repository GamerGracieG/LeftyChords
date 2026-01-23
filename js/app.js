/**
 * Left-Handed Guitar Chord Reference App
 * Main Application Logic
 */

const App = {
  // State
  chordData: null,
  searchMode: 'chord', // 'chord' or 'notes'
  isInitialized: false,

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Load chord database
      await this.loadChordData();

      // Initialize search modules
      ChordSearch.init(this.chordData);
      ReverseLookup.init(this.chordData);

      // Set up event listeners
      this.setupEventListeners();

      // Mark as initialized
      this.isInitialized = true;
      console.log('App initialized successfully');

      // Hide loading indicator
      this.hideLoading();

      // Focus search input
      document.getElementById('searchInput').focus();

    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load chord database. Please refresh the page.');
    }
  },

  /**
   * Load the chord database
   */
  async loadChordData() {
    const response = await fetch('data/guitar.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    this.chordData = await response.json();
    console.log(`Loaded ${Object.keys(this.chordData.chords).length} chord keys`);
  },

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', this.debounce(() => this.handleSearch(), 150));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
    });

    // Tab buttons
    const tabChord = document.getElementById('tabChord');
    const tabNotes = document.getElementById('tabNotes');

    tabChord.addEventListener('click', () => this.setSearchMode('chord'));
    tabNotes.addEventListener('click', () => this.setSearchMode('notes'));

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.addEventListener('click', () => this.clearSearch());
  },

  /**
   * Set the search mode and update UI
   */
  setSearchMode(mode) {
    if (this.searchMode === mode) return;

    this.searchMode = mode;

    // Update tab UI
    const tabChord = document.getElementById('tabChord');
    const tabNotes = document.getElementById('tabNotes');
    const searchInput = document.getElementById('searchInput');

    if (mode === 'chord') {
      tabChord.classList.add('active');
      tabChord.setAttribute('aria-selected', 'true');
      tabNotes.classList.remove('active');
      tabNotes.setAttribute('aria-selected', 'false');
      searchInput.placeholder = 'Enter chord name (e.g., Cmaj7, Am, F#dim)';
    } else {
      tabNotes.classList.add('active');
      tabNotes.setAttribute('aria-selected', 'true');
      tabChord.classList.remove('active');
      tabChord.setAttribute('aria-selected', 'false');
      searchInput.placeholder = 'Enter notes (e.g., C E G B)';
    }

    // Re-search with current query
    this.clearResults();
    const query = searchInput.value.trim();
    if (query) {
      this.handleSearch();
    }

    searchInput.focus();
  },

  /**
   * Handle search based on current mode
   */
  handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();

    if (!query) {
      this.clearResults();
      return;
    }

    if (this.searchMode === 'chord') {
      this.searchByChordName(query);
    } else {
      this.searchByNotes(query);
    }
  },

  /**
   * Search by chord name
   */
  searchByChordName(query) {
    const chord = ChordSearch.search(query);

    if (!chord) {
      this.showNoResults(`No chord found for "${query}"`);
      return;
    }

    const chordName = chord.key + (chord.suffix === 'major' ? '' : chord.suffix);
    this.displayChordResults(chord, chordName);
  },

  /**
   * Search by notes (reverse lookup)
   */
  searchByNotes(query) {
    const result = ReverseLookup.search(query);

    if (result.error) {
      this.showNoResults(result.error);
      return;
    }

    if (result.chords.length === 0) {
      const noteList = result.notes.join(', ');
      this.showNoResults(`No chords found containing exactly: ${noteList}`);
      return;
    }

    this.displayNoteSearchResults(result);
  },

  /**
   * Display chord diagram results
   */
  displayChordResults(chord, chordName) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    // Results header
    const header = document.createElement('div');
    header.className = 'results-header';
    header.innerHTML = `
      <h2>${chordName}</h2>
      <span class="position-count">${chord.positions.length} position${chord.positions.length > 1 ? 's' : ''}</span>
    `;
    resultsContainer.appendChild(header);

    // Chord grid
    const grid = document.createElement('div');
    grid.className = 'chord-grid';

    chord.positions.forEach((position, index) => {
      const card = this.createChordCard(position, chordName, index + 1);
      grid.appendChild(card);
    });

    resultsContainer.appendChild(grid);
  },

  /**
   * Display note search results
   */
  displayNoteSearchResults(result) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    // Results header
    const header = document.createElement('div');
    header.className = 'results-header';
    header.innerHTML = `
      <h2>Notes: ${result.notes.join(' ')}</h2>
      <span class="position-count">${result.chords.length} chord${result.chords.length > 1 ? 's' : ''} found</span>
    `;
    resultsContainer.appendChild(header);

    // List of matching chords
    const chordList = document.createElement('div');
    chordList.className = 'chord-list';

    result.chords.forEach(chordName => {
      const chordButton = document.createElement('button');
      chordButton.className = 'chord-button';
      chordButton.textContent = chordName;
      chordButton.addEventListener('click', () => {
        document.getElementById('searchInput').value = chordName;
        this.searchMode = 'chord';
        this.updateModeUI();
        this.searchByChordName(chordName);
      });
      chordList.appendChild(chordButton);
    });

    resultsContainer.appendChild(chordList);
  },

  /**
   * Create a chord card with diagram
   */
  createChordCard(position, chordName, positionNumber) {
    const card = document.createElement('div');
    card.className = 'chord-card';

    // Position label
    const label = document.createElement('div');
    label.className = 'chord-label';
    label.textContent = position.baseFret === 1 ? 'Open' : `Fret ${position.baseFret}`;
    card.appendChild(label);

    // Render diagram
    const diagram = ChordDiagram.render(position, chordName, true);
    card.appendChild(diagram);

    return card;
  },

  /**
   * Update mode UI elements
   */
  updateModeUI() {
    const tabChord = document.getElementById('tabChord');
    const tabNotes = document.getElementById('tabNotes');
    const searchInput = document.getElementById('searchInput');

    if (this.searchMode === 'chord') {
      tabChord.classList.add('active');
      tabChord.setAttribute('aria-selected', 'true');
      tabNotes.classList.remove('active');
      tabNotes.setAttribute('aria-selected', 'false');
      searchInput.placeholder = 'Enter chord name (e.g., Cmaj7, Am, F#dim)';
    } else {
      tabNotes.classList.add('active');
      tabNotes.setAttribute('aria-selected', 'true');
      tabChord.classList.remove('active');
      tabChord.setAttribute('aria-selected', 'false');
      searchInput.placeholder = 'Enter notes (e.g., C E G B)';
    }
  },

  /**
   * Show no results message
   */
  showNoResults(message) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
      <div class="no-results">
        <p>${message}</p>
        <p class="hint">Try a different spelling or check the chord name</p>
      </div>
    `;
  },

  /**
   * Show error message
   */
  showError(message) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
      </div>
    `;
  },

  /**
   * Clear search results
   */
  clearResults() {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
      <div class="welcome-message">
        <p>Search for a chord to see fingering diagrams</p>
        <p class="hint">All diagrams shown for left-handed players</p>
      </div>
    `;
  },

  /**
   * Clear search input and results
   */
  clearSearch() {
    document.getElementById('searchInput').value = '';
    this.clearResults();
    document.getElementById('searchInput').focus();
  },

  /**
   * Hide loading indicator
   */
  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  },

  /**
   * Debounce utility function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
