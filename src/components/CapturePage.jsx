import React from 'react';
import CameraView from './CameraView';
import CameraControls from './CameraControls';
import PhotoSlots from './PhotoSlots';
import { ArrowRight, ArrowLeft, CheckCircle2, Zap, Sparkles } from 'lucide-react';

export default function CapturePage({
  // Camera state & actions
  camera,
  audio,
  // Configurations
  timerSeconds,
  setTimerSeconds,
  // Session & Photos
  currentLayout,
  photos,
  isSessionRunning,
  sessionProgress,
  countdown,
  isFlashing,
  currentRetakeIndex,
  allSlotsFilled,
  onStartSession,
  onRetakeSlot,
  onGoToEditor,
  onBackToGrid,
  onBackToHome,
}) {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      
      {/* Top Navigation Bar: Back to Grid / Home & Step Info */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToGrid}
            disabled={isSessionRunning}
            className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-stone-500" />
            <span>Ganti Format Grid</span>
          </button>

          <button
            onClick={onBackToHome}
            disabled={isSessionRunning}
            className="min-h-[44px] hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <span>Beranda</span>
          </button>
        </div>

        <span className="text-xs font-serif italic text-stone-500">
          Langkah 2: Pengambilan Foto ({currentLayout.name})
        </span>
      </div>

      {/* Main Studio Grid: Compact 2-Column on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Kolom Kiri: Layar Kamera Kompak & Kontrol Kamera */}
        <div id="camera-view-container" className="lg:col-span-7 flex flex-col items-center space-y-3.5 scroll-mt-20">
          {/* Sized compact camera container so it doesn't take too much space */}
          <div className="w-full max-w-[450px]">
            <CameraView
              videoRef={camera.videoRef}
              setVideoRef={camera.setVideoRef}
              isMirror={camera.isMirror}
              countdown={countdown}
              isFlashing={isFlashing}
              sessionProgress={sessionProgress}
              permissionStatus={camera.permissionStatus}
              errorMessage={camera.errorMessage}
              onRetryCamera={camera.startCamera}
            />
          </div>

          {/* Quick Camera Bar (Timer, Mirror, Switch Cam, Audio, Tombol Mulai) */}
          <div className="w-full max-w-[450px]">
            <CameraControls
              timerSeconds={timerSeconds}
              setTimerSeconds={setTimerSeconds}
              isMirror={camera.isMirror}
              onToggleMirror={camera.toggleMirror}
              onSwitchCamera={camera.toggleFacingMode}
              hasMultipleCameras={camera.hasMultipleCameras}
              isMuted={audio.isMuted}
              onToggleMute={audio.toggleMute}
              onStartSession={onStartSession}
              isSessionRunning={isSessionRunning}
              photos={photos}
              photoCount={currentLayout.photoCount}
              allSlotsFilled={allSlotsFilled}
              currentRetakeIndex={currentRetakeIndex}
            />
          </div>

          {/* Note Flash (Desktop view: stays under controls) */}
          <div className="hidden lg:block w-full max-w-[450px] relative overflow-hidden bg-gradient-to-br from-[#FFFDF9] via-[#FAF6F0] to-[#F3ECE0] border border-[#E7DFD3] rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                <Zap className="w-4 h-4 text-stone-200 fill-stone-200" />
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 bg-stone-200/70 px-2 py-0.5 rounded-md border border-stone-300/80">
                      Tips Studio Flash
                    </span>
                    <span className="text-[10px] text-stone-500 font-serif italic hidden sm:inline">
                      Pencahayaan Wajah
                    </span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                </div>

                <p className="text-xs sm:text-[13px] font-serif font-bold text-stone-900 leading-snug">
                  Ingin Hasil Foto Lebih Tajam &amp; Berkarakter?
                </p>

                <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed font-sans">
                  Gunakan lampu <span className="font-semibold text-stone-900">flash kamera</span> atau arahkan <span className="font-semibold text-stone-900">senter / flash HP tepat ke arah wajah</span>. Cahaya flash langsung menciptakan efek kontras dramatis, binar mata (*catchlight*), serta hasil filter vintage yang jauh lebih hidup!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Hasil Slot Foto & Aksi Lanjut */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Slot Foto & Tombol Retake per Slot */}
          <div className="bg-white border border-[#E7E2DA] rounded-2xl p-4 shadow-sm space-y-3">
            <PhotoSlots
              photos={photos}
              photoCount={currentLayout.photoCount}
              currentRetakeIndex={currentRetakeIndex}
              onRetakeSlot={onRetakeSlot}
              isSessionRunning={isSessionRunning}
            />

            {/* Tombol Lanjut ke Edit Foto ketika semua slot sudah terisi */}
            {allSlotsFilled && !isSessionRunning && (
              <div className="pt-2 space-y-2 animate-slide-up">
                <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Semua foto siap! Periksa atau tekan tombol di bawah untuk mengedit.</span>
                </div>
                
                <button
                  onClick={onGoToEditor}
                  className="w-full min-h-[50px] bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold py-3.5 px-5 rounded-2xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base transition cursor-pointer"
                >
                  <span>Lanjut Kustomisasi</span>
                  <ArrowRight className="w-4 h-4 text-stone-300" />
                </button>
              </div>
            )}
          </div>

          {/* Note Flash (Mobile view: placed below PhotoSlots so it doesn't push slots down) */}
          <div className="block lg:hidden w-full relative overflow-hidden bg-gradient-to-br from-[#FFFDF9] via-[#FAF6F0] to-[#F3ECE0] border border-[#E7DFD3] rounded-2xl p-3.5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                <Zap className="w-4 h-4 text-stone-200 fill-stone-200" />
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-600 bg-stone-200/70 px-2 py-0.5 rounded-md border border-stone-300/80">
                    Tips Studio Flash
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                </div>

                <p className="text-xs font-serif font-bold text-stone-900 leading-snug">
                  Hasil Foto Lebih Tajam dengan Flash
                </p>

                <p className="text-[11px] text-stone-600 leading-relaxed font-sans">
                  Arahkan flash kamera atau senter HP langsung ke wajah untuk efek kontras dramatis dan binar mata ala photobooth retro.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Floating Bottom Bar on Mobile when All Slots Filled */}
      {allSlotsFilled && !isSessionRunning && (
        <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 animate-slide-up">
          <button
            onClick={onGoToEditor}
            className="w-full min-h-[54px] bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-6 rounded-2xl shadow-2xl flex items-center justify-between text-sm sm:text-base active:scale-95 transition border border-stone-700/80 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Foto Lengkap! Lanjut Edit</span>
            </div>
            <ArrowRight className="w-5 h-5 text-stone-300" />
          </button>
        </div>
      )}

    </div>
  );
}
