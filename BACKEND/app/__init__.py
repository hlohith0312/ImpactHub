import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING, DESCENDING
from config import Config

# Global db reference accessible from routes
mongo_client = None
db = None

def create_app():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    frontend_dir = os.path.join(project_root, 'FRONTEND')

    app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
    app.config.from_object(Config)

    # Connect to MongoDB Atlas
    global mongo_client, db
    mongo_client = MongoClient(Config.MONGO_URI)
    db = mongo_client[Config.DB_NAME]
    app.db = db

    # Create indexes for performance
    try:
        db.users.create_index('username', unique=True)
        db.problems.create_index([('created_at', DESCENDING)])
        db.submissions.create_index([('problem_id', ASCENDING), ('student_id', ASCENDING)])
        db.messages.create_index([('problem_id', ASCENDING), ('timestamp', ASCENDING)])
    except Exception as e:
        print(f"[Index] {e}")

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    from .routes import api
    app.register_blueprint(api, url_prefix='/api')

    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')

    print("[ImpactHub] Connected to MongoDB Atlas - OK")
    return app