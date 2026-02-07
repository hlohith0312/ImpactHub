import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

db = SQLAlchemy()

def create_app():
    # ---------------------------------------------------------
    # 1. ROBUST PATH CALCULATION
    # ---------------------------------------------------------
    # Get the directory where THIS file (app/__init__.py) is located
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Go up two levels: app/ -> BACKEND/ -> HACKATHON/ (Root)
    # Then go into FRONTEND/
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(current_dir)), 'FRONTEND')

    # ---------------------------------------------------------
    # 2. INITIALIZE FLASK
    # ---------------------------------------------------------
    # explicitly tell Flask where the static folder is
    app = Flask(__name__, static_folder=frontend_dir, static_url_path='')

    app.config.from_object(Config)

    # Initialize Plugins
    db.init_app(app)
    CORS(app)

    # Register API Routes
    from .routes import api
    app.register_blueprint(api, url_prefix='/api')

    # ---------------------------------------------------------
    # 3. SERVE FRONTEND (Root URL Fix)
    # ---------------------------------------------------------
    @app.route('/')
    def serve_index():
        return send_from_directory(app.static_folder, 'index.html')

    # Create Database Tables
    with app.app_context():
        db.create_all()

    return app