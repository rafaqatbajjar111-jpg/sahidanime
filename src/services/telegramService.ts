import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export const sendTelegramNotification = async (message: string) => {
  try {
    // Ensure user is authenticated before trying to read config
    if (!auth.currentUser) {
      console.warn("Telegram Notification skipped: User not authenticated.");
      return;
    }

    const docRef = doc(db, 'settings', 'telegram');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.warn("Telegram Notification skipped: Config not found.");
      return;
    }
    
    const config = docSnap.data() as TelegramConfig;
    if (!config.enabled || !config.botToken || !config.chatId) {
      console.warn("Telegram Notification skipped: Config disabled or incomplete.");
      return;
    }

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Telegram API Error:", errorData);
    }
  } catch (error: any) {
    console.error("Telegram Notification Error:", error.message);
  }
};
