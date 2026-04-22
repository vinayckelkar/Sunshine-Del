import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Trash2,
  Edit,
  Download,
  Printer,
  Share2,
  ChevronRight,
  TrendingUp,
  X,
  CreditCard,
  Users,
  MapPin,
  Calendar,
  Briefcase,
  Paperclip,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { salesService, Transaction, TransactionItem } from '../services/salesService';
import { clientService, Client } from '../services/clientService';
import { inventoryService, Product } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { amountToWords } from '../lib/amountToWords';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SUNSHYNE_GSTIN = '27AFSFS3094R1ZR';
const DEFAULT_BANK_DETAILS = {
  bankName: 'AXIS BANK LTD',
  accountNumber: '925020050956744',
  ifsc: 'UTIB0000722',
  upiId: ''
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
];

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: Transaction['type']) => void;
}

function SelectionModal({ isOpen, onClose, onSelect }: SelectionModalProps) {
  const types: { type: Transaction['type'], icon: any, label: string, desc: string }[] = [
    { type: 'Tax Invoice', icon: FileText, label: 'Tax Invoice', desc: 'Standard GST invoice' },
    { type: 'Proforma Invoice', icon: Briefcase, label: 'Proforma Invoice', desc: 'Estimate / Quotation' },
    { type: 'Credit Note', icon: AlertCircle, label: 'Credit Note', desc: 'Issue credit for returns' },
    { type: 'Debit Note', icon: ArrowUpRight, label: 'Debit Note', desc: 'Supplementary invoice' },
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
                <h3 className="text-2xl font-black gold-text uppercase tracking-tighter">Choose Transaction Type</h3>
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

export function Sales() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterClient, setFilterClient] = useState<string>('All');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<Transaction['type']>('Sales Invoice');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New Client Form State
  const [newClientData, setNewClientData] = useState<Partial<Client>>({
    name: '',
    type: 'Customer',
    email: '',
    phone: '',
    gstin: '',
    address: ''
  });

  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'Tax Invoice',
    number: `SSG-045`,
    date: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    placeOfSupply: 'Maharashtra',
    items: [{ id: '1', name: '', quantity: 1, rate: 0, gstPercent: 18, amount: 0 }],
    subtotal: 0,
    discount: { type: 'Flat', value: 0, beforeTax: true },
    transportation: { amount: 0, isTaxable: false },
    additionalCharges: [],
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalGst: 0,
    totalAmount: 0,
    paidAmount: 0,
    balanceAmount: 0,
    roundOff: 0,
    status: 'Draft',
    paymentMode: 'Cash',
    paymentTerms: '7 Days',
    bankDetails: DEFAULT_BANK_DETAILS,
    attachments: [],
    notes: ''
  });

  useEffect(() => {
    const unsubTransactions = salesService.subscribeToTransactions((data) => {
      setTransactions(data);
      setIsLoading(false);
    });

    const unsubClients = clientService.subscribeToClients((data) => {
      setClients(data);
    });

    const unsubProducts = inventoryService.subscribeToProducts((data) => {
      setProducts(data);
    });

    return () => {
      unsubTransactions();
      unsubClients();
      unsubProducts();
    };
  }, []);

  const calculateTotals = (
    items: TransactionItem[], 
    discount = formData.discount, 
    transportation = formData.transportation,
    additionalCharges = formData.additionalCharges,
    placeOfSupply = formData.placeOfSupply || 'Maharashtra',
    paidAmount = formData.paidAmount || 0,
    roundOffToggle = formData.roundOffToggle ?? true
  ) => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    
    let discountValue = 0;
    if (discount?.type === 'Percentage') {
      discountValue = subtotal * (discount.value / 100);
    } else {
      discountValue = discount?.value || 0;
    }

    let taxableValue = subtotal;
    if (discount?.beforeTax) {
      taxableValue -= discountValue;
    }

    const taxRatio = subtotal > 0 ? taxableValue / subtotal : 0;
    
    let totalGst = items.reduce((acc, item) => {
      const itemTaxBase = (item.quantity * item.rate) * taxRatio;
      return acc + (itemTaxBase * (item.gstPercent / 100));
    }, 0);

    if (transportation?.isTaxable) {
      totalGst += (transportation.amount * 0.18);
    }

    const isInternal = placeOfSupply === 'Maharashtra';
    const cgst = isInternal ? totalGst / 2 : 0;
    const sgst = isInternal ? totalGst / 2 : 0;
    const igst = !isInternal ? totalGst : 0;

    let finalTotal = taxableValue + totalGst + (transportation?.amount || 0);

    if (discount && !discount.beforeTax) {
      finalTotal -= discountValue;
    }

    const extraCharges = (additionalCharges || []).reduce((acc, c) => acc + c.amount, 0);
    finalTotal += extraCharges;

    const roundedTotal = roundOffToggle ? Math.round(finalTotal) : finalTotal;
    const roundOff = roundedTotal - finalTotal;

    setFormData(prev => ({
      ...prev,
      items,
      discount,
      transportation,
      additionalCharges,
      placeOfSupply,
      subtotal,
      totalGst,
      cgst,
      sgst,
      igst,
      totalAmount: roundedTotal,
      paidAmount,
      balanceAmount: roundedTotal - paidAmount,
      roundOff: parseFloat(roundOff.toFixed(2)),
      roundOffToggle
    }));
  };

  const handleAddItem = () => {
    const newItem: TransactionItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      quantity: 1,
      rate: 0,
      gstPercent: 18,
      amount: 0
    };
    calculateTotals([...(formData.items || []), newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof TransactionItem, value: any) => {
    const newItems = (formData.items || []).map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        updatedItem.amount = updatedItem.quantity * updatedItem.rate;
        return updatedItem;
      }
      return item;
    });
    calculateTotals(newItems);
  };

  const handleRemoveItem = (id: string) => {
    const newItems = (formData.items || []).filter(item => item.id !== id);
    calculateTotals(newItems);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateWhatsAppLink = (transaction: Transaction) => {
    const message = `Hello, here is your ${transaction.type} ${transaction.number}. Total Amount: ₹${transaction.totalAmount}. Attached details: ${window.location.origin}/invoice/${transaction.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleUploadAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // In a real app, upload to storage and get URL
    const newAttachment = {
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      url: '#', // Mock URL
      type: file.type
    };
    
    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAttachment]
    }));
  };

  const handleSaveTransaction = async () => {
    try {
      if (selectedTransaction) {
        await salesService.updateTransaction(selectedTransaction.id, formData);
      } else {
        await salesService.createTransaction(formData as Transaction);
        
        // Inventory adjustment: Reduce stock for Sales
        if (formData.type === 'Sales Invoice' || formData.type === 'Proforma Invoice') {
          const adjustments = (formData.items || [])
            .filter(item => item.productId)
            .map(item => ({
              id: item.productId!,
              amount: -item.quantity,
              referenceId: formData.number,
              note: `Sales Invoice: ${formData.number}`
            }));
          if (adjustments.length > 0) {
            await inventoryService.bulkAdjustStock(adjustments);
          }
        }
      }
      resetForm();
      setIsInvoiceModalOpen(false);
    } catch (e: any) {
      alert(`Failed to save: ${e.message}`);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await salesService.deleteTransaction(id);
      } catch (err: any) {
        console.error('Delete failed:', err);
        alert(`Deletion failed: ${err.message || 'Check permissions'}`);
      }
    }
  };

  const handleCreateClient = async () => {
    try {
      if (!newClientData.name) return;
      const docRef = await clientService.createClient(newClientData as Omit<Client, 'id'>);
      setFormData(prev => ({
        ...prev,
        clientId: docRef.id,
        clientName: newClientData.name,
        clientGSTIN: newClientData.gstin,
        billingAddress: newClientData.address
      }));
      setIsClientModalOpen(false);
      setNewClientData({ name: '', type: 'Customer' });
    } catch (e: any) {
      alert(`Failed to create client: ${e.message}`);
    }
  };

  const resetForm = (type: Transaction['type'] = 'Tax Invoice') => {
    setSelectedTransaction(null);
    const count = transactions.filter(t => t.type === type).length;
    let nextNumber = `INV-${Date.now().toString().slice(-6)}`;
    
    if (type === 'Tax Invoice') {
      nextNumber = `SSG-${(45 + count).toString().padStart(3, '0')}`;
    } else if (type === 'Proforma Invoice') {
      nextNumber = `PRO-${(1 + count).toString().padStart(3, '0')}`;
    }

    setFormData({
      type,
      number: nextNumber,
      date: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      placeOfSupply: 'Maharashtra',
      items: [{ id: '1', name: '', quantity: 1, rate: 0, gstPercent: 18, amount: 0 }],
      subtotal: 0,
      discount: { type: 'Flat', value: 0, beforeTax: true },
      transportation: { amount: 0, isTaxable: false },
      additionalCharges: [],
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGst: 0,
      totalAmount: 0,
      paidAmount: 0,
      balanceAmount: 0,
      roundOff: 0,
      status: 'Draft',
      paymentMode: 'Cash',
      paymentTerms: '7 Days',
      bankDetails: DEFAULT_BANK_DETAILS,
      attachments: [],
      notes: ''
    });
  };  const handleExportPDF = (transaction: Transaction) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(2, 12, 27);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text('SUNSHYNE GRAFIX LLP', 20, 22);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text('GSTIN: 27AFSFS3094R1ZR', 20, 28);
    doc.text('Contact: +91 7977235374', 20, 33);
    
    const address = 'Shop No G3, Shree, Tirupati Balaji Building, SRA CHS LTD, Ground Floor Building 3, Mumbai, Maharashtra 400069';
    const splitAddress = doc.splitTextToSize(address, 120);
    doc.text(splitAddress, 20, 38);

    // Invoice Info
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`INVOICE: ${transaction.number}`, 140, 60);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${transaction.date}`, 140, 66);
    doc.text(`Status: ${transaction.status}`, 140, 72);
    doc.text(`Payment Mode: ${transaction.paymentMode || 'N/A'}`, 140, 78);
    doc.text(`Payment Terms: ${transaction.paymentTerms || 'N/A'}`, 140, 84);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('BILL TO:', 20, 60);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(transaction.clientName || 'Walk-in Customer', 20, 67);
    doc.setFont("helvetica", "normal");
    if (transaction.clientGSTIN) doc.text(`GSTIN: ${transaction.clientGSTIN}`, 20, 72);
    if (transaction.billingAddress) {
      const splitBillAddress = doc.splitTextToSize(transaction.billingAddress, 80);
      doc.text(splitBillAddress, 20, 77);
    }

    // Items Table
    const tableData = transaction.items.map(item => [
      item.name,
      item.quantity,
      `Rs. ${item.rate}`,
      `${item.gstPercent}%`,
      `Rs. ${(item.quantity * item.rate * (item.gstPercent / 200)).toFixed(2)}`,
      `Rs. ${(item.quantity * item.rate * (item.gstPercent / 200)).toFixed(2)}`,
      `Rs. ${item.amount}`
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['Description', 'Qty', 'Rate', 'GST%', 'CGST', 'SGST', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [2, 12, 27], textColor: [212, 175, 55], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Section
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`Subtotal:`, 140, finalY);
    doc.text(`Rs. ${transaction.subtotal.toLocaleString()}`, 195, finalY, { align: 'right' });

    let currentY = finalY + 6;

    // Discount
    if (transaction.discount?.value) {
      const discountLabel = transaction.discount.type === 'Percentage' ? `Discount (${transaction.discount.value}%):` : `Discount:`;
      const discountAmount = transaction.discount.type === 'Percentage' ? (transaction.subtotal * transaction.discount.value / 100) : transaction.discount.value;
      doc.text(discountLabel, 140, currentY);
      doc.text(`- Rs. ${discountAmount.toLocaleString()}`, 195, currentY, { align: 'right' });
      currentY += 6;
    }

    // Transportation
    if (transaction.transportation?.amount) {
       doc.text(`Transportation:`, 140, currentY);
       doc.text(`Rs. ${transaction.transportation.amount.toLocaleString()}`, 195, currentY, { align: 'right' });
       currentY += 6;
    }

    doc.text(`CGST:`, 140, currentY);
    doc.text(`Rs. ${(transaction.cgst || 0).toFixed(2)}`, 195, currentY, { align: 'right' });
    currentY += 6;
    doc.text(`SGST:`, 140, currentY);
    doc.text(`Rs. ${(transaction.sgst || 0).toFixed(2)}`, 195, currentY, { align: 'right' });
    currentY += 6;

    // Additional Charges
    if (transaction.additionalCharges?.length) {
       transaction.additionalCharges.forEach(charge => {
          doc.text(`${charge.name}:`, 140, currentY);
          doc.text(`Rs. ${charge.amount.toLocaleString()}`, 195, currentY, { align: 'right' });
          currentY += 6;
       });
    }

    doc.text(`Round Off:`, 140, currentY);
    doc.text(`Rs. ${(transaction.roundOff || 0).toFixed(2)}`, 195, currentY, { align: 'right' });
    currentY += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL PAYABLE:`, 140, currentY);
    doc.text(`Rs. ${transaction.totalAmount.toLocaleString()}`, 195, currentY, { align: 'right' });

    // Amount in Words
    currentY += 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Amount in Words: ${amountToWords(transaction.totalAmount)}`, 20, currentY);

    // Bank Details
    if (transaction.bankDetails?.bankName) {
      currentY += 15;
      doc.setFontSize(9);
      doc.setTextColor(2, 12, 27);
      doc.setFont("helvetica", "bold");
      doc.text("BANK DETAILS:", 20, currentY);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Bank Name: ${transaction.bankDetails.bankName}`, 20, currentY + 5);
      doc.text(`A/c Number: ${transaction.bankDetails.accountNumber}`, 20, currentY + 10);
      doc.text(`IFSC: ${transaction.bankDetails.ifsc}`, 20, currentY + 15);
      if (transaction.bankDetails.upiId) doc.text(`UPI ID: ${transaction.bankDetails.upiId}`, 20, currentY + 20);
    }

    if (transaction.notes) {
      currentY += 30;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 20, currentY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(transaction.notes, 20, currentY + 5);
    }

    // Signature Block
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text('For Sunshyne Grafix LLP', 140, pageHeight - 30);
    doc.line(140, pageHeight - 15, 195, pageHeight - 15); // Signature line
    doc.setFontSize(8);
    doc.text('Authorized Signatory', 140, pageHeight - 10);

    doc.save(`${transaction.number}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard title="Total Revenue" amount={`₹${transactions.reduce((acc, t) => acc + t.totalAmount, 0).toLocaleString()}`} icon={TrendingUp} color="text-brand-gold" />
        <StatsCard title="Outstanding" amount={`₹${transactions.filter(t => t.status !== 'Paid').reduce((acc, t) => acc + t.totalAmount, 0).toLocaleString()}`} icon={Clock} color="text-amber-400" />
        <StatsCard title="Tax Collected" amount={`₹${transactions.reduce((acc, t) => acc + t.totalGst, 0).toLocaleString()}`} icon={FileText} color="text-blue-400" />
        <StatsCard title="Drafts" amount={transactions.filter(t => t.status === 'Draft').length.toString()} icon={AlertCircle} color="text-slate-400" />
      </div>

      {/* Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between navy-panel p-4 rounded-2xl border border-white/5 shadow-xl">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search invoice or #..."
              className="w-full pl-10 pr-4 py-2 bg-brand-navy-dark border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold/50 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { resetForm(); setIsSelectionModalOpen(true); }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 gold-gradient text-brand-navy-dark rounded-xl font-bold transition-all hover:scale-[1.02] shadow-lg shadow-brand-gold/10"
          >
            <Plus className="w-5 h-5" />
            Create Transaction
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center p-4 navy-panel rounded-2xl border border-white/5">
          <Filter className="w-4 h-4 text-brand-gold" />
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            className="bg-brand-navy-dark border border-white/10 text-[10px] uppercase font-bold text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-brand-gold/50"
          >
            <option value="All">All Types</option>
            <option value="Tax Invoice">Tax Invoice</option>
            <option value="Proforma Invoice">Proforma Invoice</option>
            <option value="Credit Note">Credit Note</option>
            <option value="Debit Note">Debit Note</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-brand-navy-dark border border-white/10 text-[10px] uppercase font-bold text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-brand-gold/50"
          >
            <option value="All">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Sent">Sent</option>
            <option value="Draft">Draft</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select 
            value={filterClient} 
            onChange={e => setFilterClient(e.target.value)}
            className="bg-brand-navy-dark border border-white/10 text-[10px] uppercase font-bold text-slate-300 rounded-lg px-3 py-1.5 outline-none focus:border-brand-gold/50 min-w-[140px]"
          >
            <option value="All">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] uppercase text-slate-500 font-bold">From:</span>
            <input 
              type="date" 
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
              className="bg-brand-navy-dark border border-white/10 text-[10px] text-slate-300 rounded-lg px-3 py-1.5 outline-none"
            />
            <span className="text-[10px] uppercase text-slate-500 font-bold">To:</span>
            <input 
              type="date" 
              value={dateEnd}
              onChange={e => setDateEnd(e.target.value)}
              className="bg-brand-navy-dark border border-white/10 text-[10px] text-slate-300 rounded-lg px-3 py-1.5 outline-none"
            />
            <button 
              onClick={() => {
                setFilterType('All'); setFilterStatus('All'); setFilterClient('All'); setDateStart(''); setDateEnd(''); setSearchTerm('');
              }}
              className="p-1.5 text-slate-500 hover:text-brand-gold transition-colors"
              title="Reset Filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="navy-panel rounded-3xl border border-white/5 overflow-hidden shadow-2xl transition-all hover:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">
                <th className="px-6 py-4">Transaction</th>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Total Amount</th>
                <th className="px-6 py-4 text-right">Balance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions
                .filter(t => {
                  const matchesSearch = t.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || t.number.includes(searchTerm);
                  const matchesType = filterType === 'All' || t.type === filterType;
                  const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
                  const matchesClient = filterClient === 'All' || t.clientName === filterClient;
                  const matchesDate = (!dateStart || t.date >= dateStart) && (!dateEnd || t.date <= dateEnd);
                  return matchesSearch && matchesType && matchesStatus && matchesClient && matchesDate;
                })
                .map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200 group-hover:text-brand-gold transition-colors">{t.number}</span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider">{t.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-300">{t.clientName || 'Walk-in'}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">{t.date}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-200">₹{t.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-400/80">₹{(t.balanceAmount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={t.status as any} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-2">
                       <button onClick={() => handleExportPDF(t)} className="p-2 hover:bg-white/10 rounded-lg text-brand-gold transition-colors" title="Download PDF">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => {
                        setSelectedTransaction(t);
                        setFormData(t);
                        setIsInvoiceModalOpen(true);
                      }} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-brand-gold transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTransaction(t.id)} 
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

      <SelectionModal 
        isOpen={isSelectionModalOpen} 
        onClose={() => setIsSelectionModalOpen(false)} 
        onSelect={(type) => {
          resetForm(type);
          setIsSelectionModalOpen(false);
          setIsInvoiceModalOpen(true);
        }}
      />

      {/* Invoice Form Modal */}
      <AnimatePresence>
        {isInvoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInvoiceModalOpen(false)} className="absolute inset-0 bg-brand-navy-dark/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-brand-navy border border-white/10 rounded-3xl w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-6 border-b border-white/5 bg-white/5 flex flex-wrap gap-4 justify-between items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <select 
                      value={formData.type} 
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                      className="bg-brand-gold/10 text-brand-gold border border-brand-gold/20 rounded-xl px-4 py-2 font-black uppercase tracking-widest text-sm outline-none cursor-pointer"
                    >
                      <option value="Tax Invoice">Tax Invoice</option>
                      <option value="Proforma Invoice">Proforma Invoice</option>
                      <option value="Credit Note">Credit Note</option>
                      <option value="Debit Note">Debit Note</option>
                    </select>
                    <h3 className="text-xl font-black gold-text uppercase tracking-tighter">#{formData.number}</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 ml-1">Enterprise Financial Ledger v4.5 • {SUNSHYNE_GSTIN}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleSaveTransaction()}
                    className="flex items-center gap-2 px-6 py-2 bg-brand-gold text-brand-navy-dark rounded-xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-lg shadow-brand-gold/20"
                  >
                    <FileText className="w-4 h-4" />
                    Save Draft
                  </button>
                  <button onClick={() => handleExportPDF(formData as Transaction)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-brand-gold rounded-xl font-bold hover:bg-white/10 transition-colors">
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-colors">
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button onClick={() => handleGenerateWhatsAppLink(formData as Transaction)} className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl font-bold hover:bg-green-500/30 transition-colors">
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </button>
                  <button onClick={() => setIsInvoiceModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 ml-2"><X /></button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Main Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  {/* Basic Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Invoice Type</label>
                      <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="field-input text-xs font-black uppercase text-brand-gold">
                        <option value="Sales Invoice">Tax Invoice</option>
                        <option value="Proforma Invoice">Proforma Invoice</option>
                        <option value="Credit Note">Credit Note</option>
                        <option value="Debit Note">Debit Note</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Invoice Number</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold/50" />
                        <input type="text" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="field-input pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Client Name</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold/50" />
                        <select 
                          value={formData.clientId || ''} 
                          onChange={e => {
                            if (e.target.value === 'new') {
                              setIsClientModalOpen(true);
                            } else {
                              const client = clients.find(c => c.id === e.target.value);
                              setFormData({
                                ...formData, 
                                clientId: client?.id, 
                                clientName: client?.name || '',
                                clientGSTIN: client?.gstin || '',
                                billingAddress: client?.address || ''
                              });
                            }
                          }} 
                          className="field-input pl-10"
                        >
                          <option value="">Select a client...</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                          <option value="new" className="text-brand-gold font-bold">+ Add New Client</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Place of Supply (GST State)</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold/50" />
                        <select 
                          value={formData.placeOfSupply} 
                          onChange={e => calculateTotals(formData.items || [], formData.discount, formData.transportation, formData.additionalCharges, e.target.value)}
                          className="field-input pl-10"
                        >
                          {INDIAN_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Client GSTIN (Optional)</label>
                      <div className="relative">
                        <TrendingUp className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${formData.clientGSTIN && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.clientGSTIN) ? 'text-red-500' : 'text-brand-gold/50'}`} />
                        <input 
                          type="text" 
                          value={formData.clientGSTIN} 
                          onChange={e => setFormData({...formData, clientGSTIN: e.target.value.toUpperCase()})} 
                          className={`field-input pl-10 uppercase font-mono text-xs ${formData.clientGSTIN && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.clientGSTIN) ? 'border-red-500/50 text-red-400' : ''}`} 
                          placeholder="27XXXXX..." 
                        />
                        {formData.clientGSTIN && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.clientGSTIN) && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-tighter">Invalid Format</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Invoice Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold/50" />
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="field-input pl-10 text-xs" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Due Date</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold/50" />
                        <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="field-input pl-10 text-xs" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Payment Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="field-input text-xs">
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Partially Paid">Partially Paid</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Payment Mode</label>
                      <select value={formData.paymentMode} onChange={e => setFormData({...formData, paymentMode: e.target.value as any})} className="field-input text-xs">
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Credit">Credit</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Payment Terms</label>
                      <select value={formData.paymentTerms} onChange={e => setFormData({...formData, paymentTerms: e.target.value})} className="field-input text-xs">
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="7 Days">7 Days</option>
                        <option value="15 Days">15 Days</option>
                        <option value="30 Days">30 Days</option>
                      </select>
                    </div>
                  </div>

                  {/* Client Address & Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Billing Address</label>
                      <textarea 
                        value={formData.billingAddress} 
                        onChange={e => setFormData({...formData, billingAddress: e.target.value})} 
                        className="field-input resize-none h-24"
                        placeholder="Street, City, PIN..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Private Notes / Instructions</label>
                      <textarea 
                        value={formData.notes} 
                        onChange={e => setFormData({...formData, notes: e.target.value})} 
                        className="field-input resize-none h-24 border-brand-gold/10"
                        placeholder="Special instructions for production/accounts..."
                      />
                    </div>
                  </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black gold-text uppercase tracking-widest">Line Items</h4>
                    <button onClick={handleAddItem} className="flex items-center gap-2 text-xs font-bold text-brand-gold hover:text-brand-gold/80 bg-white/5 px-4 py-2 rounded-xl border border-brand-gold/20 transition-all"><Plus className="w-4 h-4" /> Add Item</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr className="text-[9px] uppercase tracking-widest text-slate-500 font-black">
                          <th className="px-4 py-3 text-left">Description</th>
                          <th className="px-4 py-3 w-16 text-center">Qty</th>
                          <th className="px-4 py-3 w-24 text-center">Rate</th>
                          <th className="px-4 py-3 w-20 text-center">GST %</th>
                          {formData.placeOfSupply === 'Maharashtra' ? (
                            <>
                              <th className="px-4 py-3 w-24 text-right">CGST</th>
                              <th className="px-4 py-3 w-24 text-right">SGST</th>
                            </>
                          ) : (
                            <th className="px-4 py-3 w-24 text-right">IGST</th>
                          )}
                          <th className="px-4 py-3 w-24 text-right">Total</th>
                          <th className="px-4 py-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {formData.items?.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2">
                              {/* ... select ... */}
                              {/* products map code is unchanged but I need to replace the whole tr carefully */}
                              <select 
                                value={item.productId || ''} 
                                onChange={e => {
                                  const prod = products.find(p => p.id === e.target.value);
                                  handleUpdateItem(item.id, 'productId', prod?.id);
                                  handleUpdateItem(item.id, 'name', prod?.name || '');
                                  handleUpdateItem(item.id, 'rate', prod?.price || 0);
                                  handleUpdateItem(item.id, 'gstPercent', prod?.gstPercent || 18);
                                }}
                                className="field-input border-transparent bg-transparent focus:bg-white/5 text-sm"
                              >
                                <option value="">Select Product...</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                                ))}
                                <option value="custom">Custom Item...</option>
                              </select>
                              {(!item.productId || item.productId === 'custom') && (
                                <input 
                                  type="text" 
                                  value={item.name} 
                                  onChange={e => handleUpdateItem(item.id, 'name', e.target.value)} 
                                  className="field-input border-transparent bg-transparent focus:bg-white/5 text-xs mt-1" 
                                  placeholder="Enter custom name..." 
                                />
                              )}
                            </td>
                            <td className="p-2 text-center"><input type="number" value={item.quantity} onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))} className="field-input border-transparent bg-transparent text-center" /></td>
                            <td className="p-2">
                              <input type="number" value={item.rate} onChange={e => handleUpdateItem(item.id, 'rate', parseFloat(e.target.value))} className="field-input border-transparent bg-transparent text-right" />
                            </td>
                            <td className="p-2 text-center">
                              <select value={item.gstPercent} onChange={e => handleUpdateItem(item.id, 'gstPercent', parseFloat(e.target.value))} className="field-input border-transparent bg-transparent text-center">
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            {formData.placeOfSupply === 'Maharashtra' ? (
                              <>
                                <td className="p-2 text-right text-slate-400 text-xs">₹{(item.quantity * item.rate * (item.gstPercent / 200)).toFixed(2)}</td>
                                <td className="p-2 text-right text-slate-400 text-xs">₹{(item.quantity * item.rate * (item.gstPercent / 200)).toFixed(2)}</td>
                              </>
                            ) : (
                              <td className="p-2 text-right text-slate-400 text-xs">₹{(item.quantity * item.rate * (item.gstPercent / 100)).toFixed(2)}</td>
                            )}
                            <td className="p-2 text-right font-bold text-slate-200">₹{(item.quantity * item.rate * (1 + item.gstPercent/100)).toFixed(2)}</td>
                            <td className="p-2 text-right">
                              <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500/50 hover:text-red-500"><X className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Charges & Attachments */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Additional Charges */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-black gold-text uppercase tracking-widest">Other Charges</h4>
                      <button 
                        onClick={() => {
                          const id = Math.random().toString(36).substr(2, 9);
                          const newCharges = [...(formData.additionalCharges || []), { id, name: '', amount: 0 }];
                          calculateTotals(formData.items || [], formData.discount, formData.transportation, newCharges);
                        }}
                        className="text-[10px] font-bold text-brand-gold hover:underline"
                      >
                        + Add Charge
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(formData.additionalCharges || []).map((charge, idx) => (
                        <div key={charge.id} className="flex gap-2 items-center">
                          <input 
                            type="text" 
                            placeholder="Charge Name (e.g. Packing)" 
                            value={charge.name}
                            onChange={e => {
                              const newCharges = [...formData.additionalCharges!];
                              newCharges[idx].name = e.target.value;
                              setFormData({...formData, additionalCharges: newCharges});
                            }}
                            className="field-input flex-1 text-xs" 
                          />
                          <input 
                            type="number" 
                            placeholder="Amount" 
                            value={charge.amount}
                            onChange={e => {
                              const newCharges = [...formData.additionalCharges!];
                              newCharges[idx].amount = parseFloat(e.target.value) || 0;
                              calculateTotals(formData.items || [], formData.discount, formData.transportation, newCharges);
                            }}
                            className="field-input w-24 text-xs" 
                          />
                          <button 
                            onClick={() => {
                              const newCharges = formData.additionalCharges!.filter(c => c.id !== charge.id);
                              calculateTotals(formData.items || [], formData.discount, formData.transportation, newCharges);
                            }}
                            className="p-2 text-red-500/50 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attachments */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black gold-text uppercase tracking-widest">Attachments (PO/DC/Docs)</h4>
                    <div className="flex flex-col gap-3">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 hover:border-brand-gold/20 transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-brand-gold/50 mb-2" />
                          <p className="text-[10px] text-slate-500 uppercase font-black">Click to upload documents</p>
                        </div>
                        <input type="file" className="hidden" onChange={handleUploadAttachment} />
                      </label>
                      
                      <div className="space-y-2">
                        {formData.attachments?.map((file) => (
                          <div key={file.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <Paperclip className="w-4 h-4 text-brand-gold shrink-0" />
                              <span className="text-xs text-slate-300 truncate">{file.name}</span>
                            </div>
                            <button 
                              onClick={() => setFormData({...formData, attachments: formData.attachments?.filter(a => a.id !== file.id)})}
                              className="p-1 text-slate-500 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Details Section */}
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                    <CreditCard className="w-5 h-5 text-brand-gold" />
                    <h4 className="text-sm font-black gold-text uppercase tracking-widest">Bank Details (Auto-Attach)</h4>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    <div>
                      <p className="text-slate-600 mb-0.5">Bank Name</p>
                      <p className="text-slate-200">{formData.bankDetails?.bankName}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 mb-0.5">AC Number</p>
                      <p className="text-slate-200">{formData.bankDetails?.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 mb-0.5">IFSC Code</p>
                      <p className="text-slate-200">{formData.bankDetails?.ifsc}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 mb-0.5">UPI ID</p>
                      <p className="text-slate-200">{formData.bankDetails?.upiId}</p>
                    </div>
                  </div>
                </div>
              </div>

                {/* Summary & Sticky Sidebar */}
                <div className="w-full md:w-96 bg-brand-navy-dark border-l border-white/5 p-8 overflow-y-auto custom-scrollbar flex flex-col justify-between shadow-2xl">
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-sm font-black gold-text uppercase tracking-widest border-b border-brand-gold/10 pb-4">Bill Summary</h4>
                      <div className="space-y-4 mt-6">
                         <div className="flex justify-between text-slate-400 text-sm">
                           <span>Subtotal:</span>
                           <span className="font-bold text-white tracking-widest">₹{formData.subtotal?.toLocaleString()}</span>
                         </div>

                         <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Discount</label>
                              <div className="flex gap-1">
                                <button onClick={() => calculateTotals(formData.items || [], { ...formData.discount!, type: 'Flat' })} className={`px-2 py-1 text-[8px] rounded-lg border ${formData.discount?.type === 'Flat' ? 'bg-brand-gold text-brand-navy border-brand-gold' : 'border-white/10 text-slate-500'}`}>FLAT</button>
                                <button onClick={() => calculateTotals(formData.items || [], { ...formData.discount!, type: 'Percentage' })} className={`px-2 py-1 text-[8px] rounded-lg border ${formData.discount?.type === 'Percentage' ? 'bg-brand-gold text-brand-navy border-brand-gold' : 'border-white/10 text-slate-500'}`}>%</button>
                              </div>
                            </div>
                            <input type="number" value={formData.discount?.value} onChange={e => calculateTotals(formData.items || [], { ...formData.discount!, value: parseFloat(e.target.value) || 0 })} className="field-input text-sm py-1.5 w-full" />
                         </div>

                         <div className="flex justify-between text-slate-400 text-sm">
                            <span>{formData.placeOfSupply === 'Maharashtra' ? 'CGST (9%) + SGST (9%)' : 'IGST (18%)'}:</span>
                            <span className="font-bold text-brand-gold">₹{formData.totalGst?.toFixed(2)}</span>
                         </div>

                         <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 font-mono text-[10px]">
                            <div className="flex justify-between items-center">
                              <label className="uppercase font-bold text-slate-500">Transportation</label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={formData.transportation?.isTaxable} onChange={e => calculateTotals(formData.items || [], formData.discount, { ...formData.transportation!, isTaxable: e.target.checked })} className="w-3 h-3 accent-brand-gold" />
                                <span className="font-black uppercase text-slate-500 tracking-tighter">Taxable</span>
                              </label>
                            </div>
                            <input type="number" value={formData.transportation?.amount} onChange={e => calculateTotals(formData.items || [], formData.discount, { ...formData.transportation!, amount: parseFloat(e.target.value) || 0 })} className="field-input text-sm py-1.5 w-full" />
                         </div>

                         <div className="flex justify-between items-center text-slate-500 text-xs italic">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={formData.roundOffToggle !== false} 
                                onChange={e => calculateTotals(formData.items || [], formData.discount, formData.transportation, formData.additionalCharges, formData.placeOfSupply, formData.paidAmount, e.target.checked)} 
                                className="w-3 h-3 accent-brand-gold" 
                              />
                              <span>Round Off:</span>
                            </div>
                            <span>₹{formData.roundOff?.toFixed(2)}</span>
                         </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="pt-8 border-t border-brand-gold/20 flex flex-col items-center gap-1">
                         <span className="text-[10px] font-black gold-text uppercase tracking-[.3em]">Payable Amount</span>
                         <span className="text-4xl font-black gold-text tracking-tighter drop-shadow-2xl">₹{formData.totalAmount?.toLocaleString()}</span>
                         <span className="text-[10px] text-slate-400 italic text-center px-4 mt-2 max-w-xs">{amountToWords(formData.totalAmount || 0)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-4">
                         <div className="space-y-1">
                            <label className="text-[8px] uppercase tracking-widest text-slate-500 font-bold ml-1">Paid Amount</label>
                            <input type="number" value={formData.paidAmount} onChange={e => calculateTotals(formData.items || [], formData.discount, formData.transportation, formData.additionalCharges, formData.placeOfSupply, parseFloat(e.target.value) || 0)} className="field-input text-xs py-2 bg-emerald-500/5 border-emerald-500/20 text-emerald-400" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] uppercase tracking-widest text-slate-500 font-bold ml-1">Balance</label>
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl px-3 py-2 text-xs font-black h-[38px] flex items-center justify-center">₹{formData.balanceAmount?.toLocaleString()}</div>
                         </div>
                      </div>

                      <button 
                        onClick={handleSaveTransaction}
                        className="w-full py-5 gold-gradient text-brand-navy-dark rounded-2xl font-black uppercase tracking-[.2em] shadow-xl shadow-brand-gold/10 transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center"
                      >
                        <span>Confirm & Seal</span>
                        <span className="text-[8px] opacity-60 normal-case tracking-widest">Enterprise Ledger Entry #S-{Date.now().toString().slice(-4)}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Client Modal */}
      <AnimatePresence>
        {isClientModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClientModalOpen(false)}
              className="absolute inset-0 bg-brand-navy-dark/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md navy-panel border border-white/10 rounded-[2.5rem] shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter gold-gradient-text">New Client</h2>
                  <p className="text-slate-500 text-xs mt-1">Quick add a new client to the ledger</p>
                </div>
                <button 
                  onClick={() => setIsClientModalOpen(false)}
                  className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Client Name *</label>
                  <input 
                    type="text" 
                    value={newClientData.name}
                    onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                    className="field-input mt-2" 
                    placeholder="Enter client name" 
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">GSTIN</label>
                  <input 
                    type="text" 
                    value={newClientData.gstin}
                    onChange={e => setNewClientData({...newClientData, gstin: e.target.value.toUpperCase()})}
                    className="field-input mt-2" 
                    placeholder="e.g. 27AAAAA0000A1Z5" 
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Email</label>
                  <input 
                    type="email" 
                    value={newClientData.email}
                    onChange={e => setNewClientData({...newClientData, email: e.target.value})}
                    className="field-input mt-2" 
                    placeholder="client@example.com" 
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold ml-1">Billing Address</label>
                  <textarea 
                    value={newClientData.address}
                    onChange={e => setNewClientData({...newClientData, address: e.target.value})}
                    className="field-input mt-2 min-h-[80px]" 
                    placeholder="Complete billing address" 
                  />
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => setIsClientModalOpen(false)}
                  className="flex-1 py-4 px-6 rounded-2xl bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateClient}
                  className="flex-1 py-4 px-6 rounded-2xl gold-gradient text-brand-navy-dark font-black uppercase tracking-widest transition-all hover:scale-[1.02]"
                >
                  Create Client
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ title, amount, icon: Icon, color }: { title: string, amount: string, icon: any, color: string }) {
  return (
    <div className="navy-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-20 h-20" />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">{title}</p>
      <div className="flex items-end gap-3">
        <h3 className={cn("text-3xl font-black tracking-tighter", color)}>{amount}</h3>
        <Icon className={cn("w-5 h-5 mb-1 opacity-50", color)} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'Draft' | 'Sent' | 'Paid' | 'Finalized' | 'Partially Paid' | 'Overdue' }) {
  const styles = {
    'Draft': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Sent': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'Paid': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'Finalized': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    'Partially Paid': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'Overdue': 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
      styles[status as keyof typeof styles] || styles['Draft']
    )}>
      {status}
    </span>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
