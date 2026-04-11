import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';

export const GlobalAds: React.FC = () => {
  const { userData } = useAuth();

  useEffect(() => {
    // Only inject if user is not premium
    if (userData && userData.subscription_status !== 'active') {
      const injectAds = () => {
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

        const scripts = [
          "https://pl29057226.profitablecpmratenetwork.com/20/21/5f/20215f2fe2e7cea30e15c9173c0f20a7.js",
          "https://pl29057229.profitablecpmratenetwork.com/4e/94/76/4e9476ec6ff715b6c34a5b897658330f.js"
        ];

        scripts.forEach(src => {
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          adContainer.appendChild(s);
        });
      };

      // Initial injection
      injectAds();

      // Re-inject every 45 seconds to ensure a "flood" of ads
      const interval = setInterval(injectAds, 45000);

      // Force click-trigger: Every click on the body will attempt to trigger ad logic
      const clickTrigger = () => {
        // Some ad scripts listen for user interaction to pop up
        // We can simulate or just re-trigger injection on interaction
        console.log("User interaction detected, ensuring ads are active...");
      };
      document.body.addEventListener('click', clickTrigger);

      // Add CSS to force ad elements to be more prominent
      const style = document.createElement('style');
      style.textContent = `
        .global-ad-instance * {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        /* Make it harder to ignore */
        iframe[id^="google_ads"], 
        div[id^="ad-"], 
        .ad-container {
          min-height: 250px !important;
          width: 100% !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        clearInterval(interval);
        document.body.removeEventListener('click', clickTrigger);
        document.querySelectorAll('.global-ad-instance').forEach(el => el.remove());
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [userData]);

  return null;
};
