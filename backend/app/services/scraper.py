import urllib.parse
from app.core.config import settings
from apify_client import ApifyClientAsync

ACTOR_ID = "hKByXkMQaC5Qt9UMN"

async def run_apify_scraper(search_query: str, limit: int = 10) -> list[dict]:
    """
    Runs the Apify job scraper Actor using the official Python SDK.
    """
    # 1. Convert plain text to URL
    encoded_query = urllib.parse.quote(search_query)
    linkedin_url = f"https://www.linkedin.com/jobs/search/?keywords={encoded_query}"
    
    # 2. Initialize the official Apify Client
    client = ApifyClientAsync(settings.APIFY_TOKEN)
    
    # Exact payload from the Apify documentation
    run_input = {
        "urls": [linkedin_url],
        "scrapeCompany": True,
        "count": limit,
        "splitByLocation": False,
    }
    
    try:
        print(f"\n🚀 Starting Apify Bot for: {search_query}")
        print("⏳ Waiting for the bot to finish scraping LinkedIn (this might take a minute or two)...")
        
        # 3. Call the actor (This automatically polls Apify until the job is done)
        run = await client.actor(ACTOR_ID).call(run_input=run_input)
        
        # 4. Fetch the results from the dataset
        normalized_jobs = []
        async for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            normalized_jobs.append({
                "company_name": item.get("companyName", "Unknown Company"),
                "job_title": item.get("title", "Unknown Title"),
                "job_details": {
                    "url": item.get("url", ""),
                    "description_snippet": item.get("description", "")[:500] if item.get("description") else ""
                }
            })
            
        print(f"✅ Successfully scraped {len(normalized_jobs)} jobs!")
        return normalized_jobs
        
    except Exception as e:
        print(f"🚨 Apify scraper failed: {e}")
        return []