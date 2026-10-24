# langer-photo.de

Portfolio-Seite von Robin Langer, Fotograf in Leipzig. Eine einzige Seite aus reinem HTML, CSS und JavaScript, ohne Build-Schritt, ohne Cookies, ohne Tracking.

**Es gibt nur diese eine Version.** Alles, was Besucher sehen, kommt aus diesem Repository (Branch `main`) und wird über GitHub Pages unter https://www.langer-photo.de ausgeliefert. Ein Push auf `main` ist nach ein bis drei Minuten live. Der frühere Link auf claude.ai zeigt nur noch einen Hinweis mit Knopf zu dieser Seite (eine automatische Weiterleitung blockiert Claude dort) und wird nicht mehr gepflegt. Links in Instagram, TikTok und anderswo besser direkt auf https://www.langer-photo.de setzen.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | die ganze Seite: Texte, Gestaltung, Skripte, Fotoliste, Impressum und Datenschutz |
| `img/` | Fotos als WebP: `pNN.webp` (1800 px) und `pNN-t.webp` (900 px Vorschau) |
| `og.jpg` | Bild für Link-Vorschauen (WhatsApp, Instagram, Google) |
| `sitemap.xml`, `robots.txt` | für Suchmaschinen |
| `CNAME` | Domain für GitHub Pages (`www.langer-photo.de`) |
| `googlefbd1f1a1989dd713.html` | Bestätigung für die Google Search Console. Nicht löschen, sonst verliert die Property die Bestätigung |
| `galerie/` | Kundengalerie (eigenes Projekt von Robin, hat mit dem Rest nichts zu tun) |
| `tools/add_photos.py` | neue Fotos hinzufügen |
| `tools/formular-empfang.gs` | Google-Skript, das Anfragen aus dem Formular in Robins Postfach legt |
| `404.html` | Eigene „Seite nicht gefunden“-Seite (GitHub Pages liefert sie automatisch) |
| `apple-touch-icon.png`, `favicon.ico` | Symbol für den iPhone-Homescreen und Browser-Tab (dunkel mit „RL“) |

## Neue Fotos hinzufügen

Am einfachsten: Fotos an Claude schicken, mit Kategorie und einem Satz Beschreibung pro Bild. Von Hand:

```
pip install pillow
python3 tools/add_photos.py --cat club  foto1.jpg="DJ am Pult im blauen Licht"  foto2.jpg="Gäste tanzen"
python3 tools/add_photos.py --new-cat "Hochzeiten" --first  hochzeit1.jpg="Brautpaar im Gegenlicht"
```

Das Werkzeug macht aus jedem Foto die große Fassung und die Vorschau, trägt es in die Fotoliste in `index.html` ein und setzt das Datum in `sitemap.xml`. Danach die Seite lokal ansehen (`python3 -m http.server`), committen, pushen.

Kategorien sind `geburtstag`, `club` und `c1792272530021` (Portraits). Pro Kategorie zeigt die Seite zuerst fünf Fotos, die übrigen öffnen sich über „Alle … Bilder ansehen“. Neue Fotos stehen am Ende ihrer Kategorie, mit `--first` am Anfang. Der Alt-Text (die Beschreibung in Anführungszeichen) ist wichtig für Google und Screenreader: ein Satz, der sagt, was zu sehen ist.

## Texte ändern

- Sprüche, Beschriftungen, Fehlermeldungen: im Skript `i18n-js` in `index.html`, Wörterbuch `UI`. Pro Eintrag Deutsch und Englisch.
- Untertitel und „Über mich“: im Block `pdata` (`texts`).
- Impressum und Datenschutz: als HTML im Dialog `dlg-impressum` / `dlg-datenschutz`. Die englische Fassung steht in den Listen `IMP` und `DSG` im selben Skript und **muss genauso viele Absätze haben wie die deutsche**, sonst bleibt die englische Ansicht deutsch.
- Sprachen: nur Deutsch und Englisch sind im Angebot (`OFFER`). Spanisch und Französisch sind im Code vorbereitet, aber nicht freigeschaltet.

