# Personal Systems - Backend Setup & Deployment Guide

## Overview

Personal Systems is now transitioning from a local desktop app to a cloud-based application. The backend is built with Express, PostgreSQL, and is ready to deploy to Railway.

## Architecture

- **Frontend**: React + TypeScript (PWA-enabled)
- **Backend**: Node.js + Express + PostgreSQL
- **Deployment**: Railway (cloud hosting) + Supabase (database)
- **Access**: Any device with 5G/WiFi can access the web app

## Quick Start (Development)

### Prerequisites
- Node.js 16+ installed
- PostgreSQL running locally (or use Supabase)
- Git

### Local Development

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Set up your PostgreSQL database**:
   - Option A: Local PostgreSQL
     - Create a database named `personalsystems`
     - Update `.env`: `DATABASE_URL=postgresql://user:password@localhost:5432/personalsystems`
   
   - Option B: Supabase (recommended for cloud)
     - See "Cloud Deployment" below

3. **Start the development server**:
   ```bash
   npm run dev:server
   ```
   The API will be available at `http://localhost:5000`

4. **In another terminal, start React**:
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`

5. **Testing API endpoints**:
   ```bash
   # Get habits
   curl http://localhost:5000/api/habits
   
   # Create a habit
   curl -X POST http://localhost:5000/api/habits \
     -H "Content-Type: application/json" \
     -d '{"id":"h1","name":"Exercise","color":"#667eea","frequency":"daily","customDays":[],"targetDurationMinutes":30,"createdAt":"2024-01-01T00:00:00Z","updatedAt":"2024-01-01T00:00:00Z"}'
   ```

## Cloud Deployment (Railway + Supabase)

### Step 1: Set Up Supabase (PostgreSQL Database)

1. Go to [supabase.com](https://supabase.com) and sign up (free tier)
2. Create a new project
3. Go to **Project Settings → Database**
4. Copy the connection string under "Connection pooling" (Recommended)
5. Add to `.env`:
   ```
   DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
   NODE_ENV=production
   PORT=5000
   ```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign up (free tier, $5/month credits)
2. Click **New Project → Deploy from GitHub**
3. Connect your GitHub account and select this repository
4. Configure environment variables:
   - Add `DATABASE_URL` (from Supabase)
   - Add `NODE_ENV=production`
   - Add `PORT=5000`
5. Railway will automatically:
   - Build: `npm run build:server`
   - Start: `npm run start:server`

6. Once deployed, you'll get a public URL like: `https://personalsystems-abc123.railway.app`

### Step 3: Update Frontend API URL

The app automatically uses:
- `http://localhost:5000` in development
- `window.location.origin` in production (Railway URL)

No code changes needed! The service worker handles routing.

### Step 4: Access from Phone

1. On your phone, visit: `https://personalsystems-abc123.railway.app`
2. Click the menu icon and select **"Install app"** or **"Add to Home Screen"**
3. The PWA will install on your home screen with the app icon
4. Works on 5G, WiFi, or even offline (cached data)

## API Endpoints

### Habits
- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create a habit
- `DELETE /api/habits/:id` - Delete a habit

### Entries (Habit completions)
- `GET /api/entries/date/:date` - Get entries for a specific date (YYYY-MM-DD)
- `GET /api/entries/range/:start/:end` - Get entries for a date range
- `POST /api/entries` - Create/update an entry
- `DELETE /api/entries/:id` - Delete an entry

### Notes
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create/update a note
- `DELETE /api/notes/:id` - Delete a note

### Ideas
- `GET /api/ideas` - Get all ideas
- `POST /api/ideas` - Create/update an idea
- `DELETE /api/ideas/:id` - Delete an idea

## Database Schema

The server automatically creates these tables on first run:

```sql
-- Habits
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  frequency TEXT NOT NULL,
  custom_days TEXT[],
  target_duration_minutes INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habit entries (completions)
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES habits(id),
  date DATE NOT NULL,
  scheduled_time TEXT,
  actual_time TEXT,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notes
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ideas
CREATE TABLE ideas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Features Enabled

✅ PWA Installation on home screen (all devices)
✅ Offline support with service worker caching
✅ Cross-origin requests enabled (CORS)
✅ Automatic database initialization
✅ Connection pooling for PostgreSQL
✅ Security headers for development and production
✅ Static file serving for React build

## Troubleshooting

### "Cannot find module 'ts-node'"
```bash
npm install -g ts-node typescript
```

### "Database connection failed"
- Check your `DATABASE_URL` in `.env`
- For Supabase, make sure to use "Connection pooling" URL
- Test connection: `npx ts-node -e "const pg = require('pg'); const pool = new pg.Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT 1', (err, res) => { console.log(err || 'Connected!'); process.exit(); });"`

### "CORS errors on phone"
- Make sure your `.env` has the correct production URL
- The server enables CORS for all origins by default (safe for private apps)

### "Service Worker not registering"
- Open DevTools (F12) → Application → Service Workers
- Check if the service worker is registered and active
- Clear cache if needed: Application → Storage → Clear site data

## Next Steps (Phase 2 - Optional)

When you're ready to add user accounts and monetization:

1. **User Authentication**: Add Supabase Auth
2. **User Data Isolation**: Add `user_id` to all tables
3. **Payment System**: Integrate Stripe for subscriptions
4. **Custom Domain**: Point a custom domain to Railway

For now, everything is single-user and private!

## Support

- Railway Dashboard: https://railway.app/dashboard
- Supabase Dashboard: https://app.supabase.com
- Server logs: Check Railway Dashboard → Deployments → View Logs
- Frontend errors: Browser Console (F12)

---

**You've built a production-ready habit tracking system!** 🚀
