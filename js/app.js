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
  annotationMode: 'intervals', // 'intervals', 'fingering', 'clean'
  alterations: {}, // Track per-slot alterations: { slotIndex: newQuality }

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
      this.alterations = {};
      if (this.selectedProgression) {
        this.displayProgression(this.selectedProgression);
      }
    });

    // Annotation toggle
    const annotationToggle = document.getElementById('annotationToggle');
    annotationToggle.addEventListener('click', () => this.cycleAnnotationMode());

    // Close alteration popup on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.alteration-popup') && !e.target.closest('.progression-chord-name')) {
        this.closeAlterationPopup();
      }
    });
  },

  /**
   * Cycle through annotation modes: intervals → fingering → clean
   */
  cycleAnnotationMode() {
    const modes = ['intervals', 'fingering', 'clean'];
    const labels = { intervals: 'Intervals', fingering: 'Fingering', clean: 'Clean' };
    const currentIndex = modes.indexOf(this.annotationMode);
    this.annotationMode = modes[(currentIndex + 1) % modes.length];

    document.getElementById('annotationLabel').textContent = labels[this.annotationMode];
    this.refreshDiagrams();
  },

  /**
   * Get diagram render parameters based on current annotation mode
   */
  getDiagramParams(position, chord) {
    let intervals = null;
    let showFingerNumbers = true;

    if (this.annotationMode === 'intervals') {
      intervals = ChordDegrees.calculateIntervals(position, chord.key, chord.suffix);
    } else if (this.annotationMode === 'clean') {
      showFingerNumbers = false;
    }

    return { intervals, showFingerNumbers };
  },

  /**
   * Refresh all visible diagrams with current annotation mode
   */
  refreshDiagrams() {
    // Re-render current view
    if (this.searchMode === 'progressions' && this.selectedProgression) {
      this.displayProgression(this.selectedProgression);
    } else {
      // Re-trigger search to refresh diagrams
      const query = document.getElementById('searchInput').value.trim();
      if (query) {
        this.handleSearch();
      }
    }

    // Re-render modal if open
    if (Modal.isOpen) {
      Modal.renderCurrentPosition();
    }
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

    // Render diagram with current annotation mode
    const { intervals, showFingerNumbers } = this.getDiagramParams(position, chord);
    const diagram = ChordDiagram.render(position, chordName, true, intervals, showFingerNumbers);
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

        // Name and description
        const nameSpan = document.createElement('span');
        nameSpan.className = 'prog-name';
        nameSpan.textContent = prog.name;
        button.appendChild(nameSpan);

        if (prog.description) {
          const descSpan = document.createElement('span');
          descSpan.className = 'prog-description';
          descSpan.textContent = prog.description;
          button.appendChild(descSpan);
        }

        button.addEventListener('click', () => {
          this.selectedProgression = prog;
          this.alterations = {};
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

    // Title
    const title = document.createElement('h2');
    title.textContent = `${progression.name} in ${this.selectedKey}`;
    display.appendChild(title);

    // Route to appropriate renderer
    if (progression.displayMode === 'summary') {
      const resolved = Progressions.resolveProgression(progression, this.selectedKey);
      this.renderBluesSummary(display, progression, resolved);
    } else if (progression.displayMode === 'sections') {
      this.renderSections(display, progression);
    } else if (progression.displayMode === 'chart') {
      this.renderChart(display, progression);
    } else {
      const resolved = Progressions.resolveProgression(progression, this.selectedKey);
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

    // Chord names (clickable for alterations)
    const chordsDiv = document.createElement('div');
    chordsDiv.className = 'progression-chords';
    resolved.forEach((chord, index) => {
      const displayQuality = this.alterations[index] !== undefined ? this.alterations[index] : chord.quality;
      const displayName = chord.root + displayQuality;

      const span = document.createElement('span');
      span.className = 'progression-chord-name';
      span.textContent = displayName;
      span.dataset.slotIndex = index;
      span.dataset.root = chord.root;
      span.dataset.originalQuality = chord.quality;

      span.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showAlterationPopup(span, index, chord.root, chord.quality);
      });

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

    // Get unique chords accounting for alterations
    const displayedChords = resolved.map((chord, index) => {
      const quality = this.alterations[index] !== undefined ? this.alterations[index] : chord.quality;
      return { ...chord, chordName: chord.root + quality };
    });
    const unique = Progressions.getUniqueChords(displayedChords);

    unique.forEach(chord => {
      const card = this.createProgressionDiagramCard(chord.chordName);
      diagramsDiv.appendChild(card);
    });

    container.appendChild(diagramsDiv);
  },

  /**
   * Render sections display mode (Rhythm Changes)
   */
  renderSections(container, progression) {
    const sections = Progressions.resolveSections(progression, this.selectedKey);
    const allUniqueChords = [];

    Object.entries(sections).forEach(([sectionKey, section]) => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'progression-section';

      const heading = document.createElement('h3');
      heading.textContent = section.label;
      sectionDiv.appendChild(heading);

      // Numerals
      const numeralsDiv = document.createElement('div');
      numeralsDiv.className = 'progression-numerals';
      section.resolved.forEach((chord, index) => {
        const span = document.createElement('span');
        span.textContent = chord.numeral;
        numeralsDiv.appendChild(span);
        if (index < section.resolved.length - 1) {
          const sep = document.createElement('span');
          sep.className = 'progression-chord-separator';
          sep.textContent = ' - ';
          numeralsDiv.appendChild(sep);
        }
      });
      sectionDiv.appendChild(numeralsDiv);

      // Chord names (clickable)
      const chordsDiv = document.createElement('div');
      chordsDiv.className = 'progression-chords';
      section.resolved.forEach((chord, index) => {
        const slotKey = `${sectionKey}-${index}`;
        const displayQuality = this.alterations[slotKey] !== undefined ? this.alterations[slotKey] : chord.quality;
        const displayName = chord.root + displayQuality;

        const span = document.createElement('span');
        span.className = 'progression-chord-name';
        span.textContent = displayName;

        span.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showAlterationPopup(span, slotKey, chord.root, chord.quality);
        });

        chordsDiv.appendChild(span);
        if (index < section.resolved.length - 1) {
          const sep = document.createElement('span');
          sep.className = 'progression-chord-separator';
          sep.textContent = ' - ';
          chordsDiv.appendChild(sep);
        }

        // Collect for unique chords
        allUniqueChords.push({ ...chord, chordName: displayName });
      });
      sectionDiv.appendChild(chordsDiv);

      container.appendChild(sectionDiv);
    });

    // Combined unique chord diagrams
    const unique = Progressions.getUniqueChords(allUniqueChords);
    const diagramsDiv = document.createElement('div');
    diagramsDiv.className = 'progression-diagrams';
    unique.forEach(chord => {
      const card = this.createProgressionDiagramCard(chord.chordName);
      diagramsDiv.appendChild(card);
    });
    container.appendChild(diagramsDiv);
  },

  /**
   * Render chart display mode (Bird Blues)
   */
  renderChart(container, progression) {
    const resolvedBars = Progressions.resolveChart(progression, this.selectedKey);

    // Chart heading
    const heading = document.createElement('h3');
    heading.textContent = '12-Bar Structure';
    heading.style.textAlign = 'center';
    heading.style.marginBottom = 'var(--spacing-md)';
    container.appendChild(heading);

    // Grid
    const gridDiv = document.createElement('div');
    gridDiv.className = 'chart-grid';

    for (let row = 0; row < 3; row++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'chart-grid-row';

      for (let col = 0; col < 4; col++) {
        const barIndex = row * 4 + col;
        const bar = resolvedBars[barIndex];
        const cell = document.createElement('div');
        cell.className = 'chart-grid-cell';
        cell.textContent = bar.map(c => c.chordName).join('  ');
        rowDiv.appendChild(cell);
      }

      gridDiv.appendChild(rowDiv);
    }

    container.appendChild(gridDiv);

    // Unique chord diagrams
    const unique = Progressions.getUniqueChordsFromChart(resolvedBars);
    const diagramsDiv = document.createElement('div');
    diagramsDiv.className = 'progression-diagrams';
    unique.forEach(chord => {
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
    const qualities = progression.qualities;
    for (let row = 0; row < 3; row++) {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'blues-grid-row';
      for (let col = 0; col < 4; col++) {
        const idx = row * 4 + col;
        const numeral = bars[idx];
        const quality = qualities[numeral] || '';
        const cell = document.createElement('span');
        cell.className = 'blues-grid-cell';
        cell.textContent = `| ${numeral}${quality} |`;
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
   * Show alteration popup for a chord slot
   */
  showAlterationPopup(anchorElement, slotKey, root, originalQuality) {
    // Close any existing popup
    this.closeAlterationPopup();

    const alterations = Progressions.getAlterations(originalQuality);
    if (alterations.length <= 1) return; // No alternatives available

    const popup = document.createElement('div');
    popup.className = 'alteration-popup';

    const currentQuality = this.alterations[slotKey] !== undefined ? this.alterations[slotKey] : originalQuality;

    alterations.forEach(quality => {
      const btn = document.createElement('button');
      btn.className = 'alteration-option';
      btn.textContent = root + (quality || 'maj');
      if (quality === currentQuality) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (quality === originalQuality) {
          delete this.alterations[slotKey];
        } else {
          this.alterations[slotKey] = quality;
        }
        this.closeAlterationPopup();
        this.displayProgression(this.selectedProgression);
      });

      popup.appendChild(btn);
    });

    // Position popup relative to anchor
    const rect = anchorElement.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = `${Math.max(8, rect.left)}px`;

    // Show above or below depending on space
    if (rect.top > window.innerHeight / 2) {
      popup.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    } else {
      popup.style.top = `${rect.bottom + 4}px`;
    }

    document.body.appendChild(popup);

    // Ensure popup doesn't overflow right edge
    requestAnimationFrame(() => {
      const popupRect = popup.getBoundingClientRect();
      if (popupRect.right > window.innerWidth - 8) {
        popup.style.left = `${window.innerWidth - popupRect.width - 8}px`;
      }
    });
  },

  /**
   * Close any open alteration popup
   */
  closeAlterationPopup() {
    const existing = document.querySelector('.alteration-popup');
    if (existing) {
      existing.remove();
    }
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
      const { intervals, showFingerNumbers } = this.getDiagramParams(position, chord);
      const diagram = ChordDiagram.render(position, chordName, true, intervals, showFingerNumbers);
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
