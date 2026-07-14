"""Parses an uploaded language-sample Excel export and computes the
metrics the dashboard shows: MLU, conversational turns, and lexical
diversity, grouped by session and by speaker.

Column names in lab exports vary, so we match on a set of common aliases
rather than one fixed header. Speaker labels are used verbatim from the
file (e.g. "CHI"/"EXA") instead of being mapped to assumed roles, since
that mapping isn't something we can infer reliably.
"""

import io
import re
from collections import OrderedDict

import pandas as pd

SPEAKER_ALIASES = ["speaker", "Speaker (FEM, CHI, MAL)", "participant", "role", "tier", "speaker_id"]
UTTERANCE_ALIASES = ["sentence","utterance", "transcript", "text", "line", "utterance_text"]
SESSION_ALIASES = ["session", "session_id", "sessionid", "visit", "visit_number"]
DATE_ALIASES = ["date", "session_date", "visit_date"]
MORPHEME_ALIASES = ["morphemes", "morpheme_count", "mor_count", "morpheme"]

WORD_RE = re.compile(r"[A-Za-z']+")
LENGTH_BUCKETS = [(1, 2), (3, 4), (5, 6), (7, 8), (9, None)]


class MetricsError(ValueError):
    """Raised when the uploaded file doesn't have columns we can work with."""


def _normalize(name: str) -> str:
    return re.sub(r"[\s_]+", "_", str(name).strip().lower())


def _find_column(columns_by_norm: dict, aliases: list[str]) -> str | None:
    for alias in aliases:
        norm_alias = _normalize(alias)
        if norm_alias in columns_by_norm:
            return columns_by_norm[norm_alias]
    return None


def parse_workbook(file_bytes: bytes) -> pd.DataFrame:
    """Reads the first sheet and maps its columns to our canonical fields."""
    try:
        raw = pd.read_excel(io.BytesIO(file_bytes), sheet_name=0)
    except Exception as exc:  # noqa: BLE001 - surface as a clear upload error
        raise MetricsError(f"Couldn't read this file as an Excel workbook ({exc}).") from exc

    columns_by_norm = {_normalize(c): c for c in raw.columns}

    speaker_col = _find_column(columns_by_norm, SPEAKER_ALIASES)
    utterance_col = _find_column(columns_by_norm, UTTERANCE_ALIASES)
    if speaker_col is None or utterance_col is None:
        raise MetricsError(
            "Couldn't find a speaker and/or utterance column. "
            f"Expected a column named one of {SPEAKER_ALIASES} for the speaker, "
            f"and one of {UTTERANCE_ALIASES} for the utterance text. "
            f"Found columns: {list(raw.columns)}"
        )

    session_col = _find_column(columns_by_norm, SESSION_ALIASES)
    date_col = _find_column(columns_by_norm, DATE_ALIASES)
    morpheme_col = _find_column(columns_by_norm, MORPHEME_ALIASES)

    df = pd.DataFrame(
        {
            "speaker": raw[speaker_col].astype(str).str.strip(),
            "utterance": raw[utterance_col].astype(str).fillna(""),
        }
    )
    df["session"] = raw[session_col].astype(str).str.strip() if session_col else "Session 1"
    df["date"] = raw[date_col] if date_col else None
    df["morphemes"] = pd.to_numeric(raw[morpheme_col], errors="coerce") if morpheme_col else None

    # Drop rows with no real utterance text (blank separator rows, etc).
    df = df[df["utterance"].str.strip().str.len() > 0].reset_index(drop=True)
    if df.empty:
        raise MetricsError("No utterance rows were found after removing blank rows.")

    df["words"] = df["utterance"].apply(lambda t: WORD_RE.findall(t))
    df["word_count"] = df["words"].apply(len)
    return df


def _format_date(value) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        return pd.to_datetime(value).strftime("%b %-d, %Y")
    except Exception:  # noqa: BLE001 - fall back to the raw string
        text = str(value).strip()
        return text or None


def _length_bucket(n: int) -> str:
    for lo, hi in LENGTH_BUCKETS:
        if hi is None and n >= lo:
            return f"{lo}+"
        if hi is not None and lo <= n <= hi:
            return f"{lo}–{hi}"
    return f"{LENGTH_BUCKETS[0][0]}–{LENGTH_BUCKETS[0][1]}"


def _turn_counts(speakers: list[str]) -> dict[str, int]:
    """A turn is a contiguous run of utterances by the same speaker."""
    counts: dict[str, int] = {}
    prev = None
    for s in speakers:
        if s != prev:
            counts[s] = counts.get(s, 0) + 1
        prev = s
    return counts


