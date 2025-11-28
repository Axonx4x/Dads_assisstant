

import React, { useState, useEffect, useRef } from 'react';
import { Feature, Task, Transaction, ShoppingItem, Note, Contact, WeatherData, AppSettings } from './types';
import { loadFromStorage, saveToStorage } from './services/storage';
import { getWeather } from './services/weather';
import { getWelcomeBriefing, generateSpeech } from './services/gemini';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Money } from './pages/Money';
import { Shopping } from './pages/Shopping';
import { Notes } from './pages/Notes';
import { Contacts } from './pages/Contacts';
import { AIAssistant } from './components/AIAssistant';
import { Sparkles, BellOff, AlertTriangle, X, Volume2, Mic, Zap, Info, Loader2, Power } from 'lucide-react';
import { startAlarmLoop, stopAlarmLoop, playNotificationSound, playPCM, speakFallback, initializeAudio, isAudioContextSuspended } from './services/sound';

const App: React.FC = () => {
  const [feature, setFeature] = useState<Feature>('dashboard');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    enableWelcome: true,
    enableSfx: true
  });

  // Global Logic State
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [activeAlarmTask, setActiveAlarmTask] = useState<Task | null>(null);
  const [welcomeStatus, setWelcomeStatus] = useState<'idle' | 'initializing' | 'speaking' | 'ready'>('idle');
  const [showStartOverlay, setShowStartOverlay] = useState(false);
  
  const hasWelcomeRun = useRef(false);
  const queuedAudioRef = useRef<string | null>(null);

  // Global Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Function to handle the first tap "System Initialization"
  const handleSystemStart = async () => {
      await initializeAudio();
      setShowStartOverlay(false);
      
      if (queuedAudioRef.current) {
          setWelcomeStatus('speaking');
          try {
            await playPCM(queuedAudioRef.current);
          } catch(e) {
            console.error("Playback failed after unlock", e);
          }
          queuedAudioRef.current = null;
          setWelcomeStatus('idle');
      }
  };

  // Load Data on Mount
  useEffect(() => {
    // Load state from storage
    const loadedTasks = loadFromStorage('tasks', []);
    const loadedTransactions = loadFromStorage('transactions', []);
    setTasks(loadedTasks);
    setTransactions(loadedTransactions);
    setShoppingList(loadFromStorage('shopping', []));
    setNotes(loadFromStorage('notes', []));
    setContacts(loadFromStorage('contacts', []));
    
    const savedSettings = loadFromStorage('app_settings', { enableWelcome: true, enableSfx: true });
    setSettings(savedSettings);

    // Weather Fetch with Promise
    const fetchWeather = async () => {
      if (navigator.geolocation) {
        return new Promise<WeatherData | null>((resolve) => {
           navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const w = await getWeather(latitude, longitude);
              if (w) setWeather(w);
              resolve(w);
            },
            () => resolve(null),
            { timeout: 4000 }
          );
        });
      }
      return null;
    };

    // --- IMMEDIATE WELCOME LOGIC ---
    if (savedSettings.enableWelcome && !hasWelcomeRun.current) {
        hasWelcomeRun.current = true;
        setWelcomeStatus('initializing');

        const runWelcomeSequence = async () => {
            // 1. Wait for weather briefly (max 200ms)
            const weatherPromise = fetchWeather();
            const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 200));
            const initialWeather = await Promise.race([weatherPromise, timeoutPromise]);

            // 2. Build Context
            const urgentCount = loadedTasks.filter((t: Task) => t.priority === 'high' && !t.completed).length;
            const pendingCount = loadedTasks.filter((t: Task) => !t.completed).length;
            const totalIncome = loadedTransactions.reduce((sum: number, t: Transaction) => t.type === 'income' ? sum + t.amount : sum, 0);
            const totalExpense = loadedTransactions.reduce((sum: number, t: Transaction) => t.type === 'expense' ? sum + t.amount : sum, 0);
            const balance = totalIncome - totalExpense;

            let weatherCtx = "Sensors calibrating...";
            if (initialWeather) {
                weatherCtx = `Code: ${initialWeather.weatherCode}, Temp: ${initialWeather.temperature}°C`;
            }

            const context = `
                Time: ${new Date().toLocaleTimeString()}.
                Weather: ${weatherCtx}.
                Urgent: ${urgentCount}.
                Pending: ${pendingCount}.
                Balance: R${balance.toFixed(2)}.
            `;

            // 3. Generate Audio
            try {
                const text = await getWelcomeBriefing(context);
                if (text) {
                    const audio = await generateSpeech(text);
                    if (audio) {
                        // Check if we need to unlock audio
                        if (isAudioContextSuspended()) {
                            console.log("Audio locked. Showing Start Overlay.");
                            queuedAudioRef.current = audio;
                            setShowStartOverlay(true);
                            setWelcomeStatus('ready');
                        } else {
                            // Audio is already unlocked (rare on first load, but possible on reload sometimes)
                            setWelcomeStatus('speaking');
                            await playPCM(audio);
                            setWelcomeStatus('idle');
                        }
                    } else {
                        speakFallback(text);
                        setWelcomeStatus('idle');
                    }
                }
            } catch (e) {
                console.error("Welcome sequence failed", e);
                setWelcomeStatus('idle');
            }
        };

        runWelcomeSequence();
    } else {
        fetchWeather();
    }
  }, []);

  // Monitor Time for Notifications/Alarms
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      let updated = false;
      const newTasks = tasks.map(t => {
        if (t.completed || !t.dueDate || !t.time) return t;

        const dueDateTime = new Date(`${t.dueDate}T${t.time}`);
        const diffMs = dueDateTime.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes <= 15 && diffMinutes > 0 && !t.notifiedUpcoming) {
          if (settings.enableSfx) playNotificationSound();
          if ('Notification' in window && Notification.permission === 'granted') {
             new Notification(`Upcoming Task: ${t.title}`, { body: `Due in ${diffMinutes} minutes`, icon: '/icon.png' });
          }
          updated = true;
          return { ...t, notifiedUpcoming: true };
        }

        if (diffMs <= 0 && diffMs > -60000 && !t.notifiedDue) {
          if (t.hasAlarm && settings.enableSfx) {
             startAlarmLoop();
             setActiveAlarmTask(t);
          } else if (settings.enableSfx) {
             playNotificationSound();
          }
          
          if ('Notification' in window && Notification.permission === 'granted') {
             new Notification(`TASK DUE: ${t.title}`, { body: `The deadline has been reached.`, icon: '/icon.png' });
          }
          updated = true;
          return { ...t, notifiedDue: true };
        }

        return t;
      });

      if (updated) {
        setTasks(newTasks);
      }
    }, 1000); 

    return () => clearInterval(timer);
  }, [tasks, settings.enableSfx]);

  // Persist Data Logic...
  useEffect(() => saveToStorage('tasks', tasks), [tasks]);
  useEffect(() => saveToStorage('transactions', transactions), [transactions]);
  useEffect(() => saveToStorage('shopping', shoppingList), [shoppingList]);
  useEffect(() => saveToStorage('notes', notes), [notes]);
  useEffect(() => saveToStorage('contacts', contacts), [contacts]);
  useEffect(() => saveToStorage('app_settings', settings), [settings]);

  const stopAlarm = () => {
    stopAlarmLoop();
    setActiveAlarmTask(null);
  };

  const renderContent = () => {
    switch (feature) {
      case 'dashboard':
        return <Dashboard tasks={tasks} transactions={transactions} setFeature={setFeature} weather={weather} toggleSettings={() => setIsSettingsOpen(true)} />;
      case 'tasks':
        return <Tasks tasks={tasks} setTasks={setTasks} weather={weather} />;
      case 'money':
        return <Money transactions={transactions} setTransactions={setTransactions} />;
      case 'shopping':
        return <Shopping items={shoppingList} setItems={setShoppingList} />;
      case 'notes':
        return <Notes notes={notes} setNotes={setNotes} />;
      case 'contacts':
        return <Contacts contacts={contacts} setContacts={setContacts} />;
      default:
        return <Dashboard tasks={tasks} transactions={transactions} setFeature={setFeature} weather={weather} toggleSettings={() => setIsSettingsOpen(true)} />;
    }
  };

  return (
    <div className="bg-[#020617] min-h-screen text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="max-w-lg mx-auto min-h-screen relative bg-[#020617] shadow-2xl overflow-hidden">
        
        {/* Sci-Fi Grid Background */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }}>
        </div>
        
        {/* SYSTEM START OVERLAY (Fixes Autoplay Policy) */}
        {showStartOverlay && (
            <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center cursor-pointer animate-in fade-in duration-500" onClick={handleSystemStart}>
                <div className="relative">
                    <div className="w-32 h-32 rounded-full border-2 border-cyan-500/30 animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Power size={48} className="text-cyan-400 animate-pulse" />
                    </div>
                    <div className="absolute -inset-4 border border-cyan-500/10 rounded-full animate-ping"></div>
                </div>
                <h1 className="mt-8 text-2xl font-hud font-bold text-white tracking-[0.3em] text-center">SYSTEM READY</h1>
                <p className="mt-2 text-cyan-500/70 font-mono text-xs animate-pulse tracking-widest">[ TAP TO INITIALIZE ]</p>
                
                <div className="absolute bottom-10 text-slate-600 text-[10px] font-mono">
                    SECURE CONNECTION ESTABLISHED
                </div>
            </div>
        )}

        {/* System Status Bar */}
        {(welcomeStatus === 'initializing' || welcomeStatus === 'speaking') && !showStartOverlay && (
             <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-2 pointer-events-none max-w-lg mx-auto">
                 <div className="bg-cyan-950/80 backdrop-blur-md border border-cyan-500/30 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-in slide-in-from-top-full duration-500">
                     <div className="flex gap-1 h-2 items-center">
                        <span className="w-0.5 h-2 bg-cyan-400 animate-pulse"></span>
                        <span className="w-0.5 h-3 bg-cyan-400 animate-pulse delay-75"></span>
                        <span className="w-0.5 h-2 bg-cyan-400 animate-pulse delay-150"></span>
                     </div>
                     <span className="text-[9px] font-bold font-hud text-cyan-300 tracking-widest uppercase">
                         {welcomeStatus === 'initializing' ? 'INITIALIZING VOICE SYSTEM...' : 'AUDIO TRANSMISSION...'}
                     </span>
                 </div>
             </div>
        )}

        {/* Main Content Area */}
        <main className="h-full overflow-y-auto no-scrollbar scroll-smooth relative z-10">
          {renderContent()}
        </main>

        {/* AI Assistant FAB */}
        <button
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-24 right-4 z-50 group"
        >
          <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 group-hover:opacity-70 transition-opacity animate-pulse"></div>
          <div className="relative bg-slate-900 border border-cyan-500/50 text-cyan-400 p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-110 active:scale-95 transition-all">
            <Sparkles size={24} fill="currentColor" />
          </div>
        </button>

        {/* AI Assistant Modal */}
        <AIAssistant 
            isOpen={isAIOpen} 
            onClose={() => setIsAIOpen(false)} 
            tasks={tasks}
            transactions={transactions}
            shoppingList={shoppingList}
        />

        {/* Navigation */}
        <BottomNav currentFeature={feature} setFeature={setFeature} />

        {/* ALARM OVERLAY HUD */}
        {activeAlarmTask && (
          <div className="fixed inset-0 z-[100] bg-red-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-300">
             <div className="absolute inset-0 border-[20px] border-red-500/20 animate-pulse"></div>
             <div className="bg-slate-950 p-8 rounded-3xl border border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] text-center max-w-sm w-full relative z-10">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-[0_0_30px_#ef4444]">
                    <AlertTriangle size={40} className="text-red-500" />
                </div>
                <h2 className="text-3xl font-hud font-bold text-white mb-2 tracking-wider">ALERT</h2>
                <p className="text-red-400 font-mono text-sm uppercase tracking-widest mb-6">Deadline Reached</p>
                <div className="text-xl text-white font-bold mb-8">"{activeAlarmTask.title}"</div>
                <button 
                  onClick={stopAlarm}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold font-hud rounded-xl text-xl tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                  <BellOff /> DISMISS
                </button>
             </div>
          </div>
        )}

        {/* SETTINGS MODAL */}
        {isSettingsOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
                 <div className="bg-slate-900 border border-white/10 w-full max-w-xs p-6 rounded-3xl relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-hud font-bold text-xl text-white tracking-wide">SYSTEM CONFIG</h3>
                          <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                      </div>
                      
                      <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                  <Mic className="text-cyan-400" size={20} />
                                  <span className="text-sm font-medium">Voice Welcome</span>
                              </div>
                              <button 
                                onClick={() => setSettings(s => ({...s, enableWelcome: !s.enableWelcome}))}
                                className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableWelcome ? 'bg-cyan-600' : 'bg-slate-700'}`}
                              >
                                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.enableWelcome ? 'left-7' : 'left-1'}`}></div>
                              </button>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                  <Volume2 className="text-purple-400" size={20} />
                                  <span className="text-sm font-medium">Sound Effects</span>
                              </div>
                              <button 
                                onClick={() => setSettings(s => ({...s, enableSfx: !s.enableSfx}))}
                                className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableSfx ? 'bg-purple-600' : 'bg-slate-700'}`}
                              >
                                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.enableSfx ? 'left-7' : 'left-1'}`}></div>
                              </button>
                          </div>
                          
                          <div className="p-3 bg-slate-800/30 rounded-xl border border-white/5 mt-4">
                              <h4 className="text-xs font-bold text-cyan-500 uppercase mb-2 font-hud">Installation Guide</h4>
                              <ul className="text-[10px] text-slate-400 space-y-2 list-disc pl-3">
                                  <li><strong>iOS (iPhone):</strong> Tap Share (box with arrow) → Add to Home Screen.</li>
                                  <li><strong>Android:</strong> Tap Menu (3 dots) → Install App / Add to Home Screen.</li>
                              </ul>
                          </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/10 text-center">
                          <p className="text-[10px] text-slate-500 font-mono">DAD'S ASSISTANT V2.1 // CHRIS AI</p>
                      </div>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default App;
