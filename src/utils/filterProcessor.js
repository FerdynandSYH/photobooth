/**
 * Bulletproof, GPU-accelerated Filter Engine.
 * Uses standard Canvas Blend Modes (globalCompositeOperation) and procedural grain.
 * 100% independent of ctx.filter string to guarantee identical rendering across
 * Chrome, Firefox, Safari desktop, and iOS Safari WebKit without state bleed or tainting.
 */

// Procedural grain pattern canvas (cached offscreen, deterministic to prevent flickering)
let cachedGrainCanvas = null;

function getGrainCanvas() {
  if (cachedGrainCanvas) return cachedGrainCanvas;

  try {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // Deterministic Linear Congruential Generator (LCG) for stable, non-flickering noise
    let seed = 1234567;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < data.length; i += 4) {
      const val = Math.floor(lcg() * 255);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = Math.floor(lcg() * 70); // raw analog film noise
    }

    ctx.putImageData(imgData, 0, 0);
    cachedGrainCanvas = canvas;
    return cachedGrainCanvas;
  } catch (e) {
    return null;
  }
}

/**
 * Apply dramatic studio vignette (spotlight falloff) with strict state isolation
 */
export function applyVignette(ctx, x, y, width, height, strength = 0.5) {
  ctx.save();
  try {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const maxRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);

    const grad = ctx.createRadialGradient(
      centerX, centerY, width * 0.18,
      centerX, centerY, maxRadius
    );

    const s = Math.max(0, Math.min(1, strength));
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.60, `rgba(18, 12, 6, ${s * 0.35})`);
    grad.addColorStop(1, `rgba(10, 6, 2, ${s * 0.95})`);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width, height);
  } catch (e) {
    console.warn('Vignette draw error:', e);
  } finally {
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }
}

/**
 * Apply analog film grain texture locked to coordinates to prevent jitter on drag/rotate
 */
export function applyFilmGrain(ctx, x, y, width, height, opacity = 0.16) {
  ctx.save();
  try {
    const grain = getGrainCanvas();
    if (!grain) return;

    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    // Clip to exact slot area
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Lock pattern coordinates to (x, y) so grain texture moves stably with the photo
    ctx.translate(x, y);
    const pattern = ctx.createPattern(grain, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }
  } catch (e) {
    console.warn('Film grain draw error:', e);
  } finally {
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }
}

/**
 * Apply subtle retro photo booth curtain lighting folds
 * Fixed bug: uses delicate soft-light waves instead of harsh black bars across faces
 */
export function applyVerticalCurtain(ctx, x, y, width, height) {
  ctx.save();
  try {
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    const foldPeriod = Math.max(32, Math.round(width / 10));
    const grad = ctx.createLinearGradient(x, 0, x + foldPeriod, 0);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.07)');
    grad.addColorStop(0.5, 'rgba(120, 53, 15, 0.05)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.07)');

    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = grad;

    for (let px = x; px < x + width; px += foldPeriod) {
      ctx.fillRect(px, y, foldPeriod, height);
    }
  } catch (e) {
    console.warn('Curtain draw error:', e);
  } finally {
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }
}

/**
 * Safe, cross-browser color grading engine using mathematically calibrated canvas blend modes.
 * Completely immune to ctx.filter Safari WebKit bugs and guaranteed 100% state-isolated.
 */
