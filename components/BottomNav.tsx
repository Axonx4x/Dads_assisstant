import React from 'react';
import { NAV_ITEMS } from '../constants';
import { Feature } from '../types';

interface BottomNavProps {
  currentFeature: Feature;
  setFeature: (f: Feature) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentFeature, setFeature }) => {
  return (
    <div className="fixed bottom-6 left-4 right-4 z-50">
      <div className="glass-nav h-16 rounded-2xl flex justify-around items-center px-2 shadow-2xl shadow-black/50 ring-1 ring-white/10">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentFeature === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setFeature(item.id as Feature)}
              className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${
                isActive ? '-translate-y-1' : ''
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                  isActive ? 'bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-transparent'
              }`}>
                <Icon 
                    size={isActive ? 22 : 20} 
                    className={`transition-colors duration-300 ${
                        isActive ? 'text-blue-400 fill-blue-400/20' : 'text-slate-500'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2} 
                />
              </div>
              
              {isActive && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_#60a5fa]"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};