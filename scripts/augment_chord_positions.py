#!/usr/bin/env python3
"""
One-time (re-runnable) data migration that augments data/guitar.json with
additional published chord voicings pulled from szaza/guitar-chords-db-json
(MIT licensed, https://github.com/szaza/guitar-chords-db-json), so chords
that only ship with the stock ~4 tombatossals/chords-db positions can show
up to MAX_VOICINGS.

Every candidate voicing is validated against this app's own chord-formula
definitions (mirrored from js/degrees.js below) before being merged in:
  - no pitch class outside the chord's allowed tones (no foreign notes)
  - every "essential" tone present (root, 3rd/b3, 7th, any altered 5th,
    and the highest-numbered named extension); plain perfect 5ths and
    lower/secondary extensions may be omitted, matching how real guitar
    voicings conventionally drop the least essential color tones.

After merging, every chord's positions are re-sorted into a single
fret-ascending list (tiebreak: most open strings, then most strings
played) so voicings climb the neck smoothly regardless of which source
they came from.

See docs/v2.6-spec.md for the full writeup of why this exists.

Usage: python3 scripts/augment_chord_positions.py
(Run from anywhere; paths are resolved relative to this script's location.
Downloaded source files are cached alongside this script in
scripts/.szaza_cache/ so re-runs don't re-hit the network.)
"""

import json
import os
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_PATH = os.path.join(SCRIPT_DIR, "..", "data", "guitar.json")
CACHE_DIR = os.path.join(SCRIPT_DIR, ".szaza_cache")
BASE_URL = "https://raw.githubusercontent.com/szaza/guitar-chords-db-json/master"
MAX_VOICINGS = 8

ROOT_TO_SZAZA = {
    "C": "C", "Csharp": "C#", "D": "D", "Eb": "D#", "E": "E", "F": "F",
    "Fsharp": "F#", "G": "G", "Ab": "G#", "A": "A", "Bb": "A#", "B": "B"
}

ROOT_PITCH_CLASS = {
    "C": 0, "Csharp": 1, "D": 2, "Eb": 3, "E": 4, "F": 5,
    "Fsharp": 6, "G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11
}

# Our suffix name -> szaza's suffix name, where they differ but mean the
# same chord (verified by the harmonic validation below either way).
SUFFIX_ALIAS = {
    "69": "6add9",
    "m69": "m6add9",
    "sus": "sus4",
    "maj7#5": "augmaj7",
}

# Mirrors js/degrees.js CHORD_FORMULAS - keep these two in sync.
CHORD_FORMULAS = {
    "major": ["R", "3", "5"], "": ["R", "3", "5"],
    "minor": ["R", "b3", "5"], "m": ["R", "b3", "5"],
    "dim": ["R", "b3", "b5"], "aug": ["R", "3", "#5"],
    "maj7": ["R", "3", "5", "7"], "7": ["R", "3", "5", "b7"],
    "m7": ["R", "b3", "5", "b7"], "m7b5": ["R", "b3", "b5", "b7"],
    "dim7": ["R", "b3", "b5", "bb7"], "mmaj7": ["R", "b3", "5", "7"],
    "mMaj7": ["R", "b3", "5", "7"],
    "9": ["R", "3", "5", "b7", "9"], "maj9": ["R", "3", "5", "7", "9"],
    "m9": ["R", "b3", "5", "b7", "9"], "11": ["R", "3", "5", "b7", "9", "11"],
    "maj11": ["R", "3", "5", "7", "9", "11"], "m11": ["R", "b3", "5", "b7", "9", "11"],
    "13": ["R", "3", "5", "b7", "9", "13"], "maj13": ["R", "3", "5", "7", "9", "13"],
    "6": ["R", "3", "5", "6"], "m6": ["R", "b3", "5", "6"],
    "69": ["R", "3", "5", "6", "9"], "m69": ["R", "b3", "5", "6", "9"],
    "sus2": ["R", "2", "5"], "sus4": ["R", "4", "5"], "sus": ["R", "4", "5"],
    "7sus4": ["R", "4", "5", "b7"], "7sus2": ["R", "2", "5", "b7"],
    "add9": ["R", "3", "5", "9"], "madd9": ["R", "b3", "5", "9"],
    "add11": ["R", "3", "5", "11"],
    "alt": ["R", "3", "b5", "b7", "b9", "#9"],
    "7b5": ["R", "3", "b5", "b7"], "7#5": ["R", "3", "#5", "b7"],
    "aug7": ["R", "3", "#5", "b7"], "7b9": ["R", "3", "5", "b7", "b9"],
    "7#9": ["R", "3", "5", "b7", "#9"], "9b5": ["R", "3", "b5", "b7", "9"],
    "aug9": ["R", "3", "#5", "b7", "9"], "9#11": ["R", "3", "5", "b7", "9", "#11"],
    "maj7b5": ["R", "3", "b5", "7"], "maj7#5": ["R", "3", "#5", "7"],
    "maj7sus2": ["R", "2", "5", "7"],
    "mmaj7b5": ["R", "b3", "b5", "7"], "mmaj9": ["R", "b3", "5", "7", "9"],
    "mmaj11": ["R", "b3", "5", "7", "9", "11"],
    "5": ["R", "5"],
    "sus2sus4": ["R", "2", "4", "5"]
}

