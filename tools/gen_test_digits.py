#!/usr/bin/env python3
"""Computes N digits of π (Chudnovsky algorithm) and writes them to a text file
in the same format as y-cruncher: "3.1415926...".

Only meant for testing build_index.py on a small amount of data.
For the real index use y-cruncher (see README).

    python gen_test_digits.py 1000000 pi-1m.txt
"""
import math
import sys
import time


def pi_digits(n):
    """floor(pi * 10**n) as an integer."""
    C3_24 = 640320 ** 3 // 24

    def bs(a, b):
        if b - a == 1:
            if a == 0:
                p = q = 1
            else:
                p = (6 * a - 5) * (2 * a - 1) * (6 * a - 1)
                q = a * a * a * C3_24
            t = p * (13591409 + 545140134 * a)
            return p, q, (-t if a & 1 else t)
        m = (a + b) // 2
        p1, q1, t1 = bs(a, m)
        p2, q2, t2 = bs(m, b)
        return p1 * p2, q1 * q2, q2 * t1 + p1 * t2

    terms = int(n / 14.181647462725477) + 2
    _, q, t = bs(0, terms)
    sqrt_c = math.isqrt(10005 * 10 ** (2 * n))
    return (q * 426880 * sqrt_c) // t


def main():
    n = int(sys.argv[1])
    out = sys.argv[2]
    t0 = time.time()
    s = str(pi_digits(n + 10))[: n + 1]
    assert s.startswith("31415926535"), s[:20]
    with open(out, "w") as f:
        f.write("3." + s[1:])
    print("%d digits -> %s (%.1f s)" % (n, out, time.time() - t0))


if __name__ == "__main__":
    main()
