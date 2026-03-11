import React, { useEffect, useState } from 'react';
import './App.css';
import { Habit, HabitEntry, Note, Idea, PlanTask, User } from './types';
import { initDB, addHabit, getHabits, addOrUpdateEntry, getEntriesByDate, getEntriesByDateRange, deleteHabit, updateHabit, deleteEntry, addOrUpdateNote, getNotes, deleteNote, addOrUpdateIdea, getIdeas, deleteIdea, getCurrentUser, logout } from './services/db';
import { shouldHabitRunToday, generateId, getWeekStart } from './services/utils';
import { HabitForm } from './components/HabitForm';
import { DailyView } from './components/DailyView';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { NotesView } from './components/NotesView';
import { AuthScreen } from './components/AuthScreen';

type ViewType = 'daily' | 'week' | 'month';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('daily');
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Habit | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notesPanelWidth, setNotesPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('notesPanelWidth');
      return saved ? parseInt(saved, 10) : 400;
    } catch {
      return 400;
    }
  });
  const [isDraggingResize, setIsDraggingResize] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch {
        // Not logged in
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Reset to today's date when the app/window gains focus
  useEffect(() => {
    const handleFocus = () => {
      const now = new Date();
      setCurrentDate((prev) => {
        if (prev.toDateString() !== now.toDateString()) {
          return now;
        }
        return prev;
      });
    };
    window.addEventListener('focus', handleFocus);
    // Also set to today on mount
    handleFocus();
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Initialize DB and load data (only when user is logged in)
  // Deps intentionally limited to [user] — runs once on login, not on view/date changes
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        await initDB();
        const loadedHabits = await getHabits();
        setHabits(loadedHabits);

        const loadedNotes = await getNotes();
        setNotes(loadedNotes);
        const loadedIdeas = await getIdeas();
        setIdeas(loadedIdeas);

        let loadedEntries: HabitEntry[] = [];
        if (view === 'daily') {
          loadedEntries = await getEntriesByDate(currentDate);
        } else if (view === 'week') {
          const weekStart = getWeekStart(currentDate);
          const prevWeekStart = new Date(weekStart);
          prevWeekStart.setDate(prevWeekStart.getDate() - 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          loadedEntries = await getEntriesByDateRange(prevWeekStart, weekEnd);
        } else if (view === 'month') {
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          loadedEntries = await getEntriesByDateRange(monthStart, monthEnd);
        }

        // Auto-create entries for today's habits that don't have one yet
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (const habit of loadedHabits) {
          if (shouldHabitRunToday(habit, today)) {
            const hasEntry = loadedEntries.some(
              (e) => e.habitId === habit.id && new Date(e.date).toDateString() === today.toDateString()
            );
            if (!hasEntry) {
              const newEntry: HabitEntry = {
                id: generateId(),
                habitId: habit.id,
                date: today,
                scheduledTime: '09:00',
                completed: false,
              };
              await addOrUpdateEntry(newEntry);
              loadedEntries.push(newEntry);
            }
          }
        }
        setEntries(loadedEntries);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  const ensureEntriesExist = async (date: Date, habitsToCheck: Habit[], currentEntries: HabitEntry[]) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    for (const habit of habitsToCheck) {
      if (shouldHabitRunToday(habit, date)) {
        const existingEntry = currentEntries.find(
          (e) => e.habitId === habit.id && new Date(e.date).toDateString() === date.toDateString()
        );

        if (!existingEntry) {
          const newEntry: HabitEntry = {
            id: generateId(),
            habitId: habit.id,
            date: dayStart,
            scheduledTime: '09:00',
            completed: false,
          };
          await addOrUpdateEntry(newEntry);
          setEntries((prev) => [...prev, newEntry]);
        }
      }
    }
  };

  const handleAddHabit = async (habit: Habit) => {
    // If editing, use update path
    if (editingHabit) {
      await handleUpdateHabit(habit);
      return;
    }
    try {
      await addHabit(habit);
      setHabits((prev) => [...prev, habit]);

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        await ensureEntriesExist(date, [habit], entries);
      }

      setShowForm(false);
    } catch (error) {
      console.error('Failed to add habit:', error);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    // Show confirmation dialog
    const habit = habits.find((h) => h.id === habitId);
    if (habit) {
      setConfirmDelete(habit);
    }
  };

  const confirmDeleteHabit = async () => {
    if (!confirmDelete) return;
    try {
      await deleteHabit(confirmDelete.id);
      setHabits((prev) => prev.filter((h) => h.id !== confirmDelete.id));
      setEntries((prev) => prev.filter((e) => e.habitId !== confirmDelete.id));
    } catch (error) {
      console.error('Failed to delete habit:', error);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setShowForm(true);
  };

  const handleUpdateHabit = async (habit: Habit) => {
    try {
      await updateHabit(habit);
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
      setShowForm(false);
      setEditingHabit(null);
    } catch (error) {
      console.error('Failed to update habit:', error);
    }
  };

  const handleEntryUpdate = async (entry: HabitEntry) => {
    // Update UI optimistically first so the entry appears immediately
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id);
      if (exists) {
        return prev.map((e) => (e.id === entry.id ? entry : e));
      }
      return [...prev, entry];
    });
    try {
      await addOrUpdateEntry(entry);
    } catch (error) {
      console.error('Failed to save entry to database:', error);
      // Entry is still visible in UI even if DB save fails
    }
  };

  const handleEntryDelete = async (entryId: string) => {
    try {
      await deleteEntry(entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const handleDateChange = async (date: Date) => {
    setCurrentDate(date);
    // Switch to daily view and load entries for the selected date
    setView('daily');
    let dayEntries = await getEntriesByDate(date);

    // Auto-create entries for habits that should run on this day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    for (const habit of habits) {
      if (shouldHabitRunToday(habit, date)) {
        const hasEntry = dayEntries.some((e) => e.habitId === habit.id);
        if (!hasEntry) {
          const newEntry: HabitEntry = {
            id: generateId(),
            habitId: habit.id,
            date: dayStart,
            scheduledTime: '09:00',
            completed: false,
          };
          await addOrUpdateEntry(newEntry);
          dayEntries = [...dayEntries, newEntry];
        }
      }
    }
    setEntries(dayEntries);
  };

  const handleAddNote = async (note: Note) => {
    try {
      await addOrUpdateNote(note);
      setNotes((prev) => [note, ...prev]);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleUpdateNote = async (note: Note) => {
    try {
      await addOrUpdateNote(note);
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? note : n))
      );
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleAddIdea = async (idea: Idea) => {
    try {
      await addOrUpdateIdea(idea);
      setIdeas((prev) => [idea, ...prev]);
    } catch (error) {
      console.error('Failed to add idea:', error);
    }
  };

  const handleUpdateIdea = async (idea: Idea) => {
    try {
      await addOrUpdateIdea(idea);
      setIdeas((prev) =>
        prev.map((i) => (i.id === idea.id ? idea : i))
      );
    } catch (error) {
      console.error('Failed to update idea:', error);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    try {
      await deleteIdea(ideaId);
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
    } catch (error) {
      console.error('Failed to delete idea:', error);
    }
  };

  // AI: Convert plan tasks into calendar entries
  // Uses a stable 'plan-task' habitId so views can identify these as non-habit entries
  const handleAddCalendarTasks = async (tasks: PlanTask[]) => {
    for (const task of tasks) {
      const entry: HabitEntry = {
        id: generateId(),
        habitId: 'plan-task',
        date: new Date(task.date + 'T00:00:00'),
        scheduledTime: task.time,
        completed: false,
        notes: task.title + (task.notes ? ` — ${task.notes}` : ''),
      };
      await handleEntryUpdate(entry);
    }
  };

  const handleViewChange = async (newView: ViewType) => {
    setView(newView);
    const dateToUse = newView === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) : currentDate;

    if (newView === 'daily') {
      let dayEntries = await getEntriesByDate(dateToUse);

      // Auto-create entries for habits that should run on this day
      const dayStart = new Date(dateToUse);
      dayStart.setHours(0, 0, 0, 0);
      for (const habit of habits) {
        if (shouldHabitRunToday(habit, dateToUse)) {
          const hasEntry = dayEntries.some((e) => e.habitId === habit.id);
          if (!hasEntry) {
            const newEntry: HabitEntry = {
              id: generateId(),
              habitId: habit.id,
              date: dayStart,
              scheduledTime: '09:00',
              completed: false,
            };
            await addOrUpdateEntry(newEntry);
            dayEntries = [...dayEntries, newEntry];
          }
        }
      }

      setEntries(dayEntries);
    } else if (newView === 'week') {
      const weekStart = getWeekStart(dateToUse);
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      let weekEntries = await getEntriesByDateRange(prevWeekStart, weekEnd);

      // Auto-create entries for today in week view
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today >= prevWeekStart && today <= weekEnd) {
        for (const habit of habits) {
          if (shouldHabitRunToday(habit, today)) {
            const hasEntry = weekEntries.some((e) => e.habitId === habit.id && new Date(e.date).toDateString() === today.toDateString());
            if (!hasEntry) {
              const newEntry: HabitEntry = { id: generateId(), habitId: habit.id, date: today, scheduledTime: '09:00', completed: false };
              await addOrUpdateEntry(newEntry);
              weekEntries = [...weekEntries, newEntry];
            }
          }
        }
      }

      setEntries(weekEntries);
    } else if (newView === 'month') {
      const monthStart = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), 1);
      const monthEnd = new Date(dateToUse.getFullYear(), dateToUse.getMonth() + 1, 0);
      let monthEntries = await getEntriesByDateRange(monthStart, monthEnd);

      // Auto-create entries for today in month view
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today >= monthStart && today <= monthEnd) {
        for (const habit of habits) {
          if (shouldHabitRunToday(habit, today)) {
            const hasEntry = monthEntries.some((e) => e.habitId === habit.id && new Date(e.date).toDateString() === today.toDateString());
            if (!hasEntry) {
              const newEntry: HabitEntry = { id: generateId(), habitId: habit.id, date: today, scheduledTime: '09:00', completed: false };
              await addOrUpdateEntry(newEntry);
              monthEntries = [...monthEntries, newEntry];
            }
          }
        }
      }

      setEntries(monthEntries);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    setIsDraggingResize(true);
    const startX = e.clientX;
    const startWidth = notesPanelWidth;
    let currentWidth = startWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      currentWidth = Math.max(250, startWidth - deltaX);
      setNotesPanelWidth(currentWidth);
    };

    const handleMouseUp = () => {
      setIsDraggingResize(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      try { localStorage.setItem('notesPanelWidth', currentWidth.toString()); } catch { /* restricted */ }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Toggle habit completion for mobile view
  const handleMobileToggle = (habit: Habit) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingEntry = entries.find(
      (e) => e.habitId === habit.id && new Date(e.date).toDateString() === today.toDateString()
    );

    if (existingEntry) {
      handleEntryUpdate({ ...existingEntry, completed: !existingEntry.completed });
    } else {
      const newEntry: HabitEntry = {
        id: generateId(),
        habitId: habit.id,
        date: today,
        scheduledTime: '09:00',
        completed: true,
      };
      handleEntryUpdate(newEntry);
    }
  };

  // Get today's habits for mobile view
  const todaysHabits = habits.filter((h) => shouldHabitRunToday(h, new Date()));

  const handleLogout = () => {
    logout();
    setUser(null);
    setHabits([]);
    setEntries([]);
    setNotes([]);
    setIdeas([]);
  };

  if (authChecking) {
    return <div className="App loading">Loading...</div>;
  }

  if (!user) {
    return <AuthScreen onAuth={(u) => setUser(u)} />;
  }

  if (loading) {
    return <div className="App loading">Loading...</div>;
  }

  return (
    <div className="App">
      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="desktop-only">
        {/* Top Menu Bar */}
        <header className="top-menu-bar">
          <div className="menu-left">
            <h1 className="menu-logo">Personal Systems</h1>
            <div className="menu-view-toggle">
              <button className={`menu-view-btn ${view === 'daily' ? 'active' : ''}`} onClick={() => handleViewChange('daily')}>Day</button>
              <button className={`menu-view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => handleViewChange('week')}>Week</button>
              <button className={`menu-view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => handleViewChange('month')}>Month</button>
            </div>
          </div>
          <div className="menu-center">
            {view === 'daily' && (
              <div className="menu-date-nav">
                <button className="menu-nav-btn" onClick={() => handleDateChange(new Date(currentDate.getTime() - 86400000))}>‹</button>
                <button className="menu-date-today" onClick={() => handleDateChange(new Date())}>{currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</button>
                <button className="menu-nav-btn" onClick={() => handleDateChange(new Date(currentDate.getTime() + 86400000))}>›</button>
              </div>
            )}
          </div>
          <div className="menu-right">
            <button className="menu-btn" onClick={() => { setEditingHabit(null); setShowForm(true); }} title="Add habit">+ Habit</button>
            <button className={`menu-btn ${showNotesPanel ? 'active' : ''}`} onClick={() => setShowNotesPanel(!showNotesPanel)} title="Toggle notes panel">📝 Notes</button>
            <div className="menu-user">
              <span className="menu-user-email">{user.email}</span>
              <button className="menu-logout-btn" onClick={handleLogout}>Log out</button>
            </div>
          </div>
        </header>

        {/* Desktop Main Content */}
        <div className="desktop-main">
          {/* Today's Habits Sidebar (compact) */}
          <aside className="habits-sidebar">
            <div className="habits-sidebar-header">
              <h3>Habits ({habits.length})</h3>
            </div>
            <div className="habits-sidebar-list">
              {habits.map((habit) => {
                const runsToday = shouldHabitRunToday(habit, currentDate);
                const entry = entries.find(
                  (e) => e.habitId === habit.id && new Date(e.date).toDateString() === currentDate.toDateString()
                );
                const isCompleted = entry?.completed ?? false;

                return (
                  <div key={habit.id} className={`habit-sidebar-item ${isCompleted ? 'completed' : ''}`}>
                    {runsToday && (
                      <button
                        className={`habit-sidebar-check ${isCompleted ? 'checked' : ''}`}
                        style={{ borderColor: habit.color, backgroundColor: isCompleted ? habit.color : 'transparent' }}
                        onClick={() => {
                          if (entry) {
                            handleEntryUpdate({
                              ...entry,
                              completed: !entry.completed,
                              completedAt: !entry.completed ? new Date() : undefined,
                            });
                          } else {
                            // Fix #1: create entry if missing
                            const newEntry: HabitEntry = {
                              id: generateId(),
                              habitId: habit.id,
                              date: currentDate.getHours() === 0 ? currentDate : (() => { const d = new Date(currentDate); d.setHours(0,0,0,0); return d; })(),
                              scheduledTime: '09:00',
                              completed: true,
                              completedAt: new Date(),
                            };
                            handleEntryUpdate(newEntry);
                          }
                        }}
                      >
                        {isCompleted && '✓'}
                      </button>
                    )}
                    {!runsToday && <div className="habit-sidebar-dot" style={{ backgroundColor: habit.color }} />}
                    <span className="habit-sidebar-name">{habit.name}</span>
                    <div className="habit-sidebar-actions">
                      <button className="habit-action-btn" onClick={() => handleEditHabit(habit)} title="Edit habit">✎</button>
                      <button className="habit-action-btn delete" onClick={() => handleDeleteHabit(habit.id)} title="Delete habit">✕</button>
                    </div>
                  </div>
                );
              })}
              {habits.length === 0 && <p className="no-habits-msg">No habits yet</p>}
            </div>
          </aside>

          {/* Calendar Area */}
          <div className="calendar-container">
            {view === 'daily' && (
              <DailyView
                date={currentDate}
                habits={habits}
                entries={entries}
                onEntryUpdate={handleEntryUpdate}
                onEntryDelete={handleEntryDelete}
                onDeleteHabit={handleDeleteHabit}
                onDateChange={handleDateChange}
              />
            )}
            {view === 'week' && (
              <WeekView
                startDate={getWeekStart(currentDate)}
                habits={habits}
                entries={entries}
                onDateSelect={handleDateChange}
                onEntryUpdate={handleEntryUpdate}
              />
            )}
            {view === 'month' && (
              <MonthView
                year={currentDate.getFullYear()}
                month={currentDate.getMonth()}
                habits={habits}
                entries={entries}
                onDateSelect={handleDateChange}
                onEntryUpdate={handleEntryUpdate}
              />
            )}
          </div>

          {/* Resizable Notes Panel */}
          {showNotesPanel && (
            <>
              <div
                className={`resize-handle ${isDraggingResize ? 'dragging' : ''}`}
                onMouseDown={handleResizeStart}
                title="Drag to resize"
              />
              <div className="notes-panel" style={{ width: `${notesPanelWidth}px` }}>
                <NotesView
                  notes={notes}
                  ideas={ideas}
                  habits={habits}
                  entries={entries}
                  onAddNote={handleAddNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
                  onAddIdea={handleAddIdea}
                  onUpdateIdea={handleUpdateIdea}
                  onDeleteIdea={handleDeleteIdea}
                  onAddCalendarTasks={handleAddCalendarTasks}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="mobile-only">
        {/* Top Bar: Logo + Notes Button */}
        <div className="mobile-top-bar">
          <div className="mobile-logo">Personal Systems</div>
          <div className="mobile-top-actions">
            <button className="mobile-logout-btn" onClick={handleLogout}>
              ↪
            </button>
          </div>
        </div>

        {/* Calendar / View Area */}
        <div className="mobile-calendar">
          {view === 'daily' && (
            <DailyView
              date={currentDate}
              habits={habits}
              entries={entries}
              onEntryUpdate={handleEntryUpdate}
              onEntryDelete={handleEntryDelete}
              onDeleteHabit={handleDeleteHabit}
            />
          )}
          {view === 'week' && (
            <WeekView
              startDate={getWeekStart(currentDate)}
              habits={habits}
              entries={entries}
              onDateSelect={handleDateChange}
              onEntryUpdate={handleEntryUpdate}
            />
          )}
          {view === 'month' && (
            <MonthView
              year={currentDate.getFullYear()}
              month={currentDate.getMonth()}
              habits={habits}
              entries={entries}
              onDateSelect={handleDateChange}
              onEntryUpdate={handleEntryUpdate}
            />
          )}
        </div>

        {/* Habit List with Checkboxes - only in daily view */}
        {view === 'daily' && (
        <div className="mobile-habit-list">
          <h3 className="mobile-habit-list-title">Today's Habits</h3>
          {todaysHabits.length === 0 && (
            <p className="mobile-no-habits">No habits scheduled for today</p>
          )}
          {todaysHabits.map((habit) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const entry = entries.find(
              (e) => e.habitId === habit.id && new Date(e.date).toDateString() === today.toDateString()
            );
            const isCompleted = entry?.completed ?? false;

            return (
              <div key={habit.id} className="mobile-habit-swipe-container">
                <div className="mobile-habit-delete-bg">
                  <button
                    className="mobile-habit-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHabit(habit.id);
                    }}
                  >
                    🗑 Delete
                  </button>
                </div>
                <div
                  className="mobile-habit-item"
                  data-habit-id={habit.id}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    const el = e.currentTarget;
                    el.dataset.startX = String(touch.clientX);
                    el.dataset.currentX = '0';
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const el = e.currentTarget;
                    const startX = parseFloat(el.dataset.startX || '0');
                    const diff = touch.clientX - startX;
                    const clampedDiff = Math.max(-100, Math.min(0, diff));
                    el.style.transform = `translateX(${clampedDiff}px)`;
                    el.dataset.currentX = String(clampedDiff);
                  }}
                  onTouchEnd={(e) => {
                    const el = e.currentTarget;
                    const currentX = parseFloat(el.dataset.currentX || '0');
                    if (currentX < -50) {
                      el.style.transform = 'translateX(-100px)';
                      el.dataset.swiped = 'true';
                    } else {
                      el.style.transform = 'translateX(0)';
                      el.dataset.swiped = 'false';
                    }
                  }}
                  onClick={(e) => {
                    const el = e.currentTarget;
                    if (el.dataset.swiped === 'true') {
                      el.dataset.swiped = 'false';
                      return;
                    }
                    handleMobileToggle(habit);
                  }}
                >
                  <div className="mobile-habit-check">
                    <div
                      className={`mobile-checkbox ${isCompleted ? 'is-completed' : ''}`}
                      style={{
                        borderColor: isCompleted ? habit.color : '#ddd',
                        backgroundColor: isCompleted ? habit.color : 'white',
                      }}
                    >
                      <span className="checkmark">✓</span>
                    </div>
                  </div>
                  <div className="mobile-habit-info">
                    <span className="mobile-habit-name" style={{ color: isCompleted ? '#999' : '#333' }}>
                      {habit.name}
                    </span>
                  </div>
                  <div
                    className="mobile-habit-color-dot"
                    style={{ backgroundColor: habit.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Add Habit Button */}
        <button className="mobile-fab" onClick={() => setShowForm(true)}>
          +
        </button>

        {/* Bottom Tab Bar: Day / Week / Month */}
        <div className="mobile-bottom-bar">
          <button
            className={`mobile-tab ${view === 'daily' ? 'active' : ''}`}
            onClick={() => handleViewChange('daily')}
          >
            <span className="mobile-tab-icon">📅</span>
            Day
          </button>
          <button
            className={`mobile-tab ${view === 'week' ? 'active' : ''}`}
            onClick={() => handleViewChange('week')}
          >
            <span className="mobile-tab-icon">📆</span>
            Week
          </button>
          <button
            className={`mobile-tab ${view === 'month' ? 'active' : ''}`}
            onClick={() => handleViewChange('month')}
          >
            <span className="mobile-tab-icon">🗓</span>
            Month
          </button>
          <button
            className={`mobile-tab ${showNotes ? 'active' : ''}`}
            onClick={() => setShowNotes(true)}
          >
            <span className="mobile-tab-icon">📝</span>
            Notes
          </button>
        </div>

        {/* Notes Modal (slides in when tapped) */}
        {showNotes && (
          <div className="mobile-notes-modal" onClick={() => setShowNotes(false)}>
            <div className="mobile-notes-content" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-notes-header">
                <h2>Notes & Ideas</h2>
                <button className="mobile-notes-close" onClick={() => setShowNotes(false)}>✕</button>
              </div>
              <NotesView
                notes={notes}
                ideas={ideas}
                habits={habits}
                entries={entries}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onAddIdea={handleAddIdea}
                onUpdateIdea={handleUpdateIdea}
                onDeleteIdea={handleDeleteIdea}
                onAddCalendarTasks={handleAddCalendarTasks}
              />
            </div>
          </div>
        )}
      </div>

      {/* Shared: Habit Form Modal */}
      {showForm && (
        <HabitForm
          onSubmit={handleAddHabit}
          onCancel={() => { setShowForm(false); setEditingHabit(null); }}
          editingHabit={editingHabit || undefined}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Habit</h3>
            <p>Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This will also remove all tracking history for this habit.</p>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="confirm-delete" onClick={confirmDeleteHabit}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
