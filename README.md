# 💳 Digital Debt Tracker

**Stop losing money to forgotten subscriptions.** 

A beautiful, full-stack web app that helps you discover, track, and manage all your recurring charges. Find out exactly how much you're spending and identify subscriptions you no longer use.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D14-blue)
![React](https://img.shields.io/badge/react-18.2-61dafb)

---

## ✨ Features

- 📱 **Beautiful Dashboard** - See all subscriptions at a glance with rich cards
- 📊 **Analytics & Insights** - Track spending by category, monthly/yearly totals
- 🔔 **Smart Alerts** - Get notified before trials expire and billing dates
- 🔐 **Secure Auth** - JWT-based authentication with password hashing
- 💾 **Persistent Storage** - SQLite database with local server
- 🎨 **Responsive Design** - Mobile-friendly, works on all devices
- ⚡ **Fast & Simple** - Built for speed and ease of use

---

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ and npm
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/digital-debt-tracker.git
cd digital-debt-tracker
```

2. **Setup Backend**
```bash
cd backend
npm install
```

3. **Setup Frontend**
```bash
cd ../frontend
npm install
```

---

## 🏃 Running Locally

### Start Backend (Terminal 1)
```bash
cd backend
npm start
```
Backend runs on `http://localhost:5000`

### Start Frontend (Terminal 2)
```bash
cd frontend
npm start
```
Frontend opens at `http://localhost:3000`

### Test Login
Use any email/password to create an account. It's stored in-memory (demo).

---

## 📁 Project Structure

```
digital-debt-tracker/
├── backend/
│   ├── server.js           # Express server & routes
│   └── package.json        # Backend dependencies
├── frontend/
│   ├── public/
│   │   └── index.html      # HTML entry point
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── App.css         # Styles
│   │   ├── index.js        # React bootstrap
│   └── package.json        # Frontend dependencies
├── README.md               # This file
└── .gitignore             # Git ignore rules
```

---

## 🎯 MVP Features Included

- ✅ User signup/login
- ✅ Add/edit/delete subscriptions
- ✅ Track by category
- ✅ Monthly/yearly spending calculations
- ✅ Beautiful analytics dashboard
- ✅ Billing date tracking
- ✅ Trial expiration dates
- ✅ Notes and website links

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
- [ ] Dark mode
- [ ] Mobile app (React Native)

---

## 🔧 Tech Stack

**Frontend:**
- React 18
- Vanilla CSS (no frameworks needed)
- Fetch API for HTTP requests
- Local storage for auth tokens

**Backend:**
- Node.js + Express
- SQLite3
- JWT authentication
- bcryptjs for password hashing

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### Subscriptions (Requires Auth)
- `GET /api/subscriptions` - List all subscriptions
- `POST /api/subscriptions` - Create new subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription

### Analytics (Requires Auth)
- `GET /api/analytics` - Get spending analytics

---

## 🔐 Security Notes

⚠️ **Important for Production:**

1. Change the JWT secret in `backend/server.js`
```javascript
const JWT_SECRET = 'your-super-secret-key-here';
```

2. Use environment variables for sensitive data
```bash
# .env
JWT_SECRET=your-secret-key
DATABASE_URL=your-database-url
```

3. Enable CORS only for your domain
```javascript
app.use(cors({
  origin: 'https://yourdomain.com'
}));
```

4. Add rate limiting
5. Validate all user inputs
6. Use HTTPS in production

---

## 🚀 Deployment

### Deploy Backend (Railway/Render)

1. Create account on [Railway.app](https://railway.app)
2. Connect your GitHub repo
3. Set environment variables (JWT_SECRET, DATABASE_URL)
4. Deploy!

### Deploy Frontend (Vercel/Netlify)

1. Create account on [Vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Set environment variables:
```
REACT_APP_API_URL=your-backend-url
```
4. Deploy!

---

## 💡 Usage Tips

### Add Subscriptions
1. Click "Add Subscription" button
2. Fill in name, cost, category, billing date
3. Optional: Add trial expiration date, website, notes
4. Click "Save"

### View Analytics
- Switch to "Analytics" tab
- See monthly/yearly spending
- View breakdown by category
- Identify where your money goes

### Manage Subscriptions
- Edit anytime by clicking "Edit" on a card
- Delete by clicking "Delete"
- Mark as paused/cancelled
- Add notes about why you use it

---

## 🐛 Troubleshooting

**Backend won't start:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

**CORS errors:**
- Make sure backend is running on port 5000
- Check API_URL in frontend code

**Auth not working:**
- Check browser console for errors
- Ensure token is being saved to localStorage
- Clear localStorage and try again

---

## 📝 License

MIT License - feel free to use this project for anything!

---

## 🤝 Contributing

Pull requests welcome! For major changes, please open an issue first.

---

## 📧 Support

Found a bug? Have a feature idea? Open an issue on GitHub!

---

## 🎓 Learning Resources

This project is great for learning:
- React hooks and state management
- Express.js backend development
- JWT authentication
- SQLite database design
- Full-stack development workflow
- CSS animations and modern design

---

## 📈 Built With Love

Created to solve a real problem: **we lose billions annually to forgotten subscriptions.**

Make a difference. Track consciously. Save intentionally. ✨

---

**Star this repo if it helps you!** ⭐

```
Made with ❤️ using React, Node.js & SQLite
```
