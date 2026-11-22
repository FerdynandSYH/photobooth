import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useCamera } from './hooks/useCamera';
import { useAudio } from './hooks/useAudio';
import { LAYOUTS, DEFAULT_LAYOUT } from './constants/layouts';
import { FILTERS, DEFAULT_FILTER } from './constants/filters';
import { FRAMES, DEFAULT_FRAME } from './constants/frames';
import { BACKGROUNDS, DEFAULT_BACKGROUND, BACKGROUND_RATIOS, DEFAULT_BG_RATIO } from './constants/backgrounds';

import LandingPage from './components/LandingPage';
import GridSelectionPage from './components/GridSelectionPage';
import CapturePage from './components/CapturePage';
import EditorPage from './components/EditorPage';
import PrintingPage from './components/PrintingPage';
import { Camera, SlidersHorizontal, ArrowLeft, Home, Printer, LayoutGrid, AlertTriangle, X } from 'lucide-react';

export default function App() {
  // Navigation Flow: 'landing' -> 'grid' (Pilih Format Grid) -> 'capture' (Kamera) -> 'editor' (Kustomisasi) -> 'printing' (Cetak)
  const [currentStep, setCurrentStep] = useState('landing');

  // Confirmation Modal State (Pencegahan Kehilangan Progres)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    isDestructive: false,
    onConfirm: null,
  });

  // Pastikan setiap pergantian halaman selalu mulai dari posisi paling atas (khususnya tampilan mobile)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [currentStep]);

  // Camera & Audio Hooks
  const camera = useCamera();
  const audio = useAudio();

  // Konfigurasi
  const [selectedLayoutId, setSelectedLayoutId] = useState(DEFAULT_LAYOUT);
  const [selectedBgRatio, setSelectedBgRatio] = useState(DEFAULT_BG_RATIO);
  const [selectedFilter, setSelectedFilter] = useState(DEFAULT_FILTER);
  const [selectedFrame, setSelectedFrame] = useState(DEFAULT_FRAME);
  const [selectedBackground, setSelectedBackground] = useState(DEFAULT_BACKGROUND);
  const [footerText] = useState('GOPHOTOBOOTH STUDIO');
  const [fontSize, setFontSize] = useState(21);
  const [stripScale, setStripScale] = useState(72);
  const [stripPosition, setStripPosition] = useState({ x: 0, y: 0 });
  const [showDate, setShowDate] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(3);
  const [printedImageUrl, setPrintedImageUrl] = useState(null);

  // Skala/Ukuran per-strip untuk manipulasi langsung (membesar & mengecilkan)
  const [strip1Scale, setStrip1Scale] = useState(1);
  const [strip2Scale, setStrip2Scale] = useState(1);

  // Duplikasi Strip Foto (Maksimal 2 Foto Strip dengan Urutan Slot Acak & Efek Bayangan)
  const [isDuplicateEnabled, setIsDuplicateEnabled] = useState(false);
  const [strip2Photos, setStrip2Photos] = useState(null);
  const [stripRotation, setStripRotation] = useState(0);
  const [strip2Position, setStrip2Position] = useState({ x: 20, y: 8 });
  const [strip2Rotation, setStrip2Rotation] = useState(4);
  const [topStrip, setTopStrip] = useState('strip2');

  // State Foto & Sesi
  const currentLayout = useMemo(() => {
    return LAYOUTS[selectedLayoutId] || LAYOUTS['strip-3'];
  }, [selectedLayoutId]);

  const [photos, setPhotos] = useState(() => new Array(LAYOUTS['strip-3'].photoCount).fill(null));
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [currentRetakeIndex, setCurrentRetakeIndex] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [sessionProgress, setSessionProgress] = useState({ current: 0, total: 0, active: false });

  // Proteksi Kehilangan Data: Berikan konfirmasi dialog browser jika user merefresh atau menutup tab saat ada foto yang telah diambil
  useEffect(() => {
    const hasCapturedPhotos = Boolean(photos && photos.some(p => p !== null && p !== undefined));
    if (!hasCapturedPhotos && !isSessionRunning) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [photos, isSessionRunning]);

  // Fungsi untuk me-reset semua pengaturan editing ke default
  const resetEditorToDefault = useCallback(() => {
    setSelectedFrame(DEFAULT_FRAME);
    setSelectedBackground(DEFAULT_BACKGROUND);
    setSelectedBgRatio(DEFAULT_BG_RATIO);
    setSelectedFilter(DEFAULT_FILTER);
    setStripScale(72);
    setStripPosition({ x: 0, y: 0 });
    setStrip1Scale(1);
    setStrip2Scale(1);
    setShowDate(true);
    setFontSize(21);
    setIsDuplicateEnabled(false);
    setStrip2Photos(null);
    setStripRotation(0);
    setStrip2Position({ x: 20, y: 8 });
    setStrip2Rotation(4);
    setTopStrip('strip2');
  }, []);

  // Sinkronisasi slot saat layout diubah (KOSONGKAN FOTO SEPENUHNYA SESUAI PERMINTAAN USER)
  const handleSelectLayout = (layoutId) => {
    if (isSessionRunning) return;
    if (layoutId === selectedLayoutId) return;
    setSelectedLayoutId(layoutId);
    const newCount = LAYOUTS[layoutId]?.photoCount || 3;
    // Reset foto menjadi kosong sepenuhnya sehingga user harus mengambil foto baru
    setPhotos(new Array(newCount).fill(null));
    setCurrentRetakeIndex(null);
    setSessionProgress({ current: 0, total: 0, active: false });
    resetEditorToDefault();
  };

  const allSlotsFilled = useMemo(() => {
    return photos.filter(Boolean).length === currentLayout.photoCount;
  }, [photos, currentLayout.photoCount]);

  // Countdown timer helper
  const runCountdown = useCallback((seconds) => {
    return new Promise((resolve) => {
      if (seconds <= 0) {
        resolve();
      } else {
        let timeLeft = seconds;
        setCountdown(timeLeft);
        audio.playBeep(false);

        const interval = setInterval(() => {
          timeLeft--;
          if (timeLeft > 0) {
            setCountdown(timeLeft);
            audio.playBeep(false);
          } else {
            clearInterval(interval);
            // Tampilkan aba-aba "CHEESE!" tepat sebelum kamera menjepret foto
            setCountdown('CHEESE!');
            audio.playBeep(true);
            setTimeout(() => {
              setCountdown(null);
              resolve();
            }, 750);
          }
        }, 1000);
      }
    });
  }, [audio]);

  // Jepret satu frame foto alami (filter diaplikasikan di tahap editing)
  const snapPhoto = useCallback(() => {
    setIsFlashing(true);
    audio.playShutter();
    setTimeout(() => setIsFlashing(false), 300);
    return camera.captureFrame(null);
  }, [camera, audio]);

  // Jalankan sesi foto: Tiap klik tombol mengambil 1 foto untuk slot berikutnya yang masih kosong
  // (Dengan hitung mundur jika timer aktif, atau jepret langsung jika timer Off).
  // Kamera selalu menunggu user menekan tombol kembali sebelum memotret foto berikutnya.
  const handleStartSession = async () => {
    if (isSessionRunning) return;
    audio.unlockAudio();
    const targetCount = currentLayout.photoCount;

    // Prioritaskan slot yang dipilih user untuk difoto ulang (currentRetakeIndex),
    // atau cari slot pertama yang masih kosong
    let targetIndex = currentRetakeIndex !== null ? currentRetakeIndex : photos.findIndex(p => p === null);
    let basePhotos = [...photos];

    // Jika seluruh slot sebelumnya sudah penuh terisi, foto ulang dimulai dari slot pertama
    if (targetIndex === -1) {
      resetEditorToDefault();
      basePhotos = new Array(targetCount).fill(null);
      targetIndex = 0;
    }

    setIsSessionRunning(true);
    setSessionProgress({ current: targetIndex + 1, total: targetCount, active: true });

    // Jika timer aktif (3s / 5s / 10s), jalankan hitung mundur sebelum menjepret foto
    if (timerSeconds > 0) {
      await runCountdown(timerSeconds);
    }

    // Ambil foto dan masukkan ke slot yang dituju
    const captured = snapPhoto();
    basePhotos[targetIndex] = captured;
    setPhotos(basePhotos);
    setCurrentRetakeIndex(null);

    setTimeout(() => {
      setSessionProgress({ current: 0, total: 0, active: false });
      setIsSessionRunning(false);
    }, 350);
  };

  // Tandai slot untuk difoto ulang dan gulir layar langsung ke atas ke arah kamera
  // (Menunggu user menekan tombol kamera sendiri saat sudah siap)
  const handleRetakeSlot = (slotIndex) => {
    if (isSessionRunning) return;

    // Batalkan mode foto ulang jika slotIndex null
    if (slotIndex === null) {
      setCurrentRetakeIndex(null);
      return;
    }

    // Hanya slot yang sudah memiliki foto yang dapat diulang
    if (!photos[slotIndex]) return;

    audio.unlockAudio();

    // Tandai slot yang ditargetkan untuk difoto ulang
    setCurrentRetakeIndex(slotIndex);

    // Gulir layar ke atas ke posisi kamera secara andal (lintas browser & iOS Safari / iPad)
    const scrollToCamera = () => {
      const cameraEl = document.getElementById('camera-view-container');
      if (cameraEl) {
        try {
          cameraEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
          cameraEl.scrollIntoView(true);
        }
      }
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    };

    scrollToCamera();
    setTimeout(scrollToCamera, 50);
    setTimeout(scrollToCamera, 150);
  };

  // Reset sesi foto kembali ke awal (kembali memilih grid)
  const handleResetSession = () => {
    const hasPhotos = Boolean(photos && photos.some(p => p !== null));
    if (hasPhotos) {
      setConfirmModal({
        isOpen: true,
        title: 'Mulai Sesi Baru?',
        message: 'Memulai sesi baru akan mengatur ulang format dan foto yang ada. Pastikan Anda sudah menyimpan hasil cetak Anda.',
        confirmLabel: 'Ya, Mulai Baru',
        isDestructive: true,
        onConfirm: () => {
          camera.stopStream();
          setPhotos(new Array(currentLayout.photoCount).fill(null));
          resetEditorToDefault();
          setCurrentStep('grid');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    camera.stopStream();
    setPhotos(new Array(currentLayout.photoCount).fill(null));
    resetEditorToDefault();
    setCurrentStep('grid');
  };

  const [printedData, setPrintedData] = useState(null);

  // Beralih ke halaman animasi cetak photobooth
  const handleDownloadAndPrint = (data) => {
    camera.stopStream();
    audio.unlockAudio();
    if (typeof data === 'string') {
      setPrintedImageUrl(data);
      setPrintedData({ imageUrl: data });
    } else {
      setPrintedImageUrl(data?.imageUrl || data?.dataUrl);
      setPrintedData(data);
    }
    setCurrentStep('printing');
  };

  // Navigasi dari landing page ke pemilihan grid (Kamera BELUM dinyalakan)
  const handleStartPhotoFromLanding = () => {
    audio.unlockAudio();
    setCurrentStep('grid');
  };

  // Konfirmasi format grid yang dipilih dan nyalakan kamera
  const handleConfirmGrid = (layoutId) => {
    audio.unlockAudio();
    setSelectedLayoutId(layoutId);
    const count = LAYOUTS[layoutId]?.photoCount || 3;
    setPhotos(new Array(count).fill(null));
    resetEditorToDefault();
    camera.startCamera();
    setCurrentStep('capture');
  };

  // Kembali dari kamera ke pemilihan format grid (dengan proteksi foto hilang)
  const handleBackToGrid = () => {
    const hasPhotos = Boolean(photos && photos.some(p => p !== null));
    if (hasPhotos) {
      setConfirmModal({
        isOpen: true,
        title: 'Ganti Format Grid?',
        message: 'Foto yang telah diambil akan terhapus jika Anda mengubah format grid. Yakin ingin kembali ke pemilihan grid?',
        confirmLabel: 'Ya, Ganti Format',
        isDestructive: true,
        onConfirm: () => {
          camera.stopStream();
          setPhotos(new Array(currentLayout.photoCount).fill(null));
          resetEditorToDefault();
          setCurrentStep('grid');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    camera.stopStream();
    setCurrentStep('grid');
  };

  // Kembali ke beranda (dengan proteksi foto hilang)
  const handleBackToHome = () => {
    const hasPhotos = Boolean(photos && photos.some(p => p !== null));
    if (hasPhotos && currentStep !== 'landing') {
      setConfirmModal({
        isOpen: true,
        title: 'Kembali ke Beranda?',
        message: 'Sesi studio Anda belum disimpan. Foto yang telah diambil akan terhapus jika kembali ke Beranda.',
        confirmLabel: 'Ya, Ke Beranda',
        isDestructive: true,
        onConfirm: () => {
          camera.stopStream();
          setPhotos(new Array(currentLayout.photoCount).fill(null));
          resetEditorToDefault();
          setCurrentStep('landing');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }
    camera.stopStream();
    setCurrentStep('landing');
  };

  return (
    <div className="min-h-[100dvh] bg-[#FAF7F2] text-stone-800 flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Navbar */}
      <header className="border-b border-[#E7E2DA] bg-[#FAF7F2]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Logo & Brand Name */}
          <button
            onClick={handleBackToHome}
            className="flex items-center text-left group cursor-pointer transition-opacity hover:opacity-85 focus:outline-none"
            title="GoPhotobooth — Kembali ke Beranda"
          >
            <img
              src="/logo.svg"
              alt="GoPhotobooth"
              className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </button>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2">
            {currentStep !== 'landing' && (
              <button
                onClick={handleBackToHome}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-full transition cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </button>
            )}

            <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700">
              {/* 1. Grid */}
              <span
                className={`w-2 h-2 rounded-full ${
                  currentStep === 'grid'
                    ? 'bg-stone-900 animate-pulse'
                    : currentStep === 'capture' || currentStep === 'editor' || currentStep === 'printing'
                    ? 'bg-stone-400'
                    : 'bg-stone-300'
                }`}
              />
              <span className={currentStep === 'grid' ? 'text-stone-900 font-bold' : 'text-stone-500'}>
                Grid
              </span>

              <span className="text-stone-400">/</span>

              {/* 2. Kamera */}
              <span
                className={`w-2 h-2 rounded-full ${
                  currentStep === 'capture'
                    ? 'bg-stone-900 animate-pulse'
                    : currentStep === 'editor' || currentStep === 'printing'
                    ? 'bg-stone-400'
                    : 'bg-stone-300'
                }`}
              />
              <span className={currentStep === 'capture' ? 'text-stone-900 font-bold' : 'text-stone-500'}>
                Kamera
              </span>

              <span className="text-stone-400">/</span>

              {/* 3. Editor */}
              <span
                className={`w-2 h-2 rounded-full ${
                  currentStep === 'editor'
                    ? 'bg-stone-900 animate-pulse'
                    : currentStep === 'printing'
                    ? 'bg-stone-400'
                    : 'bg-stone-300'
                }`}
              />
              <span className={currentStep === 'editor' ? 'text-stone-900 font-bold' : 'text-stone-500'}>
                Editor
              </span>

              <span className="text-stone-400">/</span>

              {/* 4. Cetak */}
              <span
                className={`w-2 h-2 rounded-full ${
                  currentStep === 'printing' ? 'bg-stone-900 animate-pulse' : 'bg-stone-300'
                }`}
              />
              <span className={currentStep === 'printing' ? 'text-stone-900 font-bold' : 'text-stone-500'}>
                Cetak
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:py-8">
        
        {/* 1. Halaman Awal (Landing): Bersih, Klasik & Fokus pada Tombol Mulai Foto */}
        {currentStep === 'landing' && (
          <LandingPage onStartPhoto={handleStartPhotoFromLanding} />
        )}

        {/* 2. Halaman Pilih Format Grid: User WAJIB memilih grid sebelum membuka kamera */}
        {currentStep === 'grid' && (
          <GridSelectionPage
            selectedLayoutId={selectedLayoutId}
            onSelectLayout={setSelectedLayoutId}
            onConfirmGrid={handleConfirmGrid}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* 3. Halaman Kamera: Tetap dimount saat di capture untuk menjaga stream video */}
        <div className={currentStep === 'capture' ? 'block animate-fade-in' : 'hidden'}>
          <CapturePage
            camera={camera}
            audio={audio}
            timerSeconds={timerSeconds}
            setTimerSeconds={setTimerSeconds}
            currentLayout={currentLayout}
            photos={photos}
            isSessionRunning={isSessionRunning}
            sessionProgress={sessionProgress}
            countdown={countdown}
            isFlashing={isFlashing}
            currentRetakeIndex={currentRetakeIndex}
            allSlotsFilled={allSlotsFilled}
            onStartSession={handleStartSession}
            onRetakeSlot={handleRetakeSlot}
            onGoToEditor={() => {
              camera.stopStream();
              setCurrentStep('editor');
            }}
            onBackToGrid={handleBackToGrid}
            onBackToHome={handleBackToHome}
          />
        </div>

        {/* 3. Halaman Editor: Aktif saat foto selesai diambil */}
        {currentStep === 'editor' && (
          <div className="animate-fade-in">
            <EditorPage
              photos={photos}
              layout={currentLayout}
              selectedBgRatio={selectedBgRatio}
              onSelectBgRatio={setSelectedBgRatio}
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
              selectedFrame={selectedFrame}
              onSelectFrame={setSelectedFrame}
              selectedBackground={selectedBackground}
              onSelectBackground={setSelectedBackground}
              footerText={footerText}
              fontSize={fontSize}
              onChangeFontSize={setFontSize}
              stripScale={stripScale}
              onChangeStripScale={setStripScale}
              stripPosition={stripPosition}
              onChangeStripPosition={setStripPosition}
              strip1Scale={strip1Scale}
              onChangeStrip1Scale={setStrip1Scale}
              strip2Scale={strip2Scale}
              onChangeStrip2Scale={setStrip2Scale}
              showDate={showDate}
              onToggleShowDate={() => setShowDate(prev => !prev)}
              isDuplicateEnabled={isDuplicateEnabled}
              onToggleDuplicate={setIsDuplicateEnabled}
              strip2Photos={strip2Photos}
              onChangeStrip2Photos={setStrip2Photos}
              stripRotation={stripRotation}
              onChangeStripRotation={setStripRotation}
              strip2Position={strip2Position}
              onChangeStrip2Position={setStrip2Position}
              strip2Rotation={strip2Rotation}
              onChangeStrip2Rotation={setStrip2Rotation}
              topStrip={topStrip}
              onChangeTopStrip={setTopStrip}
              onBackToCamera={() => {
                camera.startCamera();
                setCurrentStep('capture');
              }}
              onResetSession={handleResetSession}
              onDownloadAndPrint={handleDownloadAndPrint}
            />
          </div>
        )}

        {/* 4. Halaman Cetak Photobooth (Animasi Dispenser Mesin & Unduh) */}
        {currentStep === 'printing' && (
          <PrintingPage
            imageUrl={printedImageUrl}
            editorCanvas={printedData?.canvas || null}
            hdConfig={printedData?.hdConfig || null}
            onStartNewSession={handleResetSession}
            onBackToEditor={() => setCurrentStep('editor')}
            audio={audio}
          />
        )}
      </main>

      {/* Confirmation Modal for Progress Safety */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-stone-200 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base leading-snug">
                  {confirmModal.title}
                </h3>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
                  Konfirmasi Sesi
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              {confirmModal.message}
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
                className={`min-h-[44px] px-4 py-2.5 rounded-xl text-white text-xs font-bold transition active:scale-95 shadow-md cursor-pointer flex items-center justify-center ${
                  confirmModal.isDestructive
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-stone-900 hover:bg-stone-800'
                }`}
              >
                {confirmModal.confirmLabel || 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E7E2DA] py-6 text-center text-xs text-stone-500 mt-auto bg-[#FAF7F2]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleBackToHome}
            className="flex items-center cursor-pointer transition-opacity hover:opacity-80 focus:outline-none"
            title="GoPhotobooth — Kembali ke Beranda"
          >
            <img
              src="/logo.svg"
              alt="GoPhotobooth"
              className="h-6 sm:h-7 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
            />
          </button>
          <div className="flex items-center gap-2 text-stone-500">
            <span>Studio Photobooth Online Klasik &amp; Minimalis</span>
            <span className="text-stone-300">•</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
