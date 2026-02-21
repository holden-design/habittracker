# Personal Systems - Habit Tracker

A local-first desktop + mobile habit tracking dashboard with daily planning views.

## Features

### 🎯 Habit Management
- **Create habits** with custom names, colors, and frequencies (daily, weekdays, weekends, or custom days)
- **Set target durations** for each habit to track time spent
- **Flexible time scheduling** - drag habits to your preferred time, not locked to rigid schedules
- **One-click completion** - mark habits as done throughout the day

### 📅 Multiple Views
- **Daily View**: 24-hour timeline with draggable habit entries. See all habits for today with drag-to-reschedule and completion tracking
- **Weekly View**: Calendar grid showing 7 days with completion checkmarks and habit streaks
- **Monthly View**: Full month overview with completion percentages and color-coded activity levels

### 🔥 Streak Tracking
- Automatic streak calculation across all views
- Visual streak indicators showing your consistency
- Streaks account for habit frequency (won't break on rest days)

### 💾 Local-First Storage
- **IndexedDB** for offline-first data persistence
- Works completely offline - no cloud dependency
- All data stored locally on your device
- Easy export/backup capabilities for future extension

### 🎨 Visual Design
- Color-coded habits for easy recognition
- Clean, modern interface with gradient sidebar
- Responsive layout works on desktop and mobile
- Smooth animations and transitions

## Tech Stack

- **React 18** with TypeScript
- **IndexedDB** for local persistence
- **Electron** for desktop app (with web-based compatibility for mobile)
- **CSS Grid & Flexbox** for responsive layouts

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts both the React dev server and Electron in watch mode.

### Build

```bash
npm run build
```

Builds the React app and compiles TypeScript for Electron.

### Package

```bash
npm run dist
```

Creates distributable Electron app packages.

## Project Structure

```
src/
├── renderer/
│   ├── components/
│   │   ├── DailyView.tsx        # 24-hour timeline view
│   │   ├── WeekView.tsx          # 7-day calendar grid
│   │   ├── MonthView.tsx         # Monthly overview
│   │   └── HabitForm.tsx         # Add/edit habits modal
│   ├── services/
│   │   ├── db.ts                 # IndexedDB operations
│   │   └── utils.ts              # Helper functions
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── App.tsx                   # Main app component
│   └── App.css                   # Main styles
└── main/
    ├── index.ts                  # Electron entry point
    └── preload.ts                # IPC preload script
```

## Key Data Models

### Habit
- `id` - Unique identifier
- `name` - Habit display name
- `color` - Visual color (#hex)
- `frequency` - 'daily' | 'weekdays' | 'weekends' | 'custom'
- `customDays` - Optional array of day numbers (0-6)
- `targetDurationMinutes` - Optional duration goal
- `createdAt` - Creation date

### HabitEntry
- `id` - Unique identifier
- `habitId` - Reference to habit
- `date` - Date of entry (start of day)
- `scheduledTime` - Initial scheduled time (HH:MM)
- `actualTime` - Adjusted time after drag-reschedule
- `completed` - Boolean completion status
- `completedAt` - Timestamp when marked complete
- `notes` - Optional entry notes

## Future Enhancements

- Journal & notes section (planned)
- Daily review prompts
- Ideas capture block
- Analytics & insights
- Export to CSV/PDF
- Habit templates
- Smart reminders
- Cloud sync (optional)

## License

MIT
