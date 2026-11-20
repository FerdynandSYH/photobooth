/**
 * Renders captured photos, background backdrop, frame, footer text, and date
 * into a single high-resolution HTML5 Canvas with bulletproof filter processing,
 * customizable typography, rich image texture backgrounds, and optional
 * duplicated strip with randomized photo slots and realistic drop shadows.
 */

import { applyFilterEffects } from './filterProcessor';

// Format date to DD.MM.YYYY
export function formatCurrentDate(date = new Date()) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Helper to draw rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Background image cache
const bgImageCache = new Map();

function loadBackgroundImage(url) {
  if (bgImageCache.has(url)) {
    return Promise.resolve(bgImageCache.get(url));
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Draw background backdrop (surface behind the photo strip frame)
 */
async function drawBackdrop(ctx, background, width, height) {
  if (!background || background.id === 'none') return;

  if (background.type === 'image' && background.imageUrl) {
    const bgImg = await loadBackgroundImage(background.imageUrl);
    if (bgImg) {
      const targetAspect = width / height;
      const imgAspect = bgImg.width / bgImg.height;
      let sx = 0, sy = 0, sw = bgImg.width, sh = bgImg.height;
      if (imgAspect > targetAspect) {
        sw = bgImg.height * targetAspect;
        sx = (bgImg.width - sw) / 2;
      } else {
        sh = bgImg.width / targetAspect;
        sy = (bgImg.height - sh) / 2;
      }
      ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
      return;
    }
  }

  if (background.type === 'color') {
    ctx.fillStyle = background.bgValue || '#F5EFE6';
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'gradient') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#78350f');
    grad.addColorStop(0.5, '#451a03');
    grad.addColorStop(1, '#1c1917');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === 'pattern') {
    ctx.fillStyle = background.bgValue || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (background.patternType === 'checkered') {
      const size = 32;
      ctx.fillStyle = background.secondaryColor || '#E2E8F0';
      for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
          if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) {
            ctx.fillRect(x, y, size, size);
          }
        }
      }
    }
  } else {
    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Draw authentic 35mm film markings on the borders of the photo strip
 */
function drawFilmStripMarkings(ctx, stripX, stripY, stripWidth, stripHeight, rows, photoHeight, gap, margin, isDark = true) {
  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(0, 0, 0, 0.72)';
  ctx.font = '700 9px monospace, sans-serif';
  ctx.textAlign = 'center';

  const leftX = stripX + margin / 2;
  const rightX = stripX + stripWidth - margin / 2;

  // Markings on Left Margin
  for (let r = 0; r < rows; r++) {
    const frameNum = 28 + r;
    const slotCenterY = stripY + margin + r * (photoHeight + gap) + photoHeight / 2;

    ctx.save();
    ctx.translate(leftX, slotCenterY - 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${frameNum}`, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(leftX, slotCenterY + 30);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`> ${frameNum}A`, 0, 0);
    ctx.restore();
  }

  // Markings on Right Margin (Kodak TX 5063 code)
  for (let r = 0; r < rows; r++) {
    const slotCenterY = stripY + margin + r * (photoHeight + gap) + photoHeight / 2;

    ctx.save();
    ctx.translate(rightX, slotCenterY);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('TX 5063', 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

// Offscreen bitmap cache for ultra-smooth 60+ FPS manipulation
const stripBitmapCache = new Map();

function getStripCacheKey({
  photos,
  layout,
  frame,
  filterConfig,
  fontConfig,
  footerText = '',
  fontSize = 21,
  showDate = true,
  customDate = '',
}) {
  const photoKeys = photos
    ? photos.map(p => (p?.dataUrl ? p.dataUrl.slice(0, 80) + '_' + p.dataUrl.length : (p?.id || ''))).join('|')
    : '';
  return [
    photoKeys,
    layout?.name || layout?.photoCount || '',
    layout?.cols || '',
    layout?.rows || '',
    frame?.id || '',
    frame?.bgValue || '',
    filterConfig?.id || '',
    filterConfig?.filterValue || '',
    fontConfig?.id || '',
    footerText,
    fontSize,
    showDate ? '1' : '0',
    customDate,
  ].join(':::');
}

/**
 * Compiles a strip (frame, film markings, photos with filters, footer text)
 * into an offscreen canvas. Once compiled, moving/rotating/scaling the strip
 * uses hardware-accelerated drawImage, eliminating all CPU pixel looping and lag!
 */
async function compileStripBitmap({
  photos,
  layout,
  frame,
  filterConfig,
  fontConfig,
  footerText = 'GOPHOTOBOOTH STUDIO',
  fontSize = 21,
  showDate = true,
  customDate = '',
  stripWidth,
  stripHeight,
}) {
  const {
    cols = 1,
    rows = 3,
    photoWidth = 460,
    photoHeight = 335,
    gap = 16,
    margin = 28,
    footerHeight = 85,
  } = layout;

  const offscreen = document.createElement('canvas');
  offscreen.width = stripWidth;
  offscreen.height = stripHeight;
  const ctx = offscreen.getContext('2d');

  // 1. Photo Strip Frame Body
  ctx.save();
  drawRoundedRect(ctx, 0, 0, stripWidth, stripHeight, 10);
  ctx.fillStyle = frame.bgValue || '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // 2. Film Markings if 35mm film frame
  if (frame.hasFilmMarkings) {
    drawFilmStripMarkings(ctx, 0, 0, stripWidth, stripHeight, rows, photoHeight, gap, margin, frame.isDark);
  }

  // 3. Render Each Photo Slot
  for (let index = 0; index < layout.photoCount; index++) {
    const col = index % cols;
    const row = Math.floor(index / cols);

    const x = margin + col * (photoWidth + gap);
    const y = margin + row * (photoHeight + gap);

    const photo = photos[index];

    ctx.save();
    drawRoundedRect(ctx, x, y, photoWidth, photoHeight, 6);
    ctx.clip();

    if (photo && (photo.canvas || photo.dataUrl || photo.image)) {
      let imgSource = photo.canvas;
      if (!imgSource) {
        imgSource = await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = photo.dataUrl;
        });
      }

      if (imgSource) {
        const srcW = imgSource.width || 640;
        const srcH = imgSource.height || 480;
        const targetAspect = photoWidth / photoHeight;
        const srcAspect = srcW / srcH;

        let sx = 0, sy = 0, sw = srcW, sh = srcH;
        if (srcAspect > targetAspect) {
          sw = srcH * targetAspect;
          sx = (srcW - sw) / 2;
        } else {
          sh = srcW / targetAspect;
          sy = (srcH - sh) / 2;
        }

        const activeFilter = filterConfig || photo.filterConfig;
        if (activeFilter && activeFilter.filterValue && activeFilter.filterValue !== 'none') {
          try {
            ctx.filter = activeFilter.filterValue;
          } catch (e) {}
        }

        ctx.drawImage(imgSource, sx, sy, sw, sh, x, y, photoWidth, photoHeight);
        ctx.filter = 'none';

        if (activeFilter && activeFilter.id !== 'normal') {
          applyFilterEffects(ctx, x, y, photoWidth, photoHeight, activeFilter.id);
        }
      }
    } else {
      ctx.fillStyle = frame.isDark ? '#27272A' : '#F1F5F9';
      ctx.fillRect(x, y, photoWidth, photoHeight);
      ctx.fillStyle = frame.isDark ? '#52525B' : '#94A3B8';
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Foto #${index + 1}`, x + photoWidth / 2, y + photoHeight / 2);
    }

    ctx.restore();

    // Subtle 1.5px border around each photo
    ctx.save();
    drawRoundedRect(ctx, x, y, photoWidth, photoHeight, 6);
    ctx.strokeStyle = frame.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // 4. Render Footer Info (Caption & Date)
  const footerCenterY = stripHeight - (footerHeight / 2);
  const stripCenterX = stripWidth / 2;
  const textColor = frame.textColor || (frame.isDark ? '#FFFFFF' : '#1E293B');
  const subtextColor = frame.subtextColor || (frame.isDark ? '#94A3B8' : '#64748B');

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = textColor;

  const activeFontFamily = fontConfig?.fontFamily || '"Plus Jakarta Sans", sans-serif';
  const activeFontWeight = fontConfig?.fontWeight || '800';

  const displayTitle = (footerText || 'GOPHOTOBOOTH STUDIO').toUpperCase();
  const baseFontSize = fontSize || 21;
  ctx.font = `${activeFontWeight} ${baseFontSize}px ${activeFontFamily}`;
  ctx.letterSpacing = fontConfig?.id === 'romantic-script' ? '0px' : '2.5px';
  ctx.shadowColor = frame.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 4;
  const titleOffsetY = showDate ? (baseFontSize > 24 ? 9 : 7) : 0;
  ctx.fillText(displayTitle, stripCenterX, footerCenterY - titleOffsetY);

  if (showDate) {
    const displayDate = customDate || formatCurrentDate();
    ctx.font = `600 12px "Plus Jakarta Sans", sans-serif`;
    ctx.letterSpacing = '1.5px';
    ctx.fillStyle = subtextColor;
    ctx.fillText(`${displayDate} • MEMORIES`, stripCenterX, footerCenterY + 16);
  }
  ctx.restore();

  return offscreen;
}

/**
 * Render a single complete photobooth strip at given position and rotation with shadow
 */
async function drawSingleStrip(ctx, {
  photos,
  layout,
  frame,
  filterConfig,
  fontConfig,
  footerText = 'GOPHOTOBOOTH STUDIO',
  fontSize = 21,
  showDate = true,
  customDate = '',
  stripX,
  stripY,
  stripWidth,
  stripHeight,
  rotation = 0,
  scale = 1,
  hasShadow = true,
}) {
  const cacheKey = getStripCacheKey({
    photos,
    layout,
    frame,
    filterConfig,
    fontConfig,
    footerText,
    fontSize,
    showDate,
    customDate,
  });

  let stripBitmap = stripBitmapCache.get(cacheKey);
  if (!stripBitmap) {
    stripBitmap = await compileStripBitmap({
      photos,
      layout,
      frame,
      filterConfig,
      fontConfig,
      footerText,
      fontSize,
      showDate,
      customDate,
      stripWidth,
      stripHeight,
    });
    if (stripBitmapCache.size > 24) {
      const oldestKey = stripBitmapCache.keys().next().value;
      stripBitmapCache.delete(oldestKey);
    }
    stripBitmapCache.set(cacheKey, stripBitmap);
  }

  ctx.save();

  // Rotate & scale around center of the strip
  const centerX = stripX + stripWidth / 2;
  const centerY = stripY + stripHeight / 2;
  ctx.translate(centerX, centerY);
  if (rotation) {
    ctx.rotate((rotation * Math.PI) / 180);
  }
  if (scale && scale !== 1) {
    ctx.scale(scale, scale);
  }
  ctx.translate(-stripWidth / 2, -stripHeight / 2);

  // 1. Realistic 3D drop shadow (casts on background and on any overlapping strip beneath)
  if (hasShadow) {
    ctx.save();
    // Ambient soft blur shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 38;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = frame.bgValue || '#FFFFFF';
    drawRoundedRect(ctx, 0, 0, stripWidth, stripHeight, 10);
    ctx.fill();

    // Directional contact shadow for sharp overlap definition
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, 0, 0, stripWidth, stripHeight, 10);
    ctx.fill();
    ctx.restore();
  }

  // 2. Hardware-accelerated draw of the pre-compiled strip bitmap
  ctx.drawImage(stripBitmap, 0, 0);

  ctx.restore();
}

