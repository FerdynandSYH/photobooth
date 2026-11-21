import React from 'react';
import { FILTERS } from '../constants/filters';
import { Wand2, Sparkles } from 'lucide-react';

export default function FilterSelector({ selectedFilter, onSelectFilter }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-stone-700" />
          <span>Koleksi Filter Foto ({FILTERS.length})</span>
        </label>
        <span className="text-xs text-stone-800 font-semibold flex items-center gap-1">
          {selectedFilter.badge && (
            <span className="bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded text-[10px] font-medium border border-stone-300">
              {selectedFilter.badge}
            </span>
          )}
          <span>{selectedFilter.name}</span>
        </span>
      </div>

      {/* Filter Chips Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1">
        {FILTERS.map((f) => {
          const isSelected = selectedFilter.id === f.id;

          return (
            <button
              key={f.id}
              onClick={() => onSelectFilter(f)}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold border transition text-left cursor-pointer ${isSelected
                ? 'bg-stone-900 border-stone-900 text-white shadow-sm ring-1 ring-stone-900/40'
                : 'bg-stone-50/80 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                }`}
            >
              {/* 3-Tone Swatch Box */}
              <div
                className="w-5 h-5 rounded-lg flex-shrink-0 border border-stone-300 shadow-xs overflow-hidden flex flex-col"
                style={{ background: f.previewGradient }}
              >
                {f.swatchColors && (
                  <div className="w-full h-full flex">
                    <span className="w-1/3 h-full" style={{ backgroundColor: f.swatchColors[0] }} />
                    <span className="w-1/3 h-full" style={{ backgroundColor: f.swatchColors[1] }} />
                    <span className="w-1/3 h-full" style={{ backgroundColor: f.swatchColors[2] }} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`truncate font-bold text-[11px] leading-tight flex items-center gap-1 ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                  <span>{f.name}</span>
                </p>
                <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                  {f.badge || 'Filter'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Description of active filter */}
      <div className="flex items-start gap-2 text-[11px] text-stone-600 bg-stone-100/90 p-2.5 rounded-xl border border-stone-200">
        <Sparkles className="w-3.5 h-3.5 text-stone-500 flex-shrink-0 mt-0.5" />
        <p className="leading-snug">
          <span className="font-semibold text-stone-800">{selectedFilter.name}:</span> {selectedFilter.description}
        </p>
      </div>
    </div>
  );
}
