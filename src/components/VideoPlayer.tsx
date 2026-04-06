import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Maximize, Volume2, VolumeX, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoPlayerProps {
  src: string;
  title: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if the source is an embed/iframe link
  const isEmbed = src.includes('dailymotion.com') || 
                  src.includes('youtube.com') || 
                  src.includes('vimeo.com') || 
                  src.includes('player.html') ||
                  src.includes('embed');

  useEffect(() => {
    setError(false);
    setIsPlaying(false);
  }, [src]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (Number(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setProgress(Number(e.target.value));
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current?.parentElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.parentElement.requestFullscreen();
      }
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div 
      className="relative group bg-black rounded-xl overflow-hidden aspect-video"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {isEmbed ? (
        <iframe
          key={src}
          src={src}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title}
        />
      ) : (
        <>
          <video
            key={src}
            ref={videoRef}
            src={src}
            autoPlay
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => setError(true)}
          />

          {error && (
            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center text-red-500">
                <VolumeX className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Invalid Video Source</h3>
                <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                  The stream link provided is not a direct video file or is not supported by your browser.
                </p>
              </div>
            </div>
          )}

          {/* Overlay Controls */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 flex flex-col justify-between p-4",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <div className="flex justify-between items-start">
              <h3 className="text-white font-medium text-lg drop-shadow-md">{title}</h3>
              <button className="text-white/80 hover:text-white transition-colors">
                <Settings className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="relative w-full h-1.5 bg-white/20 rounded-full group/progress cursor-pointer">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleProgressChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-100"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                  </button>
                  
                  <div className="flex items-center gap-4">
                    <button onClick={() => skip(-10)} className="text-white/80 hover:text-white">
                      <RotateCcw className="w-6 h-6" />
                    </button>
                    <button onClick={() => skip(10)} className="text-white/80 hover:text-white">
                      <RotateCw className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 group/volume">
                    <button onClick={() => setIsMuted(!isMuted)} className="text-white/80 hover:text-white">
                      {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/20 rounded-full accent-blue-500"
                    />
                  </div>
                </div>

                <button onClick={toggleFullscreen} className="text-white/80 hover:text-white hover:scale-110 transition-transform">
                  <Maximize className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
