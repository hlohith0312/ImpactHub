# ImpactHub

**ImpactHub** is an open-source web platform that connects **NGOs** with **student developers**. NGOs post real-world challenges; students apply with solutions. Winners earn a verified digital certificate.

---

## Features

### For Students
- Browse and filter challenges by category and status
- Submit solution links with a cover note
- Track application status in real time
- Chat directly with the NGO
- Earn downloadable certificates for winning
- Climb the leaderboard with an impact score

### For NGOs
- Post challenges with categories
- Review all applicants in one place — see solution links and cover notes
- Chat with any applicant before deciding
- Accept the winning solution (auto-issues certificate)
- Close / archive a challenge at any time
- View analytics: solve rate, applicant funnel, top challenges

### Platform-wide
- Live activity feed on the dashboard
- Leaderboard with rank badges (gold / silver / bronze)
- Notifications for unread messages
- Public solution visibility — anyone can see the winning submission once a challenge is solved
- Fully cloud-hosted database (MongoDB Atlas)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML · Vanilla CSS · Vanilla JavaScript |
| Backend | Python · Flask |
| Database | MongoDB Atlas (PyMongo) |
| Blockchain | Solidity · Ethereum Sepolia · Hardhat · Web3.py |
| Auth | Session-based (username + password) |
| Fonts | Google Fonts — Inter, Space Grotesk |
| Icons | Font Awesome 6 |

---

## Project Structure

```
Impact Hub/
├── BACKEND/
│   ├── app/
│   │   ├── __init__.py       # Flask app factory + MongoDB connection
│   │   ├── blockchain.py     # Web3.py module — talks to ImpactForge contract
│   │   └── routes.py         # All API endpoints
│   ├── config.py             # Reads credentials from .env
│   ├── .env.github           # Credential template — copy to .env and fill in values
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Entry point
├── BLOCKCHAIN/
│   ├── contracts/
│   │   └── ImpactForge.sol   # Solidity smart contract (milestone tracking + certificates)
│   ├── scripts/
│   │   └── deploy.js         # Hardhat deploy script for Sepolia
│   ├── deployment.json       # Deployed contract address + ABI
│   └── hardhat.config.js     # Hardhat network config
├── FRONTEND/
│   ├── index.html            # Single-page app shell
│   ├── style.css             # Full design system
│   └── app.js                # All frontend logic
├── .gitignore
├── LICENSE
└── README.md
```

---

## Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/YOUR-USERNAME/impacthub.git
cd impacthub
```

### 2. Set up the backend
```bash
cd BACKEND
python -m venv venv

# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Set up your credentials
Copy the template and fill in your own values:

```bash
copy BACKEND\.env.github BACKEND\.env
```

Open `BACKEND/.env` and replace the placeholders:
```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=ImpactHub
ALCHEMY_URL=https://eth-sepolia.g.alchemy.com/v2/<your-alchemy-key>
DEPLOYER_PRIVATE_KEY=<your-wallet-private-key>
```

> ⚠️ **Never commit `.env`** — it is blocked by `.gitignore`

### 4. Run the backend
```bash
python run.py
```
The API will be available at `http://127.0.0.1:5000`

### 5. Run the frontend
Open a new terminal:
```bash
cd FRONTEND
python -m http.server 3000
```
Then open **`http://localhost:3000`** in your browser.

### 6. (Optional) Deploy the smart contract
```bash
cd BLOCKCHAIN
npm install
npx hardhat run scripts/deploy.js --network sepolia
```
> Requires Sepolia test ETH — get free test ETH at [faucet.google.com/web3/faucet/ethereum/sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | Create a new account |
| POST | `/api/login` | Sign in |
| GET | `/api/problems` | List all challenges |
| POST | `/api/problems` | Post a new challenge (NGO) |
| POST | `/api/problems/<id>/close` | Archive a challenge (NGO) |
| POST | `/api/submit_solution` | Apply to a challenge (Student) |
| GET | `/api/get_submissions/<id>` | Get applicants for a challenge |
| POST | `/api/accept_solution` | Accept a winning solution (NGO) |
| GET | `/api/my_applications` | Get student's own applications |
| GET | `/api/leaderboard` | Top students by solved count |
| GET | `/api/analytics` | Role-specific analytics data |
| GET | `/api/activity` | Recent platform activity |
| GET/POST | `/api/messages` | Chat messages |
| GET | `/api/notifications` | Unread message count |
| GET | `/api/stats` | Platform-wide statistics |

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

---

*Built with purpose — connecting impact-driven organizations with student talent.*
