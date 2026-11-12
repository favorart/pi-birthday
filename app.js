"use strict";
/*
 * Дата рождения в π — веб-версия.
 *
 * Индекс data/idx/XX.bin: позиция первого вхождения строки ДДММГГГГ в π
 * (1 = первая цифра после запятой). Сами цифры π берутся с api.pi.delivery,
 * первые 3000 знаков лежат локально в data/start.txt.
 *
 * Нумерация цифр как в API: индекс 0 — это «3», индекс 1 — первая «1» после запятой.
 */

const API = "https://api.pi.delivery/v1/pi";
const BLOCK = 1000;                 // API отдаёт максимум 1000 цифр за запрос
const SLOTS_PER_YEAR = 12 * 31;
const MAX_CELLS = 6000;             // защита от гигантских мониторов

const $ = (id) => document.getElementById(id);
const el = {
  form: $("form"), date: $("date"), find: $("find"),
  first: $("first"), found: $("found"), last: $("last"),
  digits: $("digits"), status: $("status"), metaNote: $("meta-note"),
};

const blocks = new Map();           // номер блока -> Promise<string>
const indexFiles = new Map();       // столетие -> Promise<DataView>
let meta = null;

// Что сейчас показано: позиция найденной даты (или null) и её относительное место в окне.
const view = { pos: null, rel: 0.4 };
let renderSeq = 0;

/* ---------- цифры π ---------- */

