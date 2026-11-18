"use strict";
/*
 * Your birthday in π — web version.
 *
 * Index data/idx/XX.bin: position of the first occurrence of the string DDMMYYYY in π
 * (1 = first digit after the decimal point). The digits themselves come from
 * api.pi.delivery; the first 3000 are bundled in data/start.txt.
 *
 * Digit numbering matches the API: index 0 is the "3", index 1 is the first "1" after the point.
 * UI strings live in i18n.js (global I18N).
 */

const API = "https://api.pi.delivery/v1/pi";
const BLOCK = 1000;                 // the API returns at most 1000 digits per request
const SLOTS_PER_YEAR = 12 * 31;
const MAX_CELLS = 6000;             // guard against huge screens

const $ = (id) => document.getElementById(id);
const el = {
  form: $("form"), date: $("date"), find: $("find"), reset: $("reset"), lead: $("lead"),
  first: $("first"), found: $("found"), last: $("last"),
  digits: $("digits"), status: $("status"), foot: $("foot-text"), copy: $("copy"), lang: $("lang"),
};

const blocks = new Map();           // block number -> Promise<string>
const indexFiles = new Map();       // century -> Promise<DataView>
let meta = null;

// What is on screen: position of the found date (or null) and its relative place in the window.
const view = { pos: null, rel: 0.4, start: 0, count: 0 };
let renderSeq = 0;

/* ---------- localization ---------- */

let lang = "en";
let status = null;                  // { key, params, isErr } — re-rendered on language change

function pickLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  let saved = null;
  try { saved = localStorage.getItem("lang"); } catch (_) { /* storage may be blocked */ }
  const wanted = [fromUrl, saved, ...(navigator.languages || [navigator.language])];
  for (const w of wanted) {
    if (!w) continue;
    const code = w.toLowerCase().split("-")[0];
    if (I18N[code]) return code;
  }
  return "en";
}

const tr = () => I18N[lang];
const fill = (s, p = {}) => s.replace(/\{(\w+)\}/g, (_, k) => (k in p ? p[k] : `{${k}}`));
const num = (n) => n.toLocaleString(`${lang}-u-nu-latn`);
const isolate = (s) => `⁨${s}⁩`;  // keep "14.03.1992" LTR inside RTL text

function applyLang() {
  const t = tr();
  document.documentElement.lang = lang;
  document.documentElement.dir = t.dir || "ltr";
  document.title = t.title;
  document.querySelector('meta[name="description"]').content = t.description;
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t[node.dataset.i18n];
  }
  el.date.placeholder = t.fmt;
  el.foot.innerHTML = fill(t.foot, { wiki: t.wiki, n: meta ? num(meta.digits) : "…" });
  el.lead.innerHTML = fill(t.lead, { article: `${REPO}/blob/main/${lang === "ru" ? "article-2026.ru.md" : "article-2026.md"}` });
  el.copy.innerHTML = fill(t.copy, { mit: LICENSE_URL });
  el.lang.value = lang;
  renderStatus();
  renderStats();
}

function setStatus(key, params = {}, isErr = false) {
  status = key ? { key, params, isErr } : null;
  renderStatus();
}

function renderStatus() {
  if (!status) {
    el.status.textContent = "";
    el.status.classList.remove("err");
    return;
  }
  const p = { ...status.params, fmt: tr().fmt };
  if (p.date) p.date = isolate(p.date);
  if (typeof p.pos === "number") p.pos = num(p.pos);
  if (typeof p.n === "number") p.n = num(p.n);
  el.status.textContent = fill(tr()[status.key], p);
  if (typeof updateReset === "function") updateReset();
  el.status.classList.toggle("err", status.isErr);
}

/* ---------- digits of π ---------- */

