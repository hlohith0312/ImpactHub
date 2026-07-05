import os
from dotenv import load_dotenv

# Load from .env file (never committed to git)
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'impactforge-secret-2026'
    MONGO_URI  = os.environ.get('MONGO_URI')   # Must be set in .env
    DB_NAME    = 'impacthub'

    if not MONGO_URI:
        raise ValueError("MONGO_URI is not set. Create a BACKEND/.env file with your MongoDB connection string.")