/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  TrendingUp, 
  Hammer, 
  Users, 
  Bell, 
  Settings,
  Plus,
  Search,
  Menu,
  X,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Real Module Components
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Sales } from './components/Sales';
import { Purchases } from './components/Purchases';
import { Jobs } from './components/Jobs';
import { Staff } from './components/Staff';

type Page = 'dashboard' | 'inventory' | 'sales' | 'purchases' | 'jobs' | 'staff';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { signInWithGoogle } from './lib/firebase';

function AppContent() {
  const { user, loading, logout, isAdmin, isStaff, isAccountant } = useAuth();
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-brand-navy">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
          <p className="text-[10px] gold-text uppercase font-black tracking-widest">Hydrating Sunshyne Core...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020C1B] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05),transparent_50%)]" />
        <div className="navy-panel p-10 rounded-3xl border border-brand-gold/20 flex flex-col items-center gap-8 max-w-md w-full relative z-10 shadow-2xl">
          <div className="text-center">
             <div className="w-20 h-20 bg-brand-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-gold/20">
               <TrendingUp className="w-10 h-10 text-brand-gold" />
             </div>
             <h1 className="text-3xl font-black gold-text uppercase tracking-tighter mb-2 underline decoration-brand-gold/30 underline-offset-8">Sunshyne Suite</h1>
             <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">LLP Enterprise Management System</p>
          </div>
          
          <button 
            onClick={() => signInWithGoogle()}
            className="w-full py-4 gold-gradient text-brand-navy-dark font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all"
          >
            <Users className="w-5 h-5" />
            Authenticate via Google
          </button>
          
          <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] text-center">Protected by Sunshyne Security Protocol v2.4</p>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'staff', 'accountant'] },
    { name: 'Inventory', id: 'inventory', icon: Package, roles: ['admin', 'staff'] },
    { name: 'Sales & Ledger', id: 'sales', icon: TrendingUp, roles: ['admin', 'accountant'] },
    { name: 'Purchases & Bills', id: 'purchases', icon: Package, roles: ['admin', 'accountant'] },
    { name: 'Job Management', id: 'jobs', icon: Hammer, roles: ['admin', 'staff'] },
    { name: 'Staff & Attendance', id: 'staff', icon: Users, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item => {
    if (isAdmin) return true;
    if (isStaff && item.roles.includes('staff')) return true;
    if (isAccountant && item.roles.includes('accountant')) return true;
    return false;
  });

  return (
    <div className="flex h-screen bg-brand-navy-dark text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative flex flex-col border-r border-white/5 bg-brand-navy z-20"
      >
        <div className="p-6 flex items-center gap-4 border-b border-white/5 overflow-hidden whitespace-nowrap">
          <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-brand-navy-dark font-bold text-xl font-serif">S</span>
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight gold-text">SUNSHYNE</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Grafix LLP</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id as Page)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
                  isActive 
                    ? "bg-white/10 text-brand-gold border border-brand-gold/20" 
                    : "hover:bg-white/5 text-white/60 hover:text-brand-gold"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-brand-gold" : "text-brand-gold/60 group-hover:text-brand-gold")} />
                {isSidebarOpen && <span className="font-semibold whitespace-nowrap text-sm uppercase tracking-wide">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-[8px] text-white/20 uppercase tracking-widest">Sunshyne Grafix LLP Core</p>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-brand-gold"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold gold-text uppercase tracking-tighter">
                {navigation.find(n => n.id === activePage)?.name}
              </h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Sunshyne Command Center | {isAdmin ? 'Admin' : isAccountant ? 'Accountant' : 'Staff'}</p>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{user?.displayName || 'Administrator'}</p>
              <p className="text-[10px] opacity-50 uppercase tracking-tighter">Verified Access</p>
            </div>
            <button 
              onClick={() => logout()}
              className="w-10 h-10 rounded-full border border-brand-gold p-0.5 shadow-lg group cursor-pointer hover:scale-105 transition-all bg-white/5 flex items-center justify-center"
            >
              <LogOut className="w-5 h-5 text-brand-gold" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activePage === 'dashboard' && <Dashboard />}
                {activePage === 'inventory' && <Inventory />}
                {activePage === 'sales' && <Sales />}
                {activePage === 'purchases' && <Purchases />}
                {activePage === 'jobs' && <Jobs />}
                {activePage === 'staff' && <Staff />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
