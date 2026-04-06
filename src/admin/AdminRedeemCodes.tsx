import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, setDoc, deleteDoc, doc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Users, 
  Calendar, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  X,
  Crown,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { usePlans } from '../hooks/usePlans';

interface RedeemCode {
  id: string;
  code: string;
  planId: string;
  planName: string;
  maxUses: number;
  usedCount: number;
  usedBy: string[];
  createdAt: any;
}

export const AdminRedeemCodes: React.FC = () => {
  const { userData } = useAuth();
  const { plans, loading: plansLoading } = usePlans();
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newCode, setNewCode] = useState({
    code: '',
    planId: '',
    maxUses: 1
  });

  useEffect(() => {
    if (plans.length > 0 && !newCode.planId) {
      setNewCode(prev => ({ ...prev, planId: plans[0].id }));
    }
  }, [plans]);

  useEffect(() => {
    const isAdmin = userData?.role === 'admin';
    if (!isAdmin) {
      if (!loading) setLoading(false);
      return;
    }

    const q = query(collection(db, 'redeemCodes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const codeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RedeemCode));
      setCodes(codeList);
      setLoading(false);
    }, (error) => {
      console.error("Redeem Codes Snapshot Error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode({ ...newCode, code: result });
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.code || !newCode.planId || newCode.maxUses < 1) {
      return toast.error('Please fill all fields correctly');
    }

    setIsSubmitting(true);
    try {
      const codeId = newCode.code.trim().toUpperCase();
      const codeRef = doc(db, 'redeemCodes', codeId);
      
      // Check if code already exists
      const existingDoc = await getDoc(codeRef);
      if (existingDoc.exists()) {
        throw new Error('This code already exists');
      }

      const selectedPlan = plans.find(p => p.id === newCode.planId);
      await setDoc(codeRef, {
        code: codeId,
        planId: newCode.planId,
        planName: selectedPlan?.name || 'Unknown Plan',
        maxUses: Number(newCode.maxUses),
        usedCount: 0,
        usedBy: [],
        createdAt: serverTimestamp()
      });
      toast.success('Redeem code created successfully!');
      setShowAddModal(false);
      setNewCode({ code: '', planId: plans[0].id, maxUses: 1 });
    } catch (error: any) {
      toast.error('Failed to create code: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);

  const handleDeleteCode = async (id: string) => {
    setDeletingCodeId(id);
  };

  const confirmDelete = async () => {
    if (!deletingCodeId) return;
    try {
      await deleteDoc(doc(db, 'redeemCodes', deletingCodeId));
      toast.success('Code deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete code: ' + error.message);
    } finally {
      setDeletingCodeId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied to clipboard!');
  };

  return (
    <div className="space-y-8 py-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-blue-500" />
            Redeem Codes
          </h1>
          <p className="text-zinc-500">Create and manage subscription redeem codes</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Create Code
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-[2rem] space-y-4">
          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8 text-zinc-600" />
          </div>
          <div className="space-y-1">
            <p className="text-zinc-400 font-bold">No redeem codes found</p>
            <p className="text-zinc-600 text-sm">Create your first code to get started</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {codes.map((code) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={code.id}
              className="bg-zinc-900/50 border border-zinc-800 p-4 lg:p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-zinc-700 transition-colors group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Hash className="w-7 h-7 text-blue-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-xl tracking-tight text-white">{code.code}</h3>
                    <button 
                      onClick={() => copyToClipboard(code.code)}
                      className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Crown className="w-3 h-3" /> {code.planName}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Users className="w-3 h-3" /> {code.usedCount}/{code.maxUses} Uses
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Calendar className="w-3 h-3" /> 
                      {code.createdAt?.toDate().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  code.usedCount >= code.maxUses 
                    ? "bg-red-500/10 text-red-500" 
                    : "bg-green-500/10 text-green-500"
                )}>
                  {code.usedCount >= code.maxUses ? 'Fully Used' : 'Active'}
                </div>
                <button 
                  onClick={() => handleDeleteCode(code.id)}
                  className="p-3 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingCodeId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 w-full max-w-sm text-center space-y-6"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black">Delete Code?</h2>
                <p className="text-zinc-500 text-sm">This action cannot be undone. Are you sure you want to delete this redeem code?</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingCodeId(null)}
                  className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Code Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 w-full max-w-md relative overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full" />
              
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-6 relative z-10">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Ticket className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">Create Redeem Code</h2>
                  <p className="text-zinc-500 text-sm">Generate a new subscription code</p>
                </div>

                <form onSubmit={handleCreateCode} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Redeem Code</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newCode.code}
                        onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                        placeholder="SUMMER2024"
                        className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                      />
                      <button 
                        type="button"
                        onClick={generateRandomCode}
                        className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-2xl text-zinc-400 hover:text-white hover:border-blue-500 transition-all"
                        title="Generate Random Code"
                      >
                        <Hash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Select Plan</label>
                    <div className="grid gap-2">
                      {plans.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setNewCode({ ...newCode, planId: plan.id })}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border transition-all text-left",
                            newCode.planId === plan.id 
                              ? "bg-blue-600/10 border-blue-500 text-blue-500" 
                              : "bg-zinc-800/30 border-zinc-700/30 text-zinc-400 hover:border-zinc-600"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Crown className={cn("w-4 h-4", newCode.planId === plan.id ? "text-blue-500" : "text-zinc-600")} />
                            <span className="font-bold text-sm">{plan.name}</span>
                          </div>
                          {newCode.planId === plan.id && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Max Users</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="number"
                        min="1"
                        value={newCode.maxUses}
                        onChange={(e) => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) })}
                        className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium flex items-center gap-1 ml-1">
                      <AlertCircle className="w-3 h-3" /> How many users can use this code
                    </p>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 mt-4"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        Create Redeem Code
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
