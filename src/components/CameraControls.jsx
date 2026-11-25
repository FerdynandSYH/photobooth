import React from 'react';
import { Camera, FlipHorizontal, SwitchCamera, Timer, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export default function CameraControls({
  timerSeconds,
  setTimerSeconds,
  isMirror,
  onToggleMirror,
  onSwitchCamera,
  hasMultipleCameras,
  isMuted,
  onToggleMute,
  onStartSession,
  onRetakeSlot,
  isSessionRunning,
  photos,
  photoCount,
  allSlotsFilled,
  currentRetakeIndex = null,
}) {
  const timerOptions = [
    { value: 0, label: 'Off' },
    { value: 3, label: '3s' },
    { value: 5, label: '5s' },
    { value: 10, label: '10s' },
  ];

  const filledCount = photos ? photos.filter(Boolean).length : 0;
  const isRetakingSingle = currentRetakeIndex !== null;
  const nextSlotNumber = currentRetakeIndex !== null ? currentRetakeIndex + 1 : Math.min(filledCount + 1, photoCount);

  // Helper untuk menentukan visual hierarchy tombol aksi utama
  const getActionButtonClass = () => {
    if (isSessionRunning) {
      return 'bg-stone-200 text-stone-400 border border-stone-200 cursor-not-allowed shadow-none';
    }
    if (isRetakingSingle) {
      return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 ring-2 ring-amber-400/50 cursor-pointer active:scale-[0.98]';
    }
    if (allSlotsFilled) {
      // Secondary/Subtle: Mengurangi risiko salah pencet & tidak menyaingi Primary CTA "Lanjut Kustomisasi"
      return 'bg-white hover:bg-stone-50 border border-stone-300 hover:border-stone-400 text-stone-700 hover:text-stone-900 shadow-2xs cursor-pointer active:scale-[0.98]';
    }
    // Default Primary: Pengambilan foto sesi normal
    return 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-900/10 cursor-pointer active:scale-[0.98]';
  };

  return (
    <div className="w-full bg-white border border-[#E7E2DA] rounded-2xl p-3 sm:p-4 shadow-sm space-y-3.5">
      
      {/* Top Utility Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
        
        {/* Timer Selection */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200">
          <div className="text-stone-500 pl-2 pr-1 flex items-center justify-center">
            <Timer className="w-4 h-4" />
          </div>
          {timerOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              disabled={isSessionRunning}
              onClick={() => setTimerSeconds(opt.value)}
              className={`min-h-[42px] min-w-[38px] px-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center ${
                timerSeconds === opt.value
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200 active:scale-95'
              } ${isSessionRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Action Toggles: Mirror, Switch Cam, Audio */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Mirror toggle */}
          <button
            type="button"
            onClick={onToggleMirror}
            title={isMirror ? 'Mirror: Aktif' : 'Mirror: Nonaktif'}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-2xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              isMirror
                ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                : 'bg-stone-100 border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
            }`}
          >
            <FlipHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px] font-semibold">Mirror</span>
          </button>

          {/* Switch Camera (mobile/multiple devices) */}
          <button
            type="button"
            onClick={onSwitchCamera}
            disabled={isSessionRunning}
            title="Ganti Kamera Depan/Belakang"
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-2xl text-xs font-semibold bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-200 transition disabled:opacity-50 cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <SwitchCamera className="w-4 h-4" />
          </button>

          {/* Audio Mute / Unmute */}
          <button
            type="button"
            onClick={onToggleMute}
            title={isMuted ? 'Suara Dinonaktifkan (Klik untuk aktifkan)' : 'Suara Aktif (Klik untuk nonaktifkan)'}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-2xl text-xs font-semibold border transition cursor-pointer active:scale-95 flex items-center justify-center ${
              isMuted
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                : 'bg-stone-100 border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-200'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-600" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Snap / Start Action Button */}
      <div>
        <button
          type="button"
          onClick={() => {
            if (allSlotsFilled && !isRetakingSingle) {
              if (onRetakeSlot) {
                onRetakeSlot(0);
              }
              return;
            }
            onStartSession();
          }}
          disabled={isSessionRunning}
          className={`w-full min-h-[52px] sm:min-h-[56px] py-3.5 px-6 rounded-2xl font-bold transition flex items-center justify-center gap-2.5 text-sm sm:text-base ${getActionButtonClass()}`}
        >
          {isSessionRunning ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin"></span>
              <span>
                {timerSeconds === 0
                  ? `Menjepret Slot #${nextSlotNumber}...`
                  : `Hitung Mundur Slot #${nextSlotNumber}...`}
              </span>
            </span>
          ) : isRetakingSingle ? (
            <>
              <Camera className="w-5 h-5 text-white" />
              <span>Ambil Ulang Foto (Slot #{nextSlotNumber})</span>
              <span className="bg-amber-700 text-amber-100 text-xs px-2.5 py-1 rounded-full font-semibold">
                Ulang #{nextSlotNumber}
              </span>
            </>
          ) : allSlotsFilled ? (
            <>
              <RotateCcw className="w-4 h-4 text-stone-700" />
              <span className="font-bold text-stone-800">Pilih Slot Foto yang Ingin Diulang</span>
              <span className="bg-stone-200 text-stone-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-stone-300">
                Pilih Slot
              </span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 text-stone-200" />
              <span>Ambil Foto (Slot #${nextSlotNumber} dari ${photoCount})</span>
              <span className="bg-stone-800 text-stone-200 text-xs px-2.5 py-1 rounded-full font-semibold border border-stone-700">
                {timerSeconds > 0
                  ? `${timerSeconds}s • Slot ${filledCount}/${photoCount}`
                  : `Slot ${filledCount}/${photoCount}`}
              </span>
            </>
          )}
        </button>

        {/* Petunjuk Mode Timer / Manual / Retake */}
        <p className="mt-2 text-center text-[11px] text-stone-500 font-sans">
          {isRetakingSingle
            ? `Slot #${nextSlotNumber} siap difoto ulang. Silakan bersiap pose dan klik tombol kamera di atas saat Anda sudah siap.`
            : allSlotsFilled
            ? 'Semua slot sudah terisi. Klik foto di bawah untuk memilih slot yang ingin diulang, atau tekan tombol di atas untuk memilih slot #1.'
            : timerSeconds === 0
            ? 'Mode Tanpa Timer: Menjepret 1 foto langsung tiap kali tombol ditekan.'
            : `Mode Timer ${timerSeconds}s: Hitung mundur dimulai tiap kali tombol ditekan. Setelah 1 foto selesai, kamera menunggu Anda siap sebelum foto berikutnya.`}
        </p>
      </div>

    </div>
  );
}