/**
 * Compute virtual canvas width and height deterministically
 */
export function getCanvasDimensions({
  layout,
  background = null,
  bgAspectRatio = 'auto',
  stripScale = 72,
  isDuplicateEnabled = false,
}) {
  const {
    cols = 1,
    rows = 3,
    photoWidth = 460,
    photoHeight = 335,
    gap = 16,
    margin = 28,
    footerHeight = 85,
  } = layout || {};

  const stripWidth = (cols * photoWidth) + ((cols - 1) * gap) + (margin * 2);
  const stripHeight = (rows * photoHeight) + ((rows - 1) * gap) + (margin * 2) + footerHeight;

  const hasBackground = background && background.id !== 'none';
  const isDuplicate = Boolean(isDuplicateEnabled);

  const boundingStripWidth = isDuplicate ? Math.round(stripWidth * 1.58) : stripWidth;
  const boundingStripHeight = isDuplicate ? Math.round(stripHeight * 1.15) : stripHeight;

  let totalWidth = boundingStripWidth;
  let totalHeight = boundingStripHeight;

  if (hasBackground) {
    const scale = Math.max(0.48, Math.min(0.92, (stripScale || 72) / 100));

    const RATIO_VALUES = {
      '9:16': 9 / 16,
      '1:1': 1,
      '16:9': 16 / 9,
      '4:3': 4 / 3,
      '3:4': 3 / 4,
    };

    const targetRatio = RATIO_VALUES[bgAspectRatio] || null;

    if (targetRatio) {
      const boundRatio = boundingStripWidth / boundingStripHeight;
      if (boundRatio > targetRatio) {
        totalWidth = Math.round(boundingStripWidth / scale);
        totalHeight = Math.round(totalWidth / targetRatio);
      } else {
        totalHeight = Math.round(boundingStripHeight / scale);
        totalWidth = Math.round(totalHeight * targetRatio);
      }
    } else {
      // Auto: adaptive padding
      if (boundingStripWidth > boundingStripHeight) {
        totalWidth = Math.round(boundingStripWidth / scale);
        const padX = Math.round((totalWidth - boundingStripWidth) / 2);
        const padY = Math.max(50, Math.round(padX * 0.72));
        totalHeight = boundingStripHeight + (padY * 2);
      } else {
        totalHeight = Math.round(boundingStripHeight / scale);
        const padY = Math.round((totalHeight - boundingStripHeight) / 2);
        const padX = Math.max(50, Math.round(padY * 0.72));
        totalWidth = boundingStripWidth + (padX * 2);
      }
    }
  } else {
    // Tanpa background: if duplicated, give comfortable room for both strips with subtle drop shadow
    if (isDuplicate) {
      totalWidth = Math.round(boundingStripWidth + 90);
      totalHeight = Math.round(boundingStripHeight + 80);
    } else {
      totalWidth = stripWidth;
      totalHeight = stripHeight;
    }
  }

  return {
    stripWidth,
    stripHeight,
    totalWidth,
    totalHeight,
  };
}

