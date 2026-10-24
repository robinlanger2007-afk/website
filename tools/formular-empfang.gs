/**
 * Anfrage-Empfang für langer-photo.de (Google Apps Script)
 * Nimmt die Anfrage vom Formular der Website entgegen und schickt sie als E-Mail
 * an EMPFAENGER. Nichts wird gespeichert oder protokolliert. Einzige Ausnahme:
 * Gibt der Besucher eine E-Mail-Adresse an, geht eine kurze Bestätigung mit festem Text
 * an ihn; dafür merkt sich der Cache sechs Stunden lang nur einen Hash der Adresse.
 * Einrichtung: siehe README.md, Abschnitt "Anfrage-Formular".
 */
var EMPFAENGER = 'robin.langer2007@gmail.com';
var MAX_PRO_STUNDE = 20;   // Schutz davor, dass jemand das Postfach und das Tageslimit vollmüllt
var BESTAETIGUNG = true;   // false = keine automatische Bestätigung an den Absender
var BESTAETIGUNG_SPERRE = 21600;   // Sekunden (6 Stunden, das Maximum des Cache): pro Adresse höchstens eine Bestätigung

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
    if (mail.replyTo) bestaetigen(kontakt);                          // Zugabe, darf nie die Antwort stören
    return antwort({ result: 'success' });
  } catch (err) {
    return antwort({ result: 'error', error: 'Serverfehler' });
  }
}

// Kurze Bestätigung an den Absender. Fester Text, nichts aus der Anfrage (kein Name, kein Betreff),
// damit das Formular nicht dazu missbraucht werden kann, fremden Leuten eigene Texte zu schicken.
function bestaetigen(adresse) {
  try {
    if (!BESTAETIGUNG || adresse.toLowerCase() === EMPFAENGER.toLowerCase()) return;
    var cache = CacheService.getScriptCache();
    var key = 'b' + kurzHash(adresse.toLowerCase());
    if (cache.get(key)) return;                                       // schon bestätigt: nicht nochmal
    cache.put(key, '1', BESTAETIGUNG_SPERRE);
    MailApp.sendEmail({
      to: adresse,
      subject: 'Deine Anfrage ist angekommen / Your inquiry has arrived',
      body: 'Hallo,\n\n' +
        'deine Anfrage über langer-photo.de ist bei mir angekommen. Ich melde mich bei dir, sobald ich sie gelesen habe.\n\n' +
        'Das ist eine automatische Bestätigung, du musst nicht darauf antworten. ' +
        'Falls du keine Anfrage gestellt hast, kannst du diese E-Mail ignorieren.\n\n' +
        'Robin Langer\nhttps://www.langer-photo.de\n\n' +
        '---\n\n' +
        'Hello,\n\n' +
        'your inquiry via langer-photo.de has reached me. I will get back to you as soon as I have read it.\n\n' +
        'This is an automatic confirmation, you do not need to reply. ' +
        'If you did not send an inquiry, you can ignore this email.\n\n' +
        'Robin Langer\nhttps://www.langer-photo.de\n',
      name: 'Robin Langer',
      replyTo: EMPFAENGER
    });
  } catch (err) { /* Bestätigung ist nur eine Zugabe: Fehler hier bleiben unbemerkt */ }
}

function kurzHash(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text);
  return bytes.map(function (b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join('').slice(0, 32);
}

function saubern(v, max) {
  return String(v || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

function antwort(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
