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
        You are an elite Software Engineer and founder. Your task is to write a highly personalized, professional cold email directly to the hiring manager or HR contact.

        Job Details:
        {json.dumps(job_details, indent=2)}

        HR Contact Info:
        {json.dumps(hr_contact, indent=2)}

        My Background / Resume:
        {resume_text}

        Guidelines to follow strictly:
        1. Write in the FIRST PERSON ("I", "my"). You are ME.
        2. State exactly who I am and my purpose early in the email.
        3. Personalize the message. Reference their company by name and tie my specific engineering projects directly to their needs.
        4. Start with a small request. Do not aggressively demand a job upfront. Instead, ask for a brief chat, inquire about the team, or ask a thoughtful question about their technical stack.
        5. Sign off the email using my name from the resume text. Do not use placeholders.
        6. Output ONLY a valid JSON object with exactly two keys: "subject" (string) and "body" (string). Do not include markdown formatting or code blocks.
        """

        # REMOVED the generation_config parameter that was causing the crash
        response = await model.generate_content_async(prompt)
        
        # Clean the response text in case Gemini adds markdown code blocks
        raw_text = response.text.strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text.replace("```json", "", 1)
        if raw_text.startswith("```"):
            raw_text = raw_text.replace("```", "", 1)
        if raw_text.endswith("```"):
            raw_text = raw_text[:raw_text.rfind("```")]
            
        return json.loads(raw_text.strip())
        
    except Exception as e:
        logger.error(f"Error generating email draft: {e}")
        return {"subject": "Error generating subject", "body": "Error generating body."}