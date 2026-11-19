/**
 * Utility for robust photo saving & downloading across Mobile (iOS/Android) and Desktop browsers
 */

export function isMobileDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isTouch = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIPadOS = /Macintosh/i.test(ua) && isTouch; // iPadOS reports as Mac
  return Boolean(isMobileUA || isIPadOS);
}

export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/png';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

export async function canvasToBlob(canvas) {
  if (!canvas) return null;
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(dataUrlToBlob(canvas.toDataURL('image/png')));
        }
      }, 'image/png');
    } else {
      resolve(dataUrlToBlob(canvas.toDataURL('image/png')));
    }
  });
}

/**
 * Main Save / Download function:
 * - On Mobile (iOS Safari / Android): Uses Web Share API (Files) so photo is directly saved
 *   into the user's Camera Roll / Gallery (Simpan Gambar ke Foto).
 * - On Desktop or Fallback: Uses a robust Blob Object URL download.
 */
export async function saveOrSharePhoto({
  canvas = null,
  dataUrl = null,
  filename = 'gophotobooth.png',
  forceDownload = false,
}) {
  let blob = null;

  if (canvas) {
    blob = await canvasToBlob(canvas);
  } else if (dataUrl) {
    blob = dataUrlToBlob(dataUrl);
  }

  if (!blob) {
    throw new Error('Tidak ada data gambar yang valid untuk disimpan.');
  }

  const file = new File([blob], filename, { type: 'image/png' });
  const isMobile = isMobileDevice();

  // 1. Try Native Web Share API with File on Mobile Devices
  // This opens the native iOS / Android share sheet with 1-tap "Save Image" to Camera Roll
  if (!forceDownload && isMobile && typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Foto GoPhotobooth',
        text: 'Hasil foto dari GoPhotobooth Studio',
      });
      return { success: true, method: 'share' };
    } catch (err) {
      // User tapped cancel/close in native share sheet: that's not a technical error
      if (err.name === 'AbortError') {
        return { success: true, method: 'share', cancelled: true };
      }
      // If native sharing failed for technical reasons, smoothly fallback to blob download
      console.warn('Native share failed, falling back to direct blob download:', err);
    }
  }

  // 2. Direct Blob URL Download (Standard Desktop & Fallback)
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();

  // Safely cleanup URL after delay
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(blobUrl);
  }, 60000);

  return { success: true, method: 'download' };
}
