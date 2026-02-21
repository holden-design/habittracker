import React from 'react';
import { Habit, HabitEntry } from '../types';
import { getMonthDays } from '../services/utils';
import { generateId } from '../services/utils';
import './MonthView.css';

interface MonthViewProps {
  year: number;
  month: number;
  habits: Habit[];
  entries: HabitEntry[];
  onDateSelect: (date: Date) => void;
  onEntryUpdate: (entry: HabitEntry) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  year,
  month,
  habits,
  entries,
  onDateSelect,
  onEntryUpdate,
}) => {
  const days = getMonthDays(year, month);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const numDays = days.length;

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

  // Count completions per habit for the month
  const getHabitMonthCount = (habit: Habit): number => {
    return days.filter((d) => isCompleted(habit, d)).length;
  };

  return (
    <div className="month-view">
      <div className="month-header">
        <h3>{monthName}</h3>
      </div>

      <div className="month-grid-wrapper">
        <div
          className="month-grid"
          style={{ gridTemplateColumns: `100px repeat(${numDays}, 1fr)` }}
        >
          {/* Corner cell */}
          <div className="month-corner-cell" />

          {/* Day headers */}
          {days.map((date) => (
            <div
              key={date.toISOString()}
              className={`month-day-header ${isToday(date) ? 'today' : ''} ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`}
              onClick={() => onDateSelect(date)}
            >
              <div className="month-day-name">
                {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </div>
              <div className="month-day-num">{date.getDate()}</div>
            </div>
          ))}

          {/* Habit rows */}
          {habits.map((habit) => (
            <React.Fragment key={habit.id}>
              <div className="month-habit-cell">
                <div className="month-habit-dot" style={{ backgroundColor: habit.color }} />
                <span className="month-habit-name">{habit.name}</span>
                <span className="month-habit-count">{getHabitMonthCount(habit)}/{numDays}</span>
              </div>
              {days.map((date) => {
                const done = isCompleted(habit, date);
                return (
                  <div
                    key={`${habit.id}-${date.toISOString()}`}
                    className={`month-check-cell ${done ? 'done' : ''} ${isToday(date) ? 'today-col' : ''} ${date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : ''}`}
                    onClick={() => toggleCompletion(habit, date)}
                  >
                    {done ? (
                      <div className="month-check-mark" style={{ backgroundColor: habit.color }}>✓</div>
                    ) : (
                      <div className="month-check-empty" />
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
