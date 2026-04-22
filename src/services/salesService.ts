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

export interface TransactionItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  amount: number;
}

export interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface Transaction {
  id: string;
  type: 'Tax Invoice' | 'Proforma Invoice' | 'Credit Note' | 'Debit Note' | 'Sales Return' | 'Purchase Bill' | 'Purchase Return' | 'Payment Received' | 'Payment Paid' | 'Expense' | 'Vendor Payment';
  number: string;
  date: string;
  dueDate?: string;
  clientId?: string;
  clientName?: string;
  vendorId?: string;
  vendorName?: string;
  clientGSTIN?: string;
  vendorGSTIN?: string;
  billingAddress?: string;
  placeOfSupply: string;
  items: TransactionItem[];
  subtotal: number;
  discount: {
    type: 'Flat' | 'Percentage';
    value: number;
    beforeTax: boolean;
  };
  additionalCharges: AdditionalCharge[];
  transportation: {
    amount: number;
    isTaxable: boolean;
  };
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  roundOff: number;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue';
  paymentMode?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Credit';
  paymentTerms?: string;
  bankDetails?: BankDetails;
  referenceId?: string;
  relatedInvoiceId?: string;
  attachments: Attachment[];
  notes?: string;
  createdAt?: any;
}

export const salesService = {
  // Create a new transaction
  async createTransaction(transactionData: Omit<Transaction, 'id'>) {
    const transactionsRef = collection(db, 'transactions');
    return addDoc(transactionsRef, {
      ...transactionData,
      createdAt: serverTimestamp(),
    });
  },

  // Update an existing transaction
  async updateTransaction(transactionId: string, updates: Partial<Transaction>) {
    const transactionRef = doc(db, 'transactions', transactionId);
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).id;
    delete (cleanUpdates as any).createdAt;
    return updateDoc(transactionRef, cleanUpdates);
  },

  // Delete a transaction
  async deleteTransaction(transactionId: string) {
    const transactionRef = doc(db, 'transactions', transactionId);
    return deleteDoc(transactionRef);
  },

  // Real-time listener for transactions
  subscribeToTransactions(callback: (transactions: Transaction[]) => void) {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      callback(transactions);
    });
  }
};
