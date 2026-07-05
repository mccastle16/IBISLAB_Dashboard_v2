"""
conversation_whisper.py
-----------------------
Conversational turn detection using AI sentence-similarity embeddings.

The embedding model (all-MiniLM-L6-v2) scores how semantically similar
two pieces of text are. Two utterances are considered part of the same
conversation when:
  1. The next utterance starts within 5 seconds of the current one ending.
  2. The cosine similarity between the growing conversation text and the
     candidate utterance is >= 0.5.

Functions
---------
question_or_no(sentence, nlp)
    Returns (questions_count, statements_count) for a sentence.

count_all_utterances(df_clean, speaker_col, nlp)
    Counts total questions/statements per speaker across the whole file.

detect_conversations(df_clean, speaker_col, model, whisper_embeddings, nlp)
    Detects conversational turns using embedding similarity.
    Returns (real_convo, global_response_questions, global_response_statements).

build_final_results(base_name, minutes, rolling_totals, speaker_counts,
                    global_response_questions, global_response_statements)
    Assembles the final results dict for one file.
"""

from sentence_transformers import util


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
# Detect conversations using embedding similarity
# ---------------------------------------------------------------------------
def detect_conversations(df_clean, speaker_col, model, whisper_embeddings, nlp):
    """
    Detect conversational turns using cosine similarity of sentence embeddings.

    Two utterances are grouped into a conversation when the next utterance
    starts within 5 seconds AND the similarity score is >= 0.5.

    Returns
    -------
    real_convo                  : list of conversation dicts
    global_response_questions   : dict {speaker: count}
    global_response_statements  : dict {speaker: count}
    """
    real_convo                 = []
    similarity_score           = []
    global_response_questions  = {}
    global_response_statements = {}

    u = 0
    while u < len(df_clean) - 1:
        current_sentence = str(df_clean["sentence"].iloc[u])
        concat_convo     = current_sentence
        convo_indexes    = [u]
        in_convo         = False
        anchor           = u

        while True:
            start_of_5_sec_threshold = df_clean["end_sec"].iloc[anchor]
            indexes = []
            i = anchor + 1
            while i < len(df_clean):
                future_start_time = df_clean["start_sec"].iloc[i]
                if future_start_time - start_of_5_sec_threshold <= 5:
                    indexes.append(i)
                    i += 1
                else:
                    break

            if len(indexes) == 0:
                break

            found_match = False
            for k in indexes:
                if k in convo_indexes:
                    continue
                concat_embedding = model.encode(concat_convo)
                sim = util.cos_sim(concat_embedding, whisper_embeddings[k]).item()
                similarity_score.append({
                    "Current convo":      concat_convo,
                    "Candidate sentence": df_clean["sentence"].iloc[k],
                    "Similarity":         sim,
                    "Candidate index":    k,
                })
                concat_convo = " ".join([concat_convo, str(df_clean["sentence"].iloc[k])])
                convo_indexes.append(k)
                if sim >= 0.5:
                    in_convo = True
                    anchor   = k
                    found_match = True
                    break

            if not found_match:
                break

        if in_convo:
            speaker_questions          = {}
            speaker_statements         = {}
            speaker_response_questions = {}
            speaker_response_statements = {}

            for position, idx in enumerate(convo_indexes):
                sentence = str(df_clean["sentence"].iloc[idx])
                speaker  = df_clean[speaker_col].iloc[idx]
                q_in, s_in = question_or_no(sentence, nlp)

                if speaker not in speaker_questions:
                    speaker_questions[speaker]           = 0
                    speaker_statements[speaker]          = 0
                    speaker_response_questions[speaker]  = 0
                    speaker_response_statements[speaker] = 0

                speaker_questions[speaker]  += q_in
                speaker_statements[speaker] += s_in

                if position > 0:
                    speaker_response_questions[speaker]  += q_in
                    speaker_response_statements[speaker] += s_in

            for speaker, count in speaker_response_questions.items():
                global_response_questions[speaker] = (
                    global_response_questions.get(speaker, 0) + count
                )
            for speaker, count in speaker_response_statements.items():
                global_response_statements[speaker] = (
                    global_response_statements.get(speaker, 0) + count
                )

            real_convo.append({
                "indexes":                     df_clean["original_index"].iloc[convo_indexes].tolist(),
                "conversation":                concat_convo,
                "speakers":                    df_clean[speaker_col].iloc[convo_indexes].tolist(),
                "total questions in convo":    sum(speaker_questions.values()),
                "total statements in convo":   sum(speaker_statements.values()),
                "speaker questions":           speaker_questions,
                "speaker statements":          speaker_statements,
                "speaker response questions":  speaker_response_questions,
                "speaker response statements": speaker_response_statements,
                "total response questions":    sum(speaker_response_questions.values()),
                "total response statements":   sum(speaker_response_statements.values()),
            })
            u = convo_indexes[-1] + 1
        else:
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
