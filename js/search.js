/**
 * Chord Name Search Module
 * Handles parsing and searching for chords by name
 */

const ChordSearch = {
  // Chord database reference (set during initialization)
  chordData: null,

  // Note name normalization - normalizes all input to FLAT notation (jazz convention)
  NOTE_ALIASES: {
    'C': 'C', 'C#': 'Db', 'DB': 'Db', 'Db': 'Db',
    'D': 'D', 'D#': 'Eb', 'EB': 'Eb', 'Eb': 'Eb',
    'E': 'E', 'E#': 'F', 'FB': 'E', 'Fb': 'E',
    'F': 'F', 'F#': 'Gb', 'GB': 'Gb', 'Gb': 'Gb',
    'G': 'G', 'G#': 'Ab', 'AB': 'Ab', 'Ab': 'Ab',
    'A': 'A', 'A#': 'Bb', 'BB': 'Bb', 'Bb': 'Bb',
    'B': 'B', 'B#': 'C', 'CB': 'B', 'Cb': 'B'
  },

  // Display keys in flat notation (jazz convention)
  DISPLAY_KEYS: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],

  // Map normalized notes to actual database object keys
  // Database uses "Csharp" and "Fsharp" but we normalize to flats
  DATABASE_KEY_MAP: {
    'C': 'C',
    'Db': 'Csharp',
    'D': 'D',
    'Eb': 'Eb',
    'E': 'E',
    'F': 'F',
    'Gb': 'Fsharp',
    'G': 'G',
    'Ab': 'Ab',
    'A': 'A',
    'Bb': 'Bb',
    'B': 'B'
  },

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
   * Get the database key for a normalized note
   * @param {string} note - Normalized note (e.g., 'Db', 'Gb')
   * @returns {string} - Database key (e.g., 'Csharp', 'Fsharp')
   */
  getDatabaseKey(note) {
    return this.DATABASE_KEY_MAP[note] || note;
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

    // Map normalized root to database key
    const dbKey = this.getDatabaseKey(root);

    // Find the chord in the database
    const keyChords = this.chordData.chords[dbKey];
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
   * Check if a suffix matches the user's typed suffix
   * Handles the m/maj ambiguity: "m" means minor, not major
   * @param {string} dbSuffix - Database suffix (e.g., "minor", "m7", "maj7")
   * @param {string} rawSuffix - What user typed (e.g., "m", "m7", "maj")
   * @returns {boolean} - True if this suffix should be suggested
   */
  suffixMatches(dbSuffix, rawSuffix) {
    if (rawSuffix === '') return true; // Empty suffix matches all

    const raw = rawSuffix.toLowerCase();
    const db = dbSuffix.toLowerCase();

    // Special case: user typed "m" but not "ma" - means MINOR, not major
    // Should match: minor, m6, m7, m9, m7b5, mmaj7, etc.
    // Should NOT match: maj7, maj9, major
    if (raw === 'm' || (raw.startsWith('m') && !raw.startsWith('ma'))) {
      // Must be a minor-related suffix
      if (db === 'minor' || (db.startsWith('m') && !db.startsWith('maj'))) {
        // Now check if it matches the typed prefix
        // "m" should match "minor", "m7", "m9", "mmaj7", etc.
        if (raw === 'm') {
          return db === 'minor' || db.startsWith('m');
        }
        // "m7" should match "m7", "m7b5", etc.
        return db.startsWith(raw) || db === 'minor' && raw === 'm';
      }
      return false;
    }

    // Normal prefix matching for everything else
    return db.startsWith(raw);
  },

  /**
   * Get suggestions for partial chord names (matches from START of chord name only)
   * @param {string} partial - Partial chord name
   * @returns {Array} - Array of matching chord names with display root (flat notation)
   */
  getSuggestions(partial) {
    if (!this.chordData || !partial) return [];

    // Parse to get the root, but extract raw suffix from input
    const parsed = this.parseChordName(partial);
    if (!parsed) return [];

    const { root } = parsed;

    // Extract the raw suffix from input (what user actually typed)
    // Don't use parsed.suffix since it normalizes '' to 'major'
    let rawSuffix = '';
    const trimmed = partial.trim();
    if (trimmed.length > 1) {
      // Find where the root ends
      let rootEnd = 1;
      if (trimmed.length > 1 && (trimmed[1] === '#' || trimmed[1] === 'b' ||
          trimmed[1] === '♯' || trimmed[1] === '♭')) {
        rootEnd = 2;
      }
      rawSuffix = trimmed.slice(rootEnd);
    }

    const suggestions = [];

    // Map normalized root to database key
    const dbKey = this.getDatabaseKey(root);

    // Get all chords for this root
    const keyChords = this.chordData.chords[dbKey];
    if (!keyChords) return [];

    // Filter by suffix using smart matching
    keyChords.forEach(chord => {
      if (this.suffixMatches(chord.suffix, rawSuffix)) {
        // Build display name with flat notation root
        const displaySuffix = chord.suffix === 'major' ? '' : chord.suffix;
        suggestions.push(`${root}${displaySuffix}`);
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
   * Get all available root notes in flat notation
   * @returns {Array} - Array of available root notes
   */
  getAvailableRoots() {
    return this.DISPLAY_KEYS;
  },

  /**
   * Get the display name for a chord (uses flat notation)
   * @param {string} root - Root note
   * @param {string} suffix - Chord suffix
   * @returns {string} - Display name like "Dbmaj7"
   */
  getDisplayName(root, suffix) {
    const displayRoot = this.NOTE_ALIASES[root] || root;
    return `${displayRoot}${suffix === 'major' ? '' : suffix}`;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChordSearch;
}
