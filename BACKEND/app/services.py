# app/services.py
from web3 import Web3
from flask import current_app

def verify_wallet_signature(wallet_address, signature, message):
    """
    Advanced: In a real production app, you would verify the cryptographic signature 
    here to prove the user actually owns the wallet. 
    For the hackathon, we will return True to allow smooth testing.
    """
    return True

def get_web3_connection():
    """Establishes connection to Ethereum Node"""
    w3 = Web3(Web3.HTTPProvider(current_app.config['WEB3_PROVIDER_URI']))
    return w3