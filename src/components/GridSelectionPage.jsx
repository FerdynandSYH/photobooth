import React from 'react';
import { LAYOUTS } from '../constants/layouts';
import { LayoutGrid, Camera, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Layers } from 'lucide-react';

export default function GridSelectionPage({
  selectedLayoutId,
  onSelectLayout,
  onConfirmGrid,
  onBackToHome,
}) {
  const currentLayout = LAYOUTS[selectedLayoutId] || LAYOUTS['strip-3'];

  // Mini Visual Representation of each layout frame with explicit pixel dimensions
  const renderLayoutVisual = (layout) => {
    const isSelected = selectedLayoutId === layout.id;
    const cardBg = isSelected ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200';
    const slotBg = isSelected ? 'bg-stone-700' : 'bg-stone-200';
    const barBg = isSelected ? 'bg-stone-700' : 'bg-stone-300';

    switch (layout.id) {
      case 'strip-3':
        return (
          <div
            className={`rounded-xl border-2 p-2 flex flex-col justify-between shadow-xs transition-all ${cardBg}`}
            style={{ width: '56px', height: '112px' }}
          >
            <div className="flex flex-col gap-1.5 flex-1 justify-center">
              <div className={`w-full rounded-sm transition-colors ${slotBg}`} style={{ height: '24px' }} />
              <div className={`w-full rounded-sm transition-colors ${slotBg}`} style={{ height: '24px' }} />
              <div className={`w-full rounded-sm transition-colors ${slotBg}`} style={{ height: '24px' }} />
            </div>
            <div className={`w-7 h-1 mx-auto rounded-full mt-1.5 ${barBg}`} />
          </div>
        );
      case 'strip-4':
        return (
          <div
            className={`rounded-xl border-2 p-1.5 flex flex-col justify-between shadow-xs transition-all ${cardBg}`}
            style={{ width: '56px', height: '116px' }}
          >
            <div className="flex flex-col gap-1 flex-1 justify-center">
              <div className={`w-full rounded-sm transition-colors ${slotBg}`} style={{ height: '19px' }} />
              <div className={`w-full rounded-sm transition-colors ${slotBg}`} style={{ height: '19px' }} />
              <div className={`w-full rounded-sm transition-colors ${slotBg}`} style={{ height: '19px' }} />
              <div className={`w-full rounded-sm transition-colors ${slotBg}`} style={{ height: '19px' }} />
            </div>
            <div className={`w-7 h-1 mx-auto rounded-full mt-1 ${barBg}`} />
          </div>
        );
      case 'side-2':
        return (
          <div
            className={`rounded-xl border-2 p-2 flex flex-col justify-between shadow-xs transition-all ${cardBg}`}
            style={{ width: '110px', height: '72px' }}
          >
            <div className="flex gap-1.5 flex-1 items-center justify-center">
              <div className={`flex-1 rounded-sm transition-colors ${slotBg}`} style={{ height: '44px' }} />
              <div className={`flex-1 rounded-sm transition-colors ${slotBg}`} style={{ height: '44px' }} />
            </div>
            <div className={`w-12 h-1 mx-auto rounded-full mt-1.5 ${barBg}`} />
          </div>
        );
      case 'side-3':
        return (
          <div
            className={`rounded-xl border-2 p-2 flex flex-col justify-between shadow-xs transition-all ${cardBg}`}
            style={{ width: '136px', height: '68px' }}
          >
            <div className="flex gap-1.5 flex-1 items-center justify-center">
              <div className={`flex-1 rounded-sm transition-colors ${slotBg}`} style={{ height: '38px' }} />
              <div className={`flex-1 rounded-sm transition-colors ${slotBg}`} style={{ height: '38px' }} />
              <div className={`flex-1 rounded-sm transition-colors ${slotBg}`} style={{ height: '38px' }} />
            </div>
            <div className={`w-14 h-1 mx-auto rounded-full mt-1.5 ${barBg}`} />
          </div>
        );
      case 'grid-2x2':
        return (
          <div
            className={`rounded-xl border-2 p-2 flex flex-col justify-between shadow-xs transition-all ${cardBg}`}
            style={{ width: '92px', height: '94px' }}
          >
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              <div className={`rounded-sm transition-colors ${slotBg}`} style={{ height: '32px' }} />
              <div className={`rounded-sm transition-colors ${slotBg}`} style={{ height: '32px' }} />
              <div className={`rounded-sm transition-colors ${slotBg}`} style={{ height: '32px' }} />
              <div className={`rounded-sm transition-colors ${slotBg}`} style={{ height: '32px' }} />
            </div>
            <div className={`w-10 h-1 mx-auto rounded-full mt-1.5 ${barBg}`} />
          </div>
        );
      case 'single':
        return (
          <div
            className={`rounded-xl border-2 p-2 flex flex-col justify-between shadow-xs transition-all ${cardBg}`}
            style={{ width: '84px', height: '98px' }}
          >
            <div className="flex-1 flex items-center justify-center">
              <div className={`w-full rounded-sm transition-colors ${slotBg}`} style={{ height: '62px' }} />
            </div>
            <div className={`w-10 h-1 mx-auto rounded-full mt-1.5 ${barBg}`} />
          </div>
        );
      default:
        return (
          <div className={`w-16 h-20 rounded-lg border-2 p-1.5 flex items-center justify-center ${cardBg}`}>
            <LayoutGrid className="w-6 h-6 text-stone-400" />
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in py-2 sm:py-4">
      
      {/* Top Navigation & Header */}
      <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-4">
        <button
          onClick={onBackToHome}
          type="button"
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 transition active:scale-95 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-stone-600" />
          <span>Kembali ke Beranda</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200/70 border border-stone-300/80 text-[11px] font-semibold text-stone-700">
          <Layers className="w-3.5 h-3.5 text-stone-600" />
          <span>Langkah 1: Pilih Format Grid</span>
        </div>
      </div>

      {/* Main Title & Guidance Note */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight">
          Pilih Format Tata Letak (Grid)
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 font-serif italic max-w-lg mx-auto leading-relaxed">
          Pilih tata letak foto yang kamu inginkan. Setelah memilih format grid di bawah, kamera akan terbuka untuk memulai sesi pemotretan.
        </p>
      </div>

      {/* Grid Cards Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
        {Object.values(LAYOUTS).map((layout) => {
          const isSelected = selectedLayoutId === layout.id;

          return (
            <div
              key={layout.id}
              onClick={() => onSelectLayout(layout.id)}
              className={`relative rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer border ${
                isSelected
                  ? 'bg-white border-stone-900 shadow-md ring-2 ring-stone-900/90 scale-[1.02]'
                  : 'bg-white/80 border-[#E7E2DA] hover:bg-white hover:border-stone-300 shadow-2xs hover:shadow-sm'
              }`}
            >
              {/* Top Header Card: Badge & Check Icon */}
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                    : 'bg-stone-100 text-stone-700 border-stone-200'
                }`}>
                  {layout.photoCount} Foto
                </span>

                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-stone-900 text-white'
                    : 'border border-stone-300 bg-stone-50'
                }`}>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-stone-300" />
                  )}
                </div>
              </div>

              {/* Center: Visual Representation Diagram */}
              <div className="h-32 flex items-center justify-center my-1 select-none">
                {renderLayoutVisual(layout)}
              </div>

              {/* Bottom: Typography Info */}
              <div className="pt-3 border-t border-stone-100 space-y-1">
                <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 leading-snug">
                  {layout.name}
                </h3>
                <p className="text-xs text-stone-500 font-sans leading-relaxed">
                  {layout.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Action Button (Buka Kamera & Mulai Foto) */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-[#E7E2DA] rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="space-y-0.5 text-center sm:text-left">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Format Terpilih:
          </p>
          <p className="text-base sm:text-lg font-serif font-bold text-stone-900">
            {currentLayout.name} ({currentLayout.photoCount} Foto)
          </p>
        </div>

        <button
          onClick={() => onConfirmGrid(selectedLayoutId)}
          type="button"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
        >
          <Camera className="w-5 h-5 text-stone-200" />
          <span>Buka Kamera &amp; Mulai Foto</span>
          <ArrowRight className="w-4 h-4 text-stone-400" />
        </button>
      </div>

    </div>
  );
}
