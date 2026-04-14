import os
import json
import logging
import google.generativeai as genai

logger = logging.getLogger(__name__)

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

async def generate_email_draft(job_details: dict, resume_text: str, hr_contact: dict) -> dict:
    """
    Generates a personalized cold email draft using Gemini 2.5 Flash.
    """
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set. Returning empty draft.")
        return {"subject": "", "body": ""}

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""
        You are an expert career coach and executive recruiter. Your task is to write a highly personalized, 
        professional cold email to a hiring manager or HR contact.

        Job Details:
        {json.dumps(job_details, indent=2)}

        HR Contact Info:
        {json.dumps(hr_contact, indent=2)}

        Candidate Resume:
        {resume_text}

        Instructions:
        1. Map the candidate's resume experience to the core requirements in the job description snippet.
        2. Keep the email concise, engaging, and professional.
        3. Do not use placeholders like [Your Name] if the information is available in the resume.
        4. Output ONLY a valid JSON object with exactly two keys: "subject" (string) and "body" (string).
        """

        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Error generating email draft: {e}")
        return {"subject": "Error generating subject", "body": "Error generating body."}
