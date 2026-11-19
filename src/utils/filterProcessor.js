/**
 * Bulletproof, GPU-accelerated Filter Engine.
 * Uses Canvas Blend Modes (globalCompositeOperation) and standard drawing routines.
 * Guaranteed 100% safe from SecurityError / canvas tainting issues on Safari & WebKit.
 */

// Procedural grain pattern canvas
let cachedGrainCanvas = null;

function getGrainCanvas() {
  if (cachedGrainCanvas) return cachedGrainCanvas;

  try {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(Math.random() * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = Math.floor(Math.random() * 85); // raw film noise
    }

    ctx.putImageData(imgData, 0, 0);
    cachedGrainCanvas = canvas;
    return cachedGrainCanvas;
  } catch (e) {
    return null;
  }
}

/**
 * Apply dramatic studio vignette (spotlight falloff)
 */
export function applyVignette(ctx, x, y, width, height, strength = 0.5) {
  try {
    ctx.save();
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const maxRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);

    const grad = ctx.createRadialGradient(
      centerX, centerY, width * 0.2,
      centerX, centerY, maxRadius
    );

    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.65, `rgba(18, 12, 6, ${strength * 0.35})`);
    grad.addColorStop(1, `rgba(10, 6, 2, ${strength * 0.95})`);

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  } catch (e) {
    console.warn('Vignette draw error:', e);
  }
}

/**
 * Apply vintage textured vertical-striped curtain background
 */
export function applyVerticalCurtain(ctx, x, y, width, height, opacity = 0.08) {
  try {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = opacity;

    const stripeWidth = 14;
    for (let px = x; px < x + width; px += stripeWidth * 2) {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(px, y, stripeWidth, height);
    }
    ctx.restore();
  } catch (e) {
    console.warn('Curtain draw error:', e);
  }
}

/**
 * Apply analog film grain texture
 */
export function applyFilmGrain(ctx, x, y, width, height, opacity = 0.16) {
  try {
    const grain = getGrainCanvas();
    if (!grain) return;

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = opacity;

    const pattern = ctx.createPattern(grain, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(x, y, width, height);
    }
    ctx.restore();
  } catch (e) {
    console.warn('Film grain draw error:', e);
  }
}

/**
 * Safe, GPU-accelerated color grading using blend modes.
 */
