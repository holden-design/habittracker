# ⚡ Quick Reference Card

## Launch App
```bash
npm run dev
```
Opens at `http://localhost:3000` with Electron window

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| View: Daily | Click "Daily" button |
| View: Weekly | Click "Week" button |
| View: Monthly | Click "Month" button |
| Add Habit | Click "+ Add Habit" button |
| Complete Habit | Click checkmark or habit card |
| Reschedule | Drag habit card in timeline |

---

## Daily View

```
┌─────────────────────────────┐
│  Mon, Feb 21                │
├─────────────────────────────┤
│  Habits         │  Timeline │
│  ☐ Meditation   │ 09:00 ◇◇◇ │  ← Drag to reschedule
│  ☐ Exercise     │ 17:00 ◇◇◇ │
│  ☐ Reading      │ 21:00 ◇◇◇ │
└─────────────────────────────┘
```

**Click**: Mark complete  
**Drag**: Change time  
**Color box**: Habit's color  

---

## Weekly View

```
        Mon  Tue  Wed  Thu  Fri  Sat  Sun
Habit1  ✓    ✓    ✓    ✓    ✓    ✗    ✓
Habit2  ✓    ✗    ✓    ✓    ✓    ✓    ✗
Habit3  ✓    ✓    ✓    ✓    ✓    ✓    ✓
         🔥7  🔥5  🔥8  🔥4  🔥6  🔥2  🔥3
```

**Color = Completed** | **✓ = Done** | **✗ = Missed**

---

## Monthly View

```
        Feb 2026
Sun  1 ○  2 ⬤  3 ⬤  4 ◐
Mon  5 ⬤  6 ◐  7 ○  8 ⬤
Tue  9 ⬤ 10 ⬤ 11 ◐ 12 ⬤
Wed 13 ⬤ 14 ○ 15 ⬤ 16 ◐
...

Legend:
⬤ 5/5 completed
◐ 3/5 completed  
○ 0/5 completed
```

**Color intensity** = Completion %

---

## Create Habit Form

```
Name:        "Meditation"
Color:       [8 color options]
Frequency:   • Daily
             • Weekdays
             • Weekends
             • Custom (select days)
Duration:    [optional] 20 mins
```

All fields except Name are optional!

---

## Data Model Quick View

### Habit
```typescript
{
  id: "abc123",
  name: "Meditation",
  color: "#4ECDC4",
  frequency: "daily",
  targetDurationMinutes: 20
}
```

### Entry (Completion Log)
```typescript
{
  habitId: "abc123",
  date: 2026-02-21,
  scheduledTime: "09:00",
  actualTime: "08:30",    // after drag
  completed: true
}
```

---

## View & Filter By

### Daily View
- Shows: Today's habits in timeline format
- Click date in other views to switch here
- Change time by dragging

### Weekly View
- Shows: 7 days side-by-side
- Shows: All habits for week
- Shows: Streaks per habit

### Monthly View
- Shows: Full month calendar
- Shows: Completion % per day
- Shows: All habit streaks

---

## Habit Frequencies Explained

| Frequency | Days | Use Case |
|-----------|------|----------|
| Daily | Every day | Core habits |
| Weekdays | Mon-Fri | Work habits |
| Weekends | Sat-Sun | Leisure habits |
| Custom | Selected days | Specific pattern |

---

## Streak Counter

Shows as **🔥 #** next to each habit

```
🔥 5  = 5 consecutive days completed
🔥 0  = Streak broken
🔥 1  = Just started or recovering
```

**Note**: Streak doesn't break on scheduled off-days

---

## Time Format

All times use **24-hour format**

```
00:00 = Midnight
06:00 = 6 AM
12:00 = Noon
18:00 = 6 PM
23:59 = 11:59 PM
```

---

## Colors Available

```
🔴 Red        #FF6B6B
🟦 Teal       #4ECDC4
🔵 Blue       #45B7D1
🟠 Orange     #FFA07A
💚 Mint       #98D8C8
💛 Yellow     #F7DC6F
💜 Purple     #BB8FCE
🔷 Sky Blue   #85C1E2
```

---

## Completing Habits

Three ways to mark complete:

1. **Click checkbox** (left sidebar)
   ```
   ☐ Meditation  →  ☑ Meditation
   ```

2. **Click habit card** (timeline)
   ```
   [Meditation 09:00]  →  [Meditation 09:00 ✓]
   ```

3. **Drag and confirm**
   ```
   Just drag to new time, then click to complete
   ```

---

## Data Storage

**Where**: IndexedDB (browser local storage)  
**What**: All habits + all completions  
**When**: Saves automatically  
**Backup**: Export/Import JSON (future feature)  
**Privacy**: Never leaves your device  

Check: DevTools (F12) → Application → IndexedDB

---

## Build Commands

```bash
# Development with hot reload
npm run dev

# Build React (creates build folder)
npm run build

# Build Electron executable
npm run dist

# Run tests
npm run test
```

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| App won't start | `npm install` then `npm run dev` |
| Habits not showing | Refresh page (Cmd+R) |
| Time not updating | Check browser console (F12) |
| Data disappeared | Check IndexedDB isn't cleared |
| Slow performance | Clear browser cache |

---

## Pro Tips

💡 **Strategy**: Start with 3 habits, add one per week  
💡 **Timing**: Schedule at same time daily for consistency  
💡 **Flexibility**: Use daily view to reschedule as needed  
💡 **Review**: Check monthly view weekly for patterns  
💡 **Streaks**: 21 days = habit formed, 66 days = strong  

---

## UI Elements Reference

```
[+ Add Habit]    = Create new habit
[Daily] [Week] [Month]  = Switch views
🔥 #             = Streak counter
☐                = Incomplete checkbox
✓                = Completed checkmark
◇◇◇              = Draggable habit card
[Color box]      = Habit color indicator
```

---

## Daily Schedule Example

```
00:00 ├─ Sleep
06:00 ├─ Wake up
09:00 ├─ [Meditation 🧘] ✓  ← Completed
12:00 ├─ Lunch
17:00 ├─ [Exercise 💪]       ← Not yet done
21:00 ├─ [Reading 📖]        ← Not yet done
23:00 └─ Sleep
```

---

## Next Features Coming

- 📝 Journal with daily prompts
- 💡 Ideas & notes capture
- 📊 Analytics & insights
- 🔔 Habit reminders
- ☁️ Optional cloud backup

---

## Support Resources

- **Setup**: See SETUP_GUIDE.md
- **Features**: See HABIT_TRACKER_README.md
- **Checklist**: See IMPLEMENTATION_CHECKLIST.md
- **Summary**: See PROJECT_SUMMARY.md

---

*Your personal habit tracking cockpit is ready to launch!* 🚀
