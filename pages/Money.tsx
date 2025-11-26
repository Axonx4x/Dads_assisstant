import React, { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, Calendar, Clock, Activity, Zap } from 'lucide-react';
import { Transaction } from '../types';
import { TRANSACTION_CATEGORIES, CURRENCY } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface MoneyProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

export const Money: React.FC<MoneyProps> = ({ transactions, setTransactions }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(TRANSACTION_CATEGORIES[0]);
  const [view, setView] = useState<'list' | 'add'>('list');

  const addTransaction = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    
    const now = new Date();
    const newTx: Transaction = {
      id: Date.now().toString(),
      title: description || category,
      amount: parseFloat(amount),
      type,
      category,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTransactions(prev => [newTx, ...prev]);
    setAmount('');
    setDescription('');
    setView('list');
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // --- Financial Velocity Logic ---
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentTx = transactions.filter(t => new Date(t.date) >= sevenDaysAgo);
  const weeklyExpense = recentTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const dailyBurnRate = weeklyExpense / 7;
  
  // Velocity: Income Rate vs Burn Rate (Simple approximation for HUD)
  const weeklyIncome = recentTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const netVelocity = (weeklyIncome / 7) - dailyBurnRate;
  
  // Gauge normalization (-500 to +500 range clamp for visual)
  const gaugePercent = Math.min(Math.max((netVelocity / 500) * 50 + 50, 0), 100);

  // Data for chart
  const expenseData = TRANSACTION_CATEGORIES.map(cat => ({
    name: cat,
    value: transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((sum, t) => sum + t.amount, 0)
  })).filter(d => d.value > 0);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#64748b', '#10b981'];

  if (view === 'add') {
    return (
      <div className="p-4 min-h-screen text-slate-200">
        <h2 className="text-xl font-hud font-bold mb-6 text-white tracking-wide">NEW TRANSACTION</h2>
        
        <div className="flex gap-3 mb-6 bg-slate-800/50 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setType('income')}
            className={`flex-1 py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-all font-hud tracking-wide ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_#10b981]' : 'text-slate-500'}`}
          >
            <TrendingUp size={18} /> INFLOW
          </button>
          <button 
            onClick={() => setType('expense')}
            className={`flex-1 py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-all font-hud tracking-wide ${type === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_10px_#ef4444]' : 'text-slate-500'}`}
          >
            <TrendingDown size={18} /> OUTFLOW
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold uppercase text-cyan-400 tracking-widest mb-2 font-mono">Amount ({CURRENCY})</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-2xl font-hud">{CURRENCY}</span>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                className="w-full pl-10 pr-4 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-3xl font-bold text-white outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all font-hud"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-cyan-400 tracking-widest mb-2 font-mono">Category</label>
            <div className="relative">
                <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-4 bg-slate-900/50 border border-white/10 rounded-2xl text-lg font-medium text-slate-200 outline-none appearance-none"
                >
                {TRANSACTION_CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900 text-slate-200">{c}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-cyan-400 tracking-widest mb-2 font-mono">Description</label>
            <input
              type="text"
              className="w-full p-4 bg-slate-900/50 border border-white/10 rounded-2xl text-lg font-medium text-slate-200 outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="Enter details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-4 mt-10">
           <button onClick={() => setView('list')} className="flex-1 py-4 text-slate-500 font-medium hover:text-white transition-colors">ABORT</button>
           <button 
            onClick={addTransaction}
            className="flex-1 py-4 bg-cyan-600 text-white rounded-2xl font-bold font-hud tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-transform"
           >
             CONFIRM ENTRY
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 p-4 min-h-screen">
      <div className="flex justify-between items-center mb-6 pt-2">
        <h2 className="text-2xl font-hud font-bold text-white tracking-wide">FINANCIAL CORE</h2>
        <button onClick={() => setView('add')} className="bg-cyan-900/40 border border-cyan-500/50 text-cyan-400 p-3 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-90 transition-transform hover:bg-cyan-900/60">
          <Plus size={24} />
        </button>
      </div>

      {/* Balance Card */}
      <div className="glass-panel p-6 rounded-2xl text-white shadow-lg mb-6 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full"></div>
        
        <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Wallet size={16} className="text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-mono">Available Funds</span>
        </div>
        <div className="text-4xl font-hud font-bold mb-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{CURRENCY} {balance.toFixed(2)}</div>
        
        {/* Financial Velocity Gauge */}
        <div className="mb-6">
             <div className="flex justify-between items-end mb-1">
                 <span className="text-[10px] font-mono text-slate-400 uppercase">Velocity Gauge</span>
                 <span className={`text-xs font-bold ${netVelocity >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {netVelocity >= 0 ? 'POSITIVE' : 'CRITICAL'}
                 </span>
             </div>
             <div className="h-2 w-full bg-slate-800 rounded-full relative overflow-hidden">
                 {/* Center Marker */}
                 <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 z-10"></div>
                 {/* Bar */}
                 <div 
                    className={`h-full transition-all duration-500 relative z-0 ${netVelocity >= 0 ? 'bg-gradient-to-r from-slate-800 to-emerald-500' : 'bg-gradient-to-l from-slate-800 to-red-500'}`}
                    style={{ 
                        width: `${Math.abs(netVelocity/500 * 50)}%`,
                        left: netVelocity >= 0 ? '50%' : `${50 - Math.abs(netVelocity/500 * 50)}%`
                    }}
                 ></div>
             </div>
             <div className="flex justify-between text-[9px] text-slate-600 mt-1 font-mono">
                 <span>-DRAG</span>
                 <span>+GROWTH</span>
             </div>
        </div>

        <div className="flex gap-6 border-t border-white/5 pt-4">
            <div>
                <span className="text-[10px] text-slate-400 block mb-1 uppercase font-mono">Total Inflow</span>
                <span className="text-lg font-bold text-emerald-400 flex items-center gap-1 font-hud">
                    <TrendingUp size={14} /> {CURRENCY}{totalIncome.toFixed(0)}
                </span>
            </div>
            <div className="w-px bg-white/10"></div>
            <div>
                <span className="text-[10px] text-slate-400 block mb-1 uppercase font-mono">Total Outflow</span>
                <span className="text-lg font-bold text-red-400 flex items-center gap-1 font-hud">
                    <TrendingDown size={14} /> {CURRENCY}{totalExpense.toFixed(0)}
                </span>
            </div>
        </div>
      </div>

      {/* Burn Rate Alert */}
      {dailyBurnRate > 0 && (
          <div className="glass-panel p-3 rounded-xl mb-6 flex items-center justify-between border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                      <Zap size={16} />
                  </div>
                  <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-orange-300">Daily Burn Rate</div>
                      <div className="text-sm font-bold text-white">~{CURRENCY}{dailyBurnRate.toFixed(0)} / day</div>
                  </div>
              </div>
              <Activity size={16} className="text-orange-500/50" />
          </div>
      )}

      {/* Charts & Lists */}
      {expenseData.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl shadow-sm border border-white/5 mb-6 flex items-center">
           <div className="h-32 w-32 relative">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={expenseData}
                   innerRadius={35}
                   outerRadius={55}
                   paddingAngle={4}
                   dataKey="value"
                   stroke="none"
                 >
                   {expenseData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(value) => `${CURRENCY}${value}`} contentStyle={{backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#fff'}} />
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-500">EXP</span>
             </div>
           </div>
           <div className="flex-1 ml-4 space-y-2">
               {expenseData.slice(0, 3).map((entry, idx) => (
                   <div key={entry.name} className="flex justify-between items-center text-xs">
                       <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                           <span className="text-slate-400">{entry.name}</span>
                       </div>
                       <span className="font-bold text-slate-200 font-mono">{CURRENCY}{Number(entry.value).toFixed(0)}</span>
                   </div>
               ))}
           </div>
        </div>
      )}

      {/* Recent List */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-400 font-hud tracking-widest uppercase">LOGS</h3>
        <span className="text-[10px] font-medium text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20 font-mono">CURRENT CYCLE</span>
      </div>
      
      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="text-center py-10 opacity-30">
             <div className="bg-white/5 p-4 rounded-full inline-block mb-3"><DollarSign size={24} className="text-slate-300"/></div>
             <p className="text-slate-500 text-sm">No transaction data found.</p>
          </div>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 glass-panel rounded-xl border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {t.type === 'income' ? <TrendingUp size={16} /> : <DollarSign size={16} />}
                </div>
                <div>
                  <div className="font-bold text-slate-200 text-sm">{t.title}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                    <span className="flex items-center gap-1"><Calendar size={8} /> {t.date}</span>
                    {t.time && <span className="flex items-center gap-1"><Clock size={8} /> {t.time}</span>}
                  </div>
                </div>
              </div>
              <div className={`font-bold font-hud text-lg ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-300'}`}>
                {t.type === 'expense' ? '-' : '+'}{CURRENCY}{t.amount.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};