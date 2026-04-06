import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export const createNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'error' | 'update' = 'info') => {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const notifyAllUsers = async (title: string, message: string, type: 'info' | 'success' | 'error' | 'update' = 'update') => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const notifications = usersSnapshot.docs.map(userDoc => ({
      userId: userDoc.id,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp()
    }));

    // Firestore batch limit is 500, but for simplicity and reliability in this context, 
    // we'll just loop. For a real app with many users, use a Cloud Function.
    for (const notification of notifications) {
      await addDoc(collection(db, 'notifications'), notification);
    }
  } catch (error) {
    console.error('Error notifying all users:', error);
  }
};
