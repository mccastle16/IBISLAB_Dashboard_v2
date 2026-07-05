# IBISLAB_Dashboard_v2

Upload a transcribed session (CSV/XLSX/XLS) and get Mean Length of Utterance
(MLU) and conversational-turn metrics automatically, no scripts to run.

Expected columns in the uploaded file:
- a column with `speaker` in its name (values `FEM`, `MAL`, `CHI`, `KCHI`)
- `sentence`
- `start_sec`, `end_sec`

## Running locally

Backend (FastAPI):
```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Frontend (React/Vite), in another terminal:
```
cd frontend
npm install
npm run dev
```

Then open the frontend dev URL (default `http://localhost:5173`) — it proxies
`/api` requests to the backend at `http://localhost:8000`.

Conversational-turn detection supports two methods (see `backend/services/`):
- **naive** — fast, rule-based (speaker change + 5s gap)
- **whisper** — sentence-embedding similarity (`sentence-transformers`,
  downloads the `all-MiniLM-L6-v2` model on first use)

Sentence splitting uses spaCy's rule-based `sentencizer` rather than the
trained `en_core_web_sm` model, so the app has no external model download at
startup — transcripts are already stripped down to letters/digits/`.?!'` by
the preprocessing step, so punctuation-based splitting is sufficient.
