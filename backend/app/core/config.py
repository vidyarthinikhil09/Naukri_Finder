from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    GEMINI_API_KEY: str  # Added this line to recognize your AI key
    FRONTEND_URL: str = "http://localhost:3000"
    APIFY_TOKEN: str = "placeholder_token"
    APOLLO_API_KEY: str = ""
    HUNTER_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"  # Added this line so extra variables don't crash the server

settings = Settings()