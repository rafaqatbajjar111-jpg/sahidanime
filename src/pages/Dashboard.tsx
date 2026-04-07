import React from 'react';
import { Link } from 'react-router-dom';
import { useAnime } from '../context/AnimeContext';
import { useTheme } from '../context/ThemeContext';
import { Play, Star, Clock, TrendingUp, ChevronRight } from 'lucide-react';
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
      <div className="space-y-12 py-4">
        {/* Hero Skeleton */}
        <div className={cn(
          "h-[350px] lg:h-[500px] rounded-3xl animate-pulse relative overflow-hidden",
          theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100"
        )}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-shimmer" />
        </div>
        
        {/* Grid Skeleton */}
        <div className="space-y-6">
          <div className={cn("h-8 w-48 rounded-lg animate-pulse", theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100")} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-8">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className={cn(
                  "aspect-[2/3] rounded-2xl animate-pulse",
                  theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100"
                )} />
                <div className="space-y-2">
                  <div className={cn("h-4 w-3/4 rounded animate-pulse", theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100")} />
                  <div className={cn("h-3 w-1/2 rounded animate-pulse", theme === 'dark' ? "bg-zinc-900" : "bg-zinc-100")} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const featured = featuredAnimes[currentBannerIndex] || {
    id: 'default',
    title: "Welcome to SahidAnime",
    description: "Discover the latest and greatest anime series here. High quality streaming, multiple servers, and fast downloads.",
    posterUrl: "https://picsum.photos/seed/anime-hero/1920/1080"
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative h-[400px] lg:h-[550px] rounded-3xl overflow-hidden group shadow-2xl shadow-blue-500/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={featured.id || 'default'}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img 
              src={featured.posterUrl} 
              alt={featured.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden lg:block" />
            
            <div className="absolute inset-0 flex flex-col justify-end p-6 lg:p-16">
              <motion.div 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="max-w-3xl space-y-4 lg:space-y-6"
              >
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-600/40">
                    {featured.id ? 'Trending Now' : 'Featured'}
                  </span>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-bold text-white">9.8 Rating</span>
                  </div>
                </div>

                <h1 className="text-3xl lg:text-7xl font-black tracking-tighter text-white leading-[0.9] drop-shadow-2xl">
                  {featured.title}
                </h1>
                
                <p className="text-zinc-300 text-sm lg:text-lg line-clamp-2 max-w-2xl font-medium leading-relaxed drop-shadow-md">
                  {featured.description}
                </p>

                <div className="flex items-center gap-4 pt-4">
                  {featured.id ? (
                    <Link 
                      to={`/anime/${featured.id}`}
                      className="bg-white text-black hover:bg-blue-600 hover:text-white px-8 lg:px-10 py-3 lg:py-4 rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 text-sm lg:text-base shadow-2xl group/btn"
                    >
                      <Play className="w-5 h-5 fill-current group-hover/btn:scale-110 transition-transform" /> 
                      START WATCHING
                    </Link>
                  ) : (
                    <button className="bg-white text-black hover:bg-blue-600 hover:text-white px-8 lg:px-10 py-3 lg:py-4 rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 text-sm lg:text-base shadow-2xl">
                      <Play className="w-5 h-5 fill-current" /> EXPLORE NOW
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Banner Indicators */}
        {featuredAnimes.length > 1 && (
          <div className="absolute bottom-8 right-8 flex gap-3 z-10">
            {featuredAnimes.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentBannerIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  currentBannerIndex === i ? "bg-blue-500 w-10" : "bg-white/20 hover:bg-white/40 w-4"
                )}
              />
            ))}
          </div>
        )}
      </section>

      {/* Anime Grid */}
      <section className="space-y-8">
        <div className="flex items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl lg:text-4xl font-black tracking-tight flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              Latest Updates
            </h2>
            <p className="text-zinc-500 text-sm font-medium">Freshly added episodes and series for you.</p>
          </div>
          <Link to="/all" className="bg-zinc-100 dark:bg-zinc-900 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2">
            VIEW ALL <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-8">
          {animes.map((anime, index) => (
            <motion.div
              key={anime.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (index % 5) * 0.1 }}
            >
              <Link to={`/anime/${anime.id}`} className="group block space-y-4">
                <div className="relative aspect-[2/3] rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-blue-500/20">
                  <img 
                    src={anime.posterUrl} 
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl scale-50 group-hover:scale-100 transition-all duration-500">
                      <Play className="w-7 h-7 text-white fill-current ml-1" />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <div className="px-2.5 py-1 bg-blue-600 text-[10px] font-black text-white rounded-lg shadow-lg uppercase tracking-tighter">
                      New
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                    <div className="flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                      <span className="text-[10px] font-bold text-white">9.5</span>
                    </div>
                    <div className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-white">
                      SUB | DUB
                    </div>
                  </div>
                </div>

                <div className="space-y-2 px-1">
                  <h3 className="font-black text-zinc-900 dark:text-zinc-100 group-hover:text-blue-500 transition-colors line-clamp-1 text-base lg:text-lg tracking-tight">
                    {anime.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-bold">
                    <span className="text-blue-500">{anime.genre}</span>
                    <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>TV Series</span>
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
