# LeftyChords v2.0 Technical Specification

## Project Overview

LeftyChords is a left-handed guitar chord reference app. v1.0 provides chord lookup by name and by notes, with left-handed diagram orientation. v2.0 adds progression reference tools for jazz musicians, search improvements, and educational chord annotations.

**Live app:** https://gamergracieg.github.io/LeftyChords/

**Primary use case:** Jazz band rehearsals with a singer who may need on-the-fly transposition. User speaks in Roman numerals (ii-V-I) and needs quick visual reference for chord shapes in any key.

---

## Implementation Prerequisites

Before implementing v2.0 features, the following compatibility issues must be addressed:

### Database Key Normalization

The chord database (`data/guitar.json`) uses `"Csharp"` and `"Fsharp"` as keys, but the app uses `"C#"` / `"Db"` notation. Add a normalization layer for all database lookups:

```javascript
const databaseKeyMap = {
  "C": "C",
  "C#": "Csharp",
  "Db": "Csharp",
  "D": "D",
  "D#": "Eb",
  "Eb": "Eb",
  "E": "E",
  "F": "F",
  "F#": "Fsharp",
  "Gb": "Fsharp",
  "G": "G",
  "G#": "Ab",
  "Ab": "Ab",
  "A": "A",
  "A#": "Bb",
  "Bb": "Bb",
  "B": "B"
};

function getDatabaseKey(note) {
  return databaseKeyMap[note] || note;
}
```

**Rationale:** The database comes from an external source (tombatossals/chords-db). Adding a mapping layer is safer than modifying the database directly.

---

## v2.0 Features

### 1. Chord Search Autocomplete

Add filter-as-you-type suggestions to the existing Chord Name tab.

**Behavior:**
- On each keypress, filter the chord database for matches
- Display dropdown of matching chord names (limit to 10 results)
- Match from the start of chord name ("Dm" shows Dm, Dm7, Dm9... not "Abdim")
- Arrow keys navigate the list, Enter selects, Escape closes
- Tapping/selecting a suggestion fills the input and displays the diagram
- Case insensitive matching
- Support enharmonic spellings (user types "C#m7" or "Dbm7", both work)
- Use existing 150ms debounce from v1 search input

**Edge cases:**
- Empty input: no dropdown
- No matches: show "No chords found"
- Special characters: ignore or strip

**Existing infrastructure:** `ChordSearch.getSuggestions(partial)` in `js/search.js` already returns up to 10 matches. Modify to match from start of chord name only (current implementation does substring matching).

---

### 2. Modal Component

Build a modal system for enlarged chord diagram views. This is new infrastructure required for v2.0.

**Visual structure:**
```
┌─────────────────────────────────────────┐
│  [Current App - dimmed/blurred]         │
│                                         │
│    ┌───────────────────────────┐        │
│    │                         ✕ │ ← Close button
│    │                           │
│    │        Cmaj7              │ ← Chord name (large)
│    │                           │
│    │    ┌─────────────┐        │
│    │    │             │        │
│    │    │  [ENLARGED  │        │ ← Bigger diagram
│    │    │   DIAGRAM]  │        │    with interval labels
│    │    │             │        │
│    │    └─────────────┘        │
│    │                           │
│    │   Position 1 of 4  ← →   │ ← Cycle through voicings
│    │                           │
│    └───────────────────────────┘        │
│                                         │
└─────────────────────────────────────────┘
     ↑ Backdrop (semi-transparent, click to close)
```

**Behaviors:**
- **Backdrop:** Dark semi-transparent overlay, clicking closes modal
- **Close button:** X in top-right corner
- **Escape key:** Closes modal
- **Focus trap:** Keyboard focus stays inside modal until closed
- **Scroll lock:** Background content doesn't scroll while modal is open
- **Touch feedback:** Scale-down effect on press (0.95 scale) for tap targets
- **Accessible:** `role="dialog"`, `aria-modal="true"`, screen reader announcements

**Content:**
- Enlarged chord diagram with interval labels
- Chord name prominently displayed
- Position indicator (e.g., "Position 1 of 4")
- Navigation arrows to cycle through voicings

---

### 3. Progressions Tab

Add a new tab alongside existing "Chord Name" and "Notes" tabs.

#### 3.1 Data Structure

```javascript
const progressions = {
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
};
```

**Note:** 12-bar blues uses normalized numeral format (same as other progressions) with `displayMode: "summary"` flag for special rendering.

