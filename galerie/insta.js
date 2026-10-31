/* Kundengalerie – aus Galerie-Bildern einen Instagram-Post (Carousel, 4:5) bauen.
   Alles passiert im Browser: Bilder werden nie beschnitten, nur auf Slides angeordnet
   (Cover, Einzelbild, Paar, groß/klein, Panorama über zwei Slides, Querformate gestapelt). */
(function () {
  'use strict';
  var W = 1080, H = 1350, MAX_SLIDES = 20, SRC_MAX = 1400;
  var THEMES = { light: { bg: '#f7f5f1', ink: '#2d2b29' }, dark: { bg: '#121116', ink: '#e9e5df' } };
  var CREDIT = 'FOTOS · LANGER-PHOTO.DE';

  // ---------- Hilfen ----------
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function shuffle(a, R) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // Bild vollständig in eine Box einpassen (nie beschneiden)
  function fit(r, bw, bh) { var w = bw, h = bw / r; if (h > bh) { h = bh; w = bh * r; } return { w: w, h: h }; }
  function P(it, x, y, w, h) { return { k: it.k, x: x, y: y, w: w, h: h }; }

  // ---------- Layouts (Koordinaten einer Slide, Panorama: zwei Slides breit) ----------
  function cover(a, text) {
    var f = fit(a.r, W - 96, text ? H - 48 - 142 : H - 96);
    return [P(a, (W - f.w) / 2, text ? 48 : (H - f.h) / 2, f.w, f.h)];
  }
  function single(a) {
    var f = fit(a.r, W - 96, H - 96);
    return [P(a, (W - f.w) / 2, (H - f.h) / 2, f.w, f.h)];
  }
  function pair(a, b, v) {           // zwei Hochformate nebeneinander, versetzt oder gerade
    var cw = 495, fa = fit(a.r, cw, 1150), fb = fit(b.r, cw, 1150);
    var st = v === 2 ? 0 : 200, mx = Math.max(fa.h, fb.h);
    if (mx + st > 1290) st = Math.max(0, 1290 - mx);
    var ya = v === 1 ? st : 0, yb = v === 0 ? st : 0;
    var top = (H - Math.max(ya + fa.h, yb + fb.h)) / 2;
    return [P(a, 30 + (cw - fa.w) / 2, top + ya, fa.w, fa.h), P(b, 555 + (cw - fb.w) / 2, top + yb, fb.w, fb.h)];
  }
  function stack(a, b, v) {          // zwei Querformate übereinander, leicht versetzt
    var bw = 900, ha = bw / a.r, hb = bw / b.r, s = Math.min(1, (H - 96 - 30) / (ha + hb));
    var wa = bw * s, wb = bw * s; ha *= s; hb *= s;
    var top = (H - ha - hb - 30) / 2;
    return [P(a, v ? W - 48 - wa : 48, top, wa, ha), P(b, v ? 48 : W - 48 - wb, top + ha + 30, wb, hb)];
  }
  function bigSmall(a, b, v) {       // groß + klein, diagonal
    var fa = fit(a.r, 640, 960), fb = fit(b.r, 330, 495);
    if (v) return [P(a, W - 48 - fa.w, 110, fa.w, fa.h), P(b, 48, H - 110 - fb.h, fb.w, fb.h)];
    return [P(a, 48, 110, fa.w, fa.h), P(b, W - 48 - fb.w, H - 110 - fb.h, fb.w, fb.h)];
  }
  function pano(a, b, c, v) {        // drei Bilder über zwei Slides, das mittlere läuft über die Kante
    var hb = 1100, wb = hb * b.r, xb = W - 0.62 * wb;
    var ha = Math.min(780, (xb - 40 - 60) / a.r), xc = xb + wb + 40;
    var hc = Math.min(900, (2 * W - 60 - xc) / c.r, H - 200);
    if (ha < 520 || hc < 520 || xb < 300) return null;
    var wa = ha * a.r, wc = hc * c.r;
    xc = 2 * W - 60 - wc;
    var ya = v ? H - 110 - ha : 110, yb = v ? 100 : 150, yc = v ? 110 : H - 90 - hc;
    return [P(a, 60, ya, wa, ha), P(b, xb, yb, wb, hb), P(c, xc, yc, wc, hc)];
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
      for (var k = 0; k < s.span; k++) out.push({ items: s.items, off: x0 + k * W, cover: s.cover && k === 0 });
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
  function spaced(ctx, t, x, y, size, align, color) {
    ctx.font = '500 ' + size + 'px Manrope, system-ui, sans-serif';
    ctx.fillStyle = color; ctx.textBaseline = 'middle';
    var sp = size * 0.3, chars = Array.from(t), ws = chars.map(function (ch) { return ctx.measureText(ch).width; });
    var tw = ws.reduce(function (s, w) { return s + w; }, 0) + sp * (chars.length - 1);
    var cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    chars.forEach(function (ch, i) { ctx.fillText(ch, cx, y); cx += ws[i] + sp; });
  }
  function renderSlide(st, k, scale, srcs) {
    var s = st.plan.slides[k], th = THEMES[st.theme];
    var c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.scale(scale, scale);
    ctx.fillStyle = th.bg; ctx.fillRect(0, 0, W, H);
    s.items.forEach(function (p) {
      var x = p.gx - s.off;
      if (x + p.w <= 0 || x >= W) return;
      var src = srcs[p.k];
      if (src) ctx.drawImage(src, x, p.y, p.w, p.h);
      else { ctx.fillStyle = st.theme === 'dark' ? '#24222b' : '#e6e1d9'; ctx.fillRect(x, p.y, p.w, p.h); }
    });
    if (s.cover) {
      var txt = (st.text || '').toUpperCase(), y = H - 72;
      if (txt) { spaced(ctx, txt, 48, y, 22, 'left', th.ink); spaced(ctx, CREDIT, W - 48, y, 17, 'right', th.ink); }
      else spaced(ctx, CREDIT, W / 2, y, 18, 'center', th.ink);
    } else {
      // auf jeder weiteren Slide klein im unteren Rand (dort liegt nie ein Bild)
      ctx.globalAlpha = 0.6; spaced(ctx, CREDIT, W / 2, H - 23, 13, 'center', th.ink); ctx.globalAlpha = 1;
    }
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
        '<div class="ig-seg" role="group" aria-label="Hintergrund"><button type="button" data-t="light" aria-pressed="true">Hell</button><button type="button" data-t="dark" aria-pressed="false">Dunkel</button></div>' +
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
    st.plan = plan(list, st.seed, true);
    var n = st.plan.slides.length, used = list.length - st.plan.dropped;
    dlg.querySelector('.ig-count').textContent = ' · ' + n + ' Slides · ' + used + (used === 1 ? ' Bild' : ' Bilder');
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
      canShare: ctx.canShare, slug: ctx.slug, seed: (Date.now() & 0xffff) + 1, theme: 'light',
      text: '', srcs: [], failed: 0, alive: true, ready: false, plan: null
    };
    st.order = st.items.map(function (_, k) { return k; });
    dlg.querySelector('.ig-text').value = '';
    dlg.querySelectorAll('.ig-seg button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.t === 'light'); });
    dlg.querySelector('.ig-status').textContent = '';
    dlg.hidden = false; document.body.style.overflow = 'hidden';
    dlg.querySelector('.ig-x').focus();
    covers(); replan();
    if (document.fonts && document.fonts.load) document.fonts.load('500 22px Manrope').then(function () { paint(); }).catch(function () {});
    loadAll();
  }

  window.GalerieInsta = { open: open, close: close, _plan: plan };
})();
