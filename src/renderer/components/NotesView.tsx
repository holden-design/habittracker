import React, { useState } from 'react';
import { Note, Idea, PlanTask, AIPlanResult, AIHabitNudge, Habit, HabitEntry } from '../types';
import { generateId } from '../services/utils';
import { analyzePlan, getHabitNudges } from '../services/ai';
import './NotesView.css';

interface NotesViewProps {
  notes: Note[];
  ideas: Idea[];
  habits?: Habit[];
  entries?: HabitEntry[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onAddIdea: (idea: Idea) => void;
  onUpdateIdea: (idea: Idea) => void;
  onDeleteIdea: (ideaId: string) => void;
  onAddCalendarTasks?: (tasks: PlanTask[]) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  ideas,
  habits,
  entries,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddIdea,
  onUpdateIdea,
  onDeleteIdea,
  onAddCalendarTasks,
}) => {
  const [tab, setTab] = useState<'notes' | 'ideas'>('notes');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaCategory, setIdeaCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState<string | null>(null); // noteId or 'nudge'
  const [aiError, setAiError] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<AIPlanResult | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [nudges, setNudges] = useState<AIHabitNudge[] | null>(null);

  const handleAddNote = async () => {
    if (!noteTitle.trim()) return;
    setIsSaving(true);
    const note: Note = {
      id: generateId(),
      title: noteTitle,
      content: noteContent,
      createdAt: new Date(),
      updatedAt: new Date(),
      pinned: false,
    };
    try {
      await onAddNote(note);
      setNoteTitle('');
      setNoteContent('');
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIdea = async () => {
    if (!ideaTitle.trim()) return;
    setIsSaving(true);
    const idea: Idea = {
      id: generateId(),
      title: ideaTitle,
      description: ideaDescription,
      category: ideaCategory || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      pinned: false,
    };
    try {
      await onAddIdea(idea);
      setIdeaTitle('');
      setIdeaDescription('');
      setIdeaCategory('');
    } catch (error) {
      console.error('Failed to save idea:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // AI: Analyze a note as a plan
  const handleAnalyzePlan = async (note: Note) => {
    setAiLoading(note.id);
    setAiError(null);
    try {
      const planContent = `${note.title}\n\n${note.content}`;
      const result = await analyzePlan(planContent);
      setPlanResult(result);
      // Select all tasks by default
      setSelectedTasks(new Set(result.tasks.map((_, i) => i)));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to analyze plan');
    } finally {
      setAiLoading(null);
    }
  };

  // AI: Get habit nudges
  const handleGetNudges = async () => {
    if (!habits || habits.length === 0) return;
    setAiLoading('nudge');
    setAiError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = (entries || [])
        .filter((e) => e.completed && new Date(e.date).toDateString() === today.toDateString())
        .map((e) => {
          const habit = habits.find((h) => h.id === e.habitId);
          return habit?.name || '';
        })
        .filter(Boolean);

      const result = await getHabitNudges(habits, completedToday);
      setNudges(result);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to get nudges');
    } finally {
      setAiLoading(null);
    }
  };

  // Toggle task selection in preview
  const toggleTaskSelection = (index: number) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Confirm and add selected tasks to calendar
  const handleConfirmTasks = () => {
    if (!planResult || !onAddCalendarTasks) return;
    const tasksToAdd = planResult.tasks.filter((_, i) => selectedTasks.has(i));
    onAddCalendarTasks(tasksToAdd);
    setPlanResult(null);
    setSelectedTasks(new Set());
  };

  const closePlanPreview = () => {
    setPlanResult(null);
    setSelectedTasks(new Set());
  };

  const closeNudges = () => {
    setNudges(null);
  };

  return (
    <div className="notes-view">
      <div className="notes-header">
        <h3>📝 Notes & Ideas</h3>
        <div className="notes-tabs">
          <button
            className={`tab-btn ${tab === 'notes' ? 'active' : ''}`}
            onClick={() => setTab('notes')}
          >
            Notes
          </button>
          <button
            className={`tab-btn ${tab === 'ideas' ? 'active' : ''}`}
            onClick={() => setTab('ideas')}
          >
            Ideas
          </button>
        </div>
        {/* AI Habit Nudge Button */}
        {habits && habits.length > 0 && (
          <button
            className="ai-nudge-btn"
            onClick={handleGetNudges}
            disabled={aiLoading === 'nudge'}
          >
            {aiLoading === 'nudge' ? '🔄 Thinking...' : '🧠 Habit Check'}
          </button>
        )}
      </div>

      {/* AI Error */}
      {aiError && (
        <div className="ai-error">
          <span>⚠️ {aiError}</span>
          <button onClick={() => setAiError(null)}>✕</button>
        </div>
      )}

      {/* Habit Nudges Modal */}
      {nudges && (
        <div className="ai-modal-overlay" onClick={closeNudges}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>🧠 Habit Check</h3>
              <button className="ai-modal-close" onClick={closeNudges}>✕</button>
            </div>
            <div className="ai-modal-body">
              {nudges.length === 0 ? (
                <p className="ai-all-done">🎉 You've completed all your habits today! Great job!</p>
              ) : (
                <div className="nudge-list">
                  {nudges.map((nudge, i) => (
                    <div key={i} className="nudge-item">
                      <div className="nudge-habit">{nudge.habitName}</div>
                      <div className="nudge-time">⏰ Suggested: {nudge.suggestedTime}</div>
                      <div className="nudge-message">{nudge.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan Preview Modal */}
      {planResult && (
        <div className="ai-modal-overlay" onClick={closePlanPreview}>
          <div className="ai-modal ai-modal-plan" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>✨ Plan Breakdown</h3>
              <button className="ai-modal-close" onClick={closePlanPreview}>✕</button>
            </div>
            <div className="ai-modal-summary">{planResult.summary}</div>
            <div className="ai-modal-body">
              <div className="plan-task-list">
                {planResult.tasks.map((task, i) => (
                  <label key={i} className={`plan-task-item ${selectedTasks.has(i) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(i)}
                      onChange={() => toggleTaskSelection(i)}
                    />
                    <div className="plan-task-details">
                      <div className="plan-task-title">{task.title}</div>
                      <div className="plan-task-meta">
                        📅 {task.date} &nbsp; ⏰ {task.time} &nbsp; ⏱ {task.durationMinutes}min
                      </div>
                      {task.notes && <div className="plan-task-notes">{task.notes}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="ai-modal-footer">
              <button className="ai-btn-cancel" onClick={closePlanPreview}>Cancel</button>
              <button
                className="ai-btn-confirm"
                onClick={handleConfirmTasks}
                disabled={selectedTasks.size === 0}
              >
                Add {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} to Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="notes-content">
        {tab === 'notes' && (
          <div className="notes-section">
            <div className="input-area">
              <input
                type="text"
                placeholder="Note title..."
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="note-title-input"
              />
              <textarea
                placeholder="Write your note or paste a plan..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="note-content-input"
              />
              <button onClick={handleAddNote} className="btn-add" disabled={isSaving}>
                {isSaving ? '💾 Saving...' : '+ Add Note'}
              </button>
            </div>

            <div className="items-list">
              {notes.length === 0 ? (
                <p className="empty-state">No notes yet. Start capturing your thoughts!</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="item-card note-card">
                    <div className="item-header">
                      <h4>{note.title}</h4>
                      <div className="item-actions">
                        <button
                          className="btn-analyze"
                          onClick={() => handleAnalyzePlan(note)}
                          disabled={aiLoading === note.id}
                          title="Analyze with Claude AI"
                        >
                          {aiLoading === note.id ? '🔄' : '✨'}
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => onDeleteNote(note.id)}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <p className="item-content">{note.content}</p>
                    <div className="item-meta">
                      {new Date(note.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'ideas' && (
          <div className="ideas-section">
            <div className="input-area">
              <input
                type="text"
                placeholder="Idea title..."
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
                className="idea-title-input"
              />
              <textarea
                placeholder="Describe your idea..."
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                className="idea-content-input"
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={ideaCategory}
                onChange={(e) => setIdeaCategory(e.target.value)}
                className="idea-category-input"
              />
              <button onClick={handleAddIdea} className="btn-add" disabled={isSaving}>
                {isSaving ? '💾 Saving...' : '+ Add Idea'}
              </button>
            </div>

            <div className="items-list">
              {ideas.length === 0 ? (
                <p className="empty-state">No ideas yet. Start jotting down your brilliant thoughts!</p>
              ) : (
                ideas.map((idea) => (
                  <div key={idea.id} className="item-card idea-card">
                    <div className="item-header">
                      <h4>{idea.title}</h4>
                      <button
                        className="btn-delete"
                        onClick={() => onDeleteIdea(idea.id)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                    {idea.category && <div className="item-category">{idea.category}</div>}
                    <p className="item-content">{idea.description}</p>
                    <div className="item-meta">
                      {new Date(idea.updatedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
