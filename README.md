# Nightlife Coordination App

A full-stack JavaScript application for finding bars and coordinating with friends. Built with Node.js, Express, and vanilla JavaScript. No frameworks, no bloat—just clean, functional code.

[Live Demo](https://codepen.io/JCaesar45/full/ByzYGNB) 

## What It Does

* Search for bars in any city using the Yelp API
* See real-time RSVP counts for each venue
* Authentication system with session persistence
* Responsive, dark-themed UI with canvas animations
* Mobile-first design that actually works on phones

## User Stories (All Working)

✓ As an unauthenticated user, view all bars in your area  
✓ As an authenticated user, add yourself to a bar to indicate you're going  
✓ As an authenticated user, remove yourself from a bar  
✓ Login preserves your search query (no need to search again)  

## Tech Stack

**Backend:**
- Node.js + Express
- Express-session for auth
- bcryptjs for password hashing
- node-fetch for Yelp API calls
- In-memory storage (easily swap to MongoDB)

**Frontend:**
- Vanilla JavaScript (ES6+)
- HTML5 Canvas for background particles
- CSS Grid/Flexbox
- No React, no jQuery, no dependencies

**APIs:**
- Yelp Fusion API for venue data

## Prerequisites

- Node.js 16+
- Yelp API Key (get one at [Yelp Fusion](https://fusion.yelp.com/))
- Optional: MongoDB if you want persistent storage instead of Maps

## Installation

```bash
# Clone the repo
git clone https://github.com/JCaesar45/nightlife-coord.git
cd nightlife-coord

# Install dependencies
npm install

# Create env file
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
YELP_API_KEY=your_actual_yelp_api_key_here
SESSION_SECRET=any_random_string_here
NODE_ENV=development
```

## Running Locally

```bash
# Development mode
npm run dev

# Production
npm start
```

Open `http://localhost:3000`

## How to Use

1. **Search**: Type a city in the search box (e.g., "Manhattan, NY")
2. **Browse**: Click through venue cards showing ratings, prices, and attendee counts
3. **RSVP**: Click "RSVP" on any bar to mark yourself as going
4. **Auth**: Sign up with username/password (no email verification required for demo)
5. **Persistence**: Your search stays in the URL and localStorage, so refreshing doesn't lose results

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | No | Check current session |
| POST | `/api/auth/logout` | Yes | Destroy session |
| GET | `/api/venues?location=city` | No | Search bars |
| POST | `/api/venues/:id/rsvp` | Yes | Toggle attendance |

## Customization

**Switch to MongoDB:**
Replace the `Map()` instances in server.js with Mongoose models:

```javascript
// Instead of: const users = new Map();
const User = require('./models/User');
```

**Add Twitter OAuth:**
Uncomment the Twitter strategy in `config/passport.js` and add keys to `.env`.

**Change the Theme:**
Edit CSS variables in `public/index.html`:

```css
:root {
  --primary: #ff006e;    /* Change accent color */
  --bg: #050505;         /* Change background */
}
```

## Deployment

### Heroku

```bash
heroku create your-app-name
heroku config:set YELP_API_KEY=your_key
heroku config:set SESSION_SECRET=random_string
git push heroku main
```

### Railway/Render

1. Connect your GitHub repo
2. Add environment variables in dashboard
3. Deploy automatically on push

## Known Issues

* Yelp API has CORS restrictions in browser, so we proxy through the Node server
* Images from Unsplash might load slowly sometimes (fallbacks included)
* Session storage resets on server restart (use Redis for production)

## Contributing

Fork it, break it, fix it, PR it.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT - do whatever you want with it.

## Credits

* Background particle system inspired by early 2000s demoscene
* Color scheme ripped from cyberpunk 2077 concept art
* Yelp for the venue data (obviously)

---

Built with caffeine and spite by Jordan Leturgez | 2026
```
