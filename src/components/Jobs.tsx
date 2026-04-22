import React, { useState, useEffect, useRef } from 'react';
import { 
  Hammer, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Image as ImageIcon, 
  MapPin, 
  User, 
  Camera,
  ChevronRight,
  MoreHorizontal,
  X,
  Upload,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Job, jobService, JobMaterial } from '../services/jobService';
import { inventoryService, Product } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ... mockJobs removed or used as fallback ...

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'Pending': 'bg-white/5 text-white/40 border-white/10',
    'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Completed': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Cancelled': 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles['Pending']}`}>
      {status}
    </span>
  );
};

const PaymentBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const isReceived = status === 'Received';
  return (
    <span className={cn(
      "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border flex items-center gap-1",
      isReceived 
        ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]" 
        : "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
    )}>
      <div className={cn("w-1 h-1 rounded-full", isReceived ? "bg-green-400" : "bg-red-400")} />
      {isReceived ? 'Payment Received' : 'Payment Pending'}
    </span>
  );
};

const MaterialManager = ({ 
  materials = [], 
  onUpdate 
}: { 
  materials?: JobMaterial[], 
  onUpdate: (mats: JobMaterial[]) => void 
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const unsub = inventoryService.subscribeToProducts(setProducts);
    return unsub;
  }, []);

  const addMaterial = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existing = materials.find(m => m.productId === selectedProductId);
    if (existing) {
      onUpdate(materials.map(m => 
        m.productId === selectedProductId 
          ? { ...m, quantity: m.quantity + quantity } 
          : m
      ));
    } else {
      onUpdate([...materials, { 
        productId: selectedProductId, 
        quantity, 
        unit: product.unit || 'units' 
      }]);
    }
    setSelectedProductId('');
    setQuantity(1);
  };

  const removeMaterial = (productId: string) => {
    onUpdate(materials.filter(m => m.productId !== productId));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs focus:border-brand-gold outline-none"
        >
          <option value="" disabled className="bg-brand-navy">Select Material...</option>
          {products.map(p => (
            <option key={p.id} value={p.id} className="bg-brand-navy">
              {p.name} ({p.currentStock} {p.unit} avail)
            </option>
          ))}
        </select>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          placeholder="Qty"
          className="w-20 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs focus:border-brand-gold outline-none"
        />
        <button
          type="button"
          onClick={addMaterial}
          className="px-4 py-2 bg-brand-gold/10 text-brand-gold rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold/20 transition-all font-mono"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {materials.map((mat, i) => {
          const product = products.find(p => p.id === mat.productId);
          return (
            <span key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] text-white/70 font-bold uppercase tracking-tighter">
              {product?.name || 'Unknown'} - {mat.quantity} {mat.unit}
              <button
                type="button"
                onClick={() => removeMaterial(mat.productId)}
                className="text-white/20 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export const Jobs = () => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null); // jobId_type
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editJobData, setEditJobData] = useState<Partial<Job>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newJob, setNewJob] = useState<Partial<Job>>({
    title: '',
    clientName: '',
    status: 'Pending',
    paymentStatus: 'Pending',
    location: '',
    deadline: '',
    staff: '',
    materials: []
  });

  useEffect(() => {
    const unsubscribe = jobService.subscribeToJobs((fetchedJobs) => {
      setJobs(fetchedJobs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJob.title || !newJob.clientName || !user) return;

    try {
      await jobService.createJob(newJob as Omit<Job, 'id'>, {
        name: user.displayName || 'Unnamed User',
        email: user.email || ''
      });
      setIsNewJobModalOpen(false);
      setNewJob({ 
        title: '', 
        clientName: '', 
        status: 'Pending', 
        paymentStatus: 'Pending', 
        location: '', 
        deadline: '', 
        staff: '',
        materialUsed: []
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !editJobData.title || !editJobData.clientName) return;

    try {
      await jobService.updateJob(selectedJob.id, editJobData);
      setSelectedJob({ ...selectedJob, ...editJobData } as Job);
      setIsEditMode(false);
    } catch (e) {
      console.error("Update failed", e);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      await jobService.deleteJob(jobId);
      setSelectedJob(null);
      setDeleteConfirmId(null);
    } catch (e) {
      console.error("Deletion failed", e);
    }
  };

  const handleFileUpload = async (jobId: string, type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadKey = `${jobId}_${type}`;
    setIsUploading(uploadKey);
    try {
      const url = await jobService.uploadPhoto(jobId, file, type);
      // Update selectedJob state if it's the one being viewed
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(prev => {
          if (!prev) return null;
          const photosKey = type === 'before' ? 'beforePhotos' : 'afterPhotos';
          return {
            ...prev,
            [photosKey]: [...(prev[photosKey] || []), url]
          };
        });
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload image. Please check your connection.");
    } finally {
      setIsUploading(null);
    }
  };

  const handleDeletePhoto = async (jobId: string, url: string, type: 'before' | 'after') => {
    if (!confirm("Are you sure you want to delete this photo?")) return;
    try {
      await jobService.deletePhoto(jobId, url, type);
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(prev => {
          if (!prev) return null;
          const photosKey = type === 'before' ? 'beforePhotos' : 'afterPhotos';
          return {
            ...prev,
            [photosKey]: (prev[photosKey] || []).filter(p => p !== url)
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const statusOptions = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'];

  const getStatusCount = (status: string) => {
    if (status === 'All') return jobs.length;
    return jobs.filter(j => j.status === status).length;
  };

  const filteredJobs = jobs.filter(job => 
    statusFilter === 'All' ? true : job.status === statusFilter
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold gold-text uppercase tracking-tighter">Live Project Pipeline</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium italic">Active Installations & Branding</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('list')}
                className={`px-4 py-1.5 rounded-lg text-xs tracking-widest uppercase transition-all ${viewMode === 'list' ? 'bg-brand-gold text-brand-navy-dark font-black' : 'text-white/40'}`}
              >
                List
              </button>
              <button 
                onClick={() => setViewMode('board')}
                className={`px-4 py-1.5 rounded-lg text-xs tracking-widest uppercase transition-all ${viewMode === 'board' ? 'bg-brand-gold text-brand-navy-dark font-black' : 'text-white/40'}`}
              >
                Board
              </button>
            </div>
            <button 
              onClick={() => setIsNewJobModalOpen(true)}
              className="gold-gradient text-brand-navy-dark px-6 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-transform"
            >
              + New Project
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap flex items-center gap-2",
                statusFilter === status 
                  ? "bg-brand-gold text-brand-navy-dark border-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
              )}
            >
              <span>{status}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[8px]",
                statusFilter === status ? "bg-brand-navy-dark/10 text-brand-navy-dark/60" : "bg-white/5 text-white/20"
              )}>
                {getStatusCount(status)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-grow">
          {filteredJobs.map((job) => (
            <div key={job.id} onClick={() => setSelectedJob(job)} className="navy-panel rounded-2xl overflow-hidden hover:border-brand-gold/40 transition-all flex flex-col group bg-gradient-to-br from-brand-navy to-brand-navy-dark cursor-pointer">
              <div className="p-6 flex-1 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={job.status} />
                    <PaymentBadge status={job.paymentStatus} />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedJob(job);
                        setIsEditMode(true);
                        setEditJobData(job);
                      }}
                      className="p-1.5 text-white/40 hover:text-brand-gold hover:bg-white/10 rounded-lg transition-all"
                      title="Edit Properties"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(job.id);
                      }}
                      className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Terminate Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-200 leading-tight group-hover:text-brand-gold transition-colors">{job.title}</h4>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">{job.clientName}</p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] uppercase font-black text-white/40 tracking-tighter">
                      <span>Installation Progress</span>
                      <span className="text-brand-gold">{job.progress || 0}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full gold-gradient rounded-full shadow-[0_0_8px_rgba(212,175,55,0.4)]" 
                        style={{ width: `${job.progress || 0}%` }} 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold text-[10px] font-black">{(job.staff || 'U').charAt(0)}</div>
                      <span className="text-xs text-white/70 font-medium">{job.staff || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/40">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{job.deadline || 'No Date'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/2 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-[10px] text-white/40 uppercase truncate w-32 font-bold tracking-tighter">{job.location || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {/* Before Photo Mini Counter */}
                    <div className="flex items-center gap-1 text-[10px] font-black text-white/30 uppercase">
                      <span>B:</span>
                      <span className="text-brand-gold">{job.beforePhotos?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-white/30 uppercase">
                      <span>A:</span>
                      <span className="text-brand-gold">{job.afterPhotos?.length || 0}</span>
                    </div>
                  </div>
                  <div className="bg-brand-gold text-brand-navy-dark p-2 rounded-lg cursor-pointer hover:scale-110 transition-all shadow-lg">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Create Job Placeholder */}
          <button 
            onClick={() => setIsNewJobModalOpen(true)}
            className="border-2 border-dashed border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-white/10 hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/2 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-white/2 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-brand-gold/10">
              <Plus className="w-8 h-8" />
            </div>
            <p className="font-black uppercase tracking-[0.2em] text-[10px]">Initialize Task</p>
          </button>
        </div>
      )}

      {/* Selected Job Modal for Photo Management */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="navy-panel w-full max-w-4xl rounded-3xl overflow-hidden border border-brand-gold/20 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-xl font-black gold-text uppercase tracking-tighter">{selectedJob.title}</h4>
                      <StatusBadge status={selectedJob.status} />
                      <PaymentBadge status={selectedJob.paymentStatus} />
                    </div>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{selectedJob.clientName} • {selectedJob.id}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsEditMode(!isEditMode);
                      if (!isEditMode) setEditJobData(selectedJob);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                      isEditMode ? "bg-brand-gold text-brand-navy-dark border-brand-gold" : "bg-white/5 text-white/40 border-white/10 hover:text-white"
                    )}
                  >
                    {isEditMode ? 'Cancel Edit' : 'Edit Properties'}
                  </button>
                </div>
                <button onClick={() => { setSelectedJob(null); setIsEditMode(false); }} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                {isEditMode ? (
                  <form onSubmit={handleUpdateJob} className="max-w-xl mx-auto space-y-8 py-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black gold-text uppercase tracking-widest">Project Title</label>
                        <input 
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold transition-colors"
                          value={editJobData.title}
                          onChange={e => setEditJobData({...editJobData, title: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black gold-text uppercase tracking-widest">Client Name</label>
                        <input 
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold transition-colors"
                          value={editJobData.clientName}
                          onChange={e => setEditJobData({...editJobData, clientName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black gold-text uppercase tracking-widest">Location</label>
                        <input 
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold transition-colors"
                          value={editJobData.location}
                          onChange={e => setEditJobData({...editJobData, location: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black gold-text uppercase tracking-widest">Deadline</label>
                        <input 
                          type="date" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold transition-colors"
                          value={editJobData.deadline}
                          onChange={e => setEditJobData({...editJobData, deadline: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black gold-text uppercase tracking-widest">Assigned Staff</label>
                        <input 
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold transition-colors"
                          value={editJobData.staff}
                          onChange={e => setEditJobData({...editJobData, staff: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black gold-text uppercase tracking-widest">Progress (%)</label>
                        <input 
                          type="number" 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-brand-gold transition-colors"
                          value={editJobData.progress}
                          onChange={e => setEditJobData({...editJobData, progress: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest">Update Pipeline Status</label>
                      <div className="grid grid-cols-4 gap-3">
                        {['Pending', 'In Progress', 'Completed', 'Cancelled'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setEditJobData({ ...editJobData, status: status as Job['status'] })}
                            className={cn(
                              "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                              editJobData.status === status
                                ? "bg-brand-gold text-brand-navy-dark border-brand-gold shadow-lg"
                                : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                            )}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest">Finance Control</label>
                      <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setEditJobData({ ...editJobData, paymentStatus: 'Pending' })}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            editJobData.paymentStatus === 'Pending' ? "bg-red-500/20 text-red-400" : "text-white/20"
                          )}
                        >
                          Payment Pending
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditJobData({ ...editJobData, paymentStatus: 'Received' })}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            editJobData.paymentStatus === 'Received' ? "bg-green-500/20 text-green-400" : "text-white/20"
                          )}
                        >
                          Payment Received
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest">Inventory Used (Materials)</label>
                      <MaterialManager 
                        materials={editJobData.materials || []} 
                        onUpdate={(mats) => setEditJobData({...editJobData, materials: mats})} 
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-4 gold-gradient text-brand-navy-dark font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-[1.02] transition-transform"
                    >
                      Save Changes
                    </button>
                  </form>
                ) : (
                  <div className="space-y-12">
                    {/* Key Stats Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 py-6 bg-white/2 rounded-3xl border border-white/5">
                      <div className="flex flex-col gap-1 items-center justify-center text-center border-r border-white/5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Deadline</span>
                        <div className="flex items-center gap-1.5 text-brand-gold">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs font-bold">{selectedJob.deadline || 'NOT SET'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center text-center border-r border-white/5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Location</span>
                        <div className="flex items-center gap-1.5 text-white/80">
                          <MapPin className="w-3 h-3 text-white/40" />
                          <span className="text-xs font-bold truncate max-w-[80px]">{selectedJob.location || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center text-center border-r border-white/5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Staff Assigned</span>
                        <div className="flex items-center gap-1.5 text-white/80">
                          <User className="w-3 h-3 text-white/40" />
                          <span className="text-xs font-bold truncate max-w-[80px]">{selectedJob.staff || 'UNASSIGNED'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-center justify-center text-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Job Progress</span>
                        <span className="text-xs font-black gold-text">{selectedJob.progress || 0}%</span>
                      </div>
                    </div>

                    {/* Materials Section */}
                    {selectedJob.materialUsed && selectedJob.materialUsed.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                          <div className="p-2 bg-brand-gold/10 rounded-lg">
                            <Hammer className="w-5 h-5 text-brand-gold" />
                          </div>
                          <h5 className="font-black text-white uppercase tracking-widest text-sm">Material Registry</h5>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.materialUsed.map((mat, i) => (
                            <span key={i} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-brand-gold uppercase tracking-tighter shadow-lg">
                              {mat}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Before Section */}
                    <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-400" />
                      </div>
                      <h5 className="font-black text-white uppercase tracking-widest text-sm">Site Before Work</h5>
                    </div>
                    <label className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all",
                      isUploading === `${selectedJob.id}_before` 
                        ? "bg-white/5 text-white/20" 
                        : "bg-brand-gold text-brand-navy-dark hover:scale-105"
                    )}>
                      {isUploading === `${selectedJob.id}_before` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {isUploading === `${selectedJob.id}_before` ? 'Uploading...' : 'Add Photo'}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(selectedJob.id, 'before', e)} disabled={!!isUploading} />
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedJob.beforePhotos?.map((url, i) => (
                      <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-white/10 group relative">
                        <img src={url} alt={`Before ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                           <button 
                             onClick={() => window.open(url, '_blank')}
                             className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                           >
                             <ImageIcon className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleDeletePhoto(selectedJob.id, url, 'before')}
                             className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-400 transition-colors"
                           >
                             <X className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                    ))}
                    {(!selectedJob.beforePhotos || selectedJob.beforePhotos.length === 0) && (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-white/10">
                        <Camera className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No "Before" Evidence Found</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* After Section */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </div>
                      <h5 className="font-black text-white uppercase tracking-widest text-sm">Site After Job</h5>
                    </div>
                    <label className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all",
                      isUploading === `${selectedJob.id}_after` 
                        ? "bg-white/5 text-white/20" 
                        : "bg-brand-gold text-brand-navy-dark hover:scale-105"
                    )}>
                      {isUploading === `${selectedJob.id}_after` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {isUploading === `${selectedJob.id}_after` ? 'Uploading...' : 'Add Photo'}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(selectedJob.id, 'after', e)} disabled={!!isUploading} />
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedJob.afterPhotos?.map((url, i) => (
                      <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-white/10 group relative">
                        <img src={url} alt={`After ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                           <button 
                             onClick={() => window.open(url, '_blank')}
                             className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                           >
                             <ImageIcon className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleDeletePhoto(selectedJob.id, url, 'after')}
                             className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-full text-red-400 transition-colors"
                           >
                             <X className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                    ))}
                    {(!selectedJob.afterPhotos || selectedJob.afterPhotos.length === 0) && (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl text-white/10">
                        <Camera className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No Completion Media Available</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>

          <div className="p-6 bg-white/2 border-t border-white/10 flex justify-between items-center">
                 <button 
                   onClick={() => setDeleteConfirmId(selectedJob.id)}
                   className="px-6 py-3 bg-red-500/10 text-red-400 font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all text-[9px] border border-red-500/20"
                 >
                   Terminate Project
                 </button>
                 <button 
                   onClick={() => { setSelectedJob(null); setIsEditMode(false); }} 
                   className="px-8 py-3 bg-white/5 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all text-xs"
                 >
                   Close Registry
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Job Modal */}
      <AnimatePresence>
        {isNewJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="navy-panel w-full max-w-md rounded-3xl overflow-hidden border border-brand-gold/20 flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h4 className="text-xl font-black gold-text uppercase tracking-tighter">Initialize New Task</h4>
                <button onClick={() => setIsNewJobModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateJob} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Project Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Hospital Signage"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50 transition-all text-sm"
                      value={newJob.title}
                      onChange={e => setNewJob({...newJob, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Client Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. MediCare Hub"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50 transition-all text-sm"
                      value={newJob.clientName}
                      onChange={e => setNewJob({...newJob, clientName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Location</label>
                      <input 
                        type="text" 
                        placeholder="Gurgaon"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50 transition-all text-sm"
                        value={newJob.location}
                        onChange={e => setNewJob({...newJob, location: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-2">Deadline</label>
                      <input 
                        type="date" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold/50 transition-all text-sm"
                        value={newJob.deadline}
                        onChange={e => setNewJob({...newJob, deadline: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-3">Starting Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Pending', 'In Progress', 'Completed', 'Cancelled'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setNewJob({ ...newJob, status: status as Job['status'] })}
                          className={cn(
                            "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                            newJob.status === status
                              ? "bg-brand-gold text-brand-navy-dark border-brand-gold shadow-lg"
                              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newJob.status === 'Completed' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-3">Finance Record</label>
                      <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setNewJob({ ...newJob, paymentStatus: 'Pending' })}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            newJob.paymentStatus === 'Pending' ? "bg-red-500/20 text-red-400" : "text-white/20"
                          )}
                        >
                          Payment Pending
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewJob({ ...newJob, paymentStatus: 'Received' })}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            newJob.paymentStatus === 'Received' ? "bg-green-500/20 text-green-400" : "text-white/20"
                          )}
                        >
                          Payment Received
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black gold-text uppercase tracking-widest block mb-3">Project Materials</label>
                    <MaterialManager 
                      materials={newJob.materials || []}
                      onUpdate={(mats) => setNewJob({ ...newJob, materials: mats })}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 gold-gradient text-brand-navy-dark font-black uppercase tracking-widest rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Create Project
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-brand-navy-dark/95 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="navy-panel w-full max-w-md rounded-3xl overflow-hidden border border-red-500/30 p-8 text-center relative z-10"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Delete Project?</h3>
              <p className="text-sm text-white/40 font-medium mb-8 leading-relaxed">
                You are about to permanently remove this project from the registry. 
                <span className="block mt-1 font-bold text-red-400/60 uppercase text-[10px] tracking-widest">This action cannot be undone.</span>
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="py-4 bg-white/5 text-white/40 font-black uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all text-xs"
                >
                  Keep Project
                </button>
                <button
                  onClick={() => handleDeleteJob(deleteConfirmId)}
                  className="py-4 bg-red-500/20 text-red-400 font-black uppercase tracking-widest rounded-xl hover:bg-red-500/30 transition-all text-xs border border-red-500/20"
                >
                  Kill Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