#### 3.2 Key-to-Chord Resolution

```javascript
// Display flats only (jazz convention)
const roots = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Normalize sharp input to flats for display
const enharmonicToFlat = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb"
};

// Semitones from root for each scale degree
const intervals = {
  "I": 0,
  "ii": 2,
  "iii": 4,
  "IV": 5,
  "V": 7,
  "vi": 9,
  "vii": 11,
  "VI": 9  // For rhythm changes (dominant, not minor)
};

function normalizeToFlat(note) {
  return enharmonicToFlat[note] || note;
}

function resolveChord(numeral, key, quality) {
  const normalizedKey = normalizeToFlat(key);
  const keyIndex = roots.indexOf(normalizedKey);
  const interval = intervals[numeral];
  const chordRoot = roots[(keyIndex + interval) % 12];
  return chordRoot + quality; // e.g., "Dm7"
}
```

**Enharmonic display rule:** All chord names normalize to flat notation (jazz convention). User searches for "F#maj7" → displays as "Gbmaj7".

#### 3.3 Voicing Selection

When a progression resolves to a chord with multiple positions in the database:
- **Default:** Display the first position (index 0, typically lowest on neck)
- **Future (v2.5):** Tap diagram to cycle through alternative voicings

#### 3.4 UI Layout

```
┌─────────────────────────────────────┐
│  [Chord Name] [Notes] [Progressions]│  ← Tab bar
├─────────────────────────────────────┤
│  Key: [C ▼]                         │  ← Dropdown, shows flats only
├─────────────────────────────────────┤
│  Jazz                               │
│    • ii-V-I                         │
│    • Minor ii-V-i                   │
│    • Turnaround                     │
│    • Full Turnaround                │
│    • Rhythm Changes (A)             │
│                                     │
│  Blues                              │
│    • 12-Bar Blues                   │
│                                     │
│  Basic/Pop                          │
│    • I-IV-V                         │
│    • I-V-vi-IV                      │
├─────────────────────────────────────┤
│  [Selected Progression Display]     │
│                                     │
│  ii - V - I                         │  ← Roman numerals
│  Dm7 - G7 - Cmaj7                   │  ← Resolved chord names (flats)
│                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ Dm7 │ │ G7  │ │Cmaj7│           │  ← Small tappable diagrams
│  └─────┘ └─────┘ └─────┘           │
│                                     │
└─────────────────────────────────────┘
```

**Diagram sizing:** Minimal size for thumbnails. On mobile, diagrams wrap to multiple rows rather than horizontal scroll.

#### 3.5 Blues Summary View

For 12-bar blues (and any progression with `displayMode: "summary"`), display a condensed structure instead of 12 diagrams:

```
┌─────────────────────────────────────┐
│  12-Bar Blues in G                  │
│                                     │
│  | I7  | I7  | I7  | I7  |         │
│  | IV7 | IV7 | I7  | I7  |         │
│  | V7  | IV7 | I7  | V7  |         │
│                                     │
│  Chords:                            │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ G7  │ │ C7  │ │ D7  │           │  ← Unique chords only
│  └─────┘ └─────┘ └─────┘           │
└─────────────────────────────────────┘
```

#### 3.6 Interaction

- Key selector dropdown defaults to C, shows only flat notation
- Tapping a progression name displays it below
- Changing key recalculates all resolved chord names and updates diagrams
- Tapping a chord diagram opens enlarged view in modal

#### 3.7 Error States

When a resolved chord doesn't exist in the database (rare, but possible with extended chords):
- Display chord name
- Show placeholder diagram with "Diagram unavailable" message
- Do not break the progression display

---

### 4. Chord Degree Annotations

Label each fretted note on chord diagrams with its interval degree (R, 3, 5, 7, etc.).

#### 4.1 Chord Formulas

