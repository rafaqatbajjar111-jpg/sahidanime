import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { isSubscriptionExpired } from '../lib/subscriptionUtils';
import { toast } from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';

interface UserData {
  uid: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  subscription_plan: string;
  subscription_status: 'active' | 'pending' | 'rejected' | 'none';
  subscription_expiry?: any;
  subscription_updated_at?: any;
  country: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous document listener
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            
            // Check for expiration
            if (data.subscription_status === 'active' && data.subscription_expiry) {
              if (isSubscriptionExpired(data.subscription_expiry)) {
                // Auto-expire subscription
                await updateDoc(userDocRef, {
                  subscription_status: 'none',
                  subscription_plan: 'none'
                });
                data.subscription_status = 'none';
                data.subscription_plan = 'none';
              }
            }

            // Fail-safe for master admins
            if (firebaseUser.email === 'rkkhatab872@gmail.com' || firebaseUser.email === 'mrkhatab112@gmail.com' || firebaseUser.email === 'admin@rex.com') {
              data.role = 'admin';
            }
            setUserData(data);
          } else {
            // Fail-safe for master admins if document is missing
            if (firebaseUser.email === 'rkkhatab872@gmail.com' || firebaseUser.email === 'mrkhatab112@gmail.com' || firebaseUser.email === 'admin@rex.com') {
              setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'Master Admin',
                role: 'admin',
                subscription_plan: 'none',
                subscription_status: 'none',
                country: 'Unknown'
              });
            } else {
              setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || 'User',
                role: 'user',
                subscription_plan: 'none',
                subscription_status: 'none',
                country: 'India'
              });
            }
          }
          setLoading(false);
          setIsAuthReady(true);
        }, (error: any) => {
          // Only log if it's not a permission error during logout/cleanup
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
            if (error.code === 'resource-exhausted') {
              toast.error("Database quota exceeded. Please try again tomorrow.");
            }
          }
          setLoading(false);
          setIsAuthReady(true);
        });
      } else {
        setUserData(null);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAuthReady }}>
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
