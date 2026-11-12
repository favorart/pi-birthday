#!/usr/bin/env python3
"""Строит индекс «дата -> позиция первого вхождения в π» для сайта.

Вход: текстовый файл с цифрами π в формате y-cruncher ("3.1415926...").
Выход: каталог data/ сайта:
    data/idx/00.bin ... data/idx/99.bin  - по файлу на столетие
    data/meta.json                       - сколько знаков просмотрено и сколько дат найдено

Формат XX.bin: 100 лет x 372 ячейки (12 месяцев x 31 день) x uint32 little-endian.
Ячейка = позиция первой цифры строки ДДММГГГГ после десятичной точки (1 = первая "1"
в 3.1415...), 0 = дата не найдена или не существует (31.02 и т.п.).
Год Y лежит в файле Y // 100, в строке Y % 100.

    python build_index.py "Pi - Dec - Chudnovsky.txt" ../data

Память: ~0.6 ГБ + чанк; время: несколько минут на миллиард знаков.
"""
import calendar
import datetime
import json
import os
import sys
import time

import numpy as np

CHUNK = 50_000_000            # окон за проход
SLOTS_PER_YEAR = 12 * 31
POW10 = [10 ** k for k in range(8)]


def all_dates():
    """Все существующие даты 0001-01-01 .. 9999-12-31 (пролептический григорианский)."""
    ys, ms, ds = [], [], []
    for y in range(1, 10000):
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
    values = ds * 1_000_000 + ms * 10_000 + ys          # ДДММГГГГ как число
    valid = np.zeros(10 ** 8, dtype=bool)
    valid[values] = True
    first = np.zeros(10 ** 8, dtype=np.uint32)          # значение -> позиция (1-based), 0 = нет
    print("dates: %d" % total)

    mm = np.memmap(src, dtype=np.uint8, mode="r")
    head = bytes(mm[:16])
    dot = head.find(b".")
    assert head.startswith(b"3") and dot == 1, "ожидаю файл, начинающийся с '3.': %r" % head
    begin = dot + 1
    end = len(mm)
    while end > begin and not (48 <= mm[end - 1] <= 57):   # хвостовые \r\n
        end -= 1
    n = end - begin
    assert n >= 8, "слишком мало цифр"
    print("digits: %d" % n)

    remaining = total
    windows = n - 7
    for s in range(0, windows, CHUNK):
        e = min(s + CHUNK, windows)
        raw = np.asarray(mm[begin + s: begin + e + 7])
        d = raw.astype(np.int16) - 48
        assert d.min() >= 0 and d.max() <= 9, "в файле не только цифры (позиция ~%d)" % s
        d = d.astype(np.uint32)
        cnt = e - s
        v = d[0:cnt] * POW10[7]
        for k in range(1, 8):
            v += d[k:k + cnt] * POW10[7 - k]
        idx = np.nonzero(valid[v])[0]
        u, fi = np.unique(v[idx], return_index=True)   # fi - первое вхождение внутри чанка
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