```javascript
const chordFormulas = {
  // Triads
  "": ["R", "3", "5"],           // major
  "m": ["R", "b3", "5"],         // minor
  "dim": ["R", "b3", "b5"],
  "aug": ["R", "3", "#5"],

  // Sevenths
  "maj7": ["R", "3", "5", "7"],
  "7": ["R", "3", "5", "b7"],
  "m7": ["R", "b3", "5", "b7"],
  "m7b5": ["R", "b3", "b5", "b7"],
  "dim7": ["R", "b3", "b5", "bb7"],
  "mMaj7": ["R", "b3", "5", "7"],

  // Extended
  "9": ["R", "3", "5", "b7", "9"],
  "maj9": ["R", "3", "5", "7", "9"],
  "m9": ["R", "b3", "5", "b7", "9"],
  "11": ["R", "3", "5", "b7", "9", "11"],
  "13": ["R", "3", "5", "b7", "9", "13"],

  // Sixths
  "6": ["R", "3", "5", "6"],
  "m6": ["R", "b3", "5", "6"],

  // Suspended
  "sus2": ["R", "2", "5"],
  "sus4": ["R", "4", "5"],
  "7sus4": ["R", "4", "5", "b7"],

  // Add chords
  "add9": ["R", "3", "5", "9"],
  "madd9": ["R", "b3", "5", "9"]
};
```

#### 4.2 Interval Semitone Mapping

```javascript
const intervalSemitones = {
  "R": 0,
  "b2": 1, "2": 2, "#2": 3,
  "b3": 3, "3": 4,
  "4": 5, "#4": 6,
  "b5": 6, "5": 7, "#5": 8,
  "6": 9, "bb7": 9, "b7": 10, "7": 11,
  "b9": 13, "9": 14, "#9": 15,
  "11": 17, "#11": 18,
  "b13": 20, "13": 21
};
```

#### 4.3 Calculation Logic

**Use MIDI data from database** for interval calculation (simpler and avoids tuning assumptions):

```javascript
function calculateInterval(noteMidi, rootPitchClass, chordFormula) {
  const semitones = (noteMidi - rootPitchClass + 120) % 12;

  // Find matching interval from chord formula
  for (const interval of chordFormula) {
    if (intervalSemitones[interval] % 12 === semitones) {
      return interval;
    }
  }
  return null; // Shouldn't happen for valid chord data
}
```

Each chord position in the database includes MIDI values:
```javascript
{
  "frets": [-1, 3, 2, 0, 1, 0],
  "midi": [48, 52, 55, 60, 64]  // Use these directly
}
```

#### 4.4 Display - Fretted Notes

Labels appear directly on the finger position dots:

```
    E A D G B E
    ──────────
    × ○       ○      (× = muted, ○ = open)
      ┼─┼─┼─┼─┼
      │ │ R │ │      (finger dot labeled "R" for root)
      ┼─┼─┼─┼─┼
      │ 3 │ │ 7
      ┼─┼─┼─┼─┼
      │ │ 5 │ │
```

#### 4.5 Display - Open Strings

For open strings (no finger dot), display the interval label as a small label below the nut on that string:

```
    E A D G B E
    ×   ○     ○      ← Open string markers above nut
    ══════════════   ← Nut
        5     R      ← Interval labels for open strings (below nut)
      ┼─┼─┼─┼─┼
      │ │ R │ │
      ┼─┼─┼─┼─┼
```

#### 4.6 Display Requirements

- Labels should be readable at small diagram sizes (thumbnail in progressions)
- Use abbreviations: R, 2, b3, 3, 4, b5, 5, #5, 6, b7, 7, 9, 11, 13
- Apply to all diagram views (search results, progression view, enlarged modal)
- Labels scale appropriately in modal enlarged view

---

### 5. Enharmonic Support

Accept both sharp and flat spellings throughout the app, normalize to flats for display.

**Key selector:** Display flats only (C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B)

**Chord search:** Normalize input before matching, display results in flat notation
- User types "C#m7" → search for "Dbm7" → display as "Dbm7"
- User types "F#maj7" → search for "Gbmaj7" → display as "Gbmaj7"

**Rationale:** Flat notation is the jazz convention.

**Mapping:**
```javascript
// For normalizing user input to flat notation
const enharmonicToFlat = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb"
};

// For database lookups (maps to actual database keys)
const databaseKeyMap = {
  "C": "C",
  "Db": "Csharp",
  "D": "D",
  "Eb": "Eb",
  "E": "E",
  "F": "F",
  "Gb": "Fsharp",
  "G": "G",
  "Ab": "Ab",
  "A": "A",
  "Bb": "Bb",
  "B": "B"
};
```

---

## Mobile Considerations

