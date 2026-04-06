import React from 'react';
import { Link } from 'react-router-dom';
import { useAnime } from '../context/AnimeContext';
import { useTheme } from '../context/ThemeContext';
import { Play, Star, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export const Dashboard: React.FC = () => {
  const { animes, loading } = useAnime();
  const { theme } = useTheme();
  const [currentBannerIndex, setCurrentBannerIndex] = React.useState(0);

  const featuredAnimes = animes.slice(0, 5);

  React.useEffect(() => {
    if (featuredAnimes.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % featuredAnimes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredAnimes.length]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className={cn(
          "h-[300px] rounded-2xl animate-pulse",
          theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100"
        )} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[...Array(10)].map((_, i) => (
            <div key={i} className={cn(
              "aspect-[2/3] rounded-2xl animate-pulse",
              theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100"
            )} />
          ))}
        </div>
      </div>
    );
  }

  const featured = featuredAnimes[currentBannerIndex] || {
    title: "Welcome to sahidanime",
    description: "Discover the latest and greatest anime series here.",
    posterUrl: "https://picsum.photos/seed/anime-hero/1920/1080"
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative h-[350px] lg:h-[500px] lg:rounded-2xl overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.div
            key={featured.id || 'default'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            <img 
              src={featured.posterUrl} 
              alt={featured.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-4 lg:p-10">
              <div className="max-w-2xl space-y-2 lg:space-y-3">
                <div className="flex items-center gap-1.5 lg:gap-2 text-blue-500 font-bold text-[10px] lg:text-xs uppercase tracking-widest">
                  <TrendingUp className="w-3 lg:w-3.5 h-3 lg:h-3.5" />
                  {featured.id ? 'New Release' : 'Featured'}
                </div>
                <h1 className="text-2xl lg:text-5xl font-black tracking-tighter text-white leading-tight">
                  {featured.title}
                </h1>
                <p className="text-zinc-300 text-xs lg:text-sm line-clamp-2 max-w-xl">
                  {featured.description}
                </p>
                <div className="flex items-center gap-3 pt-2 lg:pt-4">
                  {featured.id ? (
                    <Link 
                      to={`/anime/${featured.id}`}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs lg:text-sm shadow-lg shadow-blue-600/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch Now
                    </Link>
                  ) : (
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-xs lg:text-sm shadow-lg shadow-blue-600/20">
                      <Play className="w-3.5 h-3.5 fill-current" /> Explore
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Banner Indicators */}
        {featuredAnimes.length > 1 && (
          <div className="absolute bottom-6 right-6 flex gap-2">
            {featuredAnimes.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentBannerIndex(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentBannerIndex === i ? "bg-blue-500 w-6" : "bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </section>

      {/* Anime Grid */}
      <section className="space-y-4 lg:space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg lg:text-2xl font-black flex items-center gap-2 lg:gap-3">
            <Star className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-500 fill-current" />
            Recently Added
          </h2>
          <Link to="/all" className="text-blue-500 hover:text-blue-400 font-bold text-[10px] lg:text-sm flex items-center gap-1 shrink-0">
            View All <TrendingUp className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-6">
          {animes.map((anime, index) => (
            <motion.div
              key={anime.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/anime/${anime.id}`} className="group block space-y-3">
                <div className="relative aspect-[2/3] lg:rounded-2xl overflow-hidden shadow-xl border border-zinc-200 dark:border-zinc-800">
                  <img 
                    src={anime.posterUrl} 
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 text-white fill-current" />
                    </div>
                  </div>
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                    <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white border border-white/10 shadow-lg">
                      HD
                    </div>
                    <div className="px-2 py-1 bg-blue-600/80 backdrop-blur-md rounded-lg text-[8px] font-black text-white border border-blue-400/20 shadow-lg uppercase tracking-wider">
                      Fan Dub
                    </div>
                  </div>
                </div>
                <div className="space-y-1 px-1">
                  <h3 className="font-black text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors line-clamp-1 text-sm">
                    {anime.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                    <span>{anime.genre}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>24m</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};
