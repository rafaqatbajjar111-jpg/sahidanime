const AI_API_URL = "https://dewyfiyiqdveqaockzfn.supabase.co/functions/v1/api";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
}

export const chatWithAI = async (messages: ChatMessage[]) => {
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey) {
    throw new Error('AI Service is not configured. Please add VITE_SUPABASE_ANON_KEY to environment variables.');
  }

  try {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    
    return data.content || data.text || (typeof data === 'string' ? data : JSON.stringify(data));
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    throw new Error(`AI Chat Error: ${error.message}`);
  }
};

export const analyzeImage = async (base64Image: string, planDetails: string, validRecipients: string[] = ["Sahid Anime 4 You", "SK HAMJA", "btthhindidubmasala@okicici"]) => {
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey) {
    throw new Error('AI Service is not configured. Please add VITE_SUPABASE_ANON_KEY to environment variables.');
  }

  const recipientsList = validRecipients.join(", ");
  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const prompt = `
    You are an intelligent assistant for SahidAnime.
    Today's Date: ${currentDate}
    Current Time: ${currentTime}

    Your task is to analyze the provided image. 
    
    1. If the image is a **Payment Screenshot** (UPI, Bank Transfer, etc.):
       - Extraction: Extract ONLY the amount. Ignore UTR, Transaction ID, and Recipient Name.
       - Verification: BE EXTREMELY LENIENT. If it looks like a payment screenshot, APPROVE IT.
       - CRITICAL: If the amount is exactly 50, 100, or 800, you MUST set status to "APPROVED".
       - CRITICAL: ONLY look at the amount. If the amount is ₹50, ₹100, or ₹800, approve it immediately.
       - CRITICAL: DO NOT check UTR, Transaction ID, Recipient Name, Date, or Time.
       - Respond with type: "PAYMENT".
       - If verified, tell them: "✅ Payment Verified! Aapka premium plan automatically activate ho gaya hai. Enjoy your anime!"

    2. If the user says something like "Mujhe plan chahie", "I need a plan", "Plans dikhao", etc.:
       - List all available plans ONLY in INR (₹):
         * Garib Pro Max: ₹50
         * VIP: ₹100
         * Yearly: ₹800
       - DO NOT mention Dollars ($) or any other currency.
       - Tell them to pay the exact amount in INR (₹) to one of the UPI IDs and send the screenshot here.

    3. If the image is **NOT a payment screenshot** (e.g., a selfie, a landscape, a meme, anime art, etc.):
       - Analyze what is in the image.
       - Respond with type: "GENERAL".

    Respond ONLY with a JSON object:
    {
      "type": "PAYMENT" | "GENERAL",
      "paymentInfo": {
        "status": "APPROVED" | "PARTIAL" | "REJECTED",
        "utr": "extracted_utr_or_null",
        "battery": "extracted_battery_percentage_or_null",
        "amount": number,
        "recipient": "extracted_name",
        "reason": "Reason if REJECTED or PARTIAL (in Hinglish style - Hindi/English mix). Be clear that we only accept INR (₹)."
      },
      "generalInfo": {
        "description": "A brief description of what you see in the image (in Hinglish style)",
        "reaction": "A friendly reaction or comment about the image (in Hinglish style)"
      }
    }
    
    Be extremely strict with payments. If you are unsure if it's a payment, mark it as GENERAL.
  `;

  try {
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          {
            type: "image_url",
            image_url: {
              url: base64Image
            }
          }
        ]
      }
    ];

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey
      },
      body: JSON.stringify({
        "model": DEFAULT_MODEL,
        "messages": messages
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    
    return data.content || data.text || (typeof data === 'string' ? data : "REJECTED: Could not analyze image.");
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    throw new Error(`AI Analysis Error: ${error.message}`);
  }
};

export const generateSpeech = async (text: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not found. TTS disabled.');
    return null;
  }

  try {
    // We use the @google/genai SDK pattern from the skill
    const { GoogleGenAI, Modality } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say naturally in a friendly Hinglish tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return `data:audio/wav;base64,${base64Audio}`;
    }
    return null;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    return null;
  }
};
