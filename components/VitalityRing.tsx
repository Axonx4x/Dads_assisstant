import React from 'react';

interface VitalityRingProps {
  percentage: number;
  label: string;
  subLabel: string;
  color?: string;
}

export const VitalityRing: React.FC<VitalityRingProps> = ({ percentage, label, subLabel, color = '#3b82f6' }) => {
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
        {/* Outer Decor Ring */}
        <div className="absolute inset-0 border border-slate-800/50 rounded-full animate-spin-slow opacity-30 border-t-blue-500/50"></div>
        
        {/* SVG Chart */}
        <svg
            height={radius * 2}
            width={radius * 2}
            className="rotate-[-90deg] drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]"
        >
            <circle
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={stroke}
            fill="transparent"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            />
            <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-out' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            />
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-hud font-bold text-white tracking-tighter">
                {Math.round(percentage)}%
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                {label}
            </span>
            <span className="text-[9px] text-slate-500 mt-0.5">
                {subLabel}
            </span>
        </div>
    </div>
  );
};