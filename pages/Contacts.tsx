
import React, { useState } from 'react';
import { Contact } from '../types';
import { Phone, MessageCircle, User, Plus, Trash2, Smartphone } from 'lucide-react';

interface ContactsProps {
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
}

export const Contacts: React.FC<ContactsProps> = ({ contacts, setContacts }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('');

  const addContact = () => {
    if (!newName || !newPhone) return;
    const newContact: Contact = {
      id: Date.now().toString(),
      name: newName,
      phone: newPhone,
      role: newRole || 'Associate',
    };
    setContacts(prev => [...prev, newContact]);
    setNewName('');
    setNewPhone('');
    setNewRole('');
    setIsAdding(false);
  };

  const importContacts = async () => {
    // Check for Contact Picker API support (Chrome on Android / iOS 14.5+)
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: true };
        
        // @ts-ignore - TS doesn't fully support this experimental API type yet
        const selectedContacts = await navigator.contacts.select(props, opts);
        
        if (selectedContacts.length > 0) {
           const imported = selectedContacts.map((c: any) => ({
              id: Date.now().toString() + Math.random(),
              name: c.name[0],
              phone: c.tel[0],
              role: 'Imported',
           }));
           
           setContacts(prev => [...prev, ...imported]);
        }
      } catch (ex) {
        // Handle cancellation or error
        console.log("Contact import cancelled or failed", ex);
      }
    } else {
      alert("This feature requires a supported mobile device (Android/iOS).");
    }
  };

  const deleteContact = (id: string) => {
    if(confirm("Terminate this connection link?")) {
        setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="pb-24 p-4 min-h-screen">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h2 className="text-2xl font-bold font-hud text-white tracking-wide">UPLINKS</h2>
        <div className="flex gap-2">
            <button 
                onClick={importContacts}
                className="bg-slate-800 border border-slate-700 text-slate-300 p-2 rounded-full hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
                title="Import from Device"
            >
                <Smartphone size={24} />
            </button>
            <button 
            onClick={() => setIsAdding(!isAdding)} 
            className="bg-cyan-900/40 border border-cyan-500/50 text-cyan-400 p-2 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
            <Plus size={24} />
            </button>
        </div>
      </div>

      {isAdding && (
        <div className="glass-panel p-4 rounded-xl shadow-lg border border-cyan-500/30 mb-6 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-cyan-400 mb-3 font-hud tracking-wide">ESTABLISH CONNECTION</h3>
          <input 
            type="text" placeholder="Designation (Name)" 
            className="w-full p-3 bg-slate-900/50 rounded-lg mb-2 outline-none border border-white/5 text-white placeholder:text-slate-600 focus:border-cyan-500/30"
            value={newName} onChange={e => setNewName(e.target.value)}
          />
           <input 
            type="tel" placeholder="Frequency (Phone)" 
            className="w-full p-3 bg-slate-900/50 rounded-lg mb-2 outline-none border border-white/5 text-white placeholder:text-slate-600 focus:border-cyan-500/30"
            value={newPhone} onChange={e => setNewPhone(e.target.value)}
          />
           <input 
            type="text" placeholder="Role (e.g. Plumber)" 
            className="w-full p-3 bg-slate-900/50 rounded-lg mb-4 outline-none border border-white/5 text-white placeholder:text-slate-600 focus:border-cyan-500/30"
            value={newRole} onChange={e => setNewRole(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-slate-500 hover:text-white transition-colors">ABORT</button>
            <button onClick={addContact} className="flex-1 py-2 bg-cyan-600 text-white rounded-lg font-bold font-hud tracking-wide">SAVE UPLINK</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {contacts.map(contact => (
          <div key={contact.id} className="glass-panel p-4 rounded-xl border border-white/5 flex items-center justify-between hover:border-cyan-500/20 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 border border-white/5">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">{contact.name}</h3>
                <p className="text-[10px] text-cyan-500/70 font-mono uppercase tracking-wide">{contact.role} • {contact.phone}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <a href={`tel:${contact.phone}`} className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                <Phone size={18} />
              </a>
              <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="w-10 h-10 bg-emerald-600/80 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <MessageCircle size={18} />
              </a>
              <button onClick={() => deleteContact(contact.id)} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {contacts.length === 0 && !isAdding && (
            <p className="text-center text-slate-600 py-10 font-mono text-xs uppercase">Database Empty.</p>
        )}
      </div>
    </div>
  );
};
