
export type Feature = 'dashboard' | 'tasks' | 'money' | 'shopping' | 'notes' | 'contacts';

export interface AppSettings {
  enableWelcome: boolean;
  enableSfx: boolean;
}

export interface Task {
  id: string;
  title: string;
  date: string; // Creation date
  dueDate?: string; // Target completion date (YYYY-MM-DD)
  time?: string; // HH:mm format
  completed: boolean;
  priority: 'normal' | 'high';
  hasAlarm?: boolean; // User set alarm
  notifiedUpcoming?: boolean; // System flag: 15 min warning sent
  notifiedDue?: boolean; // System flag: Deadline reached
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  time: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  quantity?: string;
  category: 'Home' | 'Work' | 'Business';
}

export interface Note {
  id: string;
  title: string;
  content: string;
  isLocked: boolean;
  date: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  role: string;
  note?: string;
}

export interface WeatherData {
  temperature: number;
  weatherCode: number;
}
