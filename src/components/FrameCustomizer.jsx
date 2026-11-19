import React from 'react';
import { FRAMES, STICKERS } from '../constants/frames';
import { Palette, Type, Calendar, Smile, Trash2 } from 'lucide-react';

export default function FrameCustomizer({
  selectedFrame,
  onSelectFrame,
  footerText,
  onChangeFooterText,
  showDate,
  onToggleShowDate,
  stickers,
  onAddSticker,
  onClearStickers,
}) {
  return (
    <div className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
      
      {/* 1. Pilih Warna / Motif Bingkai */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-rose-400" />
            <span>Warna & Motif Frame</span>
          </label>
          <span className="text-[11px] text-slate-500 font-medium">{selectedFrame.name}</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {FRAMES.map((f) => {
            const isSelected = selectedFrame.id === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onSelectFrame(f)}
                title={f.name}
                className={`group relative h-9 rounded-xl border transition-all flex items-center justify-center overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-rose-500 scale-105 border-transparent shadow-lg'
                    : 'border-slate-700/60 hover:scale-105'
                }`}
                style={{ background: f.cssBackground }}
              >
                {isSelected && (
                  <span className={`w-2 h-2 rounded-full shadow ${f.isDark ? 'bg-white' : 'bg-slate-900'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Kustomisasi Teks Footer Bingkai & Tanggal */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-rose-400" />
          <span>Teks Caption Bingkai</span>
        </label>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={footerText}
            onChange={(e) => onChangeFooterText(e.target.value)}
            placeholder="Contoh: OUR MEMORIES 2026"
            maxLength={35}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition"
          />

          {/* Toggle Date Button */}
          <button
            type="button"
            onClick={onToggleShowDate}
            title={showDate ? 'Tanggal: Tampil' : 'Tanggal: Sembunyi'}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
              showDate
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tanggal</span>
          </button>
        </div>
      </div>

      {/* 3. Stiker Dekoratif */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-rose-400" />
            <span>Tempel Stiker ({stickers.length})</span>
          </label>
          {stickers.length > 0 && (
            <button
              onClick={onClearStickers}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus Stiker</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800">
          {STICKERS.map((stk) => (
            <button
              key={stk.id}
              onClick={() => onAddSticker(stk.emoji)}
              className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-90 flex items-center justify-center text-lg transition border border-slate-800 hover:border-slate-700"
              title={`Tambah ${stk.label}`}
            >
              {stk.emoji}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 italic">
          Tip: Klik emoji di atas untuk menempelkan stiker di atas foto.
        </p>
      </div>

    </div>
  );
}

