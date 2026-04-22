import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Trash2,
  Edit,
  Download,
  Printer,
  X,
  TrendingDown,
  Loader2,
  FileText,
  CreditCard,
  Briefcase,
  RotateCcw,
  Users,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { salesService, type Transaction } from '../services/salesService';
import { inventoryService, type Product } from '../services/inventoryService';
import { vendorService, type Vendor } from '../services/vendorService';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Modal for selecting transaction type
interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: any) => void;
}

function SelectionModal({ isOpen, onClose, onSelect }: SelectionModalProps) {
  const types = [
    { type: 'Purchase Bill', icon: FileText, label: 'Record Purchase Bill', desc: 'Standard bill/invoice from your vendor' },
    { type: 'Expense', icon: Briefcase, label: 'Record Expense', desc: 'General office or factory expenses' },
    { type: 'Vendor Payment', icon: CreditCard, label: 'Record Payment', desc: 'Money sent to a vendor for bills' },
    { type: 'Purchase Return', icon: RotateCcw, label: 'Purchase Return', desc: 'Goods returned to vendor (Debit Note)' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-navy-dark/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-brand-navy border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black gold-text uppercase tracking-tighter">Choose Purchase Action</h3>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Step 1: Select entry flow</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400"><X /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {types.map((t) => (
                <button
                  key={t.type}
                  onClick={() => onSelect(t.type)}
                  className="flex flex-col gap-3 p-6 bg-white/5 border border-white/5 hover:border-brand-gold/30 hover:bg-white/10 rounded-2xl text-left transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 group-hover:scale-110 transition-transform">
                    <t.icon className="w-6 h-6 text-brand-gold" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 group-hover:text-brand-gold transition-colors">{t.label}</h4>
                    <p className="text-[10px] text-slate-500 uppercase mt-1 leading-relaxed">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Purchases() {
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeView, setActiveView] = useState<'transactions' | 'vendors'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Purchase Bill' | 'Expense' | 'Vendor Payment' | 'Purchase Return'>('All');

  // Form State
  const [formData, setFormData] = useState<Omit<Transaction, 'id'>>({
    type: 'Purchase Bill',
    number: `PUR-${Date.now().toString().slice(-6)}`,
    vendorName: '',
    vendorId: '',
    date: new Date().toISOString().split('T')[0],
    subtotal: 0,
    totalGst: 0,
    totalAmount: 0,
    status: 'Pending',
    roundOff: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    items: [{ id: Date.now().toString(), name: '', quantity: 1, rate: 0, amount: 0, gstPercent: 18, productId: '' }]
  });

  const [vendorFormData, setVendorFormData] = useState<Omit<Vendor, 'id'>>({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    category: 'General',
    paymentTerms: 'Net 30'
  });

  useEffect(() => {
    const unsubTransactions = salesService.subscribeToTransactions((data) => {
      const purchaseTypes = ['Purchase Bill', 'Expense', 'Vendor Payment', 'Purchase Return'];
      setPurchases(data.filter(t => purchaseTypes.includes(t.type)));
      setLoading(false);
    });

    const unsubVendors = vendorService.subscribeToVendors((data) => {
      setVendors(data);
    });

    const unsubProducts = inventoryService.subscribeToProducts((data) => {
      setProducts(data);
    });

    return () => {
      unsubTransactions();
      unsubVendors();
      unsubProducts();
    };
  }, []);

  const calculateTotals = (items: any[]) => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    const totalGst = items.reduce((acc, item) => acc + ((item.quantity * item.rate * item.gstPercent) / 100), 0);
    return { subtotal, totalGst, total: subtotal + totalGst };
  };

  const handleAddItem = () => {
    const newItems = [...(formData.items || []), { id: Date.now().toString(), name: '', quantity: 1, rate: 0, amount: 0, gstPercent: 18, productId: '' }];
    const { subtotal, totalGst, total } = calculateTotals(newItems);
    setFormData({ ...formData, items: newItems, subtotal, totalGst, totalAmount: total });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...(prev.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].rate || 0);
      
      const { subtotal, totalGst, total } = calculateTotals(newItems);
      return { 
        ...prev, 
        items: newItems, 
        subtotal, 
        totalGst, 
        totalAmount: total 
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const transactionId = await salesService.createTransaction(formData);
      
      // Update inventory for Purchase Bills & Returns
      if (formData.type === 'Purchase Bill' || formData.type === 'Purchase Return') {
        const adjustmentType = formData.type === 'Purchase Bill' ? 'PURCHASE' : 'OUT';
        const adjustments = formData.items
          .filter(item => item.productId)
          .map(item => ({
            id: item.productId,
            amount: formData.type === 'Purchase Bill' ? item.quantity : -item.quantity,
            type: adjustmentType as any,
            note: `Ref: ${formData.number}`,
            referenceId: transactionId
          }));

        if (adjustments.length > 0) {
          await inventoryService.bulkAdjustStock(adjustments, { name: 'System' });
        }
      }

      setIsModalOpen(false);
      setFormData({
        type: 'Purchase Bill',
        number: `PUR-${Date.now().toString().slice(-6)}`,
        vendorName: '',
        vendorId: '',
        date: new Date().toISOString().split('T')[0],
        subtotal: 0,
        totalGst: 0,
        totalAmount: 0,
        status: 'Pending',
        roundOff: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        items: [{ id: Date.now().toString(), name: '', quantity: 1, rate: 0, amount: 0, gstPercent: 18, productId: '' }]
      });
    } catch (err) {
      console.error(err);
      alert('Failed to save purchase');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!id) return;
    if (window.confirm('Delete this purchase transaction?')) {
      try {
        await salesService.deleteTransaction(id);
      } catch (err: any) {
        console.error('Delete failed:', err);
        alert(`Deletion failed: ${err.message || 'Check permissions'}`);
      }
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = (p.vendorName || p.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'All' || p.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.gstin || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, vendorFormData);
      } else {
        await vendorService.createVendor(vendorFormData);
      }
      setIsVendorModalOpen(false);
      setEditingVendor(null);
      setVendorFormData({
        name: '', email: '', phone: '', gstin: '', address: '', category: 'General', paymentTerms: 'Net 30'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to save vendor');
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorFormData({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone || '',
      gstin: vendor.gstin || '',
      address: vendor.address || '',
      category: vendor.category || 'General',
      paymentTerms: vendor.paymentTerms || 'Net 30'
    });
    setIsVendorModalOpen(true);
  };

  const handleDeleteVendor = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await vendorService.deleteVendor(id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete vendor');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex bg-brand-navy-dark p-1 rounded-2xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveView('transactions')}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all",
            activeView === 'transactions' ? "bg-brand-gold text-brand-navy-dark" : "text-white/40 hover:text-white"
          )}
        >
          <FileText className="w-4 h-4" />
          Transactions
        </button>
        <button
          onClick={() => setActiveView('vendors')}
          className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all",
            activeView === 'vendors' ? "bg-brand-gold text-brand-navy-dark" : "text-white/40 hover:text-white"
          )}
        >
          <Users className="w-4 h-4" />
          Vendors
        </button>
      </div>

      {activeView === 'transactions' && (
        <>
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Purchases" 
          amount={`₹${purchases.reduce((acc, curr) => acc + curr.totalAmount, 0).toLocaleString()}`}
          icon={TrendingDown}
          color="text-red-400"
        />
        <StatsCard 
          title="Pending Payments" 
          amount={`₹${purchases.filter(p => ['Pending', 'Unpaid'].includes(p.status)).reduce((acc, curr) => acc + curr.totalAmount, 0).toLocaleString()}`}
          icon={Clock}
          color="text-amber-400"
        />
        <StatsCard 
          title="Input GST Credit" 
          amount={`₹${purchases.reduce((acc, curr) => acc + (curr.totalGst || 0), 0).toLocaleString()}`}
          icon={CheckCircle2}
          color="text-emerald-400"
        />
        <StatsCard 
          title="Misc Expenses" 
          amount={`₹${purchases.filter(p => p.type === 'Expense').reduce((acc, curr) => acc + curr.totalAmount, 0).toLocaleString()}`}
          icon={AlertCircle}
          color="text-blue-400"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between navy-panel p-4 rounded-2xl border border-white/5">
        <div className="flex bg-white/5 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {['All', 'Purchase Bill', 'Expense', 'Vendor Payment', 'Purchase Return'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab ? "bg-brand-gold text-brand-navy-dark" : "text-white/40 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search vendor or bill..."
              className="w-full pl-10 pr-4 py-2 bg-brand-navy-dark border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold/50 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsSelectionModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-2 gold-gradient text-brand-navy-dark rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-brand-gold/10 whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            New Transaction
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
        </div>
      ) : (
        <div className="navy-panel rounded-3xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                  <th className="px-6 py-4">Transaction</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{p.number}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{p.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{p.vendorName || p.clientName}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {p.date}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-200">
                      ₹{p.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status as any} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-brand-gold/10 rounded-lg text-slate-400 hover:text-brand-gold transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTransaction(p.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )}
      {/* Transaction Entry Modal remains same but with vendor dropdown */}

      {/* Vendors View */}
      {activeView === 'vendors' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between navy-panel p-4 rounded-2xl border border-white/5">
            <h2 className="text-xl font-black gold-text uppercase tracking-tighter ml-2">Vendor Directory</h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search vendors..."
                  className="w-full pl-10 pr-4 py-2 bg-brand-navy-dark border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold/50 text-sm border-white/5"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={() => {
                  setEditingVendor(null);
                  setVendorFormData({
                    name: '', email: '', phone: '', gstin: '', address: '', category: 'General', paymentTerms: 'Net 30'
                  });
                  setIsVendorModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-6 py-2 gold-gradient text-brand-navy-dark rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-brand-gold/10 whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Add Vendor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVendors.map((vendor) => (
              <motion.div 
                key={vendor.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="navy-panel p-6 rounded-3xl border border-white/5 group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => handleEditVendor(vendor)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-brand-gold">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteVendor(vendor.id)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-brand-gold" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 tracking-tight leading-tight">{vendor.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-slate-400 font-bold uppercase tracking-widest">{vendor.category}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full text-brand-gold font-bold uppercase tracking-widest">{vendor.paymentTerms}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Mail className="w-4 h-4 opacity-30" />
                    <span className="truncate">{vendor.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <Phone className="w-4 h-4 opacity-30" />
                    <span>{vendor.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-slate-400">
                    <MapPin className="w-4 h-4 mt-1 opacity-30" />
                    <span className="leading-tight line-clamp-2">{vendor.address || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GSTIN</p>
                    <p className="text-xs font-mono text-slate-300 mt-0.5">{vendor.gstin || 'UNREGISTERED'}</p>
                  </div>
                  <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredVendors.length === 0 && (
            <div className="text-center py-20 bg-white/2 rounded-3xl border border-dashed border-white/5">
              <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-slate-400">No vendors found matching your search.</p>
            </div>
          )}
        </div>
      )}

      {/* Vendor Add/Edit Modal */}
      <AnimatePresence>
        {isVendorModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="navy-panel w-full max-w-xl rounded-3xl overflow-hidden border border-brand-gold/20 flex flex-col"
            >
              <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h4 className="text-xl font-black gold-text uppercase tracking-tighter">
                  {editingVendor ? 'Modify Vendor' : 'Onboard New Vendor'}
                </h4>
                <button onClick={() => setIsVendorModalOpen(false)} className="p-2 text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleVendorSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">Company / Legal Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none"
                      value={vendorFormData.name}
                      onChange={e => setVendorFormData({...vendorFormData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">Email Address</label>
                    <input 
                      type="email" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none"
                      value={vendorFormData.email}
                      onChange={e => setVendorFormData({...vendorFormData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">Phone Number</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none"
                      value={vendorFormData.phone}
                      onChange={e => setVendorFormData({...vendorFormData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">GSTIN (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none"
                      value={vendorFormData.gstin}
                      onChange={e => setVendorFormData({...vendorFormData, gstin: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">Category</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none appearance-none"
                      value={vendorFormData.category}
                      onChange={e => setVendorFormData({...vendorFormData, category: e.target.value})}
                    >
                      <option value="General">General</option>
                      <option value="Materials">Materials</option>
                      <option value="Services">Services</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Logistics">Logistics</option>
                    </select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">Billing Address</label>
                    <textarea 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none min-h-[100px]"
                      value={vendorFormData.address}
                      onChange={e => setVendorFormData({...vendorFormData, address: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 gold-gradient text-brand-navy-dark font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-transform mt-4"
                >
                  {editingVendor ? 'Apply Changes' : 'Onboard Vendor'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Entry Modal remains here */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="navy-panel w-full max-w-4xl rounded-3xl overflow-hidden border border-brand-gold/20 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h4 className="text-xl font-black gold-text uppercase tracking-tighter">Record Purchase Event</h4>
                  <div className="flex bg-white/5 p-1 rounded-xl">
                    {['Purchase Bill', 'Expense', 'Vendor Payment', 'Purchase Return'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({...formData, type: type as any})}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                          formData.type === type ? "bg-brand-gold text-brand-navy-dark" : "text-white/40"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">Bill / Ref Number</label>
                    <input 
                      type="text" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none"
                      value={formData.number}
                      onChange={e => setFormData({...formData, number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 lg:col-span-2 text-left">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest">Select Vendor</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingVendor(null);
                          setVendorFormData({
                            name: '', email: '', phone: '', gstin: '', address: '', category: 'General', paymentTerms: 'Net 30'
                          });
                          setIsVendorModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-brand-gold hover:underline"
                      >
                        + New Vendor
                      </button>
                    </div>
                    <select 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none appearance-none"
                      value={formData.vendorId}
                      onChange={e => {
                        const vendor = vendors.find(v => v.id === e.target.value);
                        setFormData({
                          ...formData, 
                          vendorId: e.target.value,
                          vendorName: vendor?.name || '',
                          vendorGSTIN: vendor?.gstin || ''
                        });
                      }}
                    >
                      <option value="">Choose a Vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">Transaction Date</label>
                    <input 
                      type="date" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-brand-gold outline-none"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h5 className="text-[10px] font-black gold-text uppercase tracking-[0.2em]">Transaction Line Items</h5>
                    <button 
                      type="button" 
                      onClick={handleAddItem}
                      className="text-[10px] font-bold text-brand-gold hover:underline"
                    >
                      + Add New Row
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.items?.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-white/2 p-3 rounded-2xl border border-white/5">
                        <div className="col-span-12 md:col-span-5 space-y-1">
                          <label className="text-[8px] font-bold uppercase text-white/20">Name / Product</label>
                          <div className="flex gap-2">
                            <select 
                              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white appearance-none"
                              value={item.productId || ''}
                              onChange={e => {
                                const prodId = e.target.value;
                                const prod = products.find(p => p.id === prodId);
                                
                                setFormData(prev => {
                                  const newItems = [...(prev.items || [])];
                                  newItems[idx] = { 
                                    ...newItems[idx], 
                                    productId: prodId,
                                    name: prod ? prod.name : (newItems[idx]?.name || ''),
                                    rate: prod ? prod.pricePerUnit : (newItems[idx]?.rate || 0)
                                  };
                                  newItems[idx].amount = (newItems[idx].quantity || 0) * (newItems[idx].rate || 0);
                                  
                                  const { subtotal, totalGst, total } = calculateTotals(newItems);
                                  return { 
                                    ...prev, 
                                    items: newItems, 
                                    subtotal, 
                                    totalGst, 
                                    totalAmount: total 
                                  };
                                });
                              }}
                            >
                              <option value="">Select Product...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.stockLevel} {p.unit})</option>
                              ))}
                              <option value="custom">-- Custom Item --</option>
                            </select>
                            {(item.productId === 'custom' || !item.productId) && (
                              <input 
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white"
                                value={item.name}
                                onChange={e => handleUpdateItem(idx, 'name', e.target.value)}
                                placeholder="Item name"
                              />
                            )}
                          </div>
                        </div>
                        <div className="col-span-3 md:col-span-2 space-y-1">
                          <label className="text-[8px] font-bold uppercase text-white/20">Qty</label>
                          <input 
                            type="number"
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white"
                            value={item.quantity}
                            onChange={e => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2 space-y-1">
                          <label className="text-[8px] font-bold uppercase text-white/20">Rate</label>
                          <input 
                            type="number"
                            className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white"
                            value={item.rate}
                            onChange={e => handleUpdateItem(idx, 'rate', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-3 md:col-span-2 space-y-1 text-right">
                          <label className="text-[8px] font-bold uppercase text-white/20 block">Amount</label>
                          <div className="py-1.5 text-xs font-bold text-brand-gold px-2 bg-brand-navy-dark rounded-lg">
                            ₹{(item.amount || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-1 flex justify-end pb-1.5">
                          <button 
                            type="button"
                            onClick={() => {
                              const newItems = formData.items?.filter((_, i) => i !== idx);
                              const { subtotal, totalGst, total } = calculateTotals(newItems || []);
                              setFormData({ ...formData, items: newItems, subtotal, totalGst, totalAmount: total });
                            }}
                            className="p-1.5 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Section */}
                <div className="bg-white/2 p-6 rounded-3xl border border-white/5 space-y-4 ml-auto max-w-sm">
                  <div className="flex justify-between text-xs font-medium text-white/40">
                    <span>Taxable Value:</span>
                    <span>₹{formData.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-white/40">
                    <span>IGST / CGST+SGST (18%):</span>
                    <span>₹{formData.totalGst.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-sm font-black gold-text uppercase">Grand Total:</span>
                    <span className="text-xl font-black text-white tracking-tighter">₹{formData.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t border-white/5 pt-8">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest">Entry Status</label>
                    <div className="flex bg-white/5 p-1 rounded-xl">
                      {['Draft', 'Pending', 'Paid'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setFormData({...formData, status: st as any})}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            formData.status === st ? "bg-white/10 text-white" : "text-white/20"
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="flex-1 py-4 gold-gradient text-brand-navy-dark font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
                  >
                    Commit Transaction
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SelectionModal 
        isOpen={isSelectionModalOpen} 
        onClose={() => setIsSelectionModalOpen(false)} 
        onSelect={(type) => {
          setFormData(prev => ({ 
            ...prev, 
            type,
            number: type === 'Purchase Return' ? `PRT-${Date.now().toString().slice(-6)}` : prev.number
          }));
          setIsSelectionModalOpen(false);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}

function StatsCard({ title, amount, icon: Icon, color }: { title: string, amount: string, icon: any, color: string }) {
  return (
    <div className="navy-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
        <Icon className="w-20 h-20" />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">{title}</p>
      <div className="flex items-end gap-3">
        <h3 className={cn("text-2xl font-black tracking-tighter", color)}>{amount}</h3>
        <Icon className={cn("w-4 h-4 mb-1 opacity-50", color)} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'Draft' | 'Pending' | 'Paid' | 'Cancelled' }) {
  const styles = {
    'Draft': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]',
    'Paid': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    'Cancelled': 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={cn(
      "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border",
      styles[status] || styles['Pending']
    )}>
      {status}
    </span>
  );
}
