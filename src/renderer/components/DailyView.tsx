import React, { useState, useRef, useCallback } from 'react';
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
  onDeleteHabit?: (habitId: string) => void;
}

export const DailyView: React.FC<DailyViewProps> = ({ date, habits, entries, onEntryUpdate, onEntryDelete, onDeleteHabit }) => {
  const [draggedEntry, setDraggedEntry] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null); // "HH:MM" or null
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [showHabitsList, setShowHabitsList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => (4 + i) % 24);
  const todayEntries = entries.filter(
    (e) => e.date.toDateString() === date.toDateString()
  );

  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    setDraggedEntry(entryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Calculate 15-min snap within the hour row
    const rect = e.currentTarget.getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const quarterIndex = Math.min(3, Math.floor((yOffset / rect.height) * 4));
    const minutes = quarterIndex * 15;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    setDropTarget(timeStr);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    if (!draggedEntry) return;

    const entry = todayEntries.find((en) => en.id === draggedEntry);
    if (entry) {
      // Use the 15-min precision from dropTarget, fallback to hour
      let newTime = `${String(hour).padStart(2, '0')}:00`;
      if (dropTarget) {
        newTime = dropTarget;
      }
      onEntryUpdate({ ...entry, scheduledTime: newTime, actualTime: newTime });
    }
    setDraggedEntry(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedEntry(null);
    setDropTarget(null);
  };

  const toggleComplete = (entry: HabitEntry) => {
    const isCompleting = !entry.completed;
    const habit = habits.find((h) => h.id === entry.habitId);

    onEntryUpdate({
      ...entry,
      completed: isCompleting,
      completedAt: isCompleting ? new Date() : undefined,
    });

    if (isCompleting && habit) {
      sendCompletionNotification(habit.name);
    }
  };

  const handleDeleteEntry = (e: React.MouseEvent, entry: HabitEntry) => {
    e.stopPropagation();
    // Only remove this day's entry, not the whole habit
    onEntryDelete(entry.id);
  };

  const handleTimeClick = (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    setEditingTimeEntryId(entryId);
    // Focus the input after render
    setTimeout(() => timeInputRef.current?.focus(), 0);
  };

  const handleTimeChange = (entry: HabitEntry, newTime: string) => {
    if (newTime) {
      onEntryUpdate({ ...entry, scheduledTime: newTime, actualTime: newTime });
    }
    setEditingTimeEntryId(null);
  };

  const habitsTodayFiltered = habits.filter((h) => shouldHabitRunToday(h, date));

  // Check if a given hour row contains the drop target
  const getDropIndicator = (hour: number): string | null => {
    if (!dropTarget || !draggedEntry) return null;
    const [h] = dropTarget.split(':').map(Number);
    if (h === hour) return dropTarget;
    return null;
  };

  return (
    <div className="daily-view">
      <div className="daily-header">
        <h3>{date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
      </div>

      <div className="daily-content">
        <div className="habits-list">
          <h4 className="habits-list-toggle" onClick={() => setShowHabitsList(!showHabitsList)}>
            <span>All Habits ({habitsTodayFiltered.length})</span>
            <span className={`habits-list-arrow ${showHabitsList ? 'open' : ''}`}>▸</span>
          </h4>
          {showHabitsList && habitsTodayFiltered.map((habit) => {
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
                          editingTimeEntryId === entry.id ? (
                            <input
                              ref={timeInputRef}
                              type="time"
                              className="habit-time-input"
                              defaultValue={entry.actualTime || entry.scheduledTime}
                              onBlur={(e) => handleTimeChange(entry, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTimeChange(entry, (e.target as HTMLInputElement).value);
                                if (e.key === 'Escape') setEditingTimeEntryId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className="habit-time clickable"
                              onClick={(e) => handleTimeClick(e, entry.id)}
                              title="Click to change time"
                            >
                              {entry.actualTime || entry.scheduledTime}
                            </span>
                          )
                        )}
                        {streak > 0 && <span className="habit-streak">🔥 {streak}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="habit-actions">
                    {onDeleteHabit && (
                      <button
                        className="habit-delete-btn"
                        onClick={() => onDeleteHabit(habit.id)}
                        title="Delete habit"
                      >
                        ✕
                      </button>
                    )}
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
              </div>
            );
          })}
        </div>

        <div className="timeline" ref={containerRef}>
          <div className="timeline-header">
            <div className="timeline-label">Time</div>
            <div className="timeline-label">Schedule</div>
          </div>
          <div className="timeline-content">
            {hours.map((hour) => {
              const indicator = getDropIndicator(hour);
              return (
                <div
                  key={hour}
                  className={`hour-row ${indicator ? 'drop-active' : ''}`}
                  onDragOver={(e) => handleDragOver(e, hour)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, hour)}
                >
                  <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
                  <div className="hour-entries">
                    {/* Drop indicator line */}
                    {indicator && (
                      <div className="drop-indicator">
                        <span className="drop-indicator-time">{indicator}</span>
                      </div>
                    )}
                    {todayEntries
                      .filter((e) => {
                        const time = e.actualTime || e.scheduledTime;
                        const [h] = time.split(':').map(Number);
                        return h === hour;
                      })
                      .map((entry) => {
                        const h = habits.find((hab) => hab.id === entry.habitId);
                        const isPlanTask = entry.habitId.startsWith('plan-');
                        const isDragging = draggedEntry === entry.id;
                        return (
                          <div
                            key={entry.id}
                            className={`entry-card ${entry.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${isPlanTask ? 'plan-task' : ''}`}
                            style={{ backgroundColor: isPlanTask ? '#6c5ce7' : (h?.color || '#ddd') }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, entry.id)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="entry-name">{isPlanTask ? (entry.notes || 'Plan Task') : h?.name}</div>
                            {editingTimeEntryId === entry.id ? (
                              <input
                                ref={timeInputRef}
                                type="time"
                                className="entry-time-input"
                                defaultValue={entry.actualTime || entry.scheduledTime}
                                onBlur={(e) => handleTimeChange(entry, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTimeChange(entry, (e.target as HTMLInputElement).value);
                                  if (e.key === 'Escape') setEditingTimeEntryId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div
                                className="entry-time clickable"
                                onClick={(e) => { e.stopPropagation(); handleTimeClick(e, entry.id); }}
                                title="Click to change time"
                              >
                                {entry.actualTime || entry.scheduledTime}
                              </div>
                            )}
                            <div className="entry-actions">
                              <button
                                className="entry-delete-btn"
                                onClick={(e) => handleDeleteEntry(e, entry)}
                                title="Delete entry"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
