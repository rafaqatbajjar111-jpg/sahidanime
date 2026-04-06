import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Crown, Check, ShieldCheck, Zap, Star, Loader2, Globe, CreditCard, X, ArrowRight, Upload, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { usePlans } from '../hooks/usePlans';
import { sendTelegramNotification } from '../services/telegramService';
import { analyzePaymentScreenshot } from '../services/aiService';
import { getSubscriptionExpiration } from '../lib/subscriptionUtils';

export const Premium: React.FC = () => {
  const { userData, user } = useAuth();
  const { plans, paymentMethods, loading: plansLoading } = usePlans();
  const [countryCode, setCountryCode] = useState('IN');
  const [currency, setCurrency] = useState({ code: 'INR', symbol: '₹' });
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [failReason, setFailReason] = useState('');

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Using ipwho.is as it's more reliable for free client-side HTTPS requests
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        
        if (data.success) {
          setCountryCode(data.country_code || 'IN');
          setCurrency({ 
            code: data.currency?.code || 'INR', 
            symbol: data.currency?.symbol || '₹' 
          });
        } else {
          throw new Error('API returned success: false');
        }
      } catch (e) {
        console.warn('Country detection failed, falling back to default (IN)', e);
        // Robust fallback to India
        setCountryCode('IN');
        setCurrency({ code: 'INR', symbol: '₹' });
      }
    };
    detectCountry();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return toast.error('Image size should be less than 2MB');
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedPlan) return toast.error('Please select a plan');
    if (!screenshot) return toast.error('Please upload payment screenshot');
    if (!user || !userData) return toast.error('Please login first');
    
    setIsSubmitting(true);
    setAiStatus('AI is scanning your payment...');
    try {
      const planPrice = selectedPlan.prices[countryCode] || selectedPlan.prices.DEFAULT;
      const planDetails = `Plan: ${selectedPlan.name}, Price: ${planPrice.symbol}${planPrice.amount}, Duration: ${planPrice.duration}`;
      
      // AI Analysis
      const aiResult = await analyzePaymentScreenshot(screenshot, planDetails);
      
      if (aiResult.includes('APPROVED')) {
        setVerificationStatus('success');
        setAiStatus('Payment Verified! Activating your subscription...');
        
        const planPrice = selectedPlan.prices[countryCode] || selectedPlan.prices.DEFAULT;
        const expirationDate = getSubscriptionExpiration(planPrice.duration as 'month' | 'year');
        
        // 1. Update User Subscription
        await updateDoc(doc(db, 'users', user.uid), {
          subscription_plan: selectedPlan.id,
          subscription_status: 'active',
          subscription_updated_at: serverTimestamp(),
          subscription_expiry: expirationDate,
          subscription_method: 'ai_auto'
        });

        // 2. Save Approved Request
        await addDoc(collection(db, 'purchaseRequests'), {
          userId: user.uid,
          userName: userData.name || 'Anonymous',
          userEmail: userData.email,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: planPrice.amount.toString(),
          currency: planPrice.currency,
          country: countryCode,
          transactionId: 'AI_AUTO_APPROVED',
          screenshot: screenshot,
          status: 'approved',
          createdAt: serverTimestamp()
        });

        // 3. Create Notification
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title: 'Subscription Activated! 🎉',
          message: `Congratulations! Your ${selectedPlan.name} plan is now active. Enjoy ad-free anime!`,
          type: 'success',
          read: false,
          createdAt: serverTimestamp()
        });

        // 4. Telegram Notification
        const telegramMessage = `🚀 *AI AUTO-APPROVED*\n\n✅ *User:* ${userData.name || 'Anonymous'}\n📧 *Email:* ${userData.email}\n📦 *Plan:* ${selectedPlan.name}\n💰 *Amount:* ${planPrice.symbol}${planPrice.amount}\n🌍 *Country:* ${countryCode}\n✨ *Status:* Activated by AI`;
        await sendTelegramNotification(telegramMessage);

        toast.success('Payment Verified! Your subscription is now active.');
        
        setTimeout(() => {
          setVerificationStatus('idle');
          setSelectedPlan(null);
          setScreenshot(null);
        }, 3000);
      } else {
        setVerificationStatus('fail');
        setFailReason(aiResult);
        setAiStatus(null);
        toast.error(`AI Rejected Payment: ${aiResult}`);
        
        // Save Rejected Request for Admin Review
        await addDoc(collection(db, 'purchaseRequests'), {
          userId: user.uid,
          userName: userData.name || 'Anonymous',
          userEmail: userData.email,
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: planPrice.amount.toString(),
          currency: planPrice.currency,
          country: countryCode,
          transactionId: 'AI_REJECTED',
          screenshot: screenshot,
          status: 'rejected',
          aiReason: aiResult,
          createdAt: serverTimestamp()
        });

        // Create Notification
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title: 'Verification Failed ❌',
          message: `AI could not verify your payment. Reason: ${aiResult}. Please try again with a clear screenshot.`,
          type: 'error',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      setAiStatus(null);
      toast.error('Verification failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
      setAiStatus(null);
    }
  };

  const getPriceData = (plan: any) => {
    return plan.prices[countryCode] || plan.prices.DEFAULT;
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-8 px-4">
      {/* Header Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full -z-10" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
          <Crown className="w-3 h-3 fill-current" />
          Premium Experience
        </div>
        <h1 className="text-3xl lg:text-5xl font-black tracking-tighter text-white">
          Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-300">Power</span>
        </h1>
        <p className="text-zinc-400 text-sm lg:text-base font-medium leading-relaxed">
          Unlock the full potential of sahidanime. Ad-free, Ultra HD, and exclusive anime content.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 relative">
        {plans.map((plan) => {
          const priceData = getPriceData(plan);
          const isVip = plan.id === 'vip';
          
          return (
            <div 
              key={plan.id}
              className={cn(
                "relative flex flex-col p-6 rounded-3xl border transition-all duration-500 group",
                isVip 
                  ? "bg-zinc-900 border-blue-500/50 shadow-xl shadow-blue-600/5 scale-105 z-10" 
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
              )}
            >
              {isVip && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-600 to-blue-400 text-white text-[8px] font-black rounded-full uppercase tracking-widest shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500",
                  isVip ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
                )}>
                  {plan.id === 'garib_pro_max' ? <Zap className="w-5 h-5" /> : isVip ? <Crown className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{plan.name}</h3>
                  <p className="text-zinc-500 text-[10px] mt-0.5 font-medium">{plan.description}</p>
                </div>
                <div className="flex items-baseline gap-1 pt-1">
                  <span className="text-3xl font-black text-white">{priceData.symbol}{priceData.amount}</span>
                  <span className="text-zinc-500 font-bold text-xs">/{priceData.duration}</span>
                </div>
              </div>

              <div className="space-y-3 flex-1 mb-6">
                {plan.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                      isVip ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-zinc-300 text-xs font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedPlan(plan)}
                className={cn(
                  "w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2 group/btn",
                  isVip
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-zinc-800 hover:bg-zinc-700 text-white"
                )}
              >
                Choose {plan.name}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-md space-y-6 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar text-zinc-900">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/5 blur-[80px] rounded-full" />
            
            <button 
              onClick={() => {
                setSelectedPlan(null);
                setTransactionId('');
                setScreenshot(null);
              }} 
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900 transition-colors z-50 rounded-full hover:bg-zinc-100"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center space-y-2 relative z-10">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-600/20 rotate-3 mb-2">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900">Complete Payment</h2>
              <p className="text-zinc-500 text-xs">Plan: <span className="text-blue-600 font-bold">{selectedPlan.name}</span></p>
            </div>

            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 space-y-5 relative z-10">
              {/* Payment Details at the Top */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  {(paymentMethods[countryCode] || paymentMethods.DEFAULT)?.method} Details
                </div>
                <div className="p-4 bg-white rounded-xl border border-zinc-200 space-y-2 shadow-sm">
                  <div className="text-lg font-black text-zinc-900 select-all text-center tracking-tight">
                    {(paymentMethods[countryCode] || paymentMethods.DEFAULT)?.details}
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-[10px] text-zinc-500 font-bold">Account: {(paymentMethods[countryCode] || paymentMethods.DEFAULT)?.name}</p>
                    <p className="text-[9px] text-blue-600 italic">{(paymentMethods[countryCode] || paymentMethods.DEFAULT)?.instruction}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-200" />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Amount to Pay</p>
                  <p className="text-2xl font-black text-zinc-900">
                    {getPriceData(selectedPlan).symbol}{getPriceData(selectedPlan).amount}
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Region</p>
                  <div className="flex items-center justify-end gap-1.5 text-zinc-900 font-bold text-sm">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    {countryCode}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Upload Payment Screenshot</label>
                <div className="relative">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label 
                    htmlFor="screenshot-upload"
                    className="flex flex-col items-center justify-center w-full h-40 bg-white border-2 border-dashed border-zinc-200 rounded-2xl cursor-pointer hover:border-blue-600 transition-all overflow-hidden shadow-sm"
                  >
                    {screenshot ? (
                      <img src={screenshot} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold">Select Payment Photo</span>
                      </div>
                    )}
                  </label>
                  {screenshot && (
                    <button 
                      onClick={() => setScreenshot(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full text-white shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button 
              disabled={isSubmitting || !screenshot}
              onClick={handleSubmitRequest}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-1 shadow-xl shadow-blue-600/20 relative z-10"
            >
              {isSubmitting ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                  {aiStatus && <span className="text-[10px] text-blue-200 font-bold animate-pulse">{aiStatus}</span>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Submit & Verify with AI
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 pt-12 border-t border-zinc-800/50">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-white tracking-tight">Secure</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">Manually verified transactions for 100% security.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-white tracking-tight">Fast</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">Instant activation once your payment is approved.</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-green-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-white tracking-tight">Priority</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">Get priority access to support and new features.</p>
          </div>
        </div>
      </div>

      {/* Verification Overlays */}
      <AnimatePresence>
        {verificationStatus === 'success' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-blue-600 flex flex-col items-center justify-center text-white p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6"
            >
              <Check className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-4xl font-black mb-2">CONGRATULATIONS!</h2>
            <p className="text-xl font-bold opacity-90">Payment Verified! Your subscription is now active.</p>
            <Sparkles className="w-8 h-8 mt-6 animate-pulse" />
          </motion.div>
        )}

        {verificationStatus === 'fail' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-red-600 flex flex-col items-center justify-center text-white p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: 20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6"
            >
              <X className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-4xl font-black mb-2">VERIFICATION FAILED</h2>
            <p className="text-xl font-bold opacity-90 mb-4">{failReason}</p>
            <p className="text-sm font-medium bg-black/20 px-4 py-2 rounded-xl">
              Please pay the correct amount and provide a clear screenshot.
            </p>
            <button 
              onClick={() => setVerificationStatus('idle')}
              className="mt-8 px-8 py-3 bg-white text-red-600 font-black rounded-2xl hover:scale-105 transition-transform"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
