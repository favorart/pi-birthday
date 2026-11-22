# π stores everything, so I didn't have to store π

_Is every finite string of digits really written somewhere among the endless digits of π?_\
_And so every calendar date, too?_\
_Which date shows up in π first, and which one hides the deepest?_\
_And how do you find your birthday without storing a single digit of π?_

~~With benchmarks and charts.~~ In pictures, for the little ones.

[Русская версия](article-2026.ru.md)

---

## Is everything really in π?

[π](https://en.wikipedia.org/wiki/Pi) is the ratio of a circle's circumference to its diameter, 3.14159265… Its digits after the point never end and never fall into a loop. [Lambert](https://en.wikipedia.org/wiki/Johann_Heinrich_Lambert) proved that back in 1761: π is an [irrational number](https://en.wikipedia.org/wiki/Irrational_number).

Mathematicians believe π is a [normal number](https://en.wikipedia.org/wiki/Normal_number). That means every digit appears in it once in ten times, every pair of digits once in a hundred, every string of eight digits once in a hundred million. As if someone had rolled the digits of π on a fair ten-sided die!

If that's true, then π contains every finite string of digits. Your phone number. Your credit card number. The text of this article in any encoding. A real [Library of Babel](https://en.wikipedia.org/wiki/The_Library_of_Babel) from Borges, only infinite.

But the normality of π is still only a conjecture. Tests on trillions of digits agree with it, yet there is no proof. Nobody has even proved that the digit 7 appears in π infinitely many times!

## We can't prove it. But can we feel it?

Any date can be written as eight digits in a row. My own birthday falls on [Pi Day](https://en.wikipedia.org/wiki/Pi_Day), and 14.03.1992 becomes `14031992`. Every digit appears in π once per ten digits, every pair once per hundred, and every eight-digit string once per hundred million. So your date, too, turns up in π roughly once per hundred million digits. Print a hundred million digits and you get a hundred volumes of 330 pages each. One bookshelf wall -- and your birthday is somewhere in it!

Open https://favorart.github.io/pi-birthday/, type in your date of birth and press "Find". In the middle of a wall of digits your birthday lights up in red, with its position on the left. Mine turned up at digit 40,535,034 after the decimal point:

![The site: 14.03.1992 highlighted in red among the digits of π, position 40,535,034 on the left](img/site-en.jpg)

Now show it to a child, and from here on they will ask the questions. What about mum's date? Dad's? Is there a date that isn't in π? (Spoiler: there isn't.) Which one hides the deepest?

## How many digits of π do you actually need?

There are **3,652,059** dates from 01.01.0001 to 31.12.9999, and each one takes a hundred million digits on average. But "on average" is misleading here.

Here is how the dates get collected as we walk along π. The steps on the axis are uneven, and the middle is what matters: by 69 million digits (10⁸ · ln 2) half the dates are found, by 10⁸ 63 %, by half a billion 99.3 %. The last 0.7 % stretch over another billion digits and more.

```mermaid
xychart-beta
    title "Share of dates found by digit N (% of 3,652,059)"
    x-axis ["10³", "10⁴", "10⁵", "10⁶", "10⁷", "3·10⁷", "10⁸", "2·10⁸", "3·10⁸", "5·10⁸", "10⁹", "1.7·10⁹"]
    y-axis "% of dates" 0 --> 100
    line [0.00, 0.01, 0.10, 0.99, 9.50, 25.91, 63.20, 86.50, 94.98, 99.33, 100.00, 100.00]
```

_The line coincides with the formula 1 − e^(−N/10⁸)._

What matters is not the average but the **latest** of 3.65 million dates: it decides how many digits to compute.

A simple argument estimates it. Walk along the digits of π catching dates. While none has been caught, there are N = 3,652,059 traps, and the first date turns up almost at once: on average after 10⁸ / N digits. Then there is one trap fewer, and the next date takes a bit longer. And so on, down to the very last one, caught on its own, which waits the full 10⁸. Add up the waits: 10⁸ · (1/N + 1/(N−1) + … + 1/2 + 1).

The sum in brackets is the [harmonic number](https://en.wikipedia.org/wiki/Harmonic_number) H_N. For large N it is almost exactly ln N + 0.577, where 0.577 is the [Euler–Mascheroni constant](https://en.wikipedia.org/wiki/Euler%27s_constant). For our dates that gives 15.69, so the last date takes roughly 10⁸ · 15.69 ≈ **1.57 billion digits**. That is an estimate on average: in reality the last date may turn up earlier or later. It is the [coupon collector's problem](https://en.wikipedia.org/wiki/Coupon_collector%27s_problem), like stickers in chewing gum: the first ones pour in, and the last one takes the longest.

The tail shows up if you count how many dates first appear in each hundred million digits:

```mermaid
xychart-beta
    title "Where dates first appear: dates per 100 million digits"
    x-axis "position, millions of digits" ["0–100", "100–200", "200–300", "300–400", "400–500", "500–600", "600–700", "700–800", "800–900", "900–1000", "1000+"]
    y-axis "dates" 0 --> 2400000
    bar [2308102, 850882, 311836, 114660, 42125, 15404, 5825, 2070, 737, 264, 154]
```

The first bar holds over half of all dates, 2.3 million of 3.65, and each next bar is lower by almost exactly e ≈ 2.7: that is what an [exponential distribution](https://en.wikipedia.org/wiki/Exponential_distribution) looks like. On the right is the long tail: beyond a billion lie the 154 unluckiest dates.

## So how does it work?

In 2018 [my program](article.md) (offline) needed a 3 GB text file: three billion digits of π, one byte per digit, computed "just in case", almost twice as many as needed. Plus a 3.65-million-line "date → position" table that Python took 4 seconds to parse!

Now I wanted readers to be able to run the same experiment themselves, so I set out to turn the old program into a web page on GitHub Pages. Except GitHub [doesn't accept files over 100 MB](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), and my file was thirty times bigger. Looking for a way out was so much fun that it grew into a new article. Because the site didn't need the file of digits at all! How did that happen?

## 1. Maybe π can be compressed?

First thought: 3 GB of text made of nothing but digits will surely compress. I compressed the first 10 million digits and multiplied the result by 300, since for random digits the compression ratio doesn't depend on length:

| Method | 3 billion digits | Bits per digit | Direct access to digit N |
|---|---|---|---|
| ASCII text | 3.00 GB | 8 | yes |
| zlib -9 | 1.41 GB | 3.75 | no |
| bzip2 -9 | 1.29 GB | 3.45 | no |
| xz (lzma -9) | 1.32 GB | 3.52 | no |
| 2 digits per byte ([BCD](https://en.wikipedia.org/wiki/Binary-coded_decimal)) | 1.50 GB | 4 | yes |
| 3 digits in 10 bits | 1.250 GB | 3.33 | yes |
| Theoretical limit | 1.246 GB | log₂10 ≈ 3.32 | -- |

Where does the limit come from? One digit is a choice among ten equally likely values. Three bits cover only 8 values, four bits give 16, and six of them go to waste. Exactly ten values take log₂10 ≈ 3.32 bits, because 2^3.32 ≈ 10. If the digits are random, you can't do better on average: that is Shannon [entropy](https://en.wikipedia.org/wiki/Entropy_(information_theory)).

So the chart shows not the bits themselves but how much each method loses above the limit. ASCII wouldn't fit: +141 %. Compressors lose 4 to 13 %, while dumb packing of "three digits into 10 bits" loses only 0.3 %:

```mermaid
xychart-beta
    title "How much each method loses above the log₂10 limit, %"
    x-axis ["BCD", "zlib", "xz", "bzip2", "3 in 10 bits"]
    y-axis "% above the limit" 0 --> 25
    bar [20.4, 13.0, 6.1, 3.8, 0.3]
```

Compressors look for repetitions, and π has none. Each digit appears almost exactly 10 % of the time (from 999,333 to 1,001,093 times per 10 million), and the next one doesn't depend on the previous ones. All a compressor can do is throw away the spare bits of the ASCII code. Packing "three digits into 10 bits" (1000 values out of 1024) does that too, and better, faster and without losing direct access: the address of digit N is a formula.

Bottom line: no compressor will squeeze 3 billion digits below **1.25 GB**. And GitHub Pages has a [limit](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) of 1 GB for the whole site. Dead end.

## 2. What if we store only what's on the screen?

The screen never shows 3 billion digits anyway. I opened a screenshot of the 2018 program and counted: 11 lines of 42 digits. That's about **460 digits** per screen, 8 of which are the date itself, which needn't be stored.

So for every date we could store a window of about 450 digits around it. Pack the digits three into 10 bits and add 4 bytes for the position:

| Window around the date | Digits per date | Total for 3.65 million dates |
|---|---|---|
| ±20 | 40 | 76 MB |
| ±50 | 100 | 167 MB |
| ±100 | 200 | 319 MB |
| 2018 screen | ~450 | **~700 MB** |
| ±400 | 800 | 1.23 GB |
| screen, date anywhere | 904 | 1.39 GB |
| ±500 | 1000 | 1.54 GB |

The 2018 screen fits, but only just, and every site update turns into uploading hundreds of megabytes. And if you show the date at a random spot on the screen, like the original did, the window doubles. Already at ±400 digits all the windows together weigh almost the same 1.25 GB as the whole of π we were trying to get away from.

## 3. What if we don't store π at all?

Someone already stores the digits of π. In 2022 Google Cloud [computed 100 trillion digits](https://cloud.google.com/blog/products/compute/calculating-100-trillion-digits-of-pi-on-google-cloud) -- the world record at the time -- and serves them through an API: [`api.pi.delivery`](https://pi.delivery/) returns up to 1000 digits per request, with [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing), for free. So the site only needs to know one thing: **where** to look.

The index becomes trivial: for every date one 32-bit number -- the digit after the decimal point where the date starts. 3 billion fits into 32 bits (4.29 billion), so 4 bytes per date.

The layout is 100 files, one per century. Inside: 100 years × 12 months × 31 days × 4 bytes = **148,800 bytes**. A date's address is a single formula, no searching at all: cell number = year within the century × 372 + (month − 1) × 31 + (day − 1). You pay for it with empty cells for 30 February, 31 April and other days that don't exist: 67,941 of them, 1.8 % of the index. For my date the browser downloads one century file and makes two API requests: the screen around 40,535,034 crosses a thousand boundary.

```mermaid
sequenceDiagram
    participant U as Browser
    participant G as GitHub Pages
    participant P as api.pi.delivery
    U->>G: data/idx/19.bin (1900–1999)
    G-->>U: 148,800 bytes (141,122 over the wire, gzip)
    Note over U: cell 92·372 + 2·31 + 13 = 34,299 → position 40,535,034
    U->>P: ?start=40534000&numberOfDigits=1000
    U->>P: ?start=40535000&numberOfDigits=1000
    P-->>U: 1000 digits each, ~0.2 s per request
    Note over U: cut a screen around the date, highlight 14031992
```

2018 and 2026 side by side:

| | 2018, desktop | 2026, browser |
|---|---|---|
| Digits of π | 3 GB on disk | 0 bytes, taken from the API |
| Date table | text, ~74 MB, 4.1 s to read | 14.9 MB on the server |
| Downloaded per date | -- | 141 KB of index + ~2 KB of digits |
| Startup | background thread so the window doesn't freeze | instant |

### Can the index itself be compressed?

The entropy of the positions is about 28 bits out of 32, so the most you can win is 12 %. Compressors squeeze out 3–6 %, and GitHub Pages already serves files gzipped, so I didn't bother inventing my own format.

## 4. How do you compute 3 billion digits on a laptop?

In 2018 I found a [little program](http://www.cyberforum.ru/qbasic/thread1923079.html#post10542354) on a forum, started it and waited. This time I decided to first check what plain Python can do.

The [Chudnovsky formula](https://en.wikipedia.org/wiki/Chudnovsky_algorithm) gives about 14 digits per term and fits into 30 lines of pure Python ([gen_test_digits.py](https://github.com/favorart/pi-birthday/blob/main/tools/gen_test_digits.py)). It computes 800 thousand digits in 81 seconds. Not bad? Except that every doubling of the digits costs four times the time:

```mermaid
---
config:
  themeVariables:
    xyChart:
      plotColorPalette: "#d62728, #1f77b4, #2ca02c, #7f7f7f"
---
xychart-beta
    title "Pure Python: seconds per step of computing π"
    x-axis ["100 k", "200 k", "400 k", "800 k"]
    y-axis "seconds" 0 --> 40
    line [0.61, 2.28, 10.49, 38.99]
    line [0.29, 1.22, 4.85, 15.86]
    line [0.26, 0.93, 3.67, 13.79]
    line [0.36, 0.95, 3.05, 12.35]
```

_Red line: the final division; blue: conversion to a string; green: the square root; grey: the series itself._

The series itself is the cheapest part! The longest step is one single division at the very end. Division, square root and string conversion of big integers in CPython 3.8 use schoolbook, quadratic algorithms. String conversion is so slow that in 2022 it was declared a vulnerability -- [CVE-2020-10735](https://nvd.nist.gov/vuln/detail/CVE-2020-10735), its number reserved back in 2020. Since autumn 2022 Python (3.11 and updates of older versions) simply refuses by default to print a number longer than 4300 digits.

Now let's multiply: three billion is 3,750 times more than 800 thousand, and squaring that gives a factor of 14 million. In pure Python my laptop would be computing π for **about 36 years**.

So I took [y-cruncher](http://www.numberworld.org/y-cruncher/), the program used to set world records for π. Even in its humblest mode (one thread, 4 GB of RAM, the rest on disk) it computed 3 billion digits in **20 minutes**. In the same minute and a half y-cruncher produces about 240 million digits.

## 5. How do you find 3.65 million dates in 3 billion digits?

[The 2018 program](article.md) walked through π with an 8-digit window: at every step it glued the digits into a "DD.MM.YYYY" string and looked it up in a dictionary. I measured this approach on 2 million digits (on Python 3 already): 0.53 million digits per second, about 54 minutes for the whole pass.

And Python 2.7 added its own twist. The position counter when iterating over a string was stored in a 32-bit number -- on Windows even in a 64-bit build -- and at the 2.1 billion mark the program crashed with "iter index too large". The file of digits had to be cut into pieces of a billion.

In 2026 the same job is done by [numpy](https://numpy.org/), and not one position at a time, but whole arrays at once. Eight copies of the digit array, shifted by 0…7 positions, are added up so that every position immediately gets the eight-digit number DDMMYYYY. A table of 10⁸ flags says whether it is a real date, and numpy finds the first occurrence of each date by itself.

That's 18 million digits per second, 33 times faster than the 2018 approach. It needs about 0.5 GB of memory: two tables of 10⁸ elements plus a 50-million-digit chunk of π. The whole pass took **96 seconds** and stopped by itself, long before the end of the file: there was nothing left to look for.

```mermaid
flowchart LR
    A["y-cruncher<br/>20 min, 1 thread"] -->|"3 GB of text"| B["build_index.py<br/>numpy, 96 s"]
    B -->|"100 files × 149 KB"| C["GitHub Pages"]
    C --> D["browser"]
    E["api.pi.delivery<br/>100 trillion digits"] -->|"1000 digits"| D
```

## 6. So what turned up?

All 3,652,059 dates were found. And π behaved exactly as the theory of random digits predicts:

| | Theory | Fact |
|---|---|---|
| Mean position | 100,000,000 | 99,930,807 |
| Median | 69,314,718 | 69,274,900 |
| Latest date | ~1,568,800,000 | 1,669,501,859 |
| Earliest date | ~27 | 63 |

The forecast from the beginning of the article missed the latest date by 6 %, but the spread of such a record is about 130 million digits (π/√6 · 10⁸: π sneaked in here too), so missing by 100 million is normal. Mean positions per century lie in the 98.0–101.6 million corridor: π neither favours nor slights any era.

A few records and curiosities:

- **The earliest** is 23.07.8164, at digit 63: `…5923078164…`. The first thousand digits hold only 33 dates, the first million 36,303, that is 1 %.
- **The latest** is 12.02.6987, at digit **1,669,501,859**. Next by depth: 17.02.9995 (1.50 billion) and 10.03.6087 (1.46 billion).
- **01.01.1970**, the start of the [Unix epoch](https://en.wikipedia.org/wiki/Unix_time), is at digit 6,297,536. **01.01.2000** is at 181,946,674, while millennium eve **31.12.1999** is all the way at 498,894,645 -- fewer than 1 % of dates lie deeper.
- **11.11.1111** has the longest expected wait in theory. The string `11111111` overlaps with itself: ones come in clusters, where one such string is found another is often right next to it, and the gaps between clusters are longer. So its expected waiting time is not 10⁸ but 111,111,110 = 10 + 100 + … + 10⁸ ([Conway's "leading numbers"](https://en.wikipedia.org/wiki/Penney%27s_game)). It turned up at digit 159,090,113 -- later than average, but one date proves nothing. Its relatives `12121212` and `10101010` (12.12.1212 and 10.10.1010) overlap every two digits and wait on average 1 % longer than an ordinary date; 12.12.1212, for instance, was found as early as digit 88,168,706.

I wanted to add Jesus's birthday to the same row of examples: I was sure it was 01.01.0001. Turns out he wasn't: the count of years "from the birth of Christ" was invented in 525 by the monk [Dionysius Exiguus](https://en.wikipedia.org/wiki/Dionysius_Exiguus), and by his reckoning (as it is usually read) Christmas was on 25 December 1 BC, a week before the era began. 1 January is the eighth day after Christmas, the feast of the [Circumcision](https://en.wikipedia.org/wiki/Circumcision_of_Jesus).

And there is no year zero in our calendar at all: 1 BC is followed directly by AD 1. So the index had no dates of year zero either. But astronomers write 1 BC exactly as year zero ([astronomical year numbering](https://en.wikipedia.org/wiki/Astronomical_year_numbering)), so I added it to the site. The date that centuries are counted from, 25.12.0000, turned up only at digit 280,255,197: just 6 % of dates hide deeper. That is Catholic Christmas, but there is an Orthodox one too. You would think it is 07.01.0001, at digit 166,284,266. But the Orthodox Church uses the [Julian calendar](https://en.wikipedia.org/wiki/Julian_calendar), and in 1 BC the two calendars were only two days apart. So back then Orthodox Christmas fell on 23.12.0000 in our calendar, and it turned up much earlier, at digit 50,494,078.

All the statistics above were computed without the "lost" year zero, and I didn't recompute them: its 366 dates shift the mean and median by thousandths of a percent and don't touch the records at all.

## 7. So what's the bottom line?

π didn't have to be stored at all: Google serves the digits, and the site gets by with 4 bytes per date.

The most expensive computation in the project is 20 minutes on one laptop core, and it never needs to run again.

And still nobody has proved that π is normal. But 3,652,059 dates differed from the theory of random digits in mean and median by less than a tenth of a percent. That won't become a proof, but believing in the infinite library is much easier now.

Which date would you check first? Find it here: https://favorart.github.io/pi-birthday/
