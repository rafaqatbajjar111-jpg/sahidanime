import React, { useState } from 'react';
import { doc, getDoc, arrayUnion, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Ticket, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Crown, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { usePlans } from '../hooks/usePlans';
import { getSubscriptionExpiration } from '../lib/subscriptionUtils';

export const RedeemCode: React.FC = () => {
  const { user, userData } = useAuth();
  const { plans, loading: plansLoading } = usePlans();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redeemedPlan, setRedeemedPlan] = useState('');

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to redeem a code');
    if (!code.trim()) return toast.error('Please enter a redeem code');

    setIsRedeeming(true);
    try {
      const codeId = code.trim().toUpperCase();
      const codeRef = doc(db, 'redeemCodes', codeId);
      const codeSnapshot = await getDoc(codeRef);

      if (!codeSnapshot.exists()) {
        throw new Error('Invalid redeem code');
      }

      const codeData = codeSnapshot.data();
      const selectedPlan = plans.find(p => p.id === codeData.planId);
      const expirationDate = getSubscriptionExpiration(selectedPlan?.prices.DEFAULT.duration as 'month' | 'year' || 'month');

      if (codeData.usedCount >= codeData.maxUses) {
        throw new Error('This code has reached its maximum usage limit');
      }

      if (codeData.usedBy && codeData.usedBy.includes(user.uid)) {
        throw new Error('You have already redeemed this code');
      }

      const batch = writeBatch(db);

      // Update code usage
      batch.update(codeRef, {
        usedCount: increment(1),
        usedBy: arrayUnion(user.uid)
      });

      // Update user subscription
      batch.update(doc(db, 'users', user.uid), {
        subscription_plan: codeData.planId,
        subscription_status: 'active',
        subscription_method: 'coupon',
        subscription_updated_at: serverTimestamp(),
        subscription_expiry: expirationDate
      });

      await batch.commit();

      setRedeemedPlan(codeData.planName);
      setSuccess(true);
      toast.success('Code redeemed successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsRedeeming(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 w-full max-w-md text-center space-y-8 relative overflow-hidden"
        >
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/10 blur-[80px] rounded-full" />
          
          <div className="relative z-10 space-y-6">
            <div className="w-24 h-24 bg-green-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-green-500/10 animate-bounce">
              <ShieldCheck className="w-12 h-12 text-green-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight">Success!</h1>
              <p className="text-zinc-400">Your account is now upgraded to <span className="text-green-500 font-bold">{redeemedPlan}</span></p>
            </div>

            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Premium Activated</p>
                  <p className="text-[10px] text-zinc-500">Enjoy ad-free streaming and more</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate('/')}
              className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Start Watching Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 w-full max-w-md relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full" />
        
        <div className="relative z-10 space-y-8">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-2">
              <Ticket className="w-10 h-10 text-blue-500" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Redeem Code</h1>
            <p className="text-zinc-500 text-sm">Enter your code to unlock premium features</p>
          </div>

          <form onSubmit={handleRedeem} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Your Code</label>
              <input 
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENTER-CODE-HERE"
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-center text-lg tracking-widest uppercase"
              />
            </div>

            <button 
              disabled={isRedeeming || !code.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
            >
              {isRedeeming ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Redeem Now
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs text-zinc-500">
              Don't have a code? <Link to="/premium" className="text-blue-500 font-bold hover:underline">Buy Premium</Link>
            </p>
          </div>

          <div className="pt-6 border-t border-zinc-800/50">
            <div className="flex items-center gap-3 p-4 bg-zinc-800/30 rounded-2xl border border-zinc-700/30">
              <AlertCircle className="w-5 h-5 text-zinc-500 shrink-0" />
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Redeem codes are case-sensitive and can only be used once per account. If you face any issues, contact support.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
