import base64
import os
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.db.supabase import supabase

logger = logging.getLogger(__name__)

async def dispatch_application_email(
    application_id: str,
    google_access_token: str,
    google_refresh_token: str,
    client_id: str,
    client_secret: str
):
    """
    Packages the AI draft, downloads the resume, and sends the email via Gmail API.
    """
    # Step 1: Fetch Data
    response = supabase.table("applications").select("*").eq("id", application_id).single().execute()
    application = response.data
    if not application:
        raise ValueError(f"Application {application_id} not found")

    user_id = application.get("user_id")
    ai_draft = application.get("ai_draft", {})
    hr_contact = application.get("hr_contact", {})
    
    to_email = hr_contact.get("email")
    if not to_email:
        raise ValueError("No HR contact email found for this application")

    subject = ai_draft.get("subject", "Job Application")
    body = ai_draft.get("body", "")

    # Step 2: Download Resume
    resume_path = f"{user_id}/base_resume.pdf"
    try:
        resume_bytes = supabase.storage.from_("resumes").download(resume_path)
    except Exception as e:
        logger.error(f"Failed to download resume for user {user_id}: {e}")
        raise ValueError("Could not download base resume from storage")

    # Step 3: Build MIME Message
    message = MIMEMultipart()
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    attachment = MIMEApplication(resume_bytes, _subtype="pdf")
    attachment.add_header("Content-Disposition", "attachment", filename="Resume.pdf")
    message.attach(attachment)

    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    # Step 4: Gmail API Authentication
    creds = Credentials(
        token=google_access_token,
        refresh_token=google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret
    )
    
    try:
        service = build("gmail", "v1", credentials=creds)
    except Exception as e:
        logger.error(f"Failed to build Gmail service: {e}")
        raise ValueError("Could not authenticate with Gmail API")

    # Step 5: Send & Track
    try:
        send_message = service.users().messages().send(
            userId="me",
            body={"raw": raw_message}
        ).execute()
        thread_id = send_message.get("threadId")
    except Exception as e:
        logger.error(f"Failed to send email via Gmail API: {e}")
        raise ValueError(f"Failed to send email: {str(e)}")

    # Step 6: Update DB
    update_response = supabase.table("applications").update({
        "status": "SENT",
        "gmail_thread_id": thread_id
    }).eq("id", application_id).execute()

    return update_response.data[0] if update_response.data else None
