# app/services.py
# BUG FIX: Wrapped web3 import in try/except so the app doesn't crash
# if the web3 package is not installed or the node is unreachable.

try:
    from web3 import Web3
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False

from flask import current_app

def verify_wallet_signature(wallet_address, signature, message):
    """
    Advanced: In a real production app, you would verify the cryptographic signature
    here to prove the user actually owns the wallet.
    For the hackathon, we will return True to allow smooth testing.
    """
    return True

def get_web3_connection():
    """Establishes connection to Ethereum Node. Returns None if web3 is unavailable."""
    if not WEB3_AVAILABLE:
        current_app.logger.warning("web3 package not installed. Blockchain features disabled.")
        return None
    try:
        w3 = Web3(Web3.HTTPProvider(current_app.config['WEB3_PROVIDER_URI']))
        return w3
    except Exception as e:
        current_app.logger.warning(f"Could not connect to Web3 provider: {e}")
        return None