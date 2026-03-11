import React, { useState } from 'react';
import { Habit } from '../types';
import { generateId, getRandomColor } from '../services/utils';
import './HabitForm.css';

interface HabitFormProps {
  onSubmit: (habit: Habit) => void;
  onCancel: () => void;
  editingHabit?: Habit;
}

export const HabitForm: React.FC<HabitFormProps> = ({ onSubmit, onCancel, editingHabit }) => {
  const [name, setName] = useState(editingHabit?.name || '');
  const [color, setColor] = useState(editingHabit?.color || getRandomColor());
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekends' | 'custom'>(editingHabit?.frequency || 'daily');
  const [customDays, setCustomDays] = useState<number[]>(editingHabit?.customDays || []);
  const [targetDuration, setTargetDuration] = useState<number | undefined>(editingHabit?.targetDurationMinutes);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const habit: Habit = {
      id: editingHabit?.id || generateId(),
      name: name.trim(),
      color,
      frequency,
      customDays: frequency === 'custom' ? customDays : undefined,
      targetDurationMinutes: targetDuration,
      createdAt: editingHabit?.createdAt || new Date(),
    };

    onSubmit(habit);
  };

  const toggleDay = (day: number) => {
    setCustomDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  return (
    <div className="habit-form-overlay" onClick={onCancel}>
      <div className="habit-form" onClick={(e) => e.stopPropagation()}>
        <div className="habit-form-drag-handle" />
        <h2>{editingHabit ? 'Edit Habit' : 'Add New Habit'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Habit Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Meditation"
              required
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {colors.map((c) => (
                <button
                  key={c}
                  className={`color-option ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  type="button"
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays (Mon-Fri)</option>
              <option value="weekends">Weekends (Sat-Sun)</option>
              <option value="custom">Custom Days</option>
            </select>
          </div>

          {frequency === 'custom' && (
            <div className="form-group">
              <label>Select Days</label>
              <div className="day-selector">
                {dayLabels.map((label, idx) => (
                  <button
                    key={idx}
                    className={`day-btn ${customDays.includes(idx) ? 'selected' : ''}`}
                    onClick={() => toggleDay(idx)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Target Duration (minutes)</label>
            <input
              type="number"
              value={targetDuration ?? ''}
              onChange={(e) => setTargetDuration(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="e.g., 20"
              min="1"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {editingHabit ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
