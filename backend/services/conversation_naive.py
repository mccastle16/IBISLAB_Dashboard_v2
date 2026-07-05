"""
conversation_naive.py
---------------------
Conversational turn detection using the naive method.

A response is counted when ALL of the following are true:
  1. The speaker changes between the current and next utterance.
  2. The next utterance starts within 5 seconds of the current one ending.

No AI embeddings are used — this method is faster and simpler than the
Whisper embedding approach in conversation_whisper.py.

Functions
---------
question_or_no(sentence, nlp)
    Returns (questions_count, statements_count) for a sentence.

count_all_utterances(df_clean, speaker_col, nlp)
    Counts total questions/statements per speaker across the whole file.

detect_responses(df_clean, speaker_col, nlp)
    Detects responses using the naive 5-second + speaker-change rule.
    Returns (real_convo, global_response_questions, global_response_statements).

build_final_results(base_name, minutes, rolling_totals, speaker_counts,
                    global_response_questions, global_response_statements)
    Assembles the final results dict for one file.
"""


# ---------------------------------------------------------------------------
# Question / statement classifier
# ---------------------------------------------------------------------------
def question_or_no(sentence, nlp):
    """Return (num_questions, num_statements) for a sentence string."""
    doc = nlp(sentence)
    questions  = 0
    statements = 0
    for sent in doc.sents:
        if sent.text.strip().endswith("?"):
            questions += 1
        else:
            statements += 1
    return questions, statements


# ---------------------------------------------------------------------------
# Count all utterances across the file
# ---------------------------------------------------------------------------
def count_all_utterances(df_clean, speaker_col, nlp):
    """
    Walk every row and count questions/statements per speaker.

    Returns
    -------
    rolling_total_questions  : int
    rolling_total_statements : int
    speaker_question_counts  : dict {speaker: count}
    speaker_statement_counts : dict {speaker: count}
    results                  : list of per-row dicts
    """
    rolling_total_questions  = 0
    rolling_total_statements = 0
    speaker_question_counts  = {}
    speaker_statement_counts = {}
    results = []

    for u in range(len(df_clean)):
        current_sentence = str(df_clean["sentence"].iloc[u])
        current_index    = df_clean["original_index"].iloc[u]
        current_speaker  = df_clean[speaker_col].iloc[u]

        num_questions, num_statements = question_or_no(current_sentence, nlp)

        rolling_total_questions  += num_questions
        rolling_total_statements += num_statements

        if current_speaker not in speaker_question_counts:
            speaker_question_counts[current_speaker]  = 0
            speaker_statement_counts[current_speaker] = 0

        speaker_question_counts[current_speaker]  += num_questions
        speaker_statement_counts[current_speaker] += num_statements

        results.append({
            "original_index":           current_index,
            "sentence":                 current_sentence,
            "speaker":                  current_speaker,
            "questions_in_sentence":    num_questions,
            "statements_in_sentence":   num_statements,
            "rolling_total_questions":  rolling_total_questions,
            "rolling_total_statements": rolling_total_statements,
            "speaker_total_questions":  speaker_question_counts[current_speaker],
            "speaker_total_statements": speaker_statement_counts[current_speaker],
        })

    return (rolling_total_questions, rolling_total_statements,
            speaker_question_counts, speaker_statement_counts, results)


