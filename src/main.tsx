import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Environment variable check for debugging
if (import.meta.env.DEV) {
  const requiredVars = ['VITE_SUPABASE_ANON_KEY'];
  requiredVars.forEach(v => {
    if (!import.meta.env[v]) {
      console.warn(`[SahidAnime] Warning: Missing environment variable ${v}. AI features may not work.`);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
