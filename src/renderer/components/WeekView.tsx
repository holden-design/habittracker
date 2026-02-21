import React from 'react';
import { Habit, HabitEntry } from '../types';
import { generateId } from '../services/utils';
import './WeekView.css';

interface WeekViewProps {
  startDate: Date;
  habits: Habit[];
  entries: HabitEntry[];
  onDateSelect: (date: Date) => void;
  onEntryUpdate: (entry: HabitEntry) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({ startDate, habits, entries, onDateSelect, onEntryUpdate }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build 14 days: previous week + current week
  const prevWeekStart = new Date(startDate);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(prevWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const getEntryForHabit = (habit: Habit, date: Date): HabitEntry | undefined => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return entries.find((e) => {
      const entryDate = new Date(e.date);
      return (
        e.habitId === habit.id &&
        entryDate >= dayStart &&
        entryDate <= dayEnd
      );
    });
  };

  const isCompleted = (habit: Habit, date: Date): boolean => {
    const entry = getEntryForHabit(habit, date);
    return entry ? entry.completed : false;
  };

  const toggleCompletion = (habit: Habit, date: Date) => {
    const entry = getEntryForHabit(habit, date);
    if (entry) {
      onEntryUpdate({ ...entry, completed: !entry.completed, completedAt: !entry.completed ? new Date() : undefined });
    } else {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const newEntry: HabitEntry = {
        id: generateId(),
        habitId: habit.id,
        date: dayStart,
        scheduledTime: '09:00',
        completed: true,
        completedAt: new Date(),
      };
      onEntryUpdate(newEntry);
    }
  };

  const isToday = (date: Date): boolean => {
    return date.toDateString() === today.toDateString();
  };

  const isPrevWeek = (index: number): boolean => index < 7;

  // Header label
  const prevStart = days[0];
  const prevEnd = days[6];
  const currStart = days[7];
  const currEnd = days[13];
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="week-view">
      <div className="week-header">
        <h3>2 Week View</h3>
        <div className="week-range-labels">
          <span className="prev-week-label">← {fmt(prevStart)} – {fmt(prevEnd)}</span>
          <span className="curr-week-label">{fmt(currStart)} – {fmt(currEnd)} →</span>
        </div>
      </div>

      <div className="week-grid-wrapper">
        <div className="week-grid" style={{ gridTemplateColumns: `100px repeat(14, 1fr)` }}>
          {/* Corner cell */}
          <div className="corner-cell" />

          {/* Day headers */}
          {days.map((date, i) => (
            <div
              key={date.toISOString()}
              className={`day-header-cell ${isToday(date) ? 'today' : ''} ${isPrevWeek(i) ? 'prev-week' : ''} ${i === 7 ? 'week-divider' : ''}`}
              onClick={() => onDateSelect(date)}
            >
              <div className="day-name">
                {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </div>
              <div className="day-date">{date.getDate()}</div>
            </div>
          ))}

          {/* Habit rows */}
          {habits.map((habit) => (
            <React.Fragment key={habit.id}>
              <div className="habit-cell">
                <div className="habit-color-dot" style={{ backgroundColor: habit.color }} />
                <span className="habit-name">{habit.name}</span>
              </div>
              {days.map((date, i) => {
                const done = isCompleted(habit, date);
                return (
                  <div
                    key={`${habit.id}-${date.toISOString()}`}
                    className={`check-cell ${done ? 'done' : ''} ${isToday(date) ? 'today-col' : ''} ${isPrevWeek(i) ? 'prev-week' : ''} ${i === 7 ? 'week-divider' : ''}`}
                    onClick={() => toggleCompletion(habit, date)}
                  >
                    {done ? (
                      <div className="check-mark" style={{ backgroundColor: habit.color }}>✓</div>
                    ) : (
                      <div className="check-empty" />
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
