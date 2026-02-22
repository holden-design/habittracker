export interface Habit {
  id: string;
  name: string;
  color: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom';
  customDays?: number[]; // 0-6 for Sunday-Saturday
  targetDurationMinutes?: number;
  createdAt: Date;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: Date; // Start of day
  scheduledTime: string; // HH:MM format
  actualTime?: string; // HH:MM format when moved
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export interface DayView {
  date: Date;
  entries: HabitEntry[];
}

export interface WeekView {
  weekStart: Date;
  days: DayView[];
}

export interface MonthView {
  month: number;
  year: number;
  days: DayView[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
}

// AI Plan Analysis
export interface PlanTask {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  notes?: string;
}

export interface AIPlanResult {
  tasks: PlanTask[];
  summary: string;
}

export interface AIHabitNudge {
  habitName: string;
  habitId: string;
  suggestedTime: string;
  message: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'paid';
  authProvider: 'email' | 'google' | 'facebook';
  marketingConsent: boolean;
  createdAt: Date;
}
