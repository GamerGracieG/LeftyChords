/**
 * Chord Name Search Module
 * Handles parsing and searching for chords by name
 */

const ChordSearch = {
  // Chord database reference (set during initialization)
  chordData: null,

  // Note name normalization (handles sharps/flats)
  NOTE_ALIASES: {
    'C': 'C', 'C#': 'C#', 'DB': 'C#', 'Db': 'C#',
    'D': 'D', 'D#': 'Eb', 'EB': 'Eb', 'Eb': 'Eb',
    'E': 'E', 'E#': 'F', 'FB': 'E', 'Fb': 'E',
    'F': 'F', 'F#': 'F#', 'GB': 'F#', 'Gb': 'F#',
    'G': 'G', 'G#': 'Ab', 'AB': 'Ab', 'Ab': 'Ab',
    'A': 'A', 'A#': 'Bb', 'BB': 'Bb', 'Bb': 'Bb',
    'B': 'B', 'B#': 'C', 'CB': 'B', 'Cb': 'B'
  },

  // Map database keys to their normalized forms
  DATABASE_KEYS: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],

  // Common suffix aliases
  SUFFIX_ALIASES: {
    // Major variations
    '': 'major',
    'M': 'major',
    'maj': 'major',
    'MAJ': 'major',
    'major': 'major',
    'Major': 'major',
    'MAJOR': 'major',

    // Minor variations
    'm': 'minor',
    'min': 'minor',
    'MIN': 'minor',
    '-': 'minor',
    'minor': 'minor',
    'Minor': 'minor',
    'MINOR': 'minor',

    // Diminished
    'dim': 'dim',
    'o': 'dim',
    '°': 'dim',
    'diminished': 'dim',

    // Diminished 7
    'dim7': 'dim7',
    'o7': 'dim7',
    '°7': 'dim7',

    // Augmented
    'aug': 'aug',
    '+': 'aug',
    'augmented': 'aug',

    // Suspended
    'sus': 'sus4',
    'sus4': 'sus4',
    'sus2': 'sus2',
    'suspended': 'sus4',
    'suspended4': 'sus4',
    'suspended2': 'sus2',

    // 7th variations
    '7': '7',
    'dom7': '7',
    'dominant7': '7',
    'dominant': '7',

    // Major 7th
    'maj7': 'maj7',
    'M7': 'maj7',
    'major7': 'maj7',
    'Δ7': 'maj7',
    'Δ': 'maj7',

    // Minor 7th
    'm7': 'm7',
    'min7': 'm7',
    'minor7': 'm7',
    '-7': 'm7',

    // Other common ones
    'm7b5': 'm7b5',
    'ø': 'm7b5',
    'ø7': 'm7b5',
    'half-dim': 'm7b5',
    'half-diminished': 'm7b5',

    // 9ths
    '9': '9',
    'maj9': 'maj9',
    'm9': 'm9',
    'min9': 'm9',

    // 6ths
    '6': '6',
    'maj6': '6',
    'm6': 'm6',
    'min6': 'm6',

    // Add chords
    'add9': 'add9',
    'add2': 'add9',
    'madd9': 'madd9',

    // Power chord
    '5': '5',
    'power': '5',

    // 69
    '69': '69',
    '6/9': '69',

    // 11ths and 13ths
    '11': '11',
    '13': '13',
    'maj11': 'maj11',
    'maj13': 'maj13',
    'm11': 'm11'
  },

  /**
   * Initialize with chord data
   */
  init(chordData) {
    this.chordData = chordData;
    return this;
  },

  /**
   * Parse a chord name into root and suffix
   * @param {string} input - User input like "Cmaj7" or "F#m"
   * @returns {Object} - { root: 'C', suffix: 'maj7' } or null
   */
  parseChordName(input) {
    if (!input || typeof input !== 'string') return null;

    // Clean and normalize input
    let chord = input.trim();
    if (chord.length === 0) return null;

    // Extract root note (first 1-2 characters)
    let root = chord[0].toUpperCase();
    let suffixStart = 1;

    // Check for sharp or flat
    if (chord.length > 1) {
      const modifier = chord[1];
      if (modifier === '#' || modifier === '♯') {
        root += '#';
        suffixStart = 2;
      } else if (modifier === 'b' || modifier === '♭') {
        // Be careful: 'b' could be part of suffix like "Cb" or could be note "B"
        // Only treat as flat if followed by something else or it's explicitly flat
        if (chord.length === 2 || !/[a-gA-G]/.test(chord[0])) {
          root += 'b';
          suffixStart = 2;
        } else {
          // It's a flat modifier
          root += 'b';
          suffixStart = 2;
        }
      }
    }

    // Normalize root note to database format
    const normalizedRoot = this.NOTE_ALIASES[root];
    if (!normalizedRoot) {
      return null;
    }

    // Extract and normalize suffix
    let suffix = chord.slice(suffixStart).trim();

    // Handle space-separated suffixes like "C major 7"
    suffix = suffix.replace(/\s+/g, '');

    // Try to find the suffix in aliases
    let normalizedSuffix = this.SUFFIX_ALIASES[suffix];

    // If not found directly, try lowercase
    if (!normalizedSuffix) {
      normalizedSuffix = this.SUFFIX_ALIASES[suffix.toLowerCase()];
    }

    // If still not found, check if it exists in the database directly
    if (!normalizedSuffix && this.chordData) {
      if (this.chordData.suffixes.includes(suffix)) {
        normalizedSuffix = suffix;
      } else if (this.chordData.suffixes.includes(suffix.toLowerCase())) {
        normalizedSuffix = suffix.toLowerCase();
      }
    }

    // Default to major if empty suffix
    if (!normalizedSuffix && suffix === '') {
      normalizedSuffix = 'major';
    }

    return {
      root: normalizedRoot,
      suffix: normalizedSuffix || suffix
    };
  },

  /**
   * Search for a chord by name
   * @param {string} query - Chord name to search for
   * @returns {Object|null} - Chord data with positions or null
   */
  search(query) {
    if (!this.chordData) {
      console.error('ChordSearch not initialized with chord data');
      return null;
    }

    const parsed = this.parseChordName(query);
    if (!parsed) return null;

    const { root, suffix } = parsed;

    // Find the chord in the database
    const keyChords = this.chordData.chords[root];
    if (!keyChords) return null;

    // Find matching suffix
    const chord = keyChords.find(c => c.suffix === suffix);
    if (!chord) {
      // Try a case-insensitive search
      const chordLower = keyChords.find(c => c.suffix.toLowerCase() === suffix.toLowerCase());
      return chordLower || null;
    }

    return chord;
  },

  /**
   * Get suggestions for partial chord names
   * @param {string} partial - Partial chord name
   * @returns {Array} - Array of matching chord names
   */
  getSuggestions(partial) {
    if (!this.chordData || !partial) return [];

    const parsed = this.parseChordName(partial);
    if (!parsed) return [];

    const { root, suffix } = parsed;
    const suggestions = [];

    // Get all chords for this root
    const keyChords = this.chordData.chords[root];
    if (!keyChords) return [];

    // Filter by suffix prefix
    keyChords.forEach(chord => {
      if (chord.suffix.toLowerCase().startsWith(suffix.toLowerCase()) || suffix === '') {
        suggestions.push(`${root}${chord.suffix === 'major' ? '' : chord.suffix}`);
      }
    });

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  },

  /**
   * Get all available suffixes
   * @returns {Array} - Array of available chord suffixes
   */
  getAvailableSuffixes() {
    return this.chordData ? this.chordData.suffixes : [];
  },

  /**
   * Get all available root notes
   * @returns {Array} - Array of available root notes
   */
  getAvailableRoots() {
    return this.chordData ? this.chordData.keys : [];
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChordSearch;
}
