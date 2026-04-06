import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { MessageSquare, Send, X, Sparkles, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { AIChatbot } from './AIChatbot';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';

import { toast } from 'react-hot-toast';

interface SupportConfig {
  telegram: string;
  whatsapp: string;
  enabled: boolean;
}

interface ChatbotConfig {
  enabled: boolean;
  botName: string;
  systemPrompt: string;
}

export const FloatingSupport: React.FC = () => {
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const unsubSupport = onSnapshot(doc(db, 'settings', 'support'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data() as SupportConfig);
      }
    }, (error: any) => {
      handleFirestoreError(error, OperationType.GET, 'settings/support');
      if (error.code === 'resource-exhausted') {
        toast.error("Database quota exceeded. Please try again tomorrow.");
      }
    });

    const unsubChatbot = onSnapshot(doc(db, 'settings', 'chatbot'), (doc) => {
      if (doc.exists()) {
        setChatbotConfig(doc.data() as ChatbotConfig);
      }
    }, (error: any) => {
      handleFirestoreError(error, OperationType.GET, 'settings/chatbot');
    });

    return () => {
      unsubSupport();
      unsubChatbot();
    };
  }, []);

  if (!config || !config.enabled) return null;

  const hasWhatsapp = !!config.whatsapp;
  const isChatbotEnabled = chatbotConfig?.enabled ?? true;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isChatOpen && (
          <AIChatbot onClose={() => setIsChatOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && !isChatOpen && (
          <div className="flex flex-col gap-3 mb-2">
            {hasWhatsapp && (
              <motion.a
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                href={config.whatsapp.startsWith('http') ? config.whatsapp : `https://wa.me/${config.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                title="WhatsApp Support"
              >
                <MessageSquare className="w-7 h-7" />
              </motion.a>
            )}
            {isChatbotEnabled && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, y: 20 }}
                transition={{ delay: 0.05 }}
                onClick={() => {
                  setIsChatOpen(true);
                  setIsOpen(false);
                }}
                className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                title="AI Chatbot"
              >
                <Bot className="w-7 h-7" />
              </motion.button>
            )}
          </div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          if (isChatOpen) {
            setIsChatOpen(false);
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90",
          (isOpen || isChatOpen) ? "bg-zinc-800 text-white rotate-90" : "bg-blue-600 text-white"
        )}
      >
        {(isOpen || isChatOpen) ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
      </button>
    </div>
  );
};
