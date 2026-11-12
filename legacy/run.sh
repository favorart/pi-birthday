#!/bin/sh
# Runs the 2018 Tkinter app (pi.py, Python 2.7) on today's Python 3.
#   ./run.sh [digits] [en|ru]      e.g. ./run.sh 1000000 ru   (digits are computed once, ~1 min per million)
# Needs python3 with Tk (Debian/Ubuntu: sudo apt install python3-venv python3-tk).
# pi.py stays untouched: a Python 3 copy and the data files are made in legacy/run/.
set -e
cd "$(dirname "$0")"
N=${1:-1000000}
LANG_FILE=${2:-en}.txt
mkdir -p run/lang

if [ -z "$PY" ]; then        # PY=/path/to/python ./run.sh  — use your own Python with arrow + numpy
  [ -d run/.venv ] || python3 -m venv run/.venv
  PY=$PWD/run/.venv/bin/python; [ -x "$PY" ] || PY=$PWD/run/.venv/Scripts/python   # Git Bash on Windows
  "$PY" -m pip install -q arrow numpy
fi

# The 4 Python-2-only spots of pi.py.
sed -e '/^import Tkinter as tk$/d' \
    -e 's/^import tkFont$/import tkinter.font as tkFont/' \
    -e 's/DB\.has_key(ddate)/ddate in DB/' \
    -e 's/print >>f_log, ddate/print(ddate, file=f_log)/' pi.py > run/pi3.py

# Digits of π and the "DD.MM.YYYY<TAB>position" table, as the app expects them.
if [ ! -f "run/pi-$N.txt" ]; then
  "$PY" ../tools/gen_test_digits.py "$N" run/pi-dec.txt
  "$PY" ../tools/build_index.py run/pi-dec.txt run > /dev/null     # -> run/idx/*.bin
  "$PY" - "$N" <<'EOF'
import sys, numpy as np
n = int(sys.argv[1])
open("run/pi-%d.txt" % n, "w").write(open("run/pi-dec.txt").read().replace(".", "", 1))
with open("run/dates.txt", "w") as out:
    for c in range(100):
        a = np.fromfile("run/idx/%02d.bin" % c, dtype="<u4")
        for s in np.nonzero(a)[0]:
            if a[s] < n - 3000:   # keep a screenful of digits after the date
                out.write("%02d.%02d.%04d\t%d\n" % (s % 31 + 1, s % 372 // 31 + 1, c * 100 + s // 372, a[s]))
EOF
fi

cat > run/config.txt <<EOF
lang_dir = "lang"
language = "$LANG_FILE"
log_dates = "log_dates.txt"
pi_string = "pi-$N.txt"
db_file = "dates.txt"
EOF
printf 'invitation = "Input your birth date"\nbutton_name = "Find"\nlb1 = "first digit"\nlb2 = "found at:"\nlb3 = "last digit"\n' > run/lang/en.txt
printf 'invitation = "Введите вашу дату рождения"\nbutton_name = "найти"\nlb1 = "первая цифра"\nlb2 = "найдено на:"\nlb3 = "последняя цифра"\n' > run/lang/ru.txt

echo "$(wc -l < run/dates.txt) dates are in the first $N digits of pi, e.g. $(head -n1 run/dates.txt | cut -f1)"
cd run && exec "$PY" pi3.py
