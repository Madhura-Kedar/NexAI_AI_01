# NexAI - Hinglish AI Kirana Order Desk 🛒

An AI-powered voice & text order desk designed for Indian kirana (grocery) stores. It handles natural Hinglish (mixed Hindi + English) voice and text orders, matches items against store inventory with size awareness, asks clarification questions when needed, manages orders and bills in real-time, and generates delivery notes.

---

## 🌟 Key Features

- **Hinglish Natural Language Processing**: Understands spoken & typed Hinglish (e.g. *"2 kilo atta, ek amul butter aur aadha kilo chini de do"*).
- **Size & Stock Awareness**: Automatically detects size mismatches (e.g., asking for 1kg when only 5kg/10kg is in stock) and suggests available options.
- **Smart Clarification Flow**: When brand, size, or quantity is ambiguous, the bot asks concise Hinglish questions and resolves user replies dynamically.
- **Item & Order Cancellation**: Local keyword-driven cancellation (e.g. *"atta cancel karo"*, *"order cancel"*), saving API quota.
- **Off-Topic Redirection**: Filters unrelated text (e.g., chit-chat, weather, random text) with polite Hinglish prompts asking for the grocery order.
- **Live Bill & Delivery Notes**: Calculates subtotals, item counts, grand totals, and generates delivery notes for delivery executives.
- **Modern Responsive UI**: Dark-themed, interactive dashboard with chat history, live bill preview, and visual order status.

---

## 🛠 Tech Stack

- **Backend**: Python, Flask, Flask-CORS, SQLite, Google Gemini (`gemini-flash-lite-latest`), RapidFuzz
- **Frontend**: React, Vite, Axios / Fetch API, Vanilla CSS

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and add your Gemini API key:
# GEMINI_API_KEY="your_api_key_here"

# Seed the product catalog database
python seed.py

# Start the Flask backend (runs on port 5000)
python app.py
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server (runs on port 5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📁 Project Structure

```
├── backend/
│   ├── app.py              # Flask server and API routes
│   ├── parser.py           # Gemini NLP order parser, cancel & off-topic detection
│   ├── matcher.py          # Fuzzy matching & inventory validation logic
│   ├── billing.py          # Bill calculation & pricing
│   ├── db.py               # SQLite schema & DB helper
│   ├── seed.py             # Product catalog seed data (38+ items)
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/     # ChatBox, BillCard, OrderPanel
│   │   ├── app.jsx         # Main React app state & layout
│   │   └── index.css       # Styling & animations
│   ├── package.json
│   └── vite.config.js
└── README.md
```
