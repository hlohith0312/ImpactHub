import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-prod'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'impactforge.sqlite')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Blockchain Config (Placeholders for your smart contract)
    WEB3_PROVIDER_URI = "http://127.0.0.1:8545" 
    CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"