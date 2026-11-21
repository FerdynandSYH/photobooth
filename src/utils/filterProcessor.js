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
 * Apply deterministic 90s analog dust specks and micro-scratches.
 * Uses a coordinate-based seeded LCG generator so that particle positions
 * remain perfectly stationary during strip drag/scale/rotate interactions (no flickering).
 */
export function applyAnalogDustAndScratches(ctx, x, y, width, height) {
  ctx.save();
  try {
    // 1. Clip to the exact photo rectangle so no specks leak into the frame
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // 2. Deterministic LCG seed based on slot coordinates and dimensions
    let seed = Math.abs(Math.round((x + 19) * 1013 + (y + 31) * 2017 + width * 43 + height)) || 98765;
    const lcg = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // 3. Generate 28 to 42 organic dust particles
    const totalSpecks = 28 + Math.floor(lcg() * 14);
    const whiteSpecks = [];
    const darkSpecks = [];

    for (let i = 0; i < totalSpecks; i++) {
      const px = x + lcg() * width;
      const py = y + lcg() * height;

      // Small organic radius (0.35px - 1.2px)
      const rx = 0.35 + lcg() * 0.70;
      const ry = 0.30 + lcg() * 0.60;
      const rotation = lcg() * Math.PI;

      // ~60% warm white specks, ~40% dark specks
      if (lcg() > 0.40) {
        whiteSpecks.push({ px, py, rx, ry, rotation });
      } else {
        darkSpecks.push({ px, py, rx, ry, rotation });
      }
    }

    // Pass 1: Dark microscopic dust specks (multiply mode)
    if (darkSpecks.length > 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(45, 35, 25, 0.25)';
      ctx.beginPath();
      for (let i = 0; i < darkSpecks.length; i++) {
        const s = darkSpecks[i];
        ctx.moveTo(s.px + s.rx, s.py);
        ctx.ellipse(s.px, s.py, s.rx, s.ry, s.rotation, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Pass 2: Warm white-cream dust specks (screen mode)
    if (whiteSpecks.length > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 250, 240, 0.45)';
      ctx.beginPath();
      for (let i = 0; i < whiteSpecks.length; i++) {
        const s = whiteSpecks[i];
        ctx.moveTo(s.px + s.rx, s.py);
        ctx.ellipse(s.px, s.py, s.rx, s.ry, s.rotation, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Pass 3: 1 to 2 subtle hairline micro-scratches on peripheral edges
    const scratchCount = 1 + Math.floor(lcg() * 2);
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';

    for (let s = 0; s < scratchCount; s++) {
      const side = Math.floor(lcg() * 4);
      let sx, sy, ex, ey;
      const len = Math.max(14, Math.min(36, Math.round(Math.min(width, height) * (0.05 + lcg() * 0.05))));

      if (side === 0) {
        // Left peripheral margin
        sx = x + lcg() * (width * 0.14);
        sy = y + (0.15 + lcg() * 0.70) * height;
        ex = sx + (lcg() - 0.5) * 8;
        ey = sy + len;
      } else if (side === 1) {
        // Right peripheral margin
        sx = x + width - lcg() * (width * 0.14);
        sy = y + (0.15 + lcg() * 0.70) * height;
        ex = sx + (lcg() - 0.5) * 8;
        ey = sy + len;
      } else if (side === 2) {
        // Top peripheral margin
        sx = x + (0.15 + lcg() * 0.70) * width;
        sy = y + lcg() * (height * 0.12);
        ex = sx + len;
        ey = sy + (lcg() - 0.5) * 6;
      } else {
        // Bottom peripheral margin
        sx = x + (0.15 + lcg() * 0.70) * width;
        sy = y + height - lcg() * (height * 0.12);
        ex = sx + len;
        ey = sy + (lcg() - 0.5) * 6;
      }

      const cx = (sx + ex) / 2 + (lcg() - 0.5) * 4;
      const cy = (sy + ey) / 2 + (lcg() - 0.5) * 4;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);

      if (s === 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = 'rgba(255, 250, 240, 0.32)';
      } else {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = 'rgba(45, 35, 25, 0.20)';
      }
      ctx.stroke();
    }
  } catch (e) {
    console.warn('Dust and scratches draw error:', e);
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
export function applyFilterEffects(ctx, x, y, width, height, filterId, imgSource = null, sx = 0, sy = 0, sw = 0, sh = 0) {
  if (!filterId || filterId === 'normal') return;

  ctx.save();
  try {
    switch (filterId) {
      // ==========================================
      // PRESET OPTIK: Soft Analog Film (Dreamy Halation & Orton Mist)
      // ==========================================
      case 'soft-analog-film': {
        // 1. Dreamy Halation / Lens Diffusion Mist (Orton Bloom)
        // Cross-Browser safe: offscreen bilinear downscale-upscale diffusion (1/14 scale)
        if (imgSource && sw > 0 && sh > 0) {
          try {
            const scaleDown = 14;
            const bloomW = Math.max(16, Math.round(width / scaleDown));
            const bloomH = Math.max(16, Math.round(height / scaleDown));

            const bloomCanvas = document.createElement('canvas');
            bloomCanvas.width = bloomW;
            bloomCanvas.height = bloomH;
            const bCtx = bloomCanvas.getContext('2d');
            bCtx.imageSmoothingEnabled = true;
            bCtx.imageSmoothingQuality = 'high';

            // Tahap 1: Gambar foto ke kanvas mini beresolusi rendah (smooth bilinear blur)
            bCtx.drawImage(imgSource, sx, sy, sw, sh, 0, 0, bloomW, bloomH);

            // Tahap 2: Isolasi & perkuat highlight pada layer blur
            // - Multiply ke dirinya sendiri untuk menekan area gelap/shadow agar kabut tidak keruh
            bCtx.globalCompositeOperation = 'multiply';
            bCtx.globalAlpha = 0.40;
            bCtx.drawImage(bloomCanvas, 0, 0);

            // - Warm creamy/golden glow tint pada pendaran highlight
            bCtx.globalCompositeOperation = 'screen';
            bCtx.globalAlpha = 0.35;
            bCtx.fillStyle = 'rgb(255, 240, 224)';
            bCtx.fillRect(0, 0, bloomW, bloomH);

            // Tahap 3: Blending kabut dreamy mist kembali ke kanvas utama
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Pass A: Halation penyebaran kabut lembut menyeluruh (screen 0.32)
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.32;
            ctx.drawImage(bloomCanvas, 0, 0, bloomW, bloomH, x, y, width, height);

            // Pass B: Pendaran khusus highlight/kulit/pakaian terang (lighten 0.14)
            ctx.globalCompositeOperation = 'lighten';
            ctx.globalAlpha = 0.14;
            ctx.drawImage(bloomCanvas, 0, 0, bloomW, bloomH, x, y, width, height);
          } catch (e) {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = 'rgba(255, 245, 235, 0.30)';
            ctx.fillRect(x, y, width, height);
          }
        } else {
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(255, 245, 235, 0.30)';
          ctx.fillRect(x, y, width, height);
        }

        // 2. Lifted Shadows (Black point lifted to faded warm dark brown rgb(42, 35, 30))
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgb(42, 35, 30)';
        ctx.globalAlpha = 0.20;
        ctx.fillRect(x, y, width, height);

        // 3. Creamy Highlights (rgb(245, 240, 228))
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgb(245, 240, 228)';
        ctx.globalAlpha = 0.24;
        ctx.fillRect(x, y, width, height);

        // 4. Subtle mint-green tint in midtones (rgba(195, 215, 200, 0.14) with soft-light)
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(195, 215, 200, 0.30)';
        ctx.fillRect(x, y, width, height);

        // 5. Film Emulsion Softness (~15% desaturasi & penurunan kontras lembut)
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#e4e0d7';
        ctx.globalAlpha = 0.14;
        ctx.fillRect(x, y, width, height);

        // 6. Finishing Texture: Fine organic film grain (1-2px, opacity 0.12)
        applyFilmGrain(ctx, x, y, width, height, 0.12);

        // 7. Analog Dust Specks & Micro-Scratches (Autentik klise film 90-an)
        applyAnalogDustAndScratches(ctx, x, y, width, height);

        // 8. Subtle film edge light-leak on right edge (rgba(255, 110, 40, 0.35))
        const leakWidth = Math.max(20, Math.round(width * 0.22));
        const leakGrad = ctx.createLinearGradient(x + width - leakWidth, 0, x + width, 0);
        leakGrad.addColorStop(0.0, 'rgba(255, 110, 40, 0.0)');
        leakGrad.addColorStop(0.55, 'rgba(255, 110, 40, 0.14)');
        leakGrad.addColorStop(1.0, 'rgba(255, 120, 50, 0.35)');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = leakGrad;
        ctx.fillRect(x + width - leakWidth, y, leakWidth, height);
        break;
      }

      // ==========================================
      // PRESET BARU OPTIK 2: Silver Booth B&W (Warm Silver Gelatin Monochrome)
      // ==========================================
      case 'silver-booth-bw': {
        // 1. Warm Monochrome Conversion (Luminance weighting)
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 1.0;
        ctx.fillRect(x, y, width, height);

        // 2. Warm Silver Gelatin Split-Toning (#efe6d8 in highlights & midtones)
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#efe6d8';
        ctx.globalAlpha = 0.42;
        ctx.fillRect(x, y, width, height);

        // 3. Direct Flash Midtone Contrast boost (~15%) without crushing blacks
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#262626';
        ctx.globalAlpha = 0.30;
        ctx.fillRect(x, y, width, height);

        // Lifted deep shadows to prevent crushed black point
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = '#1c1917';
        ctx.globalAlpha = 0.10;
        ctx.fillRect(x, y, width, height);

        // 4. Subtle Radial Vignette (rgba(20, 16, 12, 0.35) at corners, fully clear at face center)
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const maxRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
        const vigGrad = ctx.createRadialGradient(
          centerX, centerY, width * 0.22,
          centerX, centerY, maxRadius
        );
        vigGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
        vigGrad.addColorStop(0.65, 'rgba(20, 16, 12, 0.12)');
        vigGrad.addColorStop(1.0, 'rgba(20, 16, 12, 0.35)');

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = vigGrad;
        ctx.fillRect(x, y, width, height);

        // 5. Subtle vintage paper grain (opacity 0.07)
        applyFilmGrain(ctx, x, y, width, height, 0.07);

        // 6. Thin vintage analog film border / edge line (2px - 4px) in faded dark tone
        const edgeInset = Math.max(2, Math.min(4, Math.round(Math.min(width, height) * 0.008)));
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = 'rgba(20, 16, 12, 0.40)';
        ctx.lineWidth = edgeInset * 2;
        ctx.strokeRect(x, y, width, height);
        break;
      }

      // ==========================================
      // PRESET BARU: Rio de Janeiro (Instagram Stories Tropical Sunset Glow)
      // ==========================================
      case 'rio-de-janeiro': {
        // 1. Soft Warm Shadows (Lifted dark point with warm plum/brown, skin-tone safe)
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgb(48, 28, 36)';
        ctx.globalAlpha = 0.10;
        ctx.fillRect(x, y, width, height);

        // 2. Warm Magenta-Coral to Golden Amber Gradient (Tropical Sunset Color Grading)
        const sunsetGrad = ctx.createLinearGradient(x, y, x, y + height);
        sunsetGrad.addColorStop(0.0, 'rgba(255, 95, 135, 0.22)'); // Coral Pink / Magenta hangat di atas
        sunsetGrad.addColorStop(0.55, 'rgba(255, 130, 85, 0.20)'); // Transisi peachy coral
        sunsetGrad.addColorStop(1.0, 'rgba(255, 165, 70, 0.18)'); // Golden Amber di bawah

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = sunsetGrad;
        ctx.fillRect(x, y, width, height);

        // 3. Channel Shift: Red boost (+20%), Green slight boost (+4%), Blue reduction (-16%)
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = '#ff6050';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);

        // 4. Vibrant Saturation Boost (+20% - +25% vibrance on lips, skin, & environment)
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = '#ff7a59';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x, y, width, height);

        // 5. Subtle Warm Skin Glow (Peach Screen tint ~0.08)
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 190, 170, 0.12)';
        ctx.globalAlpha = 0.08;
        ctx.fillRect(x, y, width, height);

        // 6. Peachy Midtone Radiance
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = '#ffdfd3';
        ctx.globalAlpha = 0.18;
        ctx.fillRect(x, y, width, height);
        break;
      }
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
