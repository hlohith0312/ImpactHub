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
│   │   └── routes.py         # All API endpoints
│   ├── config.py             # Reads credentials from .env
│   ├── .env.example          # Template — copy this to .env and fill in your values
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Entry point
├── BLOCKCHAIN/
│   └── ImpactForge.sol       # Solidity smart contract (certificate verification architecture)
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

### 3. Set up your MongoDB credentials
Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas), then:

```bash
# Inside the BACKEND folder, copy the example file
copy .env.example .env
```

Open `BACKEND/.env` and paste your own MongoDB connection string:
```
MONGO_URI=mongodb+srv://<your-username>:<your-password>@<your-cluster>.mongodb.net/?appName=ImpactHub
```

> ⚠️ **Never share or commit your `.env` file.** It is already blocked by `.gitignore`.

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