function getBlock(b) {
  if (!blocks.has(b)) {
    const p = fetch(`${API}?start=${b * BLOCK}&numberOfDigits=${BLOCK}`)
      .then((r) => {
        if (!r.ok) throw new Error(`pi.delivery: HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => j.content);
    p.catch(() => blocks.delete(b));  // не кешируем ошибки
    blocks.set(b, p);
  }
  return blocks.get(b);
}

async function getDigits(start, count) {
  const b0 = Math.floor(start / BLOCK);
  const b1 = Math.floor((start + count - 1) / BLOCK);
  const parts = [];
  for (let b = b0; b <= b1; b++) parts.push(getBlock(b));
  const s = (await Promise.all(parts)).join("");
  const off = start - b0 * BLOCK;
  return s.slice(off, off + count);
}

async function loadStart() {
  try {
    const r = await fetch("data/start.txt");
    if (!r.ok) return;
    const s = (await r.text()).trim();       // "3141592..." без точки
    for (let b = 0; (b + 1) * BLOCK <= s.length; b++) {
      blocks.set(b, Promise.resolve(s.slice(b * BLOCK, (b + 1) * BLOCK)));
    }
  } catch (_) { /* не страшно — возьмём из API */ }
}

/* ---------- индекс дат ---------- */

function getIndexFile(century) {
  if (!indexFiles.has(century)) {
    const name = String(century).padStart(2, "0");
    const p = fetch(`data/idx/${name}.bin`)
      .then((r) => {
        if (!r.ok) throw new Error(`индекс ${name}.bin: HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => new DataView(buf));
    p.catch(() => indexFiles.delete(century));
    indexFiles.set(century, p);
  }
  return indexFiles.get(century);
}

async function lookup(d, m, y) {
  const dv = await getIndexFile(Math.floor(y / 100));
  const slot = (y % 100) * SLOTS_PER_YEAR + (m - 1) * 31 + (d - 1);
  return dv.getUint32(slot * 4, true);       // 0 = не найдено
}

/* ---------- ввод даты ---------- */

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysIn = (m, y) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

// Проверка частично введённых цифр ДДММГГГГ — как DateEntry.onValidate в старой программе.
function prefixOk(s) {
  if (s.length >= 1 && !"0123".includes(s[0])) return false;
  if (s.length >= 2) {
    const d = +s.slice(0, 2);
    if (d < 1 || d > 31) return false;
  }
  if (s.length >= 3 && !"01".includes(s[2])) return false;
  if (s.length >= 4) {
    const d = +s.slice(0, 2), m = +s.slice(2, 4);
    if (m < 1 || m > 12) return false;
    if (m === 2 && d > 29) return false;
    if ([4, 6, 9, 11].includes(m) && d > 30) return false;
  }
  if (s.length === 8) {
    const d = +s.slice(0, 2), m = +s.slice(2, 4), y = +s.slice(4);
    if (y < 1 || d > daysIn(m, y)) return false;
  }
  return true;
}

const fmt = (s) => [s.slice(0, 2), s.slice(2, 4), s.slice(4, 8)].filter(Boolean).join(".");

let lastGood = "";
function onDateInput() {
  const digits = el.date.value.replace(/\D/g, "").slice(0, 8);
  if (prefixOk(digits)) {
    lastGood = digits;
  } else {
    el.date.classList.remove("bad");
    void el.date.offsetWidth;                // перезапуск анимации
    el.date.classList.add("bad");
  }
  el.date.value = fmt(lastGood);
}

function parseDate(s) {
  const digits = s.replace(/\D/g, "");
  if (digits.length !== 8 || !prefixOk(digits)) return null;
  return { d: +digits.slice(0, 2), m: +digits.slice(2, 4), y: +digits.slice(4), text: fmt(digits) };
}

/* ---------- отрисовка ---------- */

function measure() {
  const cs = getComputedStyle(el.digits);
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const charW = ctx.measureText("0123456789").width / 10;
  const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
  const r = el.digits.getBoundingClientRect();
  const perLine = Math.max(8, Math.floor(r.width / charW));
  const lines = Math.max(1, Math.floor(r.height / lineH));
  return { perLine, lines, cells: Math.min(MAX_CELLS, perLine * lines) };
}

// Окно [start, start+count) в нумерации API и сколько цифр помещается.
function layoutWindow(cells) {
  const ELLIPSIS = 2;
  if (view.pos === null) {
    return { start: 0, count: cells - ELLIPSIS - 1 };   // −1: точка после «3»
  }
  let count = cells - ELLIPSIS;
  let before = Math.round(view.rel * Math.max(0, count - 8));
  let start = view.pos - before;
  if (start <= 0) {                     // дата у самого начала π
    start = 0;
    count -= 1;
  }
  return { start, count };
}

function render(digits, start, perLine) {
  const cells = [];
  for (let i = 0; i < digits.length; i++) {
    const p = start + i;
    const hl = view.pos !== null && p >= view.pos && p < view.pos + 8;
    cells.push({ ch: digits[i], hl });
    if (p === 0) cells.push({ ch: ".", hl: false });
  }
  cells.push({ ch: "…", hl: false });

  const html = [];
  for (let i = 0; i < cells.length; i += perLine) {
    let line = "", open = false;
    for (const c of cells.slice(i, i + perLine)) {
      if (c.hl && !open) { line += '<span class="hl">'; open = true; }
      if (!c.hl && open) { line += "</span>"; open = false; }
      line += c.ch;
    }
    if (open) line += "</span>";
    html.push(line);
  }
  el.digits.innerHTML = html.join("\n");
}

const num = (n) => n.toLocaleString("ru-RU");

async function refresh() {
  const seq = ++renderSeq;
  const { perLine, cells } = measure();
  const { start, count } = layoutWindow(cells);
  el.digits.classList.add("loading");
  try {
    const digits = await getDigits(start, count);
    if (seq !== renderSeq) return;
    render(digits, start, perLine);
    el.first.textContent = num(Math.max(1, start));
    el.last.textContent = num(start + count - 1);
    el.found.textContent = view.pos === null ? "—" : num(view.pos);
    if (el.status.classList.contains("err")) setStatus("");
  } catch (e) {
    if (seq !== renderSeq) return;
    setStatus(`Не удалось получить цифры π: ${e.message}. Попробуйте позже.`, true);
    if (view.pos !== null) {
      el.found.textContent = num(view.pos);
      el.digits.innerHTML = `… <span class="hl">${fmtPosDigits()}</span> …`;
    }
  } finally {
    if (seq === renderSeq) el.digits.classList.remove("loading");
  }
}

let currentDateDigits = "";
const fmtPosDigits = () => currentDateDigits;

function setStatus(text, isErr = false) {
  el.status.textContent = text;
  el.status.classList.toggle("err", isErr);
}

/* ---------- поиск ---------- */

async function search(ev) {
  if (ev) ev.preventDefault();
  const date = parseDate(el.date.value);
  if (!date) {
    setStatus("Введите полную дату в формате ДД.ММ.ГГГГ, год от 0001 до 9999.", true);
    el.date.focus();
    return;
  }
  el.find.disabled = true;
  try {
    const pos = await lookup(date.d, date.m, date.y);
    history.replaceState(null, "", `#${date.text}`);
    if (!pos) {
      view.pos = null;
      el.found.textContent = "—";
      const lim = meta ? ` в первых ${num(meta.digits)} знаках` : "";
      setStatus(`${date.text} не встречается${lim} числа π.`, true);
      return;
    }
    currentDateDigits = date.text.replace(/\./g, "");
    view.pos = pos;
    // Как в оригинале: дата в случайном месте экрана, чтобы было видно, что фрагмент новый.
    view.rel = 0.1 + Math.random() * 0.8;
    setStatus(`${date.text} впервые встречается в π начиная с ${num(pos)}-й цифры после запятой.`);
    await refresh();
  } catch (e) {
    setStatus(`Ошибка: ${e.message}`, true);
  } finally {
    el.find.disabled = false;
  }
}

/* ---------- старт ---------- */

async function init() {
  el.date.addEventListener("input", onDateInput);
  el.form.addEventListener("submit", search);

  let t = 0;
  new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(refresh, 120);
  }).observe(el.digits);

  fetch("data/meta.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => {
      meta = m;
      if (m) el.metaNote.textContent = `поиск по первым ${num(m.digits)} знакам;`;
    })
    .catch(() => {});

  await loadStart();

  window.addEventListener("hashchange", () => {
    if (location.hash.slice(1) !== el.date.value) searchFromHash();
  });
  if (!(await searchFromHash())) await refresh();
  el.date.focus();
}

// Ссылка вида .../#14.03.1992 сразу ищет дату.
async function searchFromHash() {
  const digits = decodeURIComponent(location.hash.slice(1)).replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8 || !prefixOk(digits)) return false;
  lastGood = digits;
  el.date.value = fmt(digits);
  await search();
  return true;
}

init();