## Anfrage-Formular

Der Besucher wählt Tag, Art, Dauer und so weiter, die Seite baut daraus eine fertige Nachricht. Wie sie bei Robin ankommt, steuert die Zeile `var ENDPOINT='';` am Anfang des Formular-Skripts in `index.html`:

- **`ENDPOINT` gesetzt (Normalfall):** Der Knopf „Anfrage abschicken“ sendet die Anfrage an ein kleines Google-Skript (`tools/formular-empfang.gs`), das sie als E-Mail in Robins Gmail-Postfach legt. Die Mail ist auf Deutsch, auch wenn der Besucher die Seite auf Englisch nutzt, und hat bei einer E-Mail-Adresse als Kontakt automatisch „Antworten“ an den Besucher. Klappt das Senden nicht (offline, Google-Fehler), zeigt die Seite die Ausweichwege E-Mail-Programm, Gmail, Kopieren und Instagram. Ein verstecktes Feld (`website`) fängt einfache Spam-Bots, das Skript begrenzt auf 20 Anfragen pro Stunde. Kontakt ist dann Pflichtfeld, sonst könnte Robin nicht antworten. Gibt der Besucher eine E-Mail-Adresse an, schickt das Skript ihm zusätzlich eine kurze Bestätigung (fester Text, zweisprachig, nichts aus der Anfrage; pro Adresse höchstens alle 6 Stunden, abschaltbar mit `BESTAETIGUNG = false` im Skript). Das steht auch in der Datenschutzerklärung.
- **`ENDPOINT` leer:** Die Seite verschickt nichts selbst. Der Besucher wählt E-Mail-Programm, Gmail, Kopieren oder Instagram (`ig.me/m/antifazkee`). Dann passt aber der Datenschutztext nicht mehr (Abschnitt 5 und 2 sagen, dass über einen Google-Dienst gesendet wird).

### Einmal einrichten

1. Im Google-Konto von Robin (robin.langer2007@gmail.com) https://script.google.com öffnen, „Neues Projekt“.
2. Den Inhalt von `tools/formular-empfang.gs` einfügen (vorhandenen Beispielcode vorher löschen), speichern, Projekt „langer-photo Anfragen“ nennen.
3. „Bereitstellen“ > „Neue Bereitstellung“ > Zahnrad > „Web-App“. Einstellungen: **Ausführen als: Ich**, **Zugriff: Jeder**. „Bereitstellen“.
4. Google fragt nach Zugriff: „Zugriff autorisieren“, Konto wählen, bei der Warnung „Google hat diese App nicht überprüft“ auf „Erweitert“ und „Zu … (unsicher)“ gehen, „Zulassen“. Die App darf nur E-Mails senden.
5. Die „Web-App-URL“ kopieren (`https://script.google.com/macros/s/…/exec`) und als `ENDPOINT` eintragen. Zum Prüfen die Adresse im Browser öffnen: Es muss `{"result":"ok", …}` erscheinen.
6. Ein Testformular auf der Live-Seite abschicken. Die Mail muss im Postfach ankommen (auch im Spam-Ordner nachsehen).

Nach einer Änderung am Skript: „Bereitstellen“ > „Bereitstellungen verwalten“ > Stift > Version „Neue Version“ > „Bereitstellen“. Eine **neue Bereitstellung** erzeugt eine neue Adresse, die dann wieder als `ENDPOINT` eingetragen werden muss.

## Prüfen vor dem Veröffentlichen

Seite lokal öffnen und durchklicken: Deutsch und Englisch umschalten, Galerie und Lightbox, Favoriten, Formular bis zur fertigen Nachricht, Impressum und Datenschutz in beiden Sprachen. Die Browser-Konsole darf keine Fehler zeigen.
