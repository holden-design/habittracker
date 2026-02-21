# 🚀 Setup & Launch Guide

## What's Been Built

Your **Personal Systems Habit Tracker** is a full-featured habit management dashboard with:

✅ **Daily 24-hour timeline view** with drag-to-reschedule habits  
✅ **Weekly calendar grid** with streak tracking  
✅ **Monthly overview** with completion heatmap  
✅ **Flexible habit creation** with custom frequencies and colors  
✅ **Local-first storage** (IndexedDB - no cloud needed)  
✅ **Desktop + Mobile compatible** (React-based, works everywhere)

---

## Quick Start

### 1. Install Dependencies
```bash
cd /Users/holdenlaine/personalsystems
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```

This will:
- Start React dev server on `http://localhost:3000`
- Launch Electron app automatically
- Hot reload on code changes

### 3. Create Your First Habit

1. Click **"+ Add Habit"** in the sidebar
2. Enter habit name (e.g., "Meditation", "Exercise")
3. Pick a color and frequency
4. Set optional duration target
5. Click **"Create Habit"**

Entries for the next 7 days will auto-generate!

---

## Using the App

### Daily View (Default)
- **Left panel**: Today's habits with completion checkboxes
- **Right timeline**: 24-hour schedule (00:00-23:00)
- **Drag habits**: Click and drag any habit card to reschedule time
- **Mark complete**: Click on habit or checkbox to mark done ✓
- **Streaks**: 🔥 icon shows current streak

### Weekly View
- Calendar grid with 7 days
- Green highlight = completed habits
- Click any day to drill into daily view
- See all streaks at a glance

### Monthly View
- Full month calendar
- Color intensity = completion percentage
- Shows completed/total habits per day (e.g., "3/5")
- Legend below shows habit streaks
- Click dates to view daily

---

## File Structure

```
src/renderer/
├── App.tsx                      # Main app component (view switching)
├── components/
│   ├── DailyView.tsx           # 24-hour timeline with drag-drop
│   ├── WeekView.tsx            # 7-day calendar grid
│   ├── MonthView.tsx           # Monthly heatmap
│   └── HabitForm.tsx           # Create/edit habits
├── services/
│   ├── db.ts                   # IndexedDB interface
│   └── utils.ts                # Date & habit helpers
└── types/
    └── index.ts                # TypeScript interfaces
```

---

## How Data Works

### Local Storage (IndexedDB)
- All data stored locally in browser/Electron
- Persists between app restarts
- No internet required
- No cloud accounts needed

### Database Schema
```typescript
// Habits table
{
  id: string
  name: string
  color: string               // hex color
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
  customDays?: number[]       // 0=Sun, 6=Sat
  targetDurationMinutes?: number
  createdAt: Date
}

// Entries table (habit completions)
{
  id: string
  habitId: string             // links to habit
  date: Date                  // start of day
  scheduledTime: string       // "HH:MM"
  actualTime?: string         // after drag-reschedule
  completed: boolean
  completedAt?: Date
}
```

---

## Key Features Explained

### 1. Flexible Scheduling
- Habits assigned default time (e.g., 9:00 AM)
- Drag them to your actual time in daily view
- Time changes per-day, not permanent
- Perfect for flexible schedules!

### 2. Frequency Options
- **Daily**: Every single day
- **Weekdays**: Monday-Friday only
- **Weekends**: Saturday-Sunday only
- **Custom**: Pick specific days of week

### 3. Streak Tracking
- Automatic calculation across views
- Shows current streak (🔥)
- Accounts for habit frequency (won't break on days off)
- Visible in daily/weekly/monthly views

### 4. Habit Colors
- Pick from 8 pre-set colors
- Helps visually distinguish habits
- Consistent across all views
- Used in calendar visualization

---

## Development

### Build Commands

```bash
# Development with hot reload
npm run dev

# Build React for production
npm run build

# Build Electron executable
npm run dist
```

### TypeScript Compilation
The app uses TypeScript for type safety:
```bash
# Compile TypeScript
npx tsc

# Check for errors
npm run build
```

---

## Next Steps (Future Features)

The architecture is ready for:
- 📝 **Journal section** - Free-form daily reflections
- 💡 **Ideas block** - Capture thoughts quickly
- 📊 **Analytics** - Insights & trends
- 🔔 **Notifications** - Habit reminders
- ☁️ **Cloud sync** - Optional backup (not required)

---

## Troubleshooting

### "localhost:3000 not found" error
- Wait 10-15 seconds for React to start
- Check terminal for React startup messages
- Press Ctrl+C and re-run `npm run dev`

### Data not persisting?
- Check IndexedDB in DevTools (F12 > Application > IndexedDB)
- Clear and reload if corrupted
- Data is stored in app's local database

### App won't start?
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## Architecture Highlights

✨ **Why this design?**

- **Local-first**: No network required, instant loads
- **TypeScript**: Catch bugs at compile time
- **React + Hooks**: Easy to extend with features
- **Responsive**: Works on phone, tablet, desktop
- **IndexedDB**: Unlimited local storage
- **Modular**: Components are self-contained

---

Enjoy your new habit tracking system! 🚀
