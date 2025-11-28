
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
import { Sparkles, BellOff, AlertTriangle, X, Volume2, Mic, Power, Fingerprint, Activity } from 'lucide-react';
import { startAlarmLoop, stopAlarmLoop, playNotificationSound, playPCM, speakFallback, initializeAudio } from './services/sound';

const App: React.FC = () => {
  // --- APP MODE STATE ---
  const [appMode, setAppMode] = useState<'landing' | 'initializing' | 'running'>('landing');
  
  // --- DATA STATE ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ enableWelcome: true, enableSfx: true });
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // --- UI STATE ---
  const [feature, setFeature] = useState<Feature>('dashboard');
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeAlarmTask, setActiveAlarmTask] = useState<Task | null>(null);
  const [welcomeStatus, setWelcomeStatus] = useState<'idle' | 'speaking'>('idle');
  
  // --- REFS ---
  // We store the PROMISE here, so we can await it if the user clicks "Initialize" early
  const audioGenerationPromise = useRef<Promise<string | null> | null>(null);
  const hasStartedPreload = useRef(false);

  // 1. INITIAL LOAD & PRE-FETCHING (Runs on Landing Page)
  useEffect(() => {
    // Load local storage
    const t = loadFromStorage('tasks', []);
    const tx = loadFromStorage('transactions', []);
    setTasks(t);
    setTransactions(tx);
    setShoppingList(loadFromStorage('shopping', []));
    setNotes(loadFromStorage('notes', []));
    setContacts(loadFromStorage('contacts', []));
    const s = loadFromStorage('app_settings', { enableWelcome: true, enableSfx: true });
    setSettings(s);

    if (hasStartedPreload.current) return;
    hasStartedPreload.current = true;

    // Start Weather Fetch
    const fetchWeather = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
              const w = await getWeather(position.coords.latitude, position.coords.longitude);
              if (w) setWeather(w);
            },
            () => console.log("Loc failed"),
            { timeout: 3000 }
        );
      }
    };
    fetchWeather();

    // Start AI Generation (Background) - Store the Promise!
    if (s.enableWelcome) {
        const generateAudioTask = async () => {
            // Build context from loaded data (immediate access)
            const urgentCount = t.filter((task: Task) => task.priority === 'high' && !task.completed).length;
            const balance = tx.reduce((acc: number, curr: Transaction) => 
                curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0);
            
            const context = `
                Time: ${new Date().toLocaleTimeString()}.
                Urgent Tasks: ${urgentCount}.
                Balance: R${balance.toFixed(0)}.
            `;

            try {
                const text = await getWelcomeBriefing(context);
                if (text) {
                    const audio = await generateSpeech(text);
                    return audio; // Returns base64 string or null
                }
            } catch (e) {
                console.error("Pre-load failed", e);
            }
            return null;
        };
        
        // Assign the running promise to the ref
        audioGenerationPromise.current = generateAudioTask();
    }
  }, []);

  // 2. SYSTEM START (User Click)
  const handleSystemInitialize = async () => {
      // Unlock Audio Engine (User Interaction)
      await initializeAudio();
      
      // Switch Mode to Initializing UI
      setAppMode('initializing');

      // 1. Minimum "Loading" time for visual effect (2 seconds)
      const minDelayPromise = new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Wait for the Audio Generation to finish (if it hasn't already)
      let audioBase64: string | null = null;
      if (audioGenerationPromise.current) {
          try {
              audioBase64 = await audioGenerationPromise.current;
          } catch (e) {
              console.error("Audio generation error", e);
          }
      }

      // Ensure we waited at least 2 seconds
      await minDelayPromise;

      // Launch Dashboard
      setAppMode('running');

      // Play Audio (Logic runs after dashboard mount)
      setTimeout(async () => {
          if (audioBase64) {
              setWelcomeStatus('speaking');
              try {
                  await playPCM(audioBase64);
              } catch (e) {
                  console.error("PCM Playback failed, falling back", e);
                  speakFallback("Welcome back, Isaac. Systems online.");
              } finally {
                  setWelcomeStatus('idle');
              }
          } else {
              // Fallback if AI failed or API key missing
              speakFallback("Welcome back, Isaac. Systems online.");
          }
      }, 500); // Short delay to allow CSS fade-ins to start
  };

  // 3. PERSISTENCE & ALARM LOGIC (Runs continuously)
  useEffect(() => saveToStorage('tasks', tasks), [tasks]);
  useEffect(() => saveToStorage('transactions', transactions), [transactions]);
  useEffect(() => saveToStorage('shopping', shoppingList), [shoppingList]);
  useEffect(() => saveToStorage('notes', notes), [notes]);
  useEffect(() => saveToStorage('contacts', contacts), [contacts]);
  useEffect(() => saveToStorage('app_settings', settings), [settings]);

  useEffect(() => {
    if (appMode !== 'running') return;
    const timer = setInterval(() => {
      const now = new Date();
      let updated = false;
      const newTasks = tasks.map(t => {
        if (t.completed || !t.dueDate || !t.time) return t;
        const due = new Date(`${t.dueDate}T${t.time}`);
        const diffMs = due.getTime() - now.getTime();
        
        // 15 Min Warning
        if (diffMs > 0 && diffMs <= 15 * 60 * 1000 && !t.notifiedUpcoming) {
             if (settings.enableSfx) playNotificationSound();
             if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Upcoming: ${t.title}`, { body: '15 Minutes remaining' });
             }
             updated = true;
             return { ...t, notifiedUpcoming: true };
        }
        
        // Due Now
        if (diffMs <= 0 && diffMs > -60000 && !t.notifiedDue) {
             if (t.hasAlarm && settings.enableSfx) {
                 startAlarmLoop();
                 setActiveAlarmTask(t);
             } else if (settings.enableSfx) {
                 playNotificationSound();
             }
             updated = true;
             return { ...t, notifiedDue: true };
        }
        return t;
      });
      if (updated) setTasks(newTasks);
    }, 1000);
    return () => clearInterval(timer);
  }, [tasks, appMode, settings.enableSfx]);


  // --- RENDER LANDING PAGE ---
  if (appMode === 'landing') {
      return (
        <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center p-6 text-center z-[100]">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }}>
            </div>

            <div className="relative mb-12">
                <div className="w-40 h-40 rounded-full border border-cyan-500/30 flex items-center justify-center relative animate-[spin_12s_linear_infinite]">
                    <div className="absolute inset-2 border border-cyan-500/10 rounded-full border-dashed"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Fingerprint size={64} className="text-cyan-400 animate-pulse" strokeWidth={1} />
                </div>
                <div className="absolute -inset-10 bg-cyan-500/5 blur-3xl rounded-full animate-pulse-glow"></div>
            </div>

            <h1 className="text-4xl font-hud font-bold text-white tracking-[0.2em] mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">DAD'S ASSISTANT</h1>
            <p className="text-cyan-500/70 font-mono text-xs tracking-widest mb-16 uppercase">System v2.5 // Ready for Uplink</p>

            <button 
                onClick={handleSystemInitialize}
                className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-xl active:scale-95 transition-all"
            >
                <div className="absolute inset-0 w-full h-full bg-cyan-500/10 border border-cyan-500/50 group-hover:bg-cyan-500/20 transition-all"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee]"></div>
                <div className="relative flex items-center gap-3">
                    <Power className="text-cyan-400 group-hover:text-white transition-colors" size={20} />
                    <span className="font-hud font-bold text-xl text-cyan-300 group-hover:text-white tracking-widest">INITIALIZE SYSTEM</span>
                </div>
            </button>
            
            <div className="absolute bottom-8 text-[10px] text-slate-600 font-mono flex flex-col items-center gap-2">
                <Activity size={12} className="text-emerald-500/50" />
                <span>SECURE CONNECTION ESTABLISHED</span>
            </div>
        </div>
      );
  }

  // --- RENDER INITIALIZING SCREEN ---
  if (appMode === 'initializing') {
      return (
        <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center p-6 text-center z-[100]">
             {/* Background Grid */}
             <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }}>
            </div>

            <div className="relative mb-8">
                 {/* Spinning Outer Ring */}
                 <div className="w-24 h-24 rounded-full border-t-2 border-l-2 border-cyan-500 border-r-transparent border-b-transparent animate-spin"></div>
                 {/* Inner Pulse */}
                 <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-16 h-16 rounded-full bg-cyan-500/20 animate-pulse"></div>
                 </div>
            </div>

            <h2 className="text-2xl font-hud font-bold text-white tracking-[0.2em] mb-4 animate-pulse">INITIALIZING SYSTEM</h2>
            
            <div className="flex gap-2 justify-center items-center">
                 <div className="w-2 h-2 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                 <div className="w-2 h-2 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                 <div className="w-2 h-2 bg-cyan-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
            </div>

            <div className="mt-8 font-mono text-xs text-cyan-500/60 uppercase">
                <p className="mb-1">Loading Core Modules...</p>
                <p className="mb-1">Syncing AI Interface...</p>
                <p>Establishing Secure Uplink...</p>
            </div>
        </div>
      );
  }

  // --- RENDER MAIN APP ---
  return (
    <div className="bg-[#020617] min-h-screen text-slate-200 font-sans selection:bg-cyan-500/30 animate-in fade-in duration-1000">
      <div className="max-w-lg mx-auto min-h-screen relative bg-[#020617] shadow-2xl overflow-hidden">
        
        {/* Sci-Fi Grid Background */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)',
               backgroundSize: '40px 40px'
             }}>
        </div>

        {/* Audio Visualizer / Status */}
        {welcomeStatus === 'speaking' && (
             <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-2 pointer-events-none max-w-lg mx-auto">
                 <div className="bg-cyan-950/80 backdrop-blur-md border border-cyan-500/30 px-4 py-1.5 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-in slide-in-from-top-4">
                     <div className="flex gap-0.5 h-3 items-end">
                        <span className="w-1 bg-cyan-400 animate-[pulse_0.5s_ease-in-out_infinite]" style={{height: '60%'}}></span>
                        <span className="w-1 bg-cyan-400 animate-[pulse_0.4s_ease-in-out_infinite_0.1s]" style={{height: '100%'}}></span>
                        <span className="w-1 bg-cyan-400 animate-[pulse_0.6s_ease-in-out_infinite_0.2s]" style={{height: '40%'}}></span>
                        <span className="w-1 bg-cyan-400 animate-[pulse_0.5s_ease-in-out_infinite_0.3s]" style={{height: '80%'}}></span>
                     </div>
                     <span className="text-[9px] font-bold font-hud text-cyan-300 tracking-widest uppercase">
                         INCOMING TRANSMISSION...
                     </span>
                 </div>
             </div>
        )}

        <main className="h-full overflow-y-auto no-scrollbar scroll-smooth relative z-10">
          {feature === 'dashboard' && <Dashboard tasks={tasks} transactions={transactions} setFeature={setFeature} weather={weather} toggleSettings={() => setIsSettingsOpen(true)} />}
          {feature === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} weather={weather} />}
          {feature === 'money' && <Money transactions={transactions} setTransactions={setTransactions} />}
          {feature === 'shopping' && <Shopping items={shoppingList} setItems={setShoppingList} />}
          {feature === 'notes' && <Notes notes={notes} setNotes={setNotes} />}
          {feature === 'contacts' && <Contacts contacts={contacts} setContacts={setContacts} />}
        </main>

        <button
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-24 right-4 z-50 group"
        >
          <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-40 group-hover:opacity-70 transition-opacity animate-pulse"></div>
          <div className="relative bg-slate-900 border border-cyan-500/50 text-cyan-400 p-4 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-110 active:scale-95 transition-all">
            <Sparkles size={24} fill="currentColor" />
          </div>
        </button>

        <AIAssistant 
            isOpen={isAIOpen} 
            onClose={() => setIsAIOpen(false)} 
            tasks={tasks}
            transactions={transactions}
            shoppingList={shoppingList}
        />

        <BottomNav currentFeature={feature} setFeature={setFeature} />

        {/* ALARM OVERLAY */}
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
                  onClick={() => { stopAlarmLoop(); setActiveAlarmTask(null); }}
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
                          <p className="text-[10px] text-slate-500 font-mono">DAD'S ASSISTANT V2.5 // CHRIS AI</p>
                      </div>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default App;
