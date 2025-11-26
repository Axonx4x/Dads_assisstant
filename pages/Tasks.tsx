
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Circle, Clock, AlertCircle, Calendar as CalendarIcon, Bell, Zap, BellRing, BellOff } from 'lucide-react';
import { Task, WeatherData } from '../types';
import { playCompletionSound } from '../services/sound';

interface TasksProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  weather: WeatherData | null;
}

export const Tasks: React.FC<TasksProps> = ({ tasks, setTasks, weather }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [hasAlarm, setHasAlarm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon.png' });
    }
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    
    // Default to today if no date picked
    const today = new Date().toISOString().split('T')[0];
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      completed: false,
      date: today,
      dueDate: newTaskDate || today,
      time: newTaskTime,
      priority: isHighPriority ? 'high' : 'normal',
      hasAlarm: hasAlarm
    };
    
    setTasks(prev => [newTask, ...prev]);
    sendNotification('Objective Added', `Added "${newTaskTitle}" to database.`);
    resetForm();
  };

  const resetForm = () => {
    setNewTaskTitle('');
    setNewTaskTime('');
    setNewTaskDate('');
    setIsHighPriority(false);
    setHasAlarm(false);
    setIsAdding(false);
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && !task.completed) {
      playCompletionSound();
    }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // --- Smart AI Sorting Logic ---
  const getSmartScore = (task: Task): number => {
      let score = 0;
      const titleLower = task.title.toLowerCase();
      
      // 1. Weather Logic
      if (weather && weather.weatherCode > 50) { 
          if (titleLower.includes('garden') || titleLower.includes('wash') || titleLower.includes('roof') || titleLower.includes('outside')) {
              score -= 50; 
          }
      }

      // 2. Time Logic
      const hour = new Date().getHours();
      if (hour >= 9 && hour <= 17) { 
          if (titleLower.includes('call') || titleLower.includes('email') || titleLower.includes('invoice') || titleLower.includes('meet')) {
              score += 20; 
          }
      } else if (hour >= 18) { 
          if (titleLower.includes('dinner') || titleLower.includes('relax') || titleLower.includes('read')) {
              score += 20;
          }
      }
      return score;
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    
    const scoreA = (a.priority === 'high' ? 100 : 0) + getSmartScore(a);
    const scoreB = (b.priority === 'high' ? 100 : 0) + getSmartScore(b);
    
    if (scoreA !== scoreB) return scoreB - scoreA;
    
    const dateA = a.dueDate || a.date;
    const dateB = b.dueDate || b.date;
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    
    return (a.time || '23:59').localeCompare(b.time || '23:59');
  });

  return (
    <div className="p-4 pb-24 min-h-screen">
      <header className="flex justify-between items-center mb-6 pt-2">
        <h2 className="text-2xl font-hud font-bold text-white tracking-wide">OBJECTIVES</h2>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => Notification.requestPermission()}
             className="text-slate-500 hover:text-cyan-400 transition-colors"
             title="Enable Notifications"
           >
             <Bell size={20} />
           </button>
           <div className="text-[10px] font-bold font-mono text-cyan-400 bg-cyan-950/50 px-3 py-1 rounded border border-cyan-500/30">
             {tasks.filter(t => !t.completed).length} PENDING
           </div>
        </div>
      </header>

      {/* Add Task Area */}
      {isAdding ? (
        <div className="glass-panel p-5 rounded-2xl shadow-lg border border-cyan-500/30 mb-6 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          <input
            autoFocus
            type="text"
            className="w-full text-lg border-b border-white/10 focus:outline-none focus:border-cyan-500 pb-2 mb-4 bg-transparent font-medium text-white placeholder:text-slate-500"
            placeholder="Enter objective protocol..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
          />
          
          <div className="flex flex-col gap-3 mb-6">
             <div className="flex gap-3">
                <div className="flex-1 bg-slate-900/50 rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-slate-400" />
                    <input 
                        type="date" 
                        className="bg-transparent w-full text-sm font-medium text-slate-300 outline-none scheme-dark"
                        value={newTaskDate}
                        onChange={(e) => setNewTaskDate(e.target.value)}
                    />
                </div>
                <div className="flex-1 bg-slate-900/50 rounded-xl px-3 py-2 border border-white/10 flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <input 
                        type="time" 
                        className="bg-transparent w-full text-sm font-medium text-slate-300 outline-none scheme-dark"
                        value={newTaskTime}
                        onChange={(e) => setNewTaskTime(e.target.value)}
                    />
                </div>
             </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => setIsHighPriority(!isHighPriority)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all ${isHighPriority ? 'bg-red-500/20 border border-red-500/50 text-red-400' : 'bg-slate-800/50 border border-white/5 text-slate-500'}`}
                >
                    <AlertCircle size={14} />
                    {isHighPriority ? 'PRIORITY' : 'NORMAL'}
                </button>
                <button 
                    onClick={() => setHasAlarm(!hasAlarm)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all ${hasAlarm ? 'bg-orange-500/20 border border-orange-500/50 text-orange-400' : 'bg-slate-800/50 border border-white/5 text-slate-500'}`}
                >
                    {hasAlarm ? <BellRing size={14} /> : <BellOff size={14} />}
                    {hasAlarm ? 'ALARM ON' : 'ALARM OFF'}
                </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button 
              onClick={resetForm} 
              className="px-4 py-2 text-slate-500 font-medium hover:text-white transition-colors"
            >
              CANCEL
            </button>
            <button 
              onClick={addTask} 
              className="px-6 py-2 bg-cyan-600 text-white rounded-xl font-bold font-hud tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-transform border border-cyan-400/30"
            >
              INITIATE
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full py-4 mb-6 bg-slate-800/30 border border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50 rounded-2xl text-cyan-500 font-bold flex items-center justify-center space-x-2 transition-all group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform"/>
          <span className="font-hud tracking-wide">NEW OBJECTIVE</span>
        </button>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {sortedTasks.length === 0 && !isAdding && (
          <div className="text-center py-20 opacity-30">
            <CheckCircle size={48} className="mx-auto text-cyan-500 mb-4" />
            <p className="text-slate-500 font-medium font-hud text-lg">ALL SYSTEMS NOMINAL</p>
            <p className="text-xs text-slate-600 font-mono">No active directives found.</p>
          </div>
        )}
        
        {sortedTasks.map((task) => (
          <TaskItem key={task.id} task={task} toggleTask={toggleTask} deleteTask={deleteTask} isSmartBoosted={getSmartScore(task) !== 0} />
        ))}
      </div>
    </div>
  );
};

