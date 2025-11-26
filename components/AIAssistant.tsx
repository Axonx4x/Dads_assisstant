
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Mic, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { getAIAdvice, generateSpeech } from '../services/gemini';
import { playPCM, speakFallback } from '../services/sound';
import { Task, Transaction, ShoppingItem } from '../types';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  transactions: Transaction[];
  shoppingList: ShoppingItem[];
}

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTIONS = [
  "What should I do first?",
  "Review my spending",
  "Check my shopping list",
  "I need motivation"
];

// Helper to handle typewriter effect
const TypewriterText: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, index + 1));
      index++;
      if (index > text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 20); // Speed of typing

    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayedText}
      <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse align-middle"></span>
    </span>
  );
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, tasks, transactions, shoppingList }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hi Dad! I'm here to help you organize your day. What's on your mind?" }
  ]);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading]);

  const speak = async (text: string) => {
      if (!ttsEnabled) return;
      
      setIsSpeaking(true);
      try {
        const audioBase64 = await generateSpeech(text);
        if (audioBase64) {
            await playPCM(audioBase64);
        } else {
            // Fallback to browser TTS if Gemini fails
            speakFallback(text);
        }
      } catch (e) {
        console.error("Failed to speak", e);
        speakFallback(text);
      } finally {
        setIsSpeaking(false);
      }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Voice input not supported in this browser.");
        return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-ZA'; // South African English

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        // Auto-send after a slight delay
        setTimeout(() => handleSend(transcript), 500);
    };

    recognition.start();
  };

  const handleSend = async (text: string = query) => {
    if (!text.trim()) return;

    const userMsg = text;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setLoading(true);

    // Prepare context
    const pendingTasks = tasks.filter(t => !t.completed);
    const balance = transactions.reduce((acc, t) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
    
    const context = `
      User: Isaac (Dad). Assistant: Chris AI.
      Tasks: ${pendingTasks.length} pending.
      Balance: R${balance}.
      Goal: Be concise, sci-fi/tech persona mixed with warm son-like advice.
    `;

    const aiResponse = await getAIAdvice(context, userMsg);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setLoading(false);
    
    // Trigger speech after text is received
    speak(aiResponse);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none">
      {/* Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm pointer-events-auto animate-fade-in" 
        onClick={onClose}
      ></div>
      
      {/* Modal Container */}
      <div className="bg-[#020617] w-full sm:w-[400px] h-[85vh] sm:h-[650px] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col pointer-events-auto animate-slide-up overflow-hidden border border-slate-800 relative ring-1 ring-cyan-500/30">
        
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
               backgroundSize: '30px 30px'
             }}>
        </div>
        
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-900/50 backdrop-blur-md text-white shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Sparkles size={18} className="text-cyan-300" />
            </div>
            <div>
              <h3 className="font-hud font-bold text-xl leading-tight tracking-wide">CHRIS AI</h3>
              <p className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">Assistant Core Online</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => setTtsEnabled(!ttsEnabled)} 
                className={`p-2 rounded-full transition-colors ${ttsEnabled ? 'text-cyan-400 bg-cyan-900/30' : 'text-slate-500'}`}
                title={ttsEnabled ? "Disable Voice" : "Enable Voice (Enhanced)"}
            >
                {isSpeaking ? <Loader2 size={20} className="animate-spin text-cyan-400"/> : (ttsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />)}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                <X size={24} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth relative z-10" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed shadow-lg backdrop-blur-md border ${
                msg.role === 'user' 
                  ? 'bg-cyan-600/20 border-cyan-500/30 text-cyan-50 rounded-br-none shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                  : 'bg-slate-800/60 border-white/10 text-slate-200 rounded-bl-none'
              }`}>
                {msg.role === 'ai' && <Bot size={14} className="mb-2 text-cyan-400 opacity-70" />}
                
                {/* Use Typewriter for latest AI message only */}
                {msg.role === 'ai' && idx === messages.length - 1 && !loading ? (
                    <TypewriterText text={msg.text} />
                ) : (
                    msg.text
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/60 p-4 rounded-2xl rounded-bl-none border border-white/10 flex items-center gap-2">
                <div className="flex items-center gap-1 h-4">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-0"></span>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-150"></span>
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-300"></span>
                </div>
                <span className="text-[10px] font-mono text-cyan-500/80 tracking-widest uppercase ml-2">Chris is typing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {!loading && messages.length < 3 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0 relative z-10">
                {SUGGESTIONS.map((suggestion) => (
                    <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="whitespace-nowrap px-4 py-2 bg-slate-800/50 border border-cyan-500/30 text-cyan-300 rounded-full text-xs font-bold hover:bg-cyan-500/10 active:scale-95 transition-all font-mono"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-white/10 shrink-0 safe-area-bottom bg-slate-900/50 backdrop-blur-md relative z-10">
          <div className="flex gap-3 items-center">
            <button
                onClick={startListening}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 border border-white/10'}`}
            >
                <Mic size={20} />
            </button>
            <div className="flex-1 relative">
                <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isListening ? "Listening..." : "Enter command..."}
                className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-4 pr-4 py-3.5 outline-none focus:ring-1 focus:ring-cyan-500/50 text-base text-white placeholder:text-slate-500 font-medium transition-all"
                />
            </div>
            <button 
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="bg-cyan-600/80 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-30 disabled:shadow-none active:scale-90 transition-all border border-cyan-400/30"
            >
              <Send size={20} fill="currentColor" className={query.trim() ? "translate-x-0.5" : ""} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
