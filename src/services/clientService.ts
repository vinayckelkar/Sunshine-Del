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

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  address?: string;
  type: 'Customer' | 'Vendor' | 'Both';
  createdAt?: any;
}

export const clientService = {
  // Create a new client
  async createClient(clientData: Omit<Client, 'id'>) {
    const clientsRef = collection(db, 'clients');
    return addDoc(clientsRef, {
      ...clientData,
      createdAt: serverTimestamp(),
    });
  },

  // Update an existing client
  async updateClient(clientId: string, updates: Partial<Client>) {
    const clientRef = doc(db, 'clients', clientId);
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).id;
    delete (cleanUpdates as any).createdAt;
    return updateDoc(clientRef, cleanUpdates);
  },

  // Delete a client
  async deleteClient(clientId: string) {
    const clientRef = doc(db, 'clients', clientId);
    return deleteDoc(clientRef);
  },

  // Real-time listener for clients
  subscribeToClients(callback: (clients: Client[]) => void) {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    return onSnapshot(q, 
      (snapshot) => {
        const clients = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];
        callback(clients);
      },
      (error) => {
        console.error("Error subscribing to clients:", error);
      }
    );
  },

  // Get all clients once
  async getClients() {
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
  }
};
