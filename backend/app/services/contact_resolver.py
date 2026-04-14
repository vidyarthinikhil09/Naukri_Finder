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

async def fetch_from_skrapp(domain: str) -> str | None:
    """
    Fetches a generic email from Skrapp.io for a given domain.
    """
    api_key = os.getenv("SKRAPP_API_KEY", settings.SKRAPP_API_KEY)
    if not api_key:
        logger.warning("Skrapp API key not set.")
        return None
        
    url = f"https://api.skrapp.io/api/v2/domain/{domain}"
    headers = {
        "X-Access-Key": api_key
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            emails = data.get("emails", [])
            if emails and isinstance(emails, list) and emails[0].get("email"):
                return emails[0]["email"]
    except httpx.HTTPError as e:
        logger.error(f"Skrapp HTTP error for {domain}: {e}")
    except Exception as e:
        logger.error(f"Unexpected Skrapp error for {domain}: {e}")
        
    return None

async def resolve_contact_waterfall(domain: str) -> dict:
    """
    Orchestrates the contact resolution waterfall: Apollo -> Skrapp.
    Returns a dictionary matching the Pydantic schema.
    """
    # 1. Try Apollo
    email = await fetch_from_apollo(domain)
    if email:
        return {"email": email, "source": "Apollo", "status": "FOUND"}
        
    # 2. Try Skrapp
    email = await fetch_from_skrapp(domain)
    if email:
        return {"email": email, "source": "Skrapp", "status": "FOUND"}
        
    # 3. Failed
    return {"email": None, "source": None, "status": "FAILED"}
