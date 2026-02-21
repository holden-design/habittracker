import React, { useState, useRef } from 'react';
import { Habit, HabitEntry } from '../types';
import { shouldHabitRunToday, calculateStreak } from '../services/utils';
import { sendCompletionNotification } from '../services/notifications';
import './DailyView.css';

interface DailyViewProps {
  date: Date;
  habits: Habit[];
  entries: HabitEntry[];
  onEntryUpdate: (entry: HabitEntry) => void;
  onEntryDelete: (entryId: string) => void;
}

export const DailyView: React.FC<DailyViewProps> = ({ date, habits, entries, onEntryUpdate, onEntryDelete }) => {
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => (4 + i) % 24);
  const todayEntries = entries.filter(
    (e) => e.date.toDateString() === date.toDateString()
  );

  const habit = habits.find((h) => h.id === (draggedEntry ? todayEntries.find((e) => e.id === draggedEntry)?.habitId : ''));

  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    setDraggedEntry(entryId);
    setDragOffset({ x: e.clientX, y: e.clientY });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    if (!draggedEntry) return;

    const entry = todayEntries.find((e) => e.id === draggedEntry);
    if (entry) {
      const newTime = `${String(hour).padStart(2, '0')}:${entry.actualTime?.split(':')[1] || '00'}`;
      onEntryUpdate({ ...entry, actualTime: newTime });
    }
    setDraggedEntry(null);
  };

  const getEntryStyle = (entry: HabitEntry): React.CSSProperties => {
    const timeStr = entry.actualTime || entry.scheduledTime;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const minutesSince4am = ((hours - 4 + 24) % 24) * 60 + minutes;
    const topPercent = (minutesSince4am / (24 * 60)) * 100;

    return {
      top: `${topPercent}%`,
      position: 'absolute',
    };
  };

  const toggleComplete = (entry: HabitEntry) => {
    const isCompleting = !entry.completed;
    const habit = habits.find((h) => h.id === entry.habitId);
    
    onEntryUpdate({
      ...entry,
      completed: isCompleting,
      completedAt: isCompleting ? new Date() : undefined,
    });

    // Send notification when completing
    if (isCompleting && habit) {
      sendCompletionNotification(habit.name);
    }
  };

  const habitsTodayFiltered = habits.filter((h) => shouldHabitRunToday(h, date));

  return (
    <div className="daily-view">
      <div className="daily-header">
        <h3>{date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
      </div>

      <div className="daily-content">
        <div className="habits-list">
          <h4>Habits ({habitsTodayFiltered.length})</h4>
          {habitsTodayFiltered.map((habit) => {
            const streak = calculateStreak(entries.filter((e) => e.habitId === habit.id), habit);
            const entry = todayEntries.find((e) => e.habitId === habit.id);

            return (
              <div key={habit.id} className="habit-item">
                <div className="habit-header">
                  <div className="habit-info">
                    <div
                      className="habit-color"
                      style={{ backgroundColor: habit.color }}
                    />
                    <div>
                      <div className="habit-name">{habit.name}</div>
                      <div className="habit-meta">
                        {entry && (
                          <span className="habit-time">{entry.actualTime || entry.scheduledTime}</span>
                        )}
                        {streak > 0 && <span className="habit-streak">🔥 {streak}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    className={`habit-checkbox ${entry?.completed ? 'completed' : ''}`}
                    onClick={() => {
                      if (entry) {
                        toggleComplete(entry);
                      }
                    }}
                    disabled={!entry}
                  >
                    {entry?.completed && '✓'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="timeline" ref={containerRef}>
          <div className="timeline-header">
            <div className="timeline-label">Time</div>
          </div>
          <div className="timeline-content">
            {hours.map((hour) => (
              <div
                key={hour}
                className="hour-row"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, hour)}
              >
                <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
                <div className="hour-entries">
                  {todayEntries
                    .filter((e) => {
                      const time = e.actualTime || e.scheduledTime;
                      const [h] = time.split(':').map(Number);
                      return h === hour;
                    })
                    .map((entry) => {
                      const h = habits.find((h) => h.id === entry.habitId);
                      return (
                        <div
                          key={entry.id}
                          className={`entry-card ${entry.completed ? 'completed' : ''}`}
                          style={{ backgroundColor: h?.color || '#ddd' }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, entry.id)}
                          onClick={() => toggleComplete(entry)}
                        >
                          <div className="entry-name">{h?.name}</div>
                          {entry.completed && <div className="entry-check">✓</div>}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
