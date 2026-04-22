import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  increment,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  getDoc,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string; // Now references Category name or ID
  stockLevel: number;
  unit: 'sq ft' | 'pcs' | 'rolls' | 'liters' | 'meter' | 'sheet';
  pricePerUnit: number;
  lowStockThreshold: number;
  lastRestocked?: Date;
  createdAt: Date;
  updatedAt?: Date;
  addedBy?: string;
  addedByEmail?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'PURCHASE' | 'JOB_CONSUMPTION';
  amount: number;
  previousStock: number;
  newStock: number;
  timestamp: any;
  referenceId?: string;
  note?: string;
  performedBy?: string;
}

export const inventoryService = {
  // Category Management
  async getCategories() {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Category[];
  },

  subscribeToCategories(callback: (categories: Category[]) => void) {
    const q = query(collection(db, 'categories'), orderBy('name'));
    return onSnapshot(q, 
      (snapshot) => {
        const categories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];
        callback(categories);
      },
      (error) => {
        console.error("Error subscribing to categories:", error);
      }
    );
  },

  async addCategory(category: Omit<Category, 'id'>) {
    return addDoc(collection(db, 'categories'), category);
  },

  async updateCategory(id: string, updates: Partial<Category>) {
    return updateDoc(doc(db, 'categories', id), updates);
  },

  async deleteCategory(id: string) {
    return deleteDoc(doc(db, 'categories', id));
  },

  // Product Management
  async getProducts() {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastRestocked: doc.data().lastRestocked?.toDate()
    })) as Product[];
  },

  subscribeToProducts(callback: (products: Product[]) => void) {
    const q = query(collection(db, 'products'), orderBy('name'));
    return onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
          lastRestocked: doc.data().lastRestocked?.toDate()
        })) as Product[];
        callback(items);
      },
      (error) => {
        console.error("Error subscribing to products:", error);
      }
    );
  },

  subscribeToMovements(callback: (movements: InventoryMovement[]) => void) {
    const q = query(collection(db, 'inventoryMovements'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as InventoryMovement[];
        callback(items);
      },
      (error) => {
        console.error("Error subscribing to movements:", error);
      }
    );
  },

  async addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'lastRestocked'>, user?: { name: string, email: string }) {
    const productsRef = collection(db, 'products');
    const data = {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastRestocked: product.stockLevel > 0 ? serverTimestamp() : null,
      addedBy: user?.name || 'System',
      addedByEmail: user?.email || ''
    };
    
    const docRef = await addDoc(productsRef, data);

    if (product.stockLevel > 0) {
      await addDoc(collection(db, 'inventoryMovements'), {
        productId: docRef.id,
        productName: product.name,
        type: 'IN',
        amount: product.stockLevel,
        previousStock: 0,
        newStock: product.stockLevel,
        timestamp: serverTimestamp(),
        note: 'Opening Stock',
        performedBy: user?.name || 'System'
      });
    }

    return docRef;
  },

  async updateProduct(id: string, updates: Partial<Product>, user?: { name: string }) {
    const productRef = doc(db, 'products', id);
    return updateDoc(productRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async adjustStock(id: string, amount: number, type: InventoryMovement['type'] = 'ADJUSTMENT', note: string = '', referenceId: string = '', user?: { name: string }) {
    const productRef = doc(db, 'products', id);
    
    // Get fresh data for accurate recording
    const products = await this.getProducts();
    const product = products.find(p => p.id === id);
    if (!product) throw new Error('Product not found');
    const currentStock = product.stockLevel || 0;

    const updates: any = {
      stockLevel: increment(amount),
      updatedAt: serverTimestamp()
    };
    if (amount > 0) updates.lastRestocked = serverTimestamp();
    
    await updateDoc(productRef, updates);

    await addDoc(collection(db, 'inventoryMovements'), {
      productId: id,
      productName: product.name,
      type: type,
      amount: amount,
      previousStock: currentStock,
      newStock: currentStock + amount,
      timestamp: serverTimestamp(),
      referenceId,
      note,
      performedBy: user?.name || 'System'
    });
  },

  async bulkAdjustStock(adjustments: { id: string, amount: number, note?: string, referenceId?: string, type?: InventoryMovement['type'] }[], user?: { name: string }) {
    const batch = writeBatch(db);
    
    // Fetch current state for each product in parallel if needed for movement logs
    // Or just use increment if we don't strictly need "previousStock" to be 100% accurate in logs without a transaction
    const snapshots = await Promise.all(
      adjustments.map(adj => getDoc(doc(db, 'products', adj.id)))
    );

    adjustments.forEach((adj, index) => {
      const snap = snapshots[index];
      if (!snap.exists()) return;
      
      const product = snap.data();
      const currentStock = product.stockLevel || 0;
      const productRef = doc(db, 'products', adj.id);

      batch.update(productRef, {
        stockLevel: increment(adj.amount),
        updatedAt: serverTimestamp(),
        lastRestocked: adj.amount > 0 ? serverTimestamp() : (product.lastRestocked || null)
      });

      const movementRef = doc(collection(db, 'inventoryMovements'));
      batch.set(movementRef, {
        productId: adj.id,
        productName: product.name,
        type: adj.type || 'ADJUSTMENT',
        amount: adj.amount,
        previousStock: currentStock,
        newStock: currentStock + adj.amount,
        timestamp: serverTimestamp(),
        referenceId: adj.referenceId,
        note: adj.note,
        performedBy: user?.name || 'System'
      });
    });

    await batch.commit();
  },

  async deleteProduct(id: string) {
    const productRef = doc(db, 'products', id);
    return deleteDoc(productRef);
  }
};
