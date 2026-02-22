import { Habit, HabitEntry, Note, Idea, User } from '../types';

// API URL - uses localhost for development, or window.location.origin for production
const API_URL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000';

// ===== AUTH TOKEN MANAGEMENT =====
const AUTH_TOKEN_KEY = 'ps_auth_token';
const AUTH_USER_KEY = 'ps_auth_user';

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  backendAvailable = null;
}

function getAuthHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

// ===== AUTH API =====
export async function signup(email: string, password: string, name: string, marketingConsent: boolean = false): Promise<{ token: string; user: User }> {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, marketingConsent }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }
  const data = await response.json();
  setAuthToken(data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  backendAvailable = true;
  return data;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  const data = await response.json();
  setAuthToken(data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  backendAvailable = true;
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      clearAuth();
      return null;
    }
    const user = await response.json();
    backendAvailable = true;
    return user;
  } catch {
    return null;
  }
}

export function logout(): void {
  clearAuth();
}

export async function loginWithGoogle(credential: string, marketingConsent: boolean = false): Promise<{ token: string; user: User }> {
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, marketingConsent }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Google login failed');
  }
  const data = await response.json();
  setAuthToken(data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  backendAvailable = true;
  return data;
}

export async function loginWithFacebook(accessToken: string, marketingConsent: boolean = false): Promise<{ token: string; user: User }> {
  const response = await fetch(`${API_URL}/api/auth/facebook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, marketingConsent }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Facebook login failed');
  }
  const data = await response.json();
  setAuthToken(data.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  backendAvailable = true;
  return data;
}

// Map snake_case DB columns to camelCase TypeScript properties
function mapEntry(e: any): HabitEntry {
  return {
    id: e.id,
    habitId: e.habit_id || e.habitId,
    date: new Date(e.date),
    scheduledTime: e.scheduled_time || e.scheduledTime,
    actualTime: e.actual_time || e.actualTime,
    completed: e.completed,
    completedAt: e.completed_at ? new Date(e.completed_at) : (e.completedAt ? new Date(e.completedAt) : undefined),
    notes: e.notes,
  };
}

function mapHabit(h: any): Habit {
  return {
    id: h.id,
    name: h.name,
    color: h.color,
    frequency: h.frequency,
    customDays: h.custom_days || h.customDays,
    targetDurationMinutes: h.target_duration_minutes ?? h.targetDurationMinutes,
    createdAt: new Date(h.created_at || h.createdAt),
  };
}

function mapNote(n: any): Note {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    createdAt: new Date(n.created_at || n.createdAt),
    updatedAt: new Date(n.updated_at || n.updatedAt),
    pinned: n.pinned,
  };
}

function mapIdea(i: any): Idea {
  return {
    id: i.id,
    title: i.title,
    description: i.description,
    category: i.category,
    createdAt: new Date(i.created_at || i.createdAt),
    updatedAt: new Date(i.updated_at || i.updatedAt),
    pinned: i.pinned,
  };
}

// ===== LOCAL STORAGE HELPERS =====
const STORAGE_KEYS = {
  habits: 'ps_habits',
  entries: 'ps_entries',
  notes: 'ps_notes',
  ideas: 'ps_ideas',
};

function getLocal<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocal<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Check if backend is available
let backendAvailable: boolean | null = null;

async function isBackendUp(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    backendAvailable = res.ok;
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

// ===== INIT =====
export const initDB = async (): Promise<void> => {
  await isBackendUp();
};

// ===== HABITS =====
export const addHabit = async (habit: Habit): Promise<void> => {
  if (await isBackendUp()) {
    const response = await fetch(`${API_URL}/api/habits`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(habit),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add habit');
    }
  } else {
    const habits = getLocal<Habit>(STORAGE_KEYS.habits);
    habits.push(habit);
    setLocal(STORAGE_KEYS.habits, habits);
  }
};

export const getHabits = async (): Promise<Habit[]> => {
  if (await isBackendUp()) {
    try {
      const response = await fetch(`${API_URL}/api/habits`, {
        headers: getAuthHeaders(false),
      });
      if (!response.ok) throw new Error('Failed to fetch habits');
      const data = await response.json();
      return data.map((h: any) => mapHabit(h));
    } catch (error) {
      console.error('Error fetching habits:', error);
      return getLocal<Habit>(STORAGE_KEYS.habits);
    }
  }
  return getLocal<Habit>(STORAGE_KEYS.habits);
};

export const deleteHabit = async (habitId: string): Promise<void> => {
  if (await isBackendUp()) {
    const response = await fetch(`${API_URL}/api/habits/${habitId}`, { method: 'DELETE', headers: getAuthHeaders(false) });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete habit');
    }
  } else {
    const habits = getLocal<Habit>(STORAGE_KEYS.habits).filter((h) => h.id !== habitId);
    setLocal(STORAGE_KEYS.habits, habits);
    // Also clean up entries for this habit
    const entries = getLocal<HabitEntry>(STORAGE_KEYS.entries).filter((e) => e.habitId !== habitId);
    setLocal(STORAGE_KEYS.entries, entries);
  }
};

// ===== ENTRIES =====
export const addOrUpdateEntry = async (entry: HabitEntry): Promise<void> => {
  if (await isBackendUp()) {
    const response = await fetch(`${API_URL}/api/entries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(entry),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save entry');
    }
  } else {
    const entries = getLocal<HabitEntry>(STORAGE_KEYS.entries);
    const idx = entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      entries[idx] = entry;
    } else {
      entries.push(entry);
    }
    setLocal(STORAGE_KEYS.entries, entries);
  }
};

