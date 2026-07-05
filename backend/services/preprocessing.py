"""
preprocessing.py
----------------
Shared data-cleaning steps used by all four pipelines:
  - WhisperOnly MLU
  - WhisperOnly Conversational Turns
  - Naive MLU
  - Naive Conversational Turns

Functions
---------
drop_triple_repeats(df)
    Removes rows where a sentence appears more than twice in a row.

add_original_index(df)
    Adds an 'original_index' column that mirrors the original spreadsheet
    row numbers (starting at 2 to match Excel/CSV row numbering).

find_speaker_col(df, filename, case_sensitive=False)
    Finds the speaker column by searching for 'speaker' in column names.
    Returns the column name, or None if not found.

normalize_speakers(df, speaker_col, valid_speakers)
    Strips whitespace, uppercases, and filters rows to only valid speakers.

clean_sentences(df, sentence_col='sentence')
    Cleans sentence text: removes repeated dots, strips special characters.

interpolate_times(df)
    Fills missing start_sec / end_sec values using linear interpolation.

prepare_dataframe(df, filename, valid_speakers, case_sensitive=False)
    Runs all of the above steps in order. Returns (df_clean, speaker_col)
    or (None, None) if the speaker column is missing.
"""

import pandas as pd
import numpy as np
import re


# ---------------------------------------------------------------------------
# Step 1 — Remove rows where the same sentence appears 3+ times in a row
# ---------------------------------------------------------------------------
def drop_triple_repeats(df):
    """Return a copy of df with rows removed where a sentence repeats > 2 times consecutively."""
    j = 0
    rows_to_drop = []
    count = 0
    while j < len(df):
        current = df["sentence"].iloc[j]
        prev = None
        k = j - 1
        while k >= 0:
            prev_val = df["sentence"].iloc[k]
            if pd.notna(prev_val):
                prev = prev_val
                break
            k -= 1
        if prev is not None and pd.notna(current) and current == prev:
            count += 1
        else:
            count = 1
        if count > 2:
            rows_to_drop.append(df.index[j])
        j += 1
    return df.drop(index=rows_to_drop).copy()


# ---------------------------------------------------------------------------
# Step 2 — Record original row numbers before any filtering
# ---------------------------------------------------------------------------
def add_original_index(df):
    """Add original_index column (matches spreadsheet row numbers starting at 2)."""
    df = df.copy()
    df["original_index"] = np.arange(len(df)) + 2
    return df


# ---------------------------------------------------------------------------
# Step 3 — Find the speaker column dynamically
# ---------------------------------------------------------------------------
def find_speaker_col(df, filename, case_sensitive=False):
    """
    Search column names for 'speaker' (case-insensitive by default).
    Returns the column name string, or None if not found.
    """
    for col in df.columns:
        search_in = col if case_sensitive else col.lower()
        if "speaker" in search_in:
            return col
    print(f"  Skipping {filename}: no speaker column found")
    return None


# ---------------------------------------------------------------------------
# Step 4 — Normalise speaker labels and filter to valid speakers only
# ---------------------------------------------------------------------------
def normalize_speakers(df, speaker_col, valid_speakers):
    """Uppercase and strip speaker labels, then keep only rows in valid_speakers."""
    df = df.copy()
    df[speaker_col] = df[speaker_col].astype(str).str.strip().str.upper()
    df = df[df[speaker_col].isin(valid_speakers)].copy()
    return df


# ---------------------------------------------------------------------------
# Step 5 — Clean sentence text
# ---------------------------------------------------------------------------
def clean_sentences(df, sentence_col="sentence"):
    """Remove repeated dots and special characters from sentence text."""
    df = df.copy()
    df[sentence_col] = df[sentence_col].str.replace(r"\.{2,}", " ", regex=True)
    df[sentence_col] = df[sentence_col].str.replace(r"[^a-zA-Z0-9\s\.\?\!']", "", regex=True)
    df[sentence_col] = df[sentence_col].str.strip()
    return df


# ---------------------------------------------------------------------------
# Step 6 — Interpolate missing timestamps
# ---------------------------------------------------------------------------
def interpolate_times(df):
    """Fill missing start_sec / end_sec with linear interpolation."""
    df = df.copy()
    df["start_sec"] = pd.to_numeric(df["start_sec"], errors="coerce")
    df["end_sec"]   = pd.to_numeric(df["end_sec"],   errors="coerce")
    df["start_sec"] = df["start_sec"].interpolate(method="linear", limit_area="inside")
    df["end_sec"]   = df["end_sec"].interpolate(method="linear",   limit_area="inside")
    return df


# ---------------------------------------------------------------------------
# Master function — run all steps in order
# ---------------------------------------------------------------------------
def prepare_dataframe(df, filename, valid_speakers, case_sensitive=False):
    """
    Run the full preprocessing pipeline.

    Parameters
    ----------
    df              : raw DataFrame loaded from CSV or Excel
    filename        : used only for warning messages
    valid_speakers  : list of speaker labels to keep, e.g. ["FEM","MAL","CHI","KCHI"]
    case_sensitive  : whether speaker column search is case-sensitive (default False)

    Returns
    -------
    (df_clean, speaker_col)  — or (None, None) if no speaker column found
    """
    df = add_original_index(df)
    df = drop_triple_repeats(df)
    df = df.reset_index(drop=True)

    speaker_col = find_speaker_col(df, filename, case_sensitive=case_sensitive)
    if speaker_col is None:
        return None, None

    df = normalize_speakers(df, speaker_col, valid_speakers)
    df = clean_sentences(df)
    df = interpolate_times(df)
    df = df.reset_index(drop=True)

    return df, speaker_col
