# 🏗️ Architecture Diagram

## App Flow

```
┌──────────────────────────────────────────────────────┐
│                    App Component                      │
│  (View switching, State management, Data loading)    │
└────────────────────┬─────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Daily   │ │  Weekly  │ │  Monthly │
    │  View    │ │  View    │ │  View    │
    │(Timeline)│ │(Grid)    │ │(Heatmap) │
    └─────┬────┘ └────┬─────┘ └────┬─────┘
          │           │            │
          └───────────┼────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  HabitForm Modal  │
            │  (Add/Edit)       │
            └──────────────────┘
```

---

## Data Flow Architecture

```
┌──────────────────────────┐
│  User Interaction        │
│  (Click, Drag, Submit)   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  React Components        │
│  (App, Views, Form)      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Services Layer          │
│  (db.ts, utils.ts)       │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  IndexedDB Storage       │
│  (Habits, Entries)       │
└──────────────────────────┘
```

---

## Component Hierarchy

```
App
├── Sidebar
│   ├── Logo
│   ├── View Toggle (Daily/Week/Month)
│   ├── Add Habit Button
│   └── Habits Summary
│
├── Main Content (View Switch)
│   ├── DailyView
│   │   ├── Header (Date)
│   │   ├── Habits List (Left)
│   │   │   └── HabitItem × N
│   │   └── Timeline (Right)
│   │       └── HourRow × 24
│   │           └── EntryCard × N
│   │
│   ├── WeekView
│   │   ├── Header (Week Range)
│   │   └── Grid
│   │       ├── Habit Column
│   │       └── Day Column × 7
│   │           └── Completion Cell × Habit Count
│   │
│   └── MonthView
│       ├── Header (Month/Year)
│       ├── Calendar Grid
│       │   ├── Day Label × 7
│       │   └── Day Cell × 28-31
│       └── Legend (Streaks)
│           └── StreakItem × Habit Count
│
└── HabitForm Modal (conditional)
    ├── Name Input
    ├── Color Picker
    ├── Frequency Select
    ├── Day Selector
    ├── Duration Input
    └── Submit/Cancel Buttons
```

---

## File Organization

```
src/renderer/
├── App.tsx
│   └── Main app logic, state, view routing
│
├── components/
│   ├── DailyView.tsx       ← 24-hour timeline + habits
│   ├── DailyView.css
│   ├── WeekView.tsx        ← 7-day grid calendar
│   ├── WeekView.css
│   ├── MonthView.tsx       ← Full month heatmap
│   ├── MonthView.css
│   ├── HabitForm.tsx       ← Create habit modal
│   └── HabitForm.css
│
├── services/
│   ├── db.ts               ← IndexedDB CRUD operations
│   └── utils.ts            ← Date helpers, formatting
│
├── types/
│   └── index.ts            ← TypeScript interfaces
│
└── App.css                 ← Layout & sidebar styles
```

---

## Database Schema (IndexedDB)

```
Database: "PersonalSystems"
│
├── Object Store: "habits"
│   │
│   └── Record Structure:
│       {
│         id: string (key)
│         name: string
│         color: string
│         frequency: string
│         customDays?: number[]
│         targetDurationMinutes?: number
│         createdAt: Date
│       }
│
└── Object Store: "entries"
    │
    ├── Primary Key: id
    ├── Index: habitId (for queries)
    ├── Index: date (for range queries)
    │
    └── Record Structure:
        {
          id: string (key)
          habitId: string
          date: Date
          scheduledTime: string
          actualTime?: string
          completed: boolean
          completedAt?: Date
          notes?: string
        }
```

---

## State Management Flow

```
┌─────────────────────────────────────────┐
│  App Component State                    │
├─────────────────────────────────────────┤
│ habits: Habit[]                         │  ← All user habits
│ entries: HabitEntry[]                   │  ← Completions for current view
│ currentDate: Date                       │  ← Selected date
│ view: 'daily' | 'week' | 'month'       │  ← Active view
│ showForm: boolean                       │  ← Form visibility
│ loading: boolean                        │  ← Init state
└─────────────────────────────────────────┘
         │
         ├──► useEffect: Initialize DB + Load Data
         │
         ├──► Handlers:
         │    ├─ handleAddHabit()
         │    ├─ handleEntryUpdate()
         │    ├─ handleEntryDelete()
         │    ├─ handleDateChange()
         │    └─ handleViewChange()
         │
         └──► Pass to Components via Props
```

---

## User Interaction Flow

### Creating a Habit

```
User clicks "+ Add Habit"
    ↓
HabitForm Modal Opens (showForm = true)
    ↓
User fills form:
  - Name: "Meditation"
  - Color: "#4ECDC4"
  - Frequency: "daily"
  - Duration: 20 mins
    ↓
User clicks "Create Habit"
    ↓
handleAddHabit() called
    ├─ Creates Habit object with ID
    ├─ Saves to IndexedDB (addHabit)
    ├─ Updates React state (setHabits)
    ├─ Generates entries for next 7 days
    └─ Closes form (setShowForm = false)
    ↓
Components re-render with new habit
    ↓
Habit visible in all views
```

