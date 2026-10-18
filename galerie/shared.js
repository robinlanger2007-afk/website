/* Kundengalerie – gemeinsame Funktionen (Verschlüsselung + ZIP) */
(function () {
  'use strict';
  var enc = new TextEncoder();
  var SALT = enc.encode('langer-photo.de/galerie/v1');
  var ITER = 400000;

  // Aus dem Passwort werden ein AES-Schlüssel und der Ordnername der Galerie abgeleitet.
  async function derive(pw, usages) {
    var base = await crypto.subtle.importKey('raw', enc.encode(String(pw).trim().normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: SALT, iterations: ITER }, base, 384));
    var key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, usages || ['decrypt']);
    var id = Array.prototype.map.call(bits.slice(32, 44), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    return { key: key, id: id };
  }

  async function decrypt(key, buf) {
    var u = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(0, 12) }, key, u.subarray(12));
  }

  async function encrypt(key, data) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data);
    return new Blob([iv, ct]);
  }

  // Minimaler ZIP-Ersteller (unkomprimiert – Fotos lassen sich ohnehin kaum packen)
  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function dosTime(d) {
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }
  function Zip() { this.parts = []; this.central = []; this.offset = 0; this.count = 0; }
  Zip.prototype.add = function (name, buf) {
    var data = new Uint8Array(buf), nm = enc.encode(name), crc = crc32(data), t = dosTime(new Date());
    var h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, t.time, true); h.setUint16(12, t.date, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    var c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, t.time, true); c.setUint16(14, t.date, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true);
    c.setUint32(42, this.offset, true);
    this.parts.push(h.buffer, nm, new Blob([data]));
    this.central.push(c.buffer, nm);
    this.offset += 30 + nm.length + data.length;
    this.count++;
  };
  Zip.prototype.blob = function () {
    var size = 0; this.central.forEach(function (p) { size += p.byteLength; });
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, this.count, true); e.setUint16(10, this.count, true);
    e.setUint32(12, size, true); e.setUint32(16, this.offset, true);
    return new Blob(this.parts.concat(this.central, [e.buffer]), { type: 'application/zip' });
  };

  function fmtBytes(b) {
    if (b >= 1e9) return (b / 1e9).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' GB';
    if (b >= 1e6) return (b / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB';
    return Math.max(1, Math.round(b / 1e3)) + ' KB';
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function slug(s) {
    return (String(s || 'galerie').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'galerie').slice(0, 60);
  }

  window.Galerie = { derive: derive, decrypt: decrypt, encrypt: encrypt, Zip: Zip, crc32: crc32, fmtBytes: fmtBytes, fmtDate: fmtDate, slug: slug };
})();
