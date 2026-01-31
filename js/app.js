/**
 * Left-Handed Guitar Chord Reference App
 * Main Application Logic
 */

const App = {
  // State
  chordData: null,
  searchMode: 'chord', // 'chord', 'notes', or 'progressions'
  isInitialized: false,
  selectedProgression: null,
  selectedKey: 'C',

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

      // Initialize modal
      Modal.init();

      // Initialize autocomplete for chord search
      const searchInput = document.getElementById('searchInput');
      Autocomplete.init(searchInput, (chordName) => {
        // When a suggestion is selected, search for it
        this.searchByChordName(chordName);
      });

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
    const tabProgressions = document.getElementById('tabProgressions');

    tabChord.addEventListener('click', () => this.setSearchMode('chord'));
    tabNotes.addEventListener('click', () => this.setSearchMode('notes'));
    tabProgressions.addEventListener('click', () => this.setSearchMode('progressions'));

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.addEventListener('click', () => this.clearSearch());

    // Key selector
    const keySelect = document.getElementById('keySelect');
    keySelect.addEventListener('change', (e) => {
      this.selectedKey = e.target.value;
      if (this.selectedProgression) {
        this.displayProgression(this.selectedProgression);
      }
    });
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
    const tabProgressions = document.getElementById('tabProgressions');
    const searchPanel = document.getElementById('searchPanel');
    const progressionsPanel = document.getElementById('progressionsPanel');
    const searchInput = document.getElementById('searchInput');

    // Close autocomplete when switching modes
    Autocomplete.close();

    // Reset all tabs
    [tabChord, tabNotes, tabProgressions].forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });

    if (mode === 'chord') {
      tabChord.classList.add('active');
      tabChord.setAttribute('aria-selected', 'true');
      searchPanel.style.display = '';
      progressionsPanel.style.display = 'none';
      searchInput.placeholder = 'Enter chord name (e.g., Cmaj7, Am, F#dim)';
      this.clearResults();
      const query = searchInput.value.trim();
      if (query) {
        this.handleSearch();
      }
      searchInput.focus();
    } else if (mode === 'notes') {
      tabNotes.classList.add('active');
      tabNotes.setAttribute('aria-selected', 'true');
      searchPanel.style.display = '';
      progressionsPanel.style.display = 'none';
      searchInput.placeholder = 'Enter notes (e.g., C E G B)';
      this.clearResults();
      const query = searchInput.value.trim();
      if (query) {
        this.handleSearch();
      }
      searchInput.focus();
    } else if (mode === 'progressions') {
      tabProgressions.classList.add('active');
      tabProgressions.setAttribute('aria-selected', 'true');
      searchPanel.style.display = 'none';
      progressionsPanel.style.display = '';
      this.displayProgressionSelector();
    }
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
      const card = this.createChordCard(position, chordName, index, chord);
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
   * @param {Object} position - Single position data
   * @param {string} chordName - Display name of the chord
   * @param {number} positionIndex - Index of this position in chord.positions
   * @param {Object} chord - Full chord object with all positions
   */
  createChordCard(position, chordName, positionIndex, chord) {
    const card = document.createElement('div');
    card.className = 'chord-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${chordName}, position ${positionIndex + 1}. Click to enlarge.`);

    // Position label
    const label = document.createElement('div');
    label.className = 'chord-label';
    label.textContent = position.baseFret === 1 ? 'Open' : `Fret ${position.baseFret}`;
    card.appendChild(label);

    // Calculate interval labels
    const intervals = ChordDegrees.calculateIntervals(position, chord.key, chord.suffix);

    // Render diagram with intervals
    const diagram = ChordDiagram.render(position, chordName, true, intervals);
    card.appendChild(diagram);

    // Click to open modal
    const openModal = () => {
      Modal.open(chord, chordName, positionIndex);
    };

    card.addEventListener('click', openModal);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });

    return card;
  },

  /**
   * Update mode UI elements
   */
  updateModeUI() {
    const tabChord = document.getElementById('tabChord');
    const tabNotes = document.getElementById('tabNotes');
    const tabProgressions = document.getElementById('tabProgressions');
    const searchPanel = document.getElementById('searchPanel');
    const progressionsPanel = document.getElementById('progressionsPanel');
    const searchInput = document.getElementById('searchInput');

    // Reset all tabs
    [tabChord, tabNotes, tabProgressions].forEach(tab => {
      tab.classList.remove('active');
      tab.setAttribute('aria-selected', 'false');
    });

    if (this.searchMode === 'chord') {
      tabChord.classList.add('active');
      tabChord.setAttribute('aria-selected', 'true');
      searchPanel.style.display = '';
      progressionsPanel.style.display = 'none';
      searchInput.placeholder = 'Enter chord name (e.g., Cmaj7, Am, F#dim)';
    } else if (this.searchMode === 'notes') {
      tabNotes.classList.add('active');
      tabNotes.setAttribute('aria-selected', 'true');
      searchPanel.style.display = '';
      progressionsPanel.style.display = 'none';
      searchInput.placeholder = 'Enter notes (e.g., C E G B)';
    } else if (this.searchMode === 'progressions') {
      tabProgressions.classList.add('active');
      tabProgressions.setAttribute('aria-selected', 'true');
      searchPanel.style.display = 'none';
      progressionsPanel.style.display = '';
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
   * Display the progression selector UI
   */
  displayProgressionSelector() {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    // Get progressions by category
    const categories = Progressions.getByCategory();

    // Create categories container
    const categoriesDiv = document.createElement('div');
    categoriesDiv.className = 'progression-categories';

    // Render each category
    Object.entries(categories).forEach(([catId, category]) => {
      if (category.progressions.length === 0) return;

      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'progression-category';

      const heading = document.createElement('h3');
      heading.textContent = category.name;
      categoryDiv.appendChild(heading);

      const list = document.createElement('div');
      list.className = 'progression-list';

      category.progressions.forEach(prog => {
        const button = document.createElement('button');
        button.className = 'progression-button';
        if (this.selectedProgression && this.selectedProgression.id === prog.id) {
          button.classList.add('active');
        }
        button.textContent = prog.name;
        button.addEventListener('click', () => {
          this.selectedProgression = prog;
          this.displayProgression(prog);
          // Update active state on buttons
          document.querySelectorAll('.progression-button').forEach(btn => {
            btn.classList.remove('active');
          });
          button.classList.add('active');
        });
        list.appendChild(button);
      });

      categoryDiv.appendChild(list);
      categoriesDiv.appendChild(categoryDiv);
    });

    resultsContainer.appendChild(categoriesDiv);

    // If a progression was previously selected, display it
    if (this.selectedProgression) {
      this.displayProgression(this.selectedProgression);
    }
  },

  /**
   * Display a progression with resolved chords
   */
  displayProgression(progression) {
    // Remove any existing progression display
    const existing = document.querySelector('.progression-display');
    if (existing) {
      existing.remove();
    }

    const resultsContainer = document.getElementById('results');

    // Create progression display
    const display = document.createElement('div');
    display.className = 'progression-display';

    // Resolve chords in current key
    const resolved = Progressions.resolveProgression(progression, this.selectedKey);

    // Title
    const title = document.createElement('h2');
    title.textContent = `${progression.name} in ${this.selectedKey}`;
    display.appendChild(title);

    // Check for blues summary mode
    if (progression.displayMode === 'summary') {
      this.renderBluesSummary(display, progression, resolved);
    } else {
      this.renderProgressionNormal(display, progression, resolved);
    }

    resultsContainer.appendChild(display);
  },

  /**
   * Render normal progression view
   */
  renderProgressionNormal(container, progression, resolved) {
    // Roman numerals
    const numeralsDiv = document.createElement('div');
    numeralsDiv.className = 'progression-numerals';
    resolved.forEach((chord, index) => {
      const span = document.createElement('span');
      span.textContent = chord.numeral;
      numeralsDiv.appendChild(span);
      if (index < resolved.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'progression-chord-separator';
        sep.textContent = ' - ';
        numeralsDiv.appendChild(sep);
      }
    });
    container.appendChild(numeralsDiv);

    // Chord names
    const chordsDiv = document.createElement('div');
    chordsDiv.className = 'progression-chords';
    resolved.forEach((chord, index) => {
      const span = document.createElement('span');
      span.textContent = chord.chordName;
      chordsDiv.appendChild(span);
      if (index < resolved.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'progression-chord-separator';
        sep.textContent = ' - ';
        chordsDiv.appendChild(sep);
      }
    });
    container.appendChild(chordsDiv);

    // Chord diagrams
    const diagramsDiv = document.createElement('div');
    diagramsDiv.className = 'progression-diagrams';

    resolved.forEach(chord => {
      const card = this.createProgressionDiagramCard(chord.chordName);
      diagramsDiv.appendChild(card);
    });

    container.appendChild(diagramsDiv);
  },

  /**
   * Render blues summary view
   */
  renderBluesSummary(container, progression, resolved) {
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'blues-summary';

    const heading = document.createElement('h3');
    heading.textContent = '12-Bar Structure';
    summaryDiv.appendChild(heading);

    // Create grid representation
    const gridDiv = document.createElement('div');
    gridDiv.className = 'blues-grid';

    // 12 bars in 3 rows of 4
    const bars = progression.numerals;
    for (let row = 0; row < 3; row++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'blues-grid-row';
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        const cell = document.createElement('span');
        cell.className = 'blues-grid-cell';
        cell.textContent = `| ${bars[idx]}7 |`;
        rowDiv.appendChild(cell);
      }
      gridDiv.appendChild(rowDiv);
    }
    summaryDiv.appendChild(gridDiv);
    container.appendChild(summaryDiv);

    // Get unique chords
    const unique = Progressions.getUniqueChords(resolved);

    // Chord diagrams (unique only)
    const diagramsDiv = document.createElement('div');
    diagramsDiv.className = 'progression-diagrams';

    unique.forEach(chord => {
      const card = this.createProgressionDiagramCard(chord.chordName);
      diagramsDiv.appendChild(card);
    });

    container.appendChild(diagramsDiv);
  },

  /**
   * Create a small chord diagram card for progression display
   */
  createProgressionDiagramCard(chordName) {
    const card = document.createElement('div');
    card.className = 'progression-diagram-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    // Chord name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'chord-name';
    nameLabel.textContent = chordName;
    card.appendChild(nameLabel);

    // Look up chord in database
    const chord = Progressions.lookupChord(chordName, this.chordData);

    if (chord && chord.positions && chord.positions.length > 0) {
      const position = chord.positions[0]; // First position
      const intervals = ChordDegrees.calculateIntervals(position, chord.key, chord.suffix);
      const diagram = ChordDiagram.render(position, chordName, true, intervals);
      card.appendChild(diagram);

      // Click to open modal
      const openModal = () => {
        Modal.open(chord, chordName, 0);
      };

      card.addEventListener('click', openModal);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal();
        }
      });
    } else {
      // Diagram unavailable
      const placeholder = document.createElement('div');
      placeholder.className = 'diagram-unavailable';
      placeholder.textContent = 'Diagram unavailable';
      card.appendChild(placeholder);
    }

    return card;
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
