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

export const analyzePaymentScreenshot = async (base64Image: string, planDetails: string, validRecipients: string[] = ["Sahid Anime 4 You", "SK HAMJA", "btthhindidubmasala@okicici"]) => {
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey) {
    throw new Error('AI Service is not configured. Please add VITE_SUPABASE_ANON_KEY to environment variables.');
  }

  const recipientsList = validRecipients.join(", ");
  const prompt = `
    You are an automated payment verification agent for SahidAnime.
    Your task is to analyze the provided payment screenshot and determine if it is a valid, real payment.
    The user is interested in one of these plans:
    ${planDetails}

    CRITICAL VERIFICATION STEPS:
    1. **Amount Detection**: Extract the exact amount paid from the screenshot.
    2. **Recipient Match**: The recipient MUST be one of these: ${recipientsList}.
    3. **Transaction Status**: Must be "Success", "Completed", or "Successful".
    4. **Date Check**: The transaction date must be recent (today or yesterday).
    5. **Authenticity**: Check for signs of editing, fake fonts, or reused screenshots.
    6. **Metadata Extraction**: Extract:
       - **status**: "APPROVED" (if it matches one of the plan prices exactly), "PARTIAL" (if it's less than a plan price), or "REJECTED" (invalid).
       - **utr**: The UTR/Transaction ID.
       - **battery**: Phone battery percentage.
       - **amount**: The exact amount paid as seen in screenshot.
       - **recipient**: The name of the person/business paid (e.g., "SK HAMJA").

    Respond ONLY with a JSON object:
    {
      "status": "APPROVED" | "PARTIAL" | "REJECTED",
      "utr": "extracted_utr_or_null",
      "battery": "extracted_battery_percentage_or_null",
      "amount": number,
      "recipient": "extracted_name",
      "reason": "Reason if REJECTED or PARTIAL (in Hindi/English)"
    }
    
    Example for PARTIAL: { "status": "PARTIAL", "amount": 45, "reason": "Aapne 45 rupaye bheje hain, 5 rupaye aur bhej kar activate karein." }
    
    Be extremely strict. If you are unsure, REJECT.
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
