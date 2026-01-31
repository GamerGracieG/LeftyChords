/**
 * Progressions Module
 * Handles chord progression data and key-based chord resolution
 */

const Progressions = {
  /**
   * Display keys in flat notation (jazz convention)
   */
  KEYS: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],

  /**
   * Semitones from root for each scale degree
   */
  INTERVALS: {
    'I': 0,
    'ii': 2,
    'iii': 4,
    'IV': 5,
    'V': 7,
    'vi': 9,
    'vii': 11,
    'VII': 11,
    'VI': 9,  // For rhythm changes (dominant, not minor)
    'bVII': 10,
    'bIII': 3,
    'bVI': 8,
    'i': 0,   // Minor tonic
    'iv': 5   // Minor subdominant
  },

  /**
   * Progression definitions
   */
  PROGRESSIONS: {
    "ii-V-I": {
      id: "ii-V-I",
      name: "ii-V-I",
      numerals: ["ii", "V", "I"],
      qualities: { "ii": "m7", "V": "7", "I": "maj7" },
      category: "jazz"
    },
    "minor-ii-V-i": {
      id: "minor-ii-V-i",
      name: "Minor ii-V-i",
      numerals: ["ii", "V", "i"],
      qualities: { "ii": "m7b5", "V": "7", "i": "m7" },
      category: "jazz"
    },
    "turnaround": {
      id: "turnaround",
      name: "Turnaround",
      numerals: ["I", "vi", "ii", "V"],
      qualities: { "I": "maj7", "vi": "m7", "ii": "m7", "V": "7" },
      category: "jazz"
    },
    "full-turnaround": {
      id: "full-turnaround",
      name: "Full Turnaround",
      numerals: ["iii", "vi", "ii", "V"],
      qualities: { "iii": "m7", "vi": "m7", "ii": "m7", "V": "7" },
      category: "jazz"
    },
    "rhythm-changes-a": {
      id: "rhythm-changes-a",
      name: "Rhythm Changes (A section)",
      numerals: ["I", "VI", "ii", "V"],
      qualities: { "I": "maj7", "VI": "7", "ii": "m7", "V": "7" },
      category: "jazz"
    },
    "12-bar-blues": {
      id: "12-bar-blues",
      name: "12-Bar Blues",
      numerals: ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"],
      qualities: { "I": "7", "IV": "7", "V": "7" },
      category: "blues",
      displayMode: "summary"
    },
    "I-IV-V": {
      id: "I-IV-V",
      name: "I-IV-V",
      numerals: ["I", "IV", "V"],
      qualities: { "I": "", "IV": "", "V": "" },
      category: "basic"
    },
    "I-V-vi-IV": {
      id: "I-V-vi-IV",
      name: "I-V-vi-IV",
      numerals: ["I", "V", "vi", "IV"],
      qualities: { "I": "", "V": "", "vi": "m", "IV": "" },
      category: "pop"
    }
  },

  /**
   * Get all progressions grouped by category
   * @returns {Object} - Progressions organized by category
   */
  getByCategory() {
    const categories = {
      jazz: { name: 'Jazz', progressions: [] },
      blues: { name: 'Blues', progressions: [] },
      basic: { name: 'Basic', progressions: [] },
      pop: { name: 'Pop', progressions: [] }
    };

    Object.values(this.PROGRESSIONS).forEach(prog => {
      const cat = prog.category || 'basic';
      if (categories[cat]) {
        categories[cat].progressions.push(prog);
      }
    });

    return categories;
  },

  /**
   * Get a progression by ID
   * @param {string} id - Progression ID
   * @returns {Object|null} - Progression object or null
   */
  getById(id) {
    return this.PROGRESSIONS[id] || null;
  },

  /**
   * Resolve a numeral to a chord root in a given key
   * @param {string} numeral - Roman numeral (e.g., "ii", "V", "I")
   * @param {string} key - Key name (e.g., "C", "Db", "G")
   * @returns {string} - Chord root in flat notation
   */
  resolveRoot(numeral, key) {
    // Normalize key to flat notation
    const normalizedKey = this.normalizeToFlat(key);
    const keyIndex = this.KEYS.indexOf(normalizedKey);

    if (keyIndex === -1) {
      console.error(`Unknown key: ${key}`);
      return key;
    }

    // Get interval for numeral (strip any trailing numbers for lookup)
    const cleanNumeral = numeral.replace(/[0-9]/g, '');
    const interval = this.INTERVALS[cleanNumeral];

    if (interval === undefined) {
      console.error(`Unknown numeral: ${numeral}`);
      return key;
    }

    // Calculate chord root
    const chordRootIndex = (keyIndex + interval) % 12;
    return this.KEYS[chordRootIndex];
  },

  /**
   * Resolve a full chord (root + quality) for a numeral in a key
   * @param {string} numeral - Roman numeral
   * @param {string} key - Key name
   * @param {string} quality - Chord quality suffix
   * @returns {string} - Full chord name (e.g., "Dm7", "G7", "Cmaj7")
   */
  resolveChord(numeral, key, quality) {
    const root = this.resolveRoot(numeral, key);
    return root + quality;
  },

  /**
   * Resolve an entire progression in a given key
   * @param {Object} progression - Progression object
   * @param {string} key - Key name
   * @returns {Array} - Array of { numeral, chordName, quality, root }
   */
  resolveProgression(progression, key) {
    return progression.numerals.map(numeral => {
      const quality = progression.qualities[numeral] || '';
      const root = this.resolveRoot(numeral, key);
      const chordName = root + quality;

      return {
        numeral,
        root,
        quality,
        chordName
      };
    });
  },

  /**
   * Get unique chords from a resolved progression
   * @param {Array} resolvedChords - Array from resolveProgression
   * @returns {Array} - Unique chord names
   */
  getUniqueChords(resolvedChords) {
    const seen = new Set();
    const unique = [];

    resolvedChords.forEach(chord => {
      if (!seen.has(chord.chordName)) {
        seen.add(chord.chordName);
        unique.push(chord);
      }
    });

    return unique;
  },

  /**
   * Normalize a note name to flat notation
   * @param {string} note - Note name (may include sharps)
   * @returns {string} - Note in flat notation
   */
  normalizeToFlat(note) {
    const sharpToFlat = {
      'C#': 'Db',
      'D#': 'Eb',
      'F#': 'Gb',
      'G#': 'Ab',
      'A#': 'Bb'
    };

    return sharpToFlat[note] || note;
  },

  /**
   * Get the database key for looking up a chord
   * @param {string} root - Chord root in flat notation
   * @returns {string} - Database key (e.g., "Csharp" for "Db")
   */
  getDatabaseKey(root) {
    const map = {
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
    };
    return map[root] || root;
  },

  /**
   * Look up a chord in the database
   * @param {string} chordName - Full chord name (e.g., "Dm7")
   * @param {Object} chordData - The chord database
   * @returns {Object|null} - Chord object with positions, or null
   */
  lookupChord(chordName, chordData) {
    if (!chordData) return null;

    // Parse chord name to root + suffix
    let root = chordName[0];
    let suffixStart = 1;

    if (chordName.length > 1 && (chordName[1] === 'b' || chordName[1] === '#')) {
      root = chordName.slice(0, 2);
      suffixStart = 2;
    }

    // Normalize root to flat
    root = this.normalizeToFlat(root);

    // Get suffix (default to "major" if empty)
    let suffix = chordName.slice(suffixStart);
    if (suffix === '') suffix = 'major';

    // Get database key
    const dbKey = this.getDatabaseKey(root);

    // Look up in database
    const keyChords = chordData.chords[dbKey];
    if (!keyChords) return null;

    // Find matching suffix
    const chord = keyChords.find(c => c.suffix === suffix);
    if (chord) {
      return { ...chord, displayRoot: root };
    }

    // Try case-insensitive
    const chordLower = keyChords.find(c => c.suffix.toLowerCase() === suffix.toLowerCase());
    if (chordLower) {
      return { ...chordLower, displayRoot: root };
    }

    return null;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Progressions;
}
