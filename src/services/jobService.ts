import { 
  collection, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  getDocs, 
  query, 
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';

export interface JobMaterial {
  productId: string;
  quantity: number;
  unit: string;
}

export interface Job {
  id: string;
  title: string;
  clientName: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  paymentStatus?: 'Pending' | 'Received';
  beforePhotos?: string[];
  afterPhotos?: string[];
  location?: string;
  progress?: number;
  deadline?: string;
  staff?: string;
  materialUsed?: string[]; // Legacy support
  materials?: JobMaterial[];
  createdAt?: any;
}

export const jobService = {
  // Create a new job
  async createJob(jobData: Omit<Job, 'id'>, user: { name: string, email: string }) {
    const jobsRef = collection(db, 'jobs');
    const docRef = await addDoc(jobsRef, {
      ...jobData,
      createdAt: serverTimestamp(),
      progress: jobData.progress || 0,
      beforePhotos: [],
      afterPhotos: []
    });

    // Automatically deduct materials from inventory
    if (jobData.materials && jobData.materials.length > 0) {
      const adjustments = jobData.materials.map(m => ({
        id: m.productId,
        amount: -m.quantity,
        type: 'OUT' as const,
        note: `Job Consumption: ${jobData.title}`
      }));
      
      const { inventoryService } = await import('./inventoryService');
      await inventoryService.bulkAdjustStock(adjustments, user);
    }

    return docRef;
  },

  // Upload photo to storage and return URL
  async uploadPhoto(jobId: string, file: File, type: 'before' | 'after'): Promise<string> {
    const storageRef = ref(storage, `jobs/${jobId}/${type}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null,
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          // Update Firestore
          const jobRef = doc(db, 'jobs', jobId);
          await updateDoc(jobRef, {
            [type === 'before' ? 'beforePhotos' : 'afterPhotos']: arrayUnion(downloadURL)
          });
          
          resolve(downloadURL);
        }
      );
    });
  },

  // Delete photo from storage and reference from doc
  async deletePhoto(jobId: string, url: string, type: 'before' | 'after') {
    // 1. Delete from Storage
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn("Storage deletion failed (likely doesn't exist or already deleted):", e);
    }

    // 2. Remove from Firestore
    const jobRef = doc(db, 'jobs', jobId);
    return updateDoc(jobRef, {
      [type === 'before' ? 'beforePhotos' : 'afterPhotos']: arrayRemove(url)
    });
  },

  // Update an existing job
  async updateJob(jobId: string, updates: Partial<Job>) {
    const jobRef = doc(db, 'jobs', jobId);
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).id;
    delete (cleanUpdates as any).createdAt;
    return updateDoc(jobRef, cleanUpdates);
  },

  // Delete a job entirely
  async deleteJob(jobId: string) {
    const jobRef = doc(db, 'jobs', jobId);
    return deleteDoc(jobRef);
  },

  // Real-time listener for jobs
  subscribeToJobs(callback: (jobs: Job[]) => void) {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, 
      (snapshot) => {
        const jobs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];
        callback(jobs);
      },
      (error) => {
        console.error("Error subscribing to jobs:", error);
      }
    );
  }
};
