import React, { useState } from 'react';
import { ShoppingItem } from '../types';
import { Plus, Check, Trash2, ShoppingBag } from 'lucide-react';

interface ShoppingProps {
  items: ShoppingItem[];
  setItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
}

export const Shopping: React.FC<ShoppingProps> = ({ items, setItems }) => {
  const [newItemName, setNewItemName] = useState('');
  const [category, setCategory] = useState<'Home' | 'Work' | 'Business'>('Home');

  const addItem = () => {
    if (!newItemName.trim()) return;
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: newItemName,
      category,
      completed: false,
    };
    setItems(prev => [...prev, newItem]);
    setNewItemName('');
  };

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const categories = ['Home', 'Work', 'Business'] as const;

  return (
    <div className="pb-24 p-4 min-h-screen">
      <h2 className="text-2xl font-bold font-hud text-white mb-6 pt-2 tracking-wide">SUPPLY CHAIN</h2>

      {/* Input Area */}
      <div className="glass-panel p-2 rounded-2xl shadow-sm border border-white/5 mb-6 sticky top-2 z-10 backdrop-blur-xl">
        <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar p-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition-all uppercase tracking-wider ${
                category === cat 
                  ? 'bg-cyan-900/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)] border border-cyan-500/30' 
                  : 'bg-transparent text-slate-500 hover:bg-slate-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2 p-1">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder={`Add to ${category} log...`}
            className="flex-1 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-cyan-500/30 text-white font-medium placeholder:text-slate-600 transition-colors"
          />
          <button 
            onClick={addItem}
            className="bg-cyan-600 text-white w-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Lists */}
      <div className="space-y-8">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category === cat);
          if (catItems.length === 0) return null;

          return (
            <div key={cat} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h3 className="text-[10px] font-bold text-cyan-500/70 uppercase tracking-[0.2em] mb-3 ml-2 font-mono">{cat} SECTOR</h3>
              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                {catItems.map(item => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 transition-colors ${item.completed ? 'bg-slate-900/40' : 'bg-transparent'}`}
                  >
                    <button 
                      onClick={() => toggleItem(item.id)}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        item.completed ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-slate-600 bg-slate-900/50'
                      }`}>
                        {item.completed && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className={`text-base font-medium ${item.completed ? 'text-slate-600 line-through decoration-slate-600' : 'text-slate-200'}`}>
                        {item.name}
                      </span>
                    </button>
                    <button onClick={() => deleteItem(item.id)} className="text-slate-600 hover:text-red-400 p-2 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600 opacity-50">
                <ShoppingBag size={64} strokeWidth={1} className="mb-4 opacity-50"/>
                <p className="font-hud tracking-wide">NO SUPPLY REQUESTS</p>
                <p className="text-xs font-mono mt-1">Inventory Levels Normal</p>
            </div>
        )}
      </div>
    </div>
  );
};