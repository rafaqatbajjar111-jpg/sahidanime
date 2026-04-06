import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export const sendTelegramNotification = async (message: string) => {
  try {
    const docRef = doc(db, 'settings', 'telegram');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return;
    
    const config = docSnap.data() as TelegramConfig;
    if (!config.enabled || !config.botToken || !config.chatId) return;

    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error("Telegram Notification Error:", error);
  }
};
