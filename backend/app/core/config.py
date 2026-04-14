from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    FRONTEND_URL: str = "http://localhost:3000"
    APIFY_TOKEN: str = "placeholder_token"
    APOLLO_API_KEY: str = ""
    HUNTER_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
