import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'admin' | 'staff' | 'accountant';

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isAccountant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch or create user document in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role as UserRole);
        } else {
          // Default role assignment
          // Hardcoding the specified admin email
          const defaultRole: UserRole = firebaseUser.email === 'vinayckelkar@gmail.com' ? 'admin' : 'staff';
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: defaultRole,
            createdAt: new Date().toISOString()
          });
          setUserRole(defaultRole);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = userRole === 'admin';
  const isStaff = userRole === 'staff' || userRole === 'admin';
  const isAccountant = userRole === 'accountant' || userRole === 'admin';

  return (
    <AuthContext.Provider value={{ user, userRole, loading, logout, isAdmin, isStaff, isAccountant }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
