const AI_API_URL = "https://dewyfiyiqdveqaockzfn.supabase.co/functions/v1/api";
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | any[];
}

export const chatWithAI = async (messages: ChatMessage[]) => {
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey) {
    throw new Error('Supabase API Key is not configured.');
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
    throw new Error('Supabase API Key is not configured.');
  }

  const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const prompt = `
    You are an intelligent assistant for SahidAnime.
    Today's Date: ${currentDate}
    Current Time: ${currentTime}

    Your task is to analyze the provided image. 
    
    1. If the image is a **Payment Screenshot** (UPI, Bank Transfer, etc.):
       - Extraction: Extract the EXACT amount and the currency (e.g., 35, INR). Be extremely careful with the digits.
       - Verification: BE EXTREMELY LENIENT with the image quality, but STRICT with the extracted amount. If it looks like a real payment, set status to "APPROVED".
       - IMPORTANT: We accept ANY amount (e.g., ₹10, ₹35, ₹50, etc.). Partial payments are allowed.
       - Respond with type: "PAYMENT".
       - If verified, tell them: "✅ Payment Screenshot Verified! System check kar raha hai..."
       - If the amount is not clear, ask them to send a clearer screenshot.

    Respond ONLY with a JSON object. DO NOT include any text outside the JSON.
    JSON Structure:
    {
      "type": "PAYMENT" | "GENERAL",
      "paymentInfo": {
        "status": "APPROVED" | "PARTIAL" | "REJECTED",
        "utr": "extracted_utr_or_null",
        "amount": number,
        "currency": "INR" | "PKR" | "BDT" | "USD",
        "reason": "Reason if REJECTED or PARTIAL (in Hinglish style). Be clear about the amount you saw."
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
