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

// Error boundary for React
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('React Error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#d32f2f', background: '#ffebee' }}>
          <h2>Application Error</h2>
          <p>{this.state.error?.message}</p>
          <details>
            <summary>Stack Trace</summary>
            <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('daily');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notesPanelWidth, setNotesPanelWidth] = useState(() => {
    const saved = localStorage.getItem('notesPanelWidth');
    return saved ? parseInt(saved, 10) : 400;
  });
  const [isDraggingResize, setIsDraggingResize] = useState(false);
  const [showNotesPanelMobile, setShowNotesPanelMobile] = useState(false);

  // Log that app is starting
  useEffect(() => {
    console.log('✅ App component mounted');
  }, []);

  // Initialize DB and load data
  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        const loadedHabits = await getHabits();
        setHabits(loadedHabits);

        // Load notes and ideas
        const loadedNotes = await getNotes();
        setNotes(loadedNotes);
        const loadedIdeas = await getIdeas();
        setIdeas(loadedIdeas);

        // Load entries for current view
        if (view === 'daily') {
          const dayEntries = await getEntriesByDate(currentDate);
          setEntries(dayEntries);
        } else if (view === 'week') {
          const weekStart = getWeekStart(currentDate);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const weekEntries = await getEntriesByDateRange(weekStart, weekEnd);
          setEntries(weekEntries);
        } else if (view === 'month') {
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          const monthEntries = await getEntriesByDateRange(monthStart, monthEnd);
          setEntries(monthEntries);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Generate entries for habits on a specific date
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
            scheduledTime: '09:00', // Default time
            completed: false,
          };
          await addOrUpdateEntry(newEntry);
          setEntries((prev) => [...prev, newEntry]);
        }
      }
    }
  };

  // Handle adding a new habit
  const handleAddHabit = async (habit: Habit) => {
    try {
      await addHabit(habit);
      setHabits((prev) => [...prev, habit]);

      // Create entries for today and upcoming days
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

  // Handle updating an entry
  const handleEntryUpdate = async (entry: HabitEntry) => {
    try {
      await addOrUpdateEntry(entry);
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? entry : e))
      );
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  // Handle deleting an entry
  const handleEntryDelete = async (entryId: string) => {
    try {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  // Handle view changes
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handleAddNote = async (note: Note) => {
    try {
      console.log('App: Saving note to database:', note);
      await addOrUpdateNote(note);
      console.log('App: Note saved, updating state');
      setNotes((prev) => [note, ...prev]);
    } catch (error) {
      console.error('App: Failed to add note:', error);
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

  // Handle panel resize
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
      // Save preference to localStorage
      localStorage.setItem('notesPanelWidth', currentWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (loading) {
    return <div className="App loading">Loading...</div>;
  }

  return (
    <div className="App">
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
          {/* Mobile toggle button */}
          <button className="mobile-notes-toggle" onClick={() => setShowNotesPanelMobile(!showNotesPanelMobile)}>
            {showNotesPanelMobile ? '✕ Close' : '📝 Notes'}
          </button>

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

        <div className={`notes-panel ${showNotesPanelMobile ? 'mobile-open' : ''}`} style={{ width: `${notesPanelWidth}px` }}>
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

      {showForm && <HabitForm onSubmit={handleAddHabit} onCancel={() => setShowForm(false)} />}
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
