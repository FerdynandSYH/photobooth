import React from 'react';
import { LAYOUTS } from '../constants/layouts';
import { Grid2X2, LayoutGrid, Square } from 'lucide-react';

export default function LayoutSelector({
  selectedLayoutId,
  onSelectLayout,
  isSessionRunning,
}) {
  const getLayoutIcon = (id) => {
    switch (id) {
      case 'single':
        return <Square className="w-4 h-4" />;
      case 'strip-3':
        return (
          <div className="flex flex-col gap-0.5 w-3.5 h-4 justify-between">
            <div className="h-1 bg-current rounded-xs"></div>
            <div className="h-1 bg-current rounded-xs"></div>
            <div className="h-1 bg-current rounded-xs"></div>
          </div>
        );
      case 'strip-4':
        return (
          <div className="flex flex-col gap-0.5 w-3.5 h-4 justify-between">
            <div className="bg-current rounded-xs" style={{ height: '2.5px' }}></div>
            <div className="bg-current rounded-xs" style={{ height: '2.5px' }}></div>
            <div className="bg-current rounded-xs" style={{ height: '2.5px' }}></div>
            <div className="bg-current rounded-xs" style={{ height: '2.5px' }}></div>
          </div>
        );
      case 'side-2':
        return (
          <div className="flex flex-row gap-1 w-4 h-3.5 justify-between">
            <div className="h-full bg-current rounded-xs" style={{ width: '6.5px' }}></div>
            <div className="h-full bg-current rounded-xs" style={{ width: '6.5px' }}></div>
          </div>
        );
      case 'side-3':
        return (
          <div className="flex flex-row gap-0.5 w-4 h-3.5 justify-between">
            <div className="h-full bg-current rounded-xs" style={{ width: '4.5px' }}></div>
            <div className="h-full bg-current rounded-xs" style={{ width: '4.5px' }}></div>
            <div className="h-full bg-current rounded-xs" style={{ width: '4.5px' }}></div>
          </div>
        );
      case 'grid-2x2':
        return <Grid2X2 className="w-4 h-4" />;
      default:
        return <LayoutGrid className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Pemilihan Tata Letak (Grid & Strip) */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-stone-700" />
          <span>Pilih Tata Letak (Grid)</span>
        </label>
        <span className="text-xs text-stone-700 font-semibold">
          {LAYOUTS[selectedLayoutId]?.name}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {Object.values(LAYOUTS).map((layout) => {
          const isSelected = selectedLayoutId === layout.id;
          return (
            <button
              key={layout.id}
              disabled={isSessionRunning}
              onClick={() => onSelectLayout(layout.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 border-stone-900 text-white shadow-sm ring-1 ring-stone-900/30'
                  : 'bg-stone-50/80 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
              } ${isSessionRunning ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <div
                className={`mb-2 p-2 rounded-xl transition ${
                  isSelected ? 'bg-stone-800 text-white' : 'bg-stone-200/80 text-stone-700'
                }`}
              >
                {getLayoutIcon(layout.id)}
              </div>
              <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                {layout.name}
              </span>
              <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                {layout.photoCount} Foto
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
