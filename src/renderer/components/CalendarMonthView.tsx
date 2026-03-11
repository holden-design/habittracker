import React from 'react';
import { Habit, HabitEntry } from '../types';
import './CalendarMonthView.css';

interface CalendarMonthViewProps {
  currentDate: Date;
  entries: HabitEntry[];
  habits: Habit[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentDate,
  entries,
  habits,
  onDateSelect,
  onMonthChange,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1));

  const getEventsForDay = (date: Date) => {
    return entries.filter(e => {
      const entryDate = new Date(e.date);
      if (entryDate.toDateString() !== date.toDateString()) return false;
      const isHabitEntry = habits.some(h => h.id === e.habitId);
      return !isHabitEntry;
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="cal-month-view">
      <div className="cal-month-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-nav-title">
          {firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        {(month !== new Date().getMonth() || year !== new Date().getFullYear()) && (
          <button className="cal-today-btn" onClick={() => onMonthChange(new Date())}>Today</button>
        )}
      </div>
      <div className="cal-month-grid">
        {dayNames.map(n => (
          <div key={n} className="cal-month-header-cell">{n}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="cal-month-cell empty" />;
          const isToday = date.toDateString() === today.toDateString();
          const events = getEventsForDay(date);
          return (
            <div
              key={date.toISOString()}
              className={`cal-month-cell ${isToday ? 'is-today' : ''} ${events.length > 0 ? 'has-events' : ''}`}
              onClick={() => onDateSelect(date)}
            >
              <span className={`cal-month-day-num ${isToday ? 'is-today' : ''}`}>{date.getDate()}</span>
              {events.length > 0 && (
                <div className="cal-month-dots">
                  {events.slice(0, 3).map(e => {
                    const color = e.habitId.startsWith('meeting-') ? '#e17055'
                      : e.habitId.startsWith('activity-') ? '#00b894'
                      : e.habitId.startsWith('plan-') ? '#6c5ce7'
                      : '#999';
                    return <div key={e.id} className="cal-month-dot" style={{ backgroundColor: color }} />;
                  })}
                  {events.length > 3 && <span className="cal-month-more">+{events.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
