"""
IBIS Dashboard API
------------------
Accepts an uploaded transcript spreadsheet (.csv/.xlsx/.xls) and returns
MLU and conversational-turn metrics computed by the services/ pipelines.
"""

import threading

import spacy
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services.analysis import AnalysisError, analyze_file

app = FastAPI(title="IBIS Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_nlp = None
_whisper_model = None
_whisper_lock = threading.Lock()
_whisper_load_error = None


@app.on_event("startup")
def load_spacy_model():
    """
    Rule-based sentence splitting (blank pipeline + sentencizer), not the
    trained en_core_web_sm model: the transcripts this app processes are
    already stripped down to letters/digits/.?!' by preprocessing.clean_sentences,
    so punctuation-based splitting is sufficient and it keeps the app free of
    an external model download at startup.
    """
    global _nlp
    _nlp = spacy.blank("en")
    _nlp.add_pipe("sentencizer")


def get_whisper_model():
    """Lazily load the sentence-transformers model on first use (heavy import)."""
    global _whisper_model, _whisper_load_error
    if _whisper_model is not None or _whisper_load_error is not None:
        return _whisper_model
    with _whisper_lock:
        if _whisper_model is None and _whisper_load_error is None:
            try:
                from sentence_transformers import SentenceTransformer

                _whisper_model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as exc:  # model/deps unavailable
                _whisper_load_error = str(exc)
    return _whisper_model


@app.get("/api/health")
def health():
    return {"status": "ok", "spacyLoaded": _nlp is not None}


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...), method: str = Form("naive")):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    whisper_model = get_whisper_model() if method in ("whisper", "both") else None

    try:
        result = analyze_file(file.filename, content, method, _nlp, whisper_model)
    except AnalysisError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result
