import React, { useRef, useEffect } from 'react';
import { Download, RefreshCw, Info } from 'lucide-react';
import { renderPhotoboothCanvas } from '../utils/canvasRenderer';

export default function CanvasResult({
  photos,
  layout,
  frame,
  filterConfig,
  footerText,
  showDate,
  stickers,
  allSlotsFilled,
  onResetSession,
  onCanvasClick,
}) {
  const canvasRef = useRef(null);

  // Trigger re-render whenever layout, frame, filter, photos, stickers, or text change
  useEffect(() => {
    if (!canvasRef.current) return;
    renderPhotoboothCanvas({
      photos,
      layout,
      frame,
      filterConfig,
      footerText,
      showDate,
      stickers,
      targetCanvas: canvasRef.current,
    });
  }, [photos, layout, frame, filterConfig, footerText, showDate, stickers]);

  const handleDownload = () => {
    if (!canvasRef.current || !allSlotsFilled) return;
    const canvas = canvasRef.current;

    // Generate filename e.g. gophotobooth-20261118.png
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `gophotobooth-${dateStr}.png`;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCanvasClickInternal = (e) => {
    if (!canvasRef.current || !onCanvasClick) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;
    onCanvasClick(clickX, clickY);
  };

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      
      {/* Canvas Display Container */}
      <div className="w-full flex justify-center bg-white border border-[#E7E2DA] rounded-2xl p-3 shadow-sm max-h-[500px] overflow-y-auto">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClickInternal}
          className="rounded-xl shadow-lg max-w-full h-auto cursor-crosshair transition transform hover:scale-[1.01]"
        />
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500">
        <Info className="w-3.5 h-3.5 text-stone-600" />
        <span>Pratinjau strip foto dengan resolusi tinggi.</span>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        <button
          onClick={handleDownload}
          disabled={!allSlotsFilled}
          className={`font-bold py-3 px-5 rounded-xl text-sm transition flex items-center justify-center gap-2 ${
            allSlotsFilled
              ? 'bg-stone-900 hover:bg-stone-800 active:scale-98 text-white shadow-md cursor-pointer'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
          }`}
          title={allSlotsFilled ? 'Unduh Foto' : 'Ambil semua foto terlebih dahulu'}
        >
          <Download className="w-4 h-4" />
          <span>{allSlotsFilled ? 'Download Foto (.PNG)' : 'Lengkapi Foto untuk Unduh'}</span>
        </button>

        <button
          onClick={onResetSession}
          className="bg-white hover:bg-stone-100 active:scale-98 text-stone-700 font-semibold py-3 px-5 rounded-xl text-sm transition flex items-center justify-center gap-2 border border-stone-300"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Mulai Sesi Baru</span>
        </button>
      </div>

    </div>
  );
}
