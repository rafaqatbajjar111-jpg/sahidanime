import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collection, query, getDocs, limit, doc, onSnapshot, addDoc, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, Play, Search, List, ExternalLink, Image as ImageIcon, Upload, Trash2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { usePlans } from '../hooks/usePlans';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';
import { analyzeImage, generateSpeech } from '../services/aiService';
import { getSubscriptionExpiration } from '../lib/subscriptionUtils';
import { sendTelegramNotification } from '../services/telegramService';
import { toast } from 'react-hot-toast';
import { chatWithAI, ChatMessage } from '../services/aiService';
import { setDoc } from 'firebase/firestore';
import { Volume2, VolumeX } from 'lucide-react';

const generateRedeemCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

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
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep track of raw messages for AI context
  const [aiHistory, setAiHistory] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Inactivity timer to clear chat after 10 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      const inactiveTime = Date.now() - lastInteraction;
      if (inactiveTime > 10 * 60 * 1000) { // 10 minutes
        if (messages.length > 1) {
          setMessages([{ 
            role: 'bot', 
            content: `Chat session cleared due to 10 minutes of inactivity. How can I help you?` 
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
            ALWAYS prioritize INR (₹) for Indian users.
            Plans in INR:
            - Garib Pro Max: ₹50
            - VIP: ₹100
            - Yearly: ₹800
            
            DO NOT show Dollar ($) prices unless the user is outside India.
            
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
    const handleOpenChatbot = async (e: any) => {
      if (e.detail?.message) {
        const userMessage = e.detail.message;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);
        try {
          const newHistory: ChatMessage[] = [
            { role: 'system', content: config?.systemPrompt || 'You are a helpful assistant for SahidAnime. Reply in Hinglish.' },
            ...aiHistory,
            { role: 'user', content: userMessage }
          ];
          const response = await chatWithAI(newHistory);
          setMessages(prev => [...prev, { role: 'bot', content: response }]);
          setAiHistory([...newHistory, { role: 'assistant', content: response }]);
        } catch (error) {
          console.error("Event AI Error:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    window.addEventListener('open-chatbot' as any, handleOpenChatbot);
    return () => window.removeEventListener('open-chatbot' as any, handleOpenChatbot);
  }, [config, aiHistory]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSpeak = async (text: string, index: number) => {
    if (isSpeaking === index) {
      audioRef.current?.pause();
      setIsSpeaking(null);
      return;
    }

    setIsSpeaking(index);
    try {
      const audioUrl = await generateSpeech(text);
      if (audioUrl) {
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          audioRef.current.onended = () => setIsSpeaking(null);
        } else {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.play();
          audio.onended = () => setIsSpeaking(null);
        }
      } else {
        toast.error("Could not generate speech");
        setIsSpeaking(null);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(null);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Default to Hindi/Hinglish
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      
      // If in live mode, auto-submit
      if (isLiveMode) {
        setTimeout(() => {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSubmit(fakeEvent, transcript);
        }, 500);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

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
      setMessages(prev => [...prev, { role: 'user', content: "Sent an image for analysis." }]);
      setIsAnalyzing(true);

      try {
        // 1. Get all premium plans
        const premiumPlans = plans.filter(p => p.id !== 'free');
        const countryCode = userData?.country || 'IN';
        
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
        
        validRecipients.push("Sahid Anime 4 You", "SK HAMJA", "btthhindidubmasala@okicici");

        // 2. AI Analysis
        const aiResponse = await analyzeImage(base64String, planDetails, validRecipients);
        let aiResult;
        try {
          const jsonStr = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
          aiResult = JSON.parse(jsonStr);
        } catch (e) {
          aiResult = { type: 'GENERAL', generalInfo: { description: "AI could not parse JSON, but here is the raw response.", reaction: aiResponse } };
        }

        if (aiResult.type === 'PAYMENT') {
          const pInfo = aiResult.paymentInfo;
          
          // 3. Duplicate Detection by UTR
          if (pInfo.utr) {
            try {
              const q = query(collection(db, 'purchaseRequests'), where('utr', '==', pInfo.utr));
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

          const paid = Number(pInfo.amount) || 0;
          const existingPending = userData?.pending_payment;
          const totalPaidSoFar = (existingPending?.paidAmount || 0) + paid;

          // Check if totalPaidSoFar matches any plan
          const matchingPlan = premiumPlans.find(p => {
            const price = p.prices[countryCode] || p.prices.DEFAULT;
            return price.amount === totalPaidSoFar;
          });

          if (matchingPlan && pInfo.status !== 'REJECTED') {
            const price = matchingPlan.prices[countryCode] || matchingPlan.prices.DEFAULT;
            
            // GENERATE REDEEM CODE INSTEAD OF DIRECT ACTIVATION
            const redeemCode = generateRedeemCode();
            
            await setDoc(doc(db, 'redeemCodes', redeemCode), {
              code: redeemCode,
              planId: matchingPlan.id,
              planName: matchingPlan.name,
              maxUses: 1,
              usedCount: 0,
              usedBy: [],
              createdAt: serverTimestamp(),
              generatedBy: 'chatbot_ai',
              userId: user?.uid || 'anonymous'
            });

            await addDoc(collection(db, 'purchaseRequests'), {
              userId: user?.uid || 'anonymous',
              userName: userData?.name || 'Anonymous',
              userEmail: userData?.email,
              planId: matchingPlan.id,
              planName: matchingPlan.name,
              amount: price.amount.toString(),
              paidAmount: totalPaidSoFar,
              recipient: pInfo.recipient || 'SK HAMJA',
              currency: price.currency,
              country: countryCode,
              transactionId: pInfo.utr || 'AI_CHATBOT_COUPON',
              utr: pInfo.utr || null,
              battery: pInfo.battery || null,
              screenshot: null, 
              status: 'approved',
              redeemCode: redeemCode,
              createdAt: serverTimestamp()
            });

            // Telegram Notification
            const telegramMessage = `🚀 *AI CHATBOT COUPON GENERATED*\n\n✅ *User:* ${userData?.name || 'Anonymous'}\n📧 *Email:* ${userData?.email}\n📦 *Plan:* ${matchingPlan.name}\n💰 *Amount:* ${price.symbol}${price.amount}\n🌍 *Country:* ${countryCode}\n✨ *Coupon:* \`${redeemCode}\`\n🆔 *UTR:* ${pInfo.utr || 'N/A'}`;
            await sendTelegramNotification(telegramMessage);

            setMessages(prev => [...prev, { 
              role: 'bot', 
              content: `✅ **Payment Verified!**\n\nAapka payment verify ho gaya hai. Aapka **${matchingPlan.name}** plan ka coupon code ye hai:\n\n**CODE:** \`${redeemCode}\`\n\nIsko [**Redeem Code**](/redeem) page par jaakar use karein apna premium activate karne ke liye!` 
            }]);
            
            // Add to AI history for context
            setAiHistory(prev => [...prev, 
              { role: 'user', content: "Sent a payment screenshot for ₹" + totalPaidSoFar },
              { role: 'assistant', content: `Payment verified for ${matchingPlan.name}. Generated coupon code: ${redeemCode}` }
            ]);
            
            // Clear pending payment after success
            if (user) {
              await updateDoc(doc(db, 'users', user.uid), {
                pending_payment: null
              });
            }

          } else if (paid > 0 && pInfo.status !== 'REJECTED') {
            const plansList = premiumPlans.map(p => {
              const price = p.prices[countryCode] || p.prices.DEFAULT;
              return `- **${p.name}**: ${price.symbol}${price.amount}`;
            }).join("\n");

            if (user) {
              await updateDoc(doc(db, 'users', user.uid), {
                pending_payment: {
                  paidAmount: totalPaidSoFar,
                  currency: 'INR',
                  timestamp: new Date().toISOString()
                }
              });
            }

            await addDoc(collection(db, 'purchaseRequests'), {
              userId: user?.uid || 'anonymous',
              userName: userData?.name || 'Anonymous',
              userEmail: userData?.email,
              amount: paid.toString(),
              paidAmount: paid,
              totalPaidSoFar: totalPaidSoFar,
              recipient: pInfo.recipient || 'SK HAMJA',
              currency: 'INR',
              country: countryCode,
              transactionId: pInfo.utr || 'PARTIAL_CHATBOT',
              utr: pInfo.utr || null,
              status: 'partial',
              aiReason: pInfo.reason,
              createdAt: serverTimestamp()
            });

            const telegramMessage = `⚠️ *AI CHATBOT PARTIAL*\n\n👤 *User:* ${userData?.name || 'Anonymous'}\n💰 *Paid:* ${paid}\n📉 *Total Paid:* ${totalPaidSoFar}\n🆔 *UTR:* ${pInfo.utr || 'N/A'}`;
            await sendTelegramNotification(telegramMessage);

            setMessages(prev => [...prev, { 
              role: 'bot', 
              content: `Aapne **₹${paid}** bheje hain. Kya ye galti se kam amount bheja hai?\n\nHamare plans ye hain:\n${plansList}\n\nAap kaunsa plan lena chahte hain?` 
            }]);

            // Add to AI history for context
            setAiHistory(prev => [...prev, 
              { role: 'user', content: "Sent a partial payment screenshot for ₹" + paid },
              { role: 'assistant', content: `I received ₹${paid}. I informed the user that it's a partial payment and listed the plans: ${plansList}` }
            ]);
          } else {
            const telegramMessage = `❌ *AI CHATBOT REJECTED*\n\n👤 *User:* ${userData?.name || 'Anonymous'}\n📧 *Email:* ${userData?.email}\n🆔 *UTR:* ${pInfo.utr || 'N/A'}\n⚠️ *Reason:* ${pInfo.reason || 'Invalid screenshot'}`;
            await sendTelegramNotification(telegramMessage);

            setMessages(prev => [...prev, { 
              role: 'bot', 
              content: `❌ **Verification Failed**\n\nReason: ${pInfo.reason || 'Invalid screenshot'}. Please try again with a clear photo.` 
            }]);
          }
        } else {
          // GENERAL IMAGE
          const gInfo = aiResult.generalInfo;
          setMessages(prev => [...prev, { 
            role: 'bot', 
            content: `📸 **Image Analysis:**\n\n${gInfo.description}\n\n${gInfo.reaction}` 
          }]);
          
          // Add to AI history for context
          setAiHistory(prev => [...prev, 
            { role: 'user', content: "Sent an image for analysis." },
            { role: 'assistant', content: `I saw an image: ${gInfo.description}. My reaction: ${gInfo.reaction}` }
          ]);
        }
      } catch (error: any) {
        setMessages(prev => [...prev, { role: 'bot', content: "Error verifying payment: " + error.message }]);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const messageToSend = overrideInput || input.trim();
    if (!messageToSend || isLoading || isAnalyzing) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setIsLoading(true);

    try {
      // Check if user is asking for anime search
      let contextAddition = "";
      if (messageToSend.toLowerCase().includes('search') || messageToSend.toLowerCase().includes('find')) {
        const searchTerm = messageToSend.replace(/search|find/gi, '').trim();
        const results = await handleSearchAnime(searchTerm);
        if (results.length > 0) {
          contextAddition = `\n\nContext: I found these anime in the database: ${results.map(r => r.title).join(', ')}. Mention them to the user in Hinglish.`;
        }
      }

      const newHistory: ChatMessage[] = [
        { role: 'system', content: config?.systemPrompt || 'You are a helpful assistant for SahidAnime. Reply in Hinglish.' },
        ...aiHistory,
        { role: 'user', content: messageToSend + contextAddition }
      ];

      const response = await chatWithAI(newHistory);
      
      setMessages(prev => [...prev, { role: 'bot', content: response }]);
      setAiHistory([...newHistory, { role: 'assistant', content: response }]);

      // Auto-speak if enabled
      if (autoSpeak || isLiveMode) {
        handleSpeak(response, messages.length + 1);
      }
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
      className="w-full sm:w-[450px] h-[85vh] sm:h-[600px] bg-zinc-950 border border-zinc-800 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[100]"
    >
      {/* Live Mode Overlay */}
      <AnimatePresence>
        {isLiveMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-zinc-950 flex flex-col items-center justify-center p-8 text-center"
          >
            <button 
              onClick={() => setIsLiveMode(false)}
              className="absolute top-6 right-6 p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="relative mb-12">
              <motion.div
                animate={{ 
                  scale: isListening ? [1, 1.2, 1] : 1,
                  opacity: isListening ? [0.5, 1, 0.5] : 0.5
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-blue-600 rounded-full blur-3xl"
              />
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center relative z-10 transition-all duration-500",
                isListening ? "bg-blue-600 scale-110" : "bg-zinc-900 border-2 border-zinc-800"
              )}>
                {isListening ? (
                  <Mic className="w-12 h-12 text-white animate-pulse" />
                ) : isLoading ? (
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                ) : isSpeaking !== null ? (
                  <Volume2 className="w-12 h-12 text-green-500 animate-bounce" />
                ) : (
                  <Bot className="w-12 h-12 text-zinc-500" />
                )}
              </div>
            </div>

            <h2 className="text-2xl font-black mb-2 tracking-tight">
              {isListening ? "Listening..." : isLoading ? "Thinking..." : isSpeaking !== null ? "Speaking..." : "Ready to Talk"}
            </h2>
            <p className="text-zinc-500 text-sm max-w-xs mb-8">
              {isListening ? "Aap bol sakte hain, main sun raha hoon." : "Tap the mic to start talking to me in real-time."}
            </p>

            <div className="flex gap-4">
              <button
                onClick={toggleListening}
                className={cn(
                  "px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all",
                  isListening ? "bg-red-600 text-white" : "bg-blue-600 text-white hover:bg-blue-500"
                )}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isListening ? "Stop Listening" : "Start Talking"}
              </button>
            </div>

            {messages.length > 0 && (
              <div className="mt-12 max-w-md">
                <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-4">Last Message</p>
                <p className="text-zinc-300 italic">"{messages[messages.length - 1].content.substring(0, 100)}..."</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            onClick={() => setIsLiveMode(!isLiveMode)}
            className={cn(
              "p-2 rounded-xl transition-all flex items-center gap-2",
              isLiveMode ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            )}
            title="Live Voice Mode"
          >
            <Mic className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase hidden sm:inline">Live</span>
          </button>
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
              "p-3 rounded-2xl text-sm leading-relaxed relative group",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"
            )}>
              {msg.role === 'bot' && (
                <button
                  onClick={() => handleSpeak(msg.content, i)}
                  className="absolute -right-10 top-0 p-2 bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-700 text-zinc-400 hover:text-white"
                  title="Listen to message"
                >
                  {isSpeaking === i ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
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
            onClick={toggleListening}
            disabled={isLoading || isAnalyzing}
            className={cn(
              "p-3 rounded-2xl transition-all disabled:opacity-50",
              isListening ? "bg-red-600 text-white animate-pulse" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            )}
            title="Voice Input"
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
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
