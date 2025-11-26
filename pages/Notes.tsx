import React, { useState } from 'react';
import { Note } from '../types';
import { Plus, Lock, Unlock, Trash2, ChevronLeft, Clock, FileText } from 'lucide-react';

interface NotesProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

export const Notes: React.FC<NotesProps> = ({ notes, setNotes }) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLocked, setEditLocked] = useState(false);

  const [showPinPad, setShowPinPad] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const handleSave = () => {
    const now = new Date();
    const newNote: Note = {
      id: selectedNote ? selectedNote.id : Date.now().toString(),
      title: editTitle || 'Untitled Log',
      content: editContent,
      isLocked: editLocked,
      date: selectedNote ? selectedNote.date : now.toLocaleDateString(),
      updatedAt: now.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
    };

    if (selectedNote) {
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? newNote : n));
    } else {
      setNotes(prev => [newNote, ...prev]);
    }
    closeEditor();
  };

  const closeEditor = () => {
    setSelectedNote(null);
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
    setEditLocked(false);
  };

  const openNote = (note: Note) => {
    if (note.isLocked) {
        setSelectedNote(note);
        setShowPinPad(true);
        setPinInput('');
    } else {
        openEditor(note);
    }
  };

  const openEditor = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditLocked(note.isLocked);
    setIsEditing(true);
    setShowPinPad(false);
  };

  const verifyPin = () => {
    if (pinInput === '1234') {
        if (selectedNote) openEditor(selectedNote);
    } else {
        alert("ACCESS DENIED");
        setPinInput('');
    }
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    closeEditor();
  };

  if (showPinPad) {
      return (
          <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
              <div className="glass-panel rounded-3xl p-8 w-full max-w-sm text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                      <Lock className="text-cyan-500" size={32} />
                  </div>
                  <h3 className="text-2xl font-hud font-bold mb-2 text-white tracking-wide">SECURE LOG</h3>
                  <p className="text-slate-500 mb-6 text-xs font-mono uppercase">Authentication Required</p>
                  <input 
                    type="password" 
                    className="w-full text-center text-4xl font-bold tracking-[1em] border-b border-slate-700 focus:border-cyan-500 mb-8 py-2 outline-none bg-transparent text-white font-mono"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••"
                    autoFocus
                    maxLength={4}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowPinPad(false)} className="flex-1 py-4 text-slate-400 font-bold text-xs uppercase hover:text-white">Cancel</button>
                      <button onClick={verifyPin} className="flex-1 py-4 bg-cyan-900/50 border border-cyan-500/30 text-cyan-400 rounded-2xl font-bold text-xs uppercase hover:bg-cyan-800/50">Unlock</button>
                  </div>
              </div>
          </div>
      )
  }

  if (isEditing) {
    return (
      <div className="fixed inset-0 bg-[#020617] z-40 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0">
          <button onClick={closeEditor} className="p-2 -ml-2 text-slate-400 rounded-full hover:bg-white/5">
            <ChevronLeft size={28} />
          </button>
          <div className="flex gap-2">
            <button onClick={() => setEditLocked(!editLocked)} className={`p-2 rounded-full transition-colors ${editLocked ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-500'}`}>
               {editLocked ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
            {selectedNote && (
                 <button onClick={() => deleteNote(selectedNote.id)} className="p-2 rounded-full bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-900/20 transition-colors">
                 <Trash2 size={20} />
               </button>
            )}
            <button onClick={handleSave} className="px-5 py-2 bg-cyan-600 text-white rounded-xl font-bold font-hud tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              SAVE
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 flex flex-col max-w-lg mx-auto w-full">
          <input
            type="text"
            className="text-3xl font-hud font-bold mb-6 outline-none bg-transparent placeholder:text-slate-700 text-white tracking-wide"
            placeholder="LOG TITLE..."
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <textarea
            className="flex-1 w-full resize-none text-lg text-slate-300 outline-none bg-transparent placeholder:text-slate-800 leading-relaxed font-mono"
            placeholder="Start typing data..."
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 p-4 min-h-screen">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h2 className="text-2xl font-bold font-hud text-white tracking-wide">DATA LOGS</h2>
        <button 
            onClick={() => {
                setSelectedNote(null);
                setEditTitle('');
                setEditContent('');
                setEditLocked(false);
                setIsEditing(true);
            }} 
            className="bg-cyan-900/40 border border-cyan-500/50 text-cyan-400 p-3 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {notes.map(note => (
          <button
            key={note.id}
            onClick={() => openNote(note)}
            className="glass-panel p-5 rounded-2xl border border-white/5 text-left h-48 flex flex-col relative overflow-hidden active:scale-[0.98] transition-all hover:border-cyan-500/30 group"
          >
            {note.isLocked && (
                <div className="absolute top-3 right-3 text-slate-600">
                    <Lock size={14} />
                </div>
            )}
            <h3 className="font-bold text-slate-200 mb-3 truncate pr-6 text-lg group-hover:text-cyan-300 transition-colors">{note.title}</h3>
            {note.isLocked ? (
                <div className="flex-1 flex items-center justify-center text-slate-800">
                    <Lock size={32} />
                </div>
            ) : (
                <p className="text-xs text-slate-500 line-clamp-5 leading-relaxed font-mono opacity-80">{note.content || "Empty log entry."}</p>
            )}
            <div className="mt-auto pt-3 flex items-center gap-1 text-[9px] text-slate-600 font-mono uppercase">
                <Clock size={10} />
                {note.updatedAt || note.date}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};