import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDailymotionUrl = (url: string) => {
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
