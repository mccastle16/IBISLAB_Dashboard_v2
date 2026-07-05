"""
mlu_analysis.py
---------------
Mean Length of Utterance (MLU) analysis functions.

Adapted from the original MLU scripts for use inside a long-running API
server: the spaCy model is passed in as an argument instead of being loaded
at import time, so the server controls exactly when/how it's loaded.

Functions
---------
calculating_words(sentence)
    Tokenises and cleans a sentence, returns (word_list, word_count).

count_utterances(sentence, nlp)
    Returns the number of spaCy-detected sentences in a string.

is_question(text, nlp)
    Returns True if any spaCy sentence in the string ends with '?'.

empty_accum()
    Returns a blank accumulator dict {words, utts, lengths}.

accumulate(accum, row_text, nlp)
    Adds one utterance row into an accumulator.

compute_stats(accum)
    Returns (MLU, max, min, stdev) from an accumulator.

group_stats(acc_dict, members)
    Merges multiple speaker accumulators and computes combined stats.

fill_accumulators(df, text_col, speaker_col, speakers, nlp)
    Iterates df and fills overall, question, and non-question accumulators.
"""

import pandas as pd
import re


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------
def calculating_words(sentence):
    """Clean and tokenise a sentence. Returns (word_list, word_count)."""
    if pd.isna(sentence):
        return [], 0
    sentence = sentence.lower()
    sentence = re.sub(r"\.{2,}", " ", sentence)
    sentence = re.sub(r"[^a-zA-Z0-9\s\.\?\!']", "", sentence)
    sentence = sentence.strip()
    words = sentence.split()
    return words, len(words)


def count_utterances(sentence, nlp):
    """Return the number of spaCy-detected sentences in a string."""
    doc = nlp(sentence)
    return sum(1 for sent in doc.sents if sent.text.strip())


def is_question(text, nlp):
    """Return True if any sentence in text ends with '?'."""
    if pd.isna(text):
        return False
    doc = nlp(str(text).strip())
    for sent in doc.sents:
        if sent.text.strip().endswith("?"):
            return True
    return False


# ---------------------------------------------------------------------------
# Accumulator helpers
# ---------------------------------------------------------------------------
def empty_accum():
    """Return a blank accumulator dict."""
    return {"words": 0, "utts": 0, "lengths": []}


def accumulate(accum, row_text, nlp):
    """Add one utterance row into an accumulator dict."""
    if pd.isna(row_text):
        return
    _, word_count = calculating_words(row_text)
    utt_count = count_utterances(row_text, nlp)
    accum["words"] += word_count
    accum["utts"]  += utt_count
    doc = nlp(row_text)
    for sent in doc.sents:
        st = sent.text.strip().lower().replace("_", "")
        st = re.sub(r"\.{2,}", " ", st)
        st = re.sub(r"[^a-zA-Z0-9\s\.\?\!']", "", st)
        sw = st.split()
        if sw:
            accum["lengths"].append(len(sw))


def compute_stats(accum):
    """Return (MLU, max, min, stdev) from an accumulator dict."""
    lengths = pd.Series(accum["lengths"])
    mlu  = accum["words"] / accum["utts"] if accum["utts"] > 0 else pd.NA
    _max = lengths.max() if len(lengths) > 0 else pd.NA
    _min = lengths.min() if len(lengths) > 0 else pd.NA
    _std = lengths.std() if len(lengths) > 1 else pd.NA
    return mlu, _max, _min, _std


def group_stats(acc_dict, members):
    """Merge multiple speaker accumulators into combined stats."""
    combined = empty_accum()
    for s in members:
        combined["words"]   += acc_dict[s]["words"]
        combined["utts"]    += acc_dict[s]["utts"]
        combined["lengths"] += acc_dict[s]["lengths"]
    return compute_stats(combined)


# ---------------------------------------------------------------------------
# Fill accumulators from a DataFrame
# ---------------------------------------------------------------------------
def fill_accumulators(df, text_col, speaker_col, speakers, nlp):
    """
    Iterate df rows and fill three dicts of accumulators:
      overall_acc, q_acc (questions only), nq_acc (non-questions only)
    keyed by speaker label.

    Returns (overall_acc, q_acc, nq_acc).
    """
    overall_acc = {s: empty_accum() for s in speakers}
    q_acc       = {s: empty_accum() for s in speakers}
    nq_acc      = {s: empty_accum() for s in speakers}

    for i in range(len(df)):
        row_text = df[text_col].iloc[i]
        speaker  = df[speaker_col].iloc[i]
        if speaker not in speakers or pd.isna(row_text):
            continue
        accumulate(overall_acc[speaker], row_text, nlp)
        if is_question(row_text, nlp):
            accumulate(q_acc[speaker], row_text, nlp)
        else:
            accumulate(nq_acc[speaker], row_text, nlp)

    return overall_acc, q_acc, nq_acc
