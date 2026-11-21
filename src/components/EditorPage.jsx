import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Wand2,
  Type,
  Calendar,
  Sparkles,
  Layers,
  Film,
  ZoomIn,
  Move,
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Copy,
  Shuffle,
  Check,
  Sliders,
} from 'lucide-react';
import { FRAMES, FRAME_CATEGORIES } from '../constants/frames';
import { BACKGROUNDS, BACKGROUND_CATEGORIES, BACKGROUND_RATIOS } from '../constants/backgrounds';
import { FILTERS, FILTER_CATEGORIES } from '../constants/filters';
import { renderPhotoboothCanvas, getCanvasDimensions } from '../utils/canvasRenderer';
import { saveOrSharePhoto, isMobileDevice } from '../utils/downloadHelper';

// Helper acak urutan foto untuk strip kedua agar tampil natural & berbeda
function generateShuffledPhotos(basePhotos) {
  if (!basePhotos || basePhotos.length <= 1) return [...(basePhotos || [])];
  const indices = basePhotos.map((_, i) => i);
  let shuffledIndices;
  let attempts = 0;
  do {
    shuffledIndices = [...indices].sort(() => Math.random() - 0.5);
    attempts++;
  } while (
    attempts < 20 &&
    basePhotos.length > 1 &&
    shuffledIndices.every((idx, i) => idx === i)
  );
  return shuffledIndices.map(i => basePhotos[i]);
}

