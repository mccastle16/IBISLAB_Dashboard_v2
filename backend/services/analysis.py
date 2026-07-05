"""
analysis.py
-----------
Orchestrates the shared preprocessing + MLU + conversational-turn pipelines
(preprocessing.py, mlu_analysis.py, conversation_naive.py,
conversation_whisper.py) and reshapes their output into a single JSON-ready
dict for the /api/analyze endpoint.

This module owns the "spreadsheet -> DataFrame -> metrics" glue; it does not
duplicate the counting/detection logic that already lives in the pipeline
modules.
"""

import io
import re

import numpy as np
import pandas as pd

from . import conversation_naive, conversation_whisper, mlu_analysis, preprocessing

SPEAKERS = ["FEM", "MAL", "CHI", "KCHI"]
ADULT_SPEAKERS = ["FEM", "MAL"]
CHILD_SPEAKERS = ["CHI", "KCHI"]

VALID_METHODS = {"naive", "whisper", "both"}


class AnalysisError(ValueError):
    """Raised for problems with the uploaded file that the caller should see as a 4xx."""


# ---------------------------------------------------------------------------
# File loading
# ---------------------------------------------------------------------------
def load_dataframe(filename: str, content: bytes) -> pd.DataFrame:
    """Load an uploaded CSV/XLS/XLSX file into a DataFrame."""
    lower = filename.lower()
    buffer = io.BytesIO(content)
    try:
        if lower.endswith(".csv"):
            return pd.read_csv(buffer)
        if lower.endswith((".xlsx", ".xls")):
            return pd.read_excel(buffer)
    except Exception as exc:  # pandas raises many different error types
        raise AnalysisError(f"Could not read '{filename}': {exc}") from exc
    raise AnalysisError("Unsupported file type. Please upload a .csv, .xlsx, or .xls file.")


def extract_minutes(base_name: str):
    """Pull a trailing '_<number>' out of a filename, e.g. Subject01_20 -> 20."""
    match = re.search(r"_(\d+)$", base_name)
    return int(match.group(1)) if match else None


# ---------------------------------------------------------------------------
# JSON-safe number helper
# ---------------------------------------------------------------------------
def clean_num(value):
    """Convert pandas/numpy scalars (incl. NA) into plain JSON-safe values."""
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        return round(float(value), 3)
    return value


# ---------------------------------------------------------------------------
# MLU section
# ---------------------------------------------------------------------------
def _stats_dict(accum):
    mlu, mx, mn, std = mlu_analysis.compute_stats(accum)
    return {
        "mlu": clean_num(mlu),
        "max": clean_num(mx),
        "min": clean_num(mn),
        "stdev": clean_num(std),
        "utteranceCount": accum["utts"],
    }


def _group_stats_dict(acc_dict, members):
    if not members:
        return None
    mlu, mx, mn, std = mlu_analysis.group_stats(acc_dict, members)
    utts = sum(acc_dict[m]["utts"] for m in members)
    return {
        "mlu": clean_num(mlu),
        "max": clean_num(mx),
        "min": clean_num(mn),
        "stdev": clean_num(std),
        "utteranceCount": utts,
    }


def build_mlu_section(df_clean, speaker_col, speakers_present, nlp):
    overall_acc, q_acc, nq_acc = mlu_analysis.fill_accumulators(
        df_clean, "sentence", speaker_col, speakers_present, nlp
    )

    per_speaker = [
        {
            "speaker": sp,
            "overall": _stats_dict(overall_acc[sp]),
            "questions": _stats_dict(q_acc[sp]),
            "nonQuestions": _stats_dict(nq_acc[sp]),
        }
        for sp in speakers_present
    ]

    adults_present = [s for s in ADULT_SPEAKERS if s in speakers_present]
    children_present = [s for s in CHILD_SPEAKERS if s in speakers_present]

    def group(members):
        if not members:
            return None
        return {
            "overall": _group_stats_dict(overall_acc, members),
            "questions": _group_stats_dict(q_acc, members),
            "nonQuestions": _group_stats_dict(nq_acc, members),
        }

    return {
        "perSpeaker": per_speaker,
        "groups": {
            "adult": group(adults_present),
            "child": group(children_present),
            "overall": group(speakers_present),
        },
    }


