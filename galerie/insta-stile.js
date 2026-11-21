/* Kundengalerie – Stile für den Instagram-Post (Gold, Blumen, Schnörkel, Nacht, dazu Blumen und Schnörkel einfarbig).
   Jeder Stil zeichnet eine Slide in drei Schritten:
     behind(ctx, E)      Hintergrund und Verzierungen hinter den Fotos
     mat(ctx, E, r)      Rahmen / Papierrand / Leuchten direkt hinter einem Foto (r = Foto-Rechteck)
     front(ctx, E)       Titel, Fußzeile und alles, was vor den Fotos liegt
   E beschreibt die Slide: Palette p, Zufall R (je Slide) und RG (je Panorama-Gruppe, damit Ranken über die
   Kante passen), Foto-Rechtecke rects, gesperrte Flächen blocked, Teil/Teile bei Panoramen.
   Alles ist deterministisch: gleiche Slide, gleiches Bild – Vorschau und gespeicherte Datei sehen gleich aus. */
(function () {
  'use strict';
  var K = { W: 1080, H: 1350, FR: 14, MX: 56, TOP: 64, BOT: 104, CT: 130 };
  var W = K.W, H = K.H, MX = K.MX, BOT = K.BOT, CT = K.CT, TAU = Math.PI * 2, PI = Math.PI;
  var CREDIT = 'FOTOS · LANGER-PHOTO.DE';

  // ---------- Hilfen ----------
  function rgba(c, a) { var n = parseInt(c.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function hit(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  function rr(R, a, b) { return a + R() * (b - a); }
  // freie Fläche w × h suchen (ohne Fotos, Fußzeile, Cover-Titel)
  function spot(E, w, h, tries) {
    var R = E.R, ya = 20, yb = H - 20;
    if (yb - ya - h < 0) return null;
    for (var i = 0; i < (tries || 40); i++) {
      var r = { x: 20 + R() * (W - 40 - w), y: ya + R() * (yb - ya - h), w: w, h: h };
      if (!E.blocked.some(function (b) { return hit(b, r); })) return r;
    }
    return null;
  }
  function face(ctx, size, weight, fam, italic) {
    var fb = fam === 'Cardo' ? 'Georgia, serif' : 'system-ui, sans-serif';
    ctx.font = (italic ? 'italic ' : '') + (weight || 500) + ' ' + size + 'px ' + (fam || 'Manrope') + ', ' + fb;
  }
  function spacedW(ctx, t, size, weight, fam, space, italic) {
    face(ctx, size, weight, fam, italic);
    var sp = size * (space == null ? 0.3 : space), chars = Array.from(t);
    return chars.reduce(function (s, ch) { return s + ctx.measureText(ch).width; }, 0) + sp * (chars.length - 1);
  }
  // Text mit Buchstabenabstand; liefert Startpunkt und Breite
  function spaced(ctx, t, x, y, size, align, color, weight, fam, space, italic) {
    var tw = spacedW(ctx, t, size, weight, fam, space, italic), sp = size * (space == null ? 0.3 : space);
    ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var cx = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x, x0 = cx;
    Array.from(t).forEach(function (ch) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; });
    return { x: x0, w: tw };
  }
  function fitSize(ctx, t, size, maxW, weight, fam, space, italic) {
    var w = spacedW(ctx, t, size, weight, fam, space, italic);
    return w > maxW ? Math.max(12, Math.floor(size * maxW / w)) : size;   // Breite wächst linear mit der Größe
  }
  function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function sparkle(ctx, x, y, r) {   // vierzackiger Glanzstern
    ctx.beginPath(); ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.closePath(); ctx.fill();
  }
  function diamond(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); }
  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function arrow(ctx, x, y) { line(ctx, x - 24, y, x + 8, y); ctx.beginPath(); ctx.moveTo(x - 2, y - 9); ctx.lineTo(x + 8, y); ctx.lineTo(x - 2, y + 9); ctx.stroke(); }
  var grainTile = null;
  function grain(ctx, alpha, seed) {   // feines Korn, einmal erzeugt und gekachelt
    if (!grainTile) {
      var c = document.createElement('canvas'); c.width = c.height = 220;
      var x = c.getContext('2d'), d = x.createImageData(220, 220), s = (seed || 7) >>> 0;
      for (var i = 0; i < d.data.length; i += 4) {
        s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
        var v = s & 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
      }
      x.putImageData(d, 0, 0); grainTile = c;
    }
    ctx.globalAlpha = alpha; ctx.fillStyle = ctx.createPattern(grainTile, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  function glow(ctx, x, y, r, color, a) {   // weicher Lichtfleck
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }

  // ---------- Pflanzen (für Blumen) ----------
  function leaf(ctx, x, y, ang, len, wid, c) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.45, -wid, len, 0); ctx.quadraticCurveTo(len * 0.45, wid, 0, 0); ctx.closePath();
    ctx.fillStyle = rgba(c, 0.22); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(len * 0.1, 0); ctx.lineTo(len * 0.78, 0); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  function blossom(ctx, x, y, r, n, rot, petal, core, narrow) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    var w = narrow ? r * 0.17 : r * 0.58;
    for (var i = 0; i < n; i++) {
      ctx.save(); ctx.rotate(i * TAU / n);
      ctx.beginPath(); ctx.moveTo(r * 0.12, 0);
      ctx.bezierCurveTo(r * 0.3, -w * 1.15, r * 1.02, -w * 0.9, r, 0);
      ctx.bezierCurveTo(r * 1.02, w * 0.9, r * 0.3, w * 1.15, r * 0.12, 0);
      ctx.closePath();
      ctx.fillStyle = rgba(petal, narrow ? 0.14 : 0.2); ctx.fill();
      ctx.strokeStyle = petal; ctx.lineWidth = narrow ? 1.6 : 2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = rgba(core, 0.95); dot(ctx, 0, 0, r * (narrow ? 0.2 : 0.15));
    ctx.fillStyle = core;
    for (var j = 0; j < 7; j++) dot(ctx, Math.cos(j * TAU / 7) * r * (narrow ? 0.36 : 0.3), Math.sin(j * TAU / 7) * r * (narrow ? 0.36 : 0.3), Math.max(1.4, r * 0.05));
    ctx.restore();
  }
  function bloom(ctx, R, P, x, y, r) {   // Blüte in zufälliger Art: rund, Margerite oder voll
    var t = R(), rot = R() * TAU;
    if (t < 0.4) blossom(ctx, x, y, r, 5, rot, P.rose, P.gold, false);
    else if (t < 0.7) blossom(ctx, x, y, r, 12, rot, P.rose, P.gold, true);
    else { blossom(ctx, x, y, r, 5, rot, P.rose, P.gold, false); blossom(ctx, x, y, r * 0.62, 5, rot + PI / 5, P.rose, P.gold, false); }
  }
  function bud(ctx, x, y, ang, r, P) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.ellipse(r * 0.9, 0, r * 0.9, r * 0.6, 0, 0, TAU);
    ctx.fillStyle = rgba(P.rose, 0.28); ctx.fill(); ctx.strokeStyle = P.rose; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * 0.1, 0); ctx.quadraticCurveTo(r * 0.9, -r * 0.35, r * 1.7, 0); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  function berries(ctx, R, P, x, y, ang, len) {
    ctx.strokeStyle = P.sage; ctx.lineWidth = 1.8; ctx.fillStyle = rgba(P.rose, 0.85);
    for (var i = -1; i <= 1; i++) {
      var a = ang + i * 0.45 + (R() - 0.5) * 0.2, l = len * (0.75 + R() * 0.35);
      var ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 4, y + Math.sin(a) * l * 0.5 - 4, ex, ey); ctx.stroke();
      dot(ctx, ex, ey, 5.5);
    }
  }
  // Ranke entlang einer Linie mit sanftem Schwung, Blättern und Blüten
  function edgePts(R, x0, y0, x1, y1, amp, step) {
    var L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
    var n = Math.max(2, Math.round(L / step)), ph = R() * TAU, pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, w = Math.sin(t * L / 70 + ph) * amp;
      pts.push({ x: x0 + (x1 - x0) * t + nx * w, y: y0 + (y1 - y0) * t + ny * w, a: a });
    }
    return pts;
  }
  function garland(ctx, R, P, pts, o) {
    ctx.strokeStyle = P.sage; ctx.lineWidth = o.lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); ctx.stroke();
    var side = 1, since = 0;
    for (i = 1; i < pts.length; i++) {
      var p = pts[i];
      if (R() < 0.88) leaf(ctx, p.x, p.y, p.a + side * rr(R, 0.7, 1.15), o.leaf * rr(R, 0.75, 1.25), o.leaf * 0.3, P.sage);
      if (R() < 0.4) leaf(ctx, p.x, p.y, p.a - side * rr(R, 0.8, 1.3), o.leaf * rr(R, 0.5, 0.8), o.leaf * 0.24, P.sage);
      side = -side; since++;
      if (since >= o.every && i < pts.length - 1 && R() < 0.85) {
        since = 0; bloom(ctx, R, P, p.x + Math.cos(p.a + side * PI / 2) * o.off, p.y + Math.sin(p.a + side * PI / 2) * o.off, o.r * rr(R, 0.8, 1.25));
      }
    }
    var e = pts[pts.length - 1];
    if (o.endBloom) bloom(ctx, R, P, e.x, e.y, o.r * 1.15);
  }
  function cluster(ctx, R, P, x, y, s, rot) {   // Blütenstrauß: Blätter, drei Blüten, Knospen, Beeren
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    var i;
    for (i = 0; i < 6; i++) leaf(ctx, 0, 0, i * TAU / 6 + rr(R, -0.25, 0.25), s * rr(R, 0.85, 1.3), s * 0.24, P.sage);
    berries(ctx, R, P, 0, 0, rr(R, 0, TAU), s * 1.0);
    bud(ctx, 0, 0, rr(R, 0, TAU), s * 0.3, P);
    var a1 = R() * TAU;
    bloom(ctx, R, P, Math.cos(a1) * s * 0.62, Math.sin(a1) * s * 0.62, s * 0.3);
    bloom(ctx, R, P, Math.cos(a1 + 2.4) * s * 0.58, Math.sin(a1 + 2.4) * s * 0.58, s * 0.26);
    blossom(ctx, 0, 0, s * 0.5, 5, R() * TAU, P.rose, P.gold, false);
    blossom(ctx, 0, 0, s * 0.3, 5, R() * TAU, P.rose, P.gold, false);
    ctx.restore();
  }
  function bloomCorner(ctx, R, P, top, left, GW, clipY) {   // Strauß in der Ecke, Ranken an Kante und Seite
    var cx = left ? 40 : GW - 40, cy = top ? 42 : clipY - 34, sx = left ? 1 : -1, sy = top ? 1 : -1;
    var side = edgePts(R, left ? 27 : GW - 27, cy + sy * 46, left ? 27 : GW - 27, cy + sy * (46 + rr(R, 240, 430)), 4, 30);
    garland(ctx, R, P, side, { lw: 3.2, leaf: 42, r: 19, off: 6, every: 3, endBloom: true });
    if (top) {
      var edge = edgePts(R, cx + sx * 50, 31, cx + sx * (50 + rr(R, 320, 620)), 31, 4, 30);
      garland(ctx, R, P, edge, { lw: 3.2, leaf: 44, r: 20, off: 6, every: 3, endBloom: true });
    }
    cluster(ctx, R, P, cx, cy, 98, rr(R, 0, TAU));
  }

  // ---------- Schnörkel ----------
  // Spirale ab (x, y) in Richtung dir, dreht zu Seite s (+1 rechts herum, -1 links herum)
  function curl(ctx, x, y, dir, s, r0, turns) {
    var phi = dir + s * PI / 2, cx = x + Math.cos(phi) * r0, cy = y + Math.sin(phi) * r0, th0 = phi + PI;
    for (var i = 0; i <= 28; i++) {
      var t = i / 28, th = th0 + s * turns * TAU * t, r = r0 * Math.exp(-1.7 * t);
      var px = cx + Math.cos(th) * r, py = cy + Math.sin(th) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  }
  // S-förmiger Arm mit Spirale am Ende; lokal entlang +x, Spirale kippt zur Seite s
  function scrollArm(ctx, x, y, ang, len, s, r0, color, lw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.32, -s * len * 0.2, len * 0.62, s * len * 0.16, len, 0);
    curl(ctx, len, 0, 0, s, r0, 1.55);
    ctx.stroke();
    ctx.restore();
  }
  function lens(ctx, x, y, ang, len, wid, color) {   // kleines spitzes Blatt als Zierstück
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wid, len, 0); ctx.quadraticCurveTo(len * 0.5, wid, 0, 0); ctx.closePath();
    ctx.fillStyle = color; ctx.fill(); ctx.restore();
  }
  // Zierstück (waagerecht, symmetrisch): Raute in der Mitte, Schnörkel nach links und rechts
  function fleuron(ctx, cx, cy, size, color, fillCol) {
    var L = size * 0.42, r0 = size * 0.07;
    ctx.fillStyle = fillCol || color; diamond(ctx, cx, cy, size * 0.045);
    [-1, 1].forEach(function (d) {
      scrollArm(ctx, cx + d * size * 0.07, cy, d > 0 ? 0 : PI, L, d > 0 ? -1 : 1, r0, color, 2.7);
      scrollArm(ctx, cx + d * size * 0.07, cy, d > 0 ? 0 : PI, L * 0.6, d > 0 ? 1 : -1, r0 * 0.7, color, 2);
      lens(ctx, cx + d * size * 0.23, cy - size * 0.05, d > 0 ? -0.5 : PI + 0.5, size * 0.09, size * 0.028, color);
      lens(ctx, cx + d * size * 0.23, cy + size * 0.05, d > 0 ? 0.5 : PI - 0.5, size * 0.09, size * 0.028, color);
      dot(ctx, cx + d * (L + size * 0.11), cy, 2.2);
    });
    dot(ctx, cx, cy - size * 0.09, 2); dot(ctx, cx, cy + size * 0.09, 2);
  }
  // Ecken-Zierstück am Fotorahmen: sx, sy zeigen von der Ecke nach außen; die Arme laufen an den Kanten
  // nach innen, ihre Spiralen rollen sich nach außen ein
  function frameCorner(ctx, x, y, sx, sy, color) {
    ctx.fillStyle = color; diamond(ctx, x, y, 6);
    scrollArm(ctx, x - sx * 11, y, sx > 0 ? PI : 0, 44, -sx * sy, 6.5, color, 2.6);
    scrollArm(ctx, x, y - sy * 11, sy > 0 ? -PI / 2 : PI / 2, 44, sx * sy, 6.5, color, 2.6);
  }
  // Rahmenlinie um die ganze Slide mit eingekerbten Ecken (bei Panoramen nur außen)
  function slideFrame(ctx, E, color) {
    var x0 = 18, x1 = W - 18, y0 = 18, y1 = H - 18, r = 16, xa = E.first ? x0 + r : -2, xb = E.last ? x1 - r : W + 2;
    ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(xa, y0); ctx.lineTo(xb, y0); ctx.moveTo(xa, y1); ctx.lineTo(xb, y1);
    if (E.first) {
      ctx.moveTo(x0, y0 + r); ctx.lineTo(x0, y1 - r);
      ctx.moveTo(x0 + r, y0); ctx.arc(x0, y0, r, 0, PI / 2, false);
      ctx.moveTo(x0, y1 - r); ctx.arc(x0, y1, r, 1.5 * PI, 2 * PI, false);
    }
    if (E.last) {
      ctx.moveTo(x1, y0 + r); ctx.lineTo(x1, y1 - r);
      ctx.moveTo(x1, y0 + r); ctx.arc(x1, y0, r, PI / 2, PI, false);
      ctx.moveTo(x1 - r, y1); ctx.arc(x1, y1, r, PI, 1.5 * PI, false);
    }
    ctx.stroke();
    ctx.fillStyle = color;
    if (E.first) { dot(ctx, x0, y0, 3.5); dot(ctx, x0, y1, 3.5); }
    if (E.last) { dot(ctx, x1, y0, 3.5); dot(ctx, x1, y1, 3.5); }
  }

  // ---------- Stile ----------
  var styles = {};

  // Gold: Rahmen versetzt hinter dem Foto, Winkel in den Ecken, Fußzeile mit Haarlinie
  (function () {
    var PAL = {
      light: { bg: '#f6f3ed', ink: '#2a2826', gold: '#b87a12', glow: 0.2, grain: 0.05 },
      dark: { bg: '#0e0d12', ink: '#ece8e1', gold: '#f0b44c', glow: 0.17, grain: 0.05 }
    };
    styles.gold = {
      name: 'Gold', shift: 0, fonts: ['500 22px Manrope', '600 16px Manrope', '800 60px Syne'],
      pal: function (th) { return PAL[th]; },
      behind: function (ctx, E) {
        var P = E.p, multi = E.parts > 1;
        ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
        var gx = multi ? E.parts * W / 2 - E.part * W : (E.k % 2 ? W * 0.1 : W * 0.9), gy = multi ? H * 0.3 : (E.k % 2 ? H * 0.95 : H * 0.05);
        var g = ctx.createRadialGradient(gx, gy, 0, gx, gy, multi ? 950 : 800);
        g.addColorStop(0, 'rgba(240,180,76,' + P.glow + ')'); g.addColorStop(1, 'rgba(240,180,76,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        grain(ctx, P.grain);
      },
      mat: function (ctx, E, r) {
        ctx.strokeStyle = E.p.gold; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.9;
        ctx.strokeRect(r.x + K.FR, r.y + K.FR, r.w, r.h); ctx.globalAlpha = 1;
      },
      front: function (ctx, E) {
        var P = E.p, n = E.n, k = E.k;
        // Ecken-Winkel (bei Panoramen nur außen)
        ctx.strokeStyle = P.gold; ctx.lineWidth = 3; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.globalAlpha = 0.85;
        var a = 24, L = 38;
        [[E.first, a, a, 1, 1], [E.last, W - a, a, -1, 1], [E.first, a, H - a, 1, -1], [E.last, W - a, H - a, -1, -1]].forEach(function (c) {
          if (!c[0]) return;
          ctx.beginPath(); ctx.moveTo(c[1] + c[3] * L, c[2]); ctx.lineTo(c[1], c[2]); ctx.lineTo(c[1], c[2] + c[4] * L); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        if (E.cover && E.text) {
          var txt = E.text.toUpperCase(), ty = H - BOT - 50, size = fitSize(ctx, txt, 62, W - 2 * MX - 120, 800, 'Syne', 0.04);
          var tr = spaced(ctx, txt, MX, ty, size, 'left', P.ink, 800, 'Syne', 0.04);
          ctx.fillStyle = P.gold; ctx.fillRect(MX, ty - size / 2 - 26, 56, 4);
          var sx = MX + tr.w + 40;
          if (sx + 60 < W - MX) { sparkle(ctx, sx, ty - size * 0.18, 20); sparkle(ctx, sx + 36, ty + size * 0.22, 9); }
        }
        var fy = H - 40, hy = H - 72;
        ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.25;
        line(ctx, E.first ? MX : 0, hy, E.last ? W - MX : W, hy); ctx.globalAlpha = 1;
        ctx.fillStyle = P.gold;
        if (E.first) diamond(ctx, MX, hy, 6);
        if (E.last) diamond(ctx, W - MX, hy, 6);
        ctx.globalAlpha = 0.62; spaced(ctx, CREDIT, W / 2, fy, 15, 'center', P.ink, 500, 'Manrope', 0.28); ctx.globalAlpha = 1;
        ctx.strokeStyle = P.gold; ctx.fillStyle = P.gold; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (k < n - 1) {
          if (E.cover) spaced(ctx, 'SWIPE', W - MX - 46, fy, 16, 'right', P.gold, 600, 'Manrope', 0.28);
          arrow(ctx, W - MX - 10, fy);
        } else sparkle(ctx, W - MX - 10, fy, 12);
      }
    };
  })();

  // Blumen: Papierrand um die Fotos, gezeichnete Ranken und Blüten, kursive Schrift.
  // o.glow: farbiger Lichtschein; o.hair: feine Linie um den Papierrand (für die einfarbige Fassung)
  function blumenStyle(name, PAL, o) {
    return {
      name: name, shift: 6, fonts: ['italic 400 60px Cardo', '400 20px Cardo'],
      pal: function (th) { return PAL[th]; },
      behind: function (ctx, E) {
        var P = E.p, R = E.R;
        ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
        if (o.glow) glow(ctx, E.k % 2 ? W * 0.15 : W * 0.85, E.k % 2 ? H * 0.9 : H * 0.12, 760, P.rose, E.theme === 'dark' ? 0.09 : 0.14);
        grain(ctx, o.glow ? 0.045 : 0.03);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, E.clipY); ctx.clip();
        // Ecken-Sträuße samt Ranken, bei Panoramen in Gesamt-Koordinaten (passt über die Kante)
        ctx.save(); ctx.translate(-E.part * W, 0);
        var GW = E.parts * W, RG = E.RG, diag = RG() < 0.5;
        if (diag) { bloomCorner(ctx, RG, P, true, true, GW, E.clipY); bloomCorner(ctx, RG, P, false, false, GW, E.clipY); }
        else { bloomCorner(ctx, RG, P, true, false, GW, E.clipY); bloomCorner(ctx, RG, P, false, true, GW, E.clipY); }
        ctx.restore();
        // freie Flächen: ein Strauß und kleine Zweige
        var big = spot(E, 310, 290, 60), sz = 104;
        if (!big) { big = spot(E, 230, 215, 60); sz = 76; }
        if (big) { cluster(ctx, R, P, big.x + big.w / 2, big.y + big.h / 2, sz, rr(R, 0, TAU)); E.blocked.push(big); }
        for (var i = 0; i < 3; i++) {
          var sm = spot(E, 140, 140, 40);
          if (sm) { cluster(ctx, R, P, sm.x + 70, sm.y + 70, 50, rr(R, 0, TAU)); E.blocked.push(sm); }
        }
        ctx.restore();
      },
      mat: function (ctx, E, r) {
        var b = 11;
        ctx.save(); ctx.shadowColor = E.p.shadow; ctx.shadowBlur = 26 * E.scale; ctx.shadowOffsetY = 8 * E.scale;
        ctx.fillStyle = E.p.paper; ctx.fillRect(r.x - b, r.y - b, r.w + 2 * b, r.h + 2 * b);
        ctx.restore();
        if (o.hair) { ctx.strokeStyle = rgba(E.p.ink, 0.55); ctx.lineWidth = 1.2; ctx.strokeRect(r.x - b, r.y - b, r.w + 2 * b, r.h + 2 * b); }
      },
      front: function (ctx, E) {
        var P = E.p, k = E.k, n = E.n, R = E.R;
        if (E.cover && E.text) {
          var txt = E.text, ty = H - BOT - 52, size = fitSize(ctx, txt, 96, W - 2 * MX, 400, 'Cardo', 0, true);
          var tr = spaced(ctx, txt, W / 2, ty, size, 'center', P.ink, 400, 'Cardo', 0, true);
          // kleine Zweige links und rechts vom Titel (nur wenn Platz ist)
          if (tr.w / 2 + 34 + 96 < W / 2 - MX) {
            [-1, 1].forEach(function (d) {
              var x0 = W / 2 + d * (tr.w / 2 + 34), y0 = ty + size * 0.05;
              ctx.strokeStyle = P.sage; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; line(ctx, x0, y0, x0 + d * 74, y0);
              leaf(ctx, x0 + d * 22, y0, d > 0 ? -0.7 : PI + 0.7, 32, 9, P.sage); leaf(ctx, x0 + d * 22, y0, d > 0 ? 0.7 : PI - 0.7, 32, 9, P.sage);
              leaf(ctx, x0 + d * 46, y0, d > 0 ? -0.6 : PI + 0.6, 26, 8, P.sage); leaf(ctx, x0 + d * 46, y0, d > 0 ? 0.6 : PI - 0.6, 26, 8, P.sage);
              blossom(ctx, x0 + d * 86, y0, 13, 5, 0.3, P.rose, P.gold, false);
            });
          }
        }
        // Fußzeile: Linie mit Blüte in der Mitte
        var fy = H - 40, hy = H - 70, a = E.first ? MX : 0, b = E.last ? W - MX : W;
        ctx.strokeStyle = P.sage; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.6; ctx.lineCap = 'round';
        line(ctx, a, hy, W / 2 - 66, hy); line(ctx, W / 2 + 66, hy, b, hy); ctx.globalAlpha = 1;
        leaf(ctx, W / 2 - 14, hy, PI + 0.15, 46, 9, P.sage); leaf(ctx, W / 2 + 14, hy, -0.15, 46, 9, P.sage);
        blossom(ctx, W / 2, hy, 11, 5, 0.2, P.rose, P.gold, false);
        ctx.globalAlpha = 0.75; spaced(ctx, CREDIT, W / 2, fy, 15, 'center', P.ink, 400, 'Cardo', 0.2); ctx.globalAlpha = 1;
        if (k < n - 1) { ctx.strokeStyle = P.rose; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; arrow(ctx, W - MX - 10, fy); }
        else blossom(ctx, W - MX - 12, fy, 13, 5, 0.3, P.rose, P.gold, false);
      }
    };
  }
  styles.blumen = blumenStyle('Blumen', {
    dark: { bg: '#111513', ink: '#eee6d8', sage: '#8fb28b', rose: '#e9a898', gold: '#e4bd70', paper: '#efe8da', shadow: 'rgba(0,0,0,0.55)' },
    light: { bg: '#f4eee3', ink: '#3a2e28', sage: '#62865d', rose: '#cc6f59', gold: '#b98a2e', paper: '#fffdf8', shadow: 'rgba(70,45,30,0.28)' }
  }, { glow: true });
  // Einfarbig: Schwarz auf Hell, Weiß auf Dunkel – dieselben gezeichneten Blumen, nur in einer Farbe
  styles.blumenSW = blumenStyle('Blumen s/w', {
    dark: { bg: '#0a0a0a', ink: '#f2f0ec', sage: '#f2f0ec', rose: '#f2f0ec', gold: '#f2f0ec', paper: '#f2f0ec', shadow: 'rgba(0,0,0,0.6)' },
    light: { bg: '#f6f5f2', ink: '#141414', sage: '#141414', rose: '#141414', gold: '#141414', paper: '#ffffff', shadow: 'rgba(0,0,0,0.26)' }
  }, { hair: true });

  // Schnörkel: Ornamente, Doppelrahmen mit Eck-Schnörkeln, Zierstücke in freien Flächen
  function schnoerkelStyle(name, PAL, o) {
    return {
      name: name, shift: 6, fonts: ['400 20px Cardo', 'italic 400 40px Cardo'],
      pal: function (th) { return PAL[th]; },
      behind: function (ctx, E) {
        var P = E.p, R = E.R;
        ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
        if (P.glow) glow(ctx, W / 2, E.k % 2 ? H * 0.8 : H * 0.18, 900, '#e2b45a', P.glow);
        grain(ctx, P.glow ? 0.05 : 0.03);
        slideFrame(ctx, E, P.gold);
        // Zierstücke in freien Flächen: waagerecht, senkrecht, klein
        var a = spot(E, 330, 100, 60);
        if (a) { fleuron(ctx, a.x + a.w / 2, a.y + a.h / 2, 230, P.gold); E.blocked.push(a); }
        var v = spot(E, 100, 330, 60);
        if (v) { ctx.save(); ctx.translate(v.x + v.w / 2, v.y + v.h / 2); ctx.rotate(PI / 2); fleuron(ctx, 0, 0, 230, P.gold); ctx.restore(); E.blocked.push(v); }
        for (var i = 0; i < 2; i++) {
          var b = spot(E, 200, 70, 50);
          if (b) { fleuron(ctx, b.x + b.w / 2, b.y + b.h / 2, 140, P.gold); E.blocked.push(b); }
        }
      },
      mat: function (ctx, E, r) {
        var P = E.p, o = 12, i = 5;
        ctx.strokeStyle = P.gold; ctx.lineWidth = 2.4; ctx.strokeRect(r.x - o, r.y - o, r.w + 2 * o, r.h + 2 * o);
        ctx.lineWidth = 1.1; ctx.strokeRect(r.x - i, r.y - i, r.w + 2 * i, r.h + 2 * i);
        frameCorner(ctx, r.x - o, r.y - o, -1, -1, P.gold); frameCorner(ctx, r.x + r.w + o, r.y - o, 1, -1, P.gold);
        frameCorner(ctx, r.x - o, r.y + r.h + o, -1, 1, P.gold); frameCorner(ctx, r.x + r.w + o, r.y + r.h + o, 1, 1, P.gold);
      },
      front: function (ctx, E) {
        var P = E.p, k = E.k, n = E.n;
        if (E.cover && E.text) {
          var txt = E.text.toUpperCase(), ty = H - BOT - 36, size = fitSize(ctx, txt, 62, W - 2 * MX, 400, 'Cardo', 0.14);
          spaced(ctx, txt, W / 2, ty, size, 'center', P.ink, 400, 'Cardo', 0.14);
          fleuron(ctx, W / 2, ty - size * 0.62 - 22, 210, P.gold);
        }
        var fy = H - 40, hy = H - 70, a = E.first ? MX : 0, b = E.last ? W - MX : W;
        ctx.strokeStyle = P.gold; ctx.lineCap = 'round';
        ctx.lineWidth = 1.6; line(ctx, a, hy, W / 2 - 96, hy); line(ctx, W / 2 + 96, hy, b, hy);
        ctx.lineWidth = 0.9; line(ctx, a, hy + 5, W / 2 - 96, hy + 5); line(ctx, W / 2 + 96, hy + 5, b, hy + 5);
        fleuron(ctx, W / 2, hy + 2, 150, P.gold);
        ctx.globalAlpha = 0.78; spaced(ctx, CREDIT, W / 2, fy, 15, 'center', P.ink, 400, 'Cardo', 0.2); ctx.globalAlpha = 1;
        ctx.strokeStyle = P.gold; ctx.fillStyle = P.gold; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
        if (k < n - 1) arrow(ctx, W - MX - 10, fy); else diamond(ctx, W - MX - 10, fy, 8);
      }
    };
  }
  styles.schnoerkel = schnoerkelStyle('Schnörkel', {
    dark: { bg: '#0e0c0b', ink: '#efe6d2', gold: '#d6b165', glow: 0.14 },
    light: { bg: '#f3ecdb', ink: '#2d261f', gold: '#94701f', glow: 0.24 }
  });
  // Einfarbig: Schwarz auf Hell, Weiß auf Dunkel
  styles.schnoerkelSW = schnoerkelStyle('Schnörkel s/w', {
    dark: { bg: '#0a0a0a', ink: '#f2f0ec', gold: '#f2f0ec', glow: 0 },
    light: { bg: '#f6f5f2', ink: '#141414', gold: '#141414', glow: 0 }
  });

  // Nacht: Club-Look mit Lichtflecken, Glanzsternen, Sternbild, Sternschnuppe und Neon-Rand
  (function () {
    var PAL = {
      dark: { bg: '#08070f', ink: '#f3effa', a: '#ff5fc8', b: '#5fd4ff', c: '#8a5cff', gold: '#ffd27a', bokeh: 0.26 },
      light: { bg: '#f1eefa', ink: '#1d1633', a: '#d6339f', b: '#1f86d1', c: '#6a3fd6', gold: '#c98a1c', bokeh: 0.17 }
    };
    function star(ctx, x, y, r, col, blur, sc) {   // Glanzstern mit Schein
      ctx.save(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = blur * sc; sparkle(ctx, x, y, r); ctx.restore();
    }
    styles.nacht = {
      name: 'Nacht', shift: 6, fonts: ['800 60px Syne', '500 16px Manrope', '600 16px Manrope'],
      pal: function (th) { return PAL[th]; },
      behind: function (ctx, E) {
        var P = E.p, R = E.R, cols = [P.a, P.b, P.c], i;
        ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
        for (i = 0; i < 7; i++) glow(ctx, R() * W, R() * H, rr(R, 90, 260), cols[Math.floor(R() * 3)], P.bokeh * rr(R, 0.6, 1));
        // Lichtstreifen
        ctx.save(); ctx.lineCap = 'round';
        for (i = 0; i < 2; i++) {
          var x = R() * W, y = R() * H * 0.9, a = -rr(R, 0.35, 0.6), L = rr(R, 500, 900), c = cols[i];
          var g = ctx.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
          g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.5, rgba(c, 0.45)); g.addColorStop(1, rgba(c, 0));
          ctx.strokeStyle = g; ctx.lineWidth = rr(R, 2, 5); line(ctx, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
        }
        ctx.restore();
        grain(ctx, 0.06);
        // Staub
        ctx.fillStyle = P.ink;
        for (i = 0; i < 34; i++) { ctx.globalAlpha = rr(R, 0.15, 0.5); dot(ctx, R() * W, R() * (H - BOT), rr(R, 1, 2.6)); }
        ctx.globalAlpha = 1;
      },
      mat: function (ctx, E, r) {
        var P = E.p, o = 9;
        ctx.save(); ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.shadowBlur = 24 * E.scale;
        ctx.shadowColor = P.b; ctx.strokeStyle = P.b; ctx.strokeRect(r.x - o - 2, r.y - o - 2, r.w + 2 * o, r.h + 2 * o);
        ctx.shadowColor = P.a; ctx.strokeStyle = P.a; ctx.strokeRect(r.x - o + 2, r.y - o + 2, r.w + 2 * o, r.h + 2 * o);
        ctx.restore();
        // Glanzsterne an zwei Ecken (liegen vor dem Foto, damit ihr Schein es nie berührt)
        var R = E.R, c = [[r.x - 12, r.y - 12], [r.x + r.w + 12, r.y - 12], [r.x - 12, r.y + r.h + 12], [r.x + r.w + 12, r.y + r.h + 12]];
        for (var j = 0; j < 2; j++) { var q = c[Math.floor(R() * 4)]; star(ctx, q[0], q[1], rr(R, 12, 24), j ? P.gold : P.ink, 18, E.scale); }
      },
      front: function (ctx, E) {
        var P = E.p, R = E.R, k = E.k, n = E.n, sc = E.scale, i;
        // Sternbild und Sternschnuppe in freien Flächen
        var cs = spot(E, 230, 160, 60);
        if (cs) {
          var pts = []; for (i = 0; i < 6; i++) pts.push([cs.x + 20 + i * (cs.w - 40) / 5, cs.y + 20 + R() * (cs.h - 40)]);
          ctx.strokeStyle = rgba(P.ink, 0.55); ctx.lineWidth = 1.3; ctx.beginPath(); pts.forEach(function (q, j) { if (j) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke();
          ctx.fillStyle = P.ink; pts.forEach(function (q, j) { dot(ctx, q[0], q[1], j === 2 ? 4.5 : 3); });
          star(ctx, pts[2][0], pts[2][1], 15, P.gold, 16, sc); E.blocked.push(cs);
        }
        var ss = spot(E, 300, 130, 60);
        if (ss) {
          var hx = ss.x + ss.w - 20, hy2 = ss.y + 24, ex = hx - 240, ey = hy2 + 90;
          var g = ctx.createLinearGradient(hx, hy2, ex, ey); g.addColorStop(0, rgba(P.ink, 0.95)); g.addColorStop(1, rgba(P.ink, 0));
          ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round'; line(ctx, hx, hy2, ex, ey);
          star(ctx, hx, hy2, 17, P.ink, 20, sc); E.blocked.push(ss);
        }
        for (i = 0; i < 4; i++) {
          var sp = spot(E, 60, 60, 40);
          if (sp) { star(ctx, sp.x + 30, sp.y + 30, rr(R, 8, 20), i % 2 ? P.a : P.b, 16, sc); E.blocked.push(sp); }
        }
        // Titel mit Neon-Schein
        if (E.cover && E.text) {
          var txt = E.text.toUpperCase(), ty = H - BOT - 50, size = fitSize(ctx, txt, 62, W - 2 * MX - 90, 800, 'Syne', 0.04);
          ctx.save(); ctx.shadowColor = P.a; ctx.shadowBlur = (E.theme === 'dark' ? 26 : 0) * sc;
          var tr = spaced(ctx, txt, MX, ty, size, 'left', P.ink, 800, 'Syne', 0.04); ctx.restore();
          if (MX + tr.w + 60 < W - MX) { star(ctx, MX + tr.w + 40, ty - size * 0.2, 20, P.b, 18, sc); star(ctx, MX + tr.w + 76, ty + size * 0.2, 9, P.a, 14, sc); }
        }
        // Fußzeile: Farbverlauf-Linie mit Glühen, Zähler, Credit, Pfeil
        var fy = H - 40, hy = H - 72, a0 = E.first ? MX : 0, b0 = E.last ? W - MX : W;
        var lg = ctx.createLinearGradient(a0, 0, b0, 0); lg.addColorStop(0, P.b); lg.addColorStop(0.5, P.c); lg.addColorStop(1, P.a);
        ctx.save(); ctx.strokeStyle = lg; ctx.lineWidth = 2.4; ctx.shadowColor = P.c; ctx.shadowBlur = 12 * sc; line(ctx, a0, hy, b0, hy); ctx.restore();
        ctx.globalAlpha = 0.7; spaced(ctx, CREDIT, W / 2, fy, 15, 'center', P.ink, 500, 'Manrope', 0.28); ctx.globalAlpha = 1;
        ctx.strokeStyle = P.a; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (k < n - 1) arrow(ctx, W - MX - 10, fy); else star(ctx, W - MX - 10, fy, 13, P.gold, 14, sc);
      }
    };
  })();

  window.GalerieStile = {
    K: K, order: ['gold', 'blumen', 'blumenSW', 'schnoerkel', 'schnoerkelSW', 'nacht'], styles: styles,
    // Fotos dürfen nicht überdeckt werden: gesperrte Flächen für freie Verzierungen
    blockedFor: function (rects, cover, text) {
      var b = rects.map(function (r) { return { x: r.x - 28, y: r.y - 28, w: r.w + 56, h: r.h + 56 }; });
      b.push({ x: 0, y: H - BOT + 6, w: W, h: BOT });
      if (cover && text) b.push({ x: 0, y: H - BOT - CT, w: W, h: CT });
      return b;
    }
  };
})();