function getBlock(b) {
  if (!blocks.has(b)) {
    const p = fetch(`${API}?start=${b * BLOCK}&numberOfDigits=${BLOCK}`)
      .then((r) => {
        if (!r.ok) throw new Error(`pi.delivery: HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => j.content);
    p.catch(() => blocks.delete(b));  // do not cache failures
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
    const s = (await r.text()).trim();       // "3141592..." without the point
    for (let b = 0; (b + 1) * BLOCK <= s.length; b++) {
      blocks.set(b, Promise.resolve(s.slice(b * BLOCK, (b + 1) * BLOCK)));
    }
  } catch (_) { /* fine — the API will serve them */ }
}

/* ---------- date index ---------- */

function getIndexFile(century) {
  if (!indexFiles.has(century)) {
    const name = String(century).padStart(2, "0");
    const p = fetch(`data/idx/${name}.bin`)
      .then((r) => {
        if (!r.ok) throw new Error(`index ${name}.bin: HTTP ${r.status}`);
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
  return dv.getUint32(slot * 4, true);       // 0 = not found
}

/* ---------- date input ---------- */

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const daysIn = (m, y) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

// Validates partially typed DDMMYYYY digits — same rules as DateEntry.onValidate in the old app.
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
    if (d > daysIn(m, y)) return false;    // year 0000 is allowed (proleptic Gregorian, leap)
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
    void el.date.offsetWidth;                // restart the shake animation
    el.date.classList.add("bad");
  }
  el.date.value = fmt(lastGood);
  updateReset();
}

const updateReset = () => { el.reset.hidden = !el.date.value && view.pos === null && !status; };

// Back to the start screen: empty input, π from the beginning.
function reset() {
  lastGood = "";
  el.date.value = "";
  currentDateDigits = "";
  view.pos = null;
  setStatus(null);
  history.replaceState(null, "", location.pathname + location.search);
  updateReset();
  refresh();
  el.date.focus();
}

function parseDate(s) {
  const digits = s.replace(/\D/g, "");
  if (digits.length !== 8 || !prefixOk(digits)) return null;
  return { d: +digits.slice(0, 2), m: +digits.slice(2, 4), y: +digits.slice(4), text: fmt(digits) };
}

/* ---------- rendering ---------- */

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

// Window [start, start+count) in API numbering for the given number of cells.
function layoutWindow(cells) {
  const ELLIPSIS = 2;
  if (view.pos === null) {
    return { start: 0, count: cells - ELLIPSIS - 1 };   // −1: the point after "3"
  }
  let count = cells - ELLIPSIS;   // leading and trailing "…"
  const before = Math.round(view.rel * Math.max(0, count - 8));
  let start = view.pos - before;
  if (start <= 0) {                     // the date is at the very beginning of π
    start = 0;
    count -= 1;
  }
  return { start, count };
}

function renderDigits(digits, start, perLine) {
  const cells = start > 0 ? [{ ch: "…", hl: false }] : [];
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

function renderStats() {
  el.first.textContent = num(Math.max(1, view.start));
  el.last.textContent = view.count ? num(view.start + view.count - 1) : "—";
  el.found.textContent = view.pos === null ? "—" : num(view.pos);
}

async function refresh() {
  const seq = ++renderSeq;
  const { perLine, cells } = measure();
  const { start, count } = layoutWindow(cells);
  el.digits.classList.add("loading");
  try {
    const digits = await getDigits(start, count);
    if (seq !== renderSeq) return;
    renderDigits(digits, start, perLine);
    view.start = start;
    view.count = count;
    renderStats();
    if (status && status.key === "apiErr") setStatus(null);
  } catch (e) {
    if (seq !== renderSeq) return;
    setStatus("apiErr", { err: e.message }, true);
    if (view.pos !== null) {
      renderStats();
      el.digits.innerHTML = `… <span class="hl">${currentDateDigits}</span> …`;
    }
  } finally {
    if (seq === renderSeq) el.digits.classList.remove("loading");
  }
}

let currentDateDigits = "";

/* ---------- search ---------- */

async function search(ev) {
  if (ev) ev.preventDefault();
  const date = parseDate(el.date.value);
  if (!date) {
    setStatus("enterFull", {}, true);
    el.date.focus();
    return;
  }
  el.find.disabled = true;
  try {
    const pos = await lookup(date.d, date.m, date.y);
    history.replaceState(null, "", `${location.search}#${date.text}`);
    if (!pos) {
      view.pos = null;
      renderStats();
      setStatus("notFound", { date: date.text, n: meta ? meta.digits : "…" }, true);
      return;
    }
    currentDateDigits = date.text.replace(/\./g, "");
    view.pos = pos;
    // Like the original: the date lands at a random spot, so it is obvious the fragment is new.
    view.rel = 0.1 + Math.random() * 0.8;
    setStatus("foundMsg", { date: date.text, pos });
    await refresh();
  } catch (e) {
    setStatus("err", { err: e.message }, true);
  } finally {
    el.find.disabled = false;
  }
}

// A link like .../#14.03.1992 searches right away.
async function searchFromHash() {
  const digits = decodeURIComponent(location.hash.slice(1)).replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8 || !prefixOk(digits)) return false;
  lastGood = digits;
  el.date.value = fmt(digits);
  await search();
  return true;
}

/* ---------- startup ---------- */

async function init() {
  for (const [code, t] of Object.entries(I18N)) {
    el.lang.add(new Option(t.name, code));
  }
  lang = pickLang();
  applyLang();
  el.lang.addEventListener("change", () => {
    lang = el.lang.value;
    try { localStorage.setItem("lang", lang); } catch (_) { /* ignore */ }
    applyLang();
  });

  el.date.addEventListener("input", onDateInput);
  el.form.addEventListener("submit", search);
  el.reset.addEventListener("click", reset);

  let t = 0;
  new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(refresh, 120);
  }).observe(el.digits);

  fetch("data/meta.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => { meta = m; applyLang(); })
    .catch(() => {});

  await loadStart();

  window.addEventListener("hashchange", () => {
    if (!location.hash) reset();
    else if (location.hash.slice(1) !== el.date.value) searchFromHash();
  });
  if (!(await searchFromHash())) await refresh();
  el.date.focus();
}

init();
