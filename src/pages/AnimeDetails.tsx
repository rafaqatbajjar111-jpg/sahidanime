import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { VideoPlayer } from '../components/VideoPlayer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Play, Lock, Crown, Info, List, Star, Share2, Plus, X, Globe, CreditCard, Loader2, Zap, ArrowRight, Upload, Heart, MessageCircle, Send, Trash2 as TrashIcon, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';

interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number;
}

import { usePlans } from '../hooks/usePlans';

interface Episode {
  id: string;
  title: string;
  videoUrl: string;
  downloadUrl?: string;
  accessType: 'free' | 'premium' | 'locked';
  order: number;
}

export const AnimeDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { plans, paymentMethods, loading: plansLoading } = usePlans();
  const { theme } = useTheme();
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [currency, setCurrency] = useState<CurrencyInfo>({ code: 'INR', symbol: '₹', rate: 1 });
  const [countryCode, setCountryCode] = useState('IN');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const isPremium = userData?.subscription_status === 'active' || userData?.role === 'admin';
  const isAdmin = userData?.role === 'admin';

  // Security check: Clear selected episode if access is lost
  useEffect(() => {
    if (selectedEpisode && !canWatch(selectedEpisode)) {
      setSelectedEpisode(null);
      setShowPlayer(false);
      if (selectedEpisode.accessType === 'premium') {
        setShowPremiumModal(true);
      }
    }
  }, [userData, selectedEpisode]);

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

  useEffect(() => {
    // Detect currency based on IP/Location
    const detectCurrency = async () => {
      try {
        // Using ipwho.is as it's more reliable for free client-side HTTPS requests
        const res = await fetch('https://ipwho.is/');
        const data = await res.json();
        
        if (data.success) {
          setCountryCode(data.country_code || 'IN');
          const currencyCode = data.currency?.code || 'INR';
          const currencySymbol = data.currency?.symbol || '₹';
          
          if (currencyCode === 'INR') {
            setCurrency({ code: 'INR', symbol: '₹', rate: 1 });
          } else {
            const rate = currencyCode === 'USD' ? 0.012 : 0.011; 
            setCurrency({ 
              code: currencyCode, 
              symbol: currencySymbol, 
              rate: rate 
            });
          }
        } else {
          throw new Error('API returned success: false');
        }
      } catch (e) {
        console.warn('Currency detection failed, falling back to default (IN)', e);
        // Robust fallback to India
        setCountryCode('IN');
        setCurrency({ code: 'INR', symbol: '₹', rate: 1 });
      }
    };
    detectCurrency();
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchAnime = async () => {
      const docRef = doc(db, 'anime', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAnime({ id: docSnap.id, ...docSnap.data() });
      }
    };

    const q = query(collection(db, 'anime', id, 'episodes'));
    const unsub = onSnapshot(q, (snapshot) => {
      const epList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Episode));
      // Sort client-side to handle missing order: Latest (highest order) first
      setEpisodes(epList.sort((a, b) => Number(b.order || 0) - Number(a.order || 0)));
      setLoading(false);
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, `anime/${id}/episodes`);
      if (error.code === 'resource-exhausted') {
        toast.error("Database quota exceeded. Please try again tomorrow.");
      }
      setLoading(false);
    });

    fetchAnime();
    return () => unsub();
  }, [id]);

  // Fetch Likes and Comments for selected episode
  useEffect(() => {
    if (!id || !selectedEpisode) {
      setLikesCount(0);
      setIsLiked(false);
      setComments([]);
      return;
    }

    // Listen for Likes
    const likesQuery = query(collection(db, 'anime', id, 'episodes', selectedEpisode.id, 'likes'));
    const unsubLikes = onSnapshot(likesQuery, (snapshot) => {
      setLikesCount(snapshot.size);
      if (userData) {
        setIsLiked(snapshot.docs.some(doc => doc.id === userData.uid));
      }
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, `anime/${id}/episodes/${selectedEpisode.id}/likes`);
      if (error.code === 'resource-exhausted') {
        toast.error("Database quota exceeded. Please try again tomorrow.");
      }
    });

    // Listen for Comments
    const commentsQuery = query(
      collection(db, 'anime', id, 'episodes', selectedEpisode.id, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error: any) => {
      handleFirestoreError(error, OperationType.LIST, `anime/${id}/episodes/${selectedEpisode.id}/comments`);
      if (error.code === 'resource-exhausted') {
        toast.error("Database quota exceeded. Please try again tomorrow.");
      }
    });

    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [id, selectedEpisode, userData]);

  const handleLike = async () => {
    if (!userData) return toast.error('Please login to like');
    if (!id || !selectedEpisode) return;

    const likeRef = doc(db, 'anime', id, 'episodes', selectedEpisode.id, 'likes', userData.uid);
    
    try {
      if (isLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          userId: userData.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      toast.error('Failed to update like');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return toast.error('Please login to comment');
    if (!newComment.trim() || !id || !selectedEpisode) return;

    setIsCommenting(true);
    try {
      await addDoc(collection(db, 'anime', id, 'episodes', selectedEpisode.id, 'comments'), {
        userId: userData.uid,
        userName: userData.name || 'User',
        userPhoto: userData.photoURL || '',
        text: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
      toast.success('Comment added!');
    } catch (error: any) {
      toast.error('Failed to add comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id || !selectedEpisode) return;
    try {
      await deleteDoc(doc(db, 'anime', id, 'episodes', selectedEpisode.id, 'comments', commentId));
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const canWatch = (episode: Episode) => {
    if (!episode) return false;
    if (userData?.role === 'admin') return true;
    if (episode.accessType === 'free') return true;
    if (episode.accessType === 'premium' && userData?.subscription_status === 'active') return true;
    return false;
  };

  const handleEpisodeSelect = (ep: Episode) => {
    if (canWatch(ep)) {
      setSelectedEpisode(ep);
      setShowPlayer(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (ep.accessType === 'premium') {
      setShowPremiumModal(true);
    } else {
      toast.error('This episode is currently locked');
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedPlan) return toast.error('Please select a plan');
    if (!screenshot) return toast.error('Please upload payment screenshot');
    if (!userData) return toast.error('Please login first');
    
    setIsSubmitting(true);
    try {
      const planPrice = selectedPlan.prices[countryCode] || selectedPlan.prices.DEFAULT;
      await addDoc(collection(db, 'purchaseRequests'), {
        userId: userData.uid,
        userName: userData.name || 'Anonymous',
        userEmail: userData.email,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount: planPrice.amount.toString(),
        currency: planPrice.currency,
        country: countryCode,
        transactionId: 'SCREENSHOT_ONLY',
        screenshot: screenshot,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Request submitted! Admin will approve it soon.');
      setShowPremiumModal(false);
      setTransactionId('');
      setScreenshot(null);
      setSelectedPlan(null);
    } catch (error: any) {
      toast.error('Failed to submit request: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: anime?.title || 'SahidAnime',
      text: `Watch ${anime?.title} - Episode ${selectedEpisode?.order || ''} on SahidAnime!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleDownload = () => {
    if (!selectedEpisode?.downloadUrl) {
      toast.error('Download link not available for this episode');
      return;
    }
    window.open(selectedEpisode.downloadUrl, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-black" />;

  return (
    <div className="w-full space-y-6 pb-20">
      {/* 1. Video Player Section (Top) */}
      <div className="bg-zinc-900 lg:rounded-2xl overflow-hidden shadow-2xl border-b lg:border border-zinc-800 relative">
        {selectedEpisode ? (
          <div className="aspect-video relative">
            {isAdmin && (
              <div className="absolute top-4 left-4 z-20 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5">
                <Zap className="w-3 h-3 fill-current" /> Admin Access
              </div>
            )}
            <VideoPlayer 
              key={selectedEpisode.id}
              src={selectedEpisode.videoUrl} 
              title={`${anime?.title} - Episode ${selectedEpisode.order}`} 
            />
          </div>
        ) : (
          <div className="relative aspect-video">
            <img 
              src={anime?.posterUrl} 
              alt={anime?.title}
              className="w-full h-full object-cover opacity-40"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <h1 className="text-3xl lg:text-5xl font-black tracking-tighter">{anime?.title}</h1>
              <p className="text-zinc-400 text-sm max-w-xl line-clamp-2">{anime?.description}</p>
              {episodes.length > 0 && (
                <button 
                  onClick={() => handleEpisodeSelect(episodes[0])}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" /> Start Watching
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Info & Episodes Section (Below Player) */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Anime Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl lg:text-3xl font-black tracking-tight">{anime?.title}</h2>
                <div className="flex items-center gap-3 text-xs font-bold text-zinc-500">
                  <span className="flex items-center gap-1 text-blue-500">
                    <Star className="w-3.5 h-3.5 fill-current" /> 9.8 Rating
                  </span>
                  <span>•</span>
                  <span>{anime?.genre}</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 bg-blue-600/10 text-blue-500 rounded-md text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                    Fan Dub
                  </span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-bold text-sm",
                    isLiked 
                      ? "bg-red-600/10 border-red-500/50 text-red-500" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  )}
                >
                  <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                  {likesCount > 0 && <span>{likesCount}</span>}
                </button>
                <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleShare}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                {selectedEpisode?.downloadUrl && (
                  <button 
                    onClick={() => {
                      if (!isPremium) {
                        setShowPremiumModal(true);
                        toast.error('Premium subscription required to download');
                        return;
                      }
                      handleDownload();
                    }}
                    className="group relative flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-green-600/20 overflow-hidden"
                  >
                    <div className="absolute -top-1 -right-1 bg-white text-green-600 px-2 py-0.5 rounded-bl-lg text-[8px] font-black tracking-tighter uppercase shadow-sm z-10">
                      {isPremium ? '4K Ultra' : <Lock className="w-2 h-2" />}
                    </div>
                    <div className="relative">
                      {isPremium ? (
                        <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                      ) : (
                        <Crown className="w-5 h-5 text-yellow-400" />
                      )}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[10px] text-green-100 font-bold uppercase tracking-widest mb-0.5">
                        {isPremium ? 'Direct Link' : 'Premium Only'}
                      </span>
                      <span>{isPremium ? 'Download Now' : 'Unlock Download'}</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className={cn(
              "p-4 rounded-2xl border transition-colors",
              theme === 'dark' ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
            )}>
              <h3 className={cn(
                "text-sm font-bold mb-2",
                theme === 'dark' ? "text-zinc-400" : "text-zinc-500"
              )}>Description</h3>
              <p className={cn(
                "text-sm leading-relaxed",
                theme === 'dark' ? "text-zinc-300" : "text-zinc-700"
              )}>
                {anime?.description}
              </p>
            </div>

            {/* Comments Section */}
            {selectedEpisode && (
              <div className="space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-500" />
                    Comments ({comments.length})
                  </h3>
                </div>

                <form onSubmit={handleAddComment} className="relative">
                  <input
                    type="text"
                    placeholder={userData ? "Add a public comment..." : "Login to comment"}
                    disabled={!userData || isCommenting}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:border-blue-500 transition-all text-sm"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!userData || isCommenting || !newComment.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
                  >
                    {isCommenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 group">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                        {comment.userPhoto ? (
                          <img src={comment.userPhoto} alt={comment.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                            {comment.userName?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-zinc-200">{comment.userName}</span>
                            <span className="text-[10px] text-zinc-500">
                              {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                            </span>
                          </div>
                          {(userData?.uid === comment.userId || userData?.role === 'admin') && (
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div className="text-center py-10 text-zinc-500 text-sm">
                      No comments yet. Be the first to share your thoughts!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Episode List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <List className="w-4 h-4 text-blue-500" />
              Episodes
            </h3>
            <span className="text-xs text-zinc-500">{episodes.length} Total</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {episodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() => handleEpisodeSelect(ep)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                  selectedEpisode?.id === ep.id 
                    ? "bg-blue-600/10 border-blue-500/50" 
                    : theme === 'dark'
                      ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                      : "bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100"
                )}
              >
                <div className={cn(
                  "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                  theme === 'dark' ? "bg-zinc-800" : "bg-zinc-200"
                )}>
                  {selectedEpisode?.id === ep.id ? (
                    <Play className="w-4 h-4 text-blue-500 fill-current" />
                  ) : (
                    <span className="text-zinc-500 font-bold text-xs">{ep.order}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "font-bold text-xs truncate",
                    selectedEpisode?.id === ep.id 
                      ? "text-blue-500" 
                      : theme === 'dark' ? "text-zinc-200" : "text-zinc-900"
                  )}>
                    {ep.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ep.accessType === 'premium' && (
                      <span className="flex items-center gap-1 text-[8px] font-bold text-yellow-500 uppercase">
                        <Crown className="w-2.5 h-2.5" /> Premium
                      </span>
                    )}
                    {ep.accessType === 'free' && (
                      <span className="text-[8px] font-bold text-green-500 uppercase">Free</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Premium Subscription Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-10 w-full max-w-md text-center space-y-8 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full" />
            
            <button 
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-50"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative z-10 space-y-6">
              <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                <Crown className="w-10 h-10 text-blue-500" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-white">Unlock Premium</h2>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Premium content dekhne ke liye aapko subscription chahiye. 
                  Aap **Chatbot** se plan select karke payment verify kar sakte hain.
                </p>
              </div>

              <button 
                onClick={() => {
                  setShowPremiumModal(false);
                  window.dispatchEvent(new CustomEvent('open-chatbot', { 
                    detail: { message: 'I need a plan' } 
                  }));
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl shadow-blue-600/20"
              >
                Get Premium via Chatbot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