/**
 * Main render function with support for single or duplicated (max 2) strips
 */
export async function renderPhotoboothCanvas({
  photos,
  layout,
  frame,
  background = null,
  bgAspectRatio = 'auto',
  filterConfig = null,
  fontConfig = null,
  footerText = 'GOPHOTOBOOTH STUDIO',
  fontSize = 21,
  stripScale = 72,
  stripPosition = { x: 0, y: 0 },
  stripRotation = 0,
  strip1Scale = 1,
  showDate = true,
  customDate = '',
  // Duplication options (max 2 strips with randomized order)
  isDuplicateEnabled = false,
  strip2Photos = null,
  strip2Position = { x: 22, y: 10 },
  strip2Rotation = 4,
  strip2Scale = 1,
  topStrip = 'strip2',
  targetCanvas = null,
}) {
  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch (e) {}
  }

  const canvas = targetCanvas || document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const {
    stripWidth,
    stripHeight,
    totalWidth,
    totalHeight,
  } = getCanvasDimensions({
    layout,
    background,
    bgAspectRatio,
    stripScale,
    isDuplicateEnabled,
  });

  const hasBackground = background && background.id !== 'none';
  const isDuplicate = Boolean(isDuplicateEnabled);

  canvas.width = totalWidth;
  canvas.height = totalHeight;

  try {
    // 3. Render Background Backdrop (surface behind strips)
    if (hasBackground) {
      await drawBackdrop(ctx, background, totalWidth, totalHeight);
    }

    // Calculate strip placement coordinates
    const baseCenterX = Math.round((totalWidth - stripWidth) / 2);
    const baseCenterY = Math.round((totalHeight - stripHeight) / 2);
    
    // Max displacement limits (allows intuitive dragging across the canvas)
    const maxShiftX = Math.round(Math.max(160, totalWidth * 0.38));
    const maxShiftY = Math.round(Math.max(160, totalHeight * 0.32));

    // Strip 1 coordinates
    const s1PosX = Math.max(-100, Math.min(100, stripPosition?.x ?? (isDuplicate ? -16 : 0)));
    const s1PosY = Math.max(-100, Math.min(100, stripPosition?.y ?? (isDuplicate ? -4 : 0)));
    const strip1X = baseCenterX + Math.round((s1PosX / 100) * maxShiftX);
    const strip1Y = baseCenterY + Math.round((s1PosY / 100) * maxShiftY);
    const s1Rot = stripRotation !== undefined ? stripRotation : (isDuplicate ? -3 : 0);

    // Common strip configuration
    const commonStripProps = {
      layout,
      frame,
      filterConfig,
      fontConfig,
      footerText,
      fontSize,
      showDate,
      customDate,
      stripWidth,
      stripHeight,
      hasShadow: hasBackground || isDuplicate,
    };

    const s1Scale = Math.max(0.5, Math.min(1.8, strip1Scale !== undefined ? strip1Scale : 1));
    const s2Scale = Math.max(0.5, Math.min(1.8, strip2Scale !== undefined ? strip2Scale : 1));

    if (!isDuplicate) {
      // Single Strip Mode:
      // Jika tanpa background, strip diam di (0, 0) tanpa pergeseran atau rotasi
      // Jika dengan background, posisi dan ukuran dapat disesuaikan di atas backdrop
      const finalS1X = hasBackground ? strip1X : 0;
      const finalS1Y = hasBackground ? strip1Y : 0;
      const finalS1Rot = hasBackground ? s1Rot : 0;
      const finalS1Scale = hasBackground ? s1Scale : 1;

      await drawSingleStrip(ctx, {
        ...commonStripProps,
        photos,
        stripX: finalS1X,
        stripY: finalS1Y,
        rotation: finalS1Rot,
        scale: finalS1Scale,
        hasShadow: hasBackground,
      });
    } else {
      // Duplicated Mode (Max 2 Strips)
      // Strip 2 coordinates
      const s2PosX = Math.max(-100, Math.min(100, strip2Position?.x ?? 20));
      const s2PosY = Math.max(-100, Math.min(100, strip2Position?.y ?? 8));
      const strip2X = baseCenterX + Math.round((s2PosX / 100) * maxShiftX);
      const strip2Y = baseCenterY + Math.round((s2PosY / 100) * maxShiftY);
      const s2Rot = strip2Rotation !== undefined ? strip2Rotation : 4;

      const finalStrip2Photos = strip2Photos && strip2Photos.length === photos.length
        ? strip2Photos
        : photos;

      // Draw bottom strip first, then top strip so the top strip casts shadow on the bottom
      if (topStrip === 'strip1') {
        // Strip 2 underneath
        await drawSingleStrip(ctx, {
          ...commonStripProps,
          photos: finalStrip2Photos,
          stripX: strip2X,
          stripY: strip2Y,
          rotation: s2Rot,
          scale: s2Scale,
        });
        // Strip 1 on top with shadow casting over Strip 2
        await drawSingleStrip(ctx, {
          ...commonStripProps,
          photos,
          stripX: strip1X,
          stripY: strip1Y,
          rotation: s1Rot,
          scale: s1Scale,
        });
      } else {
        // Strip 1 underneath
        await drawSingleStrip(ctx, {
          ...commonStripProps,
          photos,
          stripX: strip1X,
          stripY: strip1Y,
          rotation: s1Rot,
          scale: s1Scale,
        });
        // Strip 2 on top with shadow casting over Strip 1
        await drawSingleStrip(ctx, {
          ...commonStripProps,
          photos: finalStrip2Photos,
          stripX: strip2X,
          stripY: strip2Y,
          rotation: s2Rot,
          scale: s2Scale,
        });
      }
    }

  } catch (err) {
    console.error('Error rendering photobooth canvas:', err);
  }

  return canvas;
}
