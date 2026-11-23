/* ============ CONFIG ============
   The Apps Script URL lives in config.js (so you never have to edit this file). */
const API_URL = (window.TP_CONFIG && window.TP_CONFIG.API_URL) || "";
const NEED_BUILD = "7"; // must match BUILD in Code.gs
const POLL_MS = 10000;
const CLASSES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "SSC Final",
  "11",
  "12",
  "HSC Final",
  "Exam Batch",
  "Admission",
];
const STATUSES = ["Active", "Inactive", "Suspended", "Left"];
const THEMES = {
  ocean: "#2f7de1",
  emerald: "#16a368",
  violet: "#7c4fe0",
  rose: "#e0457b",
  amber: "#e08a0b",
  teal: "#0e9aa7",
  indigo: "#4552d9",
  sunset: "#e5622f",
  slate: "#475569",
  midnight: "#0f1624",
  forest: "#10201a",
};
const ICON = {
  dash: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z"/>',
  stu: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .7 3.5 2.6 3.5 6"/>',
  att: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>',
  fee: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  res: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  pro: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5"/>',
  acc: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  prev: '<path d="M15 6l-6 6 6 6"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  skip: '<path d="M5 4l10 8-10 8z"/><path d="M19 5v14"/>',
  print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',
  next: '<path d="M9 6l6 6-6 6"/>',
};
const VIEWS = {
  dash: "Dashboard",
  students: "Students",
  attendance: "Attendance",
  fees: "Tuition fees",
  results: "Results",
  profile: "My profile",
  admin: "Admin panel",
};
const NAVICON = {
  dash: "dash",
  students: "stu",
  attendance: "att",
  fees: "fee",
  results: "res",
  profile: "pro",
  admin: "acc",
};

/* ============ STATE & HELPERS ============ */
let DB = { Students: [], Batches: [], Attendance: [], Fees: [], Exams: [], Results: [] },
  ME = {},
  ADMIN = { users: [] },
  PEND = 0,
  VER = "0",
  route = "dash";
let TOKEN = localStorage.getItem("tok") || "",
  mode = "in",
  imgT = "";
const F = { q: "", cls: "", st: "", batch: "" };
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () =>
  "R" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const svg = (k) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
const t12 = (t) => {
  const mm = String(t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!mm) return "";
  let [h, m] = [+mm[1], +mm[2]];
  const p = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + String(m).padStart(2, "0") + " " + p;
};
const fmtBatch = (b) => {
  if (!b) return "No batch time";
  const [a, z] = b.split("-");
  return t12(a) + (z ? " – " + t12(z) : "");
};
const clsLabel = (c) => (/^\d+$/.test(c) ? "Class " + c : c);
const init = (n) => esc((n || "?").trim()[0]?.toUpperCase() || "?");
const img = (src, alt) => `<img src="${esc(src)}" alt="${alt}">`;
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("on");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("on"), 2400);
}
function status(state, txt) {
  $("#syncDot").className = "dot " + (state || "");
  $("#syncTxt").textContent = txt;
}

// Excel libraries are loaded only when needed, so the app itself starts much faster
const LIBS = { xlsx: ["XLSX", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"], exceljs: ["ExcelJS", "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"] };
function lib(k) {
  const [g, url] = LIBS[k];
  if (window[g]) return Promise.resolve(true);
  return new Promise((res) => {
    const s = document.createElement("script");
    s.src = url; s.onload = () => res(true); s.onerror = () => res(false);
    document.head.appendChild(s);
  });
}
// Small icon button used for every edit / delete / reset action (always placed at the right of its row)
const icoBtn = (cls, title, onclick, icon) =>
  `<button class="ico ${cls}" title="${title}" aria-label="${title}" onclick="event.stopPropagation();${onclick}">${svg(icon)}</button>`;

/* ============ API (Apps Script) + Local demo mode ============ */
async function api(action, p = {}) {
  if (!API_URL) return local(action, p);
  // text/plain avoids a CORS preflight against Apps Script
  const r = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action, token: TOKEN, ...p }) });
  const j = await r.json();
  if (!j.ok) { const e = new Error(j.error); e.auth = j.auth; throw e; }
  return j;
}
function local(a, p) { // browser-only demo so the interface can be tried without a backend
  const s = JSON.parse(localStorage.getItem("tuitionpro") || "null") || {
    data: { Students: [], Batches: [], Attendance: [], Fees: [], Exams: [], Results: [] },
    me: { id: "demo", role: "master", name: "TuitionPro Demo" },
    ver: "0",
  };
  if (a === "save") { const l = (s.data[p.table] = s.data[p.table] || []), i = l.findIndex((x) => x.id === p.row.id); i < 0 ? l.push(p.row) : (l[i] = p.row); }
  if (a === "saveMany") { const l = (s.data[p.table] = s.data[p.table] || []); p.rows.forEach((r) => { const i = l.findIndex((x) => x.id === r.id); i < 0 ? l.push(r) : p.upsert && (l[i] = r); }); }
  if (a === "remove") s.data[p.table] = s.data[p.table].filter((x) => x.id !== p.id);
  if (a === "removeWhere") s.data[p.table] = (s.data[p.table] || []).filter((x) => String(x[p.field]) !== String(p.value));
  if (a === "profile") Object.assign(s.me, p.fields);
  if (["save", "saveMany", "remove", "removeWhere", "profile"].includes(a)) { s.ver = String(Date.now()); localStorage.setItem("tuitionpro", JSON.stringify(s)); }
  return Promise.resolve({ ok: true, ver: s.ver, data: s.data, me: s.me, admin: { users: [] } });
}
function applyData(j) {
  DB = j.data; DB.Batches = DB.Batches || []; DB.Exams = DB.Exams || []; DB.Results = DB.Results || [];
  ME = j.me; ADMIN = j.admin || { users: [] }; VER = j.ver;
  PEND = ADMIN.users.filter((x) => x.status === "pending").length;
  document.body.classList.remove("locked"); $("#login").hidden = true;
  buildNav(); applyMe(); render(); setBell();
}
// Last known data is kept on this device so the app opens instantly, then refreshes quietly in the background.
function cacheSave() {
  if (!API_URL || !TOKEN) return;
  try { localStorage.setItem("tp_cache", JSON.stringify({ data: DB, me: ME, admin: ADMIN, ver: VER })); } catch (e) {}
}
function cacheLoad() { try { return JSON.parse(localStorage.getItem("tp_cache") || "null"); } catch (e) { return null; } }
function showLoader(on, txt) {
  if (txt) $("#loaderTxt").textContent = txt;
  $("#loader").classList.toggle("on", on);
}
async function load(blocking = true) {
  if (blocking) showLoader(true, "Loading your data…"); else status("off", "Syncing…");
  try {
    const j = await api("all");
    if (API_URL && j.build !== NEED_BUILD) toast("Your Apps Script is out of date. Deploy the latest Code.gs as a new version.");
    applyData(j); cacheSave();
    status(API_URL ? "" : "off", API_URL ? "Synced" : "Local mode (no backend)");
  } catch (e) {
    if (e.auth) { showLogin(); return; }
    status("err", "Offline: " + e.message);
    if (document.body.classList.contains("locked")) { showLoader(true, "Can't reach the server. Retrying…"); setTimeout(() => load(true), 5000); return; }
  }
  showLoader(false);
}
async function write(action, p, msg) {
  status("off", "Saving…");
  try {
    const j = await api(action, p);
    VER = j.ver || VER;
    status(API_URL ? "" : "off", API_URL ? "Saved to Drive" : "Local mode");
    if (msg) toast(msg);
    cacheSave();
    return true;
  } catch (e) { status("err", "Save failed"); toast(e.message); if (e.auth) showLogin(); else await load(false); return false; }
}
async function adminDo(action, p, msg) { // Master Admin actions
  if (!API_URL) { toast("Admin tools need the Apps Script backend"); return false; }
  status("off", "Working…");
  try {
    const j = await api(action, p);
    toast(msg + (j.emailed === true ? " - email sent" : j.emailed === false ? " - email could not be sent" : ""));
    await load(false);
    return true;
  } catch (e) { status("err", "Failed"); toast(e.message); return false; }
}
setInterval(async () => { // real-time sharing + sign-up notifications
  if (!API_URL || !TOKEN || document.hidden || $("#ov").classList.contains("on")) return;
  try {
    const j = await api("ping");
    if (ME.role === "master" && j.pending !== undefined) {
      if (j.pending > PEND) toast("New sign-up request waiting for approval");
      PEND = j.pending; setBell();
    }
    if (j.ver !== VER) load(false);
  } catch (e) { if (e.auth) showLogin(); else status("err", "Offline"); }
}, POLL_MS);

/* ============ SIGN IN / SIGN UP ============ */
function setMode(m) {
  mode = m;
  const up = m === "up";
  $("#lh").textContent = up ? "Request an account" : "Sign in";
  $("#lsub").textContent = up ? "The Master Admin will review your request. You will get an email once it is approved." : "Use your TuitionPro ID to continue.";
  ["lnamew", "lemailw"].forEach((i) => ($("#" + i).hidden = !up));
  $("#lname").required = $("#lemail").required = up;
  $("#lbtn").textContent = up ? "Send sign-up request" : "Sign in";
  $("#lpw").autocomplete = up ? "new-password" : "current-password";
  $("#lerr").textContent = ""; $("#lok").textContent = "";
  $("#ltab_in").classList.toggle("on", !up); $("#ltab_up").classList.toggle("on", up);
}
function showLogin() {
  TOKEN = ""; localStorage.removeItem("tok"); localStorage.removeItem("tp_cache");
  showLoader(false);
  document.body.classList.add("locked"); $("#login").hidden = false;
  document.title = "TuitionPro"; setMode("in");
}
$("#lf").onsubmit = async (e) => {
  e.preventDefault();
  $("#lerr").textContent = ""; $("#lok").textContent = ""; $("#lbtn").disabled = true;
  showLoader(true, mode === "up" ? "Sending your request…" : "Signing in…");
  try {
    if (mode === "up") {
      await api("signup", { id: $("#lid").value, pw: $("#lpw").value, name: $("#lname").value, email: $("#lemail").value });
      $("#lok").textContent = "Request sent. We will email you as soon as the Master Admin approves it.";
      $("#lf").reset();
    } else {
      const j = await api("login", { id: $("#lid").value, pw: $("#lpw").value });
      TOKEN = j.token; localStorage.setItem("tok", TOKEN); $("#lpw").value = "";
      if (j.data) { applyData(j); cacheSave(); status("", "Synced"); } else await load(false); // login already returns the data
    }
  } catch (x) { $("#lerr").textContent = x.message; }
  showLoader(false);
  $("#lbtn").disabled = false;
};
async function logout() {
  if (!API_URL) { toast("Local mode has no sign-in"); return; }
  try { await api("logout"); } catch (e) {}
  DB = { Students: [], Batches: [], Attendance: [], Fees: [], Exams: [], Results: [] }; ME = {}; showLogin();
}

/* ============ SHELL ============ */
function buildNav() {
  const keys = Object.keys(VIEWS).filter((k) => k !== "admin" || ME.role === "master");
  $("#nav").innerHTML = keys.map((k) => `<a data-r="${k}" onclick="go('${k}')" title="${VIEWS[k]}">${svg(NAVICON[k])}<span>${VIEWS[k]}</span>${k === "admin" || k === "fees" ? '<em class="nb" hidden></em>' : ""}</a>`).join("");
}
function setBell() { // notification bell + nav badge for pending sign-ups
  const master = ME.role === "master";
  $("#bell").hidden = !master || !API_URL;
  $("#bellN").textContent = PEND; $("#bellN").hidden = !PEND;
  const n = document.querySelector('.nav a[data-r="admin"] .nb');
  if (n) { n.textContent = PEND; n.hidden = !PEND; }
}
function applyMe() {
  const n = ME.name || "TuitionPro";
  $("#instName").textContent = n;
  document.title = ME.name ? "TuitionPro - " + ME.name : "TuitionPro";
  $("#logoBox").innerHTML = ME.logo ? img(ME.logo, "Logo") : init(n);
  $("#avBtn").innerHTML = ME.photo ? img(ME.photo, "Profile") : init(n);
  $("#upop").innerHTML = `<div class="who"><b>${esc(n)}</b><small>@${esc(ME.id)} · ${ME.role === "master" ? "Master Admin" : "User"}</small></div>
   <button class="btn" onclick="go('profile')">My profile</button><button class="btn" onclick="logout()">Sign out</button>`;
}
function go(r) {
  if (route === "attendance" && r !== "attendance" && AT.dirty.size && !confirm("You have unsaved attendance changes. Leave without saving?")) return;
  if (route === "results" && r !== "results" && !rsGuard()) return;
  route = r; history.replaceState(null, "", "#" + r); $("#app").classList.remove("mob"); closePops(); render(); }
function toggleSb() {
  const a = $("#app");
  if (innerWidth <= 820) a.classList.toggle("mob");
  else { a.classList.toggle("collapsed"); localStorage.setItem("sbc", a.classList.contains("collapsed") ? 1 : ""); }
}
function closePops() { document.querySelectorAll(".pop").forEach((p) => p.classList.remove("on")); }
function togglePop(e, id) { e.stopPropagation(); const p = $("#" + id), was = p.classList.contains("on"); closePops(); p.classList.toggle("on", !was); }
document.addEventListener("click", (e) => { if (!e.target.closest(".pop")) closePops(); });
function setTheme(t) {
  document.body.dataset.theme = t; localStorage.setItem("theme", t);
  document.querySelectorAll("#sw button").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
}
function render() {
  if (route === "admin" && ME.role !== "master") route = "dash";
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === route));
  $("#title").textContent = VIEWS[route];
  ({ dash: vDash, students: vStudents, attendance: vAttendance, fees: vFees, results: vResults, profile: vProfile, admin: vAdmin }[route] || vSoon)();
  feeBadge();
}

/* ============ CLASS / BATCH / STUDENT-ID HELPERS ============ */
const SECTIONS = ["Morning", "Afternoon", "Evening"];
const SEC_SHORT = { Morning: "Mor", Afternoon: "Aft", Evening: "Eve" };
const SEC_CODE = { Morning: "M", Afternoon: "A", Evening: "E" };
const CLS_CODE = { "SSC Final": "CSF", "HSC Final": "CHF", Admission: "CAD", "Exam Batch": "CEB" };
const clsCode = (c) => CLS_CODE[c] || "C" + c;
// Batch days, Saturday first. Letters feed the name suffix, codes feed the dashboard badge.
const DAYS = [["SAT", "S", "Saturday"], ["SUN", "S", "Sunday"], ["MON", "M", "Monday"], ["TUE", "T", "Tuesday"], ["WED", "W", "Wednesday"], ["THU", "T", "Thursday"], ["FRI", "F", "Friday"]];
const dayCodes = (b) => String(b.days || "").split(",").filter(Boolean);
const daysTag = (b) => (dayCodes(b).length ? "[" + dayCodes(b).join("/") + "]" : "");
const daysSuffix = (codes) => (codes.length ? " -[" + codes.map((c) => DAYS.find((d) => d[0] === c)[1]).join("/") + "]" : "");
const batchName = (c, sec, st, codes = []) =>
  st ? `${clsLabel(c)} ${SEC_SHORT[sec] || ""} ${t12(st)}`.replace(/\s+/g, " ") + daysSuffix(codes) : "";
// Saturday/Sunday are both "S" (and Tuesday/Thursday both "T"), so two batches can share a name.
// Dropdowns and imports then add the full day codes to keep every choice unique.
const bLabel = (b) =>
  dayCodes(b).length && DB.Batches.filter((x) => x.name === b.name).length > 1 ? `${b.name} (${dayCodes(b).join("/")})` : b.name;
const batchOf = (s) => DB.Batches.find((b) => b.id === s.batchId);
const stuClass = (s) => (batchOf(s) || s).class;
const sortBatches = (L) =>
  [...L].sort(
    (a, b) =>
      CLASSES.indexOf(a.class) - CLASSES.indexOf(b.class) ||
      SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) ||
      String(a.start).localeCompare(String(b.start)) ||
      String(a.days || "").localeCompare(String(b.days || "")),
  );
function instInitials() {
  const w = (ME.name || "").match(/[\p{L}\p{N}]+/gu) || [];
  const i = w.length > 1 ? w.map((x) => x[0]).join("") : (w[0] || "ED").slice(0, 2);
  return i.toUpperCase().slice(0, 4);
}
// Student ID: institute initials + joining year + class code + section letter + running number, e.g. TE26-C10-M-001
function nextSid(batch, joined) {
  const yy = String(joined || new Date().toISOString().slice(0, 10)).slice(2, 4);
  const pre = `${instInitials()}${yy}-${clsCode(batch.class)}-${SEC_CODE[batch.section] || "X"}-`;
  let n = 0;
  DB.Students.forEach((s) => {
    if (String(s.sid).startsWith(pre))
      n = Math.max(n, parseInt(String(s.sid).slice(pre.length), 10) || 0);
  });
  return pre + String(n + 1).padStart(3, "0");
}