# Mirrors js/degrees.js INTERVAL_SEMITONES.
INTERVAL_SEMITONES = {
    "R": 0, "b2": 1, "2": 2, "#2": 3, "b3": 3, "3": 4, "4": 5, "#4": 6,
    "b5": 6, "5": 7, "#5": 8, "6": 9, "bb7": 9, "b7": 10, "7": 11,
    "b9": 13, "9": 14, "#9": 15, "11": 17, "#11": 18, "b13": 20, "13": 21
}

TUNING_PITCH_CLASSES = [4, 9, 2, 7, 11, 4]  # low E to high e
OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]


def decode_fret_char(c):
    if c in ("x", "X"):
        return -1
    if c.isdigit():
        return int(c)
    if c.isalpha():
        return 10 + (ord(c.lower()) - ord("a"))
    raise ValueError(f"Bad fret char: {c!r}")


def decode_finger_char(c):
    if c.isdigit():
        return int(c)
    return 0


def fetch_szaza_file(root_dir, suffix):
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_key = f"{root_dir}__{suffix}".replace("#", "sharp").replace("/", "_")
    cache_path = os.path.join(CACHE_DIR, cache_key + ".json")
    if os.path.exists(cache_path):
        with open(cache_path) as f:
            content = f.read()
    else:
        url = f"{BASE_URL}/{root_dir}/{suffix}.json"
        result = subprocess.run(
            ["curl", "-sL", "-w", "\n__STATUS__:%{http_code}", url],
            capture_output=True, text=True, timeout=30
        )
        out = result.stdout
        marker = "\n__STATUS__:"
        idx = out.rfind(marker)
        status = out[idx + len(marker):].strip()
        content = out[:idx]
        if status != "200" or not content.strip():
            content = ""
        with open(cache_path, "w") as f:
            f.write(content)
    if not content.strip():
        return None
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return None


THIRDS = {"3", "b3"}
SEVENTHS = {"7", "b7", "bb7"}
SUS_DEGREES = {"2", "4"}
EXTENSIONS = {"b9", "9", "#9", "11", "#11", "b13", "13"}


def essential_intervals(formula):
    """
    Which formula intervals can't be dropped without changing the chord's
    identity: root, the 3rd-type tone (or sus degree if no 3rd), the 7th,
    any *altered* 5th (plain perfect 5ths are conventionally droppable),
    and the highest extension named in the formula (lower extensions below
    it are droppable color tones, same as real jazz voicings do).
    """
    formula_set = set(formula)
    essential = {"R"}

    thirds_present = formula_set & THIRDS
    essential |= thirds_present
    if not thirds_present:
        essential |= (formula_set & SUS_DEGREES)

    essential |= (formula_set & SEVENTHS)

    if "b5" in formula_set:
        essential.add("b5")
    if "#5" in formula_set:
        essential.add("#5")

    extensions_present = formula_set & EXTENSIONS
    if extensions_present:
        highest = max(extensions_present, key=lambda iv: INTERVAL_SEMITONES[iv])
        essential.add(highest)

    return essential & formula_set


def required_pitch_classes(suffix, root_key):
    formula = CHORD_FORMULAS.get(suffix)
    if formula is None:
        return None, None
    root_pc = ROOT_PITCH_CLASS[root_key]
    allowed = set()
    essential = set()
    essential_intervals_set = essential_intervals(formula)
    for interval in formula:
        semis = INTERVAL_SEMITONES.get(interval)
        if semis is None:
            continue
        pc = (root_pc + semis) % 12
        allowed.add(pc)
        if interval in essential_intervals_set:
            essential.add(pc)
    return allowed, essential


