import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  AlertTriangle, 
  ArrowUp, 
  ArrowDown,
  Edit2,
  Trash2,
  Settings,
  Package,
  TrendingUp,
  Loader2,
  X,
  History,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle2,
  Clock,
  TrendingDown,
  Info,
  SlidersHorizontal,
  FileText,
  Download,
  Share2,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import { inventoryService, type Product, type InventoryMovement, type Category } from '../services/inventoryService';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Inventory = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Advanced Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'in'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'valuation' | 'movements' | 'aging'>('inventory');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  const [adjustmentTarget, setAdjustmentTarget] = useState<Product | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({ amount: 0, note: '' });
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'lastRestocked'>>({
    name: '',
    category: '',
    stockLevel: 0,
    unit: 'sq ft',
    pricePerUnit: 0,
    lowStockThreshold: 10
  });

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#d4af37' });

  useEffect(() => {
    if (!user) return;

    const unsubProducts = inventoryService.subscribeToProducts((fetched) => {
      setProducts(fetched);
      setLoading(false);
    });
    
    const unsubCategories = inventoryService.subscribeToCategories((fetched) => {
      setCategories(fetched);
      if (fetched.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: fetched[0].name }));
      }
    });

    const unsubMovements = inventoryService.subscribeToMovements((fetched) => {
      setMovements(fetched);
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubMovements();
    };
  }, [user]);

  const handleManualAdjustment = async () => {
    if (!adjustmentTarget || adjustmentData.amount === 0) return;
    try {
      await inventoryService.adjustStock(
        adjustmentTarget.id, 
        adjustmentData.amount, 
        'ADJUSTMENT', 
        adjustmentData.note || 'Manual Correction',
        '',
        { name: user?.displayName || 'Unknown' }
      );
      setIsAdjustModalOpen(false);
      setAdjustmentData({ amount: 0, note: '' });
    } catch (err) {
      alert('Adjustment failed');
    }
  };

  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCategory.name || isAddingCategory) return;
    
    setIsAddingCategory(true);
    try {
      const catName = newCategory.name;
      await inventoryService.addCategory(newCategory);
      setNewCategory({ name: '', color: '#d4af37' });
      
      // If we're currently in the product modal, select this new category automatically
      if (isModalOpen) {
        setFormData(prev => ({ ...prev, category: catName }));
        setIsCategoryModalOpen(false); // Close manager to return to product form
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add category. Check if you have permission.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (products.some(p => p.category === name)) {
      alert('Cannot delete category being used by products');
      return;
    }
    if (confirm('Delete category?')) {
      await inventoryService.deleteCategory(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userData = user ? { name: user.displayName || '', email: user.email || '' } : undefined;
      if (editingProduct) {
        await inventoryService.updateProduct(editingProduct.id, formData, userData);
      } else {
        await inventoryService.addProduct(formData, userData);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        category: categories[0]?.name || '',
        stockLevel: 0,
        unit: 'sq ft',
        pricePerUnit: 0,
        lowStockThreshold: 10
      });
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await inventoryService.deleteProduct(productToDelete);
      setIsDeleteConfirmOpen(false);
      setProductToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete product. ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      
      const price = Number(p.pricePerUnit) || 0;
      const matchesPrice = (priceRange.min === 0 || price >= priceRange.min) && 
                           (priceRange.max === 0 || price <= priceRange.max);
      
      const stock = Number(p.stockLevel) || 0;
      const threshold = Number(p.lowStockThreshold) || 10;
      const matchesStock = stockFilter === 'all' ? true :
                         stockFilter === 'low' ? (stock > 0 && stock <= threshold) :
                         stockFilter === 'out' ? stock === 0 :
                         stockFilter === 'in' ? stock > threshold : true;

      return matchesSearch && matchesCategory && matchesPrice && matchesStock;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any, valB: any;
      if (sortBy === 'name') { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
      else if (sortBy === 'price') { valA = Number(a.pricePerUnit); valB = Number(b.pricePerUnit); }
      else if (sortBy === 'stock') { valA = Number(a.stockLevel); valB = Number(b.stockLevel); }
      else if (sortBy === 'recent') { valA = a.createdAt?.getTime() || 0; valB = b.createdAt?.getTime() || 0; }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [products, searchTerm, activeCategory, priceRange, stockFilter, sortBy, sortOrder]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Inventory Report', 14, 15);
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 22);

    const tableData = filteredProducts.map(p => [
      p.name,
      p.category,
      `${p.stockLevel} ${p.unit}`,
      `INR ${p.pricePerUnit}`,
      `INR ${(p.stockLevel * p.pricePerUnit).toLocaleString()}`
    ]);

    autoTable(doc, {
      head: [['Product Name', 'Category', 'Stock', 'Price/Unit', 'Value']],
      body: tableData,
      startY: 30,
    });

    doc.save(`Inventory_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const exportToCSV = () => {
    const headers = ['Product Name', 'Category', 'Stock', 'Unit', 'Price/Unit', 'Value'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.category,
      p.stockLevel,
      p.unit,
      p.pricePerUnit,
      (p.stockLevel * p.pricePerUnit)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Inventory_Export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalAssetValue = useMemo(() => products.reduce((acc, p) => acc + (Number(p.stockLevel) * (Number(p.pricePerUnit) || 0)), 0), [products]);
  
  const catValues = useMemo(() => products.reduce((acc, p) => {
    const cat = p.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + (Number(p.stockLevel) * (Number(p.pricePerUnit) || 0));
    return acc;
  }, {} as Record<string, number>), [products]);

  const topCategory = useMemo(() => {
    const sorted = Object.entries(catValues).sort((a, b) => (b[1] as number) - (a[1] as number));
    const top = sorted[0];
    return top ? top[0] : 'None';
  }, [catValues]);

  const catStats = useMemo(() => products.reduce((acc, p) => {
    const cat = p.category || 'Uncategorized';
    if (!acc[cat]) {
      acc[cat] = { value: 0, units: 0, count: 0 };
    }
    const val = Number(p.stockLevel) * (Number(p.pricePerUnit) || 0);
    acc[cat].value += val;
    acc[cat].units += Number(p.stockLevel);
    acc[cat].count += 1;
    return acc;
  }, {} as Record<string, { value: number, units: number, count: number }>), [products]);

  const sortedCatStats = useMemo(() => 
    Object.keys(catStats).map(name => {
      const stats = catStats[name];
      return {
        name,
        value: stats.value,
        units: stats.units,
        count: stats.count
      };
    }).sort((a, b) => b.value - a.value)
  , [catStats]);

  const chartData = useMemo(() => Object.entries(catValues)
    .map(([name, value]) => ({ 
      name, 
      value: Number(value),
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value), [catValues]);

  const sortedMovements = useMemo(() => 
    [...movements].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  , [movements]);

  const lowStockItems = useMemo(() => products.filter(p => Number(p.stockLevel) <= (Number(p.lowStockThreshold) || 0)), [products]);

  const TabButton = ({ active, onClick, icon: Icon, children }: { active: boolean, onClick: () => void, icon: any, children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
        active 
          ? "bg-brand-gold text-brand-navy shadow-lg shadow-brand-gold/20" 
          : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );

  return (
    <div className="p-8 space-y-6 h-full flex flex-col">
      {/* Action Bar & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">Inventory <span className="gold-text">Intelligence</span></h1>
          <p className="text-[10px] text-white/40 uppercase font-bold tracking-[0.2em]">Stock tracking & Asset Valuation</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-brand-navy/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={Package}>Warehouse</TabButton>
          <TabButton active={activeTab === 'valuation'} onClick={() => setActiveTab('valuation')} icon={BarChart3}>Valuation</TabButton>
          <TabButton active={activeTab === 'movements'} onClick={() => setActiveTab('movements')} icon={History}>History</TabButton>
          <TabButton active={activeTab === 'aging'} onClick={() => setActiveTab('aging')} icon={Calendar}>Aging</TabButton>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/80 px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all text-sm"
            >
              <Settings className="w-4 h-4" />
              Manage Categories
            </button>
          )}
          
          <div className="relative group/export">
            <button className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/80 px-6 py-3 rounded-xl font-bold hover:bg-white/10 transition-all text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-brand-navy border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all z-20 overflow-hidden">
              <button 
                onClick={exportToPDF}
                className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Export as PDF
              </button>
              <button 
                onClick={exportToCSV}
                className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export as CSV
              </button>
              <button 
                onClick={() => alert('Snapshot sharing feature coming soon!')}
                className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm"
              >
                <Share2 className="w-4 h-4" />
                Share Snapshot
              </button>
            </div>
          </div>

          {(isAdmin || isStaff) && (
            <button 
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  category: categories[0]?.name || 'Vinyl',
                  stockLevel: 0,
                  unit: 'sq ft',
                  pricePerUnit: 0,
                  lowStockThreshold: 10
                });
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 gold-gradient text-brand-navy px-6 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {activeTab === 'inventory' && (
        <>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input 
                    type="text" 
                    placeholder="Search products..."
                    className="w-full bg-brand-navy border border-brand-gold/20 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-gold/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-bold",
                    showFilters ? "bg-brand-gold text-brand-navy border-brand-gold" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  )}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {showFilters ? 'Hide Filters' : 'Filters'}
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
                <button
                  onClick={() => setActiveCategory('All')}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    activeCategory === 'All' 
                      ? 'bg-brand-gold text-brand-navy' 
                      : 'bg-brand-navy border border-brand-gold/10 text-white/60 hover:border-brand-gold/30'
                  )}
                >
                  All Items
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.name)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                      activeCategory === cat.name 
                        ? 'bg-brand-gold text-brand-navy' 
                        : 'bg-brand-navy border border-brand-gold/10 text-white/60 hover:border-brand-gold/30'
                    )}
                  >
                    <Tag className="w-3 h-3" />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white/2 border border-white/10 rounded-2xl">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Price Range</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          placeholder="Min"
                          className="w-full bg-brand-navy border border-white/10 rounded-lg px-3 py-2 text-xs"
                          value={priceRange.min || ''}
                          onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                        />
                        <span className="text-white/20">-</span>
                        <input 
                          type="number" 
                          placeholder="Max"
                          className="w-full bg-brand-navy border border-white/10 rounded-lg px-3 py-2 text-xs"
                          value={priceRange.max || ''}
                          onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Stock Level</label>
                      <select 
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value as any)}
                        className="w-full bg-brand-navy border border-white/10 rounded-lg px-3 py-2 text-xs outline-none"
                      >
                        <option value="all">All Levels</option>
                        <option value="in">In Stock (Normal)</option>
                        <option value="low">Low Stock Alert</option>
                        <option value="out">Out of Stock</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sort By</label>
                      <div className="flex items-center gap-2">
                        <select 
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="flex-1 bg-brand-navy border border-white/10 rounded-lg px-3 py-2 text-xs outline-none"
                        >
                          <option value="name">Product Name</option>
                          <option value="price">Price Unit</option>
                          <option value="stock">Stock Level</option>
                          <option value="recent">Recently Added</option>
                        </select>
                        <button 
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="p-2 hover:bg-white/5 rounded-lg text-brand-gold"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-end">
                      <button 
                        onClick={() => {
                          setPriceRange({ min: 0, max: 0 });
                          setStockFilter('all');
                          setSortBy('name');
                          setSortOrder('asc');
                          setSearchTerm('');
                        }}
                        className="w-full text-[10px] font-bold text-white/40 uppercase tracking-widest hover:text-white transition-colors py-2"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white/2 border border-dashed border-white/10 rounded-3xl p-12">
              <div className="bg-brand-gold/10 p-6 rounded-full mb-6">
                <Package className="w-12 h-12 text-brand-gold/40" />
              </div>
              <h3 className="text-xl font-bold text-white/80">No Products Found</h3>
              <p className="text-white/40 text-sm mt-2 max-w-xs text-center">We couldn't find any items matching your current filters or search criteria.</p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setStockFilter('all');
                  setActiveCategory('All');
                }}
                className="mt-6 text-brand-gold text-xs font-bold uppercase tracking-widest border border-brand-gold/20 px-6 py-2.5 rounded-xl hover:bg-brand-gold/5 transition-all"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="navy-panel rounded-2xl overflow-hidden flex flex-col flex-grow">
              <div className="flex-1 overflow-y-auto min-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/2 sticky top-0 z-10 font-mono">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Specifications</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stock Info</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts.map((product) => {
                      const isLowStock = product.stockLevel <= (product.lowStockThreshold || 0);
                      const productCategory = categories.find(c => c.name === product.category);

                      return (
                        <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-200 group-hover:text-brand-gold transition-colors">{product.name}</span>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px] text-white/30 uppercase tracking-widest">₹{product.pricePerUnit}/{product.unit}</span>
                                <span className="text-[9px] text-white/20 uppercase tracking-widest">Added: {product.createdAt ? format(product.createdAt, 'dd MMM yyyy') : 'N/A'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: productCategory?.color || '#333' }} />
                              <span className="text-[10px] text-white/60 font-bold uppercase tracking-tighter">
                                {product.category}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={cn("font-black font-mono text-lg", isLowStock ? 'text-red-400' : 'text-emerald-400')}>
                                  {product.stockLevel}
                                </span>
                                <span className="text-[10px] text-white/40 uppercase">{product.unit}</span>
                                {isLowStock && (
                                  <span className="bg-red-500/20 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter animate-pulse">
                                    LOW STOCK
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden w-24">
                                  <div 
                                    className={cn("h-full", isLowStock ? 'bg-red-500' : 'bg-emerald-500')} 
                                    style={{ width: `${Math.min((product.stockLevel / ((product.lowStockThreshold || 1) * 2)) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                              {(isAdmin || isStaff) && (
                                <button 
                                  onClick={() => {
                                    setAdjustmentTarget(product);
                                    setIsAdjustModalOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-emerald-500/10 text-emerald-400/60 hover:text-emerald-400 rounded transition-colors"
                                  title="Adjust Stock"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              {(isAdmin || isStaff) && (
                                <button 
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setFormData(product);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-brand-gold/10 text-white/60 hover:text-brand-gold rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {isAdmin && (
                                <button 
                                  onClick={() => {
                                    setProductToDelete(product.id);
                                    setIsDeleteConfirmOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-red-500/10 text-white/60 hover:text-red-400 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}      {activeTab === 'valuation' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BarChart3 className="w-24 h-24 text-brand-gold" />
              </div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Total Asset Value</p>
              <h3 className="text-3xl font-black text-white italic">
                ₹{totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-brand-gold mt-2 font-bold uppercase flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                Locked in Inventory
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Layers className="w-24 h-24 text-brand-gold" />
              </div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Total Units</p>
              <h3 className="text-3xl font-black text-white italic">
                {products.reduce((acc, p) => acc + (p.stockLevel || 0), 0).toLocaleString()}
              </h3>
              <p className="text-[10px] text-white/60 mt-2 font-bold uppercase">Across {products.length} Products</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-24 h-24 text-brand-gold" />
              </div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Top Category</p>
              <h3 className="text-2xl font-black text-white italic truncate">
                {topCategory}
              </h3>
              <p className="text-[10px] text-brand-gold mt-2 font-bold uppercase">By Financial Valuation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart */}
            <div className="bg-brand-navy border border-white/10 p-8 rounded-3xl min-h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-black text-white italic tracking-tight uppercase">Valuation Distribution</h3>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Financial Weight by Category</p>
                </div>
              </div>
              
              <div className="h-80 w-full text-white">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => {
                        const color = categories.find(c => c.name === entry.name)?.color || '#d4af37';
                        return <Cell key={`cell-${index}`} fill={color} stroke="none" />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a192f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* List */}
            <div className="bg-brand-navy border border-white/10 p-8 rounded-3xl h-full">
              <h3 className="text-lg font-black text-white italic tracking-tight uppercase mb-6">Category Breakdown</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedCatStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-white/20">
                      <Package className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-xs uppercase font-bold tracking-widest">No inventory data found</p>
                    </div>
                  ) : (
                    sortedCatStats.map((stat) => {
                      const color = categories.find(c => c.name === stat.name)?.color || '#333';
                      return (
                        <div key={stat.name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: color }} />
                            <div>
                              <p className="text-sm font-black text-white italic uppercase tracking-tight">{stat.name}</p>
                              <p className="text-[10px] text-white/40 font-bold uppercase">{stat.count} Products • {stat.units.toLocaleString()} Units</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-md font-black text-white italic">₹{stat.value.toLocaleString()}</p>
                            <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                              {totalAssetValue > 0 ? ((stat.value / totalAssetValue) * 100).toFixed(1) : 0}% Weight
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
              </div>
            </div>
          </div>

          <div className="navy-panel p-8 rounded-3xl border border-white/5 overflow-hidden flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black gold-text uppercase tracking-tighter">High Capital Assets</h3>
              <TrendingUp className="w-5 h-5 text-brand-gold opacity-50" />
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {products
                .sort((a, b) => {
                  const valA = Number(a.stockLevel) * (Number(a.pricePerUnit) || 0);
                  const valB = Number(b.stockLevel) * (Number(b.pricePerUnit) || 0);
                  return valB - valA;
                })
                .slice(0, 10)
                .map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 hover:border-brand-gold/20 transition-all group">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200 group-hover:text-white">{p.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-white/30 uppercase">{p.stockLevel} {p.unit}</span>
                        <span className="text-[9px] text-white/10 uppercase">•</span>
                        <span className="text-[9px] text-white/30 uppercase">₹{p.pricePerUnit} / unit</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-brand-gold font-mono">₹{(Number(p.stockLevel) * (Number(p.pricePerUnit) || 0)).toLocaleString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'movements' && (
        <div className="navy-panel rounded-2xl overflow-hidden flex flex-col flex-grow">
          <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Stock Movement Audit Trail</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[600px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/2 sticky top-0 z-10 font-mono">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Type</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Change</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detail / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedMovements.map(move => {
                  const product = products.find(p => p.id === move.productId);
                  return (
                    <tr key={move.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 text-[10px] font-mono text-white/40">
                        {format(move.timestamp, 'MMM dd, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white/80 font-bold">{product?.name || 'Deleted Product'}</span>
                          <span className="text-[9px] text-white/20 uppercase tracking-widest">By: {move.performedBy || 'System'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                          move.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400' :
                          move.type === 'OUT' ? 'bg-orange-500/10 text-orange-400' :
                          'bg-blue-500/10 text-blue-400'
                        )}>
                          {move.type}
                        </span>
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-right font-black font-mono",
                        Number(move.amount) > 0 ? 'text-emerald-400' : 'text-orange-400'
                      )}>
                        {Number(move.amount) > 0 ? '+' : ''}{move.amount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white/60 text-xs italic">"{move.note || 'No notes'}"</span>
                          {move.referenceId && (
                            <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter mt-1 hover:text-brand-gold cursor-help transition-colors">
                              Ref: {move.referenceId}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {activeTab === 'aging' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono uppercase">
              {([
                { label: 'Healthy Stock', code: 'Fast', color: 'emerald' as const, days: '0-30', icon: CheckCircle2 },
                { label: 'Moderate', code: 'Moderate', color: 'blue' as const, days: '30-90', icon: Clock },
                { label: 'Slow Move', code: 'Slow', color: 'orange' as const, days: '90-180', icon: TrendingDown },
                { label: 'Dead Stock', code: 'Stagnant', color: 'red' as const, days: '180+', icon: AlertTriangle },
              ] as const).map(tier => {
                  const count = products.filter(p => {
                      const dateToMeasure = p.lastRestocked || p.createdAt || new Date();
                      const days = differenceInDays(new Date(), dateToMeasure);
                      if (tier.code === 'Fast') return days <= 30;
                      if (tier.code === 'Moderate') return days > 30 && days <= 90;
                      if (tier.code === 'Slow') return days > 90 && days <= 180;
                      return days > 180;
                  }).length;

                  const colorMap = {
                    emerald: "border-l-emerald-500/50 text-emerald-400 font-black tracking-widest text-[10px]",
                    blue: "border-l-blue-500/50 text-blue-400 font-black tracking-widest text-[10px]",
                    orange: "border-l-orange-500/50 text-orange-400 font-black tracking-widest text-[10px]",
                    red: "border-l-red-500/50 text-red-400 font-black tracking-widest text-[10px]"
                  };

                  const iconColorMap = {
                    emerald: "text-emerald-400",
                    blue: "text-blue-400",
                    orange: "text-orange-400",
                    red: "text-red-400"
                  };

                  return (
                    <div key={tier.label} className={cn("navy-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between border-l-4", colorMap[tier.color].split(' ')[0])}>
                        <div className="flex items-center justify-between">
                          <p className={colorMap[tier.color]}>{tier.label}</p>
                          <tier.icon className={cn("w-4 h-4 opacity-50", iconColorMap[tier.color])} />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                             <p className="text-4xl font-black text-white">{count}</p>
                             <span className="text-[10px] text-white/40">{tier.days} d</span>
                        </div>
                    </div>
                  )
              })}
            </div>

            <div className="navy-panel rounded-3xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Inventory Aging Analysis</h3>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                      <th className="px-6 py-4">Inventory Item</th>
                      <th className="px-6 py-4">Days Since Activity</th>
                      <th className="px-6 py-4">Health Status</th>
                      <th className="px-6 py-4 text-right">Age Status</th>
                      <th className="px-6 py-4 text-right">Dead Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {products.map(p => {
                      const daysIdle = differenceInDays(new Date(), p.lastRestocked || p.createdAt || new Date());
                      let status = 'Fast';
                      let colorClass = 'text-emerald-400';
                      if (daysIdle > 180) { status = 'Stagnant'; colorClass = 'text-red-400'; }
                      else if (daysIdle > 90) { status = 'Slow'; colorClass = 'text-orange-400'; }
                      else if (daysIdle > 30) { status = 'Moderate'; colorClass = 'text-blue-400'; }

                      return (
                        <tr key={p.id} className="hover:bg-white/2 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-200">{p.name}</span>
                              <span className="text-[10px] text-white/30 uppercase">{p.category}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-white/60">{daysIdle} days idle</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                               <div className={cn("w-2 h-2 rounded-full", daysIdle > 90 ? 'bg-red-500' : daysIdle > 30 ? 'bg-amber-500' : 'bg-emerald-500')} />
                               <span className="text-xs text-white/60">{daysIdle > 90 ? 'Critical' : daysIdle > 30 ? 'Caution' : 'Optimal'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className={cn("text-[9px] font-black uppercase tracking-widest", colorClass)}>
                                 {status}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-white/40">
                             ₹{(p.stockLevel * p.pricePerUnit).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* Summary Bento Row */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="navy-panel p-5 rounded-2xl flex items-center gap-4 group hover:bg-white/5 transition-colors">
            <div className="bg-brand-gold/10 p-3 rounded-xl"><Package className="w-5 h-5 text-brand-gold" /></div>
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Catalog Depth</p>
              <p className="text-xl font-bold">{products.length} SKUs</p>
            </div>
          </div>
          <div className="navy-panel p-5 rounded-2xl flex items-center gap-4 group hover:bg-white/5 transition-colors">
            <div className="bg-red-500/10 p-3 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Restock Needed</p>
              <p className="text-xl font-bold">{lowStockItems.length} Items</p>
            </div>
          </div>
          <div className="navy-panel p-5 rounded-2xl flex items-center gap-4 group hover:bg-white/5 transition-colors">
            <div className="bg-blue-500/10 p-3 rounded-xl"><TrendingUp className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Asset Value</p>
              <p className="text-xl font-bold">₹{(totalAssetValue / 100000).toFixed(1)}L</p>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="navy-panel w-full max-w-sm rounded-3xl overflow-hidden border border-brand-gold/30 p-8 space-y-6"
            >
              <div>
                <h3 className="text-xl font-black gold-text uppercase tracking-tighter mb-1">Category Manager</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Manage product groupings</p>
              </div>

              <form onSubmit={handleAddCategory} className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-1">Category Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-brand-gold"
                    placeholder="e.g. Backlit"
                    value={newCategory.name}
                    onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-1">Theme Color</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      className="w-12 h-10 bg-white/5 border border-white/10 rounded-xl p-1 cursor-pointer"
                      value={newCategory.color}
                      onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                    />
                    <button 
                      type="submit"
                      disabled={isAddingCategory}
                      className="flex-1 gold-gradient text-brand-navy rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 disabled:opacity-50"
                    >
                      {isAddingCategory ? '...' : 'Add'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5 group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm font-bold text-slate-200">{cat.name}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1.5 hover:bg-red-500/10 text-white/20 hover:text-red-400 rounded transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/5">
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-full bg-white/5 border border-white/10 text-white/60 py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-white/10 transition-all text-xs"
                >
                  Close Manager
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-brand-navy/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-brand-navy border border-white/10 p-8 rounded-3xl max-w-sm w-full relative z-10 text-center"
            >
              <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3>
              <p className="text-white/40 text-sm mb-8 font-medium">This action will permanently delete this product and cannot be undone.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Adjust Stock Modal */}
      <AnimatePresence>
        {isAdjustModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="navy-panel w-full max-w-sm rounded-3xl overflow-hidden border border-emerald-500/20"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <RefreshCw className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h4 className="text-base font-black text-white uppercase tracking-tighter">
                    Adjust Stock
                  </h4>
                </div>
                <button onClick={() => setIsAdjustModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Product</p>
                  <p className="font-bold text-slate-200">{adjustmentTarget?.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Change Amount</label>
                    <input 
                      type="number" 
                      placeholder="e.g. -5 or 10"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-brand-gold outline-none"
                      value={adjustmentData.amount || ''}
                      onChange={e => setAdjustmentData({...adjustmentData, amount: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <p className="text-[9px] text-white/40 leading-tight">Positive (+) to add stock, Negative (-) to remove.</p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Adjustment Note</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Damage, Restock, Correction"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold outline-none"
                    value={adjustmentData.note}
                    onChange={e => setAdjustmentData({...adjustmentData, note: e.target.value})}
                  />
                </div>

                <button 
                  onClick={handleManualAdjustment}
                  disabled={adjustmentData.amount === 0}
                  className="w-full gold-gradient text-brand-navy py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 shadow-lg disabled:opacity-50"
                >
                  Confirm Adjustment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="navy-panel w-full max-w-md rounded-3xl overflow-hidden border border-brand-gold/20"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h4 className="text-xl font-black gold-text uppercase tracking-tighter">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h4>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Product Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black gold-text uppercase tracking-widest block">Category</label>
                        <button 
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          className="text-[9px] font-black gold-text uppercase tracking-widest hover:underline"
                        >
                          + New Category
                        </button>
                      </div>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold outline-none"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="" disabled className="bg-brand-navy">Select Category</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name} className="bg-brand-navy">{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Unit</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold outline-none"
                        value={formData.unit}
                        onChange={e => setFormData({...formData, unit: e.target.value as any})}
                      >
                        <option value="sq ft" className="bg-brand-navy">sq ft</option>
                        <option value="pcs" className="bg-brand-navy">pcs</option>
                        <option value="rolls" className="bg-brand-navy">rolls</option>
                        <option value="liters" className="bg-brand-navy">liters</option>
                        <option value="meter" className="bg-brand-navy">meter</option>
                        <option value="sheet" className="bg-brand-navy">sheet</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Initial Stock</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold outline-none"
                        value={formData.stockLevel}
                        onChange={e => setFormData({...formData, stockLevel: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Low Stock Alert</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold outline-none"
                        value={formData.lowStockThreshold}
                        onChange={e => setFormData({...formData, lowStockThreshold: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Price Per Unit (₹)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold outline-none"
                      value={formData.pricePerUnit}
                      onChange={e => setFormData({...formData, pricePerUnit: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 gold-gradient text-brand-navy-dark font-black uppercase tracking-widest rounded-2xl shadow-xl hover:brightness-110 transition-all"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
