from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.core.config import settings
from app.services.scraper import run_apify_scraper
from app.services.contact_resolver import resolve_contact_waterfall
from app.utils.helpers import extract_domain
from app.services.orchestrator import run_daily_sourcing_pipeline
from app.services.email_dispatcher import dispatch_application_email
import os

app = FastAPI(title="AutoHire Agent API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "AutoHire Engine Online"}

@app.post("/api/jobs/scrape")
async def scrape_jobs(request: ScrapeRequest):
    jobs = await run_apify_scraper(search_query=request.query, limit=request.limit)
    
    # Process each job to find HR contacts
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

@app.post("/api/jobs/trigger-pipeline")
async def trigger_pipeline(request: PipelineRequest):
    # In a production environment, this would be dispatched to a background worker (e.g., Celery/Redis)
    # For this MVP, we await the pipeline directly.
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