export function applyFilterEffects(ctx, x, y, width, height, filterId) {
  if (!filterId || filterId === 'normal') return;

  ctx.save();
  try {
    switch (filterId) {
      // ==========================================
      // PRESET BARU 1: Rosy Coquette (Cute Cewek)
      // ==========================================
      case 'rosy-coquette': {
        // Glowing bright base lift (tidak membuat wajah gelap)
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fdf2f8';
        ctx.globalAlpha = 0.20;
        ctx.fillRect(x, y, width, height);

        // Soft rosy-peach warm blush
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#fda4af';
        ctx.globalAlpha = 0.42;
        ctx.fillRect(x, y, width, height);

        // Blushing skin tone pop
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#fb7185';
        ctx.globalAlpha = 0.16;
        ctx.fillRect(x, y, width, height);
        break;
      }

      // ==========================================
      // PRESET BARU 2: Strawberry Milk (Cute & Dreamy)
      // ==========================================
      case 'strawberry-milk': {
        // Faded creamy shadow wash (low contrast aesthetic)
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#ffe4e6';
        ctx.globalAlpha = 0.26;
        ctx.fillRect(x, y, width, height);

        // Sweet strawberry pastel tint
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#f472b6';
        ctx.globalAlpha = 0.34;
        ctx.fillRect(x, y, width, height);

        // Dreamy milky pastel tint
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#fbcfe8';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        // Ultra-fine aesthetic noise
        applyFilmGrain(ctx, x, y, width, height, 0.10);
        break;
      }

      // ==========================================
      // PRESET BARU 3: 90s Warm Vintage
      // ==========================================
      case '90s-warm-vintage': {
        // Amber golden warmth
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#f59e0b';
        ctx.globalAlpha = 0.50;
        ctx.fillRect(x, y, width, height);

        // Analog film color tint
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#d97706';
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x, y, width, height);

        // Warm paper multiply
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = '#fef3c7';
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, y, width, height);

        // Lifted darks so skin tone is safe
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#292524';
        ctx.globalAlpha = 0.10;
        ctx.fillRect(x, y, width, height);

        // Vignette lembut & film grain
        applyVignette(ctx, x, y, width, height, 0.42);
        applyFilmGrain(ctx, x, y, width, height, 0.18);
        break;
      }

      // ==========================================
      // PRESET BARU 4: Retro Frame Vignette
      // ==========================================
      case 'retro-frame-vignette': {
        // Warm retro brown ambience
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#b45309';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        // Vintage tone wash
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#78350f';
        ctx.globalAlpha = 0.20;
        ctx.fillRect(x, y, width, height);

        // Center face brightness preservation (spotlight)
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fef3c7';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);

        // Smooth frame corner vignette keeping face center bright
        applyVignette(ctx, x, y, width, height, 0.68);
        applyFilmGrain(ctx, x, y, width, height, 0.16);
        break;
      }

      // ==========================================
      // RETRO & VINTAGE (Lengkap 13 Preset Original)
      // ==========================================
      case 'night-flash-sepia': {
        // Muted khaki-sepia taupe
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#937b66';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        // Soft contrast shadow
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#c4a482';
        ctx.globalAlpha = 0.40;
        ctx.fillRect(x, y, width, height);

        // Lifted shadows (skin tone safe: never crushed black)
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#2a1f18';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.45);
        applyFilmGrain(ctx, x, y, width, height, 0.16);
        break;
      }

      case '1970s-vintage': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#d97706';
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#b45309';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#451a03';
        ctx.globalAlpha = 0.10;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.45);
        applyFilmGrain(ctx, x, y, width, height, 0.20);
        break;
      }

      case 'kodak-portra': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#fb923c';
        ctx.globalAlpha = 0.40;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#ea580c';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fff7ed';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.25);
        applyFilmGrain(ctx, x, y, width, height, 0.15);
        break;
      }

      case '90s-gritty-analog': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#a16207';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#3f3f46';
        ctx.globalAlpha = 0.30;
        ctx.fillRect(x, y, width, height);

        // Lifted shadows to preserve skin details
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#27272a';
        ctx.globalAlpha = 0.14;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.32);
        applyVignette(ctx, x, y, width, height, 0.50);
        break;
      }

      case '90s-curtain-sepia': {
        // Honey sepia warmth
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#d97706';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#b45309';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);

        // Fixed delicate curtain folds (smooth soft-light waves, no black stripes)
        applyVerticalCurtain(ctx, x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.16);
        applyVignette(ctx, x, y, width, height, 0.35);
        break;
      }

      case 'fuji-superia': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#047857';
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#06b6d4';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#022c22';
        ctx.globalAlpha = 0.10;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.18);
        applyVignette(ctx, x, y, width, height, 0.35);
        break;
      }

      case '80s-vhs': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#e11d48';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#be123c';
        ctx.globalAlpha = 0.20;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#4c0519';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.22);
        applyVignette(ctx, x, y, width, height, 0.40);
        break;
      }

      case '8mm-retro': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#78350f';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#f59e0b';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fffbeb';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.24);
        applyVignette(ctx, x, y, width, height, 0.55);
        break;
      }

      case '60s-technicolor': {
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#f97316';
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#3b82f6';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#ef4444';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.30);
        break;
      }

      case 'warm-vintage': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#fbbf24';
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fef08a';
        ctx.globalAlpha = 0.20;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#f59e0b';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.14);
        applyVignette(ctx, x, y, width, height, 0.25);
        break;
      }

      case 'faded-polaroid': {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#475569';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#fef3c7';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#d97706';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.18);
        applyVignette(ctx, x, y, width, height, 0.30);
        break;
      }

      case 'sepia-classic': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#854d0e';
        ctx.globalAlpha = 0.80;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = '#fef3c7';
        ctx.globalAlpha = 0.40;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#3b1d07';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.60);
        applyFilmGrain(ctx, x, y, width, height, 0.22);
        break;
      }

      case 'cinematic-teal': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#0e7490';
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#f59e0b';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.40);
        applyFilmGrain(ctx, x, y, width, height, 0.16);
        break;
      }

      // ==========================================
      // Y2K MILLENNIUM & POP (Lengkap 9 Preset Original)
      // ==========================================
      case 'y2k-digicam': {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#60a5fa';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'cool-y2k': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#06b6d4';
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#3b82f6';
        ctx.globalAlpha = 0.30;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#e0f2fe';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'y2k-glam': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#ec4899';
        ctx.globalAlpha = 0.38;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fdf2f8';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#f43f5e';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'y2k-bubblegum': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#db2777';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#f472b6';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fce7f3';
        ctx.globalAlpha = 0.20;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'y2k-frosted': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#38bdf8';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#c084fc';
        ctx.globalAlpha = 0.22;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#f0fdf4';
        ctx.globalAlpha = 0.16;
        ctx.fillRect(x, y, width, height);
        break;
      }

      case 'y2k-matrix': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#16a34a';
        ctx.globalAlpha = 0.32;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#15803d';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#052e16';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.45);
        break;
      }

      case 'y2k-silver': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#64748b';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#e2e8f0';
        ctx.globalAlpha = 0.40;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#f8fafc';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.35);
        break;
      }

      case 'tokyo-neon': {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#8b5cf6';
        ctx.globalAlpha = 0.40;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#d946ef';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#4c1d95';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.35);
        break;
      }

      case 'soft-glow': {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#fbcfe8';
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#f472b6';
        ctx.globalAlpha = 0.30;
        ctx.fillRect(x, y, width, height);
        break;
      }

      // ==========================================
      // HITAM PUTIH & NOIR (Lengkap 4 Preset Original, Skin-Tone Safe)
      // ==========================================
      case 'bw-classic': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1.0;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.20;
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
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        // Lifted shadows: preserves face contour and stops crushed blacks
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#18181b';
        ctx.globalAlpha = 0.10;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.55);
        applyFilmGrain(ctx, x, y, width, height, 0.22);
        break;
      }

      case 'dramatic-gold-noir': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.65;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#9b8e78';
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#c8bd9f';
        ctx.globalAlpha = 0.32;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#1c1917';
        ctx.globalAlpha = 0.10;
        ctx.fillRect(x, y, width, height);

        applyVignette(ctx, x, y, width, height, 0.50);
        applyFilmGrain(ctx, x, y, width, height, 0.18);
        break;
      }

      case 'monochrome-grain': {
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1.0;
        ctx.fillRect(x, y, width, height);

        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#52525b';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(x, y, width, height);

        applyFilmGrain(ctx, x, y, width, height, 0.36);
        applyVignette(ctx, x, y, width, height, 0.35);
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.warn('Filter processing error:', e);
  } finally {
    // Guaranteed state reset to prevent state bleed into subsequent canvas drawings
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }
}
