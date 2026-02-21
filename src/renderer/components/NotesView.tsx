import React, { useState } from 'react';
import { Note, Idea } from '../types';
import { generateId } from '../services/utils';
import './NotesView.css';

interface NotesViewProps {
  notes: Note[];
  ideas: Idea[];
  onAddNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onAddIdea: (idea: Idea) => void;
  onUpdateIdea: (idea: Idea) => void;
  onDeleteIdea: (ideaId: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  ideas,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddIdea,
  onUpdateIdea,
  onDeleteIdea,
}) => {
  const [tab, setTab] = useState<'notes' | 'ideas'>('notes');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaCategory, setIdeaCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      console.log('Adding note:', note);
      await onAddNote(note);
      console.log('Note added successfully');
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
      </div>

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
                placeholder="Write your note..."
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
                      <button
                        className="btn-delete"
                        onClick={() => onDeleteNote(note.id)}
                        title="Delete"
                      >
                        ✕
                      </button>
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
