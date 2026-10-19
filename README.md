# langer-photo.de

Portfolio-Seite von Robin Langer, Fotograf in Leipzig. Eine einzige Seite aus reinem HTML, CSS und JavaScript, ohne Build-Schritt, ohne Cookies, ohne Tracking.

**Es gibt nur diese eine Version.** Alles, was Besucher sehen, kommt aus diesem Repository (Branch `main`) und wird über GitHub Pages unter https://www.langer-photo.de ausgeliefert. Ein Push auf `main` ist nach ein bis drei Minuten live. Der frühere Link auf claude.ai leitet nur noch hierher weiter und wird nicht mehr gepflegt.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | die ganze Seite: Texte, Gestaltung, Skripte, Fotoliste, Impressum und Datenschutz |
| `img/` | Fotos als WebP: `pNN.webp` (1800 px) und `pNN-t.webp` (900 px Vorschau) |
| `og.jpg` | Bild für Link-Vorschauen (WhatsApp, Instagram, Google) |
| `sitemap.xml`, `robots.txt` | für Suchmaschinen |
| `CNAME` | Domain für GitHub Pages (`www.langer-photo.de`) |
| `galerie/` | Kundengalerie (eigenes Projekt von Robin, hat mit dem Rest nichts zu tun) |
| `tools/add_photos.py` | neue Fotos hinzufügen |
| `tools/formular-empfang.gs` | Google-Skript, das Anfragen aus dem Formular in Robins Postfach schickt |

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

Der Besucher wählt Tag, Art, Dauer und so weiter. Die Seite baut daraus eine fertige Nachricht in seiner Sprache. Aktuell schickt die Seite nichts selbst ab: Der Besucher wählt E-Mail-Programm, Gmail, Kopieren oder Instagram (`ig.me/m/antifazkee`).

Für direktes Senden liegt `tools/formular-empfang.gs` bereit (Google Apps Script, schickt die Anfrage per E-Mail an Robins Gmail). Dafür muss Robin das Skript einmal bei Google bereitstellen und die Adresse an Claude geben. Die Seite ist dafür vorbereitet, im Datenschutztext muss dann der Absatz „Anfrageformular und Kontakt“ angepasst werden.

## Prüfen vor dem Veröffentlichen

Seite lokal öffnen und durchklicken: Deutsch und Englisch umschalten, Galerie und Lightbox, Favoriten, Formular bis zur fertigen Nachricht, Impressum und Datenschutz in beiden Sprachen. Die Browser-Konsole darf keine Fehler zeigen.
