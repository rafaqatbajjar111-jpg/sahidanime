import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { Bell, X, Check, Info, AlertCircle, Trash2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'update';
  read: boolean;
  createdAt: any;
}

export const NotificationPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(docs);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id: string) => {
    await deleteDoc(doc(db, 'notifications', id));
  };

  const clearAll = async () => {
    const batch = writeBatch(db);
    notifications.forEach(n => {
      batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'update': return <Sparkles className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-zinc-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed md:absolute inset-0 md:inset-auto md:top-16 md:right-0 w-full md:w-96 h-full md:h-auto md:max-h-[80vh] bg-zinc-950 md:bg-zinc-900 border-0 md:border md:border-zinc-800 rounded-none md:rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col"
    >
      <div className="p-4 md:p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />
          <h3 className="font-black text-white tracking-tight">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button 
              onClick={clearAll}
              className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
              title="Clear All"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-2 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-12 gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-500 font-bold">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 md:py-12 text-center px-6">
            <div className="w-16 h-16 md:w-12 md:h-12 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-4 md:mb-3">
              <Bell className="w-8 h-8 md:w-6 md:h-6 text-zinc-600" />
            </div>
            <h4 className="text-base md:text-sm font-black text-white mb-1">All caught up!</h4>
            <p className="text-xs md:text-[11px] text-zinc-500 font-medium">No new notifications at the moment.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "p-4 md:p-3 rounded-2xl border transition-all relative group",
                n.read 
                  ? "bg-zinc-900/30 border-transparent" 
                  : "bg-blue-600/5 border-blue-500/20 shadow-lg shadow-blue-600/5"
              )}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <div className="flex gap-3">
                <div className={cn(
                  "w-10 h-10 md:w-8 md:h-8 rounded-xl flex items-center justify-center shrink-0",
                  n.read ? "bg-zinc-800" : "bg-blue-600/20"
                )}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={cn(
                      "text-sm md:text-xs font-black truncate",
                      n.read ? "text-zinc-400" : "text-white"
                    )}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] md:text-[9px] text-zinc-600 font-bold whitespace-nowrap">
                      {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                    </span>
                  </div>
                  <p className={cn(
                    "text-xs md:text-[11px] leading-relaxed",
                    n.read ? "text-zinc-500" : "text-zinc-300"
                  )}>
                    {n.message}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(n.id);
                  }}
                  className="md:opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500 transition-all"
                >
                  <X className="w-4 h-4 md:w-3 md:h-3" />
                </button>
              </div>
              {!n.read && (
                <div className="absolute top-4 right-4 md:top-3 md:right-3 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              )}
            </motion.div>
          ))
        )}
      </div>

      {unreadCount > 0 && (
        <div className="p-4 md:p-3 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 sticky bottom-0">
          <button 
            onClick={markAllAsRead}
            className="w-full py-3 md:py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs md:text-[10px] font-black rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 md:w-3 md:h-3" />
            Mark all as read
          </button>
        </div>
      )}
    </motion.div>
  );
};
