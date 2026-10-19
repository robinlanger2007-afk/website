#!/usr/bin/env python3
"""Fotos zur Website hinzufügen (WebP + Vorschau, Eintrag in index.html).

Beispiele (im Ordner der Website ausführen):
  python3 tools/add_photos.py --cat club  foto1.jpg="DJ am Pult im blauen Licht" foto2.jpg
  python3 tools/add_photos.py --new-cat "Hochzeiten" --first  hochzeit1.jpg="Brautpaar im Gegenlicht"
  python3 tools/add_photos.py --cat club --dry-run foto1.jpg

Jede Datei kann mit "=Alt-Text" versehen werden. Der Alt-Text beschreibt das Bild in einem
Satz, er wird für Suchmaschinen und Screenreader gebraucht. Mit --alt-en (nur bei einer
einzelnen Datei) kommt die englische Version dazu, sonst bleibt der deutsche Text auch
in der englischen Ansicht stehen.

Braucht Pillow (pip install pillow).
"""
import argparse, json, re, sys, datetime, unicodedata
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
IMG = ROOT / 'img'
PDATA = re.compile(r'(<script type="application/json" id="pdata">)(.*?)(</script>)', re.S)
FULL, THUMB = 1800, 900          # längste Kante in Pixeln


def slug(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', t) or 'kategorie'


def save_webp(im, path, edge, quality):
    c = im.copy()
    c.thumbnail((edge, edge), Image.LANCZOS)      # verkleinert nur, vergrößert nie
    c.save(path, 'WEBP', quality=quality, method=6)
    return c.size


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('files', nargs='+', help='Foto oder Foto=Alt-Text')
    ap.add_argument('--cat', help='ID einer vorhandenen Kategorie')
    ap.add_argument('--new-cat', help='Titel einer neuen Kategorie (wird angelegt)')
    ap.add_argument('--first', action='store_true', help='vor die vorhandenen Fotos der Kategorie setzen')
    ap.add_argument('--alt-en', help='englischer Alt-Text (nur bei einer Datei)')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    if bool(a.cat) == bool(a.new_cat):
        sys.exit('Bitte genau eins angeben: --cat ID oder --new-cat "Titel"')
    if a.alt_en and len(a.files) != 1:
        sys.exit('--alt-en geht nur mit genau einer Datei')

    html = INDEX.read_text(encoding='utf8')
    m = PDATA.search(html)
    d = json.loads(m.group(2))
    cats = {c['id']: c['title'] for c in d['cats']}
    if a.new_cat:
        cid = slug(a.new_cat)
        if cid in cats:
            sys.exit('Kategorie gibt es schon: %s' % cid)
        d['cats'].append({'id': cid, 'title': a.new_cat})
        cats[cid] = a.new_cat
    else:
        cid = a.cat
        if cid not in cats:
            sys.exit('Unbekannte Kategorie. Vorhanden: ' + ', '.join('%s (%s)' % (k, v) for k, v in cats.items()))

    nums = [int(x) for p in d['photos'] for x in re.findall(r'/p(\d+)\.webp$', p['src'])]
    nums += [int(x.stem[1:]) for x in IMG.glob('p[0-9]*.webp') if re.fullmatch(r'p\d+', x.stem)]
    n = max(nums or [0])

    new = []
    for item in a.files:
        path, _, alt = item.partition('=')
        src = Path(path).expanduser()
        if not src.is_file():
            sys.exit('Datei nicht gefunden: ' + path)
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        n += 1
        nm = 'p%02d' % n
        if not alt.strip():
            alt = 'Foto aus der Kategorie ' + cats[cid]
            print('Hinweis: kein Alt-Text für %s, bitte nachtragen.' % path)
        alt = alt.strip()
        if not a.dry_run:
            w, h = save_webp(im, IMG / (nm + '.webp'), FULL, 80)
            save_webp(im, IMG / (nm + '-t.webp'), THUMB, 78)
        else:
            w, h = im.size
        new.append({'src': 'img/%s.webp' % nm, 't': 'img/%s-t.webp' % nm, 'w': w, 'h': h, 'alt': alt, 'cap': '', 'cat': cid})
        print('%s -> %s  (%s x %s)  %s' % (path, nm, w, h, alt))

    if a.first:
        at = next((i for i, p in enumerate(d['photos']) if p['cat'] == cid), 0)
        d['photos'][at:at] = new
    else:
        d['photos'].extend(new)

    if a.dry_run:
        print('Trockenlauf: nichts geschrieben.')
        return
    js = json.dumps(d, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    html = html[:m.start(2)] + js + html[m.end(2):]
    if a.alt_en:
        if 'TX={' not in html:
            sys.exit('TX-Wörterbuch nicht gefunden')
        entry = json.dumps(new[0]['alt'], ensure_ascii=False) + ':' + json.dumps([a.alt_en] * 3, ensure_ascii=False)
        html = html.replace('TX={', 'TX={' + entry + ',', 1)
    INDEX.write_text(html, encoding='utf8')
    sm = ROOT / 'sitemap.xml'
    if sm.exists():
        t = sm.read_text(encoding='utf8')
        sm.write_text(re.sub(r'<lastmod>[^<]*</lastmod>', '<lastmod>%s</lastmod>' % datetime.date.today().isoformat(), t), encoding='utf8')
    print('Fertig. Jetzt lokal ansehen, dann committen und pushen.')


if __name__ == '__main__':
    main()
