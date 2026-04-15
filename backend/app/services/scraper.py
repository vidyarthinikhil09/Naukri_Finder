from apify_client import ApifyClientAsync
from app.core.config import settings

LINKEDIN_ACTOR_ID = "hKByXkMQaC5Qt9UMN"
INDEED_ACTOR_ID = "TrtlecxAsNRbKl1na"

async def run_linkedin_scraper(search_query: str, limit: int = 10) -> list[dict]:
    """
    Runs the Apify LinkedIn scraper Actor.
    """
    client = ApifyClientAsync(settings.APIFY_TOKEN)
    
    # We append the location directly to the query for LinkedIn to ensure strict matching
    target_query = f"{search_query} Hyderabad Telangana"
    
    run_input = {
        "queries": target_query,
        "publishedAt": "Any time",
        "limit": limit,
    }
    
    try:
        print(f"\n🚀 Starting LinkedIn Bot for: {target_query}")
        run = await client.actor(LINKEDIN_ACTOR_ID).call(run_input=run_input)
        
        normalized_jobs = []
        async for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            job_link = item.get("url") or item.get("link") or item.get("job_url") or item.get("jobUrl") or ""
            company = item.get("companyName") or item.get("company") or "Unknown Company"
            title = item.get("title") or item.get("positionName") or "Unknown Title"

            normalized_jobs.append({
                "company_name": company,
                "job_title": title,
                "job_details": {
                    "url": job_link,
                    "description_snippet": str(item.get("description", ""))[:500],
                    "source": "LinkedIn"
                }
            })
            
        print(f"✅ Successfully scraped {len(normalized_jobs)} LinkedIn jobs!")
        return normalized_jobs
    except Exception as e:
        print(f"🚨 LinkedIn scraper failed: {e}")
        return []


async def run_indeed_scraper(search_query: str, limit: int = 5) -> list[dict]:
    """
    Runs the Apify Indeed scraper Actor (valig/indeed-jobs-scraper).
    """
    client = ApifyClientAsync(settings.APIFY_TOKEN)
    
    # STRICT HYDERABAD TARGETING
    run_input = {
        "country": "in",                      # Changed from "us" to "in" (India)
        "title": search_query,
        "location": "Hyderabad, Telangana",   # Locked to Hyderabad
        "limit": limit,
        "datePosted": "14", 
    }
    
    try:
        print(f"\n🚀 Starting Indeed Bot for: {search_query} in Hyderabad")
        run = await client.actor(INDEED_ACTOR_ID).call(run_input=run_input)
        
        normalized_jobs = []
        async for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            job_link = item.get("url") or item.get("jobUrl") or ""
            company = item.get("companyName") or item.get("company") or "Unknown Company"
            title = item.get("title") or item.get("positionName") or item.get("jobTitle") or "Unknown Title"

            normalized_jobs.append({
                "company_name": company,
                "job_title": title,
                "job_details": {
                    "url": job_link,
                    "description_snippet": str(item.get("description", ""))[:500],
                    "source": "Indeed"
                }
            })
            
        print(f"✅ Successfully scraped {len(normalized_jobs)} Indeed jobs!")
        return normalized_jobs
    except Exception as e:
        print(f"🚨 Indeed scraper failed: {e}")
        return []