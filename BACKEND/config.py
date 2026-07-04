import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'impactforge-secret-2026'
    MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb+srv://hlohith321_db_user:J6MlJLli8scrrLOx@impacthub.vgz730u.mongodb.net/?appName=ImpactHub'
    DB_NAME = 'impacthub'