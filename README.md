# 💳 Digital Debt Tracker (SubTrackr)

**Stop losing money to forgotten subscriptions.**

A beautiful, production-ready full-stack web app that helps you discover, track, and manage all your recurring charges. Find out exactly how much you're spending and identify subscriptions you no longer use.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-blue)
![React](https://img.shields.io/badge/react-18.2-61dafb)

---

## ✨ Features

- 📱 **Beautiful Dashboard** — See all subscriptions at a glance with rich cards
- 📊 **Advanced Analytics** — Monthly/yearly totals, category breakdown (pie chart), and monthly spending trend (line chart)
- 🔍 **Search, Filter & Sort** — Debounced search (300 ms), filter by category/status, sort by cost/name/date
- 🌙 **Dark Mode** — Persisted in `localStorage`
- 🔔 **Smart Alerts** — Upcoming billing alerts banner and trial-expiration warnings
- 🧙 **Onboarding Wizard** — Guided first-run experience with demo data seeding
- 🔐 **Secure Auth** — JWT access tokens (15 min) + refresh-token rotation (30 days), password hashing with bcrypt
- 🛡️ **Rate Limiting** — Auth endpoints: 10 requests/15 min; API endpoints: 100 requests/min
- ✅ **Input Validation** — Zod schemas on every route
- 💾 **Persistent Storage** — SQLite with DB indexes for performance
- 🔄 **Optimistic Updates** — TanStack Query (React Query v5) with background refetch and transparent 401 retry
- 🎨 **Mobile-First Responsive Design** — Skeleton loaders, confirmation modals, and toast notifications
- ⚡ **Billing Cycles** — Track monthly, yearly, or weekly subscriptions with normalised monthly cost

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/GGWarrior001/Digital-Debt-Tracker.git
cd Digital-Debt-Tracker
```

2. **Setup Backend**
```bash
cd subtrackr/backend
npm install
```

3. **Setup Frontend**
```bash
cd ../frontend
npm install
```

4. **Configure environment variables**
```bash
# In subtrackr/backend, copy the example and fill in your values
cp ../../.env.example .env
```

---

## 🏃 Running Locally

### Start Backend (Terminal 1)
```bash
cd subtrackr/backend
npm start
```
Backend runs on `http://localhost:5000`

### Start Frontend (Terminal 2)
```bash
cd subtrackr/frontend
npm start
```
Frontend opens at `http://localhost:3000`

---

## 📁 Project Structure

```
Digital-Debt-Tracker/
├── subtrackr/
│   ├── backend/
│   │   ├── server.js           # Express server, routes & DB setup
│   │   └── package.json        # Backend dependencies
│   └── frontend/
│       ├── public/
│       │   └── index.html      # HTML entry point
│       ├── src/
│       │   ├── App.jsx         # Main React component
│       │   └── App.css         # Styles
│       └── package.json        # Frontend dependencies
├── server-v2.js                # Standalone production backend (v2)
├── App-v2.jsx                  # Standalone production frontend (v2)
├── App-v2.css                  # Standalone production styles (v2)
├── package-both.json           # Combined package.json reference
├── .env.example                # Environment variable template
├── API.md                      # Full API documentation
├── README.md                   # This file
└── .gitignore                  # Git ignore rules
```

---

## 🎯 Features Included

- ✅ User signup/login with secure password requirements (min 8 chars, uppercase, number)
- ✅ Refresh-token rotation (15-min access / 30-day refresh)
- ✅ Add/edit/delete subscriptions with confirmation modals
- ✅ Billing cycles: monthly, yearly, weekly (normalised monthly cost)
- ✅ Track by category (Entertainment, Software, Fitness, News, Productivity, Education, Finance, Other)
- ✅ Monthly/yearly spending calculations
- ✅ Analytics dashboard with pie chart (category) and line chart (monthly trend)
- ✅ Smart Insights panel from analytics API
- ✅ Billing date tracking and upcoming billing alerts banner
- ✅ Trial expiration dates
- ✅ Notes and website links
- ✅ Dark mode (persisted)
- ✅ Onboarding wizard with demo data seeding
- ✅ Toast notification system
- ✅ Skeleton loaders
- ✅ Rate limiting on auth and API endpoints
- ✅ Zod input validation on every route
- ✅ Pagination, filtering, and sorting on subscription list

---

## 🛣️ Roadmap (Future Features)

- [ ] Email alerts for upcoming billing
- [ ] CSV import/export
- [ ] Browser extension for auto-detection
- [ ] Bank/credit card API integration (Plaid)
- [ ] Family sharing
- [ ] AI-powered unused subscription detection
- [ ] Negotiation helpers (get better prices)
- [ ] Calendar view of billing dates
- [ ] Mobile app (React Native)

---

## 🔧 Tech Stack

**Frontend:**
- React 18
- TanStack Query (React Query v5) — caching, optimistic updates, background refetch
- Recharts — line chart (monthly trend) + pie chart (category breakdown)
- Vanilla CSS — no UI framework needed
- Fetch API with transparent 401 retry

**Backend:**
- Node.js 18+ + Express
- SQLite3 with DB indexes
- JWT authentication (access + refresh tokens)
- bcryptjs for password hashing
- Zod for request validation
- express-rate-limit for brute-force protection

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` — Register new user
- `POST /api/auth/login` — Login and receive token pair
- `POST /api/auth/refresh` — Exchange refresh token for a new access token
- `POST /api/auth/logout` — Revoke refresh token

### Subscriptions (Requires Auth)
- `GET /api/subscriptions` — List subscriptions (supports `?page`, `?limit`, `?category`, `?status`, `?sort`, `?order`, `?search`)
- `POST /api/subscriptions` — Create new subscription
- `PUT /api/subscriptions/:id` — Update subscription
- `DELETE /api/subscriptions/:id` — Delete subscription

### Analytics (Requires Auth)
- `GET /api/analytics` — Get spending analytics, trends, insights, and upcoming billing

### Onboarding (Requires Auth)
- `POST /api/seed-demo` — Seed demo subscriptions for new users
- `PUT /api/onboarding/complete` — Mark onboarding as complete

For full request/response schemas and examples, see [API.md](./API.md).

---

## 🔐 Security Notes

⚠️ **Important for Production:**

1. Set both JWT secrets via environment variables — the server will refuse to start without them
```bash
# .env
JWT_SECRET=a-very-long-random-string
JWT_REFRESH_SECRET=another-very-long-random-string
```

2. Set `CORS_ORIGIN` to your frontend domain
```bash
CORS_ORIGIN=https://yourdomain.com
```

3. Rate limiting is enabled by default:
   - Auth endpoints: 10 requests per 15 minutes (brute-force protection)
   - API endpoints: 100 requests per minute

4. All user inputs are validated with Zod before processing

5. Request body size is capped at 10 KB to prevent payload attacks

6. Use HTTPS in production

---

## 🌍 Environment Variables

Copy `.env.example` to `.env` in the backend directory and update the values:

| Variable            | Required | Description                                      |
|---------------------|----------|--------------------------------------------------|
| `PORT`              | No       | Server port (default: `5000`)                    |
| `NODE_ENV`          | No       | `development` or `production`                    |
| `DATABASE_URL`      | No       | SQLite file path (default: `./data.db`)          |
| `JWT_SECRET`        | **Yes**  | Secret for signing access tokens                 |
| `JWT_REFRESH_SECRET`| **Yes**  | Secret for signing refresh tokens                |
| `CORS_ORIGIN`       | No       | Allowed frontend origin (default: `http://localhost:3000`) |

---

## 🚀 Deployment

### Deploy Backend (Railway/Render)

1. Create account on [Railway.app](https://railway.app) or [Render.com](https://render.com)
2. Connect your GitHub repo
3. Set environment variables: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`
4. Deploy!

### Deploy Frontend (Vercel/Netlify)

1. Create account on [Vercel.com](https://vercel.com)
2. Import your GitHub repo, set the root directory to `subtrackr/frontend`
3. Set environment variables:
```
REACT_APP_API_URL=https://your-backend-url/api
```
4. Deploy!

---

## 💡 Usage Tips

### Add Subscriptions
1. Click "Add Subscription"
2. Fill in name, cost, billing cycle (monthly/yearly/weekly), category, and billing date
3. Optional: Add trial expiration date, website, notes
4. Click "Save"

### View Analytics
- Switch to the "Analytics" tab
- See normalised monthly/yearly spending totals
- View the category pie chart and monthly trend line chart
- Review Smart Insights for cost-saving suggestions

### Manage Subscriptions
- **Search** — Use the search bar for instant filtered results
- **Filter** — Filter by category or status (active/paused/cancelled)
- **Sort** — Sort by cost, name, or creation date
- **Edit** — Click "Edit" on any card to update it
- **Delete** — Click "Delete" and confirm the modal
- **Pause/Cancel** — Update status to pause or cancel without deleting

---

## 🐛 Troubleshooting

**Backend won't start:**
```bash
# Ensure JWT secrets are set in .env
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

**CORS errors:**
- Make sure the backend is running on port 5000
- Verify `CORS_ORIGIN` matches your frontend URL exactly

**Auth not working / 401 errors:**
- The frontend automatically retries with a refresh token on 401 responses
- If you are still logged out, check that `JWT_REFRESH_SECRET` is set
- Clear `localStorage` and log in again if tokens are stale

---

## 📝 License

MIT License — feel free to use this project for anything!

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

---

## 📧 Support

Found a bug? Have a feature idea? Open an issue on GitHub!

---

## 🎓 Learning Resources

This project is great for learning:
- React hooks, state management, and TanStack Query
- Express.js backend development
- JWT authentication with refresh-token rotation
- Input validation with Zod
- SQLite database design and indexing
- Full-stack development workflow
- CSS animations and modern responsive design

---

## 📈 Built With Love

Created to solve a real problem: **we lose billions annually to forgotten subscriptions.**

Make a difference. Track consciously. Save intentionally. ✨

---

**Star this repo if it helps you!** ⭐

```
Made with ❤️ using React, Node.js, SQLite & TanStack Query
```
