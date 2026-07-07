import uuid

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from metrics import MetricsError, compute_report, parse_workbook, sessions_to_csv

app = FastAPI(title="IBIS Lab Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store: fine for a single-process lab tool, resets on restart.
REPORTS: dict[str, dict] = {}

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@app.post("/api/upload")
async def upload_workbook(file: UploadFile):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Please upload a .xlsx or .xls file.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "File is larger than 25MB.")

    try:
        df = parse_workbook(contents)
        report = compute_report(df, file.filename)
    except MetricsError as exc:
        raise HTTPException(422, str(exc)) from exc

    report_id = uuid.uuid4().hex
    REPORTS[report_id] = report
    return {"report_id": report_id, **report}


@app.get("/api/report/{report_id}")
def get_report(report_id: str):
    report = REPORTS.get(report_id)
    if report is None:
        raise HTTPException(404, "Report not found. It may have expired if the server restarted.")
    return {"report_id": report_id, **report}


@app.get("/api/report/{report_id}/export")
def export_report(report_id: str):
    report = REPORTS.get(report_id)
    if report is None:
        raise HTTPException(404, "Report not found. It may have expired if the server restarted.")
    csv_text = sessions_to_csv(report)
    return PlainTextResponse(
        csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{report_id}_sessions.csv"'},
    )
