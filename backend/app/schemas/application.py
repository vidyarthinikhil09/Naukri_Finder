from pydantic import BaseModel
from enum import Enum
from typing import Optional, Dict, Any

class ApplicationStatus(str, Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    REPLIED = "REPLIED"
    FAILED = "FAILED"
    REJECTED = "REJECTED"

class ApplicationCreate(BaseModel):
    user_id: str
    company_name: str
    job_title: str
    job_details: Dict[str, Any]
    hr_contact: Optional[Dict[str, Any]] = None
    ai_draft: Optional[Dict[str, Any]] = None
    status: ApplicationStatus = ApplicationStatus.PENDING