import React from 'react';
import { RotateCcw, Check, Images } from 'lucide-react';

export default function PhotoSlots({
  photos,
  photoCount,
  currentRetakeIndex,
  onRetakeSlot,
  isSessionRunning,
}) {
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
          <span>Slot Foto ({photos.filter(Boolean).length} / {photoCount})</span>
        </label>
        <span className="text-[11px] text-stone-500 font-medium">Klik tombol untuk foto ulang slot</span>
      </div>

      <div className={`grid ${getGridColsClass()} gap-2.5`}>
        {Array.from({ length: photoCount }).map((_, index) => {
          const photo = photos[index];
          const isRetaking = currentRetakeIndex === index;

          return (
            <div
              key={index}
              className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all flex items-center justify-center bg-stone-100 group ${
                isRetaking
                  ? 'border-stone-900 ring-2 ring-stone-900/40 animate-pulse'
                  : photo
                  ? 'border-stone-800 shadow-sm'
                  : 'border-dashed border-stone-300 text-stone-400'
              }`}
            >
              {photo ? (
                <>
                  <img
                    src={photo.dataUrl}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Badge Done */}
                  <div className="absolute top-1.5 left-1.5 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-stone-700">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    <span>#{index + 1}</span>
                  </div>

                  {/* Overlay Retake Button */}
                  <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                    <button
                      disabled={isSessionRunning}
                      onClick={() => onRetakeSlot(index)}
                      className="bg-white hover:bg-stone-100 text-stone-900 p-2 rounded-xl text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      title="Foto Ulang Slot Ini"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-stone-800" />
                      <span className="text-[11px]">Ulangi</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-2">
                  <span className="text-xs font-bold text-stone-500">#{index + 1}</span>
                  <span className="text-[10px] text-stone-400 mt-0.5 font-medium">Kosong</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