// Extracted for performance
const TaskItem: React.FC<{ task: Task, toggleTask: (id: string) => void, deleteTask: (id: string) => void, isSmartBoosted: boolean }> = ({ task, toggleTask, deleteTask, isSmartBoosted }) => {
  const [timeLeft, setTimeLeft] = useState<{text: string, urgent: boolean}>({text: '', urgent: false});

  useEffect(() => {
    if (task.completed || !task.dueDate) return;

    const calculateTimeLeft = () => {
        const now = new Date();
        const dueString = `${task.dueDate}T${task.time || '23:59:00'}`;
        const due = new Date(dueString);
        const diff = due.getTime() - now.getTime();

        if (diff <= 0) return { text: 'OVERDUE', urgent: true };
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Less than 1 hour remains
        if (hours === 0 && minutes < 60) {
           return { text: `${minutes}M ${seconds}S`, urgent: true };
        }
        
        if (hours > 24) return { text: `${Math.floor(hours / 24)} DAYS`, urgent: false };
        return { text: `${hours}H ${minutes}M`, urgent: false };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000); // Update every second for countdown look
    return () => clearInterval(timer);
  }, [task]);

  const displayDate = task.dueDate 
    ? new Date(task.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) 
    : '';

  return (
    <div 
        className={`group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
            task.completed 
            ? 'bg-slate-900/20 border-slate-800 opacity-50' 
            : 'glass-panel border-white/5 hover:border-cyan-500/30'
        }`}
    >
        {/* Priority Indicator */}
        {task.priority === 'high' && !task.completed && (
            <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
        )}

        {/* AI Boost Indicator */}
        {!task.completed && isSmartBoosted && (
            <div className="absolute -right-1 -top-1">
                <div className="bg-cyan-500 text-white rounded-full p-1 shadow-[0_0_10px_#06b6d4]">
                    <Zap size={10} fill="currentColor" />
                </div>
            </div>
        )}

        <button 
            onClick={() => toggleTask(task.id)}
            className="flex items-start flex-1 text-left gap-3 pl-3"
        >
            <div className="pt-1">
            {task.completed ? (
                <CheckCircle className="text-slate-600 shrink-0" size={24} />
            ) : (
                <Circle className={`${task.priority === 'high' ? 'text-red-500' : 'text-slate-500'} shrink-0`} size={24} />
            )}
            </div>
            <div className="flex-1">
            <span className={`text-base font-medium block ${task.completed ? 'text-slate-600 line-through' : 'text-slate-200'}`}>
                {task.title}
            </span>
            <div className="flex flex-wrap gap-3 mt-1.5">
                {(task.dueDate || task.time) && (
                    <span className={`text-[10px] font-mono flex items-center gap-1 ${task.completed ? 'text-slate-700' : 'text-slate-400'}`}>
                        <CalendarIcon size={10} />
                        {displayDate}
                        {task.time && ` @ ${task.time}`}
                    </span>
                )}
                
                {/* Alarm Icon */}
                {!task.completed && task.hasAlarm && (
                    <span className="text-[10px] font-mono text-orange-400 flex items-center gap-1">
                        <BellRing size={10} /> ALARM
                    </span>
                )}
                
                {/* Countdown Badge */}
                {!task.completed && timeLeft.text && (
                     <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-1 border transition-colors ${
                         timeLeft.text === 'OVERDUE' 
                            ? 'bg-red-900/20 text-red-500 border-red-900/50 animate-pulse' 
                            : timeLeft.urgent 
                                ? 'bg-orange-900/20 text-orange-400 border-orange-900/50 animate-pulse-fast' 
                                : 'bg-slate-800 text-slate-400 border-white/10'
                     }`}>
                         <Clock size={10} />
                         {timeLeft.text}
                     </span>
                )}
            </div>
            </div>
        </button>
        <button 
            onClick={() => deleteTask(task.id)}
            className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
            <Trash2 size={18} />
        </button>
    </div>
  );
};
