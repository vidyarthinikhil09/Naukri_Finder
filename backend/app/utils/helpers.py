import re
from urllib.parse import urlparse

def extract_domain(company_name: str, job_url: str) -> str:
    """
    Extracts or guesses a domain name from a company name or job URL.
    """
    # 1. Try to clean the company name into a domain
    if company_name and company_name.strip() and company_name != "Unknown Company":
        # Remove non-alphanumeric characters and convert to lowercase
        clean_name = re.sub(r'[^a-zA-Z0-9]', '', company_name).lower()
        if clean_name:
            return f"{clean_name}.com"
    
    # 2. Fallback to parsing the job URL
    if job_url:
        try:
            parsed_uri = urlparse(job_url)
            domain = parsed_uri.netloc
            # Remove 'www.' if present
            if domain.startswith('www.'):
                domain = domain[4:]
            if domain:
                return domain
        except Exception:
            pass
            
    # 3. Default fallback
    return "unknown.com"
