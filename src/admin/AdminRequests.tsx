import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { Check, X, Loader2, Clock, User, CreditCard, ShieldCheck, ShieldAlert, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlans } from '../hooks/usePlans';
import { getSubscriptionExpiration } from '../lib/subscriptionUtils';

interface Request {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  planId: string;
  planName: string;
  amount?: string;
  currency?: string;
  country?: string;
  transactionId: string;
  screenshot?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export const AdminRequests: React.FC = () => {
  const { user, userData } = useAuth();
  const { plans, loading: plansLoading } = usePlans();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  useEffect(() => {
    const isAdmin = userData?.role === 'admin';
    if (!isAdmin) {
      if (!loading) setLoading(false);
      return;
    }

    const q = query(collection(db, 'purchaseRequests'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
      setRequests(list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoading(false);
    }, (error) => {
      console.error("Admin Requests Fetch Error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [user, userData]);

  const handleAction = async (request: Request, action: 'approved' | 'rejected') => {
    setProcessing(request.id);
    try {
      const selectedPlan = plans.find(p => p.id === request.planId);
      const expirationDate = getSubscriptionExpiration(selectedPlan?.prices.DEFAULT.duration as 'month' | 'year' || 'month');

      // Update request status
      await updateDoc(doc(db, 'purchaseRequests', request.id), {
        status: action,
        updatedAt: serverTimestamp()
      });

      // Update user subscription status
      await updateDoc(doc(db, 'users', request.userId), {
        subscription_status: action === 'approved' ? 'active' : 'rejected',
        subscription_plan: action === 'approved' ? request.planName : 'none',
        subscription_method: action === 'approved' ? 'payment' : 'none',
        subscription_updated_at: serverTimestamp(),
        subscription_expiry: action === 'approved' ? expirationDate : null
      });

      toast.success(`Request ${action} successfully!`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="min-h-screen bg-black" />;

  return (
    <div className="space-y-8 py-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight">Purchase Requests</h1>
        <p className="text-zinc-500">Review and manage user subscription requests</p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Plan & Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Screenshot</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold">
                        {req.userName?.[0]?.toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm">{req.userName}</p>
                        <p className="text-xs text-zinc-500">{req.userId.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-sm">{req.planName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase">
                        <Globe className="w-3 h-3" />
                        {req.amount} {req.currency} ({req.country})
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="bg-zinc-800/50 border border-zinc-700/50 px-3 py-1.5 rounded-lg text-xs font-mono text-blue-400 select-all">
                      {req.transactionId}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {req.screenshot ? (
                      <button 
                        onClick={() => setViewingScreenshot(req.screenshot!)}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 hover:border-blue-500 transition-all"
                      >
                        <img src={req.screenshot} alt="Payment" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <span className="text-zinc-600 text-xs italic">No image</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <Clock className="w-4 h-4" />
                      {req.createdAt?.toDate().toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      req.status === 'pending' && "bg-yellow-500/10 text-yellow-500",
                      req.status === 'approved' && "bg-green-500/10 text-green-500",
                      req.status === 'rejected' && "bg-red-500/10 text-red-500",
                    )}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleAction(req, 'approved')}
                          disabled={!!processing}
                          className="p-2 bg-green-600/10 text-green-500 rounded-lg hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                        >
                          {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button 
                          onClick={() => handleAction(req, 'rejected')}
                          disabled={!!processing}
                          className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                        >
                          {processing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <div className="flex items-center justify-end gap-1 text-green-500">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs font-bold">Approved</span>
                      </div>
                    )}
                    {req.status === 'rejected' && (
                      <div className="flex items-center justify-end gap-1 text-red-500">
                        <ShieldAlert className="w-4 h-4" />
                        <span className="text-xs font-bold">Rejected</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No purchase requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshot Viewer Modal */}
      <AnimatePresence>
        {viewingScreenshot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full max-h-[90vh] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl"
            >
              <button 
                onClick={() => setViewingScreenshot(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="p-2 overflow-auto max-h-[90vh] custom-scrollbar">
                <img 
                  src={viewingScreenshot} 
                  alt="Payment Screenshot" 
                  className="w-full h-auto rounded-2xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
