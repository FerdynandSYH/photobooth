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

      {/* Countdown & CHEESE! Cue Overlay (High Contrast & Legible) */}
      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 select-none pointer-events-none p-4">
          {countdown === 'CHEESE!' ? (
            <div className="flex flex-col items-center gap-2 transform animate-scale-in">
              <span className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl bg-stone-950/85 backdrop-blur-md border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.4)] text-3xl sm:text-5xl font-black font-sans tracking-widest text-amber-300 uppercase">
                CHEESE!
              </span>
              <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider uppercase text-white bg-stone-900/90 px-4 py-1 rounded-full border border-white/20 backdrop-blur-md shadow-md">
                Tersenyumlah ke Kamera
              </span>
            </div>
          ) : (
            <div
              key={countdown}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-stone-950/85 backdrop-blur-md border-3 border-white/90 shadow-[0_0_35px_rgba(0,0,0,0.7)] flex items-center justify-center text-5xl sm:text-6xl font-black font-sans text-white animate-scale-in"
            >
              {countdown}
            </div>
          )}
        </div>
      )}

      {/* Screen Flash Effect */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white pointer-events-none z-30 animate-flash" />
      )}
    </div>
  );
}
