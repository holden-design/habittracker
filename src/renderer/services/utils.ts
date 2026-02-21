import { Habit, HabitEntry } from '../types';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getRandomColor = (): string => {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
};

export const shouldHabitRunToday = (habit: Habit, date: Date): boolean => {
  const dayOfWeek = date.getDay();

  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'custom':
      return habit.customDays?.includes(dayOfWeek) ?? false;
    default:
      return false;
  }
};

export const formatTime = (time: string): string => {
  // Assumes HH:MM format
  return time;
};

export const parseTime = (timeString: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
};

export const getStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getEndOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

export const getWeekStart = (date: Date): Date => {
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = newDate.getDate() - day;
  newDate.setDate(diff);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const getMonthDays = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const calculateStreak = (entries: HabitEntry[], habit: Habit): number => {
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  while (true) {
    if (!shouldHabitRunToday(habit, currentDate)) {
      currentDate.setDate(currentDate.getDate() - 1);
      continue;
    }

    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const entryForDay = entries.find((e) => {
      const entryDate = new Date(e.date);
      return entryDate >= dayStart && entryDate <= dayEnd && e.completed;
    });

    if (!entryForDay) {
      break;
    }

    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
};

export const getMissedHabits = (habits: Habit[], entries: HabitEntry[], now: Date = new Date()): Array<{habit: Habit, missedTime: string}> => {
  const missedHabits: Array<{habit: Habit, missedTime: string}> = [];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  habits.forEach(habit => {
    // Check if this habit should run today
    if (!shouldHabitRunToday(habit, now)) return;

    // Check entries for today
    const todayEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.toDateString() === now.toDateString() && entry.habitId === habit.id;
    });

    // If habit is completed, it's not missed
    if (todayEntries.some(e => e.completed)) return;

    // Check if any scheduled time has passed
    todayEntries.forEach(entry => {
      const [scheduledHour, scheduledMinute] = entry.scheduledTime.split(':').map(Number);
      
      // If scheduled time has passed (considering current time is after scheduled time)
      if (currentHour > scheduledHour || (currentHour === scheduledHour && currentMinute > scheduledMinute)) {
        missedHabits.push({
          habit,
          missedTime: entry.scheduledTime
        });
      }
    });
  });

  return missedHabits;
};
