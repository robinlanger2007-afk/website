/* Kundengalerie – aus Galerie-Bildern einen Instagram-Post (Carousel, 4:5) bauen.
   Alles passiert im Browser: Bilder werden nie beschnitten, nur auf Slides angeordnet
   (Cover, Einzelbild, Paar, groß/klein, Panorama über zwei Slides, Querformate gestapelt). */
(function () {
  'use strict';
  var W = 1080, H = 1350, MAX_SLIDES = 20, SRC_MAX = 1400;
  // Gestaltung: goldener Rahmen, um FR versetzt hinter jedem Foto; Ecken-Winkel; Fußzeile mit Haarlinie.
  // Fotos (samt Rahmen) bleiben im Sicherheitsrand MX / TOP / BOT, nur der Cover-Titel braucht CT extra.
  var FR = 14, MX = 56, TOP = 64, BOT = 104, CT = 130;
  var ZW = W - 2 * MX, ZH = H - TOP - BOT;
  var THEMES = {
    light: { bg: '#f6f3ed', ink: '#2a2826', gold: '#b87a12', glow: 0.2, grain: 0.05 },
    dark: { bg: '#0e0d12', ink: '#ece8e1', gold: '#f0b44c', glow: 0.17, grain: 0.05 }
  };
  var CREDIT = 'FOTOS · LANGER-PHOTO.DE';

  // ---------- Hilfen ----------
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function shuffle(a, R) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // Bild vollständig in eine Box einpassen (nie beschneiden)
  function fit(r, bw, bh) { var w = bw, h = bw / r; if (h > bh) { h = bh; w = bh * r; } return { w: w, h: h }; }
  function fitF(r, bw, bh) { return fit(r, bw - FR, bh - FR); }   // Box einschließlich Rahmen-Versatz
  function P(it, x, y, w, h) { return { k: it.k, x: x, y: y, w: w, h: h }; }

  // ---------- Layouts (Koordinaten einer Slide, Panorama: zwei Slides breit) ----------
  function cover(a, text) {
    var top = text ? 48 : TOP, zh = text ? H - 48 - BOT - CT : ZH, f = fitF(a.r, ZW, zh);
    return [P(a, MX + (ZW - f.w - FR) / 2, top + (zh - f.h - FR) / 2, f.w, f.h)];
  }
  function single(a) {
    var f = fitF(a.r, ZW, ZH);
    return [P(a, MX + (ZW - f.w - FR) / 2, TOP + (ZH - f.h - FR) / 2, f.w, f.h)];
  }
  function pair(a, b, v) {           // zwei Hochformate nebeneinander, versetzt oder gerade
    var G = 44, cw = (ZW - G) / 2, fa = fitF(a.r, cw, 1050), fb = fitF(b.r, cw, 1050);
    var st = v === 2 ? 0 : 160, mx = Math.max(fa.h, fb.h) + FR;
    if (mx + st > ZH) st = Math.max(0, ZH - mx);
    var ya = v === 1 ? st : 0, yb = v === 0 ? st : 0;
    var top = TOP + (ZH - Math.max(ya + fa.h, yb + fb.h) - FR) / 2;
    return [P(a, MX + (cw - fa.w - FR) / 2, top + ya, fa.w, fa.h), P(b, MX + cw + G + (cw - fb.w - FR) / 2, top + yb, fb.w, fb.h)];
  }
  function stack(a, b, v) {          // zwei Querformate übereinander, seitlich versetzt
    var gap = 40, bw = 850, ha = bw / a.r, hb = bw / b.r, s = Math.min(1, (ZH - 2 * FR - gap) / (ha + hb));
    var wa = bw * s, wb = bw * s; ha *= s; hb *= s;
    var top = TOP + (ZH - ha - hb - gap - 2 * FR) / 2;
    return [P(a, v ? W - MX - FR - wa : MX, top, wa, ha), P(b, v ? MX : W - MX - FR - wb, top + ha + FR + gap, wb, hb)];
  }
  function bigSmall(a, b, v) {       // groß + klein, diagonal
    var fa = fitF(a.r, 610, 880), fb = fitF(b.r, 320, 470), ay = TOP + 30, by = H - BOT - FR - fb.h - 10;
    if (v) return [P(a, W - MX - FR - fa.w, ay, fa.w, fa.h), P(b, MX, by, fb.w, fb.h)];
    return [P(a, MX, ay, fa.w, fa.h), P(b, W - MX - FR - fb.w, by, fb.w, fb.h)];
  }
  function pano(a, b, c, v) {        // drei Bilder über zwei Slides, das mittlere läuft über die Kante
    var G = 56, hb = 1000, wb = hb * b.r, xb = W - 0.62 * wb;
    var ha = Math.min(760, (xb - G - FR - MX) / a.r), xc = xb + wb + FR + G;
    var hc = Math.min(860, (2 * W - MX - FR - xc) / c.r);
    if (ha < 520 || hc < 520 || xb < 300) return null;
    var wa = ha * a.r, wc = hc * c.r;
    xc = 2 * W - MX - FR - wc;
    var ya = v ? H - BOT - FR - ha - 20 : TOP + 40, yb = v ? 90 : 150, yc = v ? TOP + 40 : H - BOT - FR - hc - 20;
    return [P(a, MX, ya, wa, ha), P(b, xb, yb, wb, hb), P(c, xc, yc, wc, hc)];
  }

  // ---------- Planung: Reihenfolge bleibt, das erste Bild ist das Cover ----------
  function plan(list, seed, coverText) {
    var R = rng(seed), slides = [], q = list.slice(1);
    slides.push({ span: 1, items: cover(list[0], coverText), cover: true });
    var cycle = shuffle(['pair', 'single', 'pano', 'pair', 'bigsmall', 'pair', 'single', 'pano'], R), ci = 0, last = '';
    while (q.length) {
      var used = slides.reduce(function (s, x) { return s + x.span; }, 0), left = MAX_SLIDES - used;
      if (left <= 0) break;
      var need = q.length / left, a = q[0], b = q[1], c = q[2], t, items = null, n = 1, span = 1;
      if (a.L) {
        t = b && b.L && (need > 1 || R() < 0.5) ? 'stack' : 'single';
      } else {
        t = cycle[ci++ % cycle.length];
        if (t === last && t !== 'pair') t = 'pair';
        if (need > 1.5) t = 'pair'; else if (need > 1 && t === 'single') t = 'pair';
        if (t === 'pano' && !(left >= 2 && b && c && !b.L && !c.L)) t = 'pair';
        if ((t === 'pair' || t === 'bigsmall') && !(b && !b.L)) t = 'single';
      }
      var v = Math.floor(R() * 3);
      if (t === 'pano') { items = pano(a, b, c, v % 2); if (items) { n = 3; span = 2; } else t = 'pair'; }
      if (!items && t === 'pair') { items = pair(a, b, v); n = 2; }
      if (!items && t === 'bigsmall') { items = bigSmall(a, b, v % 2); n = 2; }
      if (!items && t === 'stack') { items = stack(a, b, v % 2); n = 2; }
      if (!items) { items = single(a); n = 1; t = 'single'; }
      slides.push({ span: span, items: items });
      q = q.slice(n); last = t;
    }
    // Panorama-Slides in Einzel-Slides zerlegen
    var out = [], x0 = 0;
    slides.forEach(function (s) {
      s.items.forEach(function (p) { p.gx = x0 + p.x; });
      for (var k = 0; k < s.span; k++) out.push({ items: s.items, off: x0 + k * W, cover: s.cover && k === 0, part: k, parts: s.span });
      x0 += s.span * W;
    });
    return { slides: out, dropped: q.length };
  }

  // ---------- Zeichnen ----------
  function drawScaled(src, w, h) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, w, h); return c;
  }
  async function toSource(buf) {
    var bmp = await createImageBitmap(new Blob([buf], { type: 'image/jpeg' }));
    var s = Math.min(1, SRC_MAX / Math.max(bmp.width, bmp.height));
    if (s === 1) return bmp;
    var tw = Math.round(bmp.width * s), th = Math.round(bmp.height * s), src = bmp, cw = bmp.width, ch = bmp.height;
    while (cw / 2 >= tw && ch / 2 >= th) { cw = Math.round(cw / 2); ch = Math.round(ch / 2); src = drawScaled(src, cw, ch); }
    var out = drawScaled(src, tw, th);
    if (bmp.close) bmp.close();
    return out;
  }
  // Text mit Buchstabenabstand; liefert Startpunkt und Breite
  function face(ctx, size, weight, fam) { ctx.font = (weight || 500) + ' ' + size + 'px ' + (fam || 'Manrope') + ', system-ui, sans-serif'; }
  function spacedW(ctx, t, size, weight, fam, space) {
    face(ctx, size, weight, fam);
    var sp = size * (space == null ? 0.3 : space), chars = Array.from(t);
    return chars.reduce(function (s, ch) { return s + ctx.measureText(ch).width; }, 0) + sp * (chars.length - 1);
  }
  function spaced(ctx, t, x, y, size, align, color, weight, fam, space) {
    var tw = spacedW(ctx, t, size, weight, fam, space), sp = size * (space == null ? 0.3 : space);
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x, x0 = cx;
    Array.from(t).forEach(function (ch) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; });
    return { x: x0, w: tw };
  }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function sparkle(ctx, x, y, r) {   // vierzackiger Glanzstern
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.closePath(); ctx.fill();
  }
  function diamond(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); }
  function arrow(ctx, x, y) { line(ctx, x - 24, y, x + 8, y); ctx.beginPath(); ctx.moveTo(x - 2, y - 9); ctx.lineTo(x + 8, y); ctx.lineTo(x - 2, y + 9); ctx.stroke(); }
  function corners(ctx, left, right) {   // Ecken-Winkel wie im Sucher
    var a = 24, L = 38;
    [[left, a, a, 1, 1], [right, W - a, a, -1, 1], [left, a, H - a, 1, -1], [right, W - a, H - a, -1, -1]].forEach(function (c) {
      if (!c[0]) return;
      ctx.beginPath(); ctx.moveTo(c[1] + c[3] * L, c[2]); ctx.lineTo(c[1], c[2]); ctx.lineTo(c[1], c[2] + c[4] * L); ctx.stroke();
    });
  }
  var grainTile = null;
  function grain() {                 // feines Filmkorn, einmal erzeugt und gekachelt
    if (grainTile) return grainTile;
    var c = document.createElement('canvas'); c.width = c.height = 220;
    var x = c.getContext('2d'), d = x.createImageData(220, 220), R = rng(7);
    for (var i = 0; i < d.data.length; i += 4) { var v = Math.floor(R() * 256); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); grainTile = c; return c;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function renderSlide(st, k, scale, srcs) {
    var n = st.plan.slides.length, s = st.plan.slides[k], th = THEMES[st.theme];
    var parts = s.parts || 1, part = s.part || 0, first = part === 0, last = part === parts - 1;
    var c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);
    // Hintergrund: Farbe, goldener Lichtschein (bei Panoramen über beide Slides), Filmkorn
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    var gx = parts > 1 ? parts * W / 2 - part * W : (k % 2 ? W * 0.1 : W * 0.9), gy = parts > 1 ? H * 0.3 : (k % 2 ? H * 0.95 : H * 0.05);
    var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, parts > 1 ? 950 : 800);
    g.addColorStop(0, 'rgba(240,180,76,' + th.glow + ')'); g.addColorStop(1, 'rgba(240,180,76,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = th.grain; ctx.fillStyle = ctx.createPattern(grain(), 'repeat'); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    // Fotos mit versetztem goldenem Rahmen dahinter
    s.items.forEach(function (p) {
      var x = p.gx - s.off;
      if (x + p.w + FR <= 0 || x >= W) return;
      ctx.strokeStyle = th.gold; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.9;
      ctx.strokeRect(x + FR, p.y + FR, p.w, p.h); ctx.globalAlpha = 1;
      var src = srcs[p.k];
      if (src) ctx.drawImage(src, x, p.y, p.w, p.h);
      else { ctx.fillStyle = st.theme === 'dark' ? '#24222b' : '#e6e1d9'; ctx.fillRect(x, p.y, p.w, p.h); }
    });
    // Ecken-Winkel (bei Panoramen nur außen)
    ctx.strokeStyle = th.gold; ctx.lineWidth = 3; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.globalAlpha = 0.85;
    corners(ctx, first, last); ctx.globalAlpha = 1;
    // Cover-Titel
    if (s.cover && st.text) {
      var txt = st.text.toUpperCase(), size = 62, ty = H - BOT - 50, w62 = spacedW(ctx, txt, 62, 800, 'Syne', 0.04);
      if (w62 > ZW - 120) size = Math.max(12, Math.floor(62 * (ZW - 120) / w62));   // Breite wächst linear mit der Größe
      var tr = spaced(ctx, txt, MX, ty, size, 'left', th.ink, 800, 'Syne', 0.04);
      ctx.fillStyle = th.gold; ctx.fillRect(MX, ty - size / 2 - 26, 56, 4);
      var sx = MX + tr.w + 40;
      if (sx + 60 < W - MX) { sparkle(ctx, sx, ty - size * 0.18, 20); sparkle(ctx, sx + 36, ty + size * 0.22, 9); }
    }
    // Fußzeile: Haarlinie mit Rauten, Zähler, Credit, Pfeil bzw. Glanzstern auf der letzten Slide
    var fy = H - 40, hy = H - 72;
    ctx.strokeStyle = th.ink; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.25;
    line(ctx, first ? MX : 0, hy, last ? W - MX : W, hy); ctx.globalAlpha = 1;
    ctx.fillStyle = th.gold;
    if (first) diamond(ctx, MX, hy, 6);
    if (last) diamond(ctx, W - MX, hy, 6);
    spaced(ctx, pad(k + 1) + ' / ' + pad(n), MX, fy, 18, 'left', th.gold, 600, 'Manrope', 0.18);
    ctx.globalAlpha = 0.62; spaced(ctx, CREDIT, W / 2, fy, 15, 'center', th.ink, 500, 'Manrope', 0.28); ctx.globalAlpha = 1;
    ctx.strokeStyle = th.gold; ctx.fillStyle = th.gold; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (k < n - 1) {
      if (s.cover) spaced(ctx, 'SWIPE', W - MX - 46, fy, 16, 'right', th.gold, 600, 'Manrope', 0.28);
      arrow(ctx, W - MX - 10, fy);
    } else sparkle(ctx, W - MX - 10, fy, 12);
    return c;
  }

  // ---------- Dialog ----------
  var dlg = null, st = null;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function build() {
    dlg = el('<div class="ig" role="dialog" aria-modal="true" aria-label="Instagram-Post" hidden>' +
      '<div class="ig-top"><div><strong>Instagram-Post</strong><span class="ig-count"></span></div><button class="ig-x" type="button" aria-label="Schließen">×</button></div>' +
      '<div class="ig-strip" tabindex="0" aria-label="Vorschau der Slides"></div>' +
      '<div class="ig-ctrl">' +
        '<p class="hint ig-info"></p>' +
        '<div class="ig-lab">Cover <span class="hint">(antippen zum Wechseln)</span></div><div class="ig-covers"></div>' +
        '<label class="ig-field">Text auf dem Cover<input class="ig-text" maxlength="40" placeholder="z. B. Halloween Night"></label>' +
        '<div class="ig-seg" role="group" aria-label="Hintergrund"><button type="button" data-t="light" aria-pressed="false">Hell</button><button type="button" data-t="dark" aria-pressed="true">Dunkel</button></div>' +
        '<div class="ig-acts"><button class="btn ghost ig-mix" type="button">Neu anordnen</button><button class="btn ig-save" type="button">Slides speichern</button></div>' +
        '<p class="hint ig-status" aria-live="polite"></p>' +
      '</div></div>');
    document.body.appendChild(dlg);
    var q = function (s) { return dlg.querySelector(s); };
    q('.ig-x').onclick = close;
    dlg.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    q('.ig-mix').onclick = function () { st.seed = (st.seed * 7919 + 13) >>> 0; replan(); };
    var tt = null;
    q('.ig-text').oninput = function () { st.text = this.value.trim(); clearTimeout(tt); tt = setTimeout(replan, 250); };
    dlg.querySelectorAll('.ig-seg button').forEach(function (b) {
      b.onclick = function () {
        st.theme = b.dataset.t;
        dlg.querySelectorAll('.ig-seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        paint();
      };
    });
    q('.ig-save').onclick = saveAll;
  }
  function close() {
    if (!dlg || dlg.hidden) return;
    dlg.hidden = true; document.body.style.overflow = '';
    if (st) { st.alive = false; st.srcs.forEach(function (s) { if (s && s.close) s.close(); else if (s) s.width = s.height = 0; }); }
    dlg.querySelector('.ig-strip').innerHTML = '';
    st = null;
    if (open.last) open.last.focus();
  }

  function replan() {
    if (!st) return;
    var list = st.order.map(function (k) { var it = st.items[k]; return { k: k, r: it.r, L: it.r > 1.15 }; });
    st.plan = plan(list, st.seed, !!st.text);
    var n = st.plan.slides.length, used = list.length - st.plan.dropped;
    dlg.querySelector('.ig-count').textContent = n + ' Slides · ' + used + (used === 1 ? ' Bild' : ' Bilder');
    var info = st.note || '';
    if (st.plan.dropped) info = (info ? info + ' ' : '') + st.plan.dropped + (st.plan.dropped === 1 ? ' Bild passt' : ' Bilder passen') + ' nicht mehr hinein (Instagram erlaubt höchstens 20 Slides).';
    dlg.querySelector('.ig-info').textContent = info || 'Die Bilder bleiben in der Reihenfolge, in der du sie ausgewählt hast. Nichts wird abgeschnitten.';
    var strip = dlg.querySelector('.ig-strip'); strip.innerHTML = '';
    st.plan.slides.forEach(function (s, k) {
      var f = document.createElement('figure');
      var cv = document.createElement('canvas'); f.appendChild(cv);
      var cap = document.createElement('figcaption'); cap.textContent = k + 1; f.appendChild(cap);
      strip.appendChild(f);
    });
    paint();
  }
  function paint() {
    if (!st) return;
    var figs = dlg.querySelectorAll('.ig-strip figure'), sc = Math.min(2, window.devicePixelRatio || 1) * 0.28;
    st.plan.slides.forEach(function (s, k) {
      var c = renderSlide(st, k, sc, st.srcs), old = figs[k] && figs[k].querySelector('canvas');
      if (old) old.replaceWith(c);
    });
  }
  function covers() {
    var box = dlg.querySelector('.ig-covers'); box.innerHTML = '';
    st.order.forEach(function (k, pos) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ig-cv' + (pos === 0 ? ' on' : '');
      b.setAttribute('aria-label', 'Bild ' + (pos + 1) + ' als Cover'); b.setAttribute('aria-pressed', pos === 0);
      var img = document.createElement('img'); img.alt = ''; b.appendChild(img);
      st.thumb(st.items[k].i).then(function (u) { img.src = u; }).catch(function () {});
      b.onclick = function () {
        var at = st.order.indexOf(k); if (at <= 0) return;
        st.order.splice(at, 1); st.order.unshift(k);
        covers(); replan();
        dlg.querySelector('.ig-strip').scrollLeft = 0;
      };
      box.appendChild(b);
    });
    box.firstChild && (box.scrollLeft = 0);
  }
  async function loadAll() {
    var mine = st, next = 0, done = 0, total = mine.items.length, sEl = dlg.querySelector('.ig-status');
    sEl.textContent = 'Bilder werden geladen: 0 von ' + total;
    async function worker() {
      while (next < total && mine.alive) {
        var k = next++;
        try { mine.srcs[k] = await toSource(await mine.fetchP(mine.items[k].i)); } catch (e) { mine.failed++; }
        done++;
        if (!mine.alive) return;
        sEl.textContent = done < total ? 'Bilder werden geladen: ' + done + ' von ' + total : '';
        if (done % 3 === 0 || done === total) paint();
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    if (mine.alive && mine.failed) sEl.textContent = mine.failed + (mine.failed === 1 ? ' Bild konnte' : ' Bilder konnten') + ' nicht geladen werden.';
    if (mine.alive) mine.ready = true;
  }
  function slideBlob(k) {
    var c = renderSlide(st, k, 1, st.srcs);
    return new Promise(function (res, rej) { c.toBlob(function (b) { c.width = c.height = 0; b ? res(b) : rej(new Error('Slide konnte nicht erstellt werden')); }, 'image/jpeg', 0.93); });
  }
  async function saveAll() {
    var btn = dlg.querySelector('.ig-save'), sEl = dlg.querySelector('.ig-status');
    if (!st.ready) { sEl.textContent = 'Einen Moment, die Bilder laden noch …'; return; }
    btn.disabled = true;
    var files = [], base = st.slug(st.title || 'galerie') + '-instagram-';
    try {
      for (var k = 0; k < st.plan.slides.length; k++) {
        sEl.textContent = 'Slide ' + (k + 1) + ' von ' + st.plan.slides.length + ' wird erstellt …';
        files.push(new File([await slideBlob(k)], base + String(k + 1).padStart(2, '0') + '.jpg', { type: 'image/jpeg' }));
      }
    } catch (e) { sEl.textContent = 'Das hat nicht geklappt. Bitte versuch es noch einmal.'; btn.disabled = false; return; }
    btn.disabled = false;
    if (st.canShare) {
      var r = await st.share(files);
      if (r === 'ok') { sEl.textContent = 'Gespeichert. Lade die Slides in Instagram in genau dieser Reihenfolge hoch (1 bis ' + files.length + ').'; return; }
      if (r === 'cancel') { sEl.textContent = 'Abgebrochen.'; return; }
      if (r === 'blocked') {
        sEl.textContent = 'Fertig. Tippe auf „Jetzt sichern“, dann landen die Slides in deiner Fotos-App.';
        btn.textContent = 'Jetzt sichern';
        btn.onclick = async function () {
          var r2 = await st.share(files);
          btn.textContent = 'Slides speichern'; btn.onclick = saveAll;
          sEl.textContent = r2 === 'ok' ? 'Gespeichert. Lade die Slides in Instagram in dieser Reihenfolge hoch.' : r2 === 'cancel' ? 'Abgebrochen.' : '';
          if (r2 !== 'ok' && r2 !== 'cancel') zip(files, base, sEl);
        };
        return;
      }
    }
    zip(files, base, sEl);
  }
  function zip(files, base, sEl) {
    sEl.textContent = 'ZIP-Datei wird erstellt …';
    Promise.all(files.map(function (f) { return f.arrayBuffer(); })).then(function (bufs) {
      var z = new window.Galerie.Zip();
      bufs.forEach(function (b, k) { z.add(files[k].name, b); });
      st.save(z.blob(), base.replace(/-$/, '') + '.zip');
      sEl.textContent = 'Fertig. Die ZIP-Datei mit ' + files.length + ' Slides ist im Download-Ordner. Lade sie in Instagram in dieser Reihenfolge hoch (01 bis ' + String(files.length).padStart(2, '0') + ').';
    });
  }

  // ctx: { images:[{i,w,h}], title, note, fetchP(i)->ArrayBuffer, thumb(i)->url, save(blob,name), share(files)->status, canShare, slug }
  function open(ctx) {
    if (!dlg) build();
    if (st) close();
    open.last = document.activeElement;
    st = {
      items: ctx.images.map(function (it) { return { i: it.i, r: (it.w && it.h) ? it.w / it.h : 2 / 3 }; }),
      title: ctx.title, note: ctx.note, fetchP: ctx.fetchP, thumb: ctx.thumb, save: ctx.save, share: ctx.share,
      canShare: ctx.canShare, slug: ctx.slug, seed: (Date.now() & 0xffff) + 1, theme: 'dark',
      text: '', srcs: [], failed: 0, alive: true, ready: false, plan: null
    };
    st.order = st.items.map(function (_, k) { return k; });
    dlg.querySelector('.ig-text').value = '';
    dlg.querySelectorAll('.ig-seg button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.t === 'dark'); });
    dlg.querySelector('.ig-status').textContent = '';
    dlg.hidden = false; document.body.style.overflow = 'hidden';
    dlg.querySelector('.ig-x').focus();
    covers(); replan();
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('500 22px Manrope'), document.fonts.load('600 16px Manrope'), document.fonts.load('800 60px Syne')])
        .then(function () { paint(); }).catch(function () {});
    }
    loadAll();
  }

  window.GalerieInsta = { open: open, close: close, _plan: plan, _render: renderSlide };
})();