- **Readability:** Diagrams must be legible at a glance on a music stand (phone propped up 2-3 feet away)
- **Tap targets:** Larger than typical mobile UI since user is mid-performance
- **Touch feedback:** Scale-down effect (0.95 scale) on press for interactive elements
- **Key selector:** Quick to access, not buried in menus
- **Orientation:** Support both portrait and landscape
  - Portrait: Diagrams wrap to multiple rows
  - Landscape: Row layout where space permits
- **Degree labels:** Must remain readable on small thumbnail diagrams

---

## Testing Checklist

### Autocomplete
- [ ] Filters correctly on partial input
- [ ] Matches from START of chord name only (not substring)
- [ ] Handles empty input (no dropdown)
- [ ] Handles no matches ("No chords found")
- [ ] Case insensitive
- [ ] Accepts enharmonic spellings (C# and Db both work)
- [ ] Displays results in flat notation
- [ ] Keyboard navigation (arrows, enter, escape)
- [ ] Touch/tap selection
- [ ] Debounce working (150ms)

### Modal
- [ ] Opens on diagram tap
- [ ] Backdrop click closes modal
- [ ] X button closes modal
- [ ] Escape key closes modal
- [ ] Focus trapped inside modal
- [ ] Background scroll locked
- [ ] Touch feedback on interactive elements
- [ ] Accessible (role="dialog", aria-modal)
- [ ] Position cycling works (1 of N display)

### Progressions
- [ ] All progressions resolve correctly in all 12 keys
- [ ] Key selector shows flats only
- [ ] Key selector updates all chord names and diagrams
- [ ] Resolved chord names display in flat notation
- [ ] Diagrams load for all resolved chords
- [ ] Missing chord shows "Diagram unavailable" placeholder
- [ ] Blues summary view displays correctly
- [ ] Tapping chord opens modal with enlarged view
- [ ] Diagrams wrap on mobile (no horizontal scroll)
- [ ] Layout works on phone (portrait)
- [ ] Layout works on tablet (landscape)

### Chord Degrees
- [ ] Degree labels appear on all chord types
- [ ] Calculation correct using MIDI data
- [ ] Labels on fretted notes (inside dots)
- [ ] Labels on open strings (below nut)
- [ ] Labels readable at small diagram size
- [ ] Labels readable in enlarged modal view
- [ ] Edge cases: barre chords, partial chords

### Enharmonics
- [ ] Key selector shows flats
- [ ] Chord search accepts sharps and flats
- [ ] Search results display in flat notation
- [ ] Resolved chord names display in flat notation
- [ ] Database lookup works for all enharmonic inputs

### Database Normalization
- [ ] C#/Db chords resolve correctly
- [ ] F#/Gb chords resolve correctly
- [ ] All 12 keys work in progressions
- [ ] Search works for sharp and flat input

### General
- [ ] Performance acceptable when filtering full chord database on keypress
- [ ] Left-handed orientation maintained on all new diagram views
- [ ] Touch feedback visible on all tappable elements

---

## v2.5 Backlog (Out of Scope for v2.0)

- **Voicing cycling:** Tap a chord diagram to cycle through alternative positions
- **Alteration toggle:** Tap a chord in a progression to see alternatives (V7 → V7b9, V7#9, V7alt, etc.)
- **Degree label toggle:** Option to hide interval annotations
- **Slash chord support:** Verify database coverage, add if missing
- **Custom progressions:** User can create and save their own
- **Setlist/favorites:** Save progressions for quick access
- **Recently viewed:** Track and display recent progressions

---

## File Structure

```
LeftyChords/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # Main app logic (update)
│   ├── chordDiagram.js     # SVG diagram rendering (update for degrees)
│   ├── search.js           # Chord search (update for start-match)
│   ├── reverseLookup.js    # Note-to-chord lookup
│   ├── autocomplete.js     # Search autocomplete UI (NEW)
│   ├── modal.js            # Modal component (NEW)
│   ├── progressions.js     # Progression data & resolution (NEW)
│   └── degrees.js          # Chord degree calculation (NEW)
├── data/
│   ├── guitar.json         # Chord database (existing)
│   └── progressions.json   # Progression definitions (NEW)
└── docs/
    └── v2-spec.md          # This specification
```

---

## Notes

- Primary chord database: tombatossals/chords-db (MIT license, 3000+ chords)
- Database uses "Csharp"/"Fsharp" keys - normalization layer required
- Diagram style reference: Guitar Pro 3
- All diagrams remain left-handed orientation
- Jazz convention: display all notes/chords in flat notation
