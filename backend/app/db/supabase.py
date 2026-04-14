from supabase import create_client, Client
from app.core.config import settings

# Initialize the Supabase client using the URL and Service Role Key
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY
)