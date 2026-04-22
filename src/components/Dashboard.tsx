import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Hammer, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', sales: 4000, jobs: 24 },
  { name: 'Tue', sales: 3000, jobs: 13 },
  { name: 'Wed', sales: 2000, jobs: 98 },
  { name: 'Thu', sales: 2780, jobs: 39 },
  { name: 'Fri', sales: 1890, jobs: 48 },
  { name: 'Sat', sales: 2390, jobs: 38 },
  { name: 'Sun', sales: 3490, jobs: 43 },
];

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
  <div className="navy-panel p-6 rounded-2xl relative overflow-hidden group hover:border-brand-gold/40 hover:bg-white/5 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={color}>
        <Icon className="w-6 h-6" />
      </div>
      <div className={`flex items-center gap-1 text-[10px] uppercase font-bold ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {trendValue}
      </div>
    </div>
    <h3 className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-1">{title}</h3>
    <p className="text-3xl font-bold text-white tracking-tighter">{value}</p>
    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
      <Icon className="w-20 h-20" />
    </div>
  </div>
);

export const Dashboard = () => {
  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <StatCard 
            title="Monthly Revenue (GST Inc.)" 
            value="₹24,82,450" 
            icon={TrendingUp} 
            trend="up" 
            trendValue="+12.4% from last month" 
            color="text-brand-gold"
          />
        </div>
        <StatCard 
          title="Active Projects" 
          value="42" 
          icon={Hammer} 
          trend="up" 
          trendValue="+3" 
          color="text-blue-400"
        />
        <StatCard 
          title="Low Stock Warning" 
          value="5" 
          icon={Package} 
          trend="down" 
          trendValue="-2" 
          color="text-red-400"
        />
      </div>

      {/* Main Bento Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-grow">
        <div className="lg:col-span-3 navy-panel p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Project Pipeline</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-medium">Real-time status tracking</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">Export</button>
              <button className="px-3 py-1 gold-gradient text-brand-navy-dark font-black rounded-lg text-[10px] uppercase tracking-wider shadow-lg hover:brightness-110 transition-all">+ New Job</button>
            </div>
          </div>
          
          <div className="flex-grow overflow-hidden">
             <table className="w-full text-left">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-white/5">
                <tr>
                  <th className="pb-3">Job Details</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Value</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { title: 'Hospital Glass Frosting', client: 'Apollo Clinics', status: 'In Progress', value: '₹84,000', statusColor: 'bg-orange-400/20 text-orange-400' },
                  { title: 'Lobby Branding Canvas', client: 'Taj Vivanta', status: 'Proofing', value: '₹1,12,000', statusColor: 'bg-blue-400/20 text-blue-400' },
                  { title: 'Façade Backlit Flex', client: 'Inox Cinemas', status: 'Completed', value: '₹45,500', statusColor: 'bg-emerald-400/20 text-emerald-400' },
                  { title: 'Office Reception Sign', client: 'Google GGM', status: 'Pending', value: '₹68,000', statusColor: 'bg-slate-500/20 text-slate-400' },
                ].map((job, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="py-4">
                      <p className="font-semibold text-white group-hover:text-brand-gold transition-colors">{job.title}</p>
                      <p className="text-[10px] text-white/30 uppercase">Signage & Prints</p>
                    </td>
                    <td className="py-4 font-medium text-white/70">{job.client}</td>
                    <td className="py-4 text-center">
                      <span className={`status-chip ${job.statusColor}`}>{job.status}</span>
                    </td>
                    <td className="py-4 text-right font-mono text-white tracking-widest">{job.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="navy-panel p-5 rounded-2xl flex flex-col gap-4 flex-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest gold-text">Inventory Alerts</h3>
            <div className="space-y-4">
              {[
                { name: 'Vinyl Matte 3M', alert: '80 sqft left', color: 'bg-red-900/50 text-red-200' },
                { name: 'Canvas HD 400g', alert: '2 Rolls left', color: 'bg-orange-900/50 text-orange-200' },
                { name: 'Sunboard 5mm', alert: '15 Pcs left', color: 'bg-red-900/50 text-red-200' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5 group hover:border-brand-gold/30 transition-all">
                  <span className="text-xs font-medium">{item.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${item.color}`}>{item.alert}</span>
                </div>
              ))}
            </div>
            <button className="mt-auto w-full py-3 bg-brand-gold text-brand-navy-dark text-[10px] font-black rounded-lg uppercase tracking-widest hover:brightness-110 shadow-lg transition-all">Refill Stock</button>
          </div>

          <div className="navy-panel p-5 rounded-2xl flex flex-col justify-between bg-gradient-to-br from-brand-navy to-[#152a4a]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest gold-text">Staff Presence</h3>
            <div className="space-y-3 my-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                <span className="text-xs font-semibold">Pascal - Site: Hyatt</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                <span className="text-xs font-semibold">Aashish Ray - Warehouse</span>
              </div>
              <div className="flex items-center gap-3 opacity-40">
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                <span className="text-xs font-medium">Chetan Panchal - Off-duty</span>
              </div>
            </div>
            <div className="text-[10px] font-bold text-white/40 border-t border-white/5 pt-3 uppercase tracking-widest">6/8 Personnel On-site</div>
          </div>
        </div>
      </div>
    </div>
  );
};
