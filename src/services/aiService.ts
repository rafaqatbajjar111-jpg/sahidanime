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

export const analyzePaymentScreenshot = async (base64Image: string, planDetails: string) => {
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey) {
    throw new Error('AI Service is not configured. Please add VITE_SUPABASE_ANON_KEY to environment variables.');
  }

  const prompt = `
    You are an automated payment verification agent for SahidAnime.
    Your task is to analyze the provided payment screenshot and determine if it is a valid, real payment for the following plan:
    ${planDetails}

    CRITICAL VERIFICATION STEPS:
    1. **Amount Match**: The amount in the screenshot MUST EXACTLY MATCH the plan price.
    2. **Recipient Match**: The recipient MUST be "Sahid Anime 4 You" or UPI ID: "btthhindidubmasala@okicici".
    3. **Transaction Status**: Must be "Success", "Completed", or "Successful".
    4. **Date Check**: The transaction date must be recent (today or yesterday).
    5. **Authenticity**: Check for signs of editing, fake fonts, or reused screenshots.

    If ALL criteria are met, respond ONLY with "APPROVED".
    If ANY criteria fail, respond with "REJECTED: [Reason in Hindi/English]".
    Example reasons: "Wrong amount", "Incorrect recipient", "Old transaction", "Fake screenshot".
    
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
