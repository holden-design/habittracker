# Quick Start: Deploy Personal Systems

## 3 Steps to Get Your App Online

### Step 1: Database (2 minutes)
**Create free PostgreSQL on Supabase**
1. Go to [supabase.com](https://supabase.com/sign-up) → Sign up free
2. Create new project (region closest to you)
3. Wait ~2 minutes for project to initialize
4. Go to **Settings → Database → Connection Pooling**
5. Copy the connection string
6. Update your `.env` file:
   ```
   DATABASE_URL=postgresql://[paste the connection string here]
   NODE_ENV=production
   ```

### Step 2: Hosting (3 minutes)
**Deploy to Railway**
1. Go to [railway.app](https://railway.app/login) → Sign up free
2. Click **New Project** → **Deploy from GitHub**
3. Select this repository
4. Add these environment variables:
   - `DATABASE_URL` = (paste from Supabase Step 1)
   - `NODE_ENV` = `production`
5. Railway auto-detects and deploys
6. When done, you'll get a URL like `https://personalsystems-abc123.railway.app`

### Step 3: Access from Phone (1 minute)
**Install as app on home screen**
1. On your phone, visit your Railway URL
2. iOS: Tap Share → Add to Home Screen
3. Android: Tap Menu (⋮) → Install app
4. Your app now appears as an icon on your home screen
5. Works on 5G, WiFi, and even offline! ✨

---

## For Local Development (Optional)

Need to test on your Mac first?

```bash
# Terminal 1: Start the backend server
npm run dev:server

# Terminal 2: Start React frontend
npm run dev
```

Visit `http://localhost:3000` — everything works exactly the same!

---

## If You Get Stuck

| Issue | Fix |
|-------|-----|
| DATABASE_URL error | Copy from Supabase Settings → Database → Connection Pooling (not the standard connection) |
| Can't connect to deployed app | Wait 2-3 min for Railway to finish building, then refresh page |
| Service Worker not working | Open DevTools (F12) → Application → Service Workers, should show "activated" |
| iPhone won't install | Make sure you're using HTTPS (should be automatic on Railway) |

---

## What You've Built

✅ Daily habit tracker with 24-hour timeline  
✅ Calendar views (daily, weekly, monthly)  
✅ Notes & ideas capture  
✅ Desktop notifications  
✅ Works on Mac, phone, tablet  
✅ Offline support (with service worker)  
✅ Cloud-hosted (Railway)  
✅ Free tier works for personal use  

**Future:** When ready, add user login/signup and sell access to others. Backend/frontend are separate, so UI changes don't affect the database. 🎯
