import React from 'react';
import { Camera, Sparkles, LayoutGrid, Download, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LandingPage({ onStartPhoto }) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-12 animate-slide-up">
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        
        {/* Custom Logo Brand */}
        <div className="mb-6">
          <img
            src="/logo.svg"
            alt="GoPhotobooth"
            className="h-16 sm:h-20 md:h-24 w-auto object-contain hover:scale-105 transition-transform duration-300 drop-shadow-sm"
          />
        </div>

        {/* Minimalist Studio Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-200/60 border border-stone-300/80 text-stone-700 text-xs font-semibold tracking-widest uppercase mb-4 shadow-sm">
          <Camera className="w-3.5 h-3.5 text-stone-700" />
          <span>Studio Photobooth Online</span>
        </div>

        {/* Catchy & Elegant Subtitle */}
        <p className="font-serif italic text-xl sm:text-2xl text-stone-600 mb-6 font-normal">
          Abadikan setiap senyum dalam kenangan strip foto klasik.
        </p>

        {/* Compelling Description */}
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-lg mb-8">
          Pengalaman photobooth digital yang simpel dan elegan langsung dari browsermu. Dilengkapi filter analog vintage era 70-an &amp; 90-an, tata letak strip ikonis, serta bingkai estetik siap unduh.
        </p>

        {/* Command Call-To-Action Text */}
        <div className="bg-stone-100/90 border border-stone-200/80 rounded-2xl px-6 py-4 mb-6 shadow-sm max-w-md w-full">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
            Siap untuk berpose?
          </p>
          <p className="text-sm font-semibold text-stone-800">
            Tekan tombol di bawah untuk menyalakan kamera dan memulai sesi foto.
          </p>
        </div>

        {/* Primary Action Button: "Mulai Foto" */}
        <button
          onClick={onStartPhoto}
          className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 text-base sm:text-lg font-semibold tracking-wide text-white bg-stone-900 hover:bg-stone-800 active:scale-95 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
        >
          <Camera className="w-5 h-5 text-stone-300 group-hover:scale-110 transition-transform duration-300" />
          <span>Mulai Foto</span>
          <ArrowRight className="w-5 h-5 text-stone-400 group-hover:translate-x-1 transition-transform duration-300" />
        </button>

        {/* Minimalist Feature Highlights */}
        <div className="mt-14 pt-8 border-t border-stone-200/80 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-stone-600">
          <div className="flex items-center justify-center gap-2 text-xs font-medium py-2 px-3 rounded-xl bg-white/60 border border-stone-200/60 shadow-xs">
            <Sparkles className="w-4 h-4 text-stone-700" />
            <span>Filter Vintage &amp; Film Grain</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-medium py-2 px-3 rounded-xl bg-white/60 border border-stone-200/60 shadow-xs">
            <LayoutGrid className="w-4 h-4 text-stone-700" />
            <span>Tata Letak Strip &amp; Grid</span>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-medium py-2 px-3 rounded-xl bg-white/60 border border-stone-200/60 shadow-xs">
            <Download className="w-4 h-4 text-stone-700" />
            <span>Unduh Instan Kualitas Tinggi</span>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-6 flex items-center gap-1.5 text-[11px] text-stone-400">
          <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
          <span>Privasi terjaga — foto diproses langsung di browsermu tanpa diunggah ke server.</span>
        </div>

      </div>
    </div>
  );
}
