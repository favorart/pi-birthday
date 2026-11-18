#!/usr/bin/env python3
"""Builds the "date -> first position in π" index for the site.

Input: a text file with the digits of π in y-cruncher format ("3.1415926...").
Output: the site's data/ directory:
    data/idx/00.bin ... data/idx/99.bin  - one file per century
    data/meta.json                       - how many digits were scanned and how many dates found

XX.bin layout: 100 years x 372 slots (12 months x 31 days) x uint32 little-endian.
Slot = position of the first digit of the string DDMMYYYY after the decimal point (1 = the first
"1" in 3.1415...), 0 = date not found or does not exist (31.02 etc.).
Year Y lives in file Y // 100, row Y % 100.

    python build_index.py "Pi - Dec - Chudnovsky.txt" ../data

Memory: ~0.6 GB + one chunk; time: a few minutes per billion digits.
"""
import calendar
import datetime
import json
import os
import sys
import time

import numpy as np

CHUNK = 50_000_000            # windows per pass
SLOTS_PER_YEAR = 12 * 31
POW10 = [10 ** k for k in range(8)]


def all_dates():
    """All existing dates 0000-01-01 .. 9999-12-31 (proleptic Gregorian; year 0000 = 1 BC, a leap year)."""
    ys, ms, ds = [], [], []
    for y in range(0, 10000):
        for m in range(1, 13):
            for d in range(1, calendar.monthrange(y, m)[1] + 1):
                ys.append(y)
                ms.append(m)
                ds.append(d)
    return (np.array(ys, dtype=np.uint32),
            np.array(ms, dtype=np.uint32),
            np.array(ds, dtype=np.uint32))


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    t0 = time.time()

    ys, ms, ds = all_dates()
    total = len(ys)
    values = ds * 1_000_000 + ms * 10_000 + ys          # DDMMYYYY as a number
    valid = np.zeros(10 ** 8, dtype=bool)
    valid[values] = True
    first = np.zeros(10 ** 8, dtype=np.uint32)          # value -> position (1-based), 0 = none
    print("dates: %d" % total)

    mm = np.memmap(src, dtype=np.uint8, mode="r")
    head = bytes(mm[:16])
    dot = head.find(b".")
    assert head.startswith(b"3") and dot == 1, "expected a file starting with '3.': %r" % head
    begin = dot + 1
    end = len(mm)
    while end > begin and not (48 <= mm[end - 1] <= 57):   # trailing \r\n
        end -= 1
    n = end - begin
    assert n >= 8, "too few digits"
    print("digits: %d" % n)

    remaining = total
    windows = n - 7
    for s in range(0, windows, CHUNK):
        e = min(s + CHUNK, windows)
        raw = np.asarray(mm[begin + s: begin + e + 7])
        d = raw.astype(np.int16) - 48
        assert d.min() >= 0 and d.max() <= 9, "non-digit bytes in the file (near position %d)" % s
        d = d.astype(np.uint32)
        cnt = e - s
        v = d[0:cnt] * POW10[7]
        for k in range(1, 8):
            v += d[k:k + cnt] * POW10[7 - k]
        idx = np.nonzero(valid[v])[0]
        u, fi = np.unique(v[idx], return_index=True)   # fi - first occurrence within the chunk
        new = first[u] == 0
        first[u[new]] = (s + 1 + idx[fi[new]]).astype(np.uint32)
        remaining -= int(new.sum())
        print("  %12d / %d  found %d / %d  (%.0f s)"
              % (e, windows, total - remaining, total, time.time() - t0), flush=True)
        if remaining == 0:
            print("all dates found, stop at digit %d" % e)
            break

    pos = first[values]
    os.makedirs(os.path.join(out_dir, "idx"), exist_ok=True)
    for c in range(100):
        arr = np.zeros(100 * SLOTS_PER_YEAR, dtype="<u4")
        sel = (ys // 100) == c
        slot = (ys[sel] % 100) * SLOTS_PER_YEAR + (ms[sel] - 1) * 31 + (ds[sel] - 1)
        arr[slot] = pos[sel]
        arr.tofile(os.path.join(out_dir, "idx", "%02d.bin" % c))

    found = int((pos > 0).sum())
    meta = {
        "digits": int(n),
        "dates_total": int(total),
        "dates_found": found,
        "max_position": int(pos.max()),
        "built": datetime.date.today().isoformat(),
    }
    with open(os.path.join(out_dir, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))
    print("done in %.0f s" % (time.time() - t0))


if __name__ == "__main__":
    main()
