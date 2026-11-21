import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, RotateCcw, ArrowLeft, Printer, Sparkles, CheckCircle2, Copy, Check, Ticket, Share2 } from 'lucide-react';
import { saveOrSharePhoto, isMobileDevice } from '../utils/downloadHelper';

export default function PrintingPage({
  imageUrl,
  editorCanvas = null,
  onStartNewSession,
  onBackToEditor,
  audio,
}) {
  const [printProgress, setPrintProgress] = useState(0);
  const [isPrinted, setIsPrinted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = isMobileDevice();
  const hasTriggeredComplete = useRef(false);

  // Smooth paper emergence trajectory from -85% down to 0%
  const translateY = Math.min(0, -85 * (1 - (printProgress / 100)));

  // Run the realistic photobooth paper emergence animation
  useEffect(() => {
    // Ensure audio context is ready for the completion chime & start printer sound
    if (audio?.unlockAudio) {
      audio.unlockAudio();
    }
    if (audio?.playPrintingSound) {
      audio.playPrintingSound(3.0);
    }

    const duration = 3200; // 3.2 seconds smooth photo strip emergence
    const startTime = performance.now();
    hasTriggeredComplete.current = false;

    // Natural ease-out cubic curve so emergence decelerates gently with zero sudden stops
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animatePrint = (currentTime) => {
      const elapsed = currentTime - startTime;
      const rawT = Math.min(1, elapsed / duration);
      const easedT = easeOutCubic(rawT);
      const progress = Math.min(100, Math.round(easedT * 100));
      setPrintProgress(progress);

      if (rawT < 1) {
        requestAnimationFrame(animatePrint);
      } else {
        setIsPrinted(true);
        if (!hasTriggeredComplete.current) {
          hasTriggeredComplete.current = true;
          // Play success chime ONLY when photo printing finishes 100%
          if (audio?.playPrintComplete) {
            audio.playPrintComplete();
          }
        }
      }
    };

    const rafId = requestAnimationFrame(animatePrint);
    return () => cancelAnimationFrame(rafId);
  }, [audio]);

  // Handle saving to gallery (Native Web Share on Mobile) or direct download
  const handleSaveOrShare = async () => {
    if (!imageUrl || isSaving) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `gophotobooth-${dateStr}.png`;

    setIsSaving(true);
    try {
      await saveOrSharePhoto({ dataUrl: imageUrl, filename });
    } catch (e) {
      console.warn('Gagal menyimpan foto:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle direct file download (.PNG)
  const handleForceDownload = async () => {
    if (!imageUrl || isSaving) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `gophotobooth-${dateStr}.png`;

    setIsSaving(true);
    try {
      await saveOrSharePhoto({ dataUrl: imageUrl, filename, forceDownload: true });
    } catch (e) {
      console.warn('Gagal mengunduh file foto:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle copying image to clipboard
  const handleCopyImage = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard copy not supported or failed:', e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in py-2 sm:py-4">
      
      {/* Header Info */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold">
          <Printer className="w-3.5 h-3.5 text-stone-700" />
          <span>Mesin Cetak Photobooth Studio</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 tracking-tight">
          {isPrinted ? 'Hasil Cetak Fotomu Telah Siap!' : 'Sedang Mencetak Strip Foto...'}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 font-serif italic max-w-md mx-auto">
          {isPrinted
            ? 'Foto berkualitas tinggi telah berhasil diproses dan diunduh ke perangkatmu.'
            : 'Mohon tunggu sejenak, mesin photobooth sedang mengeluarkan foto dari dispenser.'}
        </p>
      </div>

      {/* Photobooth Machine Dispenser & Emerging Photo Strip */}
      <div className="flex flex-col items-center justify-center">
        
        {/* Dispenser Unit Container */}
        <div className="w-full max-w-[420px] bg-[#EFEAE2] border-2 border-stone-300 rounded-3xl p-5 shadow-lg relative z-20">
          
          {/* Top Machine Plate Header */}
          <div className="flex items-center justify-between border-b border-stone-300/80 pb-3 mb-4 text-xs">
            <div className="flex items-center gap-2 font-mono font-bold text-stone-700 uppercase tracking-widest text-[10px]">
              <span className="w-2.5 h-2.5 rounded-full bg-stone-500 animate-pulse inline-block" style={{ display: isPrinted ? 'none' : 'inline-block' }} />
              <span className="w-2.5 h-2.5 rounded-full bg-stone-900 inline-block" style={{ display: isPrinted ? 'inline-block' : 'none' }} />
              <span>PHOTO DISPENSER 35MM</span>
            </div>

            {/* Progress Badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
              isPrinted
                ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                : 'bg-stone-100 text-stone-700 border-stone-300'
            }`}>
              {isPrinted ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-stone-200" />
                  <span>Cetak Selesai 100%</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-stone-600 animate-spin" />
                  <span>Memproses {printProgress}%</span>
                </>
              )}
            </span>
          </div>

          {/* Machine Paper Slot Bezel */}
          <div className="relative w-full h-8 bg-stone-900 rounded-xl border border-stone-800 shadow-[inset_0_5px_10px_rgba(0,0,0,0.85)] flex items-center justify-center overflow-hidden">
            {/* Slot Roller Chrome Highlight Line */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-stone-500/40 to-transparent" />
            <span className="absolute text-[8px] font-mono tracking-widest text-stone-500/60 uppercase pointer-events-none">
              SLOT DISPENSER CETAK FOTO
            </span>
          </div>

          {/* Machine Roller Sound Waves / Status Line */}
          {!isPrinted && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-stone-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[10px] tracking-wide ml-1 text-stone-600">Mekanisme pemutar kertas sedang berjalan...</span>
            </div>
          )}

        </div>

        {/* The Emerging Photo Strip (Emerges downward from behind the dispenser slot) */}
        <div className="relative w-full max-w-[420px] -mt-4 overflow-hidden pt-4 pb-4 flex justify-center z-10">
          
          {/* Animated Wrapper: slides down with smooth ease-out curve without conflicting CSS transition */}
          <div
            className="flex justify-center w-full"
            style={{
              transform: `translateY(${translateY}%)`,
              opacity: printProgress > 4 ? 1 : 0.2,
              willChange: 'transform',
            }}
          >
            {imageUrl ? (
              <div className="relative group flex justify-center">
                <img
                  src={imageUrl}
                  alt="Hasil Cetak Photobooth"
                  className="rounded-2xl max-h-[62vh] sm:max-h-[68vh] w-auto object-contain transition-shadow duration-700"
                  style={{
                    boxShadow: isPrinted
                      ? '0 25px 60px -15px rgba(28, 25, 23, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.08)'
                      : '0 10px 25px -5px rgba(28, 25, 23, 0.25)',
                  }}
                />

                {/* Subtle paper gloss highlight sheen */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
              </div>
            ) : (
              <div className="w-64 h-96 bg-stone-200 rounded-2xl animate-pulse" />
            )}
          </div>

        </div>

        {/* Hint Khusus HP: Diletakkan terpisah di bawah foto agar tidak merusak flex layout */}
        <div
          className={`transition-all duration-700 ease-out mt-1 max-w-sm px-4 py-2 rounded-2xl bg-stone-100/90 border border-stone-200/90 text-[11px] text-stone-600 flex items-center justify-center gap-2 shadow-2xs text-center ${
            isPrinted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-stone-700 flex-shrink-0" />
          <span>Pengguna HP: Anda juga bisa tekan &amp; tahan foto di atas, lalu pilih <strong>Simpan Gambar</strong> ke galeri.</span>
        </div>

      </div>

      {/* Action Buttons Section */}
      <div className="w-full max-w-md mx-auto space-y-4 pt-2">
        
        {/* 1. BUTTON UNIK & MENARIK: Retro Studio Token / Stamp Ticket Button */}
        <div className="relative group">
          {/* Subtle soft stone halo matching the cream background */}
          <div className="absolute -inset-0.5 bg-stone-300/40 rounded-3xl blur-sm opacity-50 group-hover:opacity-80 transition duration-300" />
          
          <button
            onClick={onStartNewSession}
            type="button"
            className="relative w-full bg-stone-900 hover:bg-stone-800 text-white rounded-2xl p-4 sm:p-5 shadow-[0_6px_0_#1c1917] hover:shadow-[0_2px_0_#1c1917] hover:translate-y-1 active:translate-y-1.5 active:shadow-none transition-all duration-150 border border-stone-700/80 flex items-center justify-between cursor-pointer overflow-hidden group"
          >
            {/* Shimmer sweep effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

            {/* Left: Token Icon with stone ring */}
            <div className="w-12 h-12 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-100 flex-shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform shadow-inner">
              <Camera className="w-6 h-6 text-stone-200" />
            </div>

            {/* Center: Typography */}
            <div className="flex-1 px-4 text-left">
              <div className="flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-stone-400" />
                <span className="text-[10px] font-mono tracking-widest uppercase text-stone-400 font-bold">
                  SESI PHOTOBOOTH BARU
                </span>
              </div>
              <p className="text-base sm:text-lg font-serif font-bold text-white tracking-tight leading-tight">
                Mulai Foto Sesi Baru
              </p>
              <p className="text-[11px] text-stone-400 font-serif italic">
                Masukkan koin studio &amp; ambil pose terbaikmu kembali
              </p>
            </div>

            {/* Right: Circular Action Arrow */}
            <div className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700/80 flex items-center justify-center text-stone-300 group-hover:bg-white group-hover:text-stone-900 transition-colors flex-shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* 2. Secondary Utility Actions: Simpan ke Galeri / Unduh / Salin Gambar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleSaveOrShare}
            type="button"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow active:scale-95 transition cursor-pointer disabled:opacity-75"
          >
            <Share2 className={`w-4 h-4 text-stone-200 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Memproses...' : (isMobile ? 'Simpan ke Galeri / Bagikan' : 'Simpan / Bagikan Foto')}</span>
          </button>

          <button
            onClick={handleForceDownload}
            type="button"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-xs sm:text-sm font-semibold border border-stone-300 shadow-2xs hover:border-stone-400 active:scale-95 transition cursor-pointer disabled:opacity-75"
          >
            <Download className="w-4 h-4 text-stone-600" />
            <span>Unduh File (.PNG)</span>
          </button>
        </div>

        {/* Salin Gambar ke Clipboard */}
        <div className="flex justify-center pt-1">
          <button
            onClick={handleCopyImage}
            type="button"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-semibold transition cursor-pointer py-1.5 px-3 rounded-lg hover:bg-stone-200/50"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Foto Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Salin Gambar ke Clipboard</span>
              </>
            )}
          </button>
        </div>

        {/* 3. Kembali ke Pengaturan Editor */}
        <div className="text-center pt-2">
          <button
            onClick={onBackToEditor}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 font-semibold underline underline-offset-4 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Studio Edit (Ubah Filter / Background)</span>
          </button>
        </div>

      </div>

    </div>
  );
}
