import httpx
import os
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

ACTOR_ID = "SOME_DEV/linkedin-job-scraper"

async def run_apify_scraper(search_query: str, limit: int = 5) -> list[dict]:
    """
    Runs the Apify job scraper Actor synchronously and returns the normalized dataset.
    """
    url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/run-sync-get-dataset-items?token={settings.APIFY_TOKEN}"
    payload = {
        "search_query": search_query,
        "limit": limit
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            normalized_jobs = []
            for item in data:
                # Map raw fields to our expected format
                normalized_jobs.append({
                    "company_name": item.get("companyName", "Unknown Company"),
                    "job_title": item.get("title", "Unknown Title"),
                    "job_details": {
                        "url": item.get("url", ""),
                        "description_snippet": item.get("description", "")[:500] if item.get("description") else ""
                    }
                })
            return normalized_jobs
            
    except httpx.HTTPError as e:
        logger.error(f"Apify scraper HTTP error: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error in Apify scraper: {e}")
        return []
