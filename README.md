# Your birthday in π

**English** · [Русский](README.ru.md)

**Site:** https://favorart.github.io/pi-birthday/

Enter your date of birth and the site shows where it first appears among the digits of π.
This is the web version of a desktop Tkinter app once made for a science festival.
How that first version was built is described in the article [“A GUI application in Python”](article.md).
How the site finds any date without storing a single digit of π: [“Three billion digits of π you don't need to store”](article-2026.md) (2026).

The interface is available in 10 languages: English, 中文, Español, हिन्दी, العربية, Português, Русский, 日本語, Deutsch, Français.
The language is picked from the browser settings; it can be switched at the bottom of the page or with `?lang=xx`.

## How the web version works

| What | Where |
|---|---|
| Page | `index.html`, `style.css`, `app.js`, `i18n.js` — a static site for GitHub Pages, no server needed |
| "Date → position" index | `data/idx/00.bin … 99.bin`: one file per century, 100 years × 372 slots × `uint32`, ~14.9 MB in total. The browser downloads only the file for the needed century (~149 KB) |
| Digits of π for the screen | not stored: fetched from [api.pi.delivery](https://pi.delivery/) (up to 1000 digits per request). The first 3000 digits are in `data/start.txt` |
| Index builder | `tools/build_index.py` |
| Old app | `legacy/pi.py` (Python 2.7, Tkinter), as it was in the article. `legacy/run.sh` runs it on Python 3 (Linux/macOS; needs `python3-tk`) |

A position is the number of the date's first digit (`DDMMYYYY`) after the decimal point: in `3.1415…` the first `1` is number 1.
This numbering matches `start` in the pi.delivery API and the old app.

A link like `https://favorart.github.io/pi-birthday/#14.03.1992` searches for the date right away.

## Rebuilding the index

1. Download [y-cruncher](http://www.numberworld.org/y-cruncher/) and compute π to 3,000,000,000 digits
   (Custom Compute → Pi → 3,000,000,000 digits, output as **decimal text**, not `.ycd`).
   y-cruncher shows how much memory it needs. If that exceeds your RAM, 2,500,000,000 digits are enough:
   by estimate all dates occur before roughly 1.6–2 billion.
2. Build the index (numpy, a few minutes):
   ```bash
   python tools/build_index.py "Pi - Dec - Chudnovsky.txt" data
   ```
   The script reports how many dates were found. The π file can be deleted afterwards.
3. Commit `data/` and push: GitHub Pages updates by itself.

To test without y-cruncher: `python tools/gen_test_digits.py 1000000 pi-1m.txt` computes a million digits in about a minute.

## License

[MIT](LICENSE): written by Claude while a human nodded approvingly, use it however you like.
