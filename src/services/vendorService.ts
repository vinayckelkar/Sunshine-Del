import { 
  collection, 
  doc, 
  updateDoc, 
  getDocs, 
  query, 
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  address?: string;
  category?: string;
  paymentTerms?: string;
  createdAt?: any;
}

export const vendorService = {
  // Create a new vendor
  async createVendor(vendorData: Omit<Vendor, 'id'>) {
    const vendorsRef = collection(db, 'vendors');
    return addDoc(vendorsRef, {
      ...vendorData,
      createdAt: serverTimestamp(),
    });
  },

  // Update an existing vendor
  async updateVendor(vendorId: string, updates: Partial<Vendor>) {
    const vendorRef = doc(db, 'vendors', vendorId);
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).id;
    delete (cleanUpdates as any).createdAt;
    return updateDoc(vendorRef, cleanUpdates);
  },

  // Delete a vendor
  async deleteVendor(vendorId: string) {
    const vendorRef = doc(db, 'vendors', vendorId);
    return deleteDoc(vendorRef);
  },

  // Real-time listener for vendors
  subscribeToVendors(callback: (vendors: Vendor[]) => void) {
    const q = query(collection(db, 'vendors'), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const vendors = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vendor[];
      callback(vendors);
    });
  },

  // Get all vendors once
  async getVendors() {
    const q = query(collection(db, 'vendors'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Vendor[];
  }
};