/* ============ DASHBOARD: stats + searchable class/batch rows ============ */
const DF = { q: "", cls: "", sec: "", day: "" };
// Payment pending = active students who currently owe something (see Tuition fees)
const payPending = () => feeAll().filter((x) => x.I.pending > 0).length;
function vDash() {
  const S = DB.Students;
  const un = S.filter((s) => !batchOf(s)).length;
  const used = CLASSES.filter((c) => DB.Batches.some((b) => b.class === c));
  $("#view").innerHTML = `
  <div class="grid stats">
   <div class="glass stat"><small>Total students</small><b>${S.length}</b></div>
   <div class="glass stat"><small><i style="background:var(--ok)"></i>Active</small><b>${S.filter((s) => s.status === "Active").length}</b></div>
   <div class="glass stat" style="cursor:pointer" onclick="openFeesDue()" title="View pending payments"><small><i style="background:var(--warn)"></i>Payment pending</small><b>${payPending()}</b></div>
   <div class="glass stat" style="cursor:pointer" onclick="openUnassigned()" title="View them in Students"><small><i style="background:var(--ac)"></i>Unassigned</small><b>${un}</b></div>
  </div>
  <div class="glass tools" style="margin-top:12px">
   <input class="in grow" id="dq" placeholder="Search class, batch, time, day or student" value="${esc(DF.q)}">
   <select class="in" id="dc"><option value="">All classes</option>${used.map((c) => `<option value="${esc(c)}" ${DF.cls === c ? "selected" : ""}>${esc(clsLabel(c))}</option>`).join("")}</select>
   <select class="in" id="ds"><option value="">All sections</option>${SECTIONS.map((s) => `<option ${DF.sec === s ? "selected" : ""}>${s}</option>`).join("")}</select>
   <select class="in" id="dd"><option value="">All days</option>${DAYS.map(([c, , n]) => `<option value="${c}" ${DF.day === c ? "selected" : ""}>${n}</option>`).join("")}</select>
   <button class="btn" onclick="resetDash()">Clear</button>
  </div>
  <div class="sec">Classes and batch times <span id="dcnt"></span></div>
  <div class="rows" id="drows"></div>`;
  $("#dq").oninput = (e) => { DF.q = e.target.value; dashRows(); };
  $("#dc").onchange = (e) => { DF.cls = e.target.value; dashRows(); };
  $("#ds").onchange = (e) => { DF.sec = e.target.value; dashRows(); };
  $("#dd").onchange = (e) => { DF.day = e.target.value; dashRows(); };
  dashRows();
}
function dashRows() {
  const words = DF.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const dayNames = (b) => dayCodes(b).map((c) => DAYS.find((d) => d[0] === c)[2]).join(" ");
  const G = sortBatches(DB.Batches)
    .map((b) => ({ b, list: DB.Students.filter((s) => s.batchId === b.id) }))
    .filter(({ b, list }) => {
      if (DF.cls && b.class !== DF.cls) return false;
      if (DF.sec && b.section !== DF.sec) return false;
      if (DF.day && !dayCodes(b).includes(DF.day)) return false;
      if (!words.length) return true;
      const hay = [clsLabel(b.class), b.section, b.name, t12(b.start), daysTag(b), dayNames(b), list.map((s) => s.name + " " + s.sid).join(" ")].join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  const filtering = DF.q || DF.cls || DF.sec || DF.day;
  $("#dcnt").textContent = filtering ? `(${G.length} of ${DB.Batches.length})` : `(${DB.Batches.length})`;
  $("#drows").innerHTML =
    G.map((x) => {
      const c = {};
      x.list.forEach((s) => (c[s.status] = (c[s.status] || 0) + 1));
      const pct = x.list.length ? Math.round(((c.Active || 0) / x.list.length) * 100) : 0;
      return `<div class="glass crow" data-b="${esc(x.b.id)}" onclick="openBatch(this)" title="Open these students">
     <div class="cb"><b>${esc(clsLabel(x.b.class))}</b>${daysTag(x.b) ? `<b class="dy">${daysTag(x.b)}</b>` : ""}</div>
     <div class="bt">${t12(x.b.start)}<small>${esc(x.b.section)} batch</small></div>
     <div class="cnt"><b>${x.list.length}</b> students</div>
     <div class="pills">${STATUSES.filter((s) => c[s]).map((s) => `<span class="chip s-${s}">${c[s]} ${s}</span>`).join("")}</div>
     <div class="pr"><div><i style="width:${pct}%"></i></div><small>${pct}% active</small></div>
     <div class="ra">${icoBtn("", "Edit class / batch", `editBatch('${esc(x.b.id)}')`, "edit")}${icoBtn("del", "Delete batch", `delBatch('${esc(x.b.id)}')`, "trash")}</div></div>`;
    }).join("") ||
    `<div class="glass empty">${DB.Batches.length ? "No batches match your search or filters." : "No classes yet. Use <b>Add Class/Batch</b> above, then add your students."}</div>`;
}
function resetDash() {
  Object.assign(DF, { q: "", cls: "", sec: "", day: "" });
  vDash();
}
function openUnassigned() {
  Object.assign(F, { batch: "-", cls: "", q: "", st: "" });
  go("students");
}
function openBatch(el) {
  F.batch = el.dataset.b;
  F.cls = "";
  F.q = "";
  F.st = "";
  go("students");
}

/* ============ CLASS / BATCH MODAL (add + edit) ============ */
const pickedDays = () => [...document.querySelectorAll("#b_days input:checked")].map((i) => i.value);
function editBatch(id) {
  const e = DB.Batches.find((b) => b.id === id), cur = new Set(e ? dayCodes(e) : []);
  $("#modal").innerHTML = `<h2>${e ? "Edit class / batch" : "Add class / batch"}</h2>
  <div class="f">
   <label>Class<select class="in" id="b_class">${CLASSES.map((c) => `<option value="${esc(c)}" ${(e ? e.class : F.cls) === c ? "selected" : ""}>${esc(clsLabel(c))}</option>`).join("")}</select></label>
   <label>Section<select class="in" id="b_section">${SECTIONS.map((s) => `<option ${e && e.section === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
   <label class="full">Batch starts<input class="in" id="b_start" type="time" value="${e ? esc(e.start) : ""}"></label>
   <div class="full"><div class="lbl">Batch days (choose one or more)</div>
    <div class="days" id="b_days">${DAYS.map(([c, , n]) => `<label class="chk"><input type="checkbox" value="${c}" ${cur.has(c) ? "checked" : ""}><span>${n}</span></label>`).join("")}</div></div>
   <label class="full">Batch name (automatic)<input class="in" id="b_name" readonly placeholder="Choose a start time and days"></label>
  </div>
  <div class="acts" style="justify-content:space-between">${e ? icoBtn("del", "Delete batch", `delBatch('${e.id}')`, "trash") : "<span></span>"}
   <span style="display:flex;gap:8px"><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" onclick="saveBatch('${e ? e.id : ""}')">${e ? "Save changes" : "Save batch"}</button></span></div>`;
  const upd = () => ($("#b_name").value = batchName($("#b_class").value, $("#b_section").value, $("#b_start").value, pickedDays()));
  ["b_class", "b_section", "b_start"].forEach((k) => ($("#" + k).oninput = upd));
  document.querySelectorAll("#b_days input").forEach((i) => (i.onchange = upd));
  upd();
  $("#ov").classList.add("on");
  setTimeout(() => $("#b_start").focus(), 50);
}
async function saveBatch(id) {
  const c = $("#b_class").value, sec = $("#b_section").value, st = $("#b_start").value, codes = pickedDays();
  if (!st) { toast("Choose the batch start time"); return; }
  if (!codes.length) { toast("Select at least one batch day"); return; }
  const days = codes.join(","), name = batchName(c, sec, st, codes);
  if (DB.Batches.some((b) => b.id !== id && b.class === c && b.section === sec && b.start === st && (b.days || "") === days)) {
    toast("This class, section, time and days already exists");
    return;
  }
  const row = { id: id || uid(), class: c, section: sec, start: st, days, name };
  const old = DB.Batches.find((b) => b.id === id);
  old ? Object.assign(old, row) : DB.Batches.push(row);
  // keep the readable copies stored on each student in step with the batch
  const moved = old ? DB.Students.filter((s) => s.batchId === id).map((s) => Object.assign(s, { class: c, section: sec, batch: name })) : [];
  closeM();
  render();
  if (!(await write("save", { table: "Batches", row }, old ? "Batch updated" : "Class/batch added"))) return;
  for (let i = 0; i < moved.length; i += 200) await write("saveMany", { table: "Students", rows: moved.slice(i, i + 200), upsert: true }, "");
}
function delBatch(id) {
  const b = DB.Batches.find((x) => x.id === id);
  if (!b) return;
  const n = DB.Students.filter((s) => s.batchId === id).length;
  $("#modal").innerHTML = `<h2>Delete this batch?</h2>
  <p style="margin-bottom:10px"><b>${esc(bLabel(b))}</b></p>
  <div class="warnbox">${n ? `<b>${n} student${n > 1 ? "s are" : " is"} in this batch.</b> ${n > 1 ? "They" : "The student"} will not be deleted, but will become <b>Unassigned</b> until you move ${n > 1 ? "them" : "them"} to another batch. ` : ""}This cannot be undone.</div>
  <label class="full" style="margin-top:12px;display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mut)">Type <b>Yes</b> to confirm<input class="in" id="d_yes" autocomplete="off" style="color:var(--tx)"></label>
  <div class="acts"><button class="btn" onclick="closeM()">Cancel</button><button class="btn d" id="d_go" disabled onclick="doDelBatch('${id}')">Delete batch</button></div>`;
  const ok = () => $("#d_yes").value.trim().toLowerCase() === "yes";
  $("#d_yes").oninput = () => ($("#d_go").disabled = !ok());
  $("#d_yes").onkeydown = (e) => { if (e.key === "Enter" && ok()) doDelBatch(id); };
  $("#ov").classList.add("on");
  setTimeout(() => $("#d_yes").focus(), 50);
}
async function doDelBatch(id) {
  DB.Batches = DB.Batches.filter((b) => b.id !== id);
  closeM();
  render();
  await write("remove", { table: "Batches", id }, "Batch deleted");
}

/* ============ STUDENTS ============ */
function filtered() {
  const q = F.q.toLowerCase();
  return DB.Students.filter(
    (s) =>
      (!F.cls || stuClass(s) === F.cls) &&
      (!F.st || s.status === F.st) &&
      (!F.batch || (F.batch === "-" ? !batchOf(s) : s.batchId === F.batch)) &&
      (!q || [s.name, s.sid, s.guardian, s.phone].join(" ").toLowerCase().includes(q)),
  );
}
function vStudents() {
  const B = sortBatches(DB.Batches), hasUn = DB.Students.some((s) => !batchOf(s));
  $("#view").innerHTML = `
  <div class="glass tools">
   <input class="in grow" id="fq" placeholder="Search name, student ID, guardian, phone" value="${esc(F.q)}">
   <select class="in" id="fc"><option value="">All classes</option>${CLASSES.map((c) => `<option ${F.cls === c ? "selected" : ""} value="${esc(c)}">${esc(clsLabel(c))}</option>`).join("")}</select>
   <select class="in" id="fb"><option value="">All batches</option>${B.map((b) => `<option ${F.batch === b.id ? "selected" : ""} value="${esc(b.id)}">${esc(bLabel(b))}</option>`).join("")}${hasUn ? `<option value="-" ${F.batch === "-" ? "selected" : ""}>Unassigned</option>` : ""}</select>
   <select class="in" id="fs"><option value="">All status</option>${STATUSES.map((c) => `<option ${F.st === c ? "selected" : ""}>${c}</option>`).join("")}</select>
   <button class="btn" onclick="exportXlsx()">Export Excel</button>
  </div>
  <div class="glass tw"><table><thead><tr><th>Student ID</th><th>Name</th><th>Class</th><th>Batch</th><th>Guardian</th><th>Phone</th><th>Monthly/Course Fee</th><th>Status</th><th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
  $("#fq").oninput = (e) => { F.q = e.target.value; rows(); };
  $("#fc").onchange = (e) => { F.cls = e.target.value; rows(); };
  $("#fb").onchange = (e) => { F.batch = e.target.value; rows(); };
  $("#fs").onchange = (e) => { F.st = e.target.value; rows(); };
  rows();
}
function rows() {
  const key = (s) => (batchOf(s) || {}).start || "";
  const L = filtered().sort(
    (a, b) =>
      CLASSES.indexOf(stuClass(a)) - CLASSES.indexOf(stuClass(b)) ||
      key(a).localeCompare(key(b)) ||
      String(a.sid).localeCompare(String(b.sid)),
  );
  $("#tb").innerHTML =
    L.map((s) => {
      const b = batchOf(s);
      return `<tr><td><b>${esc(s.sid)}</b></td><td>${esc(s.name)}</td><td>${esc(clsLabel(stuClass(s)))}</td><td>${b ? esc(b.section) + " " + t12(b.start) + " " + daysTag(b) : "Unassigned"}</td><td>${esc(s.guardian)}</td><td>${esc(s.phone)}</td><td>${esc(s.fee)}<small class="mut"> ${s.feeType === "Course" ? "course" : "/month"}</small></td><td><span class="chip s-${esc(s.status)}">${esc(s.status)}</span></td>
   <td style="text-align:right"><span class="ra">${icoBtn("", "Edit student", `editStudent('${s.id}')`, "edit")}${icoBtn("del", "Delete student", `delStudent('${s.id}')`, "trash")}</span></td></tr>`;
    }).join("") ||
    `<tr><td colspan="9"><div class="empty">No students match. Clear the filters or use Add student.</div></td></tr>`;
}
function editStudent(id) {
  const B = sortBatches(DB.Batches);
  if (!B.length) { toast("Create a class and batch first"); editBatch(); return; }
  const s = DB.Students.find((x) => x.id === id) || { status: "Active" };
  const cur = B.some((b) => b.id === s.batchId) ? s.batchId : !id && B.some((b) => b.id === F.batch) ? F.batch : "";
  const v = (k) => esc(s[k]), gen = !s.sid;
  $("#modal").innerHTML = `<h2>${id ? "Edit student" : "Add student"}</h2>
  <div class="f">
   <label class="full">Full name<input class="in" id="m_name" value="${v("name")}"></label>
   <label class="full">Assign Class &amp; Batch<select class="in" id="m_batch"><option value="">Select class &amp; batch</option>${B.map((b) => `<option value="${esc(b.id)}" ${cur === b.id ? "selected" : ""}>${esc(bLabel(b))}</option>`).join("")}</select></label>
   <label>Student ID (automatic)<input class="in" id="m_sid" readonly value="${v("sid")}" placeholder="Pick a batch"></label>
   <label>Joined<input class="in" id="m_joined" type="date" value="${s.joined || new Date().toISOString().slice(0, 10)}"></label>
   <label>Status<select class="in" id="m_status">${STATUSES.map((c) => `<option ${s.status === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
   <label>Fee plan<select class="in" id="m_feeType" onchange="feePlanUI()"><option ${s.feeType !== "Course" ? "selected" : ""}>Monthly</option><option ${s.feeType === "Course" ? "selected" : ""}>Course</option></select></label>
   <label><span id="m_feeLbl">Monthly Fee</span><input class="in" id="m_fee" type="number" min="0" value="${v("fee")}"></label>
   <label id="m_ffw">Billing starts<input class="in" id="m_feeFrom" type="month" value="${esc(s.feeFrom || (s.joined || new Date().toISOString().slice(0, 10)).slice(0, 7))}"></label>
   <label>Guardian<input class="in" id="m_guardian" value="${v("guardian")}"></label>
   <label>Phone<input class="in" id="m_phone" inputmode="tel" value="${v("phone")}"></label>
  </div>
  <div class="acts"><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" onclick="saveStudent('${id || ""}')">Save student</button></div>`;
  const upd = () => {
    if (!gen) return;
    const b = DB.Batches.find((x) => x.id === $("#m_batch").value);
    $("#m_sid").value = b ? nextSid(b, $("#m_joined").value) : "";
  };
  $("#m_batch").onchange = $("#m_joined").onchange = upd;
  upd();
  feePlanUI();
  $("#ov").classList.add("on");
  setTimeout(() => $("#m_name").focus(), 50);
}
function closeM() {
  $("#modal").classList.remove("wide");
  $("#ov").classList.remove("on");
}
$("#ov").addEventListener("mousedown", (e) => {
  if (e.target.id === "ov") closeM();
});
async function saveStudent(id) {
  const g = (k) => $("#m_" + k).value.trim();
  if (!g("name")) { toast("Enter the student's name"); return; }
  const b = DB.Batches.find((x) => x.id === g("batch"));
  if (!b) { toast("Choose a class and batch"); return; }
  const old = DB.Students.find((x) => x.id === id);
  const row = {
    id: id || uid(),
    sid: old && old.sid ? old.sid : nextSid(b, g("joined")),
    roll: old ? old.roll || "" : "",
    name: g("name"),
    batchId: b.id,
    class: b.class,
    section: b.section,
    batch: b.name,
    guardian: g("guardian"),
    phone: g("phone"),
    fee: g("fee"),
    feeType: g("feeType"),
    feeFrom: g("feeFrom") || g("joined").slice(0, 7),
    status: g("status"),
    joined: g("joined"),
    updated: new Date().toISOString(),
  };
  const i = DB.Students.findIndex((x) => x.id === row.id);
  i < 0 ? DB.Students.push(row) : (DB.Students[i] = row);
  closeM();
  render();
  await write("save", { table: "Students", row }, "Student saved");
}
async function delStudent(id) {
  const s = DB.Students.find((x) => x.id === id);
  if (!confirm(`Delete ${s.name}? This cannot be undone.`)) return;
  DB.Students = DB.Students.filter((x) => x.id !== id);
  render();
  await write("remove", { table: "Students", id }, "Student deleted");
}
async function exportXlsx() {
  const L = filtered().map((s) => {
    const b = batchOf(s);
    return {
      "Student ID": s.sid,
      Name: s.name,
      Class: stuClass(s),
      Section: b ? b.section : "",
      Batch: b ? bLabel(b) : "",
      "Batch days": b ? dayCodes(b).join("/") : "",
      Guardian: s.guardian,
      Phone: s.phone,
      "Monthly/Course Fee": s.fee,
      Status: s.status,
      Joined: s.joined,
    };
  });
  if (!L.length) { toast("Nothing to export"); return; }
  if (await lib("xlsx")) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(L), "Students");
    XLSX.writeFile(wb, "students.xlsx");
  } else toast("Excel library failed to load. Check your internet connection.");
}

/* ============ IMPORT STUDENTS (Excel / CSV) ============ */
let IMP = null;
const nk = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIAS = {
  name: ["name", "studentname", "fullname"],
  class: ["class"],
  batch: ["batch", "batchname"],
  guardian: ["guardian", "guardianname", "parent", "parentname"],
  phone: ["phone", "mobile", "phonenumber", "contact", "guardianphone"],
  fee: ["monthlycoursefee", "fee", "monthlyfee", "coursefee"],
  status: ["status"],
  joined: ["joined", "joiningdate", "joineddate", "joindate", "dateofjoining"],
};
const pad2 = (n) => String(n).padStart(2, "0");
function parseDate(v) {
  const today = new Date().toISOString().slice(0, 10);
  if (v instanceof Date && !isNaN(v)) {
    const d = new Date(v.getTime() + 12 * 36e5); // +12h guards against timezone edge cases
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  if (typeof v === "number" && v > 20000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // day first
  if (m) return `${m[3]}-${pad2(m[2])}-${pad2(m[1])}`;
  return today;
}
const fixPhone = (v) => {
  const s = String(v ?? "").trim();
  return /^1\d{9}$/.test(s) ? "0" + s : s; // Excel drops the leading 0 of numeric phones
};

function importModal() {
  if (!DB.Batches.length) { toast("Create a class and batch first"); editBatch(); return; }
  IMP = null;
  const used = CLASSES.filter((c) => DB.Batches.some((b) => b.class === c));
  $("#modal").innerHTML = `<h2>Import students</h2>
  <div class="f">
   <label>Class<select class="in" id="i_class"><option value="">Select class</option>${used.map((c) => `<option value="${esc(c)}" ${F.cls === c ? "selected" : ""}>${esc(clsLabel(c))}</option>`).join("")}</select></label>
   <label>Batch<select class="in" id="i_batch"></select></label>
   <label class="full">Excel or CSV file<input class="in" id="i_file" type="file" accept=".xlsx,.xls,.csv"></label>
  </div>
  <p class="mut" style="font-size:12px;margin-top:10px">Rows with their own Class and Batch use those. All other rows go to the class and batch chosen above.</p>
  <div class="impbox" id="i_res"></div>
  <div class="acts" style="justify-content:space-between;flex-wrap:wrap">
   <button class="btn" onclick="downloadTemplate()">Download template</button>
   <span style="display:flex;gap:8px"><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" id="i_go" onclick="doImport()" disabled>Import</button></span>
  </div>`;
  impFillBatches();
  if (F.batch && F.batch !== "-") { const b = DB.Batches.find((x) => x.id === F.batch); if (b) { $("#i_class").value = b.class; impFillBatches(); $("#i_batch").value = b.id; } }
  $("#i_class").onchange = () => { impFillBatches(); impPreview(); };
  $("#i_batch").onchange = () => {
    const b = DB.Batches.find((x) => x.id === $("#i_batch").value);
    if (b && $("#i_class").value !== b.class) { $("#i_class").value = b.class; impFillBatches(); $("#i_batch").value = b.id; }
    impPreview();
  };
  $("#i_file").onchange = impRead;
  $("#ov").classList.add("on");
}
function impFillBatches() {
  const c = $("#i_class").value, keep = $("#i_batch").value;
  const L = sortBatches(DB.Batches).filter((b) => !c || b.class === c);
  $("#i_batch").innerHTML = `<option value="">Select batch</option>` + L.map((b) => `<option value="${esc(b.id)}" ${b.id === keep ? "selected" : ""}>${esc(bLabel(b))}</option>`).join("");
  if (c && L.length === 1) $("#i_batch").value = L[0].id;
}
async function impRead(e) {
  const f = e.target.files[0];
  if (!f) return;
  if (!(await lib("xlsx"))) { toast("Excel library failed to load. Check your internet connection."); return; }
  try {
    const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true });
    const ws = wb.Sheets["Students"] || wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
    IMP = { raw: raw.map((r) => {
      const o = {};
      Object.entries(r).forEach(([k, v]) => {
        const key = Object.keys(ALIAS).find((a) => ALIAS[a].includes(nk(k)));
        if (key && o[key] === undefined) o[key] = v;
      });
      return o;
    }) };
  } catch (x) { IMP = null; $("#i_res").innerHTML = `<div class="lerr">Could not read that file. Use the template or an .xlsx/.csv file.</div>`; return; }
  impPreview();
}
function impResolve() {
  const defB = DB.Batches.find((b) => b.id === $("#i_batch").value);
  const clsMap = {}; CLASSES.forEach((c) => (clsMap[nk(c)] = c));
  const batchMap = {}; DB.Batches.forEach((b) => (batchMap[nk(bLabel(b))] = b));
  const ok = [], errs = []; let dups = 0;
  const seen = new Set(DB.Students.map((s) => s.batchId + "|" + nk(s.name) + "|" + nk(s.phone)));
  IMP.raw.forEach((r, i) => {
    const name = String(r.name ?? "").trim();
    if (!name) return;
    const line = i + 2, cRaw = String(r.class ?? "").trim(), bRaw = String(r.batch ?? "").trim();
    const cl = cRaw ? clsMap[nk(cRaw).replace(/^class/, "")] : "";
    let b = null, err = "";
    if (cRaw && !cl) err = `Unknown class "${cRaw}"`;
    else if (bRaw) {
      b = batchMap[nk(bRaw)];
      if (!b) err = `Unknown batch "${bRaw}"`;
      else if (cl && b.class !== cl) err = `Batch is not in ${clsLabel(cl)}`;
    } else if (cl) {
      const L = DB.Batches.filter((x) => x.class === cl);
      b = defB && defB.class === cl ? defB : L.length === 1 ? L[0] : null;
      if (!b) err = `Choose a batch for ${clsLabel(cl)}`;
    } else { b = defB; if (!b) err = "No batch: pick one above or fill the Batch column"; }
    if (err) { errs.push({ line, name, err }); return; }
    const phone = fixPhone(r.phone), key = b.id + "|" + nk(name) + "|" + nk(phone);
    if (seen.has(key)) { dups++; return; }
    seen.add(key);
    const st = STATUSES.find((s) => nk(s) === nk(r.status)) || "Active";
    ok.push({ name, b, guardian: String(r.guardian ?? "").trim(), phone, fee: String(r.fee ?? "").trim(), status: st, joined: parseDate(r.joined) });
  });
  return { ok, errs, dups };
}
function impPreview() {
  if (!IMP) return;
  const R = (IMP.res = impResolve());
  $("#i_res").innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">
    <span class="chip s-Active">${R.ok.length} ready</span>
    ${R.errs.length ? `<span class="chip s-Left">${R.errs.length} with problems</span>` : ""}
    ${R.dups ? `<span class="chip s-Suspended">${R.dups} duplicates skipped</span>` : ""}</div>
    ${R.errs.slice(0, 6).map((e) => `<div class="lerr" style="text-align:left">Row ${e.line} (${esc(e.name)}): ${esc(e.err)}</div>`).join("")}
    ${R.errs.length > 6 ? `<div class="mut">and ${R.errs.length - 6} more…</div>` : ""}
    ${!R.ok.length && !R.errs.length && !R.dups ? `<div class="mut">No student rows found. Check that the Name column is filled.</div>` : ""}`;
  $("#i_go").disabled = !R.ok.length;
  $("#i_go").textContent = R.ok.length ? `Import ${R.ok.length} student${R.ok.length > 1 ? "s" : ""}` : "Import";
}
async function doImport() {
  if (!IMP || !IMP.res || !IMP.res.ok.length) return;
  const rows = IMP.res.ok.map((x) => {
    const row = { id: uid(), sid: nextSid(x.b, x.joined), roll: "", name: x.name, batchId: x.b.id, class: x.b.class, section: x.b.section, batch: x.b.name, guardian: x.guardian, phone: x.phone, fee: x.fee, status: x.status, joined: x.joined, updated: new Date().toISOString() };
    DB.Students.push(row); // pushed one by one so the next Student ID keeps counting up
    return row;
  });
  closeM(); render();
  for (let i = 0; i < rows.length; i += 200) {
    const last = i + 200 >= rows.length;
    if (!(await write("saveMany", { table: "Students", rows: rows.slice(i, i + 200) }, last ? `${rows.length} students imported` : ""))) return;
  }
}
async function downloadTemplate() {
  if (!(await lib("exceljs"))) { toast("Template library failed to load. Check your internet connection."); return; }
  const B = sortBatches(DB.Batches), used = CLASSES.filter((c) => B.some((b) => b.class === c));
  const defB = $("#i_batch") && DB.Batches.find((b) => b.id === $("#i_batch").value);
  const defC = defB ? defB.class : $("#i_class") ? $("#i_class").value : "";
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Students", { views: [{ state: "frozen", ySplit: 1 }] });
  const help = wb.addWorksheet("How to use");
  const ls = wb.addWorksheet("Lists", { state: "hidden" });
  used.forEach((c, i) => (ls.getCell(i + 1, 1).value = c));
  B.forEach((b, i) => (ls.getCell(i + 1, 2).value = bLabel(b)));
  [["Name", 28], ["Class", 14], ["Batch", 26], ["Guardian", 22], ["Phone", 16], ["Monthly/Course Fee", 20], ["Status", 12], ["Joined", 14]].forEach(([h, w], i) => {
    ws.getColumn(i + 1).width = w;
    const c = ws.getCell(1, i + 1); c.value = h; c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE9FA" } };
  });
  const N = 200;
  for (let r = 2; r <= N + 1; r++) {
    ws.getCell(r, 5).numFmt = "@"; ws.getCell(r, 8).numFmt = "yyyy-mm-dd";
    if (defC) ws.getCell(r, 2).value = defC;
    if (defB) ws.getCell(r, 3).value = bLabel(defB);
  }
  const dv = (rng, o) => ws.dataValidations.add(rng, { allowBlank: true, showErrorMessage: true, errorStyle: "stop", ...o });
  dv(`B2:B${N + 1}`, { type: "list", formulae: [`Lists!$A$1:$A$${used.length}`], errorTitle: "Class", error: "Choose a class from the list." });
  dv(`C2:C${N + 1}`, { type: "list", formulae: [`Lists!$B$1:$B$${B.length}`], errorTitle: "Batch", error: "Choose a batch from the list. Add new batches in the portal first." });
  dv(`G2:G${N + 1}`, { type: "list", formulae: ['"Active,Inactive,Suspended,Left"'], errorTitle: "Status", error: "Choose Active, Inactive, Suspended or Left." });
  dv(`F2:F${N + 1}`, { type: "decimal", operator: "greaterThanOrEqual", formulae: [0], errorTitle: "Fee", error: "Enter a number." });
  help.getColumn(1).width = 90;
  ["How to fill the Students sheet", "1. Name is required. Rows without a name are ignored.",
   "2. Class and Batch are dropdowns of the classes and batches created in the portal. Leave them empty to use the class and batch chosen in the Import window.",
   "3. Status defaults to Active. Joined defaults to today (use YYYY-MM-DD or DD/MM/YYYY).",
   "4. Student IDs are created automatically during import.",
   "5. Created a new batch since downloading? Download a fresh template."].forEach((t, i) => { help.getCell(i + 1, 1).value = t; if (!i) help.getCell(1, 1).font = { bold: true }; help.getCell(i + 1, 1).alignment = { wrapText: true }; });
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = "student-import-template.xlsx"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/* ============ ATTENDANCE ============ */
const MARKS = ["Present", "Absent", "Late"];
const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const AT = { tab: "take", batch: "", date: "", month: "", marks: {}, dirty: new Set() };
const dKey = (d) => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
const dateObj = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const shiftDate = (s, n) => { const d = dateObj(s); d.setDate(d.getDate() + n); return dKey(d); };
const shiftMonth = (s, n) => { const [y, m] = s.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + "-" + pad2(d.getMonth() + 1); };
const batchStudents = (bid) => DB.Students.filter((s) => s.batchId === bid && s.status === "Active").sort((a, b) => String(a.sid).localeCompare(String(b.sid)));
function loadMarks() {
  AT.marks = {};
  DB.Attendance.forEach((r) => { if (r.batchId === AT.batch && r.date === AT.date) AT.marks[r.studentId] = r.status; });
}
function atGuard() { return !AT.dirty.size || confirm("You have unsaved attendance changes. Discard them?"); }
function atSet(k, v) {
  if (!atGuard()) { vAttendance(); return; }
  AT[k] = v; AT.dirty.clear(); loadMarks(); vAttendance();
}
const atDay = (n) => atSet("date", shiftDate(AT.date, n));
const atMonth = (n) => atSet("month", shiftMonth(AT.month, n));
window.addEventListener("beforeunload", (e) => { if (AT.dirty.size) { e.preventDefault(); e.returnValue = ""; } });

function vAttendance() {
  if (!DB.Batches.length) {
    $("#view").innerHTML = `<div class="glass pad empty">Create a class and batch first, then you can take attendance.<br><br><button class="btn p" onclick="editBatch()">Add Class/Batch</button></div>`;
    return;
  }
  const B = sortBatches(DB.Batches);
  if (!AT.date) AT.date = dKey(new Date());
  if (!AT.month) AT.month = AT.date.slice(0, 7);
  if (!B.some((b) => b.id === AT.batch)) { const t = WD[new Date().getDay()]; AT.batch = (B.find((b) => dayCodes(b).includes(t)) || B[0]).id; AT.dirty.clear(); }
  if (!AT.dirty.size) loadMarks();
  const take = AT.tab === "take";
  $("#view").innerHTML = `
  <div class="glass tools">
   <div class="tabs"><button class="${take ? "on" : ""}" onclick="atSet('tab','take')">Take attendance</button><button class="${take ? "" : "on"}" onclick="atSet('tab','report')">Monthly report</button></div>
   <select class="in grow" id="at_batch">${B.map((b) => `<option value="${esc(b.id)}" ${AT.batch === b.id ? "selected" : ""}>${esc(bLabel(b))}</option>`).join("")}</select>
   ${take
     ? `${icoBtn("", "Previous day", "atDay(-1)", "prev")}<input class="in" type="date" id="at_date" value="${AT.date}">${icoBtn("", "Next day", "atDay(1)", "next")}<button class="btn" onclick="atSet('date', dKey(new Date()))">Today</button>`
     : `${icoBtn("", "Previous month", "atMonth(-1)", "prev")}<input class="in" type="month" id="at_month" value="${AT.month}">${icoBtn("", "Next month", "atMonth(1)", "next")}<button class="btn" onclick="atExport()">Export Excel</button>`}
  </div>
  <div id="at_body"></div>`;
  $("#at_batch").onchange = (e) => atSet("batch", e.target.value);
  if (take) { $("#at_date").onchange = (e) => e.target.value && atSet("date", e.target.value); atTake(); }
  else { $("#at_month").onchange = (e) => e.target.value && atSet("month", e.target.value); atReport(); }
}

function atTake() {
  const S = batchStudents(AT.batch), b = DB.Batches.find((x) => x.id === AT.batch);
  const cnt = { Present: 0, Absent: 0, Late: 0 };
  S.forEach((s) => { const m = AT.marks[s.id]; if (m && cnt[m] !== undefined) cnt[m]++; });
  const left = S.length - cnt.Present - cnt.Absent - cnt.Late;
  const off = b && dayCodes(b).length && !dayCodes(b).includes(WD[dateObj(AT.date).getDay()]);
  $("#at_body").innerHTML = `
  ${off ? `<div class="warnbox" style="margin-bottom:12px">${dateObj(AT.date).toLocaleDateString(undefined, { weekday: "long" })} is not a regular class day for this batch ${daysTag(b)}. You can still take attendance.</div>` : ""}
  <div class="glass tools">
   <span class="chip s-Present">${cnt.Present} Present</span><span class="chip s-Absent">${cnt.Absent} Absent</span><span class="chip s-Late">${cnt.Late} Late</span><span class="chip s-Inactive">${left} Not marked</span>
   ${AT.dirty.size ? `<span class="chip s-Suspended">Unsaved changes</span>` : ""}
   <span style="flex:1"></span>
   <button class="btn" onclick="atAll('Present')">All present</button><button class="btn" onclick="atAll('')">Clear</button>
   <button class="btn p" onclick="atSave()" ${AT.dirty.size ? "" : "disabled"}>Save attendance</button>
  </div>
  <div class="rows">${
    S.map((s) => `<div class="glass arow"><div class="av">${init(s.name)}</div><div class="ai"><b>${esc(s.name)}</b><small>${esc(s.sid)}</small></div>
     <div class="seg">${MARKS.map((m) => `<button class="${m[0].toLowerCase()} ${AT.marks[s.id] === m ? "on" : ""}" onclick="atMark('${s.id}','${m}')" title="${m}"><span class="long">${m}</span><span class="short">${m[0]}</span></button>`).join("")}</div></div>`).join("") ||
    `<div class="glass empty">No active students in this batch yet. Add students and assign them to this batch.</div>`}</div>`;
}
function atMark(id, m) {
  AT.marks[id] === m ? delete AT.marks[id] : (AT.marks[id] = m);
  AT.dirty.add(id); atTake();
}
function atAll(m) {
  batchStudents(AT.batch).forEach((s) => { if ((AT.marks[s.id] || "") !== m) { m ? (AT.marks[s.id] = m) : delete AT.marks[s.id]; AT.dirty.add(s.id); } });
  atTake();
}
async function atSave() {
  const rows = [], gone = [];
  AT.dirty.forEach((id) => {
    const rid = AT.date + "_" + id, st = AT.marks[id];
    if (st) rows.push({ id: rid, date: AT.date, studentId: id, batchId: AT.batch, status: st });
    else if (DB.Attendance.some((r) => r.id === rid)) gone.push(rid);
  });
  DB.Attendance = DB.Attendance.filter((r) => !rows.some((x) => x.id === r.id) && !gone.includes(r.id)).concat(rows);
  AT.dirty.clear(); atTake();
  let ok = true;
  if (rows.length) ok = await write("saveMany", { table: "Attendance", rows, upsert: true }, gone.length ? "" : `Attendance saved (${rows.length})`);
  for (const id of gone) { if (!ok) break; ok = await write("remove", { table: "Attendance", id }, ""); }
  if (ok && gone.length) toast("Attendance saved");
}

// ----- monthly report -----
function repData() {
  const [y, mo] = AT.month.split("-").map(Number), days = new Date(y, mo, 0).getDate();
  const recs = DB.Attendance.filter((r) => r.batchId === AT.batch && String(r.date).startsWith(AT.month));
  const ids = new Set(batchStudents(AT.batch).map((s) => s.id)); recs.forEach((r) => ids.add(r.studentId));
  const S = [...ids].map((id) => DB.Students.find((s) => s.id === id)).filter(Boolean).sort((a, b) => String(a.sid).localeCompare(String(b.sid)));
  const at = {}; recs.forEach((r) => (at[r.studentId + "|" + Number(String(r.date).slice(8, 10))] = r.status));
  const held = new Set(recs.map((r) => r.date)).size;
  const rowsOut = S.map((s) => {
    const c = { Present: 0, Absent: 0, Late: 0 };
    for (let d = 1; d <= days; d++) { const m = at[s.id + "|" + d]; if (m) c[m]++; }
    return { s, c, pct: held ? Math.round(((c.Present + c.Late) / held) * 100) : 0 };
  });
  return { y, mo, days, at, held, rowsOut };
}
function atReport() {
  const b = DB.Batches.find((x) => x.id === AT.batch), R = repData(), cls = dayCodes(b || {});
  const head = Array.from({ length: R.days }, (_, i) => { const wd = WD[new Date(R.y, R.mo - 1, i + 1).getDay()]; return `<th class="${cls.length && !cls.includes(wd) ? "off" : ""}">${i + 1}<small>${wd[0]}</small></th>`; }).join("");
  $("#at_body").innerHTML = `<div class="glass tw"><table class="rep"><thead><tr><th class="stick">Student</th>${head}<th>P</th><th>A</th><th>L</th><th>%</th></tr></thead><tbody>${
    R.rowsOut.map(({ s, c, pct }) => `<tr><td class="stick"><b>${esc(s.name)}</b><small class="mut" style="display:block">${esc(s.sid)}</small></td>${
      Array.from({ length: R.days }, (_, i) => { const m = R.at[s.id + "|" + (i + 1)]; return `<td>${m ? `<span class="mk ${m[0]}" title="${m}">${m[0]}</span>` : ""}</td>`; }).join("")}
     <td>${c.Present}</td><td>${c.Absent}</td><td>${c.Late}</td><td><span class="chip ${pct >= 80 ? "s-Present" : pct >= 60 ? "s-Late" : "s-Absent"}">${pct}%</span></td></tr>`).join("") ||
    `<tr><td colspan="${R.days + 5}"><div class="empty">No students in this batch.</div></td></tr>`}</tbody></table></div>
  <p class="mut" style="font-size:12px;margin:8px 2px">${R.held} class day${R.held === 1 ? "" : "s"} recorded this month. Percentage = (Present + Late) ÷ days recorded. Greyed columns are not regular class days.</p>`;
}
async function atExport() {
  const R = repData(), b = DB.Batches.find((x) => x.id === AT.batch);
  if (!R.rowsOut.length) { toast("Nothing to export"); return; }
  if (!(await lib("xlsx"))) { toast("Excel library failed to load. Check your internet connection."); return; }
  const aoa = [["Student ID", "Name", ...Array.from({ length: R.days }, (_, i) => i + 1), "Present", "Absent", "Late", "%"]];
  R.rowsOut.forEach(({ s, c, pct }) => aoa.push([s.sid, s.name, ...Array.from({ length: R.days }, (_, i) => (R.at[s.id + "|" + (i + 1)] || "")[0] || ""), c.Present, c.Absent, c.Late, pct]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Attendance");
  XLSX.writeFile(wb, `attendance-${AT.month}-${bLabel(b).replace(/[^\w-]+/g, "_")}.xlsx`);
}

/* ============ TUITION FEES ============ */
const CUR = "৳";
const money = (n) => CUR + Math.round(Number(n) || 0).toLocaleString("en-US");
const curMonth = () => dKey(new Date()).slice(0, 7);
const monthLabel = (m) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" }); };
const monthsBetween = (a, b) => { const out = []; for (let m = a, i = 0; m <= b && i < 600; m = shiftMonth(m, 1), i++) out.push(m); return out; };
const METHODS = ["Cash", "bKash", "Nagad", "Rocket", "Bank", "Other"];
const FS = { q: "", batch: "", plan: "", st: "due", stu: "Active" };
const sum = (L, f) => L.reduce((a, x) => a + (Number(f(x)) || 0), 0);

function feePlanUI() { // student form: Monthly shows a billing-start month, Course does not
  const course = $("#m_feeType").value === "Course";
  $("#m_feeLbl").textContent = course ? "Course Fee (total)" : "Monthly Fee";
  $("#m_ffw").style.display = course ? "none" : "";
}

// One student's fee position. Payments are records: kind "monthly" (month = YYYY-MM), "course", or "skip" (month waived).
function feeInfo(s, recs) {
  recs = recs || DB.Fees.filter((f) => f.studentId === s.id);
  const fee = Number(s.fee) || 0, pays = recs.filter((r) => r.kind !== "skip"), paid = sum(pays, (r) => r.amount);
  if (s.feeType === "Course") {
    const pending = Math.max(0, fee - paid);
    return { type: "Course", fee, due: fee, paid, pending, rows: [], clear: "", pct: fee ? Math.min(100, Math.round((paid / fee) * 100)) : 0, paidBy: {}, skipped: new Set(), start: "",
      status: !fee ? "No fee" : pending === 0 ? "Cleared" : paid > 0 ? "Partial" : "Pending" };
  }
  const cur = curMonth();
  const start = /^\d{4}-\d{2}$/.test(s.feeFrom) ? s.feeFrom : /^\d{4}-\d{2}/.test(s.joined || "") ? String(s.joined).slice(0, 7) : cur;
  const skipped = new Set(recs.filter((r) => r.kind === "skip").map((r) => r.month));
  const paidBy = {}; pays.forEach((r) => (paidBy[r.month] = (paidBy[r.month] || 0) + (Number(r.amount) || 0)));
  const rows = []; let due = 0, pending = 0, clear = "", blocked = false;
  monthsBetween(start, cur).forEach((m) => {
    const d = skipped.has(m) ? 0 : fee, p = paidBy[m] || 0, pend = Math.max(0, d - p);
    rows.push({ m, due: d, paid: p, pend, skip: skipped.has(m) });
    due += d; pending += pend;
    if (!blocked) { if (pend === 0) clear = m; else blocked = true; }
  });
  if (!blocked) for (let m = shiftMonth(cur, 1), i = 0; i < 24; i++, m = shiftMonth(m, 1)) { // advance payments extend "clear till"
    if (skipped.has(m) || (fee && (paidBy[m] || 0) >= fee)) clear = m; else break;
  }
  return { type: "Monthly", fee, due, paid, pending, rows, clear, paidBy, skipped, start,
    status: !fee ? "No fee" : pending === 0 ? "Cleared" : rows.some((r) => r.paid > 0 && r.pend > 0) ? "Partial" : "Pending" };
}
function feeAll(everyone) {
  const by = {}; DB.Fees.forEach((f) => (by[f.studentId] = by[f.studentId] || []).push(f));
  return DB.Students.filter((s) => everyone || s.status === "Active").map((s) => ({ s, I: feeInfo(s, by[s.id] || []) }));
}
function feeBadge() { // notification tag on the Tuition fees menu item
  const n = DB.Students.length ? payPending() : 0, el = document.querySelector('.nav a[data-r="fees"] .nb');
  if (el) { el.textContent = n; el.hidden = !n; el.title = n + " student" + (n === 1 ? "" : "s") + " with pending payments"; }
}
function openFeesDue() { Object.assign(FS, { q: "", batch: "", plan: "", st: "due", stu: "Active" }); go("fees"); }
async function saveFeeRows(rows, msg) {
  for (let i = 0; i < rows.length; i += 200) {
    if (!(await write("saveMany", { table: "Fees", rows: rows.slice(i, i + 200) }, i + 200 >= rows.length ? msg : ""))) return false;
  }
  return true;
}

/* ----- overview ----- */
function feeList() {
  const q = FS.q.toLowerCase();
  return feeAll(FS.stu === "all")
    .filter(({ s, I }) => (!FS.batch || s.batchId === FS.batch) && (!FS.plan || I.type === FS.plan) &&
      (!FS.st || (FS.st === "due" ? I.pending > 0 : I.status === FS.st)) && (!q || [s.name, s.sid, s.guardian, s.phone].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => b.I.pending - a.I.pending || String(a.s.name).localeCompare(String(b.s.name)));
}
function vFees() {
  const act = feeAll(), pays = DB.Fees.filter((f) => f.kind !== "skip");
  const colM = sum(pays.filter((f) => String(f.date).startsWith(curMonth())), (f) => f.amount);
  const B = sortBatches(DB.Batches);
  $("#view").innerHTML = `
  <div class="grid stats">
   <div class="glass stat"><small><i style="background:var(--ok)"></i>Collected this month</small><b>${money(colM)}</b></div>
   <div class="glass stat"><small>Total collected</small><b>${money(sum(pays, (f) => f.amount))}</b></div>
   <div class="glass stat"><small><i style="background:var(--warn)"></i>Total pending</small><b>${money(sum(act, (x) => x.I.pending))}</b></div>
   <div class="glass stat"><small><i style="background:var(--bad)"></i>Students with dues</small><b>${act.filter((x) => x.I.pending > 0).length}</b></div>
  </div>
  <div class="glass tools" style="margin-top:12px">
   <input class="in grow" id="fq2" placeholder="Search name, student ID, guardian, phone" value="${esc(FS.q)}">
   <select class="in" id="fb2"><option value="">All batches</option>${B.map((b) => `<option value="${esc(b.id)}" ${FS.batch === b.id ? "selected" : ""}>${esc(bLabel(b))}</option>`).join("")}</select>
   <select class="in" id="fp2"><option value="">All plans</option><option ${FS.plan === "Monthly" ? "selected" : ""}>Monthly</option><option ${FS.plan === "Course" ? "selected" : ""}>Course</option></select>
   <select class="in" id="fs2">${[["due", "Has dues"], ["", "All"], ["Pending", "Pending"], ["Partial", "Partial"], ["Cleared", "Cleared"]].map(([v, l]) => `<option value="${v}" ${FS.st === v ? "selected" : ""}>${l}</option>`).join("")}</select>
   <select class="in" id="fu2"><option value="Active" ${FS.stu === "Active" ? "selected" : ""}>Active students</option><option value="all" ${FS.stu === "all" ? "selected" : ""}>All students</option></select>
   <button class="btn" onclick="feeExport()">Export Excel</button>
  </div>
  <div class="glass tw"><table><thead><tr><th>Student</th><th>Batch</th><th>Plan</th><th>Fee</th><th>Paid</th><th>Pending</th><th>Clear till</th><th>Status</th><th></th></tr></thead><tbody id="fbody"></tbody></table></div>`;
  $("#fq2").oninput = (e) => { FS.q = e.target.value; feeRows(); };
  [["fb2", "batch"], ["fp2", "plan"], ["fs2", "st"], ["fu2", "stu"]].forEach(([id, k]) => ($("#" + id).onchange = (e) => { FS[k] = e.target.value; feeRows(); }));
  feeRows();
}
function feeRows() {
  $("#fbody").innerHTML = feeList().map(({ s, I }) => {
    const b = batchOf(s);
    const clear = I.type === "Course" ? (I.status === "Cleared" ? "Fully paid" : I.pct + "% paid") : I.clear ? monthLabel(I.clear) : "None";
    return `<tr><td><b>${esc(s.name)}</b><small class="mut" style="display:block">${esc(s.sid)}</small></td>
     <td>${b ? esc(clsLabel(b.class)) + " " + esc(b.section.slice(0, 3)) + " " + t12(b.start) : "Unassigned"}</td>
     <td><span class="chip s-${I.type}">${I.type}</span></td>
     <td>${money(I.fee)}${I.type === "Monthly" ? '<small class="mut"> /mo</small>' : ""}</td>
     <td class="g">${money(I.paid)}</td><td class="${I.pending ? "r" : ""}">${money(I.pending)}</td>
     <td>${clear}${I.skipped.size ? `<small class="mut" style="display:block">${I.skipped.size} skipped</small>` : ""}</td>
     <td><span class="chip s-${I.status.replace(" ", "")}">${I.status}</span></td>
     <td style="text-align:right"><span class="ra">${icoBtn("pay", "Collect fee", `collectFee('${s.id}')`, "cash")}${icoBtn("", "Payment history", `feeHistory('${s.id}')`, "list")}${I.type === "Monthly" ? icoBtn("", "Skip a month", `skipFee('${s.id}')`, "skip") : ""}</span></td></tr>`;
  }).join("") || `<tr><td colspan="9"><div class="empty">${DB.Students.length ? "Nothing matches. Change the filters." : "No students yet."}</div></td></tr>`;
}
async function feeExport() {
  const L = feeList(); if (!L.length) { toast("Nothing to export"); return; }
  if (!(await lib("xlsx"))) { toast("Excel library failed to load. Check your internet connection."); return; }
  const rows = L.map(({ s, I }) => ({ "Student ID": s.sid, Name: s.name, Batch: batchOf(s) ? bLabel(batchOf(s)) : "", Plan: I.type, Fee: I.fee, Due: I.due, Paid: I.paid, Pending: I.pending, "Clear till": I.type === "Course" ? (I.status === "Cleared" ? "Fully paid" : I.pct + "% paid") : I.clear ? monthLabel(I.clear) : "", Status: I.status }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Fees"); XLSX.writeFile(wb, "tuition-fees.xlsx");
}

/* ----- collect a payment (monthly instalment, course fee, or partial) ----- */
function allocate(s, I, amount, only) {
  if (I.type === "Course") return amount > I.pending ? { err: `That is more than the pending ${money(I.pending)}.` } : { list: [{ month: "course", amt: amount }] };
  let left = amount; const out = [];
  for (const m of only ? [only] : monthsBetween(I.start, shiftMonth(curMonth(), 24))) {
    if (left <= 0) break;
    if (I.skipped.has(m)) continue;
    const room = I.fee - (I.paidBy[m] || 0);
    if (room <= 0) continue;
    const a = Math.min(room, left); out.push({ month: m, amt: a }); left -= a;
  }
  return left > 0 ? { err: only ? "That is more than this month still owes." : "That amount is too large." } : { list: out };
}
function nextReceipt(date) {
  const pre = `${instInitials()}${String(date).slice(2, 4)}-R-`;
  let n = 0; DB.Fees.forEach((f) => { if (String(f.rcpt).startsWith(pre)) n = Math.max(n, parseInt(String(f.rcpt).slice(pre.length), 10) || 0); });
  return pre + String(n + 1).padStart(4, "0");
}
function collectFee(id, month) {
  const s = DB.Students.find((x) => x.id === id), I = feeInfo(s);
  if (!(I.fee > 0)) { toast("Set a fee for this student first (Edit student)."); return; }
  const dues = I.rows.filter((r) => r.pend > 0), def = I.type === "Course" ? I.pending : dues.length ? dues[0].pend : I.fee;
  $("#modal").innerHTML = `<h2>Collect fee</h2>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap"><b>${esc(s.name)}</b><small class="mut">${esc(s.sid)}</small><span class="chip s-${I.type}">${I.type}</span></div>
  <div class="fsum"><div><small>${I.type === "Course" ? "Course fee" : "Due so far"}</small><b>${money(I.due)}</b></div><div><small>Paid</small><b class="g">${money(I.paid)}</b></div><div><small>Pending</small><b class="${I.pending ? "r" : "g"}">${money(I.pending)}</b></div><div><small>${I.type === "Course" ? "Progress" : "Clear till"}</small><b>${I.type === "Course" ? I.pct + "%" : I.clear ? monthLabel(I.clear) : "None"}</b></div></div>
  ${dues.length ? `<div class="pills" style="margin-bottom:12px">${dues.slice(0, 8).map((r) => `<span class="chip ${r.paid ? "s-Partial" : "s-Pending"}">${monthLabel(r.m)} ${money(r.pend)}</span>`).join("")}${dues.length > 8 ? `<span class="mut">+${dues.length - 8} more</span>` : ""}</div>` : ""}
  <div class="f">
   <label>Amount (${CUR})<input class="in" id="c_amt" type="number" min="1" value="${def}"></label>
   <label>Payment date<input class="in" id="c_date" type="date" value="${dKey(new Date())}"></label>
   ${I.type === "Monthly" ? `<label class="full">Apply to<select class="in" id="c_to"><option value="">Oldest dues first${dues.length ? "" : " (advance payment)"}</option>${dues.map((r) => `<option value="${r.m}" ${month === r.m ? "selected" : ""}>${monthLabel(r.m)} - pending ${money(r.pend)}</option>`).join("")}</select></label>` : ""}
   <label>Method<select class="in" id="c_method">${METHODS.map((m) => `<option>${m}</option>`).join("")}</select></label>
   <label>Note<input class="in" id="c_note" placeholder="Optional"></label>
  </div>
  <div class="acts" style="justify-content:space-between;flex-wrap:wrap">
   <span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${I.pending > 0 ? `<button class="btn" onclick="$('#c_amt').value=${I.pending}">Full pending ${money(I.pending)}</button>` : ""}<label class="chkline"><input type="checkbox" id="c_print" checked> Print receipt</label></span>
   <span style="display:flex;gap:8px"><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" onclick="doCollect('${s.id}')">Record payment</button></span></div>
  <p class="mut" style="font-size:12px;margin-top:8px">${I.type === "Monthly" ? "Partial payments are fine. Anything above the pending dues goes to the coming months." : "Partial payments are fine. The course is cleared when the total paid reaches the course fee."}</p>`;
  $("#modal").classList.add("wide"); $("#ov").classList.add("on");
  setTimeout(() => { $("#c_amt").focus(); $("#c_amt").select(); }, 50);
}
async function doCollect(id) {
  const s = DB.Students.find((x) => x.id === id), I = feeInfo(s), amt = Number($("#c_amt").value), date = $("#c_date").value;
  if (!(amt > 0)) { toast("Enter the amount received"); return; }
  if (!date) { toast("Choose the payment date"); return; }
  const A = allocate(s, I, amt, I.type === "Monthly" ? $("#c_to").value : "");
  if (A.err) { toast(A.err); return; }
  const rc = nextReceipt(date), method = $("#c_method").value, note = $("#c_note").value.trim();
  const win = $("#c_print").checked ? window.open("", "_blank") : null; // opened now, inside the click, so pop-up blockers allow it
  const rows = A.list.map((x) => ({ id: uid(), studentId: s.id, month: x.month, amount: String(x.amt), paid: "", date, kind: I.type === "Course" ? "course" : "monthly", method, note, rcpt: rc, batchId: s.batchId || "" }));
  DB.Fees.push(...rows); closeM(); render();
  const ok = await saveFeeRows(rows, "Payment recorded");
  if (win) { ok ? printReceipt(rc, win) : win.close(); }
}

/* ----- history, undo, skip ----- */
function feeHistory(id) {
  const s = DB.Students.find((x) => x.id === id), I = feeInfo(s);
  const L = DB.Fees.filter((f) => f.studentId === id).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.month).localeCompare(String(a.month)));
  $("#modal").innerHTML = `<h2>Payment history</h2>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap"><b>${esc(s.name)}</b><small class="mut">${esc(s.sid)}</small><span class="chip s-${I.type}">${I.type}</span><span class="chip s-${I.status.replace(" ", "")}">${I.status}</span></div>
  <div class="fsum"><div><small>Fee</small><b>${money(I.fee)}</b></div><div><small>Paid</small><b class="g">${money(I.paid)}</b></div><div><small>Pending</small><b class="${I.pending ? "r" : "g"}">${money(I.pending)}</b></div><div><small>${I.type === "Course" ? "Progress" : "Clear till"}</small><b>${I.type === "Course" ? I.pct + "%" : I.clear ? monthLabel(I.clear) : "None"}</b></div></div>
  <div class="tw" style="max-height:46vh;padding:0"><table style="min-width:520px"><thead><tr><th>Date</th><th>For</th><th>Amount</th><th>Method</th><th>Receipt</th><th></th></tr></thead><tbody>${
    L.map((f) => f.kind === "skip"
      ? `<tr><td>${esc(f.date)}</td><td>${monthLabel(f.month)} <span class="chip s-Inactive">skipped</span></td><td>-</td><td colspan="2" class="mut">${esc(f.note)}</td><td style="text-align:right"><span class="ra">${icoBtn("del", "Remove skip", `delFee('${f.id}','${id}')`, "trash")}</span></td></tr>`
      : `<tr><td>${esc(f.date)}</td><td>${f.kind === "course" ? "Course fee" : monthLabel(f.month)}</td><td class="g">${money(f.amount)}</td><td>${esc(f.method)}</td><td>${esc(f.rcpt)}</td><td style="text-align:right"><span class="ra">${f.rcpt ? icoBtn("", "Print receipt", `printReceipt('${esc(f.rcpt)}')`, "print") : ""}${icoBtn("del", "Delete this payment", `delFee('${f.id}','${id}')`, "trash")}</span></td></tr>`).join("") ||
    `<tr><td colspan="6"><div class="empty">No payments yet.</div></td></tr>`}</tbody></table></div>
  <div class="acts"><button class="btn" onclick="closeM()">Close</button><button class="btn p" onclick="collectFee('${id}')">Collect fee</button></div>`;
  $("#modal").classList.add("wide"); $("#ov").classList.add("on");
}
async function delFee(fid, sid) {
  const f = DB.Fees.find((x) => x.id === fid); if (!f) return;
  const what = f.kind === "skip" ? "this skip" : `this ${money(f.amount)} payment`;
  if (!confirm(`Remove ${what}? The student's pending amount will change.`)) return;
  DB.Fees = DB.Fees.filter((x) => x.id !== fid); render(); feeHistory(sid);
  await write("remove", { table: "Fees", id: fid }, "Removed");
}
function skipFee(id) {
  const s = DB.Students.find((x) => x.id === id), I = feeInfo(s), cur = curMonth();
  if (I.type === "Course") { toast("Skipping applies to monthly fee plans."); return; }
  const opts = monthsBetween(I.start < cur ? I.start : cur, shiftMonth(cur, 3)).filter((m) => !I.skipped.has(m) && !(I.paidBy[m] > 0));
  if (!opts.length) { toast("No months available to skip"); return; }
  const b = batchOf(s);
  $("#modal").innerHTML = `<h2>Skip a month</h2>
  <p class="mut" style="margin-bottom:10px"><b style="color:var(--tx)">${esc(s.name)}</b> will not be charged for the month you pick. Months that already have a payment can't be skipped.</p>
  <div class="f">
   <label class="full">Month<select class="in" id="k_m">${opts.map((m) => `<option value="${m}" ${m === (opts.includes(cur) ? cur : opts[opts.length - 1]) ? "selected" : ""}>${monthLabel(m)}</option>`).join("")}</select></label>
   <label class="full">Reason<input class="in" id="k_note" placeholder="e.g. Eid holidays, scholarship, absent"></label>
   ${b ? `<label class="full chkline"><input type="checkbox" id="k_all"> Apply to every active monthly student in ${esc(bLabel(b))}</label>` : ""}
  </div>
  <div class="acts"><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" onclick="doSkip('${id}')">Skip month</button></div>`;
  $("#ov").classList.add("on");
}
async function doSkip(id) {
  const s = DB.Students.find((x) => x.id === id), m = $("#k_m").value, note = $("#k_note").value.trim(), date = dKey(new Date());
  const who = $("#k_all") && $("#k_all").checked ? DB.Students.filter((x) => x.batchId === s.batchId && x.status === "Active" && x.feeType !== "Course") : [s];
  const rows = who.filter((x) => { const I = feeInfo(x); return !I.skipped.has(m) && !(I.paidBy[m] > 0); })
    .map((x) => ({ id: uid(), studentId: x.id, month: m, amount: "0", paid: "", date, kind: "skip", method: "", note, rcpt: "", batchId: x.batchId || "" }));
  if (!rows.length) { toast("Nothing to skip for that month"); return; }
  DB.Fees.push(...rows); closeM(); render();
  await saveFeeRows(rows, `${monthLabel(m)} skipped for ${rows.length} student${rows.length > 1 ? "s" : ""}`);
}

/* ----- receipt ----- */
function receiptHtml(rc) {
  const R = DB.Fees.filter((f) => f.rcpt === rc); if (!R.length) return "";
  const s = DB.Students.find((x) => x.id === R[0].studentId) || {}, b = batchOf(s), I = feeInfo(s), tot = sum(R, (r) => r.amount);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(rc)}</title><style>
   body{font:14px/1.5 system-ui,sans-serif;color:#17324d;margin:0;padding:28px}.box{max-width:560px;margin:auto;border:1px solid #c9d6e4;border-radius:12px;padding:24px}
   .h{display:flex;align-items:center;gap:12px;border-bottom:2px solid #17324d;padding-bottom:12px;margin-bottom:14px}.h img{width:54px;height:54px;border-radius:10px;object-fit:cover}
   h1{font-size:18px;margin:0}.m{color:#64809b;font-size:12px}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{padding:7px 4px;border-bottom:1px solid #e3eaf2;text-align:left}th:last-child,td:last-child{text-align:right}
   .t{font-size:16px;font-weight:700}.sig{display:flex;justify-content:space-between;margin-top:42px;color:#64809b;font-size:12px}.sig span{border-top:1px solid #9bb0c5;padding-top:4px;min-width:150px;text-align:center}
   @media print{body{padding:0}.box{border:0}}</style></head><body><div class="box">
   <div class="h">${ME.logo ? `<img src="${esc(ME.logo)}">` : ""}<div><h1>${esc(ME.name || "TuitionPro")}</h1><div class="m">${esc([ME.address, ME.phone].filter(Boolean).join(" | "))}</div></div><div style="margin-left:auto;text-align:right"><b>FEE RECEIPT</b><div class="m">${esc(rc)}<br>${esc(R[0].date)}</div></div></div>
   <div><b>${esc(s.name)}</b> <span class="m">(${esc(s.sid)})</span><div class="m">${b ? esc(bLabel(b)) : ""}</div></div>
   <table><thead><tr><th>For</th><th>Amount</th></tr></thead><tbody>${R.map((r) => `<tr><td>${r.kind === "course" ? "Course fee" : monthLabel(r.month) + " tuition fee"}</td><td>${money(r.amount)}</td></tr>`).join("")}
   <tr><td class="t">Total received (${esc(R[0].method)})</td><td class="t">${money(tot)}</td></tr></tbody></table>
   ${R[0].note ? `<div class="m">Note: ${esc(R[0].note)}</div>` : ""}
   <div class="m">${I.pending > 0 ? `Balance pending: ${money(I.pending)}` : "No balance pending"}${I.type === "Monthly" && I.clear ? ` | Cleared till ${monthLabel(I.clear)}` : ""}</div>
   <div class="sig"><span>Guardian</span><span>Received by</span></div></div></body></html>`;
}
function printReceipt(rc, win) {
  win = win || window.open("", "_blank");
  if (!win) { toast("Allow pop-ups to print receipts"); return; }
  win.document.open(); win.document.write(receiptHtml(rc)); win.document.close(); win.focus();
  setTimeout(() => win.print(), 350);
}

/* ============ PROFILE ============ */
const PF = [
  ["name", "Institute or trainer name", "full"],
  ["email", "Email", ""],
  ["phone", "Phone", ""],
  ["speciality", "Speciality", ""],
  ["address", "Address", "full"],
  ["trainers", "Trainer details", "full ta"],
  ["services", "Services offered", "full ta"],
];
function vProfile() {
  $("#view").innerHTML = `<div class="prof">
  <div class="glass pad"><h3>Your details</h3>
   <div class="pics">
    <div class="pic"><div class="av">${ME.photo ? img(ME.photo, "Profile") : init(ME.name)}</div><div><small>Profile photo</small><button class="btn" onclick="pickImg('photo')">Choose photo</button></div></div>
    <div class="pic"><div class="logo">${ME.logo ? img(ME.logo, "Logo") : init(ME.name)}</div><div><small>Institute logo</small><button class="btn" onclick="pickImg('logo')">Choose logo</button></div></div>
   </div>
   <div class="f">${PF.map(([k, l, c]) => `<label class="${c.includes("full") ? "full" : ""}">${l}${c.includes("ta") ? `<textarea class="in ta" id="p_${k}">${esc(ME[k])}</textarea>` : `<input class="in" id="p_${k}" value="${esc(ME[k])}">`}</label>`).join("")}</div>
   <div class="acts"><button class="btn p" onclick="saveProfile()">Save profile</button></div></div>
  <div class="glass pad" style="align-self:start"><h3>Change password</h3>
   <div class="f"><label class="full">Current password<input class="in" id="pw0" type="password" autocomplete="current-password"></label>
   <label class="full">New password (6+ characters)<input class="in" id="pw1" type="password" autocomplete="new-password"></label></div>
   <div class="acts"><button class="btn p" onclick="changePw()">Update password</button></div>
   <p class="mut" style="margin-top:10px;font-size:12px">Signed in as <b>@${esc(ME.id)}</b>. Your students and records are visible only to this ID.</p></div></div>`;
}
async function saveFields(fields, msg) {
  Object.assign(ME, fields);
  applyMe();
  if (route === "profile") vProfile();
  return write("profile", { fields }, msg);
}
function saveProfile() {
  const f = {};
  PF.forEach(([k]) => (f[k] = $("#p_" + k).value.trim()));
  if (!f.name) {
    toast("Enter a name");
    return;
  }
  saveFields(f, "Profile saved");
}
async function changePw() {
  if (!API_URL) {
    toast("Passwords apply when connected to Apps Script");
    return;
  }
  if (!$("#pw1").value) {
    toast("Enter a new password");
    return;
  }
  if (
    await write(
      "profile",
      {
        fields: {},
        oldPassword: $("#pw0").value,
        newPassword: $("#pw1").value,
      },
      "Password updated",
    )
  ) {
    $("#pw0").value = $("#pw1").value = "";
  }
}
function pickImg(t) {
  imgT = t;
  $("#imgFile").click();
}
$("#imgFile").onchange = (e) => {
  // shrink to 192px so it fits in a sheet cell
  const f = e.target.files[0];
  if (!f) return;
  const im = new Image();
  im.onload = () => {
    const c = document.createElement("canvas");
    c.width = c.height = 192;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, 192, 192);
    if (imgT === "photo") {
      const m = Math.min(im.width, im.height);
      x.drawImage(
        im,
        (im.width - m) / 2,
        (im.height - m) / 2,
        m,
        m,
        0,
        0,
        192,
        192,
      );
    } else {
      const k = Math.min(192 / im.width, 192 / im.height),
        w = im.width * k,
        h = im.height * k;
      x.drawImage(im, (192 - w) / 2, (192 - h) / 2, w, h);
    }
    saveFields(
      { [imgT]: c.toDataURL("image/jpeg", 0.85) },
      imgT === "logo" ? "Logo updated" : "Photo updated",
    );
  };
  im.src = URL.createObjectURL(f);
  e.target.value = "";
};

/* ============ MASTER ADMIN PANEL ============ */
const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");
function vAdmin() {
  if (!API_URL) { $("#view").innerHTML = `<div class="glass pad empty">The admin panel works once the app is connected to Apps Script (set API_URL in config.js).</div>`; return; }
  const U = ADMIN.users, Pn = U.filter((x) => x.status === "pending"), O = U.filter((x) => x.status !== "pending");
  $("#view").innerHTML = `<div class="prof">
  <div class="glass pad" style="grid-column:1/-1"><h3>Sign-up requests (${Pn.length})</h3><div class="rows">${
    Pn.map((x) => `<div class="acc glass"><div class="av">${init(x.name)}</div>
     <div style="flex:1;min-width:0"><b>${esc(x.name)}</b> <small class="mut">@${esc(x.id)}</small><br><small class="mut">${esc(x.email)} · requested ${when(x.created)}</small></div>
     <button class="btn p" onclick="approveU('${esc(x.id)}')">Approve</button><button class="btn d" onclick="rejectU('${esc(x.id)}')">Reject</button></div>`).join("") ||
    '<div class="empty">No pending requests.</div>'}</div></div>
  <div class="glass pad" style="align-self:start"><h3>Create a user</h3><div class="f">
   <label class="full">Institute or trainer name<input class="in" id="a_name"></label>
   <label>Login ID<input class="in" id="a_id" autocapitalize="none"></label>
   <label>Password<input class="in" id="a_pw" type="text" autocomplete="off"></label>
   <label class="full">Email (optional, sends a notice)<input class="in" id="a_email" type="email"></label></div>
   <p class="mut" style="font-size:12px;margin-top:8px">A fresh, empty workspace is created in its own Drive folder.</p>
   <div class="acts"><button class="btn p" onclick="createU()">Create user</button></div></div>
  <div class="glass pad"><h3>All users (${O.length})</h3><div class="rows">${
    O.map((x) => `<div class="acc glass"><div class="av">${init(x.name)}</div>
     <div style="flex:1;min-width:0"><b>${esc(x.name)}</b><br><small class="mut">@${esc(x.id)}</small></div><span class="chip s-${esc(x.status)}">${esc(x.status)}</span>
     <span class="ra">${icoBtn("", "Reset password", `resetU('${esc(x.id)}')`, "key")}${icoBtn("del", "Remove user", `removeU('${esc(x.id)}')`, "trash")}</span></div>`).join("") ||
    '<div class="empty">No users yet.</div>'}</div></div></div>`;
}
const approveU = (id) => adminDo("approve", { id }, "Approved and workspace created");
function rejectU(id) { const r = prompt("Reason for rejecting (optional, included in the email)"); if (r !== null) adminDo("reject", { id, reason: r }, "Request rejected"); }
async function createU() {
  const ok = await adminDo("createUser", { id: $("#a_id").value, name: $("#a_name").value, pw: $("#a_pw").value, email: $("#a_email").value }, "User created");
  if (ok) vAdmin();
}
function resetU(id) { const pw = prompt(`New password for @${id} (6+ characters)`); if (pw) adminDo("resetPassword", { id, pw }, "Password reset"); }
function removeU(id) { if (confirm(`Remove @${id}? They can no longer sign in. Their Drive folder and data are kept.`)) adminDo("removeUser", { id }, "User removed"); }

function vSoon() {
  const t = {
    attendance: [
      "Daily attendance by class and batch with one-tap Present / Absent / Late",
      "Color-coded status and monthly reports",
    ],
    fees: [
      "Monthly tuition collection, dues and receipts",
      "Paid / Partial / Due colors and printable receipts",
    ],
    results: [
      "Exam marks entry, grades and GPA",
      "Printable mark sheets and merit lists",
    ],
  }[route];
  $("#view").innerHTML =
    `<div class="glass pad empty"><h3 style="font-size:16px;color:var(--tx)">${VIEWS[route]} comes in the next step</h3><p>${t[0]}.</p><p>${t[1]}.</p></div>`;
}

/* ============ RESULTS ============
   Exam  = one row in Exams (subject, chapters, date, batch, and which of the 4 parts it has + full marks of each)
   Result = one row per student per exam (raw marks of each part). Totals / % / grade / GPA are always
   recalculated from the exam setup, so changing an exam's setup instantly re-grades every student. */
const GRADES = [[80, "A+", 5], [70, "A", 4], [60, "A-", 3.5], [50, "B", 3], [40, "C", 2], [33, "D", 1], [0, "F", 0]];
const GRANGE = ["80 – 100", "70 – 79", "60 – 69", "50 – 59", "40 – 49", "33 – 39", "0 – 32"];
const PARTS = [["w", "Written", "wf"], ["m", "MCQ", "mf"], ["p", "Practical", "pf"], ["v", "Viva-Voce", "vf"]];
const SUBJECTS = ["Bangla", "English", "Mathematics", "General Math", "Higher Math", "Physics", "Chemistry", "Biology", "ICT", "Science", "Social Science", "Religion", "Accounting", "Finance", "Economics"];
const EXAM_NAMES = ["Class Test", "Weekly Test", "Monthly Test", "Model Test", "Mid Term", "Half-Yearly", "Pre-Test", "Final Exam"];
const LH_CHUNK = 45000, LH_MAX = LH_CHUNK * 4; // a sheet cell holds 50,000 characters, so the letterhead is stored in 4 pieces
const RS = { tab: "exams", exam: "", q: "", batch: "", subj: "", vals: {}, dirty: new Set(), stu: "", sBatch: "", sSubj: "", from: "", to: "" };
let RIX = {};

const gradeOf = (pct) => { const g = GRADES.find((x) => pct >= x[0]) || GRADES[6]; return { grade: g[1], gpa: g[2] }; };
const gcls = (g) => "gr-" + String(g).replace("+", "p").replace("-", "m");
const nf = (n) => String(+Number(n).toFixed(2));
const g2 = (n) => Number(n).toFixed(2);
const fmtD = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? dateObj(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : esc(s || ""));
const examParts = (e) => PARTS.filter(([, , f]) => Number(e[f]) > 0).map(([k, l, f]) => ({ k, l, full: Number(e[f]) }));
const examFull = (e) => sum(examParts(e), (p) => p.full);
const partsTxt = (e) => examParts(e).map((p) => `${p.l} ${nf(p.full)}`).join(" + ");
const rix = () => { RIX = {}; DB.Results.forEach((r) => ((RIX[r.examId] = RIX[r.examId] || {})[r.studentId] = r)); };
const batchTxt = (e) => { const b = DB.Batches.find((x) => x.id === e.batchId); return b ? `${clsLabel(b.class)} · ${bLabel(b)}` : "Deleted batch"; };
const isAbs = (r) => r && (r.absent === "1" || r.absent === 1 || r.absent === true);
const POS = ["", "1st", "2nd", "3rd", "4th", "5th"];
const gchip = (c) => c.grade ? `<span class="chip ${gcls(c.grade)}">${esc(c.grade)}</span>` : "";
const stchip = (c) => {
  const m = { Pass: ["s-Present", "Pass"], Fail: ["s-Absent", c.failed && c.failed.length ? "Fail (" + c.failed.join(", ") + ")" : "Fail"], Absent: ["s-Inactive", "Absent"], Incomplete: ["s-Partial", "Incomplete"], Invalid: ["s-Absent", "Check marks"], Pending: ["s-Inactive", "Not entered"] }[c.st];
  return `<span class="chip ${m[0]}">${esc(m[1])}</span>`;
};

// ----- the marking engine: raw marks -> total, %, grade, GPA -----
function calcRes(e, r) {
  const P = examParts(e), full = examFull(e);
  if (!r) return { st: "Pending", P, full };
  if (isAbs(r)) return { st: "Absent", P, full };
  const got = P.map((p) => { const v = r[p.k]; return v === "" || v == null || isNaN(Number(v)) ? null : Number(v); });
  const filled = got.filter((x) => x !== null).length;
  if (!filled) return { st: "Pending", P, full };
  if (got.some((x, i) => x !== null && (x < 0 || x > P[i].full))) return { st: "Invalid", P, full };
  if (filled < P.length) return { st: "Incomplete", P, full, got };
  const total = sum(got, (x) => x), pct = full ? Math.round((total / full) * 10000) / 100 : 0;
  let g = gradeOf(pct); const failed = [];
  if (e.eachPass === "1" && P.length > 1) P.forEach((p, i) => { if (got[i] < p.full * 0.33) failed.push(p.l); });
  if (failed.length) g = { grade: "F", gpa: 0 };
  return { st: g.gpa > 0 ? "Pass" : "Fail", P, full, got, total, pct, grade: g.grade, gpa: g.gpa, failed };
}
function examRoster(e) {
  const ids = new Set(DB.Students.filter((s) => s.batchId === e.batchId && s.status === "Active").map((s) => s.id));
  Object.keys(RIX[e.id] || {}).forEach((id) => ids.add(id));
  return [...ids].map((id) => DB.Students.find((s) => s.id === id)).filter(Boolean).sort((a, b) => String(a.sid).localeCompare(String(b.sid)));
}
// Calculates every student of an exam + merit positions + class statistics. getRow(studentId) gives the raw marks.
function examTable(e, getRow) {
  const L = examRoster(e).map((s) => ({ s, c: calcRes(e, getRow(s.id)), rank: 0 }));
  const done = L.filter((x) => x.c.st === "Pass" || x.c.st === "Fail"), pass = done.filter((x) => x.c.st === "Pass");
  [...pass].sort((a, b) => b.c.total - a.c.total).forEach((x, i, A) => (x.rank = i && x.c.total === A[i - 1].c.total ? A[i - 1].rank : i + 1));
  L.forEach((x) => { if (x.rank > 5) x.rank = 0; }); // only the first 5 positions are awarded
  const dist = {}; GRADES.forEach((g) => (dist[g[1]] = 0)); done.forEach((x) => dist[x.c.grade]++);
  const st = {
    all: L.length, appeared: done.length, passed: pass.length, failed: done.length - pass.length,
    absent: L.filter((x) => x.c.st === "Absent").length, entered: L.filter((x) => x.c.st !== "Pending").length,
    rate: done.length ? (pass.length / done.length) * 100 : null, avg: done.length ? sum(done, (x) => x.c.total) / done.length : null,
    avgPct: done.length ? sum(done, (x) => x.c.pct) / done.length : null, hi: done.length ? Math.max(...done.map((x) => x.c.total)) : null,
    lo: done.length ? Math.min(...done.map((x) => x.c.total)) : null, gpa: done.length ? sum(done, (x) => x.c.gpa) / done.length : null, dist,
  };
  return { L, st };
}
const subjList = () => [...new Set([...SUBJECTS, ...DB.Exams.map((e) => e.subject).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
const rsGuard = () => { if (!RS.dirty.size) return true; if (!confirm("You have unsaved marks. Discard them?")) return false; RS.dirty.clear(); return true; };
window.addEventListener("beforeunload", (e) => { if (RS.dirty.size) { e.preventDefault(); e.returnValue = ""; } });

/* ----- page shell ----- */
function vResults() {
  if (!DB.Batches.length) { $("#view").innerHTML = `<div class="glass pad empty">Create a class and batch first, then you can create exams and publish results.<br><br><button class="btn p" onclick="editBatch()">Add Class/Batch</button></div>`; return; }
  rix();
  if (RS.exam && !DB.Exams.some((e) => e.id === RS.exam)) RS.exam = "";
  const t = RS.tab, sheet = t === "exams" && RS.exam;
  $("#view").innerHTML = `<div class="glass tools">
   <div class="tabs"><button class="${t === "exams" ? "on" : ""}" onclick="rsTab('exams')">Exams</button><button class="${t === "stu" ? "on" : ""}" onclick="rsTab('stu')">Student history</button></div>
   <span style="flex:1"></span>
   <button class="btn" onclick="lhModal()">${letterhead() ? "Letterhead ✓" : "Letterhead"}</button>
   ${t === "exams" && !sheet ? `<button class="btn p" onclick="editExam()"><b>+</b> New exam</button>` : ""}
  </div><div id="rs_body"></div>`;
  sheet ? rsSheet() : t === "exams" ? rsExams() : rsHistory();
}
function rsTab(t) { if (!rsGuard()) return; RS.tab = t; RS.exam = ""; vResults(); }

/* ----- exam list ----- */
function rsExams() {
  const q = RS.q.toLowerCase(), E = DB.Exams.map((e) => ({ e, T: examTable(e, (sid) => (RIX[e.id] || {})[sid]) }));
  const done = E.flatMap(({ T }) => T.L.filter((x) => x.c.st === "Pass" || x.c.st === "Fail"));
  const L = E.filter(({ e }) => (!RS.batch || e.batchId === RS.batch) && (!RS.subj || e.subject === RS.subj) && (!q || [e.name, e.type, e.subject, e.chapters].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => String(b.e.date).localeCompare(String(a.e.date)) || String(a.e.name).localeCompare(b.e.name));
  $("#rs_body").innerHTML = `
  <div class="grid stats">
   <div class="glass stat"><small>Exams</small><b>${DB.Exams.length}</b></div>
   <div class="glass stat"><small>Results entered</small><b>${done.length}</b></div>
   <div class="glass stat"><small><i style="background:var(--ok)"></i>Pass rate</small><b>${done.length ? Math.round((done.filter((x) => x.c.st === "Pass").length / done.length) * 100) + "%" : "–"}</b></div>
   <div class="glass stat"><small>Average GPA</small><b>${done.length ? g2(sum(done, (x) => x.c.gpa) / done.length) : "–"}</b></div>
  </div>
  <div class="glass tools" style="margin-top:12px">
   <input class="in grow" id="rq" placeholder="Search exam, subject or chapter" value="${esc(RS.q)}">
   <select class="in" id="rb"><option value="">All batches</option>${sortBatches(DB.Batches).map((b) => `<option value="${esc(b.id)}" ${RS.batch === b.id ? "selected" : ""}>${esc(clsLabel(b.class) + " · " + bLabel(b))}</option>`).join("")}</select>
   <select class="in" id="rsu"><option value="">All subjects</option>${subjList().filter((s) => DB.Exams.some((e) => e.subject === s)).map((s) => `<option ${RS.subj === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>
  </div>
  <div class="glass tw"><table><thead><tr><th>Date</th><th>Exam</th><th>Subject</th><th>Class / Batch</th><th>Parts</th><th>Full</th><th>Entered</th><th>Pass rate</th><th>Avg %</th><th></th></tr></thead><tbody>${
    L.map(({ e, T }) => `<tr class="clk" onclick="rsOpen('${e.id}')" title="Open marks sheet"><td>${fmtD(e.date)}</td><td><b>${esc(e.name)}</b><small class="mut" style="display:block">${esc([e.type, e.chapters].filter(Boolean).join(" · "))}</small></td><td>${esc(e.subject)}</td><td>${esc(batchTxt(e))}</td>
     <td>${examParts(e).map((p) => `<span class="chip s-Inactive">${p.l[0] === "V" ? "Viva" : p.l} ${nf(p.full)}</span>`).join(" ")}</td><td><b>${nf(examFull(e))}</b></td>
     <td>${T.st.entered}/${T.st.all}</td><td>${T.st.rate === null ? "–" : Math.round(T.st.rate) + "%"}</td><td>${T.st.avgPct === null ? "–" : nf(T.st.avgPct) + "%"}</td>
     <td style="text-align:right"><span class="ra">${icoBtn("", "Enter / view marks", `rsOpen('${e.id}')`, "list")}${icoBtn("", "Export PDF", `rsExamPdf('${e.id}')`, "print")}${icoBtn("", "Edit exam", `editExam('${e.id}')`, "edit")}${icoBtn("del", "Delete exam", `delExam('${e.id}')`, "trash")}</span></td></tr>`).join("") ||
    `<tr><td colspan="10"><div class="empty">${DB.Exams.length ? "No exams match your filters." : "No exams yet. Use <b>New exam</b> to create one, then enter marks."}</div></td></tr>`}</tbody></table></div>`;
  $("#rq").oninput = (e) => { RS.q = e.target.value; rsExams(); const i = $("#rq"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
  $("#rb").onchange = (e) => { RS.batch = e.target.value; rsExams(); };
  $("#rsu").onchange = (e) => { RS.subj = e.target.value; rsExams(); };
}

/* ----- create / edit exam ----- */
function editExam(id) {
  const e = DB.Exams.find((x) => x.id === id), B = sortBatches(DB.Batches);
  const defB = e ? e.batchId : RS.batch || (B.find((b) => b.id === F.batch) || {}).id || "";
  const on = (k, f) => (e ? Number(e[f]) > 0 : k === "w");
  $("#modal").innerHTML = `<h2>${e ? "Edit exam" : "New exam"}</h2>
  <div class="f">
   <label>Exam name<input class="in" id="x_name" autocomplete="off" placeholder="Type the exam name" value="${esc(e ? e.name : "")}"></label>
   <label>Subject<input class="in" id="x_subj" autocomplete="off" placeholder="Type the subject" value="${esc(e ? e.subject : "")}"></label>
   <label class="full">Exam type<select class="in" id="x_type"><option value="">Select exam type</option>${EXAM_NAMES.map((n) => `<option ${e && e.type === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
   <label class="full">Chapters covered<input class="in" id="x_chap" placeholder="e.g. Chapter 1-3, 5" value="${esc(e ? e.chapters : "")}"></label>
   <label>Date<input class="in" id="x_date" type="date" value="${esc(e ? e.date : dKey(new Date()))}"></label>
   <label>Class &amp; Batch<select class="in" id="x_batch"><option value="">Select class &amp; batch</option>${B.map((b) => `<option value="${esc(b.id)}" ${defB === b.id ? "selected" : ""}>${esc(clsLabel(b.class) + " · " + bLabel(b))}</option>`).join("")}</select></label>
   <div class="full"><div class="lbl">Exam parts: use one, or combine several. Full marks of each part:</div>
    <div class="parts">${PARTS.map(([k, l, f]) => `<div class="part"><label class="chkline"><input type="checkbox" id="x_${k}_on" ${on(k, f) ? "checked" : ""} onchange="xCalc()"> ${l}</label><input class="in" type="number" min="0" step="any" id="x_${k}" placeholder="Full marks" value="${e && Number(e[f]) > 0 ? esc(e[f]) : k === "w" && !e ? 100 : ""}" oninput="xCalc()"></div>`).join("")}</div></div>
   <div class="full fsum" style="grid-template-columns:1fr 1fr"><div><small>Total full marks</small><b id="x_tot">0</b></div><div><small>Pass mark (33%)</small><b id="x_pass">0</b></div></div>
   <label class="full chkline" id="x_eachw"><input type="checkbox" id="x_each" ${e && e.eachPass === "1" ? "checked" : ""}> Student must also pass every part (33% of that part). Failing any part gives grade F.</label>
  </div>
  <div class="acts"><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" onclick="saveExam('${e ? e.id : ""}')">${e ? "Save changes" : "Create exam"}</button></div>`;
  $("#modal").classList.add("wide");
  xCalc();
  $("#ov").classList.add("on");
  setTimeout(() => $("#x_name").focus(), 50);
}
function xCalc() {
  let n = 0, c = 0;
  PARTS.forEach(([k]) => { const on = $("#x_" + k + "_on").checked, i = $("#x_" + k); i.disabled = !on; if (on) { c++; n += Number(i.value) || 0; } });
  $("#x_tot").textContent = nf(n); $("#x_pass").textContent = nf(n * 0.33);
  $("#x_eachw").style.display = c > 1 ? "" : "none";
}
async function saveExam(id) {
  const g = (k) => $("#x_" + k).value.trim(), old = DB.Exams.find((x) => x.id === id);
  if (!g("name")) { toast("Enter the exam name"); return; }
  if (!g("subj")) { toast("Enter the subject"); return; }
  if (!g("type")) { toast("Choose the exam type"); return; }
  if (!g("date")) { toast("Choose the exam date"); return; }
  if (!g("batch")) { toast("Choose the class and batch"); return; }
  const row = { id: id || uid(), name: g("name"), subject: g("subj"), type: g("type"), chapters: g("chap"), date: g("date"), batchId: g("batch"), eachPass: "", created: old ? old.created : new Date().toISOString() };
  let n = 0, c = 0;
  for (const [k, , f] of PARTS) {
    const on = $("#x_" + k + "_on").checked, v = Number(g(k));
    if (on && !(v > 0)) { toast("Enter full marks for every selected part"); return; }
    row[f] = on ? String(v) : ""; if (on) { n += v; c++; }
  }
  if (!c) { toast("Select at least one exam part"); return; }
  row.full = String(n); row.eachPass = c > 1 && $("#x_each").checked ? "1" : "";
  if (old) {
    const lost = PARTS.filter(([, , f]) => Number(old[f]) > 0 && !(Number(row[f]) > 0)).map((p) => p[1]);
    if (lost.length && DB.Results.some((r) => r.examId === id) && !confirm(`Removing ${lost.join(", ")} will ignore its saved marks. Continue?`)) return;
    Object.assign(old, row);
  } else DB.Exams.push(row);
  closeM(); render();
  await write("save", { table: "Exams", row }, old ? "Exam updated" : "Exam created");
}
function delExam(id) {
  const e = DB.Exams.find((x) => x.id === id); if (!e) return;
  const n = DB.Results.filter((r) => r.examId === id).length;
  if (!confirm(`Delete "${e.name} - ${e.subject}"${n ? ` and its ${n} saved result${n > 1 ? "s" : ""}` : ""}? This cannot be undone.`)) return;
  DB.Exams = DB.Exams.filter((x) => x.id !== id); DB.Results = DB.Results.filter((r) => r.examId !== id);
  if (RS.exam === id) { RS.exam = ""; RS.dirty.clear(); }
  render();
  write("remove", { table: "Exams", id }, "").then((ok) => ok && write("removeWhere", { table: "Results", field: "examId", value: id }, "Exam deleted"));
}

/* ----- marks entry sheet for one exam ----- */
function rsOpen(id) { RS.exam = id; RS.tab = "exams"; RS.dirty.clear(); rsLoad(); vResults(); }
function rsLoad() {
  const e = DB.Exams.find((x) => x.id === RS.exam); RS.vals = {};
  examRoster(e).forEach((s) => { const r = (RIX[e.id] || {})[s.id] || {}; RS.vals[s.id] = { w: String(r.w ?? ""), m: String(r.m ?? ""), p: String(r.p ?? ""), v: String(r.v ?? ""), absent: isAbs(r) ? "1" : "" }; });
}
function rsSheet() {
  const e = DB.Exams.find((x) => x.id === RS.exam), P = examParts(e);
  if (!Object.keys(RS.vals).length) rsLoad();
  const T = examTable(e, (sid) => RS.vals[sid]);
  $("#rs_body").innerHTML = `
  <div class="glass pad" style="margin-bottom:12px">
   <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
    <div style="flex:1;min-width:220px"><h3 style="font-size:17px;margin-bottom:2px">${esc(e.name)} <span class="mut" style="font-weight:500">· ${esc(e.subject)}</span></h3>
     <div class="mut" style="font-size:12.5px">${esc(batchTxt(e))} · ${fmtD(e.date)}${e.chapters ? " · " + esc(e.chapters) : ""}</div>
     <div class="pills" style="margin-top:8px">${e.type ? `<span class="chip s-Suspended">${esc(e.type)}</span>` : ""}<span class="chip s-Active">Full marks ${nf(examFull(e))}</span><span class="chip s-Inactive">${esc(partsTxt(e))}</span>${e.eachPass === "1" ? '<span class="chip s-Suspended">Pass each part</span>' : ""}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="rsBack()">← Exams</button><button class="btn" onclick="editExam('${e.id}')">Edit exam</button><button class="btn" onclick="rsExamPdf('${e.id}')">Export PDF</button><button class="btn p" id="rs_save" onclick="rsSave()" disabled>Save marks</button></div>
   </div></div>
  <div class="rss" id="rs_stats"></div>
  <div class="glass tw"><table style="min-width:${560 + P.length * 90}px"><thead><tr><th>Position</th><th>Student</th>${P.map((p) => `<th>${p.l}<small style="display:block;font-weight:500">out of ${nf(p.full)}</small></th>`).join("")}<th>Absent</th><th>Total<small style="display:block;font-weight:500">out of ${nf(examFull(e))}</small></th><th>%</th><th>Grade</th><th>GPA</th><th>Result</th></tr></thead><tbody>${
    T.L.map(({ s }) => { const v = RS.vals[s.id];
      return `<tr data-s="${s.id}"><td class="rk"></td><td><b>${esc(s.name)}</b><small class="mut" style="display:block">${esc(s.sid)}</small></td>${
        P.map((p) => `<td><input class="in mk" type="number" step="any" min="0" max="${p.full}" inputmode="decimal" data-s="${s.id}" data-k="${p.k}" value="${esc(v[p.k])}" oninput="rsIn(this)" onkeydown="rsKey(event)"></td>`).join("")}
       <td><input type="checkbox" class="ab" data-s="${s.id}" data-k="absent" ${v.absent ? "checked" : ""} onchange="rsIn(this)" style="accent-color:var(--bad);width:17px;height:17px"></td>
       <td class="tt"></td><td class="pc"></td><td class="gd"></td><td class="gp"></td><td class="stt"></td></tr>`; }).join("") ||
    `<tr><td colspan="${P.length + 7}"><div class="empty">No active students in this batch yet.</div></td></tr>`}</tbody></table></div>
  <p class="mut" style="font-size:12px;margin:8px 2px">Position (1st to 5th) goes to the five highest totals among passed students; equal totals share a position. Leave a student blank to enter later. Grading: 80+ A+ (5.00), 70 A (4.00), 60 A- (3.50), 50 B (3.00), 40 C (2.00), 33 D (1.00), below 33 F (0.00).</p>`;
  rsPaint();
}
function rsPaint() {
  const e = DB.Exams.find((x) => x.id === RS.exam); if (!e) return;
  const T = examTable(e, (sid) => RS.vals[sid]), P = examParts(e);
  T.L.forEach(({ s, c, rank }) => {
    const tr = document.querySelector(`tr[data-s="${s.id}"]`); if (!tr) return;
    const set = (cl, h) => { const el = tr.querySelector("." + cl); if (el) el.innerHTML = h; };
    const has = c.st === "Pass" || c.st === "Fail";
    set("rk", c.st === "Pass" && rank ? `<b>${POS[rank]}</b>` : "–"); set("tt", has ? `<b>${nf(c.total)}</b>` : ""); set("pc", has ? nf(c.pct) : "");
    set("gd", has ? gchip(c) : ""); set("gp", has ? g2(c.gpa) : ""); set("stt", stchip(c));
    const ab = RS.vals[s.id].absent === "1";
    tr.querySelectorAll("input.mk").forEach((i) => { i.disabled = ab; const p = P.find((x) => x.k === i.dataset.k), n = Number(i.value); i.classList.toggle("bad", i.value !== "" && (isNaN(n) || n < 0 || n > p.full)); });
  });
  const S = T.st, cell = (l, v, cl) => `<div><small>${l}</small><b class="${cl || ""}">${v}</b></div>`;
  $("#rs_stats").innerHTML = [cell("Appeared", `${S.appeared}<small class="mut"> / ${S.all}</small>`), cell("Passed", S.passed, "g"), cell("Failed", S.failed, S.failed ? "r" : ""), cell("Absent", S.absent),
    cell("Pass rate", S.rate === null ? "–" : Math.round(S.rate) + "%"), cell("Average", S.avg === null ? "–" : nf(S.avg)), cell("Highest", S.hi === null ? "–" : nf(S.hi)), cell("Avg GPA", S.gpa === null ? "–" : g2(S.gpa))].join("");
  const sv = $("#rs_save"); if (sv) sv.disabled = !RS.dirty.size;
}
function rsIn(el) {
  const v = RS.vals[el.dataset.s]; if (!v) return;
  if (el.dataset.k === "absent") v.absent = el.checked ? "1" : ""; else v[el.dataset.k] = el.value.trim();
  RS.dirty.add(el.dataset.s); rsPaint();
}
function rsKey(ev) {
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  const el = ev.target; let n = el.closest("tr").nextElementSibling;
  while (n) { const i = n.querySelector(`input[data-k="${el.dataset.k}"]:not(:disabled)`); if (i) { i.focus(); i.select(); return; } n = n.nextElementSibling; }
}
function rsBack() { if (!rsGuard()) return; RS.exam = ""; vResults(); }
async function rsSave() {
  const e = DB.Exams.find((x) => x.id === RS.exam); if (!e || !RS.dirty.size) return;
  const rows = [], gone = [];
  for (const sid of RS.dirty) {
    const v = RS.vals[sid], c = calcRes(e, v), id = e.id + "_" + sid;
    if (c.st === "Invalid") { toast("Some marks are higher than the full marks of that part"); return; }
    if (!v.absent && !PARTS.some(([k]) => v[k] !== "")) { if (DB.Results.some((r) => r.id === id)) gone.push(id); continue; }
    const ab = v.absent === "1", keep = (k) => (ab ? "" : v[k]);
    rows.push({ id, examId: e.id, studentId: sid, w: keep("w"), m: keep("m"), p: keep("p"), v: keep("v"), absent: ab ? "1" : "",
      total: c.total === undefined ? "" : String(c.total), pct: c.pct === undefined ? "" : String(c.pct), grade: ab ? "AB" : c.grade || "", gpa: c.gpa === undefined ? "" : String(c.gpa) });
  }
  DB.Results = DB.Results.filter((r) => !rows.some((x) => x.id === r.id) && !gone.includes(r.id)).concat(rows);
  RS.dirty.clear(); rix(); rsPaint();
  let ok = true;
  for (let i = 0; ok && i < rows.length; i += 200) ok = await write("saveMany", { table: "Results", rows: rows.slice(i, i + 200), upsert: true }, "");
  for (const id of gone) { if (!ok) break; ok = await write("remove", { table: "Results", id }, ""); }
  if (ok) toast("Marks saved");
}

/* ----- student history: every exam, current and previous ----- */
function histData() {
  const E = {}; DB.Exams.forEach((e) => (E[e.id] = e));
  const L = [];
  DB.Results.forEach((r) => {
    const e = E[r.examId]; if (r.studentId !== RS.stu || !e) return;
    if ((RS.sSubj && e.subject !== RS.sSubj) || (RS.from && e.date < RS.from) || (RS.to && e.date > RS.to)) return;
    L.push({ e, c: calcRes(e, r) });
  });
  L.sort((a, b) => String(b.e.date).localeCompare(String(a.e.date)) || String(a.e.name).localeCompare(b.e.name));
  const done = L.filter((x) => x.c.st === "Pass" || x.c.st === "Fail"), by = {};
  done.forEach((x) => (by[x.e.subject] = by[x.e.subject] || []).push(x));
  const subs = Object.entries(by).map(([sub, A]) => ({ sub, n: A.length, avg: sum(A, (x) => x.c.pct) / A.length, gpa: sum(A, (x) => x.c.gpa) / A.length })).sort((a, b) => a.sub.localeCompare(b.sub));
  return { L, done, subs, cgpa: done.length ? sum(done, (x) => x.c.gpa) / done.length : null, avg: done.length ? sum(done, (x) => x.c.pct) / done.length : null,
    pass: done.filter((x) => x.c.st === "Pass").length, absent: L.filter((x) => x.c.st === "Absent").length };
}
function rsHistory() {
  const S = DB.Students.filter((s) => !RS.sBatch || s.batchId === RS.sBatch).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  if (RS.stu && !DB.Students.some((s) => s.id === RS.stu)) RS.stu = "";
  $("#rs_body").innerHTML = `<div class="glass tools">
   <select class="in" id="hb"><option value="">All batches</option>${sortBatches(DB.Batches).map((b) => `<option value="${esc(b.id)}" ${RS.sBatch === b.id ? "selected" : ""}>${esc(clsLabel(b.class) + " · " + bLabel(b))}</option>`).join("")}</select>
   <select class="in grow" id="hs"><option value="">Select a student</option>${S.map((s) => `<option value="${esc(s.id)}" ${RS.stu === s.id ? "selected" : ""}>${esc(s.name)} (${esc(s.sid)})</option>`).join("")}</select>
   <select class="in" id="hj"><option value="">All subjects</option>${subjList().map((s) => `<option ${RS.sSubj === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>
   <input class="in" type="date" id="hf" value="${esc(RS.from)}" title="From date"><input class="in" type="date" id="ht" value="${esc(RS.to)}" title="To date">
   <button class="btn" onclick="RS.from=RS.to=RS.sSubj='';rsHistory()">Clear</button>
   <button class="btn p" id="hpdf" onclick="rsStuPdf()">Export PDF</button></div><div id="rh_body"></div>`;
  $("#hb").onchange = (e) => { RS.sBatch = e.target.value; if (RS.stu && RS.sBatch && !S.some((s) => s.id === RS.stu)) RS.stu = ""; rsHistory(); };
  $("#hs").onchange = (e) => { RS.stu = e.target.value; rsHistBody(); };
  $("#hj").onchange = (e) => { RS.sSubj = e.target.value; rsHistBody(); };
  $("#hf").onchange = (e) => { RS.from = e.target.value; rsHistBody(); };
  $("#ht").onchange = (e) => { RS.to = e.target.value; rsHistBody(); };
  rsHistBody();
}
function rsHistBody() {
  $("#hpdf").disabled = !RS.stu;
  if (!RS.stu) { $("#rh_body").innerHTML = `<div class="glass empty pad">Choose a student to see the results of all their current and previous exams.</div>`; return; }
  rix();
  const s = DB.Students.find((x) => x.id === RS.stu), H = histData(), cell = (l, v, cl) => `<div><small>${l}</small><b class="${cl || ""}">${v}</b></div>`;
  $("#rh_body").innerHTML = `
  <div class="rss">${cell("Exams taken", H.done.length)}${cell("Passed", H.pass, "g")}${cell("Failed", H.done.length - H.pass, H.done.length - H.pass ? "r" : "")}${cell("Absent", H.absent)}${cell("Average %", H.avg === null ? "–" : nf(H.avg))}${cell("CGPA", H.cgpa === null ? "–" : g2(H.cgpa))}</div>
  <div class="glass tw"><table><thead><tr><th>Date</th><th>Exam</th><th>Subject</th><th>Marks</th><th>Total</th><th>%</th><th>Grade</th><th>GPA</th><th>Result</th></tr></thead><tbody>${
    H.L.map(({ e, c }) => { const has = c.st === "Pass" || c.st === "Fail", r = (RIX[e.id] || {})[s.id] || {};
      return `<tr><td>${fmtD(e.date)}</td><td><b>${esc(e.name)}</b>${e.chapters ? `<small class="mut" style="display:block">${esc(e.chapters)}</small>` : ""}</td><td>${esc(e.subject)}</td>
       <td>${c.P.map((p) => `<small class="mut">${p.l[0] === "V" ? "Viva" : p.l}</small> ${isAbs(r) || r[p.k] === "" ? "–" : nf(r[p.k])}`).join(" &nbsp; ")}</td>
       <td>${has ? `<b>${nf(c.total)}</b><small class="mut"> / ${nf(c.full)}</small>` : ""}</td><td>${has ? nf(c.pct) : ""}</td><td>${has ? gchip(c) : ""}</td><td>${has ? g2(c.gpa) : ""}</td><td>${stchip(c)}</td></tr>`; }).join("") ||
    `<tr><td colspan="9"><div class="empty">No results found for ${esc(s.name)} with these filters.</div></td></tr>`}</tbody></table></div>
  ${H.subs.length ? `<div class="sec">Subject-wise summary</div><div class="glass tw"><table style="min-width:420px"><thead><tr><th>Subject</th><th>Exams</th><th>Average %</th><th>GPA</th></tr></thead><tbody>${H.subs.map((x) => `<tr><td><b>${esc(x.sub)}</b></td><td>${x.n}</td><td>${nf(x.avg)}</td><td>${g2(x.gpa)}</td></tr>`).join("")}</tbody></table></div>` : ""}
  <p class="mut" style="font-size:12px;margin:8px 2px">CGPA = average of the GPA of all exams shown (absent and not-entered exams are left out).</p>`;
}

/* ----- letterhead (8 in x 2 in, A4 portrait) ----- */
const letterhead = () => { const d = [ME.lh1, ME.lh2, ME.lh3, ME.lh4].map((x) => x || "").join(""); return d.startsWith("data:image") ? d : ""; };
function lhModal() {
  const cur = letterhead();
  $("#modal").innerHTML = `<h2>Letterhead</h2>
  <p class="mut" style="font-size:12.5px;margin-bottom:10px">Printed at the top of page 1 of every result PDF (A4, portrait). Upload an image of <b style="color:var(--tx)">8 in × 2 in</b> (4:1), for example 2400 × 600 px. Other shapes are fitted on white. Without one, your name, logo and address are used.</p>
  <div class="lhprev">${cur ? `<img src="${cur}" alt="Letterhead">` : "No letterhead uploaded yet"}</div>
  <input type="file" id="lhFile" accept="image/*" hidden>
  <div class="acts" style="justify-content:space-between">${cur ? `<button class="btn d" onclick="lhClear()">Remove</button>` : "<span></span>"}<span style="display:flex;gap:8px"><button class="btn" onclick="closeM()">Close</button><button class="btn p" onclick="$('#lhFile').click()">${cur ? "Replace letterhead" : "Upload letterhead"}</button></span></div>`;
  $("#lhFile").onchange = lhPick;
  $("#ov").classList.add("on");
}
function lhPick(e) {
  const f = e.target.files[0]; if (!f) return;
  const im = new Image();
  im.onerror = () => toast("Could not read that image");
  im.onload = () => {
    const off = Math.abs(im.width / im.height - 4) > 0.2; let out = "";
    for (const w of [1600, 1200, 1000, 800, 640]) {
      const h = w / 4, c = document.createElement("canvas"); c.width = w; c.height = h;
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
      const k = Math.min(w / im.width, h / im.height), dw = im.width * k, dh = im.height * k; x.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
      for (const q of [0.92, 0.82, 0.72, 0.62, 0.52]) { const d = c.toDataURL("image/jpeg", q); if (d.length <= LH_MAX) { out = d; break; } }
      if (out) break;
    }
    if (!out) { toast("That image is too detailed to store. Try a simpler or smaller file."); return; }
    const fields = {}; [1, 2, 3, 4].forEach((n) => (fields["lh" + n] = out.slice((n - 1) * LH_CHUNK, n * LH_CHUNK)));
    saveFields(fields, off ? "Letterhead saved (fitted to 8×2 in)" : "Letterhead saved").then(() => { lhModal(); if (route === "results") vResults(); });
  };
  im.src = URL.createObjectURL(f); e.target.value = "";
}
function lhClear() { saveFields({ lh1: "", lh2: "", lh3: "", lh4: "" }, "Letterhead removed").then(() => { lhModal(); if (route === "results") vResults(); }); }

/* ----- PDF export (A4 portrait; opens a print-ready page, choose "Save as PDF") ----- */
function pdfOpen(title, inner) {
  const w = window.open("", "_blank"); if (!w) { toast("Allow pop-ups to export the PDF"); return; }
  const lh = letterhead();
  const head = lh ? `<div class="lh"><img src="${lh}" alt=""></div>`
    : `<div class="lhd">${ME.logo ? `<img src="${esc(ME.logo)}" alt="">` : ""}<div><h1>${esc(ME.name || "TuitionPro")}</h1><div class="m">${esc([ME.address, ME.phone, ME.email].filter(Boolean).join(" | "))}</div></div></div>`;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>
  @page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0}
  body{font:12px/1.45 "Plus Jakarta Sans","Noto Sans Bengali",system-ui,sans-serif;color:#17324d;background:#e9eef4;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .bar{position:sticky;top:0;z-index:5;background:#17324d;color:#fff;padding:8px 14px;display:flex;gap:12px;align-items:center;font-size:13px}.bar button{background:#2f7de1;color:#fff;border:0;border-radius:8px;padding:7px 14px;font-weight:600;cursor:pointer}
  .sheet{width:210mm;min-height:297mm;margin:12px auto;background:#fff;box-shadow:0 4px 24px #0003}
  .lh{padding-top:4mm}.lh img{display:block;width:8in;height:2in;margin:0 auto}
  .lhd{display:flex;align-items:center;gap:14px;padding:10mm 12mm 3mm;border-bottom:2px solid #17324d;margin:0 12mm}.lhd img{width:60px;height:60px;border-radius:10px;object-fit:cover}.lhd h1{font-size:22px;margin:0}.m{color:#64809b;font-size:11px}
  table.o{width:100%;border-collapse:collapse}.o>thead>tr>td{height:6mm;padding:0;border:0}.o>tfoot>tr>td{height:16mm;padding:0;border:0}.o>tbody>tr>td{padding:0 12mm;border:0}
  h2.ti{text-align:center;font-size:16px;letter-spacing:.14em;margin:6px 0 10px;text-transform:uppercase}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:3px 18px;margin-bottom:10px;font-size:12px}.info div b{display:inline-block;min-width:70px;color:#64809b;font-weight:600}
  table.t{width:100%;border-collapse:collapse;font-size:11px;margin:6px 0 10px}.t th{background:#17324d;color:#fff;padding:5px 6px;text-align:center;font-weight:600}.t td{border:1px solid #cdd9e5;padding:4px 6px;text-align:center}.t td.l,.t th.l{text-align:left}
  .t tr{page-break-inside:avoid}.t thead{display:table-header-group}.t tbody tr:nth-child(even) td{background:#f4f8fc}
  .sum{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:6px 0 10px}.sum div{border:1px solid #cdd9e5;border-radius:6px;padding:5px 8px;background:#f4f8fc;break-inside:avoid}.sum small{display:block;color:#64809b;font-size:10px}.sum b{font-size:14px}
  .scale{font-size:10px;color:#475b70;margin-top:4px}.scale table{border-collapse:collapse;width:100%}.scale td,.scale th{border:1px solid #cdd9e5;padding:2px 5px;text-align:center;font-size:10px}.scale th{background:#eaf1f8}
  .sig{display:flex;justify-content:space-between;margin-top:34px;color:#64809b;font-size:11px;break-inside:avoid}.sig span{border-top:1px solid #9bb0c5;padding-top:4px;min-width:150px;text-align:center}
  .F{color:#dc2626;font-weight:700}.ft{position:fixed;left:0;right:0;bottom:6mm;text-align:center;font-size:10px;color:#64809b}
  @media screen{.ft{position:static;padding:10px 0 14px}}
  @media print{body{background:#fff}.bar{display:none}.sheet{margin:0;box-shadow:none;width:auto;min-height:0}}
  </style></head><body><div class="bar"><span>Choose <b>Save as PDF</b> as the destination in the print window.</span><button onclick="print()">Save as PDF / Print</button></div>
  <div class="sheet">${head}<table class="o"><thead><tr><td></td></tr></thead><tfoot><tr><td></td></tr></tfoot><tbody><tr><td>${inner}</td></tr></tbody></table><div class="ft">Powered by TuitionPro</div></div>
  <script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>`);
  w.document.close(); w.focus();
}
const scaleHtml = () => `<div class="scale"><table><tr><th>Marks (%)</th>${GRANGE.map((r) => `<td>${r}</td>`).join("")}</tr><tr><th>Grade</th>${GRADES.map((g) => `<td>${g[1]}</td>`).join("")}</tr><tr><th>GPA</th>${GRADES.map((g) => `<td>${g2(g[2])}</td>`).join("")}</tr></table></div>`;
const sigHtml = () => `<div class="sig"><span>Class teacher</span><span>Authorised signature</span></div>`;
const sumCell = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;

function rsExamPdf(id) {
  const e = DB.Exams.find((x) => x.id === id); if (!e) return;
  if (RS.exam === id && RS.dirty.size) { toast("Save the marks first, then export"); return; }
  rix();
  const P = examParts(e), T = examTable(e, (sid) => (RIX[e.id] || {})[sid]), S = T.st;
  const ord = { Pass: 0, Fail: 1, Incomplete: 2, Pending: 2, Invalid: 2, Absent: 3 };
  const L = [...T.L].sort((a, b) => ord[a.c.st] - ord[b.c.st] || (b.c.total || 0) - (a.c.total || 0) || String(a.s.sid).localeCompare(String(b.s.sid)));
  const row = ({ s, c, rank }) => { const r = (RIX[e.id] || {})[s.id] || {}, has = c.st === "Pass" || c.st === "Fail";
    return `<tr><td>${c.st === "Pass" && rank ? `<b>${POS[rank]}</b>` : "–"}</td><td>${esc(s.sid)}</td><td class="l">${esc(s.name)}</td>${P.map((p) => `<td>${isAbs(r) || r[p.k] === "" || r[p.k] == null ? "–" : nf(r[p.k])}</td>`).join("")}
     <td><b>${has ? nf(c.total) : "–"}</b></td><td>${has ? nf(c.pct) : "–"}</td><td class="${c.grade === "F" ? "F" : ""}">${has ? esc(c.grade) : c.st === "Absent" ? "AB" : "–"}</td><td>${has ? g2(c.gpa) : "–"}</td>
     <td class="${c.st === "Fail" ? "F" : ""}">${{ Pass: "Passed", Fail: "Failed", Absent: "Absent", Incomplete: "Incomplete", Pending: "–", Invalid: "–" }[c.st]}</td></tr>`; };
  const dist = GRADES.map((g) => g[1]);
  pdfOpen(`${e.name} - ${e.subject} - Result`, `
  <h2 class="ti">Result Sheet</h2>
  <div class="info"><div><b>Exam</b> ${esc(e.name)}</div><div><b>Date</b> ${fmtD(e.date)}</div><div><b>Subject</b> ${esc(e.subject)}</div>${e.type ? `<div><b>Exam type</b> ${esc(e.type)}</div>` : ""}<div><b>Class / Batch</b> ${esc(batchTxt(e))}</div>
   ${e.chapters ? `<div style="grid-column:1/-1"><b>Chapters</b> ${esc(e.chapters)}</div>` : ""}<div><b>Full marks</b> ${nf(examFull(e))}</div><div><b>Parts</b> ${esc(partsTxt(e))}</div></div>
  <table class="t"><thead><tr><th>Position</th><th>Student ID</th><th class="l">Name</th>${P.map((p) => `<th>${p.l}<br>(${nf(p.full)})</th>`).join("")}<th>Total<br>(${nf(examFull(e))})</th><th>%</th><th>Grade</th><th>GPA</th><th>Result</th></tr></thead><tbody>${L.map(row).join("") || `<tr><td colspan="${P.length + 8}">No students</td></tr>`}</tbody></table>
  <div class="sum">${sumCell("Appeared", S.appeared + " / " + S.all)}${sumCell("Passed", S.passed)}${sumCell("Failed", S.failed)}${sumCell("Absent", S.absent)}${sumCell("Pass rate", S.rate === null ? "–" : Math.round(S.rate) + "%")}${sumCell("Average", S.avg === null ? "–" : nf(S.avg))}${sumCell("Highest", S.hi === null ? "–" : nf(S.hi))}${sumCell("Lowest", S.lo === null ? "–" : nf(S.lo))}${sumCell("Average GPA", S.gpa === null ? "–" : g2(S.gpa))}${sumCell("Grades", dist.filter((g) => S.dist[g]).map((g) => g + ":" + S.dist[g]).join(" ") || "–")}</div>
  ${scaleHtml()}${sigHtml()}`);
}
function rsStuPdf() {
  const s = DB.Students.find((x) => x.id === RS.stu); if (!s) { toast("Choose a student first"); return; }
  rix();
  const H = histData(), used = PARTS.filter(([k]) => H.L.some((x) => x.c.P.some((p) => p.k === k)));
  const b = batchOf(s), cell = (x, k) => { const p = x.c.P.find((q) => q.k === k), r = (RIX[x.e.id] || {})[s.id] || {}; return p ? (isAbs(r) || r[k] === "" ? "–" : nf(r[k])) : "n/a"; };
  pdfOpen(`${s.name} - Results`, `
  <h2 class="ti">Academic Progress Report</h2>
  <div class="info"><div><b>Name</b> ${esc(s.name)}</div><div><b>Student ID</b> ${esc(s.sid)}</div><div><b>Class</b> ${esc(clsLabel(stuClass(s)))}</div><div><b>Batch</b> ${b ? esc(bLabel(b)) : "–"}</div>
   ${s.guardian ? `<div><b>Guardian</b> ${esc(s.guardian)}</div>` : ""}${RS.sSubj ? `<div><b>Subject</b> ${esc(RS.sSubj)}</div>` : ""}${RS.from || RS.to ? `<div><b>Period</b> ${RS.from ? fmtD(RS.from) : "start"} to ${RS.to ? fmtD(RS.to) : "today"}</div>` : ""}</div>
  <div class="sum">${sumCell("Exams taken", H.done.length)}${sumCell("Passed", H.pass)}${sumCell("Failed", H.done.length - H.pass)}${sumCell("Average %", H.avg === null ? "–" : nf(H.avg))}${sumCell("CGPA", H.cgpa === null ? "–" : g2(H.cgpa))}</div>
  <table class="t"><thead><tr><th>Date</th><th class="l">Exam</th><th class="l">Subject</th>${used.map(([, l]) => `<th>${l}</th>`).join("")}<th>Total</th><th>%</th><th>Grade</th><th>GPA</th></tr></thead><tbody>${
    H.L.map((x) => { const has = x.c.st === "Pass" || x.c.st === "Fail";
      return `<tr><td>${fmtD(x.e.date)}</td><td class="l">${esc(x.e.name)}${x.e.chapters ? `<br><span class="m">${esc(x.e.chapters)}</span>` : ""}</td><td class="l">${esc(x.e.subject)}</td>${used.map(([k]) => `<td>${cell(x, k)}</td>`).join("")}
       <td>${has ? `<b>${nf(x.c.total)}</b> / ${nf(x.c.full)}` : x.c.st === "Absent" ? "Absent" : "–"}</td><td>${has ? nf(x.c.pct) : "–"}</td><td class="${x.c.grade === "F" ? "F" : ""}">${has ? esc(x.c.grade) : "–"}</td><td>${has ? g2(x.c.gpa) : "–"}</td></tr>`; }).join("") || `<tr><td colspan="${used.length + 7}">No exam results</td></tr>`}</tbody></table>
  ${H.subs.length ? `<table class="t" style="width:70%"><thead><tr><th class="l">Subject</th><th>Exams</th><th>Average %</th><th>GPA</th></tr></thead><tbody>${H.subs.map((x) => `<tr><td class="l">${esc(x.sub)}</td><td>${x.n}</td><td>${nf(x.avg)}</td><td>${g2(x.gpa)}</td></tr>`).join("")}</tbody></table>` : ""}
  <div class="m">CGPA is the average of the GPA of all exams listed above (absent exams are left out).</div>
  ${scaleHtml()}${sigHtml()}`);
}

/* ============ WATERMARK (inline SVG so it can follow the theme colours) ============ */
fetch("watermark.svg")
  .then((r) => (r.ok ? r.text() : ""))
  .then((t) => {
    if (!t) return;
    t = t.replace(/<\?xml[\s\S]*?\?>/, "").replace(/<style>[\s\S]*?<\/style>/, "").replace(/<title>[\s\S]*?<\/title>/, "").replace(/\sid="[^"]*"/g, "");
    document.querySelectorAll(".wm").forEach((w) => (w.innerHTML = t));
  })
  .catch(() => {});

/* ============ INIT ============ */
$("#sw").innerHTML = Object.entries(THEMES)
  .map(
    ([k, c]) =>
      `<button data-t="${k}" title="${k}" style="background:${c}" onclick="setTheme('${k}')"></button>`,
  )
  .join("");
setTheme(localStorage.getItem("theme") || "ocean");
if (localStorage.getItem("sbc")) $("#app").classList.add("collapsed");
route = (location.hash || "#dash").slice(1);
if (!VIEWS[route]) route = "dash";
buildNav();
if (API_URL && !TOKEN) showLogin();
else if (API_URL && cacheLoad()) { applyData(cacheLoad()); showLoader(false); load(false); } // instant start, refresh in background
else load(true);
setTimeout(() => { lib("xlsx"); lib("exceljs"); }, 4000); // warm up Excel tools while idle
