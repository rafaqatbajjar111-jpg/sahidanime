import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, orderBy, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebase';
import { useAnime } from '../context/AnimeContext';
import { Plus, Trash2, Edit2, Upload, Loader2, Film, ListPlus, X, Check, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { notifyAllUsers } from '../services/notificationService';

export const AdminAnime: React.FC = () => {
  const { animes } = useAnime();
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState<string | null>(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [showEpisodeList, setShowEpisodeList] = useState<string | null>(null);
  const [animeEpisodes, setAnimeEpisodes] = useState<any[]>([]);
  const [editingAnimeId, setEditingAnimeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    poster: null as File | null,
    posterUrl: ''
  });

  const [epData, setEpData] = useState({
    title: '',
    videoUrl: '',
    downloadUrl: '',
    accessType: 'free' as 'free' | 'premium' | 'locked',
    order: 1
  });

  const formatDailymotionUrl = (url: string) => {
    if (!url) return url;
    
    // Match normal dailymotion video link: https://www.dailymotion.com/video/k5Up5g2jnKrBdJFfjMQ
    const dailymotionRegex = /dailymotion\.com\/video\/([a-zA-Z0-9]+)/;
    const match = url.match(dailymotionRegex);
    
    if (match && match[1]) {
      const videoCode = match[1];
      return `https://geo.dailymotion.com/player.html?video=${videoCode}&autoplay=true&mute=false`;
    }
    
    return url;
  };

  const handleAddAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.poster && !formData.posterUrl && !editingAnimeId) return toast.error('Please select a poster or provide a URL');
    setLoading(true);

    try {
      let finalPosterUrl = formData.posterUrl;

      if (formData.poster) {
        const storageRef = ref(storage, `posters/${Date.now()}_${formData.poster.name}`);
        const uploadSnap = await uploadBytes(storageRef, formData.poster);
        finalPosterUrl = await getDownloadURL(uploadSnap.ref);
      }

      const animeData = {
        title: formData.title,
        description: formData.description,
        genre: formData.genre,
        posterUrl: finalPosterUrl,
        updatedAt: serverTimestamp()
      };

      if (editingAnimeId) {
        await updateDoc(doc(db, 'anime', editingAnimeId), animeData);
        toast.success('Anime updated successfully!');
      } else {
        await addDoc(collection(db, 'anime'), {
          ...animeData,
          createdAt: serverTimestamp()
        });
        toast.success('Anime added successfully!');
        // Notify all users about new content
        await notifyAllUsers(
          'New Anime Added! 🎬',
          `${formData.title} is now available on SahidAnime. Start watching now!`,
          'update'
        );
      }

      setShowAddModal(false);
      setEditingAnimeId(null);
      setFormData({ title: '', description: '', genre: '', poster: null, posterUrl: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnime = async (animeId: string) => {
    if (!window.confirm('Are you sure you want to delete this anime? All episodes will also be deleted.')) return;
    setLoading(true);
    try {
      // 1. Delete all episodes first
      const q = query(collection(db, 'anime', animeId, 'episodes'));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // 2. Delete the anime document
      await deleteDoc(doc(db, 'anime', animeId));
      toast.success('Anime and all episodes deleted!');
    } catch (error: any) {
      console.error("Delete Anime Error:", error);
      toast.error('Failed to delete anime');
    } finally {
      setLoading(false);
    }
  };

  const openEditAnime = (anime: any) => {
    setFormData({
      title: anime.title,
      description: anime.description,
      genre: anime.genre,
      poster: null,
      posterUrl: anime.posterUrl
    });
    setEditingAnimeId(anime.id);
    setShowAddModal(true);
  };

  const fetchEpisodes = async (animeId: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'anime', animeId, 'episodes'));
      const querySnapshot = await getDocs(q);
      const eps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side to handle missing order
      setAnimeEpisodes(eps.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
      setShowEpisodeList(animeId);
    } catch (error: any) {
      toast.error('Failed to fetch episodes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEpisodeModal) return;
    setLoading(true);

    try {
      const formattedVideoUrl = formatDailymotionUrl(epData.videoUrl);
      const finalEpData = {
        ...epData,
        videoUrl: formattedVideoUrl,
        downloadUrl: epData.downloadUrl || ''
      };

      if (editingEpisodeId) {
        await updateDoc(doc(db, 'anime', showEpisodeModal, 'episodes', editingEpisodeId), {
          ...finalEpData,
          updatedAt: serverTimestamp()
        });
        toast.success('Episode updated!');
      } else {
        await addDoc(collection(db, 'anime', showEpisodeModal, 'episodes'), {
          ...finalEpData,
          animeId: showEpisodeModal,
          createdAt: serverTimestamp()
        });
        toast.success('Episode added!');
      }
      
      setEpData({ title: '', videoUrl: '', downloadUrl: '', accessType: 'free', order: epData.order + 1 });
      setShowEpisodeModal(null);
      setEditingEpisodeId(null);
      if (showEpisodeList) fetchEpisodes(showEpisodeList);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEpisode = async (animeId: string, episodeId: string) => {
    if (!window.confirm('Are you sure you want to delete this episode?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'anime', animeId, 'episodes', episodeId));
      toast.success('Episode deleted');
      fetchEpisodes(animeId);
    } catch (error: any) {
      toast.error('Failed to delete episode');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllEpisodes = async (animeId: string) => {
    if (!window.confirm('Are you sure you want to delete ALL episodes for this anime? This cannot be undone.')) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'anime', animeId, 'episodes'));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      toast.success('All episodes deleted!');
      setAnimeEpisodes([]);
    } catch (error: any) {
      toast.error('Failed to delete episodes');
    } finally {
      setLoading(false);
    }
  };

  const openEditEpisode = (ep: any) => {
    setEpData({
      title: ep.title,
      videoUrl: ep.videoUrl,
      downloadUrl: ep.downloadUrl || '',
      accessType: ep.accessType,
      order: ep.order
    });
    setEditingEpisodeId(ep.id);
    setShowEpisodeModal(showEpisodeList);
  };

  return (
    <div className="space-y-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Manage Anime</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-5 h-5" /> Add New Anime
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {animes.map((anime) => (
          <div key={anime.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-zinc-700 transition-all">
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={anime.posterUrl} 
                alt={anime.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm truncate">{anime.title}</h3>
                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 shrink-0">{anime.genre}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setShowEpisodeModal(anime.id)}
                  className="flex-1 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                >
                  <ListPlus className="w-3 h-3" /> Add Ep
                </button>
                <button 
                  onClick={() => fetchEpisodes(anime.id)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                >
                  <ChevronRight className="w-3 h-3" /> View Eps
                </button>
                <button 
                  onClick={() => openEditAnime(anime)}
                  className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => handleDeleteAnime(anime.id)}
                  className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Anime Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-xl space-y-6 shadow-2xl relative">
            <button 
              onClick={() => {
                setShowAddModal(false);
                setEditingAnimeId(null);
                setFormData({ title: '', description: '', genre: '', poster: null, posterUrl: '' });
              }} 
              className="absolute top-6 right-6 text-zinc-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Film className="w-6 h-6 text-blue-500" />
              {editingAnimeId ? 'Edit Anime' : 'Add New Anime'}
            </h2>
            <form onSubmit={handleAddAnime} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Anime Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Description</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Genre (comma separated)</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Poster Image (Upload or URL)</label>
                <div className="grid grid-cols-1 gap-4">
                  <div className="relative h-24 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, poster: e.target.files?.[0] || null })}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    {formData.poster ? (
                      <div className="flex items-center gap-2 text-blue-500 font-bold text-xs">
                        <Check className="w-4 h-4" /> {formData.poster.name}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-zinc-500 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[10px] text-zinc-500">Click to upload poster</span>
                      </>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      type="url" 
                      placeholder="Or paste poster image URL here..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-xs focus:outline-none focus:border-blue-500 transition-all"
                      value={formData.posterUrl}
                      onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <button 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Save Anime'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Episode Modal */}
      {showEpisodeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-xl space-y-6 shadow-2xl relative">
            <button onClick={() => setShowEpisodeModal(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <ListPlus className="w-6 h-6 text-blue-500" />
              {editingEpisodeId ? 'Edit Episode' : 'Add Episode'}
            </h2>
            <form onSubmit={handleAddEpisode} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400">Episode Title</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                    value={epData.title}
                    onChange={(e) => setEpData({ ...epData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-400">Order</label>
                  <input 
                    type="number" 
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                    value={epData.order}
                    onChange={(e) => setEpData({ ...epData, order: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Stream Link (Video URL)</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://example.com/video.mp4"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                  value={epData.videoUrl}
                  onChange={(e) => setEpData({ ...epData, videoUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Download Link (Google Drive / Mega)</label>
                <input 
                  type="url" 
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                  value={epData.downloadUrl}
                  onChange={(e) => setEpData({ ...epData, downloadUrl: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-400">Access Type (Free or Paid)</label>
                <select 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 transition-all"
                  value={epData.accessType}
                  onChange={(e) => setEpData({ ...epData, accessType: e.target.value as any })}
                >
                  <option value="free">Free (Everyone can watch)</option>
                  <option value="premium">Premium (Only paid users)</option>
                  <option value="locked">Locked (Coming Soon)</option>
                </select>
              </div>
              <button 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (editingEpisodeId ? 'Update Episode' : 'Add Episode')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Episode List Modal */}
      {showEpisodeList && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-2xl space-y-6 shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <button onClick={() => setShowEpisodeList(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <ListPlus className="w-6 h-6 text-blue-500" />
                Episodes List
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {animeEpisodes.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">No episodes found for this anime.</div>
              ) : (
                animeEpisodes.map((ep) => (
                  <div key={ep.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700 group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-zinc-400">
                        {ep.order}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-200">{ep.title}</h4>
                        <span className={cn(
                          "text-[10px] font-bold uppercase",
                          ep.accessType === 'free' ? "text-green-500" : "text-yellow-500"
                        )}>
                          {ep.accessType}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 transition-opacity">
                      <button 
                        onClick={() => openEditEpisode(ep)}
                        className="p-2 bg-blue-600/10 text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEpisode(showEpisodeList, ep.id)}
                        className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