def _lexical(utterances_words: list[list[str]]) -> tuple[int, int, float | None]:
    tokens = [w.lower() for words in utterances_words for w in words]
    total = len(tokens)
    unique = len(set(tokens))
    ttr = round(unique / total, 3) if total else None
    return unique, total, ttr


def compute_report(df: pd.DataFrame, filename: str) -> dict:
    speaker_order = df["speaker"].value_counts().index.tolist()
    primary_speakers = speaker_order[:2]

    # Order sessions by date if we have one, else by first appearance.
    session_first_date = OrderedDict()
    for session_id, group in df.groupby("session", sort=False):
        session_first_date[session_id] = group["date"].dropna().iloc[0] if group["date"].notna().any() else None
    if any(v is not None for v in session_first_date.values()):
        ordered_sessions = sorted(
            session_first_date,
            key=lambda s: pd.to_datetime(session_first_date[s], errors="coerce") or pd.Timestamp.min,
        )
    else:
        ordered_sessions = list(session_first_date.keys())

    sessions_out = []
    for session_id in ordered_sessions:
        group = df[df["session"] == session_id]
        turns = _turn_counts(group["speaker"].tolist())

        mlu_words, mlu_morphemes, ndw, ttr, hist = {}, {}, {}, {}, {}
        for sp in primary_speakers:
            sp_rows = group[group["speaker"] == sp]
            if sp_rows.empty:
                continue
            mlu_words[sp] = round(sp_rows["word_count"].mean(), 2)
            if sp_rows["morphemes"].notna().any():
                mlu_morphemes[sp] = round(sp_rows["morphemes"].mean(), 2)
            unique, _total, sp_ttr = _lexical(sp_rows["words"].tolist())
            ndw[sp] = unique
            ttr[sp] = sp_ttr
            buckets = OrderedDict((f"{lo}–{hi}" if hi else f"{lo}+", 0) for lo, hi in LENGTH_BUCKETS)
            for n in sp_rows["word_count"]:
                buckets[_length_bucket(n)] += 1
            hist[sp] = buckets

        total_turns = sum(turns.get(sp, 0) for sp in primary_speakers)
        total_utterances = len(group)

        sessions_out.append(
            {
                "id": session_id,
                "date": _format_date(session_first_date.get(session_id)),
                "utterances": total_utterances,
                "turns": {sp: turns.get(sp, 0) for sp in primary_speakers},
                "avg_turn_length": round(total_utterances / total_turns, 2) if total_turns else None,
                "mlu_words": mlu_words,
                "mlu_morphemes": mlu_morphemes or None,
                "ndw": ndw,
                "ttr": ttr,
                "utterance_length_hist": hist,
            }
        )

    def _avg(key_path):
        vals = []
        for s in sessions_out:
            d = s
            for k in key_path[:-1]:
                d = d.get(k) or {}
            v = d.get(key_path[-1]) if isinstance(d, dict) else None
            if v is not None:
                vals.append(v)
        return round(sum(vals) / len(vals), 2) if vals else None

    primary = primary_speakers[0] if primary_speakers else None
    summary = {
        "sessions_count": len(sessions_out),
        "primary_speaker": primary,
        "avg_mlu_words": _avg(["mlu_words", primary]) if primary else None,
        "avg_mlu_morphemes": _avg(["mlu_morphemes", primary]) if primary else None,
        "total_turns": sum(sum(s["turns"].values()) for s in sessions_out),
        "avg_turns_per_session": round(
            sum(sum(s["turns"].values()) for s in sessions_out) / len(sessions_out), 1
        )
        if sessions_out
        else None,
        "avg_ttr": _avg(["ttr", primary]) if primary else None,
        "avg_ndw": _avg(["ndw", primary]) if primary else None,
    }

    missing_ratio = 0.0  # rows with blank utterances were already dropped during parsing
    status = "Needs review" if missing_ratio > 0.1 else "Processed"

    return {
        "file": {"name": filename, "rows": int(len(df)), "status": status},
        "speakers": primary_speakers,
        "sessions": sessions_out,
        "summary": summary,
    }


def sessions_to_csv(report: dict) -> str:
    rows = []
    for s in report["sessions"]:
        row = {"session": s["id"], "date": s["date"], "utterances": s["utterances"]}
        for sp in report["speakers"]:
            row[f"mlu_words[{sp}]"] = s["mlu_words"].get(sp)
            if s["mlu_morphemes"]:
                row[f"mlu_morphemes[{sp}]"] = s["mlu_morphemes"].get(sp)
            row[f"turns[{sp}]"] = s["turns"].get(sp)
            row[f"ndw[{sp}]"] = s["ndw"].get(sp)
            row[f"ttr[{sp}]"] = s["ttr"].get(sp)
        rows.append(row)
    return pd.DataFrame(rows).to_csv(index=False)
