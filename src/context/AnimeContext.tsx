import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';

interface Anime {
  id: string;
  title: string;
  description: string;
  genre: string;
  posterUrl: string;
  createdAt: any;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration: string;
  benefits: string[];
}

interface AnimeContextType {
  animes: Anime[];
  loading: boolean;
}

const AnimeContext = createContext<AnimeContextType | undefined>(undefined);

export const AnimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const animeQuery = query(collection(db, 'anime'));
    const unsubAnime = onSnapshot(animeQuery, (snapshot) => {
      const animeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Anime));
      // Sort client-side to handle missing createdAt or updatedAt
      setAnimes(animeList.sort((a, b) => {
        const dateA = (a as any).updatedAt?.seconds || a.createdAt?.seconds || 0;
        const dateB = (b as any).updatedAt?.seconds || b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));
      setLoading(false);
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, 'anime');
      if (error.code === 'resource-exhausted') {
        toast.error("Database quota exceeded. Please try again tomorrow.");
      }
      setLoading(false);
    });

    return () => {
      unsubAnime();
    };
  }, []);

  return (
    <AnimeContext.Provider value={{ animes, loading }}>
      {children}
    </AnimeContext.Provider>
  );
};

export const useAnime = () => {
  const context = useContext(AnimeContext);
  if (context === undefined) {
    throw new Error('useAnime must be used within an AnimeProvider');
  }
  return context;
};