# ---------------------------------------------------------------------------
# Conversational-turns section
# ---------------------------------------------------------------------------
def _nest_turns(flat):
    return {
        "totalUtterances": flat["total utterances"],
        "totalQuestions": flat["total questions"],
        "totalStatements": flat["total statements"],
        "adult": {
            "questions": flat["total adult questions"],
            "statements": flat["total adult statements"],
            "questionPct": clean_num(flat["total adult question percentage"]),
            "statementPct": clean_num(flat["total adult statement percentage"]),
            "responseQuestions": flat["total adult response questions"],
            "responseStatements": flat["total adult response statements"],
            "responseQuestionPct": clean_num(flat["total adult response question percentage"]),
            "responseStatementPct": clean_num(flat["total adult response statement percentage"]),
        },
        "child": {
            "questions": flat["total child questions"],
            "statements": flat["total child statements"],
            "questionPct": clean_num(flat["total child question percentage"]),
            "statementPct": clean_num(flat["total child statement percentage"]),
            "responseQuestions": flat["total child response questions"],
            "responseStatements": flat["total child response statements"],
            "responseQuestionPct": clean_num(flat["total child response question percentage"]),
            "responseStatementPct": clean_num(flat["total child response statement percentage"]),
        },
    }


def build_naive_turns(df_clean, speaker_col, nlp, base_name, minutes,
                       rolling_q, rolling_s, sp_q_counts, sp_s_counts):
    _, resp_q, resp_s = conversation_naive.detect_responses(df_clean, speaker_col, nlp)
    flat = conversation_naive.build_final_results(
        base_name, minutes, rolling_q, rolling_s, sp_q_counts, sp_s_counts, resp_q, resp_s
    )
    return _nest_turns(flat)


def build_whisper_turns(df_clean, speaker_col, nlp, model, base_name, minutes,
                         rolling_q, rolling_s, sp_q_counts, sp_s_counts):
    sentences = df_clean["sentence"].astype(str).tolist()
    embeddings = model.encode(sentences, convert_to_tensor=True)
    _, resp_q, resp_s = conversation_whisper.detect_conversations(
        df_clean, speaker_col, model, embeddings, nlp
    )
    flat = conversation_whisper.build_final_results(
        base_name, minutes, rolling_q, rolling_s, sp_q_counts, sp_s_counts, resp_q, resp_s
    )
    return _nest_turns(flat)


# ---------------------------------------------------------------------------
# Full pipeline for one uploaded file
# ---------------------------------------------------------------------------
def analyze_file(filename: str, content: bytes, method: str, nlp, whisper_model=None):
    if method not in VALID_METHODS:
        raise AnalysisError(f"Unknown method '{method}'. Expected one of {sorted(VALID_METHODS)}.")

    df_raw = load_dataframe(filename, content)
    if df_raw.empty:
        raise AnalysisError("The uploaded file has no rows.")

    base_name = re.sub(r"\.(csv|xlsx|xls)$", "", filename, flags=re.IGNORECASE)
    minutes = extract_minutes(base_name)

    df_clean, speaker_col = preprocessing.prepare_dataframe(df_raw, filename, valid_speakers=SPEAKERS)
    if df_clean is None:
        raise AnalysisError(
            "No speaker column found. Expected a column with 'speaker' in its name."
        )
    if df_clean.empty:
        raise AnalysisError(
            f"No rows matched the expected speaker labels ({', '.join(SPEAKERS)})."
        )
    for required in ("sentence", "start_sec", "end_sec"):
        if required not in df_clean.columns:
            raise AnalysisError(f"Missing required column '{required}'.")

    speakers_present = [s for s in SPEAKERS if s in set(df_clean[speaker_col].unique())]

    rolling_q, rolling_s, sp_q_counts, sp_s_counts, _ = conversation_naive.count_all_utterances(
        df_clean, speaker_col, nlp
    )

    turns = {}
    warnings = []

    if method in ("naive", "both"):
        turns["naive"] = build_naive_turns(
            df_clean, speaker_col, nlp, base_name, minutes,
            rolling_q, rolling_s, sp_q_counts, sp_s_counts,
        )

    if method in ("whisper", "both"):
        if whisper_model is None:
            warnings.append("Whisper (semantic) method requested but the embedding model is unavailable.")
        else:
            turns["whisper"] = build_whisper_turns(
                df_clean, speaker_col, nlp, whisper_model, base_name, minutes,
                rolling_q, rolling_s, sp_q_counts, sp_s_counts,
            )

    mlu = build_mlu_section(df_clean, speaker_col, speakers_present, nlp)

    return {
        "fileName": filename,
        "minutes": minutes,
        "speakerColumn": speaker_col,
        "speakersPresent": speakers_present,
        "rowsAnalyzed": int(len(df_clean)),
        "totals": {
            "utterances": rolling_q + rolling_s,
            "questions": rolling_q,
            "statements": rolling_s,
        },
        "mlu": mlu,
        "turns": turns,
        "warnings": warnings,
    }
