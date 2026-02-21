import React from 'react';
import { Habit, HabitEntry } from '../types';
import { getMonthDays, calculateStreak } from '../services/utils';
import './MonthView.css';

interface MonthViewProps {
  year: number;
  month: number;
  habits: Habit[];
  entries: HabitEntry[];
  onDateSelect: (date: Date) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  year,
  month,
  habits,
  entries,
  onDateSelect,
}) => {
  const days = getMonthDays(year, month);
  const firstDay = days[0].getDay();
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const getCompletionCount = (date: Date): number => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return entries.filter((e) => {
      const entryDate = new Date(e.date);
      return e.completed && entryDate >= dayStart && entryDate <= dayEnd;
    }).length;
  };

  const monthName = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="month-view">
      <div className="month-header">
        <h3>{monthName}</h3>
      </div>

      <div className="month-grid">
        {dayLabels.map((label) => (
          <div key={label} className="day-label">
            {label}
          </div>
        ))}

        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="month-day empty" />
        ))}

        {days.map((date) => {
          const completionCount = getCompletionCount(date);
          const totalHabits = habits.length;
          const completionPercent = totalHabits > 0 ? (completionCount / totalHabits) * 100 : 0;

          return (
            <div
              key={date.toISOString()}
              className="month-day"
              onClick={() => onDateSelect(date)}
              style={{
                backgroundColor: completionCount > 0
                  ? `rgba(78, 205, 196, ${0.2 + (completionPercent / 100) * 0.8})`
                  : 'white',
              }}
            >
              <div className="day-number">{date.getDate()}</div>
              {completionCount > 0 && (
                <div className="day-completion">{completionCount}/{totalHabits}</div>
              )}
            </div>
          );
        })}
      </div>

      {habits.length > 0 && (
        <div className="month-legend">
          <h4>Habit Streaks</h4>
          <div className="streaks-grid">
            {habits.map((habit) => (
              <div key={habit.id} className="streak-item">
                <div
                  className="streak-color"
                  style={{ backgroundColor: habit.color }}
                />
                <div>
                  <div className="streak-name">{habit.name}</div>
                  <div className="streak-value">
                    🔥 {calculateStreak(entries.filter((e) => e.habitId === habit.id), habit)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
