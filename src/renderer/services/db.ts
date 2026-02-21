import { Habit, HabitEntry, Note, Idea } from '../types';

// API URL - uses localhost for development, or window.location.origin for production
const API_URL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000';

export const initDB = (): Promise<void> => {
  // Backend will initialize database on first connection
  // This is a no-op in the client since we use API
  return Promise.resolve();
};


// Habits
export const addHabit = async (habit: Habit): Promise<void> => {
  const response = await fetch(`${API_URL}/api/habits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(habit),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add habit');
  }
};

export const getHabits = async (): Promise<Habit[]> => {
  try {
    const response = await fetch(`${API_URL}/api/habits`);
    if (!response.ok) {
      throw new Error('Failed to fetch habits');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching habits:', error);
    // Return empty array if offline or error
    return [];
  }
};

export const deleteHabit = async (habitId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/habits/${habitId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete habit');
  }
};


// Entries
export const addOrUpdateEntry = async (entry: HabitEntry): Promise<void> => {
  const response = await fetch(`${API_URL}/api/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save entry');
  }
};

const formatDateForAPI = (date: Date): string => {
  // Format as YYYY-MM-DD
  return date.toISOString().split('T')[0];
};

export const getEntriesByDate = async (date: Date): Promise<HabitEntry[]> => {
  try {
    const dateStr = formatDateForAPI(date);
    const response = await fetch(`${API_URL}/api/entries/date/${dateStr}`);
    if (!response.ok) {
      throw new Error('Failed to fetch entries');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
};

export const getEntriesByDateRange = async (startDate: Date, endDate: Date): Promise<HabitEntry[]> => {
  try {
    const startStr = formatDateForAPI(startDate);
    const endStr = formatDateForAPI(endDate);
    const response = await fetch(`${API_URL}/api/entries/range/${startStr}/${endStr}`);
    if (!response.ok) {
      throw new Error('Failed to fetch entries');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
};

export const getEntriesByHabitAndDate = async (habitId: string, date: Date): Promise<HabitEntry[]> => {
  const entries = await getEntriesByDate(date);
  return entries.filter((e) => e.habitId === habitId);
};


// Notes
export const addOrUpdateNote = async (note: Note): Promise<void> => {
  const response = await fetch(`${API_URL}/api/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save note');
  }
};

export const getNotes = async (): Promise<Note[]> => {
  try {
    const response = await fetch(`${API_URL}/api/notes`);
    if (!response.ok) {
      throw new Error('Failed to fetch notes');
    }
    const notes = await response.json();
    // Sort by updated date descending
    return notes.sort((a: Note, b: Note) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
};

export const deleteNote = async (noteId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/notes/${noteId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete note');
  }
};


// Ideas
export const addOrUpdateIdea = async (idea: Idea): Promise<void> => {
  const response = await fetch(`${API_URL}/api/ideas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(idea),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save idea');
  }
};

export const getIdeas = async (): Promise<Idea[]> => {
  try {
    const response = await fetch(`${API_URL}/api/ideas`);
    if (!response.ok) {
      throw new Error('Failed to fetch ideas');
    }
    const ideas = await response.json();
    // Sort by updated date descending
    return ideas.sort((a: Idea, b: Idea) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error('Error fetching ideas:', error);
    return [];
  }
};

export const deleteIdea = async (ideaId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/ideas/${ideaId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete idea');
  }
};
