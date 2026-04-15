from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import pytz
import os

from app.core.config import settings
from app.services.scraper import run_apify_scraper
from app.services.contact_resolver import resolve_contact_waterfall
from app.utils.helpers import extract_domain
from app.services.orchestrator import run_daily_sourcing_pipeline
from app.services.email_dispatcher import dispatch_application_email


# =========================
# 🔁 SCHEDULER FUNCTION
# =========================
async def scheduled_daily_scrape():
    print("⏰ [SCHEDULER] Running automated job sourcing pipeline...")
    try:
        await run_daily_sourcing_pipeline(
            user_id="ba39634f-467b-4320-857d-0557ba95e358",
            search_query="Agentic AI Developer remote",
            dummy_resume_text="I am a Software Engineer specializing in Python, RAG pipelines, and multi-agent systems."
        )
        print("✅ [SCHEDULER] Automated pipeline finished successfully.")
    except Exception as e:
        print(f"🚨 [SCHEDULER] Automated pipeline failed: {e}")


# =========================
# 🚀 APP LIFESPAN (Scheduler Start/Stop)
# =========================
@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler(timezone=pytz.timezone('Asia/Kolkata'))

    # Run at 9:00 AM
    scheduler.add_job(scheduled_daily_scrape, 'cron', hour=9, minute=0)

    # Run at 6:00 PM
    scheduler.add_job(scheduled_daily_scrape, 'cron', hour=18, minute=0)

    scheduler.start()
    print("⏱️ Background Scheduler Started (Runs at 9 AM and 6 PM)")

    yield

    scheduler.shutdown()


# =========================
# ⚡ FASTAPI INIT (UPDATED)
# =========================
app = FastAPI(title="AutoHire Agent API", lifespan=lifespan)


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
    jobs = await run_apify_scraper(search_query=request.query, limit=request.limit)

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
# ⚙️ TRIGGER PIPELINE
# =========================
@app.post("/api/jobs/trigger-pipeline")
async def trigger_pipeline(request: PipelineRequest):
    results = await run_daily_sourcing_pipeline(
        user_id=request.user_id,
        search_query=request.search_query,
        dummy_resume_text=request.dummy_resume_text
    )

    return {
        "status": "success",
        "message": "Background pipeline completed successfully.",
        "processed_count": len(results)
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