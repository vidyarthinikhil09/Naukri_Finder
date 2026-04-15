from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timezone
import os

from app.core.config import settings
from app.services.scraper import run_linkedin_scraper
from app.services.contact_resolver import resolve_contact_waterfall
from app.utils.helpers import extract_domain
from app.services.orchestrator import run_daily_sourcing_pipeline
from app.services.email_dispatcher import dispatch_application_email
from app.db.supabase import supabase

# =========================
# ⚡ FASTAPI INIT (NO SCHEDULER)
# =========================
app = FastAPI(title="AutoHire Agent API")

# =========================
# 🌐 CORS CONFIG
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        settings.FRONTEND_URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# 📦 REQUEST MODELS
# =========================
class ScrapeRequest(BaseModel):
    query: str
    limit: int = 5

class PipelineRequest(BaseModel):
    user_id: str
    search_query: str
    dummy_resume_text: str

class DispatchRequest(BaseModel):
    application_id: str
    google_access_token: str
    google_refresh_token: str

# =========================
# 🩺 HEALTH CHECK
# =========================
@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "AutoHire Engine Online"}

# =========================
# 🔍 SCRAPE JOBS
# =========================
@app.post("/api/jobs/scrape")
async def scrape_jobs(request: ScrapeRequest):
    jobs = await run_linkedin_scraper(search_query=request.query, limit=request.limit)

    for job in jobs:
        company_name = job.get("company_name", "")
        job_url = job.get("job_details", {}).get("url", "")

        domain = extract_domain(company_name, job_url)
        hr_contact = await resolve_contact_waterfall(domain)

        job["hr_contact"] = hr_contact

    return {
        "status": "success",
        "count": len(jobs),
        "data": jobs
    }

# =========================
# ⚙️ TRIGGER PIPELINE (SECURE 3/DAY)
# =========================
@app.post("/api/jobs/trigger-pipeline")
async def trigger_pipeline(request: PipelineRequest):
    # 1. Fetch current usage from Supabase
    response = supabase.table("profiles").select("scrape_count, last_scrape_date").eq("id", request.user_id).single().execute()
    profile = response.data or {}

    # 2. Check the Daily Limit (Max 3 per day)
    today_str = datetime.now(timezone.utc).date().isoformat()
    current_count = profile.get("scrape_count") or 0
    last_date = profile.get("last_scrape_date")

    if last_date == today_str:
        if current_count >= 3:
            return {"status": "error", "message": "Daily limit reached. You can run the agent 3 times per day."}
        new_count = current_count + 1
    else:
        # It's a new day! Reset the count to 1
        new_count = 1

    # 3. Lock the Database IMMEDIATELY to prevent double-clicks
    supabase.table("profiles").update(
        {
            "scrape_count": new_count,
            "last_scrape_date": today_str
        }
    ).eq("id", request.user_id).execute()

    # 4. Deploy Agents
    results = await run_daily_sourcing_pipeline(
        user_id=request.user_id,
        search_query=request.search_query,
        dummy_resume_text=request.dummy_resume_text
    )

    return {
        "status": "success",
        "message": "Background pipeline completed successfully.",
        "processed_count": len(results),
        "runs_remaining": 3 - new_count
    }

# =========================
# 📧 DISPATCH EMAIL
# =========================
@app.post("/api/jobs/dispatch")
async def dispatch_job(request: DispatchRequest):
    client_id = os.getenv("GOOGLE_CLIENT_ID", settings.GOOGLE_CLIENT_ID)
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", settings.GOOGLE_CLIENT_SECRET)

    if not client_id or not client_secret:
        return {"status": "error", "message": "Google Client ID/Secret not configured"}

    try:
        updated_app = await dispatch_application_email(
            application_id=request.application_id,
            google_access_token=request.google_access_token,
            google_refresh_token=request.google_refresh_token,
            client_id=client_id,
            client_secret=client_secret
        )
        return {
            "status": "success",
            "message": "Email dispatched successfully",
            "data": updated_app
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}