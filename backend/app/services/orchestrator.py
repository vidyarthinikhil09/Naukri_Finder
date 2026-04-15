import asyncio
import json
from app.services.scraper import run_linkedin_scraper, run_indeed_scraper
from app.services.contact_resolver import resolve_contact_waterfall
from app.services.llm import generate_email_draft
from app.utils.helpers import extract_domain
from app.db.supabase import supabase

async def run_daily_sourcing_pipeline(user_id: str, search_query: str, dummy_resume_text: str):
    """
    The main orchestrator: Scrapes LinkedIn and Indeed simultaneously, finds contacts, drafts emails, and saves to DB.
    """
    
    # 1. Scrape Jobs Concurrently
    print(f"\n[PIPELINE] Deploying multi-platform agents for: {search_query}")
    
    # UPDATED LIMITS: 10 for LinkedIn, 10 for Indeed
    linkedin_jobs, indeed_jobs = await asyncio.gather(
        run_linkedin_scraper(search_query, limit=10),
        run_indeed_scraper(search_query, limit=10)
    )
    
    # Combine the results
    scraped_jobs = linkedin_jobs + indeed_jobs
    print(f"[PIPELINE] Combined scrape total: {len(scraped_jobs)} jobs.")

    saved_applications = []

    # 2. Process Each Job
    for job in scraped_jobs:
        company_name = job["company_name"]
        job_url = job["job_details"].get("url", "")
        
        # Step A: Resolve Contact
        domain = extract_domain(company_name, job_url)
        hr_contact = await resolve_contact_waterfall(domain)
        job["hr_contact"] = hr_contact

        # Step B: AI Draft (Only if we found an email)
        ai_draft = {}
        if hr_contact and hr_contact.get("email"):
            ai_draft = await generate_email_draft(
                job_details=job,
                hr_contact=hr_contact,
                resume_text=dummy_resume_text
            )
        job["ai_draft"] = ai_draft

        # Step C: Save to Supabase
        db_payload = {
            "user_id": user_id,
            "company_name": company_name,
            "job_title": job["job_title"],
            "status": "PENDING",
            "job_details": job["job_details"],
            "hr_contact": hr_contact,
            "ai_draft": ai_draft
        }

        try:
            response = supabase.table("applications").insert(db_payload).execute()
            if response.data:
                saved_applications.append(response.data[0])
            print(f"💾 Saved: {company_name}")
        except Exception as e:
            print(f"🚨 DB Save Error for {company_name}: {e}")

    print(f"\n🎉 [PIPELINE] Completed! Saved {len(saved_applications)} applications to the Command Center.")
    return saved_applications