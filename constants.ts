import { ChartPie, CheckSquare, Contact, Home, NotebookPen, ShoppingCart } from 'lucide-react';

export const APP_NAME = "Isaac's Assistant";
export const USER_NAME = "Isaac";
export const SON_NAME = "Chris";
export const CURRENCY = "R";

export const COLORS = {
  primary: '#3b82f6', // Blue 500
  accent: '#06b6d4',  // Cyan 500
  bg: '#020617',      // Slate 950
  glass: 'rgba(30, 41, 59, 0.4)',
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'CMD', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'money', label: 'Finance', icon: ChartPie },
  { id: 'shopping', label: 'Shop', icon: ShoppingCart },
  { id: 'notes', label: 'Logs', icon: NotebookPen },
  { id: 'contacts', label: 'Link', icon: Contact },
] as const;

export const TRANSACTION_CATEGORIES = [
  'Job Payment',
  'Materials',
  'Transport',
  'Groceries',
  'Bills',
  'Dining',
  'Other',
];