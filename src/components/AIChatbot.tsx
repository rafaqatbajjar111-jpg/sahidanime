import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collection, query, getDocs, limit, doc, onSnapshot, addDoc, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, Play, Search, List, ExternalLink, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { usePlans } from '../hooks/usePlans';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';
import { analyzePaymentScreenshot } from '../services/aiService';
import { getSubscriptionExpiration } from '../lib/subscriptionUtils';
import { sendTelegramNotification } from '../services/telegramService';
import { toast } from 'react-hot-toast';
import { chatWithAI, ChatMessage } from '../services/aiService';

interface ChatbotConfig {
  enabled: boolean;
  botName: string;
  systemPrompt: string;
}

interface Message {
  role: 'user' | 'bot';
  content: string;
}

const AI_API_URL = "https://dewyfiyiqdveqaockzfn.supabase.co/functions/v1/api";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

export const AIChatbot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const { plans, paymentMethods, paymentProviders, loading: plansLoading } = usePlans();
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep track of raw messages for AI context
  const [aiHistory, setAiHistory] = useState<ChatMessage[]>([]);

  // Inactivity timer to clear chat after 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      const inactiveTime = Date.now() - lastInteraction;
      if (inactiveTime > 5 * 60 * 1000) { // 5 minutes
        if (messages.length > 1) {
          setMessages([{ 
            role: 'bot', 
            content: `Chat session cleared due to 5 minutes of inactivity. How can I help you?` 
          }]);
          setAiHistory([]);
        }
      }
    }, 30000); // Check every 30 seconds
    return () => clearInterval(timer);
  }, [lastInteraction, messages.length]);

  useEffect(() => {
    setLastInteraction(Date.now());
  }, [messages]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'chatbot'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as ChatbotConfig);
      } else {
        setConfig({
          enabled: true,
          botName: 'SahidAnime Assistant',
          systemPrompt: 'You are the official SahidAnime Assistant with full control and knowledge of the website. You know all the plans, payment methods, and user subscription statuses. Reply in "Hinglish" style (Indian Hindi-English mix). Aapko website ke saare plans aur user ki current halat (subscription, pending payments) ka pura pata hai. Be friendly, helpful, and act like you have the authority to guide users through any issue.'
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/chatbot');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (config && messages.length === 0) {
      let initialMessage = `Assalamu alaikum! Main aapka ${config.botName} hoon. Aaj main aapki kaise help kar sakta hoon?`;
      
      if (userData?.pending_payment) {
        const { paidAmount, planName, remainingAmount } = userData.pending_payment;
        initialMessage = `Assalamu alaikum! Aapne pehle **₹${paidAmount}** pay kiye hain. **${planName}** activate karne ke liye aapko **₹${remainingAmount || 'kuch'}** aur pay karne honge. Aap screenshot yahan upload kar sakte hain!`;
      }

      setMessages([{ 
        role: 'bot', 
        content: initialMessage
      }]);
    }
  }, [config, userData, messages.length]);

  const chatWithAI = async (messages: ChatMessage[]) => {
    const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!apiKey) {
      throw new Error('AI Service is not configured.');
    }

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify({
        "model": DEFAULT_MODEL,
        "messages": messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    return data.content || data.text || (typeof data === 'string' ? data : JSON.stringify(data));
  };

  useEffect(() => {
    if (!plansLoading && config) {
      setAiHistory([
        {
          role: 'system',
          content: `
            ${config.systemPrompt}
            
            Current Dynamic Data:
            - Current Page: ${location.pathname}
            - Plans: ${JSON.stringify(plans)}
            - Payment Methods: ${JSON.stringify(paymentMethods)}
            - Payment Providers: ${JSON.stringify(paymentProviders)}
            - User Status: ${userData?.subscription_status || 'free'}
            - Pending Payment: ${userData?.pending_payment ? JSON.stringify(userData.pending_payment) : 'None'}
            
            Instructions for Payments:
            If the user asks how to pay, list the available payment providers for their currency.
            Available Providers: ${paymentProviders.filter(p => p.enabled).map(p => `${p.name} (${p.currency}): ${p.upiId} - Recipient: ${p.recipientName}`).join(' | ')}
            
            Instructions for Partial Payments:
            If the user has a pending payment (paidAmount exists in pending_payment), inform them that they have already paid some amount.
            If they mention a plan (e.g., "50 वाला"), calculate the remaining amount (Plan Price - paidAmount) and tell them: "Theek hai, [Plan Name] ke liye aapko [Remaining] aur dalna hoga. Screenshot bhejte hi activate ho jayega."
            
            If they just uploaded a screenshot and it was partial, ask them which plan they want and list the available plans.
            
            Current Pending Payment: ${userData?.pending_payment ? JSON.stringify(userData.pending_payment) : 'None'}
            
            Always be helpful and guide them to complete the payment.
          `
        }
      ]);
    }
  }, [plans, paymentMethods, plansLoading, config, userData, location.pathname]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSearchAnime = async (searchTerm: string) => {
    try {
      const q = query(collection(db, 'anime'), limit(20));
      const snapshot = await getDocs(q);
      const allAnime = snapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title }));
      const filtered = allAnime.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));
      return filtered;
    } catch (error) {
      return [];
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !userData) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Image size should be less than 5MB');
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setMessages(prev => [...prev, { role: 'user', content: "Sent a payment screenshot for verification." }]);
      setIsAnalyzing(true);

      try {
        // 1. Get all premium plans
        const premiumPlans = plans.filter(p => p.id !== 'free');
        if (premiumPlans.length === 0) throw new Error("No premium plans found.");

        const countryCode = userData.country || 'IN';
        
        // Construct info about all plans for the AI
        const allPlansInfo = premiumPlans.map(p => {
          const price = p.prices[countryCode] || p.prices.DEFAULT;
          return `${p.name}: ${price.symbol}${price.amount}`;
        }).join(", ");

        const planDetails = `Available Plans: ${allPlansInfo}`;

        // Get valid recipients from dynamic providers
        const validRecipients = paymentProviders
          .filter(p => p.enabled)
          .map(p => [p.recipientName, p.upiId])
          .flat();
        
        // Add defaults
        validRecipients.push("Sahid Anime 4 You", "SK HAMJA", "btthhindidubmasala@okicici");

        // 2. AI Analysis
        const aiResponse = await analyzePaymentScreenshot(base64String, planDetails, validRecipients);
        let aiResult;
        try {
          const jsonStr = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
          aiResult = JSON.parse(jsonStr);
        } catch (e) {
          if (aiResponse.includes('APPROVED')) aiResult = { status: 'APPROVED' };
          else if (aiResponse.includes('PARTIAL')) aiResult = { status: 'PARTIAL', reason: aiResponse };
          else aiResult = { status: 'REJECTED', reason: aiResponse };
        }

        // 3. Duplicate Detection by UTR (Very Important!)
        if (aiResult.utr) {
          try {
            const q = query(collection(db, 'purchaseRequests'), where('utr', '==', aiResult.utr));
            const duplicateSnapshot = await getDocs(q);
            if (!duplicateSnapshot.empty) {
              setMessages(prev => [...prev, { 
                role: 'bot', 
                content: "❌ Ye Transaction ID (UTR) pehle hi use ho chuka hai. Please naya payment screenshot bhejein." 
              }]);
              return;
            }
          } catch (e) {
            console.warn('Duplicate UTR check failed, skipping...', e);
          }
        }

        const paid = Number(aiResult.amount) || 0;
        const existingPending = userData.pending_payment;
        const totalPaidSoFar = (existingPending?.paidAmount || 0) + paid;

        // Check if totalPaidSoFar matches any plan
        const matchingPlan = premiumPlans.find(p => {
          const price = p.prices[countryCode] || p.prices.DEFAULT;
          return price.amount === totalPaidSoFar;
        });

        if (matchingPlan && aiResult.status !== 'REJECTED') {
          const price = matchingPlan.prices[countryCode] || matchingPlan.prices.DEFAULT;
          const expirationDate = getSubscriptionExpiration(price.duration as 'month' | 'year');
          
          await updateDoc(doc(db, 'users', user.uid), {
            subscription_plan: matchingPlan.id,
            subscription_status: 'active',
            subscription_updated_at: serverTimestamp(),
            subscription_expiry: expirationDate,
            subscription_method: 'ai_chatbot',
            pending_payment: null
          });

          await addDoc(collection(db, 'purchaseRequests'), {
            userId: user.uid,
            userName: userData.name || 'Anonymous',
            userEmail: userData.email,
            planId: matchingPlan.id,
            planName: matchingPlan.name,
            amount: price.amount.toString(),
            paidAmount: totalPaidSoFar,
            recipient: aiResult.recipient || 'SK HAMJA',
            currency: price.currency,
            country: countryCode,
            transactionId: aiResult.utr || 'AI_CHATBOT_APPROVED',
            utr: aiResult.utr || null,
            battery: aiResult.battery || null,
            screenshot: null, 
            status: 'approved',
            createdAt: serverTimestamp()
          });

          // Telegram Notification
          const telegramMessage = `🚀 *AI CHATBOT APPROVED*\n\n✅ *User:* ${userData.name || 'Anonymous'}\n📧 *Email:* ${userData.email}\n📦 *Plan:* ${matchingPlan.name}\n💰 *Amount:* ${price.symbol}${price.amount}\n🌍 *Country:* ${countryCode}\n✨ *Status:* Activated via Chatbot\n🆔 *UTR:* ${aiResult.utr || 'N/A'}`;
          await sendTelegramNotification(telegramMessage);

          setMessages(prev => [...prev, { 
            role: 'bot', 
            content: `✅ **Payment Verified!**\n\nAapka **${matchingPlan.name}** plan activate ho gaya hai. Enjoy ad-free anime!\n\n**Details:**\n- Total Paid: ₹${totalPaidSoFar}\n- Recipient: ${aiResult.recipient}\n- UTR: ${aiResult.utr}` 
          }]);
        } else if (paid > 0 && aiResult.status !== 'REJECTED') {
          // It's a partial payment or we don't know the plan yet
          
          // If we don't have a matching plan, ask the user which plan they want
          const plansList = premiumPlans.map(p => {
            const price = p.prices[countryCode] || p.prices.DEFAULT;
            return `- **${p.name}**: ${price.symbol}${price.amount}`;
          }).join("\n");

          await updateDoc(doc(db, 'users', user.uid), {
            pending_payment: {
              paidAmount: totalPaidSoFar,
              currency: 'INR', // Default to INR as per user context
              timestamp: new Date().toISOString()
            }
          });

          // Log the partial payment request
          await addDoc(collection(db, 'purchaseRequests'), {
            userId: user.uid,
            userName: userData.name || 'Anonymous',
            userEmail: userData.email,
            amount: paid.toString(),
            paidAmount: paid,
            totalPaidSoFar: totalPaidSoFar,
            recipient: aiResult.recipient || 'SK HAMJA',
            currency: 'INR',
            country: countryCode,
            transactionId: aiResult.utr || 'PARTIAL_CHATBOT',
            utr: aiResult.utr || null,
            status: 'partial',
            aiReason: aiResult.reason,
            createdAt: serverTimestamp()
          });

          // Telegram Notification
          const telegramMessage = `⚠️ *AI CHATBOT PARTIAL*\n\n👤 *User:* ${userData.name || 'Anonymous'}\n💰 *Paid:* ${paid}\n📉 *Total Paid:* ${totalPaidSoFar}\n🆔 *UTR:* ${aiResult.utr || 'N/A'}`;
          await sendTelegramNotification(telegramMessage);

          setMessages(prev => [...prev, { 
            role: 'bot', 
            content: `Aapne **₹${paid}** bheje hain. Kya ye galti se kam amount bheja hai?\n\nHamare plans ye hain:\n${plansList}\n\nAap kaunsa plan lena chahte hain?` 
          }]);
        } else {
          // Telegram Notification for Rejection
          const telegramMessage = `❌ *AI CHATBOT REJECTED*\n\n👤 *User:* ${userData.name || 'Anonymous'}\n📧 *Email:* ${userData.email}\n🆔 *UTR:* ${aiResult.utr || 'N/A'}\n⚠️ *Reason:* ${aiResult.reason || 'Invalid screenshot'}`;
          await sendTelegramNotification(telegramMessage);

          setMessages(prev => [...prev, { 
            role: 'bot', 
            content: `❌ **Verification Failed**\n\nReason: ${aiResult.reason || 'Invalid screenshot'}. Please try again with a clear photo.` 
          }]);
        }
      } catch (error: any) {
        setMessages(prev => [...prev, { role: 'bot', content: "Error verifying payment: " + error.message }]);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isAnalyzing) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Check if user is asking for anime search
      let contextAddition = "";
      if (userMessage.toLowerCase().includes('search') || userMessage.toLowerCase().includes('find')) {
        const searchTerm = userMessage.replace(/search|find/gi, '').trim();
        const results = await handleSearchAnime(searchTerm);
        if (results.length > 0) {
          contextAddition = `\n\nContext: I found these anime in the database: ${results.map(r => r.title).join(', ')}. Mention them to the user in Hinglish.`;
        }
      }

      const newHistory: ChatMessage[] = [
        { role: 'system', content: config?.systemPrompt || 'You are a helpful assistant for SahidAnime. Reply in Hinglish.' },
        ...aiHistory,
        { role: 'user', content: userMessage + contextAddition }
      ];

      const response = await chatWithAI(newHistory);
      
      setMessages(prev => [...prev, { role: 'bot', content: response }]);
      setAiHistory([...newHistory, { role: 'assistant', content: response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'bot', content: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="w-[350px] sm:w-[400px] h-[500px] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 rounded-2xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="font-black text-sm tracking-tight">{config?.botName || 'SahidAnime Assistant'}</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Database Linked</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setMessages([{ 
                role: 'bot', 
                content: `Chat cleared. How can I help you?` 
              }]);
              setAiHistory([]);
            }}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
      >
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={i}
            className={cn(
              "flex gap-3 max-w-[90%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
              msg.role === 'user' ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"
            )}>
              {msg.role === 'bot' ? (
                <div className="markdown-body prose prose-invert max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({node, ...props}) => (
                        <a 
                          {...props} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-400 underline hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                        >
                          {props.children}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ),
                      p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                      li: ({children}) => <li className="mb-1">{children}</li>
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 shadow-lg">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-xs text-zinc-500 font-medium">Searching database...</span>
            </div>
          </div>
        )}
        {isAnalyzing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 shadow-lg">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-xs text-zinc-500 font-medium">AI is scanning your payment screenshot...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search anime or type 'help'..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-zinc-200"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isAnalyzing}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 disabled:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isAnalyzing}
            className="p-3 bg-zinc-800 text-zinc-400 rounded-2xl hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
            title="Upload Payment Screenshot"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
        </div>
      </form>
    </motion.div>
  );
};
