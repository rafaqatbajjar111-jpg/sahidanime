import React, { useState, useRef, useEffect } from 'react';
import { collection, query, getDocs, limit, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Send, X, Bot, User, Loader2, Sparkles, Play, Search, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { usePlans } from '../hooks/usePlans';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';

interface ChatbotConfig {
  enabled: boolean;
  botName: string;
  systemPrompt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
}

interface Message {
  role: 'user' | 'bot';
  content: React.ReactNode;
}

const AI_API_URL = "https://dewyfiyiqdveqaockzfn.supabase.co/functions/v1/api";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

export const AIChatbot: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const { plans, paymentMethods, loading: plansLoading } = usePlans();
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep track of raw messages for AI context
  const [aiHistory, setAiHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'chatbot'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as ChatbotConfig;
        setConfig(data);
        if (messages.length === 0) {
          setMessages([{ 
            role: 'bot', 
            content: `Assalamu alaikum! I am your ${data.botName}. How can I help you today?` 
          }]);
        }
      } else {
        // Fallback if no config exists
        const fallbackName = 'SahidAnime Assistant';
        setConfig({
          enabled: true,
          botName: fallbackName,
          systemPrompt: 'You are a helpful assistant for SahidAnime.'
        });
        if (messages.length === 0) {
          setMessages([{ 
            role: 'bot', 
            content: `Assalamu alaikum! I am your ${fallbackName}. How can I help you today?` 
          }]);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/chatbot');
    });
    return () => unsub();
  }, []);

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
            - Plans: ${JSON.stringify(plans)}
            - Payment Methods: ${JSON.stringify(paymentMethods)}
          `
        }
      ]);
    }
  }, [plans, paymentMethods, plansLoading, config]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
          contextAddition = `\n\nContext: I found these anime in the database: ${results.map(r => r.title).join(', ')}. Mention them to the user.`;
        }
      }

      const newHistory: ChatMessage[] = [
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
        <button 
          onClick={onClose}
          className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500"
        >
          <X className="w-5 h-5" />
        </button>
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
              {msg.content}
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
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search anime or type 'help'..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-zinc-200"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 disabled:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
};