# ---------------------------------------------------------------------------
# Detect responses using naive method
# ---------------------------------------------------------------------------
def detect_responses(df_clean, speaker_col, nlp):
    """
    Detect responses using the naive rule:
      speaker changed AND next utterance starts within 5 seconds.

    Returns
    -------
    real_convo                  : list of response-pair dicts
    global_response_questions   : dict {speaker: count}
    global_response_statements  : dict {speaker: count}
    """
    real_convo                 = []
    global_response_questions  = {}
    global_response_statements = {}

    u = 0
    while u < len(df_clean) - 1:
        current_speaker = df_clean[speaker_col].iloc[u]
        current_end     = df_clean["end_sec"].iloc[u]
        next_speaker    = df_clean[speaker_col].iloc[u + 1]
        next_start      = df_clean["start_sec"].iloc[u + 1]
        next_sentence   = str(df_clean["sentence"].iloc[u + 1])

        speaker_changed = (next_speaker != current_speaker)
        within_5_sec    = (next_start - current_end) <= 5

        if speaker_changed and within_5_sec:
            resp_q, resp_s = question_or_no(next_sentence, nlp)

            global_response_questions[next_speaker] = (
                global_response_questions.get(next_speaker, 0) + resp_q
            )
            global_response_statements[next_speaker] = (
                global_response_statements.get(next_speaker, 0) + resp_s
            )

            real_convo.append({
                "prompt_index":      df_clean["original_index"].iloc[u],
                "response_index":    df_clean["original_index"].iloc[u + 1],
                "prompt_sentence":   str(df_clean["sentence"].iloc[u]),
                "response_sentence": next_sentence,
                "prompt_speaker":    current_speaker,
                "response_speaker":  next_speaker,
                "gap_sec":           round(next_start - current_end, 3),
                "response_questions":  resp_q,
                "response_statements": resp_s,
            })
        u += 1

    return real_convo, global_response_questions, global_response_statements


# ---------------------------------------------------------------------------
# Build final results dict for one file
# ---------------------------------------------------------------------------
def build_final_results(base_name, minutes, rolling_total_questions,
                         rolling_total_statements, speaker_question_counts,
                         speaker_statement_counts, global_response_questions,
                         global_response_statements):
    """Assemble the final summary dict for one file."""

    def sq(label):
        return sum(v for k, v in speaker_question_counts.items()  if label in str(k))
    def ss(label):
        return sum(v for k, v in speaker_statement_counts.items() if label in str(k))
    def rq(label):
        return sum(v for k, v in global_response_questions.items()  if label in str(k))
    def rs(label):
        return sum(v for k, v in global_response_statements.items() if label in str(k))

    fem_tq  = sq("FEM");  fem_ts  = ss("FEM")
    mal_tq  = sq("MAL");  mal_ts  = ss("MAL")
    chi_tq  = sum(v for k, v in speaker_question_counts.items()  if "CHI" in str(k) and "KCHI" not in str(k))
    chi_ts  = sum(v for k, v in speaker_statement_counts.items() if "CHI" in str(k) and "KCHI" not in str(k))
    kchi_tq = sq("KCHI"); kchi_ts = ss("KCHI")

    fem_rq  = rq("FEM");  fem_rs  = rs("FEM")
    mal_rq  = rq("MAL");  mal_rs  = rs("MAL")
    chi_rq  = sum(v for k, v in global_response_questions.items()  if "CHI" in str(k) and "KCHI" not in str(k))
    chi_rs  = sum(v for k, v in global_response_statements.items() if "CHI" in str(k) and "KCHI" not in str(k))
    kchi_rq = rq("KCHI"); kchi_rs = rs("KCHI")

    total = rolling_total_questions + rolling_total_statements

    return {
        "file":                                       base_name,
        "minutes":                                    minutes,
        "total utterances":                           total,
        "total questions":                            rolling_total_questions,
        "total statements":                           rolling_total_statements,
        "total adult questions":                      fem_tq  + mal_tq,
        "total adult statements":                     fem_ts  + mal_ts,
        "total adult question percentage":            (fem_tq  + mal_tq)  / total if total else 0,
        "total adult statement percentage":           (fem_ts  + mal_ts)  / total if total else 0,
        "total adult response questions":             fem_rq  + mal_rq,
        "total adult response statements":            fem_rs  + mal_rs,
        "total adult response question percentage":   (fem_rq  + mal_rq)  / total if total else 0,
        "total adult response statement percentage":  (fem_rs  + mal_rs)  / total if total else 0,
        "total child questions":                      chi_tq  + kchi_tq,
        "total child statements":                     chi_ts  + kchi_ts,
        "total child question percentage":            (chi_tq  + kchi_tq) / total if total else 0,
        "total child statement percentage":           (chi_ts  + kchi_ts) / total if total else 0,
        "total child response questions":             chi_rq  + kchi_rq,
        "total child response statements":            chi_rs  + kchi_rs,
        "total child response question percentage":   (chi_rq  + kchi_rq) / total if total else 0,
        "total child response statement percentage":  (chi_rs  + kchi_rs) / total if total else 0,
    }
