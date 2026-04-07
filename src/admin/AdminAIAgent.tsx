import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { GoogleGenAI, Type } from "@google/genai";
import { Bot, Send, Loader2, Sparkles, AlertCircle, CheckCircle2, ChevronDown, List, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { cn, formatDailymotionUrl } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';
import { useAnime } from '../context/AnimeContext';

export const AdminAIAgent: React.FC = () => {
  const { theme } = useTheme();
  const { animes } = useAnime();
  const [selectedAnimeId, setSelectedAnimeId] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<any>(null);

  const getLastEpisodeNumber = async (animeId: string) => {
    try {
      const q = query(
        collection(db, 'anime', animeId, 'episodes'),
        orderBy('order', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data().order || 0;
      }
      return 0;
    } catch (error) {
      console.error("Error fetching last episode:", error);
      return 0;
    }
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!selectedAnimeId) {
      toast.error("Please select an anime first!");
      return;
    }

    setLoading(true);
    setResult(null);
    setProgress({ current: 0, total: 0 });

    const selectedAnime = animes.find(a => a.id === selectedAnimeId);
    const lastEpNumber = await getLastEpisodeNumber(selectedAnimeId);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I want to add multiple episodes to the anime "${selectedAnime?.title}". 
        The last episode number currently in the database is ${lastEpNumber}.
        
        Parse the following text which contains one or many episode links. 
        Extract a list of episodes. For each episode, identify:
        1. Episode Number: If explicitly mentioned, use it. If not mentioned, assume sequential numbering starting from ${lastEpNumber + 1}.
        2. Stream Link: The primary video URL.
        3. Download Link: A secondary URL for downloading.
        
        CRITICAL INSTRUCTIONS:
        - If the user provides a list of links without numbers, number them sequentially starting from ${lastEpNumber + 1}.
        - If the user mentions a "global download link" or says "all episodes have this download link", apply that link to every episode that doesn't have its own specific download link.
        - If the user provides links in pairs (Stream, Download), match them correctly.
        
        User Request: "${input}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              episodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    episodeNumber: { type: Type.NUMBER },
                    streamUrl: { type: Type.STRING },
                    downloadUrl: { type: Type.STRING },
                    isPremium: { type: Type.BOOLEAN }
                  },
                  required: ["episodeNumber", "streamUrl"]
                }
              }
            },
            required: ["episodes"]
          }
        }
      });

      const data = JSON.parse(response.text || '{"episodes": []}');
      const episodesToAdd = data.episodes;

      if (episodesToAdd.length === 0) {
        setResult({ error: "No episodes found in your request. Please provide links and episode numbers." });
        setLoading(false);
        return;
      }

      setProgress({ current: 0, total: episodesToAdd.length });

      let addedCount = 0;
      for (const ep of episodesToAdd) {
        const epData = {
          title: `Episode ${ep.episodeNumber}`,
          videoUrl: formatDailymotionUrl(ep.streamUrl || ''),
          downloadUrl: ep.downloadUrl || '',
          accessType: ep.isPremium ? 'premium' : 'free',
          order: ep.episodeNumber,
          animeId: selectedAnimeId,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'anime', selectedAnimeId, 'episodes'), epData);
        addedCount++;
        setProgress(prev => ({ ...prev, current: addedCount }));
      }
      
      // Update anime's updatedAt
      await updateDoc(doc(db, 'anime', selectedAnimeId), { updatedAt: serverTimestamp() });

      setResult({ 
        success: true, 
        animeTitle: selectedAnime?.title,
        count: addedCount
      });
      setInput('');
      toast.success(`Successfully added ${addedCount} episodes to ${selectedAnime?.title}!`);

    } catch (error: any) {
      console.error("AI Agent Error:", error);
      setResult({ error: "Failed to process request. Please try again with more details." });
      toast.error("AI Agent failed to process.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Bot className="w-8 h-8 text-blue-500" />
          AI Admin Agent
        </h1>
        <p className="text-zinc-500">Select an anime and paste all links. AI will handle the rest.</p>
      </div>

      <div className={cn(
        "p-8 rounded-3xl border shadow-2xl transition-all",
        theme === 'dark' ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        <form onSubmit={handleAISubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 ml-1">Select Anime</label>
            <div className="relative">
              <select 
                value={selectedAnimeId}
                onChange={(e) => setSelectedAnimeId(e.target.value)}
                className={cn(
                  "w-full rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none",
                  theme === 'dark' ? "bg-black border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                )}
              >
                <option value="">-- Choose an Anime --</option>
                {animes.map(anime => (
                  <option key={anime.id} value={anime.id}>{anime.title}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-sm font-bold text-zinc-500">Paste Links & Instructions</label>
              <button 
                type="button"
                onClick={() => setInput('')}
                className="text-[10px] font-bold text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Example: Here are 10 links for Naruto. Ep 1: link1, Ep 2: link2... and use this download link for all: https://mega.nz/all"
              className={cn(
                "w-full h-48 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none",
                theme === 'dark' ? "bg-black border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
              )}
            />
          </div>

          <button 
            type="submit"
            disabled={loading || !input.trim() || !selectedAnimeId}
            className={cn(
              "w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
              loading ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
            )}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="w-5 h-5 animate-spin" />
                {progress.total > 0 && (
                  <span className="text-[10px] font-bold">Adding {progress.current} / {progress.total}</span>
                )}
              </div>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Process & Add All Episodes
              </>
            )}
          </button>
        </form>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-8 p-6 rounded-2xl border",
              result.error 
                ? "bg-red-500/10 border-red-500/20 text-red-500" 
                : "bg-green-500/10 border-green-500/20 text-green-500"
            )}
          >
            <div className="flex items-start gap-3">
              {result.error ? (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2">
                <p className="font-bold">{result.error || 'Successfully Added!'}</p>
                {!result.error && (
                  <div className="text-sm space-y-1 opacity-80">
                    <p>Anime: <span className="font-black">{result.animeTitle}</span></p>
                    <p>Episodes Added: <span className="font-black">{result.count}</span></p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={cn(
          "p-6 rounded-2xl border",
          theme === 'dark' ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-200"
        )}>
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <List className="w-4 h-4 text-blue-500" />
            Bulk Adding Tips
          </h3>
          <ul className="text-xs text-zinc-500 space-y-2 list-disc ml-4">
            <li>Select the anime first from the dropdown.</li>
            <li>You can paste hundreds of links at once.</li>
            <li>Mention "Use this download link for all" to save time.</li>
            <li>AI will automatically match links to episode numbers.</li>
          </ul>
        </div>
        <div className={cn(
          "p-6 rounded-2xl border",
          theme === 'dark' ? "bg-zinc-900/30 border-zinc-800" : "bg-zinc-50 border-zinc-200"
        )}>
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            Bulk Example
          </h3>
          <p className="text-xs text-zinc-500 italic">
            "Add episodes 1 to 5. 1: link1, 2: link2, 3: link3... and use https://mega.nz/folder as the download link for all of them."
          </p>
        </div>
      </div>
    </div>
  );
};