export default function EditorPage({
  photos,
  layout,
  selectedBgRatio = 'auto',
  onSelectBgRatio,
  selectedFilter,
  onSelectFilter,
  selectedFrame,
  onSelectFrame,
  selectedBackground,
  onSelectBackground,
  footerText = 'GOPHOTOBOOTH STUDIO',
  fontSize = 21,
  onChangeFontSize,
  stripScale = 72,
  onChangeStripScale,
  stripPosition = { x: 0, y: 0 },
  onChangeStripPosition,
  strip1Scale = 1,
  onChangeStrip1Scale,
  strip2Scale = 1,
  onChangeStrip2Scale,
  showDate,
  onToggleShowDate,
  // Props Duplikasi Strip (Maksimal 2 Foto)
  isDuplicateEnabled = false,
  onToggleDuplicate,
  strip2Photos = null,
  onChangeStrip2Photos,
  stripRotation = 0,
  onChangeStripRotation,
  strip2Position = { x: 20, y: 8 },
  onChangeStrip2Position,
  strip2Rotation = 4,
  onChangeStrip2Rotation,
  topStrip = 'strip2',
  onChangeTopStrip,
  onBackToCamera,
  onResetSession,
  onDownloadAndPrint,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const boundingBoxRef = useRef(null);
  const inactiveStripRef = useRef(null);
  const toolbarRef = useRef(null);

  // Tab Strip yang sedang aktif untuk di-drag / diubah posisinya ('strip1' atau 'strip2')
  const [activeStrip, setActiveStrip] = useState('strip1');

  // Accordion dropdown states for editing panels (Semua tertutup secara default saat masuk ke editor)
  const [openSections, setOpenSections] = useState({
    filter: false,
    layoutDuplicate: false,
    background: false,
    frame: false,
    text: false,
  });

  // State notice jika user klik rasio sebelum memilih motif latar
  const [showBgRatioNote, setShowBgRatioNote] = useState(false);
  const hasBackground = selectedBackground && selectedBackground.id !== 'none';

  // Foto HANYA bisa disesuaikan (geser, rotasi, ukuran) jika:
  // 1. User sudah menduplikat foto (isDuplicateEnabled === true), ATAU
  // 2. User sudah memilih background (hasBackground === true)
  // Jika 1 strip tanpa background, foto TIDAK BISA digeser atau diubah ukurannya
  const canAdjust = Boolean(isDuplicateEnabled || hasBackground);

  // Garis frame & handle interaksi hanya muncul jika strip sedang terseleksi (isSelected === true).
  // Akan otomatis hilang jika user klik di luar area foto.
  const [isSelected, setIsSelected] = useState(false);

  // State petunjuk interaktif seret foto agar teman-teman langsung tahu fotonya bisa digeser & diatur
  const [showDragTip, setShowDragTip] = useState(true);

  // Hilangkan garis putus-putus dan handle ketika user klik/tap di luar area foto
  useEffect(() => {
    if (!isSelected) return;
    const handleDocumentPointerDown = (e) => {
      // Jika klik berada di dalam bounding box strip aktif, biarkan aktif
      if (boundingBoxRef.current && boundingBoxRef.current.contains(e.target)) {
        return;
      }
      // Jika klik berada di strip non-aktif, biarkan interaksi perpindahan strip bekerja
      if (inactiveStripRef.current && inactiveStripRef.current.contains(e.target)) {
        return;
      }
      // Jika klik berada di toolbar seleksi strip di atas kanvas
      if (toolbarRef.current && toolbarRef.current.contains(e.target)) {
        return;
      }
      // Klik di luar area adjust foto: sembunyikan garis frame seleksi & handles
      setIsSelected(false);
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, [isSelected]);

  // State dimensi rendered DOM canvas untuk mapping handle transformasi secara presisi
  const [canvasDOMSize, setCanvasDOMSize] = useState({ width: 0, height: 0 });

  const updateCanvasBounds = useCallback(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setCanvasDOMSize({
        width: rect.width,
        height: rect.height,
      });
    }
  }, []);

  useEffect(() => {
    updateCanvasBounds();
    const handleResize = () => updateCanvasBounds();
    window.addEventListener('resize', handleResize);
    let ro;
    if (window.ResizeObserver && canvasRef.current) {
      ro = new ResizeObserver(handleResize);
      ro.observe(canvasRef.current);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [updateCanvasBounds]);

  // Komputasi foto strip kedua yang teracak
  const effectiveStrip2Photos = useMemo(() => {
    if (!isDuplicateEnabled) return null;
    if (strip2Photos && strip2Photos.length === photos.length) {
      return strip2Photos;
    }
    return generateShuffledPhotos(photos);
  }, [isDuplicateEnabled, strip2Photos, photos]);

  // Handler toggle duplikasi foto (maksimal 2 foto)
  const handleToggleDuplicate = () => {
    const nextVal = !isDuplicateEnabled;
    onToggleDuplicate?.(nextVal);
    if (nextVal) {
      if (!strip2Photos || strip2Photos.length !== photos.length) {
        onChangeStrip2Photos?.(generateShuffledPhotos(photos));
      }
      if (stripRotation === 0) onChangeStripRotation?.(-3);
      if (strip2Rotation === 0) onChangeStrip2Rotation?.(4);
      setActiveStrip('strip2');
      // Biarkan seleksi nonaktif saat baru klik duplikat agar garis tidak menutupi tampilan
      setIsSelected(false);
      setOpenSections(prev => ({ ...prev, layoutDuplicate: true }));
    } else {
      // RESET TOTAL KONDISI KETIKA MENONAKTIFKAN DUPLIKAT FOTO
      // Mencegah bug pergeseran dan ruang kosong kanvas
      setActiveStrip('strip1');
      onChangeStripPosition?.({ x: 0, y: 0 });
      onChangeStripRotation?.(0);
      onChangeStrip1Scale?.(1);
      onChangeStrip2Position?.({ x: 20, y: 8 });
      onChangeStrip2Rotation?.(4);
      onChangeStrip2Scale?.(1);
      onChangeTopStrip?.('strip2');
      setIsSelected(false);
    }
  };

  // Handler acak ulang susunan slot foto untuk strip 2
  const handleReshuffleStrip2 = () => {
    const nextShuffled = generateShuffledPhotos(photos);
    onChangeStrip2Photos?.(nextShuffled);
  };

  // Kalkulasi koordinat posisi strip dalam resolusi kanvas virtual secara deterministik
  const stripCoordinates = useMemo(() => {
    const {
      stripWidth,
      stripHeight,
      totalWidth: canvasW,
      totalHeight: canvasH,
    } = getCanvasDimensions({
      layout,
      background: selectedBackground,
      bgAspectRatio: selectedBgRatio,
      stripScale,
      isDuplicateEnabled,
    });

    const baseCenterX = Math.round((canvasW - stripWidth) / 2);
    const baseCenterY = Math.round((canvasH - stripHeight) / 2);

    const maxShiftX = Math.round(Math.max(160, canvasW * 0.38));
    const maxShiftY = Math.round(Math.max(160, canvasH * 0.32));

    // Strip 1: Jika tidak boleh diadjust, koordinat selalu tetap di (0,0) persis di tengah
    const s1PosX = canAdjust ? Math.max(-100, Math.min(100, stripPosition?.x ?? (isDuplicateEnabled ? -16 : 0))) : 0;
    const s1PosY = canAdjust ? Math.max(-100, Math.min(100, stripPosition?.y ?? (isDuplicateEnabled ? -4 : 0))) : 0;
    const s1X = canAdjust ? (hasBackground || isDuplicateEnabled ? (baseCenterX + Math.round((s1PosX / 100) * maxShiftX)) : 0) : 0;
    const s1Y = canAdjust ? (hasBackground || isDuplicateEnabled ? (baseCenterY + Math.round((s1PosY / 100) * maxShiftY)) : 0) : 0;
    const s1Rot = canAdjust ? (stripRotation !== undefined ? stripRotation : (isDuplicateEnabled ? -3 : 0)) : 0;
    const s1Scale = canAdjust ? (strip1Scale || 1) : 1;

    // Strip 2:
    const s2PosX = Math.max(-100, Math.min(100, strip2Position?.x ?? 20));
    const s2PosY = Math.max(-100, Math.min(100, strip2Position?.y ?? 8));
    const s2X = baseCenterX + Math.round((s2PosX / 100) * maxShiftX);
    const s2Y = baseCenterY + Math.round((s2PosY / 100) * maxShiftY);
    const s2Rot = strip2Rotation !== undefined ? strip2Rotation : 4;
    const s2Scale = strip2Scale || 1;

    return {
      canvasW,
      canvasH,
      stripWidth,
      stripHeight,
      maxShiftX,
      maxShiftY,
      strip1: {
        x: s1X,
        y: s1Y,
        centerX: s1X + stripWidth / 2,
        centerY: s1Y + stripHeight / 2,
        rotation: s1Rot,
        scale: s1Scale,
        pos: { x: s1PosX, y: s1PosY },
      },
      strip2: {
        x: s2X,
        y: s2Y,
        centerX: s2X + stripWidth / 2,
        centerY: s2Y + stripHeight / 2,
        rotation: s2Rot,
        scale: s2Scale,
        pos: { x: s2PosX, y: s2PosY },
      },
    };
  }, [
    layout,
    canAdjust,
    hasBackground,
    selectedBackground,
    selectedBgRatio,
    stripScale,
    isDuplicateEnabled,
    stripPosition,
    stripRotation,
    strip1Scale,
    strip2Position,
    strip2Rotation,
    strip2Scale,
  ]);

  // Skala rasio dari kanvas virtual ke ukuran DOM layar saat ini
  const scaleRatioX = canvasDOMSize.width > 0 && stripCoordinates.canvasW > 0
    ? canvasDOMSize.width / stripCoordinates.canvasW
    : 1;
  const scaleRatioY = canvasDOMSize.height > 0 && stripCoordinates.canvasH > 0
    ? canvasDOMSize.height / stripCoordinates.canvasH
    : 1;

  // Data strip aktif dalam koordinat DOM layar
  const activeData = activeStrip === 'strip1' ? stripCoordinates.strip1 : stripCoordinates.strip2;
  const activeDomW = Math.max(30, stripCoordinates.stripWidth * activeData.scale * scaleRatioX);
  const activeDomH = Math.max(30, stripCoordinates.stripHeight * activeData.scale * scaleRatioY);
  const activeDomCX = activeData.centerX * scaleRatioX;
  const activeDomCY = activeData.centerY * scaleRatioY;
  const activeRot = activeData.rotation;

  // Data strip tidak aktif (jika mode duplikat aktif)
  const inactiveKey = activeStrip === 'strip1' ? 'strip2' : 'strip1';
  const inactiveData = inactiveKey === 'strip1' ? stripCoordinates.strip1 : stripCoordinates.strip2;
  const inactiveDomW = Math.max(30, stripCoordinates.stripWidth * inactiveData.scale * scaleRatioX);
  const inactiveDomH = Math.max(30, stripCoordinates.stripHeight * inactiveData.scale * scaleRatioY);
  const inactiveDomCX = inactiveData.centerX * scaleRatioX;
  const inactiveDomCY = inactiveData.centerY * scaleRatioY;
  const inactiveRot = inactiveData.rotation;

  // Status interaksi langsung pada foto: 'move' | 'scale' | 'rotate' | null
  const [activeInteractionMode, setActiveInteractionMode] = useState(null);
  const transformRef = useRef(null);
  const rafRef = useRef(null);
  const renderRafRef = useRef(null);
  const renderSeqRef = useRef(0);
  const pendingUpdateRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (renderRafRef.current) cancelAnimationFrame(renderRafRef.current);
    };
  }, []);

  // 1. Geser (Move) foto langsung
  const handleBodyPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    setActiveInteractionMode('move');
    transformRef.current = {
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      targetStrip: activeStrip,
      initialPos: activeStrip === 'strip1' ? { ...stripPosition } : { ...strip2Position },
    };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (err) { }
  };

  // 2. Tarik sudut untuk membesar / mengecilkan (Scale)
  const handleScalePointerDown = (e, corner) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    setActiveInteractionMode('scale');
    const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const screenCX = rect.left + activeDomCX;
    const screenCY = rect.top + activeDomCY;
    const initialDist = Math.max(10, Math.hypot(e.clientX - screenCX, e.clientY - screenCY));
    transformRef.current = {
      mode: 'scale',
      corner,
      screenCX,
      screenCY,
      initialDist,
      targetStrip: activeStrip,
      initialScale: activeStrip === 'strip1' ? (strip1Scale || 1) : (strip2Scale || 1),
    };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (err) { }
  };

  // 3. Tarik knob atas untuk memutar (Rotate)
  const handleRotatePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.stopPropagation();
    setActiveInteractionMode('rotate');
    const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const screenCX = rect.left + activeDomCX;
    const screenCY = rect.top + activeDomCY;
    const initialAngle = Math.atan2(e.clientY - screenCY, e.clientX - screenCX) * (180 / Math.PI);
    transformRef.current = {
      mode: 'rotate',
      screenCX,
      screenCY,
      initialAngle,
      targetStrip: activeStrip,
      initialRot: activeStrip === 'strip1' ? (stripRotation || 0) : (strip2Rotation || 0),
    };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (err) { }
  };

  // Listener gerakan pointer global selama manipulasi berlangsung (dioptimasi via requestAnimationFrame untuk 60+ FPS mulus)
  const handleTransformPointerMove = (e) => {
    if (!transformRef.current) return;
    const t = transformRef.current;

    if (t.mode === 'move') {
      const deltaX = e.clientX - t.startX;
      const deltaY = e.clientY - t.startY;
      const factorX = (deltaX / (canvasDOMSize.width * 0.45 || 150)) * 45;
      const factorY = (deltaY / (canvasDOMSize.height * 0.45 || 150)) * 45;
      const newX = Math.max(-100, Math.min(100, Number((t.initialPos.x + factorX).toFixed(2))));
      const newY = Math.max(-100, Math.min(100, Number((t.initialPos.y + factorY).toFixed(2))));
      pendingUpdateRef.current = { mode: 'move', targetStrip: t.targetStrip, newX, newY };
    } else if (t.mode === 'scale') {
      const currDist = Math.hypot(e.clientX - t.screenCX, e.clientY - t.screenCY);
      const ratio = currDist / t.initialDist;
      const newScale = Math.max(0.55, Math.min(1.75, Number((t.initialScale * ratio).toFixed(2))));
      pendingUpdateRef.current = { mode: 'scale', targetStrip: t.targetStrip, newScale };
    } else if (t.mode === 'rotate') {
      const currAngle = Math.atan2(e.clientY - t.screenCY, e.clientX - t.screenCX) * (180 / Math.PI);
      const diff = currAngle - t.initialAngle;
      const newRot = Number((t.initialRot + diff).toFixed(1));
      pendingUpdateRef.current = { mode: 'rotate', targetStrip: t.targetStrip, newRot };
    }

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingUpdateRef.current) {
          const u = pendingUpdateRef.current;
          if (u.mode === 'move') {
            if (u.targetStrip === 'strip1') onChangeStripPosition?.({ x: u.newX, y: u.newY });
            else onChangeStrip2Position?.({ x: u.newX, y: u.newY });
          } else if (u.mode === 'scale') {
            if (u.targetStrip === 'strip1') onChangeStrip1Scale?.(u.newScale);
            else onChangeStrip2Scale?.(u.newScale);
          } else if (u.mode === 'rotate') {
            if (u.targetStrip === 'strip1') onChangeStripRotation?.(u.newRot);
            else onChangeStrip2Rotation?.(u.newRot);
          }
        }
      });
    }
  };

  const handleTransformPointerUp = (e) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingUpdateRef.current) {
      const u = pendingUpdateRef.current;
      if (u.mode === 'move') {
        if (u.targetStrip === 'strip1') onChangeStripPosition?.({ x: u.newX, y: u.newY });
        else onChangeStrip2Position?.({ x: u.newX, y: u.newY });
      } else if (u.mode === 'scale') {
        if (u.targetStrip === 'strip1') onChangeStrip1Scale?.(u.newScale);
        else onChangeStrip2Scale?.(u.newScale);
      } else if (u.mode === 'rotate') {
        if (u.targetStrip === 'strip1') onChangeStripRotation?.(u.newRot);
        else onChangeStrip2Rotation?.(u.newRot);
      }
      pendingUpdateRef.current = null;
    }
    if (transformRef.current) {
      transformRef.current = null;
      setActiveInteractionMode(null);
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch (err) { }
    }
  };

  // 4. Multi-Touch Gestures untuk Mobile & iPad (Pinch to zoom, twist to rotate, pan to move)
  const touchStateRef = useRef(null);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;

      const targetStrip = isDuplicateEnabled ? activeStrip : 'strip1';
      const initialPos = targetStrip === 'strip1' ? { ...stripPosition } : { ...strip2Position };
      const initialRot = targetStrip === 'strip1' ? (stripRotation || 0) : (strip2Rotation || 0);
      const initialScale = targetStrip === 'strip1' ? (strip1Scale || 1) : (strip2Scale || 1);

      touchStateRef.current = {
        targetStrip,
        startDist: dist,
        startAngle: angle,
        startMidX: midX,
        startMidY: midY,
        initialPos,
        initialRot,
        initialScale,
      };
      setActiveInteractionMode('multitouch');
    }
  };

  const handleTouchMove = (e) => {
    if (!touchStateRef.current || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const { targetStrip, startDist, startAngle, startMidX, startMidY, initialPos, initialRot, initialScale } = touchStateRef.current;

    // Cubit (Pinch) untuk mengubah ukuran
    const currDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const scaleRatio = currDist / (startDist || 1);
    const newScale = Math.max(0.55, Math.min(1.75, Number((initialScale * scaleRatio).toFixed(2))));

    // Putar (Twist) dengan 2 jari
    const currAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
    const diffAngle = currAngle - startAngle;
    const newRot = Number((initialRot + diffAngle).toFixed(1));

    // Geser (Pan) dengan 2 jari
    const currMidX = (t1.clientX + t2.clientX) / 2;
    const currMidY = (t1.clientY + t2.clientY) / 2;
    const deltaX = currMidX - startMidX;
    const deltaY = currMidY - startMidY;
    const factorX = (deltaX / (canvasDOMSize.width * 0.45 || 150)) * 45;
    const factorY = (deltaY / (canvasDOMSize.height * 0.45 || 150)) * 45;
    const newPosX = Math.max(-100, Math.min(100, Number((initialPos.x + factorX).toFixed(2))));
    const newPosY = Math.max(-100, Math.min(100, Number((initialPos.y + factorY).toFixed(2))));

    pendingUpdateRef.current = {
      mode: 'multitouch',
      targetStrip,
      newPosX,
      newPosY,
      newScale,
      newRot,
    };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingUpdateRef.current && pendingUpdateRef.current.mode === 'multitouch') {
          const u = pendingUpdateRef.current;
          if (u.targetStrip === 'strip1') {
            onChangeStripPosition?.({ x: u.newPosX, y: u.newPosY });
            onChangeStrip1Scale?.(u.newScale);
            onChangeStripRotation?.(u.newRot);
          } else {
            onChangeStrip2Position?.({ x: u.newPosX, y: u.newPosY });
            onChangeStrip2Scale?.(u.newScale);
            onChangeStrip2Rotation?.(u.newRot);
          }
        }
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (pendingUpdateRef.current && pendingUpdateRef.current.mode === 'multitouch') {
        const u = pendingUpdateRef.current;
        if (u.targetStrip === 'strip1') {
          onChangeStripPosition?.({ x: u.newPosX, y: u.newPosY });
          onChangeStrip1Scale?.(u.newScale);
          onChangeStripRotation?.(u.newRot);
        } else {
          onChangeStrip2Position?.({ x: u.newPosX, y: u.newPosY });
          onChangeStrip2Scale?.(u.newScale);
          onChangeStrip2Rotation?.(u.newRot);
        }
        pendingUpdateRef.current = null;
      }
      touchStateRef.current = null;
      if (activeInteractionMode === 'multitouch') {
        setActiveInteractionMode(null);
      }
    }
  };

  const handleSelectRatio = (ratioId) => {
    if (!hasBackground) {
      setShowBgRatioNote(true);
      return;
    }
    setShowBgRatioNote(false);
    onSelectBgRatio?.(ratioId);
  };

  const handleSelectBackground = (bg) => {
    if (bg.id !== 'none') {
      setShowBgRatioNote(false);
      // Biarkan seleksi tetap nonaktif agar garis putus-putus tidak menghalangi pratinjau sampai user mengetuk foto
      setIsSelected(false);
    } else {
      // Jika kembali ke Tanpa Background, kembalikan rasio ke otomatis
      onSelectBgRatio?.('auto');
      if (!isDuplicateEnabled) {
        onChangeStripPosition?.({ x: 0, y: 0 });
        onChangeStripRotation?.(0);
        onChangeStrip1Scale?.(1);
        setIsSelected(false);
      }
    }
    onSelectBackground?.(bg);
  };

  const toggleSection = (sectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const [filterCategory, setFilterCategory] = useState('all');
  const displayedFilters = useMemo(() => {
    if (filterCategory === 'all') return FILTERS;
    return FILTERS.filter(f =>
      f.category === filterCategory ||
      (Array.isArray(f.categories) && f.categories.includes(filterCategory)) ||
      (filterCategory === 'retro' && f.id.includes('retro'))
    );
  }, [filterCategory]);

  const [bgCategory, setBgCategory] = useState('all');
  const displayedBackgrounds = useMemo(() => {
    if (bgCategory === 'all') return BACKGROUNDS;
    return BACKGROUNDS.filter(b => b.category === bgCategory);
  }, [bgCategory]);

  const [frameCategory, setFrameCategory] = useState('all');
  const displayedFrames = useMemo(() => {
    if (frameCategory === 'all') return FRAMES;
    return FRAMES.filter(f => f.category === frameCategory || f.categories?.includes(frameCategory));
  }, [frameCategory]);

  // Mini preview ratio box helper
  const getRatioPreview = (id) => {
    switch (id) {
      case 'auto':
        return (
          <div className="w-3.5 h-4.5 rounded-xs border-1.5 border-dashed border-current flex items-center justify-center">
            <div className="w-2 h-3 bg-current/30 rounded-xs"></div>
          </div>
        );
      case '4:3':
        return (
          <div className="w-4.5 h-3.5 rounded-xs border-1.5 border-current flex items-center justify-center">
            <div className="w-2 h-1.5 bg-current/30 rounded-xs"></div>
          </div>
        );
      case '3:4':
        return (
          <div className="w-3.5 h-4.5 rounded-xs border-1.5 border-current flex items-center justify-center">
            <div className="w-1.5 h-2 bg-current/30 rounded-xs"></div>
          </div>
        );
      case '1:1':
        return (
          <div className="w-4 h-4 rounded-xs border-1.5 border-current flex items-center justify-center">
            <div className="w-2 h-2 bg-current/30 rounded-xs"></div>
          </div>
        );
      case '16:9':
        return (
          <div className="w-5 h-3 rounded-xs border-1.5 border-current flex items-center justify-center">
            <div className="w-2.5 h-1.5 bg-current/30 rounded-xs"></div>
          </div>
        );
      case '9:16':
        return (
          <div className="w-3 h-5 rounded-xs border-1.5 border-current flex items-center justify-center">
            <div className="w-1.5 h-2.5 bg-current/30 rounded-xs"></div>
          </div>
        );
      default:
        return null;
    }
  };

  // Re-render canvas whenever layout, frame, background, bgRatio, filter, text, fontSize, stripScale, stripPosition, duplication, scales, or date changes
  // Dioptimasi menggunakan requestAnimationFrame untuk menjaga performa mulus 60fps saat drag/transformasi
  useEffect(() => {
    if (!canvasRef.current) return;

    if (renderRafRef.current) {
      cancelAnimationFrame(renderRafRef.current);
    }

    renderRafRef.current = requestAnimationFrame(() => {
      renderRafRef.current = null;
      const currentSeq = ++renderSeqRef.current;

      renderPhotoboothCanvas({
        photos,
        layout,
        frame: selectedFrame,
        background: selectedBackground,
        bgAspectRatio: selectedBgRatio,
        filterConfig: selectedFilter,
        footerText,
        fontSize,
        stripScale,
        stripPosition,
        stripRotation,
        strip1Scale,
        showDate,
        isDuplicateEnabled,
        strip2Photos: effectiveStrip2Photos,
        strip2Position,
        strip2Rotation,
        strip2Scale,
        topStrip,
        targetCanvas: canvasRef.current,
      }).then(() => {
        if (currentSeq === renderSeqRef.current) {
          updateCanvasBounds();
        }
      }).catch(err => {
        console.warn('Canvas render error:', err);
      });
    });

    return () => {
      if (renderRafRef.current) {
        cancelAnimationFrame(renderRafRef.current);
        renderRafRef.current = null;
      }
    };
  }, [
    photos,
    layout,
    selectedFrame,
    selectedBackground,
    selectedBgRatio,
    selectedFilter,
    footerText,
    fontSize,
    stripScale,
    stripPosition,
    stripRotation,
    strip1Scale,
    showDate,
    isDuplicateEnabled,
    effectiveStrip2Photos,
    strip2Position,
    strip2Rotation,
    strip2Scale,
    topStrip,
    updateCanvasBounds,
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [isExportingHD, setIsExportingHD] = useState(false);

  const handleDownloadStandard = async () => {
    if (!canvasRef.current || isSaving) return;
    const canvas = canvasRef.current;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `gophotobooth-${dateStr}.png`;

    const dataUrl = canvas.toDataURL('image/png');
    setIsSaving(true);

    try {
      await saveOrSharePhoto({ canvas, filename });
    } catch (e) {
      console.warn('Gagal menyimpan foto:', e);
    } finally {
      setIsSaving(false);
      if (onDownloadAndPrint) {
        onDownloadAndPrint({
          imageUrl: dataUrl,
          canvas,
        });
      }
    }
  };

  const handleDownloadHD = async () => {
    if (isExportingHD) return;
    setIsExportingHD(true);

    try {
      // Render Ultra HD canvas (2.5x scale multiplier = ~1290 x 2945 px, 300 DPI print quality)
      const hdCanvas = await renderPhotoboothCanvas({
        photos,
        layout,
        frame: selectedFrame,
        background: selectedBackground,
        bgAspectRatio: selectedBgRatio,
        filterConfig: selectedFilter,
        footerText,
        fontSize,
        stripScale,
        stripPosition,
        stripRotation,
        strip1Scale,
        showDate,
        isDuplicateEnabled,
        strip2Photos: effectiveStrip2Photos,
        strip2Position,
        strip2Rotation,
        strip2Scale,
        topStrip,
        exportScale: 2.5,
      });

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `gophotobooth-ultrahd-${dateStr}.png`;

      await saveOrSharePhoto({ canvas: hdCanvas, filename });

      if (onDownloadAndPrint) {
        const previewUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : hdCanvas.toDataURL('image/png');
        onDownloadAndPrint({
          imageUrl: previewUrl,
          canvas: canvasRef.current || hdCanvas,
        });
      }
    } catch (e) {
      console.error('Gagal export HD:', e);
    } finally {
      setIsExportingHD(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 animate-fade-in">

      {/* Header Bar with Back Button */}
      <div className="flex items-center justify-between border-b border-[#E7E2DA] pb-4">
        <button
          onClick={onBackToCamera}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-50 text-xs sm:text-sm font-semibold transition active:scale-95 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Kamera</span>
        </button>

        <div className="flex items-center gap-2 text-stone-800 font-serif font-bold text-sm sm:text-base">
          <Sparkles className="w-4 h-4 text-stone-600" />
          <span>Studio Kustomisasi &amp; Unduh</span>
        </div>
      </div>

      {/* Main 2-Column Editor Layout (Stacked on Mobile/Tablet, 2-Column on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

        {/* Kolom Kiri: Canvas Display Interaktif Langsung (Geser, Putar, Membesar/Mengecilkan) */}
        <div
          id="canvas-preview-section"
          onPointerDown={(e) => {
            // Jika user klik di luar area strip foto (pada kontainer latar)
            if (e.target.id === 'canvas-preview-section' || e.target === containerRef.current || e.target === canvasRef.current) {
              setIsSelected(false);
            }
          }}
          className="lg:col-span-6 flex flex-col items-center justify-center bg-white border border-[#E7E2DA] rounded-3xl p-3 sm:p-5 shadow-sm static lg:sticky lg:top-24"
        >

          {/* 1. Jika canAdjust belum aktif: Tampilkan Banner Ajak Coba Fitur Geser yang Menarik & Lucu */}
          {!canAdjust && (
            <div className="w-full mb-3 p-3 sm:p-3.5 bg-gradient-to-r from-amber-50/90 via-[#FAF7F2] to-orange-50/70 border border-amber-200/80 rounded-2xl shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-300/80 text-amber-900 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                      Fitur Estetik
                    </span>
                    <span className="text-xs font-serif font-bold text-stone-900">
                      Fotonya Bisa Digeser &amp; Diatur Lho!
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-1 leading-relaxed font-sans">
                    Mau fotomu bertumpuk kasual ala photobooth vintage, digeser, diputar miring, atau dizoom sesukamu? Cukup aktifkan <strong>Duplikat 2 Strip</strong> atau pilih <strong>Motif Latar</strong>!
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleDuplicate();
                        setOpenSections(prev => ({ ...prev, layoutDuplicate: true }));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-300" />
                      <span>Coba Duplikat 2 Strip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenSections(prev => ({ ...prev, background: true }));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <Layers className="w-3.5 h-3.5 text-stone-600" />
                      <span>Pilih Motif Latar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Jika canAdjust sudah aktif dan showDragTip aktif: Tampilkan Banner Info Seret Foto */}
          {canAdjust && showDragTip && (
            <div className="w-full mb-2.5 p-2.5 sm:p-3 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-2xl shadow-md border border-stone-700/60 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0">
                    <Move className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold flex items-center gap-1.5 text-stone-100">
                      <span>Seret &amp; Putar Fotonya Langsung!</span>
                      <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    </p>
                    <p className="text-[11px] text-stone-300 truncate sm:whitespace-normal font-sans">
                      Sentuh foto di kanvas untuk menggeser, memutar miring, atau mengubah ukurannya.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDragTip(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-white transition flex-shrink-0 cursor-pointer"
                  title="Tutup petunjuk"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Floating Toolbar di Atas Kanvas (Hanya aktif jika foto boleh disesuaikan: sudah duplikat ATAU sudah pilih background) */}
          {canAdjust && (
            <div ref={toolbarRef} className="w-full flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-stone-100 text-xs select-none">
              {/* Strip Selector Pills (jika mode duplikat aktif) */}
              <div className="flex items-center gap-1.5">
                {isDuplicateEnabled ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStrip('strip1');
                        setIsSelected(true);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${activeStrip === 'strip1'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                    >
                      <span>Strip 1</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${topStrip === 'strip1'
                        ? 'bg-amber-300 text-stone-900'
                        : 'bg-stone-200 text-stone-600'
                        }`}>
                        {topStrip === 'strip1' ? 'Depan' : 'Belakang'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveStrip('strip2');
                        setIsSelected(true);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer ${activeStrip === 'strip2'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                    >
                      <span>Strip 2</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${topStrip === 'strip2'
                        ? 'bg-amber-300 text-stone-900'
                        : 'bg-stone-200 text-stone-600'
                        }`}>
                        {topStrip === 'strip2' ? 'Depan' : 'Belakang'}
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-stone-800 font-bold text-xs bg-stone-100 px-3 py-1 rounded-lg">
                    <Move className="w-3 h-3 text-stone-600" />
                    <span>Atur Posisi &amp; Ukuran Foto</span>
                  </div>
                )}
              </div>

              {/* Quick Actions (Zoom, Putar, Tukar Tumpukan, Reset) */}
              <div className="flex items-center gap-1">
                {/* Tombol Ukuran Cepat */}
                <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelected(true);
                      if (activeStrip === 'strip1') {
                        onChangeStrip1Scale?.(Math.max(0.55, Number(((strip1Scale || 1) - 0.1).toFixed(2))));
                      } else {
                        onChangeStrip2Scale?.(Math.max(0.55, Number(((strip2Scale || 1) - 0.1).toFixed(2))));
                      }
                    }}
                    title="Kecilkan Foto"
                    className="w-6 h-6 rounded bg-white hover:bg-stone-50 text-stone-800 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer active:scale-95"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-bold text-stone-700 px-1.5 select-none min-w-[32px] text-center">
                    {Math.round((activeStrip === 'strip1' ? (strip1Scale || 1) : (strip2Scale || 1)) * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelected(true);
                      if (activeStrip === 'strip1') {
                        onChangeStrip1Scale?.(Math.min(1.75, Number(((strip1Scale || 1) + 0.1).toFixed(2))));
                      } else {
                        onChangeStrip2Scale?.(Math.min(1.75, Number(((strip2Scale || 1) + 0.1).toFixed(2))));
                      }
                    }}
                    title="Besarkan Foto"
                    className="w-6 h-6 rounded bg-white hover:bg-stone-50 text-stone-800 flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer active:scale-95"
                  >
                    +
                  </button>
                </div>

                {/* Tombol Putar Cepat */}
                <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelected(true);
                      if (activeStrip === 'strip1') {
                        onChangeStripRotation?.((stripRotation || 0) - 5);
                      } else {
                        onChangeStrip2Rotation?.((strip2Rotation || 0) - 5);
                      }
                    }}
                    title="Putar Kiri (-5°)"
                    className="w-6 h-6 rounded bg-white hover:bg-stone-50 text-stone-800 flex items-center justify-center shadow-2xs cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] font-bold text-stone-700 px-1 select-none min-w-[26px] text-center">
                    {activeStrip === 'strip1' ? (stripRotation || 0) : (strip2Rotation || 0)}°
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelected(true);
                      if (activeStrip === 'strip1') {
                        onChangeStripRotation?.((stripRotation || 0) + 5);
                      } else {
                        onChangeStrip2Rotation?.((strip2Rotation || 0) + 5);
                      }
                    }}
                    title="Putar Kanan (+5°)"
                    className="w-6 h-6 rounded bg-white hover:bg-stone-50 text-stone-800 flex items-center justify-center shadow-2xs cursor-pointer active:scale-95"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                </div>

                {/* Tukar Tumpukan jika mode duplikat */}
                {isDuplicateEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelected(true);
                      onChangeTopStrip?.(topStrip === 'strip2' ? 'strip1' : 'strip2');
                    }}
                    title="Tukar posisi tumpukan foto (depan / belakang)"
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center cursor-pointer transition shadow-2xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-stone-700" />
                  </button>
                )}

                {/* Reset Posisi, Ukuran & Rotasi Strip Aktif */}
                <button
                  type="button"
                  onClick={() => {
                    setIsSelected(true);
                    if (activeStrip === 'strip1') {
                      onChangeStripPosition?.({ x: isDuplicateEnabled ? -16 : 0, y: isDuplicateEnabled ? -4 : 0 });
                      onChangeStripRotation?.(isDuplicateEnabled ? -3 : 0);
                      onChangeStrip1Scale?.(1);
                    } else {
                      onChangeStrip2Position?.({ x: 20, y: 8 });
                      onChangeStrip2Rotation?.(4);
                      onChangeStrip2Scale?.(1);
                    }
                  }}
                  title="Reset ukuran & orientasi strip ini"
                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 cursor-pointer transition shadow-2xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Interactive Canvas Container: Tempat Kanvas & Handle Interaksi Langsung */}
          <div
            ref={containerRef}
            onPointerDown={(e) => {
              // Jika user klik area kanvas di luar area strip aktif
              if (e.target === containerRef.current || e.target === canvasRef.current) {
                setIsSelected(false);
              }
            }}
            onTouchStart={canAdjust ? handleTouchStart : undefined}
            onTouchMove={canAdjust ? handleTouchMove : undefined}
            onTouchEnd={canAdjust ? handleTouchEnd : undefined}
            onTouchCancel={canAdjust ? handleTouchEnd : undefined}
            onPointerMove={canAdjust ? handleTransformPointerMove : undefined}
            onPointerUp={canAdjust ? handleTransformPointerUp : undefined}
            onPointerCancel={canAdjust ? handleTransformPointerUp : undefined}
            className={`relative w-full flex justify-center items-center py-2 select-none overflow-visible ${canAdjust ? 'touch-none' : ''
              }`}
            style={{ touchAction: canAdjust ? 'none' : 'auto' }}
          >
            <div
              className={`relative inline-block select-none ${canAdjust ? 'touch-none' : ''}`}
              onPointerDown={(e) => {
                // Jika klik langsung pada elemen kanvas
                if (e.target === canvasRef.current) {
                  setIsSelected(false);
                }
              }}
            >
              <canvas
                ref={canvasRef}
                className="rounded-2xl shadow-xl max-w-full h-auto object-contain block max-h-[50vh] sm:max-h-[60vh] lg:max-h-[76vh]"
                style={{
                  boxShadow: '0 20px 40px -10px rgba(41, 37, 36, 0.25)',
                }}
              />

              {/* 1. Target Ketuk untuk Strip yang Tidak Aktif (jika mode duplikat aktif, tanpa teks badge yang menutupi muka) */}
              {canAdjust && isDuplicateEnabled && canvasDOMSize.width > 0 && (
                <div
                  ref={inactiveStripRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveStrip(inactiveKey);
                    setIsSelected(true);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${inactiveDomCX}px`,
                    top: `${inactiveDomCY}px`,
                    width: `${inactiveDomW}px`,
                    height: `${inactiveDomH}px`,
                    transform: `translate(-50%, -50%) rotate(${inactiveRot}deg)`,
                    transformOrigin: 'center center',
                    touchAction: 'none',
                  }}
                  className="cursor-pointer rounded-xl bg-transparent hover:bg-stone-900/10 transition-colors pointer-events-auto"
                  title={`Ketuk untuk memilih ${inactiveKey === 'strip1' ? 'Strip 1' : 'Strip 2'}`}
                />
              )}

              {/* 2. Interactive Bounding Box & Transform Handles pada Strip Aktif (Hanya jika canAdjust && canAdjust aktif) */}
              {canAdjust && canvasDOMSize.width > 0 && (
                <div
                  ref={boundingBoxRef}
                  style={{
                    position: 'absolute',
                    left: `${activeDomCX}px`,
                    top: `${activeDomCY}px`,
                    width: `${activeDomW}px`,
                    height: `${activeDomH}px`,
                    transform: `translate(-50%, -50%) rotate(${activeRot}deg)`,
                    transformOrigin: 'center center',
                    touchAction: 'none',
                  }}
                  className="pointer-events-auto select-none"
                >
                  {/* Body Drag Area: Sentuh & geser foto secara langsung */}
                  <div
                    onPointerDown={(e) => {
                      setIsSelected(true);
                      setShowDragTip(false);
                      handleBodyPointerDown(e);
                    }}
                    className={`w-full h-full rounded-xl transition-all ${isSelected
                      ? (activeInteractionMode === 'move'
                        ? 'border-2 border-dashed border-stone-900 bg-stone-900/15 cursor-grabbing ring-2 ring-stone-900/20'
                        : 'border-2 border-dashed border-stone-800/80 bg-stone-900/5 hover:bg-stone-900/10 cursor-move')
                      : 'border-2 border-transparent hover:border-dashed hover:border-stone-400/50 cursor-pointer'
                      }`}
                    title={isSelected ? "Tahan dan geser untuk memindahkan posisi foto" : "Ketuk foto untuk mengaktifkan pengaturan"}
                  />

                  {/* Sticker Lucu "Geser & Atur Aku!" (Hanya muncul sebelum user menyentuh foto) */}
                  {!isSelected && showDragTip && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-all duration-300">
                      <div className="flex flex-col items-center gap-1 bg-stone-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-2xl shadow-xl border border-white/20 animate-bounce">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                          <Move className="w-3.5 h-3.5 animate-pulse" />
                          <span>Geser &amp; Atur Aku!</span>
                        </div>
                        <span className="text-[9px] text-stone-300 font-sans">
                          Tarik, putar, atau cubit langsung
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Handles hanya muncul jika strip sedang terseleksi (isSelected === true). Hilang jika klik di luar foto. */}
                  {isSelected && (
                    <>
                      {/* Sudut Kiri-Atas */}
                      <div
                        onPointerDown={(e) => handleScalePointerDown(e, 'tl')}
                        className="absolute -top-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize active:scale-125 transition-transform pointer-events-auto"
                        title="Tarik untuk mengubah ukuran foto"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-stone-900 shadow-md ring-2 ring-stone-900/20" />
                      </div>

                      {/* Sudut Kanan-Atas */}
                      <div
                        onPointerDown={(e) => handleScalePointerDown(e, 'tr')}
                        className="absolute -top-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize active:scale-125 transition-transform pointer-events-auto"
                        title="Tarik untuk mengubah ukuran foto"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-stone-900 shadow-md ring-2 ring-stone-900/20" />
                      </div>

                      {/* Sudut Kiri-Bawah */}
                      <div
                        onPointerDown={(e) => handleScalePointerDown(e, 'bl')}
                        className="absolute -bottom-3.5 -left-3.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize active:scale-125 transition-transform pointer-events-auto"
                        title="Tarik untuk mengubah ukuran foto"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-stone-900 shadow-md ring-2 ring-stone-900/20" />
                      </div>

                      {/* Sudut Kanan-Bawah */}
                      <div
                        onPointerDown={(e) => handleScalePointerDown(e, 'br')}
                        className="absolute -bottom-3.5 -right-3.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize active:scale-125 transition-transform pointer-events-auto"
                        title="Tarik untuk mengubah ukuran foto"
                      >
                        <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-stone-900 shadow-md ring-2 ring-stone-900/20" />
                      </div>

                      {/* Handle Rotasi Atas dengan Batang Sambungan */}
                      <div className="absolute left-1/2 -top-10 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
                        <div
                          onPointerDown={handleRotatePointerDown}
                          className="w-7 h-7 rounded-full bg-stone-900 text-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 active:scale-125 transition-transform border border-white"
                          title="Tarik untuk memutar foto"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </div>
                        <div className="w-0.5 h-3 bg-stone-900/80" />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Panduan Gestur Interaktif yang Menarik & Lucu */}
          {canAdjust ? (
            <div className="w-full mt-3 bg-gradient-to-r from-[#FFFDF9] via-[#FAF6F0] to-[#F5ECE1] border border-[#E7DFD3] rounded-2xl p-3 shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-200/60 text-xs">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cara Atur Posisi Foto Sesukamu</span>
                </span>
                <span className="text-[10px] text-stone-500 font-serif italic">
                  Sentuh langsung di kanvas
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/85 p-2 rounded-xl border border-stone-200/60 shadow-2xs">
                  <div className="flex items-center justify-center gap-1 font-bold text-stone-900 mb-0.5 text-xs">
                    <Move className="w-3.5 h-3.5 text-stone-700" />
                    <span>Geser</span>
                  </div>
                  <p className="text-[10px] text-stone-500">1 Jari / Drag foto ke mana aja</p>
                </div>
                <div className="bg-white/85 p-2 rounded-xl border border-stone-200/60 shadow-2xs">
                  <div className="flex items-center justify-center gap-1 font-bold text-stone-900 mb-0.5 text-xs">
                    <ZoomIn className="w-3.5 h-3.5 text-stone-700" />
                    <span>Ukuran</span>
                  </div>
                  <p className="text-[10px] text-stone-500">Cubit / Tarik bulatan sudut</p>
                </div>
                <div className="bg-white/85 p-2 rounded-xl border border-stone-200/60 shadow-2xs">
                  <div className="flex items-center justify-center gap-1 font-bold text-stone-900 mb-0.5 text-xs">
                    <RotateCw className="w-3.5 h-3.5 text-stone-700" />
                    <span>Putar</span>
                  </div>
                  <p className="text-[10px] text-stone-500">Putar 2 jari / Tarik tombol atas</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full mt-3 p-3 bg-gradient-to-r from-stone-50 via-stone-50/80 to-amber-50/50 rounded-2xl border border-stone-200/80 text-center">
              <p className="text-xs text-stone-800 font-bold flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Ingin foto bisa digeser &amp; diatur sesukamu?</span>
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Buka menu <strong className="text-stone-800">Duplikat Strip</strong> atau <strong className="text-stone-800">Latar Belakang</strong> untuk membuka kanvas interaktif!
              </p>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Panel Kontrol Editor Berformat Dropdown (Collapsible Accordion) */}
        <div className="lg:col-span-6 space-y-3.5">

          {/* Quick Header Controls: Buka Semua / Tutup Semua */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Menu Kustomisasi
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setOpenSections({ filter: true, layoutDuplicate: true, background: true, frame: true, text: true })}
                className="text-stone-500 hover:text-stone-900 font-semibold cursor-pointer transition"
              >
                Buka Semua
              </button>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={() => setOpenSections({ filter: false, layoutDuplicate: false, background: false, frame: false, text: false })}
                className="text-stone-500 hover:text-stone-900 font-semibold cursor-pointer transition"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          {/* 1. Dropdown: Filter Foto */}
          <div className="bg-white border border-[#E7E2DA] rounded-2xl shadow-sm overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('filter')}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-stone-50/70 transition cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800 flex-shrink-0 border border-stone-200">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 leading-tight truncate">
                    Filter Foto
                  </h3>
                  <p className="text-[10px] text-stone-500 font-medium truncate">
                    {FILTERS.length} preset warna vintage, cute, Y2K &amp; noir
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 truncate max-w-[120px]">
                  {selectedFilter.name}
                </span>
                {openSections.filter ? (
                  <ChevronUp className="w-4 h-4 text-stone-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-500" />
                )}
              </div>
            </button>

            {openSections.filter && (
              <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 space-y-3 border-t border-stone-100 animate-fade-in">
                {/* Category Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                  {FILTER_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${filterCategory === cat.id
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Grid of Filter Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                  {displayedFilters.map((f) => {
                    const isSelected = selectedFilter.id === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onSelectFilter(f)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition text-left cursor-pointer ${isSelected
                          ? 'bg-stone-900 border-stone-900 text-white shadow-2xs ring-1 ring-stone-900/40'
                          : 'bg-stone-50/80 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                          }`}
                      >
                        {/* 3-Tone Swatch Box */}
                        <div
                          className="w-4 h-4 rounded-md flex-shrink-0 border border-stone-300 shadow-2xs overflow-hidden flex flex-col"
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
                        <div className="min-w-0">
                          <p className={`truncate text-[11px] font-bold leading-tight ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                            {f.name}
                          </p>
                          <p className={`text-[9px] truncate mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                            {f.badge || 'Filter'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected filter details description */}
                <div className="text-[11px] text-stone-600 bg-stone-100/90 p-2.5 rounded-xl border border-stone-200 flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-stone-500 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <span className="font-semibold text-stone-800">{selectedFilter.name}:</span> {selectedFilter.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Dropdown: Tata Letak & Duplikat Strip (Maks 2) */}
          <div className="bg-white border border-[#E7E2DA] rounded-2xl shadow-sm overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('layoutDuplicate')}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-stone-50/70 transition cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800 flex-shrink-0 border border-stone-200">
                  <Copy className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 leading-tight truncate">
                    Tata Letak &amp; Duplikat Strip (Maks 2)
                  </h3>
                  <p className="text-[10px] text-stone-500 font-medium truncate">
                    {isDuplicateEnabled
                      ? '2 Strip aktif dengan urutan slot acak & efek bayangan'
                      : 'Opsi duplikasi maksimal 2 strip & seret bebas'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border truncate max-w-[120px] ${isDuplicateEnabled
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-stone-100 text-stone-700 border-stone-200'
                  }`}>
                  {isDuplicateEnabled ? '2 Strip Tumpuk' : '1 Strip Normal'}
                </span>
                {openSections.layoutDuplicate ? (
                  <ChevronUp className="w-4 h-4 text-stone-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-500" />
                )}
              </div>
            </button>

            {openSections.layoutDuplicate && (
              <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 space-y-3.5 border-t border-stone-100 animate-fade-in">

                {/* Tips Pose Estetik & Geser Foto */}
                <div className="p-2.5 bg-gradient-to-r from-amber-50/90 via-stone-50 to-orange-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong className="text-amber-900">Tips Seru:</strong> Anda dan teman-teman bisa langsung <strong>menyeret, memutar, dan mencubit fotonya di layar</strong> untuk membuat pose tumpukan kasual seperti menata polaroid asli!
                  </div>
                </div>

                {/* Toggle Duplikat Switch Card */}
                <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-stone-700" />
                      <span>Duplikat Strip Foto (Maks 2)</span>
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                      Menampilkan strip kedua dengan urutan foto teracak alami &amp; bayangan realistis saat bertimpa.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleDuplicate}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isDuplicateEnabled ? 'bg-stone-900' : 'bg-stone-300'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isDuplicateEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {isDuplicateEnabled && (
                  <>
                    {/* Urutan Slot Foto Acak Card */}
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                          <Shuffle className="w-3.5 h-3.5 text-stone-700" />
                          <span>Urutan Slot Foto Strip 2</span>
                        </div>
                        <span className="text-[10px] font-semibold text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                          Acak Alami
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 leading-relaxed">
                        Urutan slot foto strip kedua diacak secara otomatis agar terlihat natural &amp; tidak identik kaku.
                      </p>
                      <button
                        type="button"
                        onClick={handleReshuffleStrip2}
                        className="w-full py-2 px-3 rounded-lg bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 hover:text-stone-900 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-stone-600" />
                        <span>Acak Ulang Urutan Slot Foto 2</span>
                      </button>
                    </div>

                    {/* Tukar Lapisan Tumpukan (Stack Order) */}
                    <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-stone-700" />
                          <span>Lapisan Bayangan Menimpa</span>
                        </p>
                        <p className="text-[10px] text-stone-500">
                          {topStrip === 'strip2'
                            ? 'Strip 2 berada di atas & membayangi Strip 1'
                            : 'Strip 1 berada di atas & membayangi Strip 2'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onChangeTopStrip?.(topStrip === 'strip2' ? 'strip1' : 'strip2')}
                        className="px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-800 hover:bg-stone-100 hover:text-stone-900 text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        Tukar Posisi Tumpukan
                      </button>
                    </div>

                    {/* Preset Cepat Tata Letak 2 Strip */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                        Preset Cepat Tata Letak
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          {
                            label: 'Tumpang Kasual',
                            apply: () => {
                              onChangeStripPosition?.({ x: -16, y: -4 });
                              onChangeStripRotation?.(-3);
                              onChangeStrip2Position?.({ x: 20, y: 8 });
                              onChangeStrip2Rotation?.(4);
                              onChangeTopStrip?.('strip2');
                            },
                          },
                          {
                            label: 'Berdampingan Rapi',
                            apply: () => {
                              onChangeStripPosition?.({ x: -28, y: 0 });
                              onChangeStripRotation?.(0);
                              onChangeStrip2Position?.({ x: 28, y: 0 });
                              onChangeStrip2Rotation?.(0);
                            },
                          },
                          {
                            label: 'Tumpuk Diagonal',
                            apply: () => {
                              onChangeStripPosition?.({ x: -18, y: -14 });
                              onChangeStripRotation?.(-5);
                              onChangeStrip2Position?.({ x: 18, y: 14 });
                              onChangeStrip2Rotation?.(5);
                              onChangeTopStrip?.('strip2');
                            },
                          },
                          {
                            label: 'Pusat Sejajar',
                            apply: () => {
                              onChangeStripPosition?.({ x: -4, y: -4 });
                              onChangeStripRotation?.(-1);
                              onChangeStrip2Position?.({ x: 4, y: 4 });
                              onChangeStrip2Rotation?.(2);
                            },
                          },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={preset.apply}
                            className="px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 text-[11px] font-semibold transition cursor-pointer text-center truncate"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>
            )}
          </div>

          {/* 3. Dropdown: Latar Belakang & Rasio Kanvas */}
          <div className="bg-white border border-[#E7E2DA] rounded-2xl shadow-sm overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('background')}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-stone-50/70 transition cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800 flex-shrink-0 border border-stone-200">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 leading-tight truncate">
                    Latar Belakang &amp; Rasio Kanvas
                  </h3>
                  <p className="text-[10px] text-stone-500 font-medium truncate">
                    Tekstur backdrop &amp; format rasio Story, Kotak, Sinema
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 truncate max-w-[120px]">
                  {selectedBackground?.name}
                </span>
                {openSections.background ? (
                  <ChevronUp className="w-4 h-4 text-stone-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-500" />
                )}
              </div>
            </button>

            {openSections.background && (
              <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 space-y-4 border-t border-stone-100 animate-fade-in">

                {/* Tips Kanvas Luas & Geser Foto */}
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-700 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-stone-600 flex-shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <strong>Kanvas Lebih Luas:</strong> Memilih motif latar akan mengaktifkan mode kanvas luas dan membuka keleluasaan untuk <strong>menggeser serta mengatur ukuran foto</strong>.
                  </div>
                </div>

                {/* 2a. Pilihan Motif Latar Belakang Terlebih Dahulu */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                      1. Pilih Motif Latar Belakang ({BACKGROUNDS.length})
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">
                      {hasBackground ? selectedBackground.name : 'Belum Ada Latar'}
                    </span>
                  </div>

                  {/* Kategori Latar */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                    {BACKGROUND_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setBgCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${bgCategory === cat.id
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                          }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Grid Thumbnail Pilihan Background */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
                    {displayedBackgrounds.map((bg) => {
                      const isSelected = selectedBackground?.id === bg.id;
                      return (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => handleSelectBackground(bg)}
                          title={bg.name}
                          className={`h-14 rounded-xl border transition-all flex flex-col items-center justify-between p-1.5 overflow-hidden relative group cursor-pointer ${isSelected
                            ? 'ring-2 ring-stone-900 scale-105 border-transparent shadow-md'
                            : 'border-stone-300 hover:scale-105 hover:border-stone-400'
                            }`}
                          style={{ background: bg.cssBackground }}
                        >
                          {isSelected && (
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-stone-900 ring-2 ring-white shadow-2xs z-10" />
                          )}

                          <div className="mt-auto w-full bg-black/65 backdrop-blur-xs rounded px-1 py-0.5 text-center">
                            <p className="text-[9px] text-white font-bold truncate leading-tight">
                              {bg.name}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes Bantuan Jika User Memilih Rasio Terlebih Dahulu Sebelum Memilih Motif Latar */}
                {showBgRatioNote && !hasBackground && (
                  <div className="p-3 sm:p-3.5 bg-amber-50/95 border border-amber-300 rounded-xl text-stone-800 text-xs flex items-start gap-2.5 animate-slide-up shadow-xs">
                    <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-bold text-amber-950 text-xs">
                        Pilih Motif Latar Terlebih Dahulu
                      </p>
                      <p className="text-[11px] text-amber-900 leading-relaxed font-sans">
                        Untuk menerapkan rasio kanvas (Story 9:16, Persegi 1:1, Sinema 16:9, dll), silakan pilih salah satu motif latar di atas terlebih dahulu.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBgRatioNote(false)}
                      className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer transition"
                      title="Tutup pesan bantuan"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 2b. Pilihan Rasio Kanvas Latar Belakang */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                      <span>2. Rasio Kanvas Latar Belakang</span>
                    </label>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${hasBackground
                      ? 'text-stone-800 bg-stone-100 border-stone-200'
                      : 'text-amber-800 bg-amber-50 border-amber-200'
                      }`}>
                      {hasBackground
                        ? (BACKGROUND_RATIOS.find(r => r.id === selectedBgRatio)?.name || selectedBgRatio)
                        : 'Pilih latar dahulu'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {BACKGROUND_RATIOS.map((ratio) => {
                      const isSelected = selectedBgRatio === ratio.id && hasBackground;
                      return (
                        <button
                          key={ratio.id}
                          type="button"
                          onClick={() => handleSelectRatio(ratio.id)}
                          title={
                            hasBackground
                              ? ratio.description
                              : `Pilih motif latar terlebih dahulu untuk menggunakan rasio ${ratio.name}`
                          }
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${isSelected
                            ? 'bg-stone-900 border-stone-900 text-white shadow-sm ring-1 ring-stone-900/30'
                            : hasBackground
                              ? 'bg-stone-50/80 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-100'
                              : 'bg-stone-50/60 border-stone-200/60 text-stone-400 hover:bg-amber-50/60 hover:border-amber-300 hover:text-amber-800'
                            }`}
                        >
                          <div className={`h-6 flex items-center justify-center mb-1 transition ${isSelected ? 'text-stone-100' : hasBackground ? 'text-stone-600' : 'text-stone-400'
                            }`}>
                            {getRatioPreview(ratio.id)}
                          </div>
                          <span className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-white' : hasBackground ? 'text-stone-800' : 'text-stone-500'}`}>
                            {ratio.name}
                          </span>
                          <span className={`text-[9px] mt-0.5 truncate max-w-full ${isSelected ? 'text-stone-300' : 'text-stone-400'}`}>
                            {ratio.shortLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2c. Pengatur Ukuran & Posisi Foto di Latar */}
                {selectedBackground && selectedBackground.id !== 'none' && (
                  <div className="pt-2 border-t border-stone-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-stone-700 font-semibold flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-stone-700" />
                        <span>Ukuran Foto di Latar:</span>
                        <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-300">
                          {stripScale}%
                        </span>
                      </span>

                      {/* Slider Ukuran Strip */}
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: 'Kecil', scale: 58 },
                          { label: 'Sedang', scale: 72 },
                          { label: 'Penuh', scale: 88 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => onChangeStripScale?.(preset.scale)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${stripScale === preset.scale
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                              }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-stone-500 font-semibold select-none">Kecil</span>
                      <input
                        type="range"
                        min="50"
                        max="90"
                        step="1"
                        value={stripScale}
                        onChange={(e) => onChangeStripScale?.(Number(e.target.value))}
                        className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                      />
                      <span className="text-[10px] text-stone-500 font-semibold select-none">Besar</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Dropdown: Warna & Gaya Frame Strip */}
          <div className="bg-white border border-[#E7E2DA] rounded-2xl shadow-sm overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('frame')}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-stone-50/70 transition cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800 flex-shrink-0 border border-stone-200">
                  <Film className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 leading-tight truncate">
                    Warna &amp; Gaya Frame Strip
                  </h3>
                  <p className="text-[10px] text-stone-500 font-medium truncate">
                    34 pilihan warna bingkai &amp; film strip klasik
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 truncate max-w-[120px]">
                  {selectedFrame.name}
                </span>
                {openSections.frame ? (
                  <ChevronUp className="w-4 h-4 text-stone-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-500" />
                )}
              </div>
            </button>

            {openSections.frame && (
              <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 space-y-3 border-t border-stone-100 animate-fade-in">
                {/* Frame Category Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                  {FRAME_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFrameCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${frameCategory === cat.id
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Grid Thumbnail Pilihan Frame */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                  {displayedFrames.map((f) => {
                    const isSelected = selectedFrame.id === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => onSelectFrame(f)}
                        title={f.name}
                        className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-left cursor-pointer ${isSelected
                          ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-1 ring-stone-900/40'
                          : 'bg-stone-50/80 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                          }`}
                      >
                        <span
                          className="w-5 h-5 rounded-lg flex-shrink-0 border border-stone-400 shadow-2xs flex items-center justify-center"
                          style={{ background: f.cssBackground }}
                        >
                          {f.hasFilmMarkings && (
                            <span className={`text-[7px] font-mono font-bold ${f.isDark ? 'text-white' : 'text-stone-900'}`}>35</span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[11px] font-bold truncate leading-tight ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                            {f.name}
                          </p>
                          <p className={`text-[9px] truncate mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                            {f.badge}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. Dropdown: Teks Caption & Tanggal */}
          <div className="bg-white border border-[#E7E2DA] rounded-2xl shadow-sm overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('text')}
              className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-stone-50/70 transition cursor-pointer select-none text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-stone-800 flex-shrink-0 border border-stone-200">
                  <Type className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs sm:text-[13px] font-bold text-stone-900 leading-tight truncate">
                    Teks Caption &amp; Tanggal
                  </h3>
                  <p className="text-[10px] text-stone-500 font-medium truncate">
                    Judul studio, ukuran font &amp; tanggal cetak
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  {fontSize}px
                </span>
                {openSections.text ? (
                  <ChevronUp className="w-4 h-4 text-stone-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-500" />
                )}
              </div>
            </button>

            {openSections.text && (
              <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-1 space-y-3.5 border-t border-stone-100 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                    Opsi Tanggal
                  </span>

                  <button
                    type="button"
                    onClick={onToggleShowDate}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${showDate
                      ? 'bg-stone-900 border-stone-900 text-white'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Tampilkan Tanggal</span>
                  </button>
                </div>

                {/* Teks Paten (Tidak Dapat Diedit) */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-stone-100/90 border border-stone-200 rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-stone-900 tracking-wider truncate select-none font-sans">
                      {footerText}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 font-semibold px-2 py-0.5 bg-stone-200 rounded-md border border-stone-300">
                    Teks Paten
                  </span>
                </div>

                {/* Pengatur Ukuran Font (Size Slider & Quick Presets) */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-stone-600 font-medium flex items-center gap-1">
                      <span>Ukuran Teks:</span>
                      <span className="font-bold text-stone-900">{fontSize}px</span>
                    </span>

                    <div className="flex items-center gap-1">
                      {[
                        { label: 'Kecil', size: 16 },
                        { label: 'Sedang', size: 21 },
                        { label: 'Besar', size: 28 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => onChangeFontSize?.(preset.size)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer ${fontSize === preset.size
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                            }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 font-bold select-none">A-</span>
                    <input
                      type="range"
                      min="13"
                      max="34"
                      step="1"
                      value={fontSize}
                      onChange={(e) => onChangeFontSize?.(Number(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                    />
                    <span className="text-sm text-stone-600 font-bold select-none">A+</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 6. Tombol Download & Sesi Baru */}
          <div className="pt-3 space-y-2.5">
            {/* Tombol Download Ultra HD 300 DPI (Fitur Baru) */}
            <button
              onClick={handleDownloadHD}
              disabled={isExportingHD || isSaving}
              className="w-full bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold py-3.5 px-5 rounded-2xl text-sm shadow-md hover:shadow-lg transition flex items-center justify-between cursor-pointer disabled:opacity-80 group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className={`w-4 h-4 text-amber-300 ${isExportingHD ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
                <span className="text-left font-serif font-bold text-sm">
                  {isExportingHD ? 'Memproses Resolusi HD...' : 'Download Ultra HD (.PNG)'}
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-wider uppercase font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30 px-2 py-0.5 rounded-md">
                300 DPI Cetak
              </span>
            </button>

            {/* Download Standar (.PNG) */}
            <button
              onClick={handleDownloadStandard}
              disabled={isSaving || isExportingHD}
              className="w-full bg-white hover:bg-stone-50 active:scale-[0.98] text-stone-800 font-semibold py-3 px-5 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 border border-stone-300 shadow-2xs cursor-pointer disabled:opacity-75"
            >
              <Download className={`w-4 h-4 text-stone-600 ${isSaving ? 'animate-bounce' : ''}`} />
              <span>{isSaving ? 'Menyimpan Foto Standar...' : 'Download Foto Standar (1x)'}</span>
            </button>

            {/* Mulai Sesi Baru */}
            <button
              onClick={onResetSession}
              className="w-full bg-transparent hover:bg-stone-100/70 active:scale-[0.98] text-stone-600 hover:text-stone-900 font-medium py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
              <span>Mulai Sesi Baru dari Awal</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
