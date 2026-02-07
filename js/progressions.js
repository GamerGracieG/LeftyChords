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
    'VI': 9,
    'bVII': 10,
    'bIII': 3,
    'bVI': 8,
    'i': 0,
    'iv': 5,
    'v': 7,
    'bII': 1,
    'II': 2,
    'III': 4,
    'biii': 3,
    'bii': 1
  },

  /**
   * Available chord alterations by quality
   */
  ALTERATIONS: {
    "7":    ["7", "9", "13", "7b9", "7#9", "7b5", "7#5", "alt", "7sus4"],
    "m7":   ["m7", "m9", "m11", "m6"],
    "maj7": ["maj7", "maj9", "6", "69"],
    "m7b5": ["m7b5", "dim7"],
    "":     ["", "sus2", "sus4", "add9"],
    "m":    ["m", "m7", "m9", "madd9"]
  },

  /**
   * Progression definitions
   */
  PROGRESSIONS: {
    // ── Jazz ──────────────────────────────────────────────
    "ii-V-I": {
      id: "ii-V-I",
      name: "ii-V-I",
      description: "The essential jazz cadence. Found in nearly every standard.",
      numerals: ["ii", "V", "I"],
      qualities: { "ii": "m7", "V": "7", "I": "maj7" },
      category: "jazz"
    },
    "minor-ii-V-i": {
      id: "minor-ii-V-i",
      name: "Minor ii-V-i",
      description: '"Blue Bossa," "Autumn Leaves," "Alone Together," "Softly as in a Morning Sunrise."',
      numerals: ["ii", "V", "i"],
      qualities: { "ii": "m7b5", "V": "7", "i": "m7" },
      category: "jazz"
    },
    "turnaround": {
      id: "turnaround",
      name: "Turnaround",
      description: 'End-of-section loop back to the top. Last bars of rhythm changes, "Blue Moon," "Sunday Kind of Love." Variant: iii-vi-ii-V for more harmonic motion.',
      numerals: ["I", "vi", "ii", "V"],
      qualities: { "I": "maj7", "vi": "m7", "ii": "m7", "V": "7" },
      category: "jazz"
    },
    "rhythm-changes": {
      id: "rhythm-changes",
      name: "Rhythm Changes",
      description: 'One of the most called forms at jam sessions. AABA form. "Oleo," "Anthropology," "Moose the Mooche," "Cottontail."',
      sections: {
        A: {
          label: "A Section",
          numerals: ["I", "VI", "ii", "V"],
          qualities: { "I": "maj7", "VI": "7", "ii": "m7", "V": "7" }
        },
        B: {
          label: "Bridge",
          numerals: ["III", "VI", "II", "V"],
          qualities: { "III": "7", "VI": "7", "II": "7", "V": "7" }
        }
      },
      displayMode: "sections",
      category: "jazz"
    },
    "backdoor-ii-V": {
      id: "backdoor-ii-V",
      name: "Backdoor ii-V",
      description: 'Surprise resolution via bVII7. "Lady Bird," "Misty," "Stella by Starlight," "There Will Never Be Another You."',
      numerals: ["iv", "bVII", "I"],
      qualities: { "iv": "m7", "bVII": "7", "I": "maj7" },
      category: "jazz"
    },
    "tritone-sub": {
      id: "tritone-sub",
      name: "Tritone Substitution",
      description: 'Variation on V7, resolves down a half step. "Body and Soul," "Girl from Ipanema," "Satin Doll," "A Foggy Day."',
      numerals: ["ii", "bII", "I"],
      qualities: { "ii": "m7", "bII": "7", "I": "maj7" },
      category: "jazz"
    },

    // ── Blues ─────────────────────────────────────────────
    "12-bar-blues": {
      id: "12-bar-blues",
      name: "12-Bar Blues",
      description: '"Sweet Home Chicago," "Johnny B. Goode," "Pride and Joy," "Hound Dog."',
      numerals: ["I", "I", "I", "I", "IV", "IV", "I", "I", "V", "IV", "I", "V"],
      qualities: { "I": "7", "IV": "7", "V": "7" },
      category: "blues",
      displayMode: "summary"
    },
    "minor-blues": {
      id: "minor-blues",
      name: "Minor Blues",
      description: '"Mr. PC," "Equinox," "Birk\'s Works," "Israel."',
      numerals: ["i", "i", "i", "i", "iv", "iv", "i", "i", "V", "iv", "i", "V"],
      qualities: { "i": "m7", "iv": "m7", "V": "7" },
      category: "blues",
      displayMode: "summary"
    },
    "jazz-blues": {
      id: "jazz-blues",
      name: "Jazz Blues",
      description: '12-bar with ii-V turnarounds. "Billie\'s Bounce," "Straight No Chaser," "Now\'s the Time," "All Blues," "Bag\'s Groove."',
      numerals: ["I", "IV", "I", "I", "IV", "IV", "I", "I", "ii", "V", "I", "V"],
      qualities: { "I": "7", "IV": "7", "ii": "m7", "V": "7" },
      category: "blues",
      displayMode: "summary"
    },
    "bird-blues": {
      id: "bird-blues",
      name: "Bird Blues",
      description: 'Bebop reharmonization with chromatic ii-Vs. "Blues for Alice," "Freight Trane," "Chi Chi."',
      displayMode: "chart",
      chart: [
        [{ n: "I", q: "maj7" }],
        [{ n: "vii", q: "m7b5" }, { n: "III", q: "7" }],
        [{ n: "vi", q: "m7" }, { n: "II", q: "7" }],
        [{ n: "v", q: "m7" }, { n: "I", q: "7" }],
        [{ n: "IV", q: "7" }],
        [{ n: "iv", q: "m7" }, { n: "bVII", q: "7" }],
        [{ n: "iii", q: "m7" }, { n: "VI", q: "7" }],
        [{ n: "biii", q: "m7" }, { n: "bVI", q: "7" }],
        [{ n: "ii", q: "m7" }],
        [{ n: "V", q: "7" }],
        [{ n: "I", q: "maj7" }, { n: "VI", q: "7" }],
        [{ n: "ii", q: "m7" }, { n: "V", q: "7" }]
      ],
      category: "blues"
    },

    // ── Pop ──────────────────────────────────────────────
    "I-IV-V": {
      id: "I-IV-V",
      name: "I-IV-V",
      description: 'Rock, folk, country, everything. "La Bamba," "Twist and Shout," "Wild Thing," "Louie Louie," "Good Lovin\'."',
      numerals: ["I", "IV", "V"],
      qualities: { "I": "", "IV": "", "V": "" },
      category: "pop"
    },
    "I-V-vi-IV": {
      id: "I-V-vi-IV",
      name: "I-V-vi-IV",
      description: 'The pop progression. "Let It Be," "No Woman No Cry," "Someone Like You," "With or Without You," "Don\'t Stop Believin\'."',
      numerals: ["I", "V", "vi", "IV"],
      qualities: { "I": "", "V": "", "vi": "m", "IV": "" },
      category: "pop"
    },
    "50s-doo-wop": {
      id: "50s-doo-wop",
      name: "50s Doo-Wop",
      description: '"Stand By Me," "Earth Angel," "All I Have to Do Is Dream," "Crocodile Rock."',
      numerals: ["I", "vi", "IV", "V"],
      qualities: { "I": "", "vi": "m", "IV": "", "V": "" },
      category: "pop"
    },
    "andalusian-cadence": {
      id: "andalusian-cadence",
      name: "Andalusian Cadence",
      description: 'Descending, Spanish feel. "Hit the Road Jack," "Runaway," "Stray Cat Strut," "Sultans of Swing," "Hava Nagila."',
      numerals: ["vi", "V", "IV", "III"],
      qualities: { "vi": "m", "V": "", "IV": "", "III": "" },
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
      pop: { name: 'Pop', progressions: [] }
    };

    Object.values(this.PROGRESSIONS).forEach(prog => {
      const cat = prog.category || 'pop';
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
    if (!progression.numerals) return [];

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
   * Resolve a sections-based progression (e.g., Rhythm Changes A/B)
   * @param {Object} progression - Progression with sections property
   * @param {string} key - Key name
   * @returns {Object} - { A: { label, resolved }, B: { label, resolved } }
   */
  resolveSections(progression, key) {
    const result = {};

    Object.entries(progression.sections).forEach(([sectionKey, section]) => {
      const resolved = section.numerals.map(numeral => {
        const quality = section.qualities[numeral] || '';
        const root = this.resolveRoot(numeral, key);
        const chordName = root + quality;
        return { numeral, root, quality, chordName };
      });

      result[sectionKey] = {
        label: section.label,
        resolved
      };
    });

    return result;
  },

  /**
   * Resolve a chart-based progression (e.g., Bird Blues)
   * @param {Object} progression - Progression with chart property
   * @param {string} key - Key name
   * @returns {Array} - Array of bars, each bar is array of { numeral, quality, chordName, root }
   */
  resolveChart(progression, key) {
    return progression.chart.map(bar => {
      return bar.map(chord => {
        const root = this.resolveRoot(chord.n, key);
        const chordName = root + chord.q;
        return {
          numeral: chord.n,
          quality: chord.q,
          root,
          chordName
        };
      });
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
   * Get unique chords from a resolved chart
   * @param {Array} resolvedBars - Array from resolveChart
   * @returns {Array} - Unique chord objects
   */
  getUniqueChordsFromChart(resolvedBars) {
    const seen = new Set();
    const unique = [];

    resolvedBars.forEach(bar => {
      bar.forEach(chord => {
        if (!seen.has(chord.chordName)) {
          seen.add(chord.chordName);
          unique.push(chord);
        }
      });
    });

    return unique;
  },

  /**
   * Get available alterations for a chord quality
   * @param {string} quality - Chord quality (e.g., "7", "m7", "maj7")
   * @returns {Array} - Array of alternative qualities, or empty array
   */
  getAlterations(quality) {
    return this.ALTERATIONS[quality] || [];
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