### Completing a Daily Habit

```
User clicks habit checkbox/card
    ↓
toggleComplete() called with entry
    ↓
handleEntryUpdate() called
    ├─ Sets completed: true
    ├─ Sets completedAt: Date.now()
    ├─ Saves to IndexedDB (addOrUpdateEntry)
    ├─ Updates React state (setEntries)
    └─ UI re-renders
    ↓
Visual feedback:
  - Checkmark appears
  - Card fades
  - Streak updates (🔥)
  - All views update automatically
```

### Rescheduling a Habit

```
User drags habit in Daily Timeline
    ↓
handleDragStart() records entry ID
    ↓
handleDrop(hour) called
    ├─ Calculates new time: "HH:MM"
    ├─ Creates updated entry with actualTime
    ├─ Calls handleEntryUpdate()
    │   ├─ Saves to IndexedDB
    │   └─ Updates React state
    ├─ UI re-renders
    └─ Habit appears in new time slot
    ↓
Change is persistent (saved locally)
```

### Switching Views

```
User clicks "Week" button
    ↓
handleViewChange('week') called
    ├─ setView('week')
    ├─ Calculates week date range
    ├─ Queries entries (getEntriesByDateRange)
    ├─ Updates state (setEntries)
    └─ Sets loading state
    ↓
WeekView component renders with:
  - Current entries for week
  - All habits
  - Calculated streaks
```

---

## Data Persistence

```
User Action
    ↓
React State Update (fast, in-memory)
    ↓
Database Operation (IndexedDB)
    ├─ WRITE: addOrUpdateEntry()
    ├─ READ: getEntriesByDate()
    ├─ DELETE: (via state removal)
    └─ Indexed for fast queries
    ↓
Page Refresh/Close
    ↓
App Init
    ├─ initDB()
    ├─ getHabits()
    ├─ getEntriesByDateRange()
    └─ Reload all data
    ↓
User sees same data (persistent)
```

---

## View Rendering Decision

```
                    App.tsx
                        │
                        ▼
                    view === ?
                    /    |    \
                   /     |     \
                  ▼      ▼      ▼
              Daily   Weekly  Monthly
              │        │        │
              ├────►   ├────►   ├────►
              │        │        │
         Load day's   Load      Load
         entries      week's    month's
         for habit    entries   entries
              │        │        │
              ├────►   ├────►   ├────►
              │        │        │
          Render       Render   Render
          timeline     grid     calendar
```

---

## Dependencies

### External (from package.json)

```
react            v18.2.0     ← UI framework
react-dom        v18.2.0     ← DOM rendering
typescript       v4.9.5      ← Type checking
electron         v27.0.0     ← Desktop wrapper
```

### Browser APIs (No npm required!)

```
✅ IndexedDB      ← Local storage
✅ HTML5 Drag     ← Drag & drop
✅ Date/Time      ← Time handling
✅ Async/Await    ← Promise handling
```

---

## Performance Optimizations

```
Optimization Strategy:

1. Component Re-renders
   └─ Only affected views re-render on state change
   
2. Database Queries
   └─ Indexed by habitId and date for fast lookups
   
3. Date Calculations
   └─ Memoized via utility functions
   
4. Drag Events
   └─ Debounced via react synthetic events
   
5. IndexedDB
   └─ Transactions for atomic operations
```

---

## Error Handling Flow

```
User Action
    ↓
    ├─► Try: Database Operation
    │       │
    │       ├─ Success → Update UI
    │       │
    │       └─ Error → catch(error)
    │           ├─ Log to console
    │           ├─ UI remains functional
    │           └─ User can retry
    │
    └─► Always: Ensure safe state

Example:
try {
  await addOrUpdateEntry(entry)
  setEntries([...newEntries])
} catch (error) {
  console.error('Failed:', error)
  // Don't update UI
  // User can retry action
}
```

---

## Extensibility Points

```
Current System:
├── Add Feature → Update component props
├── Change Storage → Implement new db.ts
├── Add Calculation → Update utils.ts
├── Modify Styling → Update .css files
└── Add View Type → Create new component + case in App.tsx

Ready for:
├── Journal entries
├── Notes/Ideas
├── Analytics
├── Notifications
├── Cloud sync
└── Export/Import
```

---

## Summary

```
Users interact with Components
Components manage React State
State changes trigger Re-renders
Components call Service methods
Services read/write to IndexedDB
IndexedDB stores persistent data
Page refresh reloads from storage
System remains functional offline
```

This architecture ensures:
- ✅ Clean separation of concerns
- ✅ Type safety (TypeScript)
- ✅ Persistent storage
- ✅ Responsive UI
- ✅ Easy to extend
- ✅ No external dependencies for core

---

*Built for clarity, maintainability, and extension.*
