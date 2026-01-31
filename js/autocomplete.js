/**
 * Autocomplete UI Component
 * Provides dropdown suggestions for chord search input
 */

const Autocomplete = {
  // DOM elements
  inputElement: null,
  dropdownElement: null,
  wrapperElement: null,

  // State
  isOpen: false,
  suggestions: [],
  selectedIndex: -1,
  onSelect: null,

  /**
   * Initialize autocomplete for a search input
   * @param {HTMLInputElement} inputElement - The search input element
   * @param {Function} onSelect - Callback when a suggestion is selected (receives chord name)
   */
  init(inputElement, onSelect) {
    this.inputElement = inputElement;
    this.onSelect = onSelect;

    this.createDropdown();
    this.bindEvents();

    return this;
  },

  /**
   * Create the dropdown DOM element
   */
  createDropdown() {
    // Get the wrapper element (parent of input)
    this.wrapperElement = this.inputElement.parentElement;
    this.wrapperElement.style.position = 'relative';

    // Create dropdown
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'autocomplete-dropdown';
    this.dropdownElement.setAttribute('role', 'listbox');
    this.dropdownElement.setAttribute('aria-label', 'Chord suggestions');

    // Insert after input wrapper
    this.wrapperElement.appendChild(this.dropdownElement);
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Input events
    this.inputElement.addEventListener('input', () => this.handleInput());
    this.inputElement.addEventListener('focus', () => this.handleFocus());
    this.inputElement.addEventListener('blur', (e) => this.handleBlur(e));

    // Keyboard navigation
    this.inputElement.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.wrapperElement.contains(e.target)) {
        this.close();
      }
    });
  },

  /**
   * Handle input changes
   */
  handleInput() {
    const value = this.inputElement.value.trim();

    if (!value) {
      this.close();
      return;
    }

    // Only show autocomplete for chord name search mode
    if (typeof App !== 'undefined' && App.searchMode !== 'chord') {
      this.close();
      return;
    }

    // Get suggestions from ChordSearch
    if (typeof ChordSearch !== 'undefined') {
      this.suggestions = ChordSearch.getSuggestions(value);
      this.selectedIndex = -1;

      if (this.suggestions.length > 0) {
        this.render();
        this.open();
      } else {
        this.renderNoResults();
        this.open();
      }
    }
  },

  /**
   * Handle input focus
   */
  handleFocus() {
    const value = this.inputElement.value.trim();
    if (value && this.suggestions.length > 0) {
      this.open();
    }
  },

  /**
   * Handle input blur
   */
  handleBlur(e) {
    // Delay close to allow click on dropdown items
    setTimeout(() => {
      if (!this.dropdownElement.contains(document.activeElement)) {
        this.close();
      }
    }, 150);
  },

  /**
   * Handle keyboard navigation
   */
  handleKeydown(e) {
    if (!this.isOpen) {
      if (e.key === 'ArrowDown' && this.inputElement.value.trim()) {
        e.preventDefault();
        this.handleInput();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;

      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
          this.selectItem(this.suggestions[this.selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        this.close();
        break;

      case 'Tab':
        this.close();
        break;
    }
  },

  /**
   * Select next item in list
   */
  selectNext() {
    if (this.suggestions.length === 0) return;

    this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
    this.updateSelection();
  },

  /**
   * Select previous item in list
   */
  selectPrevious() {
    if (this.suggestions.length === 0) return;

    this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
    this.updateSelection();
  },

  /**
   * Update visual selection state
   */
  updateSelection() {
    const items = this.dropdownElement.querySelectorAll('.autocomplete-item');
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');
        // Scroll into view if needed
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
        item.setAttribute('aria-selected', 'false');
      }
    });
  },

  /**
   * Select an item
   */
  selectItem(chordName) {
    this.inputElement.value = chordName;
    this.close();

    if (this.onSelect) {
      this.onSelect(chordName);
    }
  },

  /**
   * Render suggestions
   */
  render() {
    this.dropdownElement.innerHTML = '';

    this.suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.textContent = suggestion;

      // Mouse/touch events
      item.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent blur
        this.selectItem(suggestion);
      });

      item.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateSelection();
      });

      this.dropdownElement.appendChild(item);
    });
  },

  /**
   * Render no results message
   */
  renderNoResults() {
    this.dropdownElement.innerHTML = `
      <div class="autocomplete-no-results">No chords found</div>
    `;
  },

  /**
   * Open dropdown
   */
  open() {
    this.isOpen = true;
    this.dropdownElement.classList.add('open');
    this.inputElement.setAttribute('aria-expanded', 'true');
  },

  /**
   * Close dropdown
   */
  close() {
    this.isOpen = false;
    this.dropdownElement.classList.remove('open');
    this.inputElement.setAttribute('aria-expanded', 'false');
    this.selectedIndex = -1;
  },

  /**
   * Clear and reset
   */
  clear() {
    this.suggestions = [];
    this.selectedIndex = -1;
    this.close();
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Autocomplete;
}
