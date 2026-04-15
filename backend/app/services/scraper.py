import urllib.parse
from apify_client import ApifyClientAsync
from app.core.config import settings
import asyncio

LINKEDIN_ACTOR_ID = "hKByXkMQaC5Qt9UMN"
INDEED_ACTOR_ID = "your-indeed-actor-id" # (If you have added it)

async def run_linkedin_scraper(search_query: str, limit: int = 10) -> list[dict]:
    # 1. HARDCODE HYDERABAD INTO THE LINKEDIN URL
    encoded_query = urllib.parse.quote(search_query)
    encoded_location = urllib.parse.quote("Hyderabad, Telangana, India")
    linkedin_url = f"https://www.linkedin.com/jobs/search/?keywords={encoded_query}&location={encoded_location}"
    
    client = ApifyClientAsync(settings.APIFY_TOKEN)
    
    run_input = {
        "urls": [linkedin_url],
        "scrapeCompany": True,
        "count": limit,
        "splitByLocation": False
    }
    
    try:
        print(f"\n🚀 Starting LinkedIn Bot for: {search_query} in Hyderabad")
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
            
        print(f"✅ Successfully scraped {len(normalized_jobs)} LinkedIn jobs in Hyderabad!")
        return normalized_jobs
        
    except Exception as e:
        print(f"🚨 LinkedIn scraper failed: {e}")
        return []


async def run_indeed_scraper(search_query: str, limit: int = 10) -> list[dict]:
    """
    Runs the Apify Indeed scraper Actor locked to Hyderabad.
    """
    client = ApifyClientAsync(settings.APIFY_TOKEN)
    
    # 2. HARDCODE HYDERABAD INTO THE INDEED PAYLOAD
    run_input = {
        "position": search_query,
        "country": "IN",              # Force India
        "location": "Hyderabad",      # Force Hyderabad
        "maxItems": limit,
    }
    
    try:
        print(f"\n🚀 Starting Indeed Bot for: {search_query} in Hyderabad")
        run = await client.actor(INDEED_ACTOR_ID).call(run_input=run_input)
        
        normalized_jobs = []
        async for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            job_link = item.get("url") or item.get("jobUrl") or ""
            normalized_jobs.append({
                "company_name": item.get("company", "Unknown Company"),
                "job_title": item.get("positionName", "Unknown Title"),
                "job_details": {
                    "url": job_link,
                    "source": "Indeed"
                }
            })
            
        print(f"✅ Successfully scraped {len(normalized_jobs)} Indeed jobs in Hyderabad!")
        return normalized_jobs
        
    except Exception as e:
        print(f"🚨 Indeed scraper failed: {e}")
        return []