def convert_position(raw_pos, allowed_pcs, essential_pcs):
    frets_str = raw_pos.get("frets", "")
    if len(frets_str) != 6:
        return None, "bad-length"

    try:
        abs_frets = [decode_fret_char(c) for c in frets_str]
    except ValueError:
        return None, "decode-error"

    fingers_str = raw_pos.get("fingers", "000000")
    fingers = [decode_finger_char(c) for c in fingers_str.ljust(6, "0")[:6]]

    played_pcs = set()
    for i, a in enumerate(abs_frets):
        if a != -1:
            played_pcs.add((TUNING_PITCH_CLASSES[i] + a) % 12)

    if not played_pcs.issubset(allowed_pcs):
        return None, "foreign-note"
    if not essential_pcs.issubset(played_pcs):
        return None, "missing-essential-tone"

    fretted = [a for a in abs_frets if a > 0]
    barre_raw = raw_pos.get("barres")
    barre_abs = None
    if barre_raw not in (None, ""):
        try:
            barre_abs = int(barre_raw)
        except ValueError:
            barre_abs = None

    if not fretted:
        base_fret = 1
        rel = [0 if a == 0 else -1 for a in abs_frets]
        barres_rel = []
    else:
        base_fret = min(fretted)
        span = max(fretted) - base_fret + 1
        if span > 4:
            return None, "span-too-wide"
        rel = []
        for a in abs_frets:
            if a == -1:
                rel.append(-1)
            elif a == 0:
                rel.append(0)
            else:
                rel.append(a - base_fret + 1)
        barres_rel = []
        if barre_abs is not None:
            br = barre_abs - base_fret + 1
            if 1 <= br <= 4:
                barres_rel = [br]

    midi = [OPEN_STRING_MIDI[i] + a for i, a in enumerate(abs_frets) if a != -1]

    return {
        "frets": rel,
        "fingers": fingers,
        "baseFret": base_fret,
        "barres": barres_rel,
        "midi": midi
    }, "ok"


def final_sort_key(p):
    frets = p["frets"]
    open_count = sum(1 for f in frets if f == 0)
    played_count = sum(1 for f in frets if f != -1)
    return (p["baseFret"], -open_count, -played_count)


def merge_positions(existing, candidates):
    def key_for(p):
        return (p["baseFret"], tuple(p["frets"]))

    seen = set()
    merged = []
    for p in existing:
        merged.append(p)
        seen.add(key_for(p))

    for cand in sorted(candidates, key=final_sort_key):
        if len(merged) >= MAX_VOICINGS:
            break
        k = key_for(cand)
        if k in seen:
            continue
        seen.add(k)
        merged.append(cand)

    merged.sort(key=final_sort_key)
    return merged[:MAX_VOICINGS]


def main():
    with open(LOCAL_PATH) as f:
        data = json.load(f)

    stats = {
        "augmented_chords": 0,
        "skipped_no_file": 0,
        "skipped_slash": 0,
        "skipped_no_formula": 0,
        "rejected_positions": 0,
        "added_positions": 0,
        "before_total": 0,
        "after_total": 0,
    }
    rejection_reasons = {}

    for root_key, chord_list in data["chords"].items():
        szaza_root = ROOT_TO_SZAZA.get(root_key)
        for chord in chord_list:
            suffix = chord["suffix"]
            stats["before_total"] += len(chord["positions"])

            if "/" in suffix:
                stats["skipped_slash"] += 1
                stats["after_total"] += len(chord["positions"])
                continue

            allowed_pcs, essential_pcs = required_pitch_classes(suffix, root_key)
            if allowed_pcs is None or szaza_root is None:
                stats["skipped_no_formula"] += 1
                stats["after_total"] += len(chord["positions"])
                continue

            szaza_suffix = SUFFIX_ALIAS.get(suffix, suffix)
            raw = fetch_szaza_file(szaza_root, szaza_suffix)
            if raw is None:
                stats["skipped_no_file"] += 1
                stats["after_total"] += len(chord["positions"])
                continue

            candidates = []
            for raw_pos in raw.get("positions", []):
                converted, reason = convert_position(raw_pos, allowed_pcs, essential_pcs)
                if converted is None:
                    stats["rejected_positions"] += 1
                    rejection_reasons[reason] = rejection_reasons.get(reason, 0) + 1
                    continue
                candidates.append(converted)

            before_count = len(chord["positions"])
            merged = merge_positions(chord["positions"], candidates)
            chord["positions"] = merged
            added = len(merged) - before_count
            if added > 0:
                stats["augmented_chords"] += 1
                stats["added_positions"] += added
            stats["after_total"] += len(merged)

    with open(LOCAL_PATH, "w") as f:
        json.dump(data, f)

    print(json.dumps(stats, indent=2))
    print("Rejection reasons:", rejection_reasons)


if __name__ == "__main__":
    main()
