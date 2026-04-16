import urllib.parse
from apify_client import ApifyClientAsync
from app.core.config import settings

LINKEDIN_ACTOR_ID = "hKByXkMQaC5Qt9UMN"
INDEED_ACTOR_ID = "TrtlecxAsNRbKl1na"

async def run_linkedin_scraper(search_query: str, limit: int = 10) -> list[dict]:
    """
    Runs the Apify LinkedIn scraper Actor using constructed URLs.
    """
    client = ApifyClientAsync(settings.APIFY_TOKEN)
    
    # 1. FIX: Construct a valid LinkedIn Search URL
    encoded_query = urllib.parse.quote(search_query)
    encoded_location = urllib.parse.quote("Hyderabad, Telangana")
    search_url = f"https://www.linkedin.com/jobs/search/?keywords={encoded_query}&location={encoded_location}"
    
    # The Actor strictly requires 'urls' as the input field
    run_input = {
        "urls": [search_url],
        "limit": limit,
    }
    
    try:
        print(f"\n🚀 Starting LinkedIn Bot for URL: {search_url}")
        run = await client.actor(LINKEDIN_ACTOR_ID).call(run_input=run_input)
        
        normalized_jobs = []
        async for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            job_link = item.get("url") or item.get("link") or item.get("job_url") or item.get("jobUrl") or ""
            
            # Safe extraction for company name
            raw_company = item.get("companyName") or item.get("company")
            company = "Unknown Company"
            if isinstance(raw_company, dict):
                company = raw_company.get("name", "Unknown Company")
            elif isinstance(raw_company, str):
                company = raw_company

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
    
    run_input = {
        "country": "in",                      
        "title": search_query,
        "location": "Hyderabad, Telangana",   
        "limit": limit,
        "datePosted": "14", 
    }
    
    try:
        print(f"\n🚀 Starting Indeed Bot for: {search_query} in Hyderabad")
        run = await client.actor(INDEED_ACTOR_ID).call(run_input=run_input)
        
        normalized_jobs = []
        async for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            job_link = item.get("url") or item.get("jobUrl") or ""
            
            # 2. FIX: Handle deeply nested company objects from Indeed
            raw_company = item.get("companyName") or item.get("company")
            company = "Unknown Company"
            
            if isinstance(raw_company, dict):
                # If Indeed returns {"name": "Google", "url": "..."}
                company = raw_company.get("name", "Unknown Company")
            elif isinstance(raw_company, str):
                # If Indeed returns a simple string
                company = raw_company

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
