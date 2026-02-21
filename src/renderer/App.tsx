import React, { useEffect, useState } from 'react';
import './App.css';
import { Habit, HabitEntry, Note, Idea } from './types';
import { initDB, addHabit, getHabits, addOrUpdateEntry, getEntriesByDate, getEntriesByDateRange, deleteHabit, addOrUpdateNote, getNotes, deleteNote, addOrUpdateIdea, getIdeas, deleteIdea } from './services/db';
import { shouldHabitRunToday, generateId, getWeekStart } from './services/utils';
import { HabitForm } from './components/HabitForm';
import { DailyView } from './components/DailyView';
import { WeekView } from './components/WeekView';
import { MonthView } from './components/MonthView';
import { NotesView } from './components/NotesView';

type ViewType = 'daily' | 'week' | 'month';

function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('daily');
  const [showForm, setShowForm] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notesPanelWidth, setNotesPanelWidth] = useState(() => {
    const saved = localStorage.getItem('notesPanelWidth');
    return saved ? parseInt(saved, 10) : 400;
  });
  const [isDraggingResize, setIsDraggingResize] = useState(false);

  // Initialize DB and load data
  useEffect(() => {
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
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          loadedEntries = await getEntriesByDateRange(weekStart, weekEnd);
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
  }, []);

  const ensureEntriesExist = async (date: Date, habitsToCheck: Habit[]) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    for (const habit of habitsToCheck) {
      if (shouldHabitRunToday(habit, date)) {
        const existingEntry = entries.find(
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
    try {
      await addHabit(habit);
      setHabits((prev) => [...prev, habit]);

      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        await ensureEntriesExist(date, [habit]);
      }

      setShowForm(false);
    } catch (error) {
      console.error('Failed to add habit:', error);
    }
  };

  const handleEntryUpdate = async (entry: HabitEntry) => {
    try {
      await addOrUpdateEntry(entry);
      setEntries((prev) => {
        const exists = prev.some((e) => e.id === entry.id);
        if (exists) {
          return prev.map((e) => (e.id === entry.id ? entry : e));
        }
        return [...prev, entry];
      });
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const handleEntryDelete = async (entryId: string) => {
    try {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
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

  const handleViewChange = async (newView: ViewType) => {
    setView(newView);
    const dateToUse = newView === 'month' ? new Date(currentDate.getFullYear(), currentDate.getMonth(), 1) : currentDate;

    if (newView === 'daily') {
      const dayEntries = await getEntriesByDate(dateToUse);
      setEntries(dayEntries);
    } else if (newView === 'week') {
      const weekStart = getWeekStart(dateToUse);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEntries = await getEntriesByDateRange(weekStart, weekEnd);
      setEntries(weekEntries);
    } else if (newView === 'month') {
      const monthStart = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), 1);
      const monthEnd = new Date(dateToUse.getFullYear(), dateToUse.getMonth() + 1, 0);
      const monthEntries = await getEntriesByDateRange(monthStart, monthEnd);
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
      localStorage.setItem('notesPanelWidth', currentWidth.toString());
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

  if (loading) {
    return <div className="App loading">Loading...</div>;
  }

  return (
    <div className="App">
      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="desktop-only">
        <nav className="sidebar">
          <div className="logo">
            <h1>Personal Systems</h1>
          </div>

          <div className="view-toggle">
            <button
              className={`view-btn ${view === 'daily' ? 'active' : ''}`}
              onClick={() => handleViewChange('daily')}
            >
              Daily
            </button>
            <button
              className={`view-btn ${view === 'week' ? 'active' : ''}`}
              onClick={() => handleViewChange('week')}
            >
              Week
            </button>
            <button
              className={`view-btn ${view === 'month' ? 'active' : ''}`}
              onClick={() => handleViewChange('month')}
            >
              Month
            </button>
          </div>

          <div className="actions">
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Add Habit
            </button>
          </div>

          <div className="habits-summary">
            <h3>Your Habits ({habits.length})</h3>
            <div className="habits-list-mini">
              {habits.map((habit) => (
                <div key={habit.id} className="habit-mini">
                  <div className="habit-color" style={{ backgroundColor: habit.color }} />
                  <span>{habit.name}</span>
                </div>
              ))}
            </div>
          </div>
        </nav>

        <main className="main-layout">
          <div className="calendar-container">
            {view === 'daily' && (
              <DailyView
                date={currentDate}
                habits={habits}
                entries={entries}
                onEntryUpdate={handleEntryUpdate}
                onEntryDelete={handleEntryDelete}
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
              />
            )}
          </div>

          <div
            className={`resize-handle ${isDraggingResize ? 'dragging' : ''}`}
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          />

          <div className="notes-panel" style={{ width: `${notesPanelWidth}px` }}>
            <NotesView
              notes={notes}
              ideas={ideas}
              onAddNote={handleAddNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onAddIdea={handleAddIdea}
              onUpdateIdea={handleUpdateIdea}
              onDeleteIdea={handleDeleteIdea}
            />
          </div>
        </main>
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="mobile-only">
        {/* Top Bar: Logo + Notes Button */}
        <div className="mobile-top-bar">
          <div className="mobile-logo">Personal Systems</div>
          <button className="mobile-notes-btn" onClick={() => setShowNotes(true)}>
            📝 Notes
          </button>
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
            />
          )}
        </div>

        {/* Habit List with Checkboxes */}
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
              <div
                key={habit.id}
                className={`mobile-habit-item ${isCompleted ? 'completed' : ''}`}
                onClick={() => handleMobileToggle(habit)}
              >
                <div className="mobile-habit-check">
                  <div
                    className="mobile-checkbox"
                    style={{
                      borderColor: habit.color,
                      backgroundColor: isCompleted ? habit.color : 'transparent',
                    }}
                  >
                    {isCompleted && <span className="checkmark">✓</span>}
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
            );
          })}
        </div>

        {/* Add Habit Button */}
        <button className="mobile-add-habit" onClick={() => setShowForm(true)}>
          + Add Habit
        </button>

        {/* Bottom Tab Bar: Day / Week / Month */}
        <div className="mobile-bottom-bar">
          <button
            className={`mobile-tab ${view === 'daily' ? 'active' : ''}`}
            onClick={() => handleViewChange('daily')}
          >
            Day
          </button>
          <button
            className={`mobile-tab ${view === 'week' ? 'active' : ''}`}
            onClick={() => handleViewChange('week')}
          >
            Week
          </button>
          <button
            className={`mobile-tab ${view === 'month' ? 'active' : ''}`}
            onClick={() => handleViewChange('month')}
          >
            Month
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
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onAddIdea={handleAddIdea}
                onUpdateIdea={handleUpdateIdea}
                onDeleteIdea={handleDeleteIdea}
              />
            </div>
          </div>
        )}
      </div>

      {/* Shared: Habit Form Modal */}
      {showForm && <HabitForm onSubmit={handleAddHabit} onCancel={() => setShowForm(false)} />}
    </div>
  );
}

export default App;
