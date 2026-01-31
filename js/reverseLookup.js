/**
 * Reverse Lookup Module
 * Find chord names from a set of notes
 */

const ReverseLookup = {
  // Chord database reference
  chordData: null,

  // Index of MIDI pitch classes to chord names
  midiIndex: null,

  // Note name to pitch class (0-11) mapping
  NOTE_TO_PITCH_CLASS: {
    'C': 0, 'C#': 1, 'Db': 1, 'D♭': 1,
    'D': 2, 'D#': 3, 'Eb': 3, 'E♭': 3,
    'E': 4, 'E#': 5, 'Fb': 4, 'F♭': 4,
    'F': 5, 'F#': 6, 'Gb': 6, 'G♭': 6,
    'G': 7, 'G#': 8, 'Ab': 8, 'A♭': 8,
    'A': 9, 'A#': 10, 'Bb': 10, 'B♭': 10,
    'B': 11, 'B#': 0, 'Cb': 11, 'C♭': 11
  },

  // Pitch class to note name (for display - uses flat notation)
  PITCH_CLASS_TO_NOTE: {
    0: 'C', 1: 'Db', 2: 'D', 3: 'Eb',
    4: 'E', 5: 'F', 6: 'Gb', 7: 'G',
    8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B'
  },

  // Map database keys to display format (flat notation)
  DATABASE_KEY_TO_DISPLAY: {
    'C': 'C',
    'Csharp': 'Db',
    'D': 'D',
    'Eb': 'Eb',
    'E': 'E',
    'F': 'F',
    'Fsharp': 'Gb',
    'G': 'G',
    'Ab': 'Ab',
    'A': 'A',
    'Bb': 'Bb',
    'B': 'B'
  },

  /**
   * Initialize with chord data and build the lookup index
   */
  init(chordData) {
    this.chordData = chordData;
    this.buildIndex();
    return this;
  },

  /**
   * Build index from MIDI pitch class sets to chord names
   * This enables O(1) lookup from notes to chords
   */
  buildIndex() {
    if (!this.chordData) return;

    this.midiIndex = new Map();

    // Iterate through all keys (C, Csharp, D, etc.)
    Object.keys(this.chordData.chords).forEach(key => {
      const chords = this.chordData.chords[key];
      // Convert database key to display format (flat notation)
      const displayKey = this.DATABASE_KEY_TO_DISPLAY[key] || key;

      chords.forEach(chord => {
        const chordName = displayKey + (chord.suffix === 'major' ? '' : chord.suffix);

        // Each chord has multiple positions/voicings
        chord.positions.forEach(position => {
          if (position.midi && position.midi.length > 0) {
            // Convert MIDI notes to pitch classes (0-11)
            const pitchClasses = this.midiToPitchClasses(position.midi);
            const key = this.pitchClassesToKey(pitchClasses);

            // Add to index
            if (!this.midiIndex.has(key)) {
              this.midiIndex.set(key, new Set());
            }
            this.midiIndex.get(key).add(chordName);
          }
        });
      });
    });

    console.log(`Built reverse lookup index with ${this.midiIndex.size} unique pitch class sets`);
  },

  /**
   * Convert array of MIDI notes to array of unique pitch classes
   * @param {Array} midiNotes - Array of MIDI note numbers
   * @returns {Array} - Sorted array of unique pitch classes (0-11)
   */
  midiToPitchClasses(midiNotes) {
    const pitchClasses = new Set();
    midiNotes.forEach(note => {
      pitchClasses.add(note % 12);
    });
    return Array.from(pitchClasses).sort((a, b) => a - b);
  },

  /**
   * Create a lookup key from pitch classes
   * @param {Array} pitchClasses - Sorted array of pitch classes
   * @returns {string} - Comma-separated string key
   */
  pitchClassesToKey(pitchClasses) {
    return pitchClasses.join(',');
  },

  /**
   * Parse user note input into pitch classes
   * Handles various input formats:
   * - "C E G B" (space-separated)
   * - "C, E, G, B" (comma-separated)
   * - "C-E-G-B" (dash-separated)
   * - "CEGB" (concatenated, simple notes only)
   *
   * @param {string} input - User input string
   * @returns {Array} - Array of pitch classes or null if invalid
   */
  parseNoteInput(input) {
    if (!input || typeof input !== 'string') return null;

    let notes = [];
    const cleaned = input.trim().toUpperCase();

    // Try different delimiters
    if (cleaned.includes(',')) {
      notes = cleaned.split(',').map(n => n.trim());
    } else if (cleaned.includes(' ')) {
      notes = cleaned.split(/\s+/);
    } else if (cleaned.includes('-')) {
      notes = cleaned.split('-').map(n => n.trim());
    } else {
      // Try to parse concatenated notes (e.g., "CEGB" or "C#EGBb")
      notes = this.parseCondensedNotes(cleaned);
    }

    // Convert note names to pitch classes
    const pitchClasses = new Set();
    for (const note of notes) {
      const normalized = this.normalizeNoteName(note);
      if (normalized === null) {
        continue; // Skip invalid notes
      }
      const pitchClass = this.NOTE_TO_PITCH_CLASS[normalized];
      if (pitchClass !== undefined) {
        pitchClasses.add(pitchClass);
      }
    }

    if (pitchClasses.size === 0) return null;
    return Array.from(pitchClasses).sort((a, b) => a - b);
  },

  /**
   * Parse condensed note notation (e.g., "C#EGBb")
   * @param {string} input - Condensed note string
   * @returns {Array} - Array of note names
   */
  parseCondensedNotes(input) {
    const notes = [];
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      // Must start with a letter A-G
      if (!/[A-G]/i.test(char)) {
        i++;
        continue;
      }

      let note = char.toUpperCase();
      i++;

      // Check for sharp or flat modifier
      if (i < input.length) {
        const modifier = input[i];
        if (modifier === '#' || modifier === '♯') {
          note += '#';
          i++;
        } else if (modifier === 'B' || modifier === 'b' || modifier === '♭') {
          // 'b' is tricky - could be note B or flat modifier
          // If next char is a note letter or end of string, treat as note B
          // Otherwise treat as flat
          if (i + 1 >= input.length || /[A-G]/i.test(input[i + 1])) {
            // Check if previous note could take a flat
            if (/[DEGAB]/.test(char)) {
              note += 'b';
              i++;
            }
            // else 'B' is the next note, don't increment
          } else {
            note += 'b';
            i++;
          }
        }
      }

      notes.push(note);
    }

    return notes;
  },

  /**
   * Normalize a note name to standard format
   * @param {string} note - Note name (e.g., "c#", "Db", "E")
   * @returns {string|null} - Normalized note name or null
   */
  normalizeNoteName(note) {
    if (!note) return null;

    let normalized = note.trim();

    // Handle first character (the note letter)
    if (normalized.length === 0) return null;

    let letter = normalized[0].toUpperCase();
    if (!/[A-G]/.test(letter)) return null;

    // Handle accidentals
    if (normalized.length > 1) {
      const rest = normalized.slice(1).toLowerCase();
      if (rest === '#' || rest === '♯' || rest === 'sharp') {
        letter += '#';
      } else if (rest === 'b' || rest === '♭' || rest === 'flat') {
        letter += 'b';
      }
    }

    // Check if it's a valid note
    if (this.NOTE_TO_PITCH_CLASS[letter] !== undefined) {
      return letter;
    }

    return null;
  },

  /**
   * Search for chords matching the given notes
   * @param {string} input - User note input
   * @returns {Object} - { notes: [], chords: [], pitchClasses: [] }
   */
  search(input) {
    const pitchClasses = this.parseNoteInput(input);

    if (!pitchClasses || pitchClasses.length === 0) {
      return { notes: [], chords: [], pitchClasses: [], error: 'Invalid note input' };
    }

    const key = this.pitchClassesToKey(pitchClasses);
    const chordSet = this.midiIndex.get(key);

    // Convert pitch classes back to note names for display
    const noteNames = pitchClasses.map(pc => this.PITCH_CLASS_TO_NOTE[pc]);

    if (!chordSet || chordSet.size === 0) {
      return {
        notes: noteNames,
        chords: [],
        pitchClasses: pitchClasses,
        error: null
      };
    }

    return {
      notes: noteNames,
      chords: Array.from(chordSet).sort(),
      pitchClasses: pitchClasses,
      error: null
    };
  },

  /**
   * Get the pitch class set for a chord (for verification)
   * @param {string} chordName - Chord name (e.g., "Cmaj7")
   * @returns {Array} - Array of pitch classes
   */
  getChordPitchClasses(chordName) {
    // This would require parsing the chord name and looking it up
    // For now, return null - can be implemented if needed
    return null;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReverseLookup;
}
