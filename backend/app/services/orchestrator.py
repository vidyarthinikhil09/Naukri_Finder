import logging
from app.db.supabase import supabase
from app.services.scraper import run_apify_scraper
from app.services.contact_resolver import resolve_contact_waterfall
from app.services.llm import generate_email_draft
from app.utils.helpers import extract_domain
from app.schemas.application import ApplicationCreate, ApplicationStatus

logger = logging.getLogger(__name__)

async def run_daily_sourcing_pipeline(user_id: str, search_query: str, dummy_resume_text: str):
    """
    Orchestrates the entire sourcing pipeline: Scrape -> Resolve -> Draft -> Database.
    """
    logger.info(f"Starting pipeline for user {user_id} with query '{search_query}'")
    
    # 1. Scrape jobs
    jobs = await run_apify_scraper(search_query=search_query, limit=5)
    if not jobs:
        logger.warning("No jobs found by scraper.")
        return []

    results = []
    
    # Process each job
    for job in jobs:
        company_name = job.get("company_name", "Unknown Company")
        job_title = job.get("job_title", "Unknown Title")
        job_details = job.get("job_details", {})
        job_url = job_details.get("url", "")
        
        # 2. Resolve HR contact
        domain = extract_domain(company_name, job_url)
        hr_contact = await resolve_contact_waterfall(domain)
        
        # 3. Generate AI Draft
        ai_draft = await generate_email_draft(job_details, dummy_resume_text, hr_contact)
        
        # 4. Format into Pydantic schema
        application_data = ApplicationCreate(
            status=ApplicationStatus.PENDING,
            company_name=company_name,
            job_title=job_title,
            job_details=job_details,
            hr_contact=hr_contact,
            ai_draft=ai_draft
        )
        
        # 5. Insert into Supabase
        try:
            db_payload = application_data.model_dump()
            # Inject user_id for RLS and ownership tracking in the database
            db_payload["user_id"] = user_id 
            
            response = supabase.table("applications").insert(db_payload).execute()
            results.extend(response.data)
        except Exception as e:
            logger.error(f"Error inserting application into Supabase: {e}")
            
    return results
