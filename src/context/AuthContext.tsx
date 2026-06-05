import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Here we check if user is admin
        if (u.email?.toLowerCase() === 'moises.gadi@gmail.com'.toLowerCase() || u.email?.toLowerCase() === 'noreply.gpsproducts@gmail.com'.toLowerCase()) {
          setIsAdmin(true);
        } else {
          // Check DB admins collection just in case
          try {
            const adminDoc = await getDoc(doc(db, 'admins', u.uid));
            setIsAdmin(adminDoc.exists());
          } catch (err) {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
