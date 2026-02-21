import React from 'react';
import { Habit, HabitEntry } from '../types';
import { calculateStreak, generateId } from '../services/utils';
import './WeekView.css';

interface WeekViewProps {
  startDate: Date;
  habits: Habit[];
  entries: HabitEntry[];
  onDateSelect: (date: Date) => void;
  onEntryUpdate: (entry: HabitEntry) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({ startDate, habits, entries, onDateSelect, onEntryUpdate }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
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

  const getCompletionForHabit = (habit: Habit, date: Date): boolean => {
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

  const habitStreak = (habit: Habit) => {
    return calculateStreak(entries.filter((e) => e.habitId === habit.id), habit);
  };

  return (
    <div className="week-view">
      <div className="week-header">
        <h3>
          Week of {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </h3>
      </div>

      <div className="week-grid">
        <div className="week-habits-column">
          <div className="habit-header-cell">Habit</div>
          {habits.map((habit) => (
            <div key={habit.id} className="habit-cell">
              <div
                className="habit-color-dot"
                style={{ backgroundColor: habit.color }}
              />
              <div className="habit-info">
                <div className="habit-name">{habit.name}</div>
                <div className="habit-streak">🔥 {habitStreak(habit)}</div>
              </div>
            </div>
          ))}
        </div>

        {days.map((date) => (
          <div key={date.toISOString()} className="week-day-column">
            <div
              className="day-header-cell"
              onClick={() => onDateSelect(date)}
              style={{ cursor: 'pointer' }}
            >
              <div className="day-name">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="day-date">{date.getDate()}</div>
            </div>
            {habits.map((habit) => {
              const completed = getCompletionForHabit(habit, date);
              return (
                <div
                  key={`${habit.id}-${date.toISOString()}`}
                  className={`completion-cell ${completed ? 'completed' : ''}`}
                  onClick={() => toggleCompletion(habit, date)}
                  style={{
                    backgroundColor: completed ? habit.color : '#f5f5f5',
                    cursor: 'pointer',
                  }}
                >
                  {completed && <div className="checkmark">✓</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
