import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Habit, HabitEntry } from '../types';
import { shouldHabitRunToday, calculateStreak } from '../services/utils';
import { sendCompletionNotification } from '../services/notifications';
import { generateId } from '../services/utils';
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
  const [editingTimeEntryId, setEditingTimeEntryId] = useState<string | null>(null);
  const [editingTimeValue, setEditingTimeValue] = useState('');
  const [showHabitsList, setShowHabitsList] = useState(false);

  // Quick-add activity state
  const [quickAddTime, setQuickAddTime] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddType, setQuickAddType] = useState<'activity' | 'meeting'>('activity');
  const [quickAddDuration, setQuickAddDuration] = useState('30');
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  // Drag state (works for both mouse and touch)
  const [draggingEntryId, setDraggingEntryId] = useState<string | null>(null);
  const [dragGhostPos, setDragGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOverTime, setDragOverTime] = useState<string | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const hourRowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const timeInputRef = useRef<HTMLInputElement>(null);
  const dragTimerRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number>(0);

  const hasScrolledRef = useRef(false);

  const hours = Array.from({ length: 24 }, (_, i) => (4 + i) % 24);
  const todayEntries = entries.filter(
    (e) => new Date(e.date).toDateString() === date.toDateString()
  );

  // ===== Auto-scroll to current hour on mount =====
  useEffect(() => {
    // Only auto-scroll if viewing today's date and haven't scrolled yet for this date
    const isToday = date.toDateString() === new Date().toDateString();
    if (!isToday) {
      hasScrolledRef.current = false;
      return;
    }
    if (hasScrolledRef.current) return;

    const currentHour = new Date().getHours();
    // Scroll to one hour before current hour for context
    const scrollToHour = Math.max(0, currentHour - 1);
    const el = hourRowRefs.current.get(scrollToHour);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      hasScrolledRef.current = true;
    }
  }, [date, todayEntries.length]);

  // ===== Time from Y position =====
  const getTimeFromPosition = useCallback((clientY: number): string | null => {
    for (const [hour, el] of hourRowRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        const yOffset = clientY - rect.top;
        const quarterIndex = Math.min(3, Math.floor((yOffset / rect.height) * 4));
        const minutes = quarterIndex * 15;
        return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }
    return null;
  }, []);

  // ===== MOUSE drag handlers =====
  const handleMouseDown = useCallback((e: React.MouseEvent, entryId: string) => {
    // Don't start drag if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('.entry-time, .entry-time-input, .entry-delete-btn, .entry-complete-btn, .entry-actions, input, button')) return;

    e.preventDefault();
    setDraggingEntryId(entryId);
    setDragGhostPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!draggingEntryId) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragGhostPos({ x: e.clientX, y: e.clientY });
      const time = getTimeFromPosition(e.clientY);
      setDragOverTime(time);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientY);
      if (time && draggingEntryId) {
        const entry = todayEntries.find((en) => en.id === draggingEntryId);
        if (entry) {
          onEntryUpdate({ ...entry, scheduledTime: time, actualTime: time });
        }
      }
      setDraggingEntryId(null);
      setDragGhostPos(null);
      setDragOverTime(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingEntryId, todayEntries, onEntryUpdate, getTimeFromPosition]);

  // ===== TOUCH drag handlers =====
  const handleTouchStart = useCallback((e: React.TouchEvent, entryId: string) => {
    const target = e.target as HTMLElement;
    if (target.closest('.entry-time, .entry-time-input, .entry-delete-btn, .entry-complete-btn, .entry-actions, input, button')) return;

    const touch = e.touches[0];
    dragStartYRef.current = touch.clientY;

    // Long press to initiate drag
    dragTimerRef.current = window.setTimeout(() => {
      setDraggingEntryId(entryId);
      setDragGhostPos({ x: touch.clientX, y: touch.clientY });
      if (navigator.vibrate) navigator.vibrate(30);
    }, 200);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];

    // Cancel drag timer if user scrolls before hold
    if (!draggingEntryId && Math.abs(touch.clientY - dragStartYRef.current) > 10) {
      if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
      return;
    }

    if (draggingEntryId) {
      e.preventDefault(); // Prevent scroll while dragging
      setDragGhostPos({ x: touch.clientX, y: touch.clientY });
      const time = getTimeFromPosition(touch.clientY);
      setDragOverTime(time);
    }
  }, [draggingEntryId, getTimeFromPosition]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);

    if (draggingEntryId) {
      e.preventDefault();
      const lastTouch = e.changedTouches[0];
      const time = getTimeFromPosition(lastTouch.clientY);
      if (time) {
        const entry = todayEntries.find((en) => en.id === draggingEntryId);
        if (entry) {
          onEntryUpdate({ ...entry, scheduledTime: time, actualTime: time });
        }
      }
      setDraggingEntryId(null);
      setDragGhostPos(null);
      setDragOverTime(null);
    }
  }, [draggingEntryId, todayEntries, onEntryUpdate, getTimeFromPosition]);

  // ===== Other handlers =====
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
    onEntryDelete(entry.id);
  };

  const handleTimeClick = (e: React.MouseEvent, entry: HabitEntry) => {
    e.stopPropagation();
    setEditingTimeEntryId(entry.id);
    setEditingTimeValue(entry.actualTime || entry.scheduledTime);
    setTimeout(() => timeInputRef.current?.focus(), 0);
  };

  const handleTimeChange = (entry: HabitEntry) => {
    if (editingTimeValue) {
      onEntryUpdate({ ...entry, scheduledTime: editingTimeValue, actualTime: editingTimeValue });
    }
    setEditingTimeEntryId(null);
    setEditingTimeValue('');
  };

  // ===== Quick-add activity on time slot click =====
  const handleTimeSlotClick = useCallback((e: React.MouseEvent, hour: number) => {
    // Don't open if clicking on an existing entry or if dragging
    const target = e.target as HTMLElement;
    if (target.closest('.entry-card') || draggingEntryId) return;

    const el = hourRowRefs.current.get(hour);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const quarterIndex = Math.min(3, Math.floor((yOffset / rect.height) * 4));
    const minutes = quarterIndex * 15;
    const time = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    setQuickAddTime(time);
    setQuickAddTitle('');
    setQuickAddType('activity');
    setQuickAddDuration('30');
    setTimeout(() => quickAddInputRef.current?.focus(), 50);
  }, [draggingEntryId]);

  const handleTimeSlotLongPress = useCallback((hour: number, clientY: number) => {
    const el = hourRowRefs.current.get(hour);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const yOffset = clientY - rect.top;
    const quarterIndex = Math.min(3, Math.floor((yOffset / rect.height) * 4));
    const minutes = quarterIndex * 15;
    const time = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    setQuickAddTime(time);
    setQuickAddTitle('');
    setQuickAddType('activity');
    setQuickAddDuration('30');
    if (navigator.vibrate) navigator.vibrate(30);
    setTimeout(() => quickAddInputRef.current?.focus(), 50);
  }, []);

  // Touch long-press for empty time slots
  const slotLongPressTimer = useRef<number | null>(null);
  const slotTouchStartY = useRef<number>(0);

  const handleSlotTouchStart = useCallback((e: React.TouchEvent, hour: number) => {
    const target = e.target as HTMLElement;
    if (target.closest('.entry-card')) return;

    const touch = e.touches[0];
    slotTouchStartY.current = touch.clientY;
    slotLongPressTimer.current = window.setTimeout(() => {
      handleTimeSlotLongPress(hour, touch.clientY);
    }, 400);
  }, [handleTimeSlotLongPress]);

  const handleSlotTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (Math.abs(touch.clientY - slotTouchStartY.current) > 10) {
      if (slotLongPressTimer.current) clearTimeout(slotLongPressTimer.current);
    }
  }, []);

  const handleSlotTouchEnd = useCallback(() => {
    if (slotLongPressTimer.current) clearTimeout(slotLongPressTimer.current);
  }, []);

  const handleQuickAddSubmit = () => {
    if (!quickAddTitle.trim() || !quickAddTime) return;

    const prefix = quickAddType === 'meeting' ? 'meeting' : 'activity';
    const entry: HabitEntry = {
      id: generateId(),
      habitId: `${prefix}-${generateId()}`,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      scheduledTime: quickAddTime,
      completed: false,
      notes: quickAddTitle.trim() + (parseInt(quickAddDuration) ? ` (${quickAddDuration}min)` : ''),
    };
    onEntryUpdate(entry);
    setQuickAddTime(null);
    setQuickAddTitle('');
  };

  const handleQuickAddCancel = () => {
    setQuickAddTime(null);
    setQuickAddTitle('');
  };

  const habitsTodayFiltered = habits.filter((h) => shouldHabitRunToday(h, date));

  // Current time state for live indicator (updates every minute)
  const [currentTime, setCurrentTime] = useState(new Date());
  const isToday = date.toDateString() === new Date().toDateString();

  useEffect(() => {
    if (!isToday) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [isToday]);

  // Find which hour the drag is over
  const dragOverHour = dragOverTime ? parseInt(dragOverTime.split(':')[0], 10) : null;

  // Dragged entry info for ghost
  const draggedEntry = draggingEntryId ? todayEntries.find((e) => e.id === draggingEntryId) : null;
  const draggedHabit = draggedEntry ? habits.find((h) => h.id === draggedEntry.habitId) : null;

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
                    <div className="habit-color" style={{ backgroundColor: habit.color }} />
                    <div>
                      <div className="habit-name">{habit.name}</div>
                      <div className="habit-meta">
                        {entry && (
                          editingTimeEntryId === entry.id ? (
                            <input
                              ref={timeInputRef}
                              type="time"
                              className="habit-time-input"
                              value={editingTimeValue}
                              onChange={(e) => setEditingTimeValue(e.target.value)}
                              onBlur={() => handleTimeChange(entry)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTimeChange(entry);
                                if (e.key === 'Escape') { setEditingTimeEntryId(null); setEditingTimeValue(''); }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span
                              className="habit-time clickable"
                              onClick={(e) => handleTimeClick(e, entry)}
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
                        if (entry) toggleComplete(entry);
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

        <div className="timeline" ref={timelineRef}>
          <div className="timeline-header">
            <div className="timeline-label">Time</div>
            <div className="timeline-label">Schedule</div>
          </div>
          <div className="timeline-content">
            {hours.map((hour) => (
              <div
                key={hour}
                ref={(el) => { if (el) hourRowRefs.current.set(hour, el); }}
                className={`hour-row ${dragOverHour === hour ? 'drop-active' : ''}`}
                onClick={(e) => handleTimeSlotClick(e, hour)}
                onTouchStart={(e) => handleSlotTouchStart(e, hour)}
                onTouchMove={(e) => handleSlotTouchMove(e)}
                onTouchEnd={handleSlotTouchEnd}
              >
                <div className="hour-label">{String(hour).padStart(2, '0')}:00</div>
                <div className="hour-entries">
                  {/* Current time indicator line */}
                  {isToday && currentTime.getHours() === hour && (
                    <div
                      className="current-time-indicator"
                      style={{
                        top: `${(currentTime.getMinutes() / 60) * 100}%`,
                      }}
                    >
                      <span className="current-time-label">
                        {String(currentTime.getHours()).padStart(2, '0')}:{String(currentTime.getMinutes()).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                  {/* Drop indicator line */}
                  {dragOverTime && dragOverHour === hour && (
                    <div
                      className="drop-indicator"
                      style={{
                        top: `${(parseInt(dragOverTime.split(':')[1], 10) / 60) * 100}%`,
                      }}
                    >
                      <span className="drop-indicator-time">{dragOverTime}</span>
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
                      const isActivity = entry.habitId.startsWith('activity-');
                      const isMeeting = entry.habitId.startsWith('meeting-');
                      const isCustomEntry = isPlanTask || isActivity || isMeeting;
                      const isDragging = draggingEntryId === entry.id;
                      const entryColor = isMeeting ? '#e17055' : isActivity ? '#00b894' : isPlanTask ? '#6c5ce7' : (h?.color || '#ddd');
                      return (
                        <div
                          key={entry.id}
                          className={`entry-card ${entry.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''} ${isCustomEntry ? 'plan-task' : ''}`}
                          style={{ backgroundColor: entryColor }}
                          onMouseDown={(e) => handleMouseDown(e, entry.id)}
                          onTouchStart={(e) => handleTouchStart(e, entry.id)}
                          onTouchMove={(e) => handleTouchMove(e)}
                          onTouchEnd={(e) => handleTouchEnd(e)}
                        >
                          <div className="entry-drag-handle" title="Drag to reschedule">⠿</div>
                          <div className="entry-name">{isCustomEntry ? (entry.notes || (isMeeting ? 'Meeting' : isActivity ? 'Activity' : 'Plan Task')) : h?.name}</div>
                          {editingTimeEntryId === entry.id ? (
                            <input
                              ref={timeInputRef}
                              type="time"
                              className="entry-time-input"
                              value={editingTimeValue}
                              onChange={(ev) => setEditingTimeValue(ev.target.value)}
                              onBlur={() => handleTimeChange(entry)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') handleTimeChange(entry);
                                if (ev.key === 'Escape') { setEditingTimeEntryId(null); setEditingTimeValue(''); }
                              }}
                              onClick={(ev) => ev.stopPropagation()}
                            />
                          ) : (
                            <div
                              className="entry-time clickable"
                              onClick={(ev) => { ev.stopPropagation(); handleTimeClick(ev, entry); }}
                              title="Click to change time"
                            >
                              {entry.actualTime || entry.scheduledTime}
                            </div>
                          )}
                          <div className="entry-actions">
                            <button
                              className={`entry-complete-btn ${entry.completed ? 'done' : ''}`}
                              onClick={(e) => { e.stopPropagation(); toggleComplete(entry); }}
                              title={entry.completed ? 'Mark incomplete' : 'Mark complete'}
                            >
                              {entry.completed ? '✓' : '○'}
                            </button>
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
            ))}
          </div>
        </div>
      </div>

      {/* Quick-add activity modal */}
      {quickAddTime && (
        <div className="quick-add-overlay" onClick={handleQuickAddCancel}>
          <div className="quick-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quick-add-header">
              <h4>Add to {quickAddTime}</h4>
              <button className="quick-add-close" onClick={handleQuickAddCancel}>✕</button>
            </div>
            <div className="quick-add-type-toggle">
              <button
                className={`quick-add-type-btn ${quickAddType === 'activity' ? 'active' : ''}`}
                onClick={() => setQuickAddType('activity')}
              >
                🏃 Activity
              </button>
              <button
                className={`quick-add-type-btn ${quickAddType === 'meeting' ? 'active' : ''}`}
                onClick={() => setQuickAddType('meeting')}
              >
                👥 Meeting
              </button>
            </div>
            <div className="quick-add-body">
              <input
                ref={quickAddInputRef}
                type="text"
                className="quick-add-input"
                placeholder={quickAddType === 'meeting' ? 'Meeting name...' : 'What are you doing?'}
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleQuickAddSubmit();
                  if (e.key === 'Escape') handleQuickAddCancel();
                }}
              />
              <div className="quick-add-duration-row">
                <label>Duration</label>
                <div className="quick-add-duration-options">
                  {['15', '30', '60', '90'].map((d) => (
                    <button
                      key={d}
                      className={`quick-add-dur-btn ${quickAddDuration === d ? 'active' : ''}`}
                      onClick={() => setQuickAddDuration(d)}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="quick-add-footer">
              <button className="quick-add-cancel" onClick={handleQuickAddCancel}>Cancel</button>
              <button
                className="quick-add-submit"
                onClick={handleQuickAddSubmit}
                disabled={!quickAddTitle.trim()}
              >
                Add {quickAddType === 'meeting' ? 'Meeting' : 'Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag ghost that follows cursor/finger */}
      {draggingEntryId && dragGhostPos && draggedEntry && (
        <div
          className="drag-ghost"
          style={{
            left: dragGhostPos.x,
            top: dragGhostPos.y,
            backgroundColor: draggedEntry.habitId.startsWith('meeting-')
              ? '#e17055'
              : draggedEntry.habitId.startsWith('activity-')
              ? '#00b894'
              : draggedEntry.habitId.startsWith('plan-')
              ? '#6c5ce7'
              : (draggedHabit?.color || '#ddd'),
          }}
        >
          <span>
            {draggedEntry.habitId.startsWith('plan-') || draggedEntry.habitId.startsWith('activity-') || draggedEntry.habitId.startsWith('meeting-')
              ? (draggedEntry.notes || 'Task')
              : draggedHabit?.name}
          </span>
          {dragOverTime && <span className="drag-ghost-time">{dragOverTime}</span>}
        </div>
      )}
    </div>
  );
};
