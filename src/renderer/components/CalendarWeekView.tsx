import React from 'react';
import { Habit, HabitEntry } from '../types';
import { getWeekStart } from '../services/utils';
import './CalendarWeekView.css';

interface CalendarWeekViewProps {
  currentDate: Date;
  entries: HabitEntry[];
  habits: Habit[];
  onDateSelect: (date: Date) => void;
  onWeekChange: (date: Date) => void;
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  currentDate,
  entries,
  habits,
  onDateSelect,
  onWeekChange,
}) => {
  const weekStart = getWeekStart(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    onWeekChange(d);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    onWeekChange(d);
  };

  const getEventsForDay = (date: Date) => {
    return entries.filter(e => {
      const entryDate = new Date(e.date);
      if (entryDate.toDateString() !== date.toDateString()) return false;
      const isHabitEntry = habits.some(h => h.id === e.habitId);
      return !isHabitEntry;
    }).sort((a, b) => (a.actualTime || a.scheduledTime).localeCompare(b.actualTime || b.scheduledTime));
  };

  const getEventColor = (event: HabitEntry) => {
    if (event.habitId.startsWith('meeting-')) return '#e17055';
    if (event.habitId.startsWith('activity-')) return '#00b894';
    if (event.habitId.startsWith('plan-')) return '#6c5ce7';
    return '#999';
  };

  const getEventLabel = (event: HabitEntry) => {
    if (event.habitId.startsWith('meeting-')) return 'Meeting';
    if (event.habitId.startsWith('activity-')) return 'Activity';
    if (event.habitId.startsWith('plan-')) return 'Task';
    return 'Event';
  };

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="cal-week-view">
      <div className="cal-week-nav">
        <button className="cal-nav-btn" onClick={prevWeek}>‹</button>
        <span className="cal-nav-title">{fmt(weekStart)} – {fmt(weekEnd)}</span>
        <button className="cal-nav-btn" onClick={nextWeek}>›</button>
        {weekStart.toDateString() !== getWeekStart(new Date()).toDateString() && (
          <button className="cal-today-btn" onClick={() => onWeekChange(new Date())}>Today</button>
        )}
      </div>
      <div className="cal-week-days">
        {days.map(day => {
          const isToday = day.toDateString() === today.toDateString();
          const events = getEventsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={`cal-week-day ${isToday ? 'is-today' : ''}`}
              onClick={() => onDateSelect(day)}
            >
              <div className="cal-week-day-header">
                <span className="cal-week-day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span className={`cal-week-day-num ${isToday ? 'is-today' : ''}`}>{day.getDate()}</span>
              </div>
              {events.length > 0 ? (
                <div className="cal-week-day-events">
                  {events.map(event => (
                    <div
                      key={event.id}
                      className={`cal-week-event ${event.completed ? 'completed' : ''}`}
                      style={{ borderLeftColor: getEventColor(event) }}
                    >
                      <span className="cal-week-event-time">{event.actualTime || event.scheduledTime}</span>
                      <span className="cal-week-event-name">{event.notes || getEventLabel(event)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cal-week-no-events">No events</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
