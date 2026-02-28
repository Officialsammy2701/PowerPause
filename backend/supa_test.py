import os
from supabase import create_client, Client


SUPABASE_URL = "https://ofzygojmznscbhybinqx.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9menlnb2ptem5zY2JoeWJpbnF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMjc5NTAsImV4cCI6MjA4NDgwMzk1MH0.7tqQWFPD6MOWEqPHd4mkks39HpwmUCjsggBJfAHFtC0"

url: str = SUPABASE_URL# os.environ.get("SUPABASE_URL")
key: str = SUPABASE_ANON_KEY# os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

response = (
    supabase.table("energy_data")
    .select("*")
    .execute()
)

print(response)