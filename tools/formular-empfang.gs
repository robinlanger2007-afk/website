/**
 * Anfrage-Empfang für langer-photo.de (Google Apps Script)
 *
 * Nimmt die Anfrage vom Formular auf der Website entgegen und schickt sie als
 * E-Mail an das Gmail-Postfach des Kontos, unter dem dieses Skript läuft.
 * Es wird nichts gespeichert und nichts protokolliert.
 *
 * Einrichtung: siehe README.md (Abschnitt "Anfrage-Formular").
 * Bereitstellen als Web-App mit  Ausführen als: Ich  und  Zugriff: Jeder.
 * Nach jeder Änderung: Bereitstellen > Bereitstellungen verwalten > Stift >
 * Version: Neue Version > Bereitstellen (die Adresse bleibt dann gleich).
 */

var MAX_PRO_STUNDE = 20;   // Schutz davor, dass jemand dein Postfach und das Tageslimit vollmüllt

function doGet() {
  return antwort({ result: 'ok', info: 'Anfrage-Empfang läuft.' });
}

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // Honigtopf: Das Feld "website" sieht ein Mensch nie, Bots füllen es aus.
    if (p.website) return antwort({ result: 'success' });

    var name = saubern(p.name, 100);
    var kontakt = saubern(p.contact, 200);
    var text = String(p.message || '').slice(0, 6000);
    var betreff = saubern(p.subject, 160) || 'Neue Anfrage';
    if (!name || !text) return antwort({ result: 'error', error: 'fehlende Angaben' });

    // Grobe Mengenbremse (ein Zähler pro Stunde)
    var cache = CacheService.getScriptCache();
    var slot = 'n' + Math.floor(Date.now() / 3600000);
    var n = Number(cache.get(slot) || 0);
    if (n >= MAX_PRO_STUNDE) return antwort({ result: 'error', error: 'zu viele Anfragen' });
    cache.put(slot, String(n + 1), 3600);

    var mail = {
      to: Session.getEffectiveUser().getEmail(),
      subject: '[langer-photo.de] ' + betreff,
      body: text,
      name: 'langer-photo.de'
    };
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
