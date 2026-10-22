import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CheckCircle2, ShieldCheck } from 'lucide-react';

export const NetworkNotice: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setDismissed(false);
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (dismissed) return null;

  // Offline banner
  if (!isOnline) {
    return (
      <div className="bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-amber-950/90 border-b border-amber-500/40 text-amber-200 px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-lg z-30 transition-all animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-amber-300">Vous êtes hors ligne : </span>
            <span className="text-amber-100">
              Le mode local est activé. Vous pouvez continuer à vous inscrire, vous connecter et naviguer (données sauvegardées sur cet appareil).
            </span>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-300 hover:text-white px-2 py-0.5 rounded bg-amber-900/50 hover:bg-amber-800 text-[11px] font-bold shrink-0 transition"
        >
          Masquer
        </button>
      </div>
    );
  }

  // Reconnected banner (brief)
  if (justReconnected) {
    return (
      <div className="bg-gradient-to-r from-emerald-950/90 via-emerald-900/90 to-emerald-950/90 border-b border-emerald-500/40 text-emerald-200 px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-lg z-30 transition-all animate-fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <span className="font-extrabold text-emerald-300">Connexion rétablie : </span>
            <span className="text-emerald-100">Vous êtes de nouveau en ligne avec le serveur.</span>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-emerald-300 hover:text-white px-2 py-0.5 rounded bg-emerald-900/50 hover:bg-emerald-800 text-[11px] font-bold shrink-0 transition"
        >
          OK
        </button>
      </div>
    );
  }

  return null;
};