export const deleteEntry = async (entryId: string): Promise<void> => {
  if (await isBackendUp()) {
    const response = await fetch(`${API_URL}/api/entries/${entryId}`, { method: 'DELETE', headers: getAuthHeaders(false) });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete entry');
    }
  } else {
    const entries = getLocal<HabitEntry>(STORAGE_KEYS.entries).filter((e) => e.id !== entryId);
    setLocal(STORAGE_KEYS.entries, entries);
  }
};

const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getEntriesByDate = async (date: Date): Promise<HabitEntry[]> => {
  if (await isBackendUp()) {
    try {
      const dateStr = formatDateForAPI(date);
      const response = await fetch(`${API_URL}/api/entries/date/${dateStr}`, {
        headers: getAuthHeaders(false),
      });
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      return data.map((e: any) => mapEntry(e));
    } catch (error) {
      console.error('Error fetching entries:', error);
      return [];
    }
  }
  const dateStr = new Date(date).toDateString();
  return getLocal<HabitEntry>(STORAGE_KEYS.entries)
    .filter((e) => new Date(e.date).toDateString() === dateStr)
    .map((e) => mapEntry(e));
};

export const getEntriesByDateRange = async (startDate: Date, endDate: Date): Promise<HabitEntry[]> => {
  if (await isBackendUp()) {
    try {
      const startStr = formatDateForAPI(startDate);
      const endStr = formatDateForAPI(endDate);
      const response = await fetch(`${API_URL}/api/entries/range/${startStr}/${endStr}`, {
        headers: getAuthHeaders(false),
      });
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      return data.map((e: any) => mapEntry(e));
    } catch (error) {
      console.error('Error fetching entries:', error);
      return [];
    }
  }
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return getLocal<HabitEntry>(STORAGE_KEYS.entries)
    .filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= start && t <= end;
    })
    .map((e) => mapEntry(e));
};

export const getEntriesByHabitAndDate = async (habitId: string, date: Date): Promise<HabitEntry[]> => {
  const entries = await getEntriesByDate(date);
  return entries.filter((e) => e.habitId === habitId);
};

// ===== NOTES =====
export const addOrUpdateNote = async (note: Note): Promise<void> => {
  if (await isBackendUp()) {
    const response = await fetch(`${API_URL}/api/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(note),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save note');
    }
  } else {
    const notes = getLocal<Note>(STORAGE_KEYS.notes);
    const idx = notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      notes[idx] = note;
    } else {
      notes.push(note);
    }
    setLocal(STORAGE_KEYS.notes, notes);
  }
};

export const getNotes = async (): Promise<Note[]> => {
  if (await isBackendUp()) {
    try {
      const response = await fetch(`${API_URL}/api/notes`, {
        headers: getAuthHeaders(false),
      });
      if (!response.ok) throw new Error('Failed to fetch notes');
      const data = await response.json();
      const notes = data.map((n: any) => mapNote(n));
      return notes.sort((a: Note, b: Note) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
  }
  return getLocal<Note>(STORAGE_KEYS.notes)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const deleteNote = async (noteId: string): Promise<void> => {
  if (await isBackendUp()) {
    const response = await fetch(`${API_URL}/api/notes/${noteId}`, { method: 'DELETE', headers: getAuthHeaders(false) });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete note');
    }
  } else {
    const notes = getLocal<Note>(STORAGE_KEYS.notes).filter((n) => n.id !== noteId);
    setLocal(STORAGE_KEYS.notes, notes);
  }
};

// ===== IDEAS =====
export const addOrUpdateIdea = async (idea: Idea): Promise<void> => {
  if (await isBackendUp()) {
    const response = await fetch(`${API_URL}/api/ideas`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(idea),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save idea');
    }
  } else {
    const ideas = getLocal<Idea>(STORAGE_KEYS.ideas);
    const idx = ideas.findIndex((i) => i.id === idea.id);
    if (idx >= 0) {
      ideas[idx] = idea;
    } else {
      ideas.push(idea);
    }
    setLocal(STORAGE_KEYS.ideas, ideas);
  }
};

export const getIdeas = async (): Promise<Idea[]> => {
  if (await isBackendUp()) {
    try {
      const response = await fetch(`${API_URL}/api/ideas`, {
        headers: getAuthHeaders(false),
      });
      if (!response.ok) throw new Error('Failed to fetch ideas');
      const data = await response.json();
      const ideas = data.map((i: any) => mapIdea(i));
      return ideas.sort((a: Idea, b: Idea) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Error fetching ideas:', error);
      return [];
    }
  }
  return getLocal<Idea>(STORAGE_KEYS.ideas)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const deleteIdea = async (ideaId: string): Promise<void> => {
  if (await isBackendUp()) {
    const response = await fetch(`${API_URL}/api/ideas/${ideaId}`, { method: 'DELETE', headers: getAuthHeaders(false) });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete idea');
    }
  } else {
    const ideas = getLocal<Idea>(STORAGE_KEYS.ideas).filter((i) => i.id !== ideaId);
    setLocal(STORAGE_KEYS.ideas, ideas);
  }
};
