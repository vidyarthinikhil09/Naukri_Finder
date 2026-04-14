import os
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

async def fetch_from_apollo(domain: str) -> str | None:
    """
    Fetches an HR/Recruiter email from Apollo.io for a given domain.
    """
    api_key = os.getenv("APOLLO_API_KEY", settings.APOLLO_API_KEY)
    if not api_key:
        logger.warning("Apollo API key not set.")
        return None
        
    url = "https://api.apollo.io/api/v1/mixed_people/search"
    payload = {
        "api_key": api_key,
        "q_organization_domains": domain,
        "person_titles": ["HR", "Recruiter", "Talent Acquisition"]
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            people = data.get("people", [])
            for person in people:
                if person.get("email"):
                    return person["email"]
    except httpx.HTTPError as e:
        logger.error(f"Apollo HTTP error for {domain}: {e}")
    except Exception as e:
        logger.error(f"Unexpected Apollo error for {domain}: {e}")
        
    return None

async def fetch_from_hunter(domain: str) -> str | None:
    """
    Fetches a generic email from Hunter.io for a given domain as a fallback.
    """
    api_key = os.getenv("HUNTER_API_KEY", settings.HUNTER_API_KEY)
    if not api_key:
        logger.warning("Hunter API key not set.")
        return None
        
    url = f"https://api.hunter.io/v2/domain-search?domain={domain}&api_key={api_key}"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            emails = data.get("data", {}).get("emails", [])
            if emails and len(emails) > 0 and emails[0].get("value"):
                return emails[0]["value"]
    except httpx.HTTPError as e:
        logger.error(f"Hunter HTTP error for {domain}: {e}")
    except Exception as e:
        logger.error(f"Unexpected Hunter error for {domain}: {e}")
        
    return None

async def resolve_contact_waterfall(domain: str) -> dict:
    """
    Orchestrates the contact resolution waterfall: Apollo -> Hunter.
    """
    # 1. Try Apollo
    email = await fetch_from_apollo(domain)
    if email:
        return {"email": email, "source": "Apollo", "status": "FOUND"}
        
    # 2. Try Hunter
    email = await fetch_from_hunter(domain)
    if email:
        return {"email": email, "source": "Hunter", "status": "FOUND"}
        
    # 3. Failed
    return {"email": None, "source": None, "status": "FAILED"}
