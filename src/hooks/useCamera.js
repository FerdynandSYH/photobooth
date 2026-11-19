import { useState, useEffect, useRef, useCallback } from 'react';

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [isMirror, setIsMirror] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState('idle'); // 'idle' | 'loading' | 'granted' | 'denied' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Check if device has multiple video input devices
  const checkDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  }, []);

  // Stop current stream tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopStream();
    setPermissionStatus('loading');
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('error');
      setErrorMessage('Browser ini tidak mendukung akses kamera (MediaDevices API). Pastikan menggunakan browser modern.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn('Video play error:', e));
        };
      }

      setPermissionStatus('granted');
      checkDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setErrorMessage('Akses kamera ditolak oleh browser. Silakan izinkan izin kamera di pengaturan browser atau ikon gembok pada URL bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionStatus('error');
        setErrorMessage('Perangkat kamera tidak ditemukan. Pastikan webcam/kamera terpasang dengan baik.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionStatus('error');
        setErrorMessage('Kamera sedang digunakan oleh aplikasi lain (Zoom, Google Meet, dll). Tutup aplikasi tersebut dan coba lagi.');
      } else {
        setPermissionStatus('error');
        setErrorMessage(`Gagal mengakses kamera: ${err.message || 'Terjadi kesalahan tidak terduga'}`);
      }
    }
  }, [facingMode, stopStream, checkDevices]);

  // Ref callback to ensure video element always receives the stream
  const setVideoRef = useCallback((videoEl) => {
    videoRef.current = videoEl;
    if (videoEl && streamRef.current) {
      if (videoEl.srcObject !== streamRef.current) {
        videoEl.srcObject = streamRef.current;
      }
      videoEl.play().catch(e => console.warn('Video play error:', e));
    }
  }, []);

  // Toggle facing mode (depan / belakang)
  const toggleFacingMode = useCallback(() => {
    setFacingMode(prev => {
      const next = prev === 'user' ? 'environment' : 'user';
      setIsMirror(next === 'user');
      return next;
    });
  }, []);

  // Toggle mirror manual
  const toggleMirror = useCallback(() => {
    setIsMirror(prev => !prev);
  }, []);

  // Capture single frame from video element with exact viewfinder aspect ratio
  const captureFrame = useCallback((filterConfig = null) => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    // Viewfinder aspect ratio is 4:3
    const targetRatio = 4 / 3;
    let cropW = vw;
    let cropH = vh;
    if (vw / vh > targetRatio) {
      cropW = vh * targetRatio;
    } else {
      cropH = vw / targetRatio;
    }

    const cropX = Math.round((vw - cropW) / 2);
    const cropY = Math.round((vh - cropH) / 2);
    const sW = Math.round(cropW);
    const sH = Math.round(cropH);

    const canvas = document.createElement('canvas');
    canvas.width = sW;
    canvas.height = sH;
    const ctx = canvas.getContext('2d');

    ctx.save();
    if (isMirror) {
      ctx.translate(sW, 0);
      ctx.scale(-1, 1);
    }
    // Crop only the visible viewfinder area so face is NEVER squished
    ctx.drawImage(video, cropX, cropY, sW, sH, 0, 0, sW, sH);
    ctx.restore();

    return {
      canvas,
      dataUrl: canvas.toDataURL('image/jpeg', 0.95),
      width: sW,
      height: sH,
      filterConfig,
      capturedAt: Date.now(),
    };
  }, [isMirror]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    videoRef,
    setVideoRef,
    streamRef,
    facingMode,
    isMirror,
    permissionStatus,
    errorMessage,
    hasMultipleCameras,
    startCamera,
    stopStream,
    toggleFacingMode,
    toggleMirror,
    captureFrame,
  };
}
