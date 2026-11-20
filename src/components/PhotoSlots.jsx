import React from 'react';
import { RotateCcw, Check, Images, Camera, X } from 'lucide-react';

export default function PhotoSlots({
  photos,
  photoCount,
  currentRetakeIndex,
  onRetakeSlot,
  isSessionRunning,
}) {
  const filledCount = photos.filter(Boolean).length;
  const hasAnyPhoto = filledCount > 0;
  const isRetakeMode = currentRetakeIndex !== null;

  const getGridColsClass = () => {
    if (photoCount === 1) return 'grid-cols-1 max-w-[220px] mx-auto';
    if (photoCount === 2) return 'grid-cols-2';
    if (photoCount === 3) return 'grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-4';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
          <Images className="w-3.5 h-3.5 text-stone-700" />
          <span>Slot Foto ({filledCount} / {photoCount})</span>
        </label>
        <span className="text-[11px] text-stone-500 font-medium">
          {hasAnyPhoto || isRetakeMode
            ? 'Ketuk foto untuk foto ulang'
            : `Urutan foto #1 sampai #${photoCount}`}
        </span>
      </div>

      <div className={`grid ${getGridColsClass()} gap-2.5`}>
        {Array.from({ length: photoCount }).map((_, index) => {
          const photo = photos[index];
          const isSelectedTarget = currentRetakeIndex === index;

          // 1. Jika slot memiliki foto dan BUKAN target yang sedang difoto ulang:
          // Selalu tampilkan fotonya secara utuh (tidak boleh menghilang saat sesi foto berjalan)
          if (photo && !isSelectedTarget) {
            return (
              <button
                key={index}
                type="button"
                disabled={isSessionRunning}
                onClick={() => onRetakeSlot(index)}
                className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-stone-800 bg-stone-900 transition-all flex items-center justify-center text-left select-none ${
                  isSessionRunning
                    ? 'cursor-not-allowed opacity-90'
                    : 'shadow-xs hover:border-amber-600 cursor-pointer active:scale-[0.98]'
                }`}
              >
                <img
                  src={photo.dataUrl}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
                
                {/* Badge Nomor Slot */}
                <div className="absolute top-1.5 left-1.5 bg-stone-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-stone-700 shadow-2xs pointer-events-none">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                  <span>#{index + 1}</span>
                </div>

                {/* Tombol Ulangi: Muncul saat standby, dinonaktifkan saat kamera sedang menjepret */}
                {!isSessionRunning && (
                  <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-stone-950/80 via-stone-900/40 to-transparent flex items-center justify-center pointer-events-none">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/95 text-stone-900 text-[10px] font-bold shadow-xs">
                      <RotateCcw className="w-3 h-3 text-stone-800" />
                      <span>Ulangi</span>
                    </div>
                  </div>
                )}
              </button>
            );
          }

          // 2. Jika slot ini merupakan target yang sedang difoto / difoto ulang
          if (isSelectedTarget) {
            return (
              <div
                key={index}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-amber-500 ring-2 ring-amber-400/50 bg-amber-50/90 shadow-md flex items-center justify-center text-center select-none p-1.5"
              >
                {/* Latar belakang foto lama semi-transparan jika ada */}
                {photo && (
                  <img
                    src={photo.dataUrl}
                    alt={`Foto ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
                  />
                )}

                {/* Badge Nomor Slot di Kiri Atas */}
                <div className="absolute top-1.5 left-1.5 z-10 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs pointer-events-none">
                  <Camera className="w-2.5 h-2.5 animate-pulse" />
                  <span>#{index + 1}</span>
                </div>

                {/* Tombol Batal di Kanan Atas */}
                {!isSessionRunning && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetakeSlot(null);
                    }}
                    className="absolute top-1.5 right-1.5 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-stone-200/90 hover:bg-stone-300 active:scale-95 text-stone-700 text-[9px] font-bold transition cursor-pointer shadow-2xs pointer-events-auto"
                    title="Batalkan foto ulang"
                  >
                    <X className="w-2.5 h-2.5" />
                    <span>Batal</span>
                  </button>
                )}

                {/* Konten Utama di Tengah yang Pas dan Ringkas */}
                <div className="relative z-0 flex flex-col items-center justify-center text-center px-1 pointer-events-none mt-2">
                  <span className="text-[11px] sm:text-xs font-bold text-amber-900 leading-tight">
                    {isSessionRunning ? 'Memfoto...' : 'Siap Diulang'}
                  </span>
                  <span className="text-[9px] font-medium text-amber-700/90 leading-tight mt-0.5">
                    {isSessionRunning ? 'Tahan pose' : 'Klik kamera atas'}
                  </span>
                </div>
              </div>
            );
          }

          // 3. Slot kosong (belum difoto): Selalu berstatus pasif dan tidak dapat diakses untuk foto ulang
          return (
            <div
              key={index}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-dashed border-stone-300 bg-stone-50/70 flex items-center justify-center text-center select-none cursor-default"
            >
              <div className="flex flex-col items-center justify-center text-center p-2 w-full h-full pointer-events-none">
                <span className="text-xs font-bold text-stone-400">
                  #{index + 1}
                </span>
                <span className="text-[10px] text-stone-400 mt-0.5 font-medium">
                  Kosong
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
