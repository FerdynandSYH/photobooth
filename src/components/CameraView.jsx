import React from 'react';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';

export default function CameraView({
  videoRef,
  setVideoRef,
  isMirror,
  countdown,
  isFlashing,
  sessionProgress,
  permissionStatus,
  errorMessage,
  onRetryCamera,
}) {
  return (
    <div className="relative w-full aspect-[4/3] bg-stone-900 rounded-2xl overflow-hidden shadow-md border border-stone-300 group">
      
      {/* Video Element: Natural Camera View without pre-applied filters */}
      <video
        ref={setVideoRef || videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${
          isMirror ? 'mirror' : ''
        }`}
      />

      {/* Camera Permission / Error State */}
      {permissionStatus === 'denied' && (
        <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-14 h-14 rounded-2xl bg-stone-800 text-stone-200 flex items-center justify-center mb-3 border border-stone-700">
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Izin Kamera Diperlukan</h3>
          <p className="text-xs text-stone-300 max-w-xs mb-4 leading-relaxed">
            {errorMessage || 'Browser memblokir akses ke kamera. Silakan klik ikon gembok pada address bar browser Anda dan ubah izin kamera menjadi "Allow".'}
          </p>
          <button
            onClick={onRetryCamera}
            className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-stone-900 font-bold text-xs transition shadow-md hover:bg-stone-100 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {permissionStatus === 'error' && (
        <div className="absolute inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-14 h-14 rounded-2xl bg-stone-800 text-stone-200 flex items-center justify-center mb-3 border border-stone-700">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Kendala Kamera</h3>
          <p className="text-xs text-stone-300 max-w-xs mb-4 leading-relaxed">
            {errorMessage || 'Tidak dapat terhubung ke kamera perangkat.'}
          </p>
          <button
            onClick={onRetryCamera}
            className="min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-stone-900 font-bold text-xs transition shadow-md hover:bg-stone-100 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang Kamera</span>
          </button>
        </div>
      )}

      {permissionStatus === 'loading' && (
        <div className="absolute inset-0 bg-stone-950 flex flex-col items-center justify-center z-20">
          <div className="w-8 h-8 border-3 border-stone-600 border-t-white rounded-full animate-spin mb-2.5"></div>
          <p className="text-xs text-stone-400 font-medium">Menghubungkan ke kamera...</p>
        </div>
      )}

      {/* Progress Badge (e.g. Foto 1 dari 4) */}
      {sessionProgress.active && (
        <div className="absolute top-3 left-3 z-20">
          <div className="bg-stone-900/90 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-stone-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Foto {sessionProgress.current} dari {sessionProgress.total}</span>
          </div>
        </div>
      )}

      {/* Countdown Overlay (Translucent & Minimalist) */}
      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 select-none pointer-events-none p-4">
          <div
            key={countdown}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/25 backdrop-blur-xs border border-white/30 shadow-md flex items-center justify-center text-4xl sm:text-5xl font-black font-sans text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] animate-scale-in"
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Screen Flash Effect */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white pointer-events-none z-30 animate-flash" />
      )}
    </div>
  );
}