export function applyFilterEffects(ctx, x, y, width, height, filterId) {
  if (!filterId || filterId === 'normal') return;

  try {
    ctx.save();

    switch (filterId) {
      // --- RETRO & VINTAGE ---
      case 'night-flash-sepia': {
        // Exact color grading sampled from user reference photo (#382A24, #937B66, #E0D4BB)
        // 1. Muted khaki-sepia taupe tone
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#937b66';
        ctx.globalAlpha = 0.72;
        ctx.fillRect(x, y, width, height);

        // 2. High contrast dark umber shadows (flash contrast)
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#382a24';
        ctx.globalAlpha = 0.52;
        ctx.fillRect(x, y, width, height);

        // 3. Pale creamy highlight lift
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#e0d4bb';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        // 4. Night flash falloff vignette
        applyVignette(ctx, x, y, width, height, 0.62);

        // 5. Fine analog film grain
        applyFilmGrain(ctx, x, y, width, height, 0.22);
        break;
      }

      case '1970s-vintage': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#b45309';
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#78350f';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.7);
        applyFilmGrain(ctx, x, y, width, height, 0.25);
        break;
      }

      case 'kodak-portra': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#fdba74';
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.18);
        break;
      }

      case '90s-gritty-analog': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#573010';
        ctx.globalAlpha = 0.9;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#291809';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.38);
        applyVignette(ctx, x, y, width, height, 0.78);
        break;
      }

      case '90s-curtain-sepia': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#a16207';
        ctx.globalAlpha = 0.75;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#fef08a';
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x, y, width, height);

        applyVerticalCurtain(ctx, x, y, width, height, 0.08);
        applyFilmGrain(ctx, x, y, width, height, 0.2);
        applyVignette(ctx, x, y, width, height, 0.45);
        break;
      }

      case 'fuji-superia': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#065f46';
        ctx.globalAlpha = 0.24;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.22);
        applyVignette(ctx, x, y, width, height, 0.35);
        break;
      }

      case '80s-vhs': {
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#991b1b';
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.28);
        applyVignette(ctx, x, y, width, height, 0.55);
        break;
      }

      case '8mm-retro': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#92400e';
        ctx.globalAlpha = 0.65;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#451a03';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.35);
        applyVignette(ctx, x, y, width, height, 0.85);
        break;
      }

      case '60s-technicolor': {
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#ea580c';
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.35);
        break;
      }

      case 'warm-vintage': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#f59e0b';
        ctx.globalAlpha = 0.65;
        ctx.fillRect(x, y, width, height);
        applyFilmGrain(ctx, x, y, width, height, 0.16);
        break;
      }

      case 'faded-polaroid': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#fef3c7';
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x, y, width, height);
        applyFilmGrain(ctx, x, y, width, height, 0.2);
        break;
      }

      case 'sepia-classic': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#92400e';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(x, y, width, height);
        applyVignette(ctx, x, y, width, height, 0.45);
        applyFilmGrain(ctx, x, y, width, height, 0.18);
        break;
      }

      case 'cinematic-teal': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#0e7490';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);
        applyVignette(ctx, x, y, width, height, 0.4);
        applyFilmGrain(ctx, x, y, width, height, 0.15);
        break;
      }

      // --- Y2K MILLENNIUM ---
      case 'y2k-digicam': {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#93c5fd';
        ctx.globalAlpha = 0.16;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'cool-y2k': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#06b6d4';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'y2k-glam': {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#f472b6';
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#ec4899';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'y2k-bubblegum': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#db2777';
        ctx.globalAlpha = 0.32;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#f472b6';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'y2k-frosted': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#38bdf8';
        ctx.globalAlpha = 0.38;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#bae6fd';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'y2k-matrix': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#15803d';
        ctx.globalAlpha = 0.42;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.6);
        break;
      }

      case 'y2k-silver': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#cbd5e1';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.4);
        break;
      }

      case 'tokyo-neon': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#d946ef';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'soft-glow': {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#f472b6';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(x, y, width, height);
        break;
      }

      // --- HITAM PUTIH & MONOCHROME ---
      case 'bw-classic': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1.0;
        ctx.fillRect(x, y, width, height);
        applyFilmGrain(ctx, x, y, width, height, 0.14);
        break;
      }

      case 'bw-noir': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1.0;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.65);
        applyFilmGrain(ctx, x, y, width, height, 0.22);
        break;
      }

      case 'dramatic-gold-noir': {
        // Color grading sampled from user reference photo (#0C0A0B, #585141, #938B77, #C3B8A2)
        // 1. Warm antique champagne-gold monochrome tint
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#9b8e78';
        ctx.globalAlpha = 0.60;
        ctx.fillRect(x, y, width, height);

        // 2. High contrast noir overlay for deep black shadows and leather jacket sheen
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#14120e';
        ctx.globalAlpha = 0.58;
        ctx.fillRect(x, y, width, height);

        // 3. Champagne gold highlight lift
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#c8bd9f';
        ctx.globalAlpha = 0.38;
        ctx.fillRect(x, y, width, height);

        // 4. Dramatic spotlight / noir vignette
        applyVignette(ctx, x, y, width, height, 0.68);

        // 5. Crisp analog film grain
        applyFilmGrain(ctx, x, y, width, height, 0.20);
        break;
      }

      case 'monochrome-grain': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1.0;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.38);
        applyVignette(ctx, x, y, width, height, 0.45);
        break;
      }

      default:
        break;
    }

    ctx.restore();
  } catch (e) {
    console.warn('Filter processing error:', e);
  }
}
