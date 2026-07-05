"""
ImpactHub Blockchain Module
Handles all interactions with the ImpactForge smart contract on Sepolia testnet.
Uses the platform wallet as a relayer — users don't need MetaMask.
"""

import os, json, hashlib, threading
from pathlib import Path
from datetime import datetime

# ── Try to import web3 ──────────────────────────────────────────────────────
try:
    from web3 import Web3
    from web3.middleware import ExtraDataToPOAMiddleware
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False

# ── Config ──────────────────────────────────────────────────────────────────
BLOCKCHAIN_DIR   = Path(__file__).parent.parent.parent / "BLOCKCHAIN"
DEPLOYMENT_FILE  = BLOCKCHAIN_DIR / "deployment.json"
ALCHEMY_URL      = "https://eth-sepolia.g.alchemy.com/v2/QPQi_xtg9toJrKLD2V00p"
PRIVATE_KEY      = "c9ef827c361fa3496ed09f8a75337ed2bf06418364f5dfb6f387d67a7e6d95e0"
ETHERSCAN_BASE   = "https://sepolia.etherscan.io"

_w3       = None
_contract = None
_account  = None
_lock     = threading.Lock()


def _init():
    """Lazy-initialise Web3 + contract."""
    global _w3, _contract, _account

    if not WEB3_AVAILABLE:
        return False
    if not DEPLOYMENT_FILE.exists():
        return False

    try:
        with open(DEPLOYMENT_FILE) as f:
            dep = json.load(f)

        w3 = Web3(Web3.HTTPProvider(ALCHEMY_URL))
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

        if not w3.is_connected():
            print("[Blockchain] Could not connect to Alchemy")
            return False

        account  = w3.eth.account.from_key(PRIVATE_KEY)
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(dep["address"]),
            abi=dep["abi"]
        )

        _w3       = w3
        _contract = contract
        _account  = account
        print(f"[Blockchain] Connected — contract {dep['address']}")
        return True
    except Exception as e:
        print(f"[Blockchain] Init error: {e}")
        return False


def _ready():
    """Returns True if blockchain module is ready."""
    global _w3, _contract, _account
    if _w3 and _contract and _account:
        return True
    return _init()


def _send_tx(fn):
    """Build, sign, and send a transaction. Returns tx_hash string or None."""
    if not _ready():
        return None
    try:
        nonce    = _w3.eth.get_transaction_count(_account.address)
        gas_est  = fn.estimate_gas({'from': _account.address})
        tx       = fn.build_transaction({
            'from':     _account.address,
            'nonce':    nonce,
            'gas':      int(gas_est * 1.2),
            'gasPrice': _w3.eth.gas_price,
        })
        signed   = _w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        tx_hash  = _w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt  = _w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        return {
            'tx_hash':    tx_hash.hex(),
            'block':      receipt.blockNumber,
            'etherscan':  f"{ETHERSCAN_BASE}/tx/{tx_hash.hex()}"
        }
    except Exception as e:
        print(f"[Blockchain] TX error: {e}")
        return None


# ── Public API ───────────────────────────────────────────────────────────────

def content_hash(title: str, description: str) -> str:
    """Generate SHA-256 hash of challenge content."""
    raw = f"{title}::{description}".encode()
    return hashlib.sha256(raw).hexdigest()


def solution_hash(student_name: str, solution_link: str, problem_id: str) -> str:
    """Generate SHA-256 hash of solution details."""
    raw = f"{student_name}::{solution_link}::{problem_id}".encode()
    return hashlib.sha256(raw).hexdigest()


def post_problem_async(platform_id: str, ngo_id: str, title: str, description: str, callback=None):
    """
    Post a challenge to the blockchain in a background thread.
    callback(result) is called when done (result may be None on failure).
    """
    def _run():
        result = post_problem(platform_id, ngo_id, title, description)
        if callback:
            callback(result)
    threading.Thread(target=_run, daemon=True).start()


def post_problem(platform_id: str, ngo_id: str, title: str, description: str):
    """Call ImpactForge.postProblem() on Sepolia. Returns tx info dict or None."""
    if not _ready():
        return None
    ch = content_hash(title, description)
    fn = _contract.functions.postProblem(str(platform_id), str(ngo_id), ch)
    result = _send_tx(fn)
    if result:
        # Read chain problem ID from event log
        try:
            receipt = _w3.eth.get_transaction_receipt(result['tx_hash'])
            logs    = _contract.events.ProblemPosted().process_receipt(receipt)
            if logs:
                result['chain_problem_id'] = logs[0]['args']['chainId']
        except Exception:
            pass
    return result


def accept_solution(chain_problem_id: int, student_id: str,
                    student_name: str, solution_link: str, platform_id: str):
    """Call ImpactForge.acceptSolution() on Sepolia. Returns tx info dict or None."""
    if not _ready():
        return None
    sol_hash = solution_hash(student_name, solution_link, platform_id)
    fn       = _contract.functions.acceptSolution(int(chain_problem_id), str(student_id), sol_hash)
    result   = _send_tx(fn)
    if result:
        try:
            receipt  = _w3.eth.get_transaction_receipt(result['tx_hash'])
            logs     = _contract.events.CertificateIssued().process_receipt(receipt)
            if logs:
                result['cert_id']       = logs[0]['args']['certId']
                result['solution_hash'] = sol_hash
        except Exception:
            pass
    return result


def is_connected() -> bool:
    return _ready()


def contract_address() -> str:
    if not DEPLOYMENT_FILE.exists():
        return ""
    with open(DEPLOYMENT_FILE) as f:
        dep = json.load(f)
    return dep.get("address", "")


def etherscan_address_url() -> str:
    addr = contract_address()
    return f"{ETHERSCAN_BASE}/address/{addr}" if addr else ""
