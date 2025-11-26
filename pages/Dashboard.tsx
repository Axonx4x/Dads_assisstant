
import React, { useEffect, useState } from 'react';
import { CloudSun, Sun, Calendar, Wallet, CheckSquare, Activity, ShieldCheck, AlertTriangle, Settings, Mic } from 'lucide-react';
import { Task, Transaction, WeatherData } from '../types';
import { getDailyMotivation } from '../services/gemini';
import { USER_NAME, CURRENCY } from '../constants';
import { VitalityRing } from '../components/VitalityRing';

interface DashboardProps {
  tasks: Task[];
  transactions: Transaction[];
  setFeature: (f: any) => void;
  weather: WeatherData | null;
  toggleSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, transactions, setFeature, weather, toggleSettings }) => {
  const [quote, setQuote] = useState<string>("Initializing Daily Briefing Protocol...");
  
  const hour = new Date().getHours();
  // Futuristic Greeting
  const greeting = hour < 12 ? 'Morning Protocol' : hour < 18 ? 'Afternoon Cycle' : 'Evening System';

  useEffect(() => {
    getDailyMotivation().then(setQuote);
  }, []);

  // --- Logic & Analytics ---
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter(t => {
      const relevantDate = t.dueDate || t.date;
      return relevantDate === todayStr;
  });
  
  const completedToday = todaysTasks.filter(t => t.completed).length;
  const totalToday = todaysTasks.length;
  const progressPercent = totalToday === 0 ? 0 : (completedToday / totalToday) * 100;

  const nextTask = todaysTasks
    .filter(t => !t.completed)
    .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'))[0];
  
  const todayExpense = transactions
    .filter(t => t.type === 'expense' && t.date === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);

  // Simulated Logic for "System Status"
  const isBudgetSafe = todayExpense < 500; 
  const weatherStatus = weather && weather.weatherCode > 50 ? 'Rain Alert' : 'Clear';

  return (
    <div className="pb-28 p-5 min-h-full space-y-6">
      
      {/* HUD Header */}
      <header className="flex justify-between items-start pt-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
             <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-500 uppercase font-hud">System Online</span>
          </div>
          <h1 className="text-4xl font-hud font-bold text-white tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{greeting}</h1>
          <p className="text-slate-400 text-sm tracking-widest font-mono text-[10px]">OPERATOR: {USER_NAME.toUpperCase()}</p>
        </div>
        
        <div className="flex gap-2">
            <button 
                onClick={toggleSettings}
                className="glass-panel w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all active:scale-95"
            >
                <Settings size={20} />
            </button>
            {/* Weather Chip */}
            <div className="glass-panel px-3 py-2 rounded-xl flex items-center gap-2 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
            {weather ? (
                <>
                    {weather.weatherCode < 3 ? <Sun className="text-amber-400" size={18} /> : <CloudSun className="text-cyan-400" size={18} />}
                    <div className="flex flex-col items-end leading-none">
                        <span className="font-bold text-white text-lg font-hud">{weather.temperature}°</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider">{weatherStatus}</span>
                    </div>
                </>
            ) : <Sun className="text-slate-600 animate-pulse" size={24} />}
            </div>
        </div>
      </header>

      {/* Hero Section: Vitality Ring & AI Brief */}
      <div className="flex items-center gap-4">
        {/* Progress HUD */}
        <div className="shrink-0">
             <VitalityRing 
                percentage={totalToday === 0 ? 100 : progressPercent} 
                label="Daily Sync" 
                subLabel={`${completedToday}/${totalToday} Tasks`}
             />
        </div>

        {/* AI Briefing Box */}
        <div className="flex-1 glass-panel rounded-2xl p-4 relative overflow-hidden group border-blue-500/20">
            <div className="absolute top-0 left-0 w-0.5 h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
            <div className="absolute -right-10 -bottom-10 w-20 h-20 bg-blue-500/20 blur-2xl rounded-full animate-pulse-glow"></div>
            
            <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-widest font-hud">AI Briefing</span>
            </div>
            <p className="text-sm text-slate-300 font-medium leading-relaxed relative z-10 font-mono text-[11px] tracking-wide">
                "{quote}"
            </p>
        </div>
      </div>

      {/* Status Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
         {isBudgetSafe ? (
             <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md">
                 <Activity size={12} /> Budget Optimal
             </div>
         ) : (
             <div className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md">
                 <AlertTriangle size={12} /> High Burn Rate
             </div>
         )}
         <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap backdrop-blur-md">
             <Calendar size={12} /> {new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' })}
         </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* Next Task Module */}
        <div onClick={() => setFeature('tasks')} className="glass-panel p-5 rounded-2xl active:scale-[0.99] transition-transform cursor-pointer relative overflow-hidden group border-white/5 hover:border-cyan-500/30">
           <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
           
           <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-slate-400">
               <CheckSquare size={16} className="text-cyan-400"/>
               <span className="text-[10px] font-bold uppercase tracking-widest font-hud">Next Objective</span>
             </div>
             {nextTask && nextTask.time && (
               <span className="bg-cyan-950/50 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-mono border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">T-{nextTask.time}</span>
             )}
           </div>
           
           {nextTask ? (
             <div>
               <h3 className="text-xl font-hud font-bold text-white mb-1 truncate group-hover:text-cyan-300 transition-colors">{nextTask.title}</h3>
               <div className="flex items-center gap-2 mt-2">
                 {nextTask.priority === 'high' && (
                     <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">PRIORITY ALPHA</span>
                 )}
                 <span className="text-xs text-slate-500">{todaysTasks.length - completedToday} remaining objectives</span>
               </div>
             </div>
           ) : (
             <div className="text-slate-500 py-2">
               <p className="font-medium font-hud text-lg">All objectives cleared.</p>
               <p className="text-[10px] mt-1 opacity-50 font-mono tracking-widest">STANDBY MODE ENGAGED</p>
             </div>
           )}
        </div>
      </div>

      {/* Finance & Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        {/* Money Module */}
        <div onClick={() => setFeature('money')} className="glass-panel p-5 rounded-2xl flex flex-col justify-between active:scale-[0.98] transition-transform group hover:bg-slate-800/50 border-white/5">
          <div className="flex items-start justify-between mb-4">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-hud">Outflow</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors border border-indigo-500/20">
                <Wallet className="text-indigo-400" size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-hud font-bold text-white">{CURRENCY}{todayExpense.toFixed(0)}</div>
            <div className="h-1 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]" style={{ width: `${Math.min((todayExpense/500)*100, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Quick Log Module */}
        <button onClick={() => setFeature('tasks')} className="glass-panel p-5 rounded-2xl flex flex-col justify-between items-start text-left hover:bg-white/5 transition-colors border-white/5 group">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-600 text-white p-2.5 rounded-xl mb-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-110 transition-transform">
            <CheckSquare size={18} />
          </div>
          <div>
            <span className="block font-bold text-white font-hud tracking-wide text-lg">New Entry</span>
            <span className="text-[10px] text-slate-400 font-mono uppercase">Add Task / Log</span>
          </div>
        </button>
      </div>
    </div>
  );
};
