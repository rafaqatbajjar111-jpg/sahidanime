import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Globe, Crown, ShieldCheck, Clock, Settings, LogOut, Lock, Eye, EyeOff, Loader2, X, RefreshCcw, ArrowRight } from 'lucide-react';
import { signOut, updatePassword } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export const Profile: React.FC = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

  // Check if eligible for refund (within 2 minutes of purchase)
  const canRefund = () => {
    if (userData?.subscription_status !== 'active' || !userData?.subscription_updated_at) return false;
    
    const updatedAt = userData.subscription_updated_at?.toDate?.() || new Date(userData.subscription_updated_at);
    const now = new Date();
    const diffInMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
    
    return diffInMinutes <= 2;
  };

  const handleRefund = async () => {
    if (!user || !userData) return;
    if (!window.confirm("Are you sure you want to request a refund? Your premium access will be removed immediately.")) return;

    setIsRefunding(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // 1. Update User Status
      await updateDoc(userRef, {
        subscription_status: 'none',
        subscription_plan: 'none',
        subscription_expiry: null,
        refunded_at: serverTimestamp()
      });

      // 2. Create Refund Request Record
      await addDoc(collection(db, 'refundRequests'), {
        userId: user.uid,
        userEmail: userData.email,
        userName: userData.name,
        planId: userData.subscription_plan,
        requestedAt: serverTimestamp(),
        status: 'pending'
      });

      // 3. Notify User
      await addDoc(collection(db, 'notifications'), {
        userId: user.uid,
        title: 'Refund Requested 💸',
        message: 'Your refund request has been submitted. Premium access removed. Funds will be returned in 5-7 days.',
        type: 'info',
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success("Refund requested successfully. Premium access removed.");
    } catch (error: any) {
      console.error("Refund Error:", error);
      toast.error("Failed to process refund: " + error.message);
    } finally {
      setIsRefunding(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    if (!auth.currentUser) return;

    setIsUpdating(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      toast.success("Password updated successfully");
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error("Password Update Error:", error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Please logout and login again to change your password for security reasons.");
      } else {
        toast.error(`Failed to update password: ${error.message}`);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 px-4">
      {/* Profile Header Card */}
      <div className="relative group">
        {/* Animated Background Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {/* Cover Image Area */}
          <div className="h-48 bg-gradient-to-br from-zinc-800 to-zinc-950 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute top-6 right-6">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl">
                <img 
                  src="https://i.ibb.co/r2BqPyM1/IMG-20260406-235046-639.jpg" 
                  alt="Site Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="px-8 pb-8">
            <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
              {/* Avatar */}
              <div className="relative">
                <div className="w-32 h-32 bg-zinc-900 rounded-[2.5rem] border-4 border-zinc-900 shadow-2xl flex items-center justify-center text-4xl font-black overflow-hidden group/avatar">
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt={userData.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white">
                      {userData?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                {userData?.subscription_status === 'active' && (
                  <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black p-2 rounded-2xl shadow-xl border-4 border-zinc-900">
                    <Crown className="w-5 h-5 fill-current" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left space-y-2 pb-2">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight text-white">{userData?.name}</h1>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                      {userData?.role}
                    </span>
                    {userData?.subscription_status === 'active' && (
                      <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-500/20 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Premium
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-zinc-500 font-medium text-sm">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4" />
                    {userData?.email}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    {userData?.country}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pb-2">
                <button 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl transition-all active:scale-95 shadow-lg"
                  title="Change Password"
                >
                  <Lock className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl transition-all active:scale-95 shadow-lg border border-red-500/20"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats & Details Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Subscription Card */}
        <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[60px] rounded-full -z-10 group-hover:bg-blue-600/10 transition-colors"></div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Subscription Plan
              </h2>
              <p className="text-zinc-500 text-xs font-medium">Manage your premium experience</p>
            </div>
            {userData?.subscription_status === 'active' ? (
              <div className="px-4 py-1.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                Active
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-zinc-800 text-zinc-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-700">
                Inactive
              </div>
            )}
          </div>

          <div className={cn(
            "relative p-6 rounded-3xl border transition-all duration-500",
            userData?.subscription_status === 'active' 
              ? "bg-blue-600/5 border-blue-500/30 shadow-xl shadow-blue-600/5" 
              : "bg-zinc-800/30 border-zinc-800"
          )}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl",
                  userData?.subscription_status === 'active' ? "bg-blue-600 shadow-blue-500/20" : "bg-zinc-700"
                )}>
                  {userData?.subscription_status === 'active' ? <ShieldCheck className="w-7 h-7 text-white" /> : <Crown className="w-7 h-7 text-zinc-500" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {userData?.subscription_status === 'active' ? 'Premium Member' : 'Free Tier'}
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {userData?.subscription_status === 'active' 
                      ? 'Enjoy ad-free streaming and 4K quality' 
                      : 'Upgrade to unlock premium features'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {userData?.subscription_status !== 'active' ? (
                  <button 
                    onClick={() => navigate('/premium')}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-blue-600/20"
                  >
                    Upgrade Now
                  </button>
                ) : (
                  canRefund() && (
                    <button 
                      onClick={handleRefund}
                      disabled={isRefunding}
                      className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 text-xs border border-red-500/20 shadow-lg"
                    >
                      {isRefunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                      Request Refund
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {userData?.subscription_status === 'active' && userData?.subscription_expiry && (
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 bg-zinc-800/50 px-4 py-2 rounded-xl w-fit">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Expires on: {new Date(userData.subscription_expiry.seconds * 1000).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Account Settings Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 space-y-6 relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/5 blur-[60px] rounded-full -z-10 group-hover:bg-purple-600/10 transition-colors"></div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-500" />
              Quick Settings
            </h2>
            <p className="text-zinc-500 text-xs font-medium">Manage your preferences</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="w-full flex items-center justify-between p-4 bg-zinc-800/30 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-zinc-700 transition-all group/item"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center group-hover/item:bg-blue-600/10 transition-colors">
                  <Lock className="w-4 h-4 text-zinc-400 group-hover/item:text-blue-500" />
                </div>
                <span className="text-sm font-bold text-zinc-300 group-hover/item:text-white">Security</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover/item:translate-x-1 transition-transform" />
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-zinc-800/30 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-zinc-700 transition-all group/item">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center group-hover/item:bg-purple-600/10 transition-colors">
                  <Settings className="w-4 h-4 text-zinc-400 group-hover/item:text-purple-500" />
                </div>
                <span className="text-sm font-bold text-zinc-300 group-hover/item:text-white">Preferences</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-600 group-hover/item:translate-x-1 transition-transform" />
            </button>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500 hover:text-white transition-all group/item"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center group-hover/item:bg-white/20 transition-colors">
                  <LogOut className="w-4 h-4 text-red-500 group-hover/item:text-white" />
                </div>
                <span className="text-sm font-bold text-red-500 group-hover/item:text-white">Sign Out</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              {/* Background Accent */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight">Security</h2>
                  <p className="text-zinc-500 text-xs font-medium">Update your account password</p>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-5 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all text-sm"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-blue-600/20 mt-4"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
