import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const GlobalAds: React.FC = () => {
  const { userData } = useAuth();
  const [activeSet, setActiveSet] = useState<'new' | 'old'>('new');

  useEffect(() => {
    // Only inject if user is not premium
    if (userData && userData.subscription_status !== 'active') {
      const newScripts = [
        "https://pl29131533.profitablecpmratenetwork.com/67/0e/06/670e060892b3646a04cf6bee0a88fbd8.js",
        "https://pl29131608.profitablecpmratenetwork.com/35e958fc73e33ab7d875b057bfb219ef/invoke.js"
      ];
      const oldScripts = [
        "https://pl29057226.profitablecpmratenetwork.com/20/21/5f/20215f2fe2e7cea30e15c9173c0f20a7.js",
        "https://pl29057229.profitablecpmratenetwork.com/4e/94/76/4e9476ec6ff715b6c34a5b897658330f.js"
      ];

      const injectAds = () => {
        // Clean up previous ads
        document.querySelectorAll('.global-ad-instance').forEach(el => el.remove());

        const adContainer = document.createElement('div');
        adContainer.className = 'global-ad-instance';
        adContainer.style.position = 'fixed';
        adContainer.style.top = '0';
        adContainer.style.left = '0';
        adContainer.style.width = '1px';
        adContainer.style.height = '1px';
        adContainer.style.overflow = 'hidden';
        adContainer.style.zIndex = '-1'; 
        adContainer.style.pointerEvents = 'none';
        adContainer.style.opacity = '0';
        document.body.appendChild(adContainer);

        if (activeSet === 'new') {
          // Add native banner container
          const nativeContainer = document.createElement('div');
          nativeContainer.id = 'container-35e958fc73e33ab7d875b057bfb219ef';
          adContainer.appendChild(nativeContainer);

          newScripts.forEach(src => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            if (src.includes('invoke.js')) {
              s.setAttribute('data-cfasync', 'false');
            }
            adContainer.appendChild(s);
          });
        } else {
          oldScripts.forEach(src => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            adContainer.appendChild(s);
          });
        }
      };

      // Inject ads once at the start of the cycle
      injectAds();

      // Rotation logic: New (100s) -> Old (50s)
      const rotationTimer = setTimeout(() => {
        setActiveSet(prev => (prev === 'new' ? 'old' : 'new'));
      }, activeSet === 'new' ? 100000 : 50000);

      // Add CSS
      const style = document.createElement('style');
      style.textContent = `
        .global-ad-instance * {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        iframe[id^="google_ads"], div[id^="ad-"], .ad-container {
          min-height: 250px !important;
          width: 100% !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        clearTimeout(rotationTimer);
        document.querySelectorAll('.global-ad-instance').forEach(el => el.remove());
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [userData, activeSet]);

  return null;
};
