'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-5 right-5 bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-xl shadow-black/10 p-5 max-w-sm z-50 animate-modal-in">
      <button
        onClick={() => setShowInstallPrompt(false)}
        className="absolute top-3 right-3 text-black/30 hover:text-black/60 rounded-full p-1 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-start gap-3.5 pr-4">
        <div className="bg-accent/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
          <Download size={18} className="text-accent" strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-ink text-[15px] tracking-tight mb-1">Install Researchly</h3>
          <p className="text-[13px] text-muted mb-3.5 leading-relaxed">
            Add it to your device for offline access and a faster, app-like experience.
          </p>
          <button
            onClick={handleInstallClick}
            className="bg-accent text-white px-4 py-2 rounded-full hover:bg-accent-hover text-[13px] font-medium w-full transition-colors"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
