/**
 * Chord Degree Calculation Module
 * Calculates interval labels (R, 3, 5, 7, etc.) for chord diagram notes
 * Uses MIDI data from the chord database
 */

const ChordDegrees = {
  /**
   * Chord formulas - intervals present in each chord type
   */
  CHORD_FORMULAS: {
    // Triads
    "major": ["R", "3", "5"],
    "": ["R", "3", "5"],
    "minor": ["R", "b3", "5"],
    "m": ["R", "b3", "5"],
    "dim": ["R", "b3", "b5"],
    "aug": ["R", "3", "#5"],

    // Sevenths
    "maj7": ["R", "3", "5", "7"],
    "7": ["R", "3", "5", "b7"],
    "m7": ["R", "b3", "5", "b7"],
    "m7b5": ["R", "b3", "b5", "b7"],
    "dim7": ["R", "b3", "b5", "bb7"],
    "mmaj7": ["R", "b3", "5", "7"],
    "mMaj7": ["R", "b3", "5", "7"],

    // Extended
    "9": ["R", "3", "5", "b7", "9"],
    "maj9": ["R", "3", "5", "7", "9"],
    "m9": ["R", "b3", "5", "b7", "9"],
    "11": ["R", "3", "5", "b7", "9", "11"],
    "maj11": ["R", "3", "5", "7", "9", "11"],
    "m11": ["R", "b3", "5", "b7", "9", "11"],
    "13": ["R", "3", "5", "b7", "9", "13"],
    "maj13": ["R", "3", "5", "7", "9", "13"],

    // Sixths
    "6": ["R", "3", "5", "6"],
    "m6": ["R", "b3", "5", "6"],
    "69": ["R", "3", "5", "6", "9"],
    "m69": ["R", "b3", "5", "6", "9"],

    // Suspended
    "sus2": ["R", "2", "5"],
    "sus4": ["R", "4", "5"],
    "sus": ["R", "4", "5"],
    "7sus4": ["R", "4", "5", "b7"],
    "7sus2": ["R", "2", "5", "b7"],

    // Add chords
    "add9": ["R", "3", "5", "9"],
    "madd9": ["R", "b3", "5", "9"],
    "add11": ["R", "3", "5", "11"],

    // Altered
    "alt": ["R", "3", "b5", "b7", "b9", "#9"],
    "7b5": ["R", "3", "b5", "b7"],
    "7#5": ["R", "3", "#5", "b7"],
    "aug7": ["R", "3", "#5", "b7"],
    "7b9": ["R", "3", "5", "b7", "b9"],
    "7#9": ["R", "3", "5", "b7", "#9"],
    "9b5": ["R", "3", "b5", "b7", "9"],
    "aug9": ["R", "3", "#5", "b7", "9"],
    "9#11": ["R", "3", "5", "b7", "9", "#11"],

    // Maj7 variants
    "maj7b5": ["R", "3", "b5", "7"],
    "maj7#5": ["R", "3", "#5", "7"],
    "maj7sus2": ["R", "2", "5", "7"],

    // Minor-major variants
    "mmaj7b5": ["R", "b3", "b5", "7"],
    "mmaj9": ["R", "b3", "5", "7", "9"],
    "mmaj11": ["R", "b3", "5", "7", "9", "11"],

    // Power chord
    "5": ["R", "5"],

    // Suspended variants
    "sus2sus4": ["R", "2", "4", "5"]
  },

  /**
   * Interval to semitones mapping (from root)
   */
  INTERVAL_SEMITONES: {
    "R": 0,
    "b2": 1, "2": 2, "#2": 3,
    "b3": 3, "3": 4,
    "4": 5, "#4": 6,
    "b5": 6, "5": 7, "#5": 8,
    "6": 9, "bb7": 9, "b7": 10, "7": 11,
    "b9": 13, "9": 14, "#9": 15,
    "11": 17, "#11": 18,
    "b13": 20, "13": 21
  },

  /**
   * Reverse mapping: semitones (mod 12) to possible intervals
   * Multiple intervals can map to same semitone class
   */
  SEMITONES_TO_INTERVALS: null, // Built on init

  /**
   * Initialize the module
   */
  init() {
    this.buildSemitonesMap();
    return this;
  },

  /**
   * Build reverse mapping from semitones to interval names
   */
  buildSemitonesMap() {
    this.SEMITONES_TO_INTERVALS = {};
    for (let i = 0; i < 12; i++) {
      this.SEMITONES_TO_INTERVALS[i] = [];
    }

    for (const [interval, semitones] of Object.entries(this.INTERVAL_SEMITONES)) {
      const pitchClass = semitones % 12;
      this.SEMITONES_TO_INTERVALS[pitchClass].push({
        interval,
        semitones
      });
    }
  },

  /**
   * Get the pitch class (0-11) for a root note name
   * @param {string} rootKey - Root note from database (e.g., "C", "Csharp", "Eb")
   * @returns {number} - Pitch class 0-11
   */
  getRootPitchClass(rootKey) {
    const mapping = {
      "C": 0,
      "Csharp": 1, "C#": 1, "Db": 1,
      "D": 2,
      "Eb": 3, "D#": 3,
      "E": 4,
      "F": 5,
      "Fsharp": 6, "F#": 6, "Gb": 6,
      "G": 7,
      "Ab": 8, "G#": 8,
      "A": 9,
      "Bb": 10, "A#": 10,
      "B": 11
    };
    return mapping[rootKey] ?? 0;
  },

  /**
   * Calculate interval labels for a chord position
   * @param {Object} position - Chord position with frets and midi arrays
   * @param {string} rootKey - Root note key from database (e.g., "C", "Csharp")
   * @param {string} suffix - Chord suffix (e.g., "major", "m7", "dim")
   * @returns {Array} - Array of interval labels for each string (null for muted)
   */
  calculateIntervals(position, rootKey, suffix) {
    if (!position.midi || position.midi.length === 0) {
      return new Array(6).fill(null);
    }

    const rootPitchClass = this.getRootPitchClass(rootKey);
    const formula = this.CHORD_FORMULAS[suffix] || this.CHORD_FORMULAS["major"];
    const intervals = [];

    // Map MIDI notes to their string positions
    // The midi array doesn't include muted strings (-1 in frets)
    let midiIndex = 0;

    for (let string = 0; string < 6; string++) {
      const fret = position.frets[string];

      if (fret === -1) {
        // Muted string
        intervals.push(null);
      } else {
        // Get MIDI note for this string
        const midiNote = position.midi[midiIndex];
        midiIndex++;

        if (midiNote === undefined) {
          intervals.push(null);
          continue;
        }

        // Calculate semitones from root
        const pitchClass = midiNote % 12;
        const semitones = (pitchClass - rootPitchClass + 12) % 12;

        // Find matching interval from formula
        const interval = this.findIntervalFromFormula(semitones, formula);
        intervals.push(interval);
      }
    }

    return intervals;
  },

  /**
   * Find the interval name that matches given semitones within a chord formula
   * @param {number} semitones - Semitones from root (0-11)
   * @param {Array} formula - Chord formula array
   * @returns {string|null} - Interval name or null
   */
  findIntervalFromFormula(semitones, formula) {
    // First try to find exact match in formula
    for (const interval of formula) {
      const intervalSemitones = this.INTERVAL_SEMITONES[interval];
      if (intervalSemitones !== undefined && (intervalSemitones % 12) === semitones) {
        return interval;
      }
    }

    // If not found in formula, find any matching interval
    // This handles cases where chord voicing includes notes not in the base formula
    const possibleIntervals = this.SEMITONES_TO_INTERVALS[semitones];
    if (possibleIntervals && possibleIntervals.length > 0) {
      // Prefer simpler intervals (R, 3, 5, b7, etc.)
      const priority = ["R", "5", "3", "b3", "7", "b7", "4", "2", "6", "9", "11", "13"];
      for (const p of priority) {
        const found = possibleIntervals.find(i => i.interval === p);
        if (found) return found.interval;
      }
      // Return first available
      return possibleIntervals[0].interval;
    }

    return null;
  },

  /**
   * Get short display label for an interval
   * @param {string} interval - Full interval name (e.g., "b7", "#5")
   * @returns {string} - Display-ready label
   */
  getDisplayLabel(interval) {
    if (!interval) return "";

    // Already short enough
    return interval;
  }
};

// Auto-initialize
ChordDegrees.init();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChordDegrees;
}
