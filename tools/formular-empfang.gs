/**
 * Anfrage-Empfang für langer-photo.de (Google Apps Script)
 * Nimmt die Anfrage vom Formular der Website entgegen und schickt sie als E-Mail
 * an EMPFAENGER. Nichts wird gespeichert oder protokolliert.
 * Einrichtung: siehe README.md, Abschnitt "Anfrage-Formular".
 */
var EMPFAENGER = 'robin.langer2007@gmail.com';
var MAX_PRO_STUNDE = 20;   // Schutz davor, dass jemand das Postfach und das Tageslimit vollmüllt

function doGet() {
  return antwort({ result: 'ok', info: 'Anfrage-Empfang läuft.' });
}

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.website) return antwort({ result: 'success' });          // Honigtopf für Bots

    var name = saubern(p.name, 100), kontakt = saubern(p.contact, 200);
    var betreff = saubern(p.subject, 160) || 'Neue Anfrage';
    var text = String(p.message || '').slice(0, 6000);
    if (!name || !text) return antwort({ result: 'error', error: 'fehlende Angaben' });

    var cache = CacheService.getScriptCache();
    var slot = 'n' + Math.floor(Date.now() / 3600000);               // ein Zähler pro Stunde
    var n = Number(cache.get(slot) || 0);
    if (n >= MAX_PRO_STUNDE) return antwort({ result: 'error', error: 'zu viele Anfragen' });
    cache.put(slot, String(n + 1), 3600);

    var mail = { to: EMPFAENGER, subject: '[langer-photo.de] ' + betreff, body: text, name: 'langer-photo.de' };
    if (/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(kontakt)) mail.replyTo = kontakt;
    MailApp.sendEmail(mail);
    return antwort({ result: 'success' });
  } catch (err) {
    return antwort({ result: 'error', error: 'Serverfehler' });
  }
}

function saubern(v, max) {
  return String(v || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function antwort(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
