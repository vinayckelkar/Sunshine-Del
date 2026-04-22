import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Calendar as CalendarIcon,
  Search,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const mockStaff = [
  { id: 1, name: 'Pascal', role: 'Operations Head', status: 'Present', checkIn: '09:15 AM', location: 'Okhla Phase 3', avatar: 'P' },
  { id: 2, name: 'Aashish Ray', role: 'Execution Head', status: 'Present', checkIn: '10:02 AM', location: 'Office (HO)', avatar: 'AR' },
  { id: 3, name: 'Chetan Panchal', role: 'Production Head, BDP', status: 'On Leave', checkIn: '-', location: '-', avatar: 'CP' },
  { id: 4, name: 'Sagar Gurav', role: 'Partner', status: 'Clocked Out', checkIn: '09:00 AM', location: 'Office (HO)', avatar: 'SG' },
  { id: 5, name: 'Vinay Kelkar', role: 'Partner', status: 'Present', checkIn: '08:30 AM', location: 'Retail Hub', avatar: 'VK' },
  { id: 6, name: 'Abhijeet Kadam', role: 'Partner', status: 'Present', checkIn: '09:45 AM', location: 'In Transit', avatar: 'AK' },
];

export const Staff = () => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Attendance Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'On Duty Now', value: '12 / 15', icon: UserCheck, color: 'text-emerald-400' },
          { label: 'On Field Active', value: '5 Personnel', icon: MapPin, color: 'text-blue-400' },
          { label: 'Efficiency Index', value: '94%', icon: ShieldCheck, color: 'text-brand-gold' },
        ].map((stat, i) => (
          <div key={i} className="navy-panel p-5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-colors group">
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-2xl font-bold text-white tracking-tighter">{stat.value}</h4>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="navy-panel rounded-2xl overflow-hidden flex flex-col flex-grow">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/2">
          <div className="flex flex-col">
            <h3 className="font-bold text-white text-lg uppercase tracking-tight">Active Duty Roster</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Real-time personnel tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="FIND PERSONNEL..."
                className="bg-brand-navy-dark border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-brand-gold/50 w-48 transition-all"
              />
            </div>
            <button className="gold-gradient text-brand-navy-dark px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg">Check-in</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/2">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personnel</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Node Start</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Coords</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">System</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mockStaff.map((person) => (
                <tr key={person.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center text-brand-navy-dark font-black text-sm shadow-inner group-hover:scale-105 transition-transform">
                        {person.avatar}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-slate-200 group-hover:text-brand-gold transition-colors">{person.name}</span>
                        <span className="text-[10px] text-white/40 uppercase font-medium tracking-wider">{person.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`status-chip ${
                      person.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400' :
                      person.status === 'On Leave' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-500/20 text-slate-500'
                    }`}>
                      {person.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-white/60 text-xs font-mono font-bold">
                       {person.checkIn !== '-' ? <Clock className="w-3 h-3 text-brand-gold/60" /> : null} {person.checkIn}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-white/40 text-[10px] font-black uppercase tracking-tighter">
                      {person.location !== '-' && <MapPin className="w-3 h-3 text-brand-gold/40" />} {person.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-brand-gold transition-colors"><CalendarIcon className="w-4 h-4" /></button>
                      <button className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-brand-gold transition-all hover:translate-x-1"><ArrowRight className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
