/* ============ CONFIG ============
   The Apps Script URL lives in config.js (so you never have to edit this file). */
const API_URL = (window.TP_CONFIG && window.TP_CONFIG.API_URL) || "";
const NEED_BUILD = "8"; // must match BUILD in Code.gs
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
const SCHOOLS = [
  "Bangladesh Police Academy, Rajshahi",
  "Baya School and College, Rajshahi",
  "Govt. Laboratory High School, Rajshahi",
  "Haji Muhammad Muhsin Govt. High School, Rajshahi",
  "Hamidpur Nawadapara Pilot High School, Rajshahi",
  "Shaheed Buddhijibi Govt. College",
  "Mission School, Rajshahi",
  "Masjid Mission Academy",
  "Nawadapara Girls High School",
  "New Govt. Degree College",
  "Nowahata Govt. Degree College",
  "P.N. Govt. Girls' High School",
  "Rajshahi Cadet College",
  "Rajshahi Cantonment Board School and College",
  "Rajshahi Cantonment Public School and College",
  "Rajshahi College",
  "Rajshahi Collegiate School and College",
  "Rajshahi Court Model School and College",
  "Rajshahi Education Board Govt. Model School and College",
  "Rajshahi Govt. City College",
  "Rajshahi Govt. Girls High School",
  "Rajshahi Bahumukhi Girl's High School",
  "Rajshahi Govt. Model School and College",
  "Rajshahi Govt. Women's College",
  "Rajshahi Loknath High School",
  "Rajshahi Siroil Govt. High School",
  "Rajshahi University School and College",
  "Shah Mukhdam High School and College, Rajshahi",
  "Shaheed A.H.M. Kamaruzzaman Govt. Degree College",
  "Shaheed Colonel Kazi Emdadul Haque Public School",
  "Shaheed Mamun Mahmud Police Lines School and College",
  "Shahid Nazmul Haque Girls High School, Rajshahi",
  "Summit School, Rajshahi",
  "Sristy Central School, Rajshahi",
  "Motihar College"
];
// Suggestions = the built-in list + any school/college already typed for another student
const schoolList = () => [...new Set([...SCHOOLS, ...DB.Students.map((s) => String(s.school || "").trim()).filter(Boolean)])].sort((x, y) => x.localeCompare(y));
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
  wa: '<path d="M12 3.5a8.5 8.5 0 0 1 0 17 8.9 8.9 0 0 1-4-.9L3.5 20.5l1-4.3a8.5 8.5 0 0 1 7.5-12.7z"/><path d="M9.2 9.4c.5-1.4 1.5-1.2 1.8-.4l.5 1.2-1 1.2c.7 1.4 1.7 2.3 3.1 3l1.2-1 1.2.5c.8.3 1 1.3-.4 1.8-3.3 1.2-7.6-3-6.4-6.3z"/>',
};
const VIEWS = {
  dash: "Dashboard",
  students: "Students",
  attendance: "Attendance",
  fees: "Tuition fees",
  results: "Results",
  wa: "WhatsApp",
  profile: "My profile",
  admin: "Admin panel",
};
const NAVICON = {
  dash: "dash",
  students: "stu",
  attendance: "att",
  fees: "fee",
  results: "res",
  wa: "wa",
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
const LIBS = { xlsx: ["XLSX", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"], exceljs: ["ExcelJS", "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"], qr: ["QRCode", "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"] };
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
  waLoad();
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
  document.body.classList.toggle("wa-full", route === "wa");
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.r === route));
  $("#title").textContent = VIEWS[route];
  ({ dash: vDash, students: vStudents, attendance: vAttendance, fees: vFees, results: vResults, wa: vWa, profile: vProfile, admin: vAdmin }[route] || vSoon)();
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
      (!q || [s.name, s.sid, s.school, s.guardian, s.phone].join(" ").toLowerCase().includes(q)),
  );
}
function vStudents() {
  const B = sortBatches(DB.Batches), hasUn = DB.Students.some((s) => !batchOf(s));
  $("#view").innerHTML = `
  <div class="glass tools">
   <input class="in grow" id="fq" placeholder="Search name, student ID, school, guardian, phone" value="${esc(F.q)}">
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
      return `<tr><td><b>${esc(s.sid)}</b></td><td>${esc(s.name)}${s.school ? `<small class="mut" style="display:block">${esc(s.school)}</small>` : ""}</td><td>${esc(clsLabel(stuClass(s)))}</td><td>${b ? esc(b.section) + " " + t12(b.start) + " " + daysTag(b) : "Unassigned"}</td><td>${esc(s.guardian)}</td><td>${esc(s.phone)}</td><td>${esc(s.fee)}<small class="mut"> ${s.feeType === "Course" ? "course" : "/month"}</small></td><td><span class="chip s-${esc(s.status)}">${esc(s.status)}</span></td>
   <td style="text-align:right"><span class="ra">${icoBtn("", "WhatsApp this student", `waOpenStudent('${s.id}')`, "wa")}${icoBtn("", "Edit student", `editStudent('${s.id}')`, "edit")}${icoBtn("del", "Delete student", `delStudent('${s.id}')`, "trash")}</span></td></tr>`;
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
   <label class="full">School/College Name<input class="in" id="m_school" list="m_schools" autocomplete="off" placeholder="Type or pick from suggestions" value="${v("school")}"><datalist id="m_schools">${schoolList().map((x) => `<option value="${esc(x)}">`).join("")}</datalist></label>
   <label class="full">Assign Class &amp; Batch<select class="in" id="m_batch"><option value="">Select class &amp; batch</option>${B.map((b) => `<option value="${esc(b.id)}" ${cur === b.id ? "selected" : ""}>${esc(bLabel(b))}</option>`).join("")}</select></label>
   <label>Student ID (automatic)<input class="in" id="m_sid" readonly value="${v("sid")}" placeholder="Pick a batch"></label>
   <label>Joined<input class="in" id="m_joined" type="date" value="${s.joined || new Date().toISOString().slice(0, 10)}"></label>
   <label>Status<select class="in" id="m_status">${STATUSES.map((c) => `<option ${s.status === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
   <label>Fee plan<select class="in" id="m_feeType" onchange="feePlanUI()"><option ${s.feeType !== "Course" ? "selected" : ""}>Monthly</option><option ${s.feeType === "Course" ? "selected" : ""}>Course</option></select></label>
   <label><span id="m_feeLbl">Monthly Fee</span><input class="in" id="m_fee" type="number" min="0" value="${v("fee")}"></label>
   <label id="m_ffw">Billing starts<input class="in" id="m_feeFrom" type="month" value="${esc(s.feeFrom || (s.joined || new Date().toISOString().slice(0, 10)).slice(0, 7))}"></label>
   ${id ? "" : `<label>Paid amount (optional)<input class="in" id="m_paid" type="number" min="0" placeholder="0"></label>`}
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
    school: g("school"),
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
  const paid = id ? 0 : Number(($("#m_paid") || {}).value) || 0;
  let pr = null;
  if (paid > 0) {
    if (!(Number(row.fee) > 0)) { toast("Enter the fee before adding a paid amount"); return; }
    pr = paidRows(row, paid, payDate(row.joined), "Initial payment");
    if (pr.err) { toast(pr.err); return; }
  }
  const i = DB.Students.findIndex((x) => x.id === row.id);
  i < 0 ? DB.Students.push(row) : (DB.Students[i] = row);
  if (pr) DB.Fees.push(...pr.rows);
  closeM();
  render();
  const ok = await write("save", { table: "Students", row }, "Student saved");
  if (ok && pr) await saveFeeRows(pr.rows, "Student saved with payment");
}
// Payment date for an opening payment: the joining date, but never in the future
const payDate = (joined) => { const t = dKey(new Date()); return joined && joined < t ? joined : t; };
// Turns an opening "paid amount" into fee records (oldest month first for Monthly plans, one record for Course plans)
function paidRows(s, amt, date, note) {
  const I = feeInfo(s, []), A = allocate(s, I, amt, "");
  if (A.err) return { err: A.err };
  const rc = nextReceipt(date), course = I.type === "Course";
  return { rows: A.list.map((x) => ({ id: uid(), studentId: s.id, month: x.month, amount: String(x.amt), paid: "", date, kind: course ? "course" : "monthly", method: "Cash", note, rcpt: rc, batchId: s.batchId || "" })) };
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
      "School/College": s.school || "",
      Class: stuClass(s),
      Section: b ? b.section : "",
      Batch: b ? bLabel(b) : "",
      "Batch days": b ? dayCodes(b).join("/") : "",
      Guardian: s.guardian,
      Phone: s.phone,
      "Fee plan": s.feeType === "Course" ? "Course" : "Monthly",
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
  school: ["schoolcollegename", "schoolname", "collegename", "school", "college", "institution"],
  feeType: ["feeplan", "plan", "feetype"],
  paid: ["paidamount", "paid", "amountpaid"],
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
    const fee = String(r.fee ?? "").trim(), joined = parseDate(r.joined), feeType = /course/i.test(String(r.feeType ?? "")) ? "Course" : "Monthly";
    const paid = Number(String(r.paid ?? "").replace(/[,\s]/g, "")) || 0;
    if (paid > 0) {
      const tmp = { fee, feeType, feeFrom: joined.slice(0, 7), joined };
      const A = Number(fee) > 0 ? allocate(tmp, feeInfo(tmp, []), paid, "") : { err: "Paid amount needs a fee" };
      if (A.err) { errs.push({ line, name, err: A.err }); return; }
    }
    if (seen.has(key)) { dups++; return; }
    seen.add(key);
    const st = STATUSES.find((s) => nk(s) === nk(r.status)) || "Active";
    ok.push({ name, b, school: String(r.school ?? "").trim(), guardian: String(r.guardian ?? "").trim(), phone, fee, feeType, paid, status: st, joined });
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
  const feeRows = [];
  const rows = IMP.res.ok.map((x) => {
    const row = { id: uid(), sid: nextSid(x.b, x.joined), roll: "", name: x.name, school: x.school, batchId: x.b.id, class: x.b.class, section: x.b.section, batch: x.b.name, guardian: x.guardian, phone: x.phone, fee: x.fee, feeType: x.feeType, feeFrom: x.joined.slice(0, 7), status: x.status, joined: x.joined, updated: new Date().toISOString() };
    DB.Students.push(row); // pushed one by one so the next Student ID keeps counting up
    if (x.paid > 0) { const pr = paidRows(row, x.paid, payDate(x.joined), "Initial payment"); if (pr.rows) { DB.Fees.push(...pr.rows); feeRows.push(...pr.rows); } }
    return row;
  });
  closeM(); render();
  for (let i = 0; i < rows.length; i += 200) {
    const last = i + 200 >= rows.length;
    if (!(await write("saveMany", { table: "Students", rows: rows.slice(i, i + 200) }, last && !feeRows.length ? `${rows.length} students imported` : ""))) return;
  }
  if (feeRows.length) await saveFeeRows(feeRows, `${rows.length} students imported with payments`);
}
async function downloadTemplate() {
  if (!(await lib("exceljs"))) { toast("Template library failed to load. Check your internet connection."); return; }
  const B = sortBatches(DB.Batches), used = CLASSES.filter((c) => B.some((b) => b.class === c)), SL = schoolList();
  const defB = $("#i_batch") && DB.Batches.find((b) => b.id === $("#i_batch").value);
  const defC = defB ? defB.class : $("#i_class") ? $("#i_class").value : "";
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Students", { views: [{ state: "frozen", ySplit: 1 }] });
  const help = wb.addWorksheet("How to use");
  const ls = wb.addWorksheet("Lists", { state: "hidden" });
  used.forEach((c, i) => (ls.getCell(i + 1, 1).value = c));
  B.forEach((b, i) => (ls.getCell(i + 1, 2).value = bLabel(b)));
  SL.forEach((x, i) => (ls.getCell(i + 1, 3).value = x));
  // column order: A Name, B School/College Name, C Class, D Batch, E Guardian, F Phone, G Fee plan, H Monthly/Course Fee, I Paid amount, J Status, K Joined
  [["Name", 28], ["School/College Name", 38], ["Class", 14], ["Batch", 26], ["Guardian", 22], ["Phone", 16], ["Fee plan", 12], ["Monthly/Course Fee", 20], ["Paid amount", 14], ["Status", 12], ["Joined", 14]].forEach(([h, w], i) => {
    ws.getColumn(i + 1).width = w;
    const c = ws.getCell(1, i + 1); c.value = h; c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE9FA" } };
  });
  const N = 200;
  for (let r = 2; r <= N + 1; r++) {
    ws.getCell(r, 6).numFmt = "@"; ws.getCell(r, 11).numFmt = "yyyy-mm-dd";
    ws.getCell(r, 7).value = "Monthly";
    if (defC) ws.getCell(r, 3).value = defC;
    if (defB) ws.getCell(r, 4).value = bLabel(defB);
  }
  const dv = (rng, o) => ws.dataValidations.add(rng, { allowBlank: true, showErrorMessage: true, errorStyle: "stop", ...o });
  // School/College: suggestions only. Any other text is accepted (no error popup).
  ws.dataValidations.add(`B2:B${N + 1}`, { type: "list", allowBlank: true, showErrorMessage: false, formulae: [`Lists!$C$1:$C$${SL.length}`] });
  dv(`C2:C${N + 1}`, { type: "list", formulae: [`Lists!$A$1:$A$${used.length}`], errorTitle: "Class", error: "Choose a class from the list." });
  dv(`D2:D${N + 1}`, { type: "list", formulae: [`Lists!$B$1:$B$${B.length}`], errorTitle: "Batch", error: "Choose a batch from the list. Add new batches in the portal first." });
  dv(`G2:G${N + 1}`, { type: "list", formulae: ['"Monthly,Course"'], errorTitle: "Fee plan", error: "Choose Monthly or Course." });
  dv(`H2:H${N + 1}`, { type: "decimal", operator: "greaterThanOrEqual", formulae: [0], errorTitle: "Fee", error: "Enter a number." });
  dv(`I2:I${N + 1}`, { type: "decimal", operator: "greaterThanOrEqual", formulae: [0], errorTitle: "Paid amount", error: "Enter a number." });
  dv(`J2:J${N + 1}`, { type: "list", formulae: ['"Active,Inactive,Suspended,Left"'], errorTitle: "Status", error: "Choose Active, Inactive, Suspended or Left." });
  help.getColumn(1).width = 90;
  ["How to fill the Students sheet", "1. Name is required. Rows without a name are ignored.",
   "2. School/College Name: pick from the suggestions or type any other name.",
   "3. Class and Batch are dropdowns of the classes and batches created in the portal. Leave them empty to use the class and batch chosen in the Import window.",
   "4. Fee plan is Monthly or Course (empty = Monthly). Monthly/Course Fee is the monthly amount, or the total course fee.",
   "5. Paid amount (optional) is what the student has already paid. It is recorded as a payment: oldest month first for Monthly, or against the total for Course. It cannot exceed the course fee.",
   "6. Status defaults to Active. Joined defaults to today (use YYYY-MM-DD or DD/MM/YYYY). Monthly billing starts from the joining month.",
   "7. Student IDs are created automatically during import.",
   "8. Created a new batch since downloading? Download a fresh template."].forEach((t, i) => { help.getCell(i + 1, 1).value = t; if (!i) help.getCell(1, 1).font = { bold: true }; help.getCell(i + 1, 1).alignment = { wrapText: true }; });
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
  .rh{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:start;margin:4px 0 12px;font-size:12px;line-height:1.6}.rh .c{text-align:center}.rh .r{text-align:right}.rh .l{text-align:left}.rh h2{margin:0 0 2px;font-size:16px;letter-spacing:.2em;text-transform:uppercase}.rh .ex{font-size:14px;font-weight:700}
  .st3{display:flex;justify-content:center;gap:8px;margin:0 0 12px}.st3 div{min-width:150px;border:1px solid #cdd9e5;border-radius:6px;padding:5px 9px;background:#f4f8fc;break-inside:avoid;display:flex;flex-direction:column}.st3 small{color:#64809b;font-size:10px}.st3 b{font-size:15px;text-align:right}
  .sigr{display:flex;justify-content:flex-end;margin-top:40px;break-inside:avoid}.sigr span{border-top:1px solid #9bb0c5;padding-top:4px;min-width:150px;text-align:center;color:#64809b;font-size:11px}
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
  pdfOpen(`${e.name} - ${e.subject} - Result`, `
  <div class="rh">
   <div class="l"><div>${fmtD(e.date)}</div><div>${esc(batchTxt(e))}</div></div>
   <div class="c"><h2>Result Sheet</h2><div class="ex">${esc(e.name)} - ${esc(e.subject)}</div>${e.chapters ? `<div>Chapters: ${esc(e.chapters)}</div>` : ""}</div>
   <div class="r"><div>Full Marks: ${nf(examFull(e))}</div><div>${esc(partsTxt(e))}</div></div>
  </div>
  <div class="st3">
   <div><small>Appeared</small><b>${S.appeared} / ${S.all}</b></div>
   <div><small>Passed/ Failed/ Absent</small><b>${S.passed}/${S.failed}/${S.absent}</b></div>
   <div><small>Highest/ Lowest</small><b>${S.hi === null ? "–" : nf(S.hi)}/${S.lo === null ? "–" : nf(S.lo)}</b></div>
  </div>
  <table class="t"><thead><tr><th>Position</th><th>Student ID</th><th class="l">Name</th>${P.map((p) => `<th>${p.l}<br>(${nf(p.full)})</th>`).join("")}<th>Total<br>(${nf(examFull(e))})</th><th>%</th><th>Grade</th><th>GPA</th><th>Result</th></tr></thead><tbody>${L.map(row).join("") || `<tr><td colspan="${P.length + 8}">No students</td></tr>`}</tbody></table>
  <div class="sigr"><span>Authorised signature</span></div>`);
}
function rsStuPdf() {
  const s = DB.Students.find((x) => x.id === RS.stu); if (!s) { toast("Choose a student first"); return; }
  rix();
  const H = histData(), used = PARTS.filter(([k]) => H.L.some((x) => x.c.P.some((p) => p.k === k)));
  const b = batchOf(s), cell = (x, k) => { const p = x.c.P.find((q) => q.k === k), r = (RIX[x.e.id] || {})[s.id] || {}; return p ? (isAbs(r) || r[k] === "" ? "–" : nf(r[k])) : "n/a"; };
  pdfOpen(`${s.name} - Results`, `
  <h2 class="ti">Academic Progress Report</h2>
  <div class="info"><div><b>Name</b> ${esc(s.name)}</div><div><b>Student ID</b> ${esc(s.sid)}</div>${s.school ? `<div style="grid-column:1/-1"><b>School/College</b> ${esc(s.school)}</div>` : ""}<div><b>Class</b> ${esc(clsLabel(stuClass(s)))}</div><div><b>Batch</b> ${b ? esc(bLabel(b)) : "–"}</div>
   ${s.guardian ? `<div><b>Guardian</b> ${esc(s.guardian)}</div>` : ""}${RS.sSubj ? `<div><b>Subject</b> ${esc(RS.sSubj)}</div>` : ""}${RS.from || RS.to ? `<div><b>Period</b> ${RS.from ? fmtD(RS.from) : "start"} to ${RS.to ? fmtD(RS.to) : "today"}</div>` : ""}</div>
  <div class="sum">${sumCell("Exams taken", H.done.length)}${sumCell("Passed", H.pass)}${sumCell("Failed", H.done.length - H.pass)}${sumCell("Average %", H.avg === null ? "–" : nf(H.avg))}${sumCell("CGPA", H.cgpa === null ? "–" : g2(H.cgpa))}</div>
  <table class="t"><thead><tr><th>Date</th><th class="l">Exam</th><th class="l">Subject</th>${used.map(([, l]) => `<th>${l}</th>`).join("")}<th>Total</th><th>%</th><th>Grade</th><th>GPA</th></tr></thead><tbody>${
    H.L.map((x) => { const has = x.c.st === "Pass" || x.c.st === "Fail";
      return `<tr><td>${fmtD(x.e.date)}</td><td class="l">${esc(x.e.name)}${x.e.chapters ? `<br><span class="m">${esc(x.e.chapters)}</span>` : ""}</td><td class="l">${esc(x.e.subject)}</td>${used.map(([k]) => `<td>${cell(x, k)}</td>`).join("")}
       <td>${has ? `<b>${nf(x.c.total)}</b> / ${nf(x.c.full)}` : x.c.st === "Absent" ? "Absent" : "–"}</td><td>${has ? nf(x.c.pct) : "–"}</td><td class="${x.c.grade === "F" ? "F" : ""}">${has ? esc(x.c.grade) : "–"}</td><td>${has ? g2(x.c.gpa) : "–"}</td></tr>`; }).join("") || `<tr><td colspan="${used.length + 7}">No exam results</td></tr>`}</tbody></table>
  ${H.subs.length ? `<table class="t" style="width:70%"><thead><tr><th class="l">Subject</th><th>Exams</th><th>Average %</th><th>GPA</th></tr></thead><tbody>${H.subs.map((x) => `<tr><td class="l">${esc(x.sub)}</td><td>${x.n}</td><td>${nf(x.avg)}</td><td>${g2(x.gpa)}</td></tr>`).join("")}</tbody></table>` : ""}
  ${sigHtml()}`);
}

/* ============ WHATSAPP — web.whatsapp.com-style client on the OpenWA gateway ============
   The WhatsApp page now looks and works like WhatsApp Web itself:
   • a QR pairing screen (WhatsApp → Settings → Linked devices → scan) connects your
     existing number through your own OpenWA gateway;
   • a chat list with real conversations, unread badges and last-message previews;
   • a conversation view with message bubbles (incoming/outgoing, ticks, media) pulled
     from the gateway, plus a WhatsApp-style composer with attachments;
   • broadcasts keep working: the megaphone button opens the composer for a whole
     class/batch, everyone, or hand-picked students — one message at a time, with a
     human-like pause between messages. */
const WA = {
  cfg: { url: "", key: "", session: "", cc: "880", dmin: 4, dmax: 8 },
  log: [], sess: [], conn: { st: "", phone: "", push: "" },
  chats: [], msgs: {}, chat: "", filt: "all", q: "",
  drafts: {}, file: null, send: {},
  newChat: false, bc: null, run: null, pend: null,
  tickN: 0, _acct: "", _tik: null, _tyTo: null, _tyStop: null,
};
const WA_MAX = 45 * 1024 * 1024; // gateway media cap is 50 MiB — stay safely under it
const WA_VARS = ["name", "sid", "class", "batch", "guardian", "school", "status"];
const WA_ST_LABEL = { ready: "Connected", qr_ready: "QR scan needed", initializing: "Starting…", authenticating: "Authenticating…", created: "Not started", disconnected: "Disconnected", action_required: "Action needed", failed: "Failed" };
const WA_IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  bc: '<path d="M3 11l18-6v14l-18-6z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  clip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 17l5-4 4 3 4-4 5 5"/>',
  doc: '<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5"/>',
  audio: '<path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  pin: '<path d="M12 16v5"/><path d="M8 4h8l-1 7 2.5 2.5V15h-11v-1.5L9 11z"/>',
  dl: '<path d="M12 3v12M6 9l6 6 6-6M5 21h14"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  chatbig: '<path d="M12 3.5a8.5 8.5 0 0 1 0 17 8.9 8.9 0 0 1-4-.9L3.5 20.5l1-4.3a8.5 8.5 0 0 1 7.5-12.7z"/>',
};
const waI = (k, sz) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="width:${sz || 20}px;height:${sz || 20}px;flex:none">${WA_IC[k] || ""}</svg>`;
const WA_AV_COLORS = ["#e542a3", "#02a698", "#7f66ff", "#0a7eb4", "#c7a935", "#e2703a", "#e54242", "#12936f", "#4552d9"];
const waAvColor = (n) => { let h = 0; for (const ch of String(n || "?")) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return WA_AV_COLORS[h % WA_AV_COLORS.length]; };
const WA_CSS = `
body.wa-full #view{padding:0!important;overflow:hidden!important}
.waBoot{display:flex;align-items:center;justify-content:center;height:420px}
#waApp{position:relative}
.waAppIn{height:100%;display:flex}
/* ---------- pairing screen ---------- */
.waPair{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#f7f8fa,#eef1f4);border-radius:14px;overflow:auto;padding:18px}
.waPairCard{background:#fff;border:1px solid #e7ebee;border-radius:16px;box-shadow:0 10px 30px rgba(16,40,60,.08);max-width:920px;width:100%;display:flex;padding:38px 40px;gap:34px}
.waPairL{flex:1.15;min-width:0}
.waPairL h2{font-size:26px;color:#243f4d;font-weight:600;margin:0 0 8px;line-height:1.25}
.waPairL>p{color:#5b7585;font-size:14.5px;margin:0 0 20px;line-height:1.5}
.waStep{display:flex;gap:14px;margin:14px 0;align-items:flex-start}
.waStep i{width:28px;height:28px;border-radius:50%;background:#e7f7f1;color:#00a884;font-style:normal;font-weight:700;font-size:13.5px;display:flex;align-items:center;justify-content:center;flex:none}
.waStep div{font-size:14px;color:#3b4f5c;line-height:1.5;padding-top:4px}
.waStep div small{display:block;color:#8aa0ad;font-size:12.5px;margin-top:2px}
.waPairNote{margin-top:18px;font-size:12.5px;color:#8aa0ad;line-height:1.5}
.waPairR{width:360px;flex:none;display:flex;flex-direction:column;align-items:center}
.waQrBox{position:relative;background:#fff;border:1px solid #eef1f3;box-shadow:0 4px 18px rgba(16,40,60,.07);border-radius:14px;padding:22px;display:flex;align-items:center;justify-content:center;min-width:284px;min-height:284px}
.waQrBox img{width:240px;height:240px;display:block}
.waQrBox .wasp{position:absolute;inset:0;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;border-radius:14px}
.waPairSt{margin-top:14px;font-size:13.5px;color:#3b4f5c;text-align:center;min-height:20px;line-height:1.45}
.waPairSt.ok{color:#00a884;font-weight:600}
.waPairSt.bad{color:#c0392b}
.waPairLinks{margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.waPairLinks button{background:none;border:none;color:#00a884;font-size:13px;font-weight:600;cursor:pointer;padding:4px 6px}
.waPairLinks button:hover{text-decoration:underline}
.waPairFoot{margin-top:18px;font-size:12px;color:#9db0bb;text-align:center}
.waForm{width:100%;display:flex;flex-direction:column;gap:12px}
.waForm label{display:block;font-size:12.5px;font-weight:600;color:#42586b}
.waForm .in{margin-top:5px;background:#f5f7f8;border:1px solid #dfe6ea;border-radius:10px;color:#111b21}
.waFormRow{display:flex;gap:10px}
.waFormRow>*{flex:1}
@media(max-width:860px){.waPairCard{flex-direction:column;padding:24px}.waPairR{width:100%}}
/* ---------- main shell ---------- */
.waShell{display:flex;height:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e6ea;box-shadow:0 8px 26px rgba(16,40,60,.07)}
.waL{width:390px;flex:none;border-right:1px solid #e9edef;display:flex;flex-direction:column;background:#fff;min-width:0}
.waLh{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #f0f2f5}
.waMe{display:flex;align-items:center;gap:10px;flex:1;min-width:0;cursor:pointer;border-radius:10px;padding:2px}
.waMe:hover{background:#f5f6f6}
.waMe b{display:block;font-size:14.5px;color:#111b21;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.waPill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:#54656f;font-weight:600}
.waPill .dot{width:7px;height:7px;border-radius:50%;background:#8696a0;flex:none}
.waPill.ok .dot{background:#25d366}.waPill.warn .dot{background:#f0a30a}.waPill.bad .dot{background:#e54242}
.waHb{width:34px;height:34px;border:none;background:none;border-radius:50%;color:#54656f;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative}
.waHb:hover{background:#f0f2f5}
.waHb.on{background:#e7f7f1;color:#00a884}
.waRunTag{display:inline-flex;align-items:center;gap:6px;background:#e7f7f1;color:#008069;font-size:12px;font-weight:700;border:none;border-radius:999px;padding:6px 12px;cursor:pointer}
.waSearch{padding:8px 12px;display:flex;align-items:center;gap:8px;background:#fff}
.waSearch .wsi{flex:1;display:flex;align-items:center;gap:9px;background:#f0f2f5;border-radius:9px;padding:7px 12px;color:#54656f}
.waSearch input{border:none;background:none;outline:none;font:inherit;font-size:14px;color:#111b21;width:100%}
.waChips{display:flex;gap:8px;padding:2px 12px 10px;flex-wrap:wrap}
.waChip{border:none;background:#f0f2f5;color:#54656f;font-size:12.5px;font-weight:600;border-radius:999px;padding:6px 13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.waChip.on{background:#d9fdd3;color:#0a6e58}
.waList{flex:1;overflow-y:auto;background:#fff}
.waRow{display:flex;gap:12px;padding:10px 14px;cursor:pointer;align-items:center;min-width:0}
.waRow:hover{background:#f5f6f6}
.waRow.on{background:#f0f2f5}
.waAv{width:47px;height:47px;border-radius:50%;color:#fff;font-weight:700;font-size:18px;display:flex;align-items:center;justify-content:center;flex:none}
.waAv.sm{width:38px;height:38px;font-size:15px}
.waRowM{flex:1;min-width:0;border-bottom:1px solid #f0f2f5;padding-bottom:10px;display:flex;flex-direction:column;gap:3px}
.waRow:last-child .waRowM{border-bottom:none}
.waRowT{display:flex;align-items:baseline;gap:8px}
.waRowT b{flex:1;font-size:14.5px;color:#111b21;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.waRowT span{font-size:11.5px;color:#667781;flex:none}
.waRowP{display:flex;align-items:center;gap:5px;font-size:13px;color:#667781;white-space:nowrap;overflow:hidden}
.waRowP .pv{flex:1;overflow:hidden;text-overflow:ellipsis}
.waRowP .tick{color:#8696a0;display:inline-flex;flex:none}
.waRowP .tick.read{color:#53bdeb}
.waUn{background:#25d366;color:#fff;font-size:11.5px;font-weight:700;border-radius:999px;min-width:19px;height:19px;padding:0 6px;display:flex;align-items:center;justify-content:center;flex:none}
.waSecLbl{padding:12px 16px 6px;font-size:12px;font-weight:700;color:#8aa0ad;letter-spacing:.4px}
.waListEmpty{padding:34px 22px;text-align:center;color:#8aa0ad;font-size:13.5px;line-height:1.6}
.waListEmpty svg{color:#c3d0d8;margin-bottom:8px}
/* ---------- new chat picker ---------- */
.waPickerH{display:flex;align-items:center;gap:8px;padding:14px;border-bottom:1px solid #f0f2f5}
.waPickerH b{font-size:16px;color:#111b21}
.waPickRow{display:flex;gap:12px;padding:9px 14px;cursor:pointer;align-items:center}
.waPickRow:hover{background:#f5f6f6}
.waPickM{flex:1;min-width:0}
.waPickM b{display:block;font-size:14px;color:#111b21;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.waPickM small{color:#667781;font-size:12px}
.waTag{font-size:11px;font-weight:700;border-radius:999px;padding:3px 9px;background:#f0f2f5;color:#54656f;flex:none}
.waTag.s-Active{background:#d9fdd3;color:#0a6e58}
.waTag.s-Inactive,.waTag.s-Suspended{background:#fff3d6;color:#8a6d1a}
.waTag.s-Left{background:#fde3e3;color:#a03030}
/* ---------- broadcast composer ---------- */
.waBc{display:flex;flex-direction:column;height:100%}
.waBcH{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #f0f2f5}
.waBcH b{font-size:15.5px;color:#111b21}
.waBcBody{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:12px}
.waSeg{display:flex;background:#f0f2f5;border-radius:10px;padding:3px;gap:3px}
.waSeg button{flex:1;border:none;background:none;font:inherit;font-size:13px;font-weight:600;color:#54656f;border-radius:8px;padding:7px 4px;cursor:pointer}
.waSeg button.on{background:#fff;color:#008069;box-shadow:0 1px 3px rgba(16,40,60,.14)}
.waLbl{font-size:12px;font-weight:700;color:#54656f;letter-spacing:.3px}
.waIn{width:100%;border:1px solid #dfe6ea;background:#f5f7f8;border-radius:10px;padding:9px 12px;font:inherit;font-size:14px;color:#111b21;outline:none}
.waIn:focus{border-color:#00a884;background:#fff}
.waChk{display:flex;align-items:center;gap:8px;font-size:13px;color:#3b4f5c;cursor:pointer}
.waSees{display:flex;flex-wrap:wrap;gap:6px}
.waSee{display:inline-flex;flex-direction:column;font-size:12px;padding:4px 10px;border-radius:9px;background:#f0f2f5;color:#111b21}
.waSee small{color:#8aa0ad;font-size:10.5px}
.waSee.off{opacity:.5}
.waBcMsg{min-height:88px;resize:vertical;font:inherit}
.waVarRow{display:flex;flex-wrap:wrap;gap:6px}
.waVarRow button{border:1px dashed #b8c5ce;background:#f7fafb;color:#008069;font-size:11.5px;font-weight:600;border-radius:7px;padding:3px 8px;cursor:pointer}
.waVarRow button:hover{background:#e7f7f1}
.waFileChip{display:flex;align-items:center;gap:8px;background:#f0f2f5;border-radius:10px;padding:8px 12px;font-size:13px;color:#111b21}
.waFileChip button{border:none;background:none;cursor:pointer;color:#e54242;display:flex}
.waBcFoot{border-top:1px solid #f0f2f5;padding:12px 14px;display:flex;align-items:center;gap:12px}
.waBcFoot .cnt{flex:1;font-size:13.5px;color:#3b4f5c}
.waBcFoot .cnt b{color:#008069}
.waGo{border:none;background:#00a884;color:#fff;font:inherit;font-size:14px;font-weight:700;border-radius:999px;padding:10px 22px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.waGo:hover{background:#017a61}
.waGo:disabled{background:#b8c5ce;cursor:not-allowed}
/* ---------- conversation ---------- */
.waR{flex:1;min-width:0;display:flex;flex-direction:column;background:#efeae2}
.waConvH{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#f0f2f5;border-left:1px solid #e9edef;flex:none}
.waConvH .nm{flex:1;min-width:0;cursor:pointer}
.waConvH .nm b{display:block;font-size:15px;color:#111b21;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.waConvH .nm small{display:block;font-size:12px;color:#667781;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.waMsgs{flex:1;overflow-y:auto;padding:18px 5% 12px;background:#efeae2;background-image:radial-gradient(rgba(120,140,150,.055) 1.1px,transparent 1.1px);background-size:22px 22px;display:flex;flex-direction:column}
.waDay{align-self:center;background:#fff;color:#54656f;font-size:12px;font-weight:600;border-radius:8px;padding:6px 12px;margin:10px 0 6px;box-shadow:0 1px 2px rgba(16,40,60,.12);letter-spacing:.3px}
.waB{max-width:68%;border-radius:8px;padding:6px 8px 7px 10px;margin:2px 0;font-size:14.2px;line-height:1.45;color:#111b21;box-shadow:0 1px .6px rgba(11,20,26,.14);word-wrap:break-word;position:relative}
.waB.in{background:#fff;align-self:flex-start;border-top-left-radius:2px}
.waB.out{background:#d9fdd3;align-self:flex-end;border-top-right-radius:2px}
.waB.sys{align-self:center;background:#fff;color:#8aa0ad;font-size:12.5px;font-style:italic;max-width:85%}
.waB a{color:#027eb5}
.waMeta{display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:11px;color:#667781;margin-top:2px}
.waMeta .tick{display:inline-flex;color:#8696a0}
.waMeta .tick.read{color:#53bdeb}
.waMeta .tick.fail{color:#e54242;font-weight:700}
.waAuthor{font-size:12.5px;font-weight:700;color:#027eb5;margin-bottom:1px}
.waMed{display:flex;align-items:center;gap:10px;background:rgba(0,0,0,.045);border-radius:9px;padding:10px 12px;font-size:13px;color:#3b4f5c;cursor:pointer;margin:2px 0 4px;max-width:330px}
.waMed:hover{background:rgba(0,0,0,.07)}
.waMed .mic{width:34px;height:34px;border-radius:50%;background:#00a884;color:#fff;display:flex;align-items:center;justify-content:center;flex:none}
.waMedWrap img{max-width:330px;max-height:340px;border-radius:9px;display:block;cursor:pointer}
.waMedWrap video{max-width:330px;border-radius:9px;display:block}
.waMedWrap audio{width:300px;display:block;margin:2px 0}
.waLoad{align-self:center;color:#8aa0ad;font-size:13px;padding:30px 0}
.waLoadErr{align-self:center;background:#fff;color:#a03030;font-size:13px;border-radius:10px;padding:12px 16px;margin:20px 0;text-align:center;box-shadow:0 1px 2px rgba(16,40,60,.1)}
.waOpt{display:flex;align-items:center;gap:10px;background:#d3f1e7;border-radius:10px;padding:9px 14px;font-size:13px;color:#0a6e58;margin:4px 0;align-self:center}
/* ---------- composer ---------- */
.waComp{display:flex;align-items:flex-end;gap:8px;padding:8px 12px;background:#f0f2f5;flex:none;position:relative}
.waCompTx{flex:1;background:#fff;border-radius:10px;display:flex;align-items:flex-end;min-width:0}
.waCompTx textarea{flex:1;border:none;outline:none;background:none;font:inherit;font-size:14.5px;color:#111b21;padding:11px 14px;resize:none;max-height:120px;min-height:42px;line-height:1.4}
.waSendB{width:44px;height:44px;border:none;border-radius:50%;background:#00a884;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}
.waSendB:hover{background:#017a61}
.waSendB.dim{background:#dfe6ea;color:#a5b3bd;cursor:default}
.waAttachM{position:absolute;bottom:60px;left:12px;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(16,40,60,.18);padding:8px;display:none;flex-direction:column;min-width:210px;z-index:40}
.waAttachM.on{display:flex}
.waAttachM button{display:flex;align-items:center;gap:10px;border:none;background:none;font:inherit;font-size:13.5px;color:#111b21;padding:9px 12px;border-radius:9px;cursor:pointer}
.waAttachM button:hover{background:#f0f2f5}
.waCompHint{padding:0 12px 6px;background:#f0f2f5;font-size:11px;color:#8aa0ad;flex:none}
/* ---------- empty state ---------- */
.waEmpty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;color:#54656f;background:#f0f2f5;border-left:1px solid #e9edef}
.waEmpty .big{width:150px;height:150px;border-radius:50%;background:#d9fdd3;color:#00a884;display:flex;align-items:center;justify-content:center;margin-bottom:22px}
.waEmpty h3{font-size:30px;font-weight:300;color:#41525d;margin:0 0 12px}
.waEmpty p{font-size:14px;color:#667781;max-width:480px;line-height:1.65;margin:0 0 8px}
.waEmpty .tips{margin-top:14px;font-size:13px;color:#667781;line-height:1.9;text-align:left;background:#fff;border-radius:12px;padding:14px 20px;box-shadow:0 1px 3px rgba(16,40,60,.1)}
.waEmpty .tips b{color:#008069}
/* ---------- broadcast run panel ---------- */
.waRunH{background:#fff;border-left:1px solid #e9edef;padding:16px 20px;flex:none;border-bottom:1px solid #e9edef}
.waRunH .rt{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.waRunH b{font-size:15.5px;color:#111b21}
.waRunH .rn{font-size:13px;color:#54656f;font-weight:600;white-space:nowrap}
.waBar{height:8px;border-radius:999px;background:#e2e6ea;overflow:hidden;margin:12px 0 6px}
.waBar i{display:block;height:100%;background:#00a884;border-radius:999px;transition:width .4s}
.waRunMsgs{flex:1;overflow-y:auto;padding:16px 5% 12px;background:#efeae2;background-image:radial-gradient(rgba(120,140,150,.055) 1.1px,transparent 1.1px);background-size:22px 22px;display:flex;flex-direction:column}
.waRunActs{background:#f0f2f5;border-left:1px solid #e9edef;padding:10px 16px;display:flex;gap:10px;align-items:center;flex:none}
.waRunActs .btn{background:#fff;border:1px solid #dfe6ea}
.waErrs{background:#fff;border-radius:10px;margin-top:10px;max-height:130px;overflow:auto;font-size:12.5px}
.waErrs div{padding:7px 12px;border-bottom:1px solid #f5f6f6;color:#a03030}
.waErrs div b{color:#111b21}
/* ---------- mobile ---------- */
@media(max-width:860px){
  .waShell{border-radius:0;border:none}
  #waApp{padding:0!important}
  .waL{width:100%;border-right:none}
  .waR,.waEmpty{border-left:none}
  #waApp.wapm .waL{display:none}
  #waApp:not(.wapm) .waR{display:none}
  #waApp:not(.wapm) .waEmpty{display:none}
  .waB{max-width:82%}
  .waMsgs{padding:14px 3.5% 10px}
}
`;
(function () { const st = document.createElement("style"); st.textContent = WA_CSS; document.head.appendChild(st); })();

/* ----- config + history storage (unchanged keys, per TuitionPro account) ----- */
const waKey = () => "tp_wa_" + ((ME && ME.id) || "demo");
function waLoad() {
  const acct = (ME && ME.id) || "demo";
  if (WA._acct === acct) return;
  WA._acct = acct;
  try { WA.cfg = Object.assign(WA.cfg, JSON.parse(localStorage.getItem(waKey() + "_cfg") || "{}")); } catch (e) {}
  try { WA.log = JSON.parse(localStorage.getItem(waKey() + "_log") || "[]"); } catch (e) { WA.log = []; }
  WA.conn = { st: "", phone: "", push: "" }; WA.chats = []; WA.msgs = {}; WA.chat = "";
}
function waSaveCfg() { try { localStorage.setItem(waKey() + "_cfg", JSON.stringify(WA.cfg)); } catch (e) {} }
function waSaveLog() { try { localStorage.setItem(waKey() + "_log", JSON.stringify(WA.log.slice(0, 200))); } catch (e) {} }

/* ----- shared helpers ----- */
const waBase = () => { let u = String(WA.cfg.url || "").trim().replace(/\/+$/, ""); return u && !/\/api$/i.test(u) ? u + "/api" : u; };
const waReady = () => Boolean(waBase() && WA.cfg.key && WA.cfg.session);
const waSleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waSid = () => encodeURIComponent(WA.cfg.session);
// "01712345678" / "1712345678" / "+880…" -> "8801712345678@c.us" using the country code from settings
function waPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  const cc = String(WA.cfg.cc || "").replace(/\D/g, "");
  if (cc && d.startsWith("0")) d = cc + d.slice(1);
  else if (cc && d.length <= 10 && !d.startsWith(cc)) d = cc + d;
  return d.length >= 8 && d.length <= 15 ? d + "@c.us" : "";
}
const waDigits = (id) => { const m = String(id || "").split("@")[0].replace(/\D/g, ""); return m || ""; };
function waStuForChat(id) {
  const d = waDigits(id); if (!d) return null;
  return DB.Students.find((s) => { const n = waDigits(waPhone(s.phone)); return n && (n === d || (n.length > 9 && d.length > 9 && n.slice(-9) === d.slice(-9))); }) || null;
}
function waVarVal(s, k) {
  if (k === "name") return s.name || "";
  if (k === "sid") return s.sid || "";
  if (k === "class") return clsLabel(stuClass(s));
  if (k === "batch") { const b = batchOf(s); return b ? bLabel(b) : "Unassigned"; }
  return s[k] || "";
}
const waFill = (t, s) => String(t || "").replace(/\{(\w+)\}/gi, (m, k) => (WA_VARS.includes(k.toLowerCase()) ? waVarVal(s, k.toLowerCase()) : m));
async function waCall(path, opts = {}) {
  let r;
  try { r = await fetch(waBase() + path, Object.assign({ headers: { "X-API-Key": WA.cfg.key, "Content-Type": "application/json" } }, opts)); }
  catch (e) { throw new Error("Cannot reach the gateway (" + e.message + "). Check the gateway URL and that it is up."); }
  let j = null;
  try { j = await r.json(); } catch (e) {}
  if (!r.ok) {
    const e = new Error((j && (j.message || j.error)) || "Gateway error (HTTP " + r.status + ")");
    e.status = r.status; e.retry = Number(r.headers && r.headers.get("Retry-After")) || 0;
    if (r.status === 401) e.msg = "The gateway rejected the API key.";
    throw e;
  }
  return j;
}
const waListResp = (j) => (Array.isArray(j) ? j : (j && (j.items || j.data || j.sessions)) || []);
const waMediaKind = (mt) => (mt.startsWith("image/") ? "send-image" : mt.startsWith("video/") ? "send-video" : mt.startsWith("audio/") ? "send-audio" : "send-document");
async function waSendOne(s, msg, file) { return waSendChat(waPhone(s.phone), msg, file); }
async function waSendChat(chatId, msg, file) {
  if (!chatId) throw new Error("No phone number");
  if (file) {
    const body = { chatId, base64: file.b64, mimetype: file.mimetype, filename: file.filename };
    if (msg && msg.length <= 1024) body.caption = msg;
    await waCall("/sessions/" + waSid() + "/messages/" + waMediaKind(file.mimetype), { method: "POST", body: JSON.stringify(body) });
    if (msg && msg.length > 1024) await waCall("/sessions/" + waSid() + "/messages/send-text", { method: "POST", body: JSON.stringify({ chatId, text: msg }) });
  } else {
    await waCall("/sessions/" + waSid() + "/messages/send-text", { method: "POST", body: JSON.stringify({ chatId, text: msg }) });
  }
}
function waLogAdd(o) {
  WA.log.unshift(Object.assign({ ts: new Date().toISOString(), name: "", sid: "", phone: "", kind: "text", file: "", ok: 1, err: "", label: "" }, o));
  WA.log = WA.log.slice(0, 200);
  waSaveLog();
}
const waMediaType = (t) => ({ image: "Photo", video: "Video", audio: "Audio", voice: "Voice message", document: "Document", sticker: "Sticker", location: "Location", contact: "Contact card", poll: "Poll", call: "Call", revoked: "Deleted message", order: "Order", product: "Product" }[t] || "");
const waLinkify = (t) => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");
function waTime(ts) {
  if (!ts) return "";
  const d = new Date(ts * 1000), n = new Date();
  if (d.toDateString() === n.toDateString()) return t12(d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"));
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + (d.getFullYear() !== n.getFullYear() ? " " + d.getFullYear() : "");
}
function waDay(ts) {
  const d = new Date(ts * 1000), n = new Date();
  if (d.toDateString() === n.toDateString()) return "TODAY";
  const y = new Date(n); y.setDate(n.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}
function waTicks(status) {
  if (status === "failed") return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#e54242" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9" stroke-width="1.8"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>';
  if (status === "pending") return waI("clock", 14);
  const col = status === "read" ? "#53bdeb" : "currentColor";
  const dbl = status === "delivered" || status === "read";
  return `<svg viewBox="0 0 28 20" width="17" height="13" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11.5l4.2 4.5L15.5 5"/>${dbl ? '<path d="M10.5 11.5l4.2 4.5L24 5.5"/>' : ""}</svg>`;
}

/* ----- page painting + height fitting ----- */
function waFit() {
  const app = $("#waApp"); if (!app) return;
  const r = app.getBoundingClientRect();
  app.style.height = Math.max(420, window.innerHeight - r.top - 12) + "px";
}
function vWa() {
  const v = $("#view");
  v.innerHTML = '<div id="waApp" style="padding:9px"><div class="waAppIn" id="waAppIn"><div class="waBoot"><div class="ring"></div></div></div></div>';
  waFit();
  waPaint();
}
if (!window._waFitHook) { window._waFitHook = true; window.addEventListener("resize", () => { if (route !== "wa") return; waFit(); const bk = $("#waBack"); if (bk) bk.style.display = innerWidth <= 860 ? "" : "none"; }); }
async function waPaint() {
  const box = $("#waAppIn"); if (!box || route !== "wa") return;
  if (waReady() && !WA.conn.st) { await waEnsureConn(); if ($("#waAppIn") !== box) return; }
  if (!WA.cfg.url || !WA.cfg.key) { box.innerHTML = waPairHtml("form"); return; }
  if (!WA.cfg.session) { box.innerHTML = waPairHtml("pick"); waPairPickInit(); return; }
  if (WA.conn.st === "ready") {
    box.innerHTML = waShellHtml();
    waDrawList(); waDrawConv(); waConnPill();
    waFetchChats().catch(() => {});
    if (WA.chat && WA.chat !== "__run") { const id = WA.chat; WA.chat = ""; waOpenChat(id); }
    waTickStart();
    return;
  }
  if (WA.conn.st === "offline") { box.innerHTML = waPairHtml("offline"); return; }
  box.innerHTML = waPairHtml("qr");
  waPairPoll();
}
/* status check — polls the session while the page is open (tick engine below) */
async function waEnsureConn() {
  if (!waReady()) return;
  const prev = WA.conn.st;
  try {
    const j = await waCall("/sessions/" + waSid());
    const st = (j && j.status) || "";
    WA.conn = { st, phone: (j && j.phone) || "", push: (j && j.pushName) || "" };
  } catch (e) { WA.conn = { st: "offline", phone: "", push: "", err: e.message || "Gateway unreachable" }; }
  if (route !== "wa") return;
  if (!prev || prev !== WA.conn.st) waPaint();
  else waConnPill();
}
function waConnPill() {
  const el = $("#waConnPill"); if (!el) return;
  const c = WA.conn;
  if (c.st === "ready") { el.className = "waPill ok"; el.innerHTML = '<i class="dot"></i>' + esc(c.push || (c.phone ? "+" + c.phone : "online")); }
  else if (c.st === "offline") { el.className = "waPill bad"; el.innerHTML = '<i class="dot"></i>gateway unreachable'; }
  else { el.className = "waPill warn"; el.innerHTML = '<i class="dot"></i>' + esc(WA_ST_LABEL[c.st] || "checking…"); }
}

/* ----- pairing / QR screen (web.whatsapp.com look) ----- */
function waPairHtml(mode) {
  const step = (n, t, s) => `<div class="waStep"><i>${n}</i><div>${t}${s ? "<small>" + s + "</small>" : ""}</div></div>`;
  let right = "";
  if (mode === "form") {
    right = `<form class="waForm" onsubmit="waPairConnect(event)">
     <label>OpenWA gateway URL<input class="in" id="wa_u" placeholder="https://wa.yourdomain.com" value="${esc(WA.cfg.url)}" autocomplete="off"></label>
     <label>API key<input class="in" id="wa_k" type="password" placeholder="owa_…" value="${esc(WA.cfg.key)}" autocomplete="off"></label>
     <div class="mut" style="font-size:12px;line-height:1.5;color:#8aa0ad">Your gateway URL and API key are stored only in this browser. Use an HTTPS gateway — this page is served over HTTPS and browsers block plain-HTTP gateway calls. See the setup guide for a Caddy/Nginx reverse proxy.</div>
     <div id="wa_pst" class="waPairSt"></div>
     <button class="waGo" style="justify-content:center" type="submit">Connect gateway</button>
    </form>`;
  } else if (mode === "pick") {
    right = `<div class="waForm">
     <label>WhatsApp session<span style="display:flex;gap:8px;margin-top:5px"><select class="in" id="wa_psess" style="flex:1" onchange="waPairPickSave()"><option value="">Loading sessions…</option></select></span></label>
     <div id="wa_pst" class="waPairSt"></div>
     <div class="waFormRow">
      <button class="waGo" style="justify-content:center;background:#fff;color:#008069;border:1px solid #cfe8df" type="button" onclick="waPairNewSess()">New session</button>
      <button class="waGo" style="justify-content:center" type="button" onclick="waPairGo()">Continue</button>
     </div>
     <button class="btn" style="align-self:center" onclick="waPairBack()">← Change gateway</button>
    </div>`;
  } else if (mode === "offline") {
    right = `<div class="waForm" style="align-items:center;text-align:center;gap:10px">
     <div style="width:62px;height:62px;border-radius:50%;background:#fde3e3;color:#a03030;display:flex;align-items:center;justify-content:center">${waI("x", 28)}</div>
     <b style="font-size:17px;color:#243f4d">Could not reach the WhatsApp session</b>
     <div class="waPairSt bad">${esc(WA.conn.err || "The gateway is unreachable, or the session no longer exists.")}</div>
     <div class="waFormRow" style="width:100%;margin-top:6px">
      <button class="waGo" style="justify-content:center;background:#fff;color:#008069;border:1px solid #cfe8df" onclick="waEnsureConn()">Try again</button>
      <button class="waGo" style="justify-content:center" onclick="waPairBack()">Pick a session</button>
     </div>
     <button class="btn" style="align-self:center" onclick="waSettings()">Gateway settings</button>
    </div>`;
  } else {
    right = `<div class="waQrBox" id="waQrA"><div class="wasp"><div class="ring"></div></div></div>
     <div class="waPairSt" id="wa_pst">Starting the session…</div>
     <div class="waPairLinks"><button onclick="waEnsureConn()">Refresh</button><button onclick="waPairBack()">Change session</button><button onclick="waSettings()">Gateway settings</button></div>`;
  }
  return `<div class="waPair" style="padding:9px">
   <div class="waPairCard">
    <div class="waPairL">
     <h2>Use WhatsApp in TuitionPro<br>with your own number</h2>
     <p>Message students, guardians and groups from the same window where you manage your tuition — and broadcast to a whole batch in one go.</p>
     ${mode === "form" ? step(1, "Enter your OpenWA gateway", "The self-hosted WhatsApp gateway you installed from the setup guide") + step(2, "Link your phone by QR code", "WhatsApp → Settings → Linked devices → Link a device") + step(3, "Start chatting", "Chats, replies and broadcasts all appear here") : mode === "offline" ? step(1, "Check the gateway", "Is the OpenWA server running and reachable at your URL?") + step(2, "Check the session", "The linked session may have been deleted, or the API key was rejected") + step(3, "Reconnect", "Pick a session again and scan the QR code") : step(1, "Open WhatsApp on your phone", "") + step(2, "Go to <b>Settings → Linked devices → Link a device</b>", "") + step(3, "Point your phone at the QR code on the right", "The QR code refreshes by itself — keep this window open")}
     <div class="waPairNote">TuitionPro talks to WhatsApp through <b>your own OpenWA gateway</b> — messages go directly from your gateway to WhatsApp, nothing passes through any third party. The linked device stays connected until you log it out on the phone.</div>
    </div>
    <div class="waPairR">${right}</div>
   </div>
   <div class="waPairFoot">Self-hosted with OpenWA · WhatsApp is a trademark of Meta Platforms, Inc.</div>
  </div>`;
}
async function waPairConnect(e) {
  e.preventDefault();
  WA.cfg.url = $("#wa_u").value.trim().replace(/\/+$/, "");
  WA.cfg.key = $("#wa_k").value.trim();
  const st = $("#wa_pst");
  if (!WA.cfg.url || !WA.cfg.key) { st.className = "waPairSt bad"; st.textContent = "Enter both the gateway URL and the API key."; return; }
  st.textContent = "Connecting to the gateway…";
  try {
    const L = waListResp(await waCall("/sessions"));
    WA.sess = L;
    waSaveCfg();
    WA.conn = { st: "", phone: "", push: "" };
    waPaint();
  } catch (err) { st.className = "waPairSt bad"; st.textContent = err.message + (err.status === 401 ? " Check the API key." : ""); }
}
async function waPairPickInit() {
  const sel = $("#wa_psess"); if (!sel) return;
  try {
    if (!WA.sess.length) WA.sess = waListResp(await waCall("/sessions"));
    sel.innerHTML = '<option value="">Select a session</option>' + WA.sess.map((s) => `<option value="${esc(s.id)}" ${s.id === WA.cfg.session ? "selected" : ""}>${esc(s.name || s.id)}${s.status === "ready" ? " · connected" + (s.phone ? " (+" + s.phone + ")" : "") : ""}</option>`).join("") + '<option value="__new">+ Create a new session…</option>';
    if (WA.cfg.session) { waPairGo(); return; }
    $("#wa_pst").textContent = "Pick the WhatsApp session to link, then continue.";
  } catch (e) { $("#wa_pst").className = "waPairSt bad"; $("#wa_pst").textContent = e.message; }
}
function waPairPickSave() {
  const v = $("#wa_psess").value;
  if (v === "__new") { waPairNewSess(); return; }
  WA.cfg.session = v; waSaveCfg();
  $("#wa_pst").textContent = v ? "Session selected — press Continue to link the phone." : "Pick the WhatsApp session to link, then continue.";
}
async function waPairNewSess() {
  const name = prompt("Name for the new WhatsApp session", "tuitionpro");
  if (!name) { const s = $("#wa_psess"); if (s) s.value = WA.cfg.session || ""; return; }
  const st = $("#wa_pst"); if (st) { st.className = "waPairSt"; st.textContent = "Creating session…"; }
  try {
    const j = await waCall("/sessions", { method: "POST", body: JSON.stringify({ name }) });
    WA.cfg.session = (j && j.id) || "";
    waSaveCfg();
    WA.conn = { st: "", phone: "", push: "" };
    waPaint();
  } catch (e) { if (st) { st.className = "waPairSt bad"; st.textContent = e.message; } }
}
function waPairGo() { if (!WA.cfg.session) { toast("Select a session first"); return; } WA.conn = { st: "", phone: "", push: "" }; waSaveCfg(); waPaint(); }
function waPairBack() { WA.cfg.session = ""; WA.conn = { st: "", phone: "", push: "" }; waSaveCfg(); waPaint(); }
async function waPairPoll() {
  const box = $("#waQrA"); if (!box) return; // screen replaced — stop polling
  const st = $("#wa_pst");
  try {
    const j = await waCall("/sessions/" + waSid());
    const s = (j && j.status) || "";
    if (s === "ready") { WA.conn = { st: "ready", phone: (j && j.phone) || "", push: (j && j.pushName) || "" }; waPaint(); return; }
    if (["created", "disconnected", "failed"].includes(s)) await waCall("/sessions/" + waSid() + "/start", { method: "POST" }).catch(() => {});
    if (st) { st.className = "waPairSt"; st.textContent = s === "authenticating" ? "Checking the code with WhatsApp…" : WA_ST_LABEL[s] || "Waiting…"; }
    const q = await waCall("/sessions/" + waSid() + "/qr").catch(() => null);
    const data = (q && (q.qrCode || (q.data && q.data.qrCode) || q.qr || q.qrcode)) || "";
    if (data.startsWith("data:image")) box.innerHTML = `<img src="${data}" alt="WhatsApp QR code">`;
    else if (data) {
      await lib("qr");
      const b2 = $("#waQrA");
      if (b2 && window.QRCode) { b2.innerHTML = ""; new QRCode(b2, { text: data, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M }); }
    } else box.innerHTML = `<div class="wasp"><div class="ring"></div></div>`;
  } catch (e) {
    if (st) { st.className = "waPairSt bad"; st.textContent = e.message; }
    box.innerHTML = "";
  }
  setTimeout(waPairPoll, 2500);
}

/* ----- main shell (chat list + conversation) ----- */
function waShellHtml() {
  const me = WA.conn.push || (WA.conn.phone ? "+" + WA.conn.phone : "WhatsApp");
  return `<div class="waShell" id="waShell">
   <aside class="waL" id="waL">
    <header class="waLh">
     <div class="waMe" onclick="waSettings()" title="WhatsApp settings"><div class="waAv sm" style="background:${waAvColor(ME.name)}">${init(ME.name || me)}</div><div style="min-width:0"><b>${esc(me)}</b><span class="waPill" id="waConnPill"><i class="dot"></i>online</span></div></div>
     <span style="display:flex;gap:2px;align-items:center">
      ${WA.run && !WA.run.done ? '<button class="waRunTag" onclick="waViewRun()">' + waI("bc", 14) + ' Broadcast</button>' : ""}
      <button class="waHb" title="New chat" onclick="waNewChatOpen()">${waI("pencil")}</button>
      <button class="waHb" title="New broadcast" onclick="waBcOpen()">${waI("bc")}</button>
      <button class="waHb" title="Sent history" onclick="waLogModal()">${waI("clock")}</button>
      <button class="waHb" title="Settings" onclick="waSettings()">${waI("gear")}</button>
     </span>
    </header>
    <div class="waSearch"><div class="wsi">${waI("search", 17)}<input id="waQ" placeholder="Search or start a new chat" value="${esc(WA.q)}" oninput="WA.q=this.value;waDrawList()"></div></div>
    <div class="waChips" id="waChips"></div>
    <div class="waList" id="waList"></div>
   </aside>
   <main class="waR" id="waR"></main>
  </div>`;
}
function waChatsVis() {
  let L = WA.chats.filter((c) => c.kind !== "status" && c.kind !== "unknown");
  const q = String(WA.q || "").trim().toLowerCase();
  if (q) L = L.filter((c) => [waChatLabel(c), c.id, c.phone || "", (waStuForChat(c.id) || {}).sid].join(" ").toLowerCase().includes(q));
  if (WA.filt === "unread") L = L.filter((c) => (c.unreadCount || 0) > 0);
  if (WA.filt === "students") L = L.filter((c) => waStuForChat(c.id));
  if (WA.filt === "groups") L = L.filter((c) => c.kind === "group");
  return L.sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || ((b.timestamp || 0) - (a.timestamp || 0)));
}
function waChatLabel(c) {
  const s = waStuForChat(c.id);
  if (s) return s.name;
  return c.name || (c.phone ? "+" + c.phone : "") || waDigits(c.id) || c.id || "Unknown";
}
function waChatSub(c) {
  const s = waStuForChat(c.id);
  if (s) {
    const b = batchOf(s);
    return (s.sid ? esc(s.sid) + " · " : "") + (b ? esc(bLabel(b)) + " · " : "") + esc(s.status || "");
  }
  if (c.kind === "group") return "Group";
  return c.phone ? "+" + esc(c.phone) : esc(waDigits(c.id) || "");
}
function waRowHtml(c) {
  const s = waStuForChat(c.id);
  const name = waChatLabel(c);
  const lm = c.lastMessage || waMediaType(c.lastMessageType) || "";
  const you = lm && c.lastMessageType && ["image", "video", "audio", "voice", "document", "sticker"].includes(c.lastMessageType) && !c.lastMessage;
  const prev = (you ? "" : "") + lm;
  const un = c.unreadCount || 0;
  return `<div class="waRow${WA.chat === c.id ? " on" : ""}" onclick="waOpenChat('${esc(c.id)}')">
   <div class="waAv" style="background:${waAvColor(name)}">${init(name)}</div>
   <div class="waRowM">
    <div class="waRowT"><b>${esc(name)}${c.pinned ? " " + waI("pin", 13) : ""}</b><span>${waTime(c.timestamp)}</span></div>
    <div class="waRowP">${prev ? '<span class="pv">' + esc(prev) + "</span>" : '<span class="pv" style="color:#8aa0ad">' + esc(waChatSub(c)) + "</span>"}${un ? `<span class="waUn">${un > 99 ? "99+" : un}</span>` : ""}</div>
   </div>
  </div>`;
}
function waDrawChips() {
  const el = $("#waChips"); if (!el) return;
  const all = WA.chats.filter((c) => c.kind !== "status" && c.kind !== "unknown");
  const opts = [["all", "All", all.length], ["unread", "Unread", all.filter((c) => (c.unreadCount || 0) > 0).length], ["students", "Students", all.filter((c) => waStuForChat(c.id)).length], ["groups", "Groups", all.filter((c) => c.kind === "group").length]];
  el.innerHTML = opts.map(([k, l, n]) => `<button class="waChip${WA.filt === k ? " on" : ""}" onclick="WA.filt='${k}';waDrawList()">${l}${n ? " " + n : ""}</button>`).join("");
}
function waDrawList() {
  const el = $("#waList"); if (!el) return;
  if (WA.bc) { el.innerHTML = waBcHtml(); waBcRefresh(); return; }
  if (WA.newChat) { el.innerHTML = waPickerHtml(); return; }
  waDrawChips();
  const L = waChatsVis();
  el.innerHTML = L.length ? L.map(waRowHtml).join("") :
    `<div class="waListEmpty">${waI("chatbig", 44)}<br><b>No chats yet</b><br>Once someone messages this number, the chat appears here.<br>You can start one now: tap the pencil icon above and pick a student.</div>`;
}
function waNewChatOpen() { WA.newChat = true; WA.bc = null; waDrawList(); const q = $("#waPq"); if (q) q.focus(); }
function waPickerHtml() {
  const q = String(WA._pq || "").trim().toLowerCase();
  let L = DB.Students.filter((s) => waPhone(s.phone));
  if (q) L = L.filter((s) => [s.name, s.sid, s.phone, s.guardian, s.school].join(" ").toLowerCase().includes(q));
  L.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return `<div class="waPickerH"><button class="waHb" onclick="WA.newChat=false;waDrawList()">${waI("back")}</button><b>New chat</b></div>
  <div class="waSearch"><div class="wsi">${waI("search", 17)}<input id="waPq" placeholder="Search students by name, ID or phone" value="${esc(WA._pq || "")}" oninput="WA._pq=this.value;waDrawList()"></div></div>
  <div class="waList" style="flex:1">
   ${L.length ? '<div class="waSecLbl">TuitionPro students with a phone number</div>' + L.map((s) => `<div class="waPickRow" onclick="waOpenStu('${s.id}')"><div class="waAv sm" style="background:${waAvColor(s.name)}">${init(s.name)}</div><div class="waPickM"><b>${esc(s.name)}</b><small>${esc(s.phone)}${s.guardian ? " · " + esc(s.guardian) : ""}</small></div><span class="waTag s-${esc(s.status)}">${esc(s.status)}</span></div>`).join("") : '<div class="waListEmpty">No students match' + (WA._pq ? "" : " — or none has a phone number yet") + '.</div>'}
  </div>`;
}
async function waOpenStu(id) {
  const s = DB.Students.find((x) => x.id === id);
  if (!s) return;
  const chatId = waPhone(s.phone);
  if (!chatId) { toast("This student has no valid phone number"); return; }
  if (!WA.chats.some((c) => c.id === chatId)) WA.chats.unshift({ id: chatId, name: s.name, kind: "individual", isGroup: false, unreadCount: 0, timestamp: Math.floor(Date.now() / 1000), archived: false, pinned: false, muted: false });
  WA.newChat = false;
  waOpenChat(chatId);
}

/* ----- conversation ----- */
function waConvHeadHtml() {
  if (WA.chat === "__run") return `<div class="waRunH" id="waRunH"></div>`;
  const c = WA.chats.find((x) => x.id === WA.chat) || { id: WA.chat, name: "", kind: "individual" };
  const s = waStuForChat(WA.chat);
  const name = s ? s.name : (c.name || waDigits(WA.chat) || "Chat");
  const sub = s ? (s.sid ? esc(s.sid) + " · " : "") + (batchOf(s) ? esc(bLabel(batchOf(s))) + " · " : "") + esc(s.status || "") : (c.kind === "group" ? "Group" : "+" + waDigits(WA.chat));
  return `<div class="waConvH">
   <button class="waHb" title="Back" onclick="waBackToList()" style="display:none" id="waBack">${waI("back")}</button>
   <div class="waAv sm" style="background:${waAvColor(name)}">${init(name)}</div>
   <div class="nm" onclick="waRefreshChat()" title="Refresh this chat"><b>${esc(name)}</b><small>${sub}</small></div>
   <button class="waHb" title="Refresh messages" onclick="waRefreshChat()">${waI("refresh")}</button>
  </div>`;
}
function waBackToList() { WA.chat = ""; WA.msgs[WA.chat] = null; waDrawConv(); waDrawList(); if ($("#waApp")) $("#waApp").classList.remove("wapm"); }
async function waRefreshChat() { if (WA.chat && WA.chat !== "__run") { await waFetchMsgs(WA.chat); waMarkRead(WA.chat); } }
function waCompHtml() {
  const draft = WA.drafts[WA.chat] || "";
  return `<div id="waFileRow" style="padding:0 12px;background:#f0f2f5;flex:none">${WA.file ? waFileChipHtml() : ""}</div>
  <div class="waComp">
   <div class="waAttachM" id="waAM">
    <button onclick="waPickFile('media')">Photos &amp; videos</button>
    <button onclick="waPickFile('audio')">Audio</button>
    <button onclick="waPickFile('doc')">Document</button>
   </div>
   <button class="waHb" style="width:40px;height:40px" title="Attach" onclick="waToggleAttach()">${waI("clip", 21)}</button>
   <div class="waCompTx"><textarea id="waTx" rows="1" placeholder="Type a message" oninput="waTxInput(this)" onkeydown="waTxKey(event)">${esc(draft)}</textarea></div>
   <button class="waSendB${draft || WA.file ? "" : " dim"}" title="Send" onclick="waChatSend()">${waI("send", 21)}</button>
   <input type="file" id="wa_cf" hidden onchange="waReadFile(event)">
  </div>
  <div class="waCompHint">Enter sends · Shift+Enter adds a new line · attachments up to 45 MB</div>`;
}
function waEmptyHtml() {
  return `<div class="waEmpty">
   <div class="big">${waI("chatbig", 74)}</div>
   <h3>WhatsApp for TuitionPro</h3>
   <p>Send and receive WhatsApp messages with students, guardians and groups — from the same window where you run your tuition.</p>
   <div class="tips">
    <b>Pick a chat</b> on the left — every conversation on your number appears here.<br>
    <b>Pencil icon</b> — start a new chat with any student in your list.<br>
    <b>Megaphone icon</b> — broadcast to a whole class, batch or everyone, one message at a time.
   </div>
  </div>`;
}
function waDrawConv() {
  const r = $("#waR"); if (!r) return;
  if (WA.chat === "__run") { r.innerHTML = waRunPanelHtml(); waDrawRunPanel(); const bk = $("#waBack"); if (bk && innerWidth <= 860) bk.style.display = ""; return; }
  if (!WA.chat) { r.innerHTML = waEmptyHtml(); return; }
  r.innerHTML = waConvHeadHtml() + `<div class="waMsgs" id="waMsgs"></div>` + waCompHtml();
  if (innerWidth <= 860) $("#waBack").style.display = "";
  waDrawMsgs(true);
  const tx = $("#waTx"); if (tx) { tx.value = WA.drafts[WA.chat] || ""; setTimeout(() => tx.focus(), 60); }
}
function waBubblesHtml(msgs) {
  let day = "", out = "";
  (msgs || []).forEach((m) => {
    const ts = m.timestamp || Math.floor(new Date(m.createdAt || Date.now()).getTime() / 1000);
    const d = ts ? waDay(ts) : "";
    if (d && d !== day) { out += `<div class="waDay">${d}</div>`; day = d; }
    out += waBubbleHtml(m, ts);
  });
  const S = WA.send[WA.chat];
  if (S) out += waBubbleHtml({ id: S.key, direction: "outgoing", body: S.body, type: S.kind, timestamp: S.ts, status: S.fail ? "failed" : "pending" }, S.ts);
  return out || '<div class="waLoad">No messages yet — say hello below.</div>';
}
function waBubbleHtml(m, ts) {
  if (m.type === "revoked") return `<div class="waB sys">This message was deleted</div>`;
  const out = m.direction === "outgoing";
  let inner = "", author = "";
  if (m.author && m.chatId && m.chatId.includes("@g.us")) {
    const as = waStuForChat(m.author);
    author = `<div class="waAuthor">${esc(as ? as.name : waDigits(m.author) || "member")}</div>`;
  }
  const mediaTypes = ["image", "video", "audio", "voice", "document", "sticker"];
  if (mediaTypes.includes(m.type)) {
    const lbl = waMediaType(m.type) || "Attachment";
    const key = esc(m.chatId) + "|" + esc(m.id);
    inner = `<div class="waMedWrap" id="mw_${waKeySafe(m.id)}"><div class="waMed" onclick="waLoadMedia('${esc(m.chatId)}','${esc(m.id)}',this,'${esc(m.mediaMimetype || m.type)}')"><span class="mic">${waI(m.type === "image" || m.type === "sticker" ? "image" : m.type === "document" ? "doc" : m.type === "video" ? "video" : "audio", 17)}</span><span>${lbl}${m.mediaMimetype && !m.mediaMimetype.startsWith("image") && m.type === "document" ? "" : " — tap to load"}</span></div></div>`;
  }
  const body = m.body ? `<div>${waLinkify(m.body)}</div>` : "";
  if (!inner && !body) inner = `<div style="color:#8aa0ad;font-style:italic">${waMediaType(m.type) || "Unsupported message"}</div>`;
  const meta = `<div class="waMeta">${m.local && m.status === "pending" ? "sending… " : ""}${new Date(ts * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}${out ? waTicks(m.status || "pending") : ""}</div>`;
  return `<div class="waB ${out ? "out" : "in"}" id="mb_${waKeySafe(m.id)}">${author}${inner}${body}${meta}</div>`;
}
const waKeySafe = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, "_").slice(-40);
function waDrawMsgs(stick) {
  const el = $("#waMsgs"); if (!el || !WA.chat || WA.chat === "__run") return;
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 130;
  el.innerHTML = waBubblesHtml(WA.msgs[WA.chat] || []);
  if (stick || nearBottom) el.scrollTop = el.scrollHeight;
}
async function waOpenChat(id) {
  if (!id) return;
  WA.chat = id; WA.file = null; WA.newChat = false; WA.bc = null;
  if ($("#waApp")) $("#waApp").classList.add("wapm");
  waDrawList(); waDrawConv();
  await waFetchMsgs(id);
  waMarkRead(id);
}
async function waFetchMsgs(id) {
  if (!id || id === "__run") return;
  try {
    const j = await waCall("/sessions/" + waSid() + "/messages?chatId=" + encodeURIComponent(id) + "&limit=80");
    let msgs = ((j && j.messages) || []).slice().reverse(); // newest first -> oldest first
    const S = WA.send[id];
    if (S && msgs.length) {
      const hit = msgs.find((m) => m.direction === "outgoing" && (S.kind === "text" ? (m.body || "") === S.body : m.type === S.kind && (m.timestamp || 0) >= S.ts - 30));
      if (hit) delete WA.send[id];
      else if (Date.now() / 1000 - S.ts > 600) { S.fail = true; } // gateway never recorded it after 10 min
    } else if (S && Date.now() / 1000 - S.ts > 600) S.fail = true;
    WA.msgs[id] = msgs;
    if (WA.chat === id) waDrawMsgs();
  } catch (e) {
    if (WA.chat === id) { const el = $("#waMsgs"); if (el) el.innerHTML = `<div class="waLoadErr"><b>Could not load messages</b><br>${esc(e.message)}<br><br><button class="btn p" onclick="waRefreshChat()">Try again</button></div>`; }
  }
}
async function waMarkRead(id) {
  const c = WA.chats.find((x) => x.id === id);
  if (!c || !(c.unreadCount > 0)) return;
  const ids = (WA.msgs[id] || []).filter((m) => m.direction === "incoming").map((m) => m.waMessageId || m.id).filter(Boolean).slice(0, 100);
  if (!ids.length) return;
  try {
    await waCall("/sessions/" + waSid() + "/chats/read", { method: "POST", body: JSON.stringify({ chatId: id, messageIds: ids }) });
    c.unreadCount = 0;
    waDrawList();
  } catch (e) {}
}

/* ----- composer: typing, attach, send ----- */
function waToggleAttach() { const m = $("#waAM"); if (m) m.classList.toggle("on"); }
document.addEventListener("click", (e) => { const m = $("#waAM"); if (m && m.classList.contains("on") && !e.target.closest("#waAM") && !e.target.closest(".waComp")) m.classList.remove("on"); });
function waPickFile(kind) {
  const inp = $("#wa_cf"); if (!inp) return;
  inp.accept = kind === "media" ? "image/*,video/*" : kind === "audio" ? "audio/*" : "";
  inp.click();
  const m = $("#waAM"); if (m) m.classList.remove("on");
}
function waFileChipHtml() {
  if (!WA.file) return "";
  return `<div class="waFileChip" style="margin:8px 0">${waI(waMediaKind(WA.file.mimetype).replace("send-", "") === "image" ? "image" : waMediaKind(WA.file.mimetype).replace("send-", "") === "video" ? "video" : waMediaKind(WA.file.mimetype).replace("send-", "") === "audio" ? "audio" : "doc", 18)}<span><b>${esc(WA.file.filename)}</b> · ${(WA.file.size / 1048576).toFixed(1)} MB</span><button title="Remove" onclick="waDelFile()">${waI("x", 15)}</button></div>`;
}
function waDelFile() { WA.file = null; const r = $("#waFileRow"); if (r) r.innerHTML = ""; waSendDim(); }
function waSendDim() {
  const b = $("#waApp .waSendB"); if (!b) return;
  const tx = $("#waTx");
  b.classList.toggle("dim", !((tx && tx.value.trim()) || WA.file));
}
function waReadFile(e) {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  if (f.size > WA_MAX) { toast("That file is too big. Keep attachments under 45 MB."); return; }
  const r = new FileReader();
  r.onerror = () => toast("Could not read that file");
  r.onload = () => {
    const d = String(r.result || ""), m = d.match(/^data:([^;]+);base64,([\s\S]*)$/);
    if (!m) { toast("Could not read that file"); return; }
    WA.file = { b64: m[2], mimetype: m[1] || "application/octet-stream", filename: (f.name || "attachment").slice(0, 200), size: f.size };
    const row = $("#waFileRow"); if (row) row.innerHTML = waFileChipHtml();
    waSendDim();
  };
  r.readAsDataURL(f);
}
function waTxInput(tx) {
  WA.drafts[WA.chat] = tx.value;
  tx.style.height = "auto"; tx.style.height = Math.min(tx.scrollHeight, 120) + "px";
  waSendDim();
  if (!WA.chat || WA.chat === "__run") return;
  clearTimeout(WA._tyTo); clearTimeout(WA._tyStop);
  WA._tyTo = setTimeout(() => waType("typing"), 300);
  WA._tyStop = setTimeout(() => waType("paused"), 4200);
}
function waTxKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); waChatSend(); }
}
function waType(state) {
  if (!WA.chat || WA.chat === "__run") return;
  waCall("/sessions/" + waSid() + "/chats/typing", { method: "POST", body: JSON.stringify({ chatId: WA.chat, state }) }).catch(() => {});
}
function waChatSend() {
  const id = WA.chat;
  if (!id || id === "__run") return;
  const tx = $("#waTx");
  const txt = String((tx && tx.value) || "").trim();
  const file = WA.file;
  if (!txt && !file) return;
  if (!file && txt.length > 4096) { toast("WhatsApp messages are limited to 4096 characters"); return; }
  const now = Math.floor(Date.now() / 1000);
  const kind = file ? waMediaKind(file.mimetype).replace("send-", "") : "text";
  const key = "local_" + uid();
  WA.send[id] = { key, body: file ? (txt || file.filename) : txt, kind, ts: now, fail: false };
  const s = waStuForChat(id);
  (WA.msgs[id] = WA.msgs[id] || []).push({ id: key, chatId: id, direction: "outgoing", body: file ? (txt || file.filename) : txt, type: kind, timestamp: now, status: "pending", local: true });
  if (tx) { tx.value = ""; tx.style.height = "auto"; }
  WA.drafts[id] = ""; WA.file = null;
  const row = $("#waFileRow"); if (row) row.innerHTML = "";
  waDrawMsgs(true); waSendDim(); waType("paused");
  const finish = (ok, err) => {
    const S = WA.send[id];
    if (S && S.key === key) {
      if (ok) delete WA.send[id];
      else S.fail = true;
    }
    waDrawMsgs();
    const c = WA.chats.find((x) => x.id === id);
    if (c) { c.lastMessage = file ? (txt || file.filename) : txt; c.lastMessageType = kind; c.timestamp = now; if (!c.name && s) c.name = s.name; }
    waLogAdd({ name: s ? s.name : (c && c.name) || "", sid: s ? s.sid : "", phone: waDigits(id), kind, file: file ? file.filename : "", ok: ok ? 1 : 0, err: err || "", label: "Chat" });
    waDrawList();
    if (!ok) toast("Not sent: " + (err || "error"));
    setTimeout(() => { if (WA.chat === id) { waFetchMsgs(id); } waFetchChats().catch(() => {}); }, 1200);
  };
  waSendChat(id, txt, file).then(() => finish(true)).catch((e) => {
    if (e.status === 429 && e.retry) {
      setTimeout(() => waSendChat(id, txt, file).then(() => finish(true)).catch((e2) => finish(false, e2.message)), Math.min(e.retry, 120) * 1000 + 1000);
    } else finish(false, e.message);
  });
}
async function waLoadMedia(chatId, msgId, el, mime) {
  const key = chatId + "|" + msgId;
  const wrap = document.getElementById("mw_" + waKeySafe(msgId));
  if (!wrap) return;
  let url = WA._media && WA._media[key];
  if (!url) {
    el.innerHTML = '<div class="waMed"><span class="mic"><div class="ring" style="width:14px;height:14px"></div></span><span>Loading…</span></div>';
    try {
      const r = await fetch(waBase() + "/sessions/" + waSid() + "/messages/" + encodeURIComponent(chatId) + "/" + encodeURIComponent(msgId) + "/media", { headers: { "X-API-Key": WA.cfg.key } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const blob = await r.blob();
      url = URL.createObjectURL(blob);
      (WA._media = WA._media || {})[key] = url;
    } catch (e) { el.innerHTML = `<div class="waMed"><span class="mic" style="background:#e54242">${waI("x", 16)}</span><span>Could not load (${esc(e.message)})</span></div>`; return; }
  }
  const isImg = (mime || "").startsWith("image/"), isVid = (mime || "").startsWith("video/"), isAud = (mime || "").startsWith("audio/");
  wrap.innerHTML = isImg ? `<img src="${url}" alt="photo" onclick="window.open('${url}','_blank')">` :
    isVid ? `<video src="${url}" controls></video>` :
    isAud ? `<audio src="${url}" controls></audio>` :
    `<a class="waMed" href="${url}" download style="text-decoration:none"><span class="mic">${waI("doc", 17)}</span><span>Open attachment</span></a>`;
}
/* ----- media click-load cache lives on WA._media ----- */

/* ----- chat list refresh from the gateway ----- */
async function waFetchChats() {
  if (!waReady()) return;
  const j = await waCall("/sessions/" + waSid() + "/chats?limit=250");
  const L = waListResp(j);
  if (Array.isArray(L)) {
    WA.chats = L.map((c) => Object.assign({ unreadCount: 0, kind: "individual", timestamp: 0 }, c));
    if (route === "wa" && !WA.newChat && !WA.bc) waDrawList();
  }
}

/* ----- broadcast composer (megaphone) — whole batch / everyone / picked students ----- */
function waBcOpen() {
  WA.bc = { mode: "batch", cls: "", bat: "", incAll: false, picked: {}, msg: String(WA.bc ? WA.bc.msg : "") };
  WA.newChat = false;
  waDrawList();
}
function waBcClose() { WA.bc = null; waDrawList(); }
function waBcList() {
  const bc = WA.bc; if (!bc) return [];
  let L = [];
  if (bc.mode === "batch") {
    if (bc.bat) L = DB.Students.filter((s) => s.batchId === bc.bat);
    else if (bc.cls) L = DB.Students.filter((s) => { const b = batchOf(s); return b && b.class === bc.cls; });
  } else if (bc.mode === "all") L = DB.Students.slice();
  else L = DB.Students.filter((s) => bc.picked[s.id]);
  return bc.incAll || bc.mode === "pick" ? L : L.filter((s) => s.status === "Active");
}
function waBcStats(L) {
  const ok = L.filter((s) => waPhone(s.phone));
  return { n: L.length, noPhone: L.length - ok.length, dups: ok.length - new Set(ok.map((s) => waPhone(s.phone))).size };
}
function waBcHtml() {
  const bc = WA.bc;
  const used = CLASSES.filter((c) => DB.Batches.some((b) => b.class === c));
  const B = sortBatches(DB.Batches).filter((b) => !bc.cls || b.class === bc.cls);
  const L = waBcList(), stt = waBcStats(L);
  const picks = L.slice(0, 80);
  let pickHtml = "";
  if (bc.mode === "batch") {
    pickHtml = `
     <div class="waLbl">Recipients</div>
     <select class="waIn" onchange="waBcSet('cls',this.value)">
      <option value="">Select class</option>
      ${used.map((c) => `<option value="${esc(c)}" ${bc.cls === c ? "selected" : ""}>${esc(clsLabel(c))}</option>`).join("")}
     </select>
     <select class="waIn" onchange="waBcSet('bat',this.value)" ${bc.cls ? "" : "disabled"}>
      <option value="">All batches in this class</option>
      ${B.map((b) => `<option value="${esc(b.id)}" ${bc.bat === b.id ? "selected" : ""}>${esc(bLabel(b))}</option>`).join("")}
     </select>
     <label class="waChk"><input type="checkbox" ${bc.incAll ? "checked" : ""} onchange="waBcSet('incAll',this.checked)"><span>Include Inactive, Suspended and Left students</span></label>`;
  } else if (bc.mode === "all") {
    pickHtml = `
     <label class="waChk"><input type="checkbox" ${bc.incAll ? "checked" : ""} onchange="waBcSet('incAll',this.checked)"><span>Include Inactive, Suspended and Left students</span></label>`;
  } else {
    const q = String(bc._q || "").trim().toLowerCase();
    let SL = DB.Students.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (q) SL = SL.filter((s) => [s.name, s.sid, s.phone].join(" ").toLowerCase().includes(q));
    pickHtml = `
     <input class="waIn" placeholder="Search students…" value="${esc(bc._q || "")}" oninput="WA.bc._q=this.value;waBcRefresh()">
     <div style="max-height:190px;overflow:auto;display:flex;flex-direction:column">
     ${SL.map((s) => `<label class="waChk" style="padding:5px 2px"><input type="checkbox" ${bc.picked[s.id] ? "checked" : ""} onchange="waBcPick('${s.id}',this.checked)"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)} <small style="color:#8aa0ad">${esc(s.sid)} · ${esc(s.phone || "no phone")}</small></span><span class="waTag s-${esc(s.status)}">${esc(s.status)}</span></label>`).join("") || '<div class="mut" style="font-size:13px;padding:8px">No students match.</div>'}
     </div>`;
  }
  return `<div class="waBc">
   <div class="waBcH"><button class="waHb" onclick="waBcClose()">${waI("back")}</button><b>New broadcast</b></div>
   <div class="waBcBody">
    <div class="waSeg">
     <button class="${bc.mode === "batch" ? "on" : ""}" onclick="WA.bc.mode='batch';waBcRefresh()">Whole batch</button>
     <button class="${bc.mode === "all" ? "on" : ""}" onclick="WA.bc.mode='all';waBcRefresh()">Everyone</button>
     <button class="${bc.mode === "pick" ? "on" : ""}" onclick="WA.bc.mode='pick';waBcRefresh()">Pick students</button>
    </div>
    ${pickHtml}
    ${L.length ? `<div class="waLbl">Recipients preview (${stt.n - stt.noPhone} reachable${stt.noPhone ? " · " + stt.noPhone + " without phone" : ""}${stt.dups ? " · " + stt.dups + " duplicate" : ""})</div>
    <div class="waSees">${picks.map((s) => `<span class="waSee${waPhone(s.phone) ? "" : " off"}">${esc(s.name)}<small>${esc(s.phone || "no phone")}</small></span>`).join("")}${L.length > 80 ? `<span class="waSee off">+${L.length - 80} more…</span>` : ""}</div>` : '<div class="mut" style="font-size:13px">No recipients yet — choose a class, batch or students above.</div>'}
    <div class="waLbl">Message</div>
    <textarea class="waIn waBcMsg" id="waBcMsg" placeholder="Type the message to send… Use {name}, {sid}, {class}, {batch}, {guardian} or {school} — filled per student." oninput="WA.bc.msg=this.value">${esc(bc.msg || "")}</textarea>
    <div class="waVarRow">${WA_VARS.map((v) => `<button onclick="waBcIns('{${v}}')">{${v}}</button>`).join("")}</div>
    <div id="waBcFileRow">${bc.file ? `<div class="waFileChip">${waI("doc", 18)}<span><b>${esc(bc.file.filename)}</b> · ${(bc.file.size / 1048576).toFixed(1)} MB</span><button title="Remove" onclick="WA.bc.file=null;waBcRefresh()">${waI("x", 15)}</button></div>` : ""}
    <input type="file" id="wa_bf" hidden onchange="waBcReadFile(event)"></div>
    <button class="btn" style="align-self:flex-start" onclick="$('#wa_bf').click()">${bc.file ? "Replace attachment" : "Attach image, audio or document"}</button>
    <div class="mut" style="font-size:12px;color:#8aa0ad">Messages go out one by one with a pause between them, so WhatsApp treats it like normal typing.</div>
   </div>
   <div class="waBcFoot">
    <span class="cnt">Sending to <b>${stt.n - stt.noPhone}</b> student${stt.n - stt.noPhone === 1 ? "" : "s"}${stt.noPhone ? ` · ${stt.noPhone} skipped (no phone)` : ""}${stt.dups ? ` · ${stt.dups} duplicate number${stt.dups > 1 ? "s" : ""}` : ""}</span>
    <button class="waGo" onclick="waBcConfirm()" ${stt.n - stt.noPhone > 0 ? "" : "disabled"}>${waI("bc", 16)} Review &amp; send</button>
   </div>
  </div>`;
}
function waBcRefresh() { const el = $("#waList"); if (el && WA.bc) { el.innerHTML = waBcHtml(); const tx = $("#waBcMsg"); if (tx) tx.value = WA.bc.msg || ""; } }
function waBcSet(k, v) { WA.bc[k] = v; if (k === "cls") WA.bc.bat = ""; waBcRefresh(); }
function waBcPick(id, on) { if (on) WA.bc.picked[id] = 1; else delete WA.bc.picked[id]; waBcRefresh(); }
function waBcReadFile(e) {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  if (f.size > WA_MAX) { toast("That file is too big. Keep attachments under 45 MB."); return; }
  const r = new FileReader();
  r.onerror = () => toast("Could not read that file");
  r.onload = () => {
    const d = String(r.result || ""), m = d.match(/^data:([^;]+);base64,([\s\S]*)$/);
    if (!m) { toast("Could not read that file"); return; }
    WA.bc.file = { b64: m[2], mimetype: m[1] || "application/octet-stream", filename: (f.name || "attachment").slice(0, 200), size: f.size };
    waBcRefresh();
  };
  r.readAsDataURL(f);
}
function waBcIns(t) {
  const el = $("#waBcMsg"); if (!el) return;
  const a = el.selectionStart || 0, b = el.selectionEnd || 0;
  el.value = el.value.slice(0, a) + t + el.value.slice(b);
  WA.bc.msg = el.value;
  el.focus(); el.selectionStart = el.selectionEnd = a + t.length;
}
function waBcConfirm() {
  const bc = WA.bc; if (!bc) return;
  const msg = String(bc.msg || "").trim();
  if (!msg && !bc.file) { toast("Type a message or attach a file"); return; }
  if (!bc.file && msg.length > 4096) { toast("WhatsApp messages are limited to 4096 characters"); return; }
  if (!waReady()) { waSettings(); toast("Set up the WhatsApp gateway first"); return; }
  const L = waBcList(), stt = waBcStats(L);
  if (!L.length) { toast("No recipients selected"); return; }
  if (stt.n - stt.noPhone <= 0) { toast("None of these students has a phone number"); return; }
  const b = bc.bat ? DB.Batches.find((x) => x.id === bc.bat) : null;
  const label = bc.mode === "batch" ? (b ? bLabel(b) : clsLabel(bc.cls) + " — all batches") : bc.mode === "all" ? "Everyone" : "Picked students";
  WA.pend = { list: L, label, msg, file: bc.file };
  $("#modal").innerHTML = `<h2>Send to ${stt.n - stt.noPhone} student${stt.n - stt.noPhone > 1 ? "s" : ""}?</h2>
  <p style="margin-bottom:10px"><b>${esc(label)}</b>${bc.file ? ` · ${esc(bc.file.filename)}` : ""}</p>
  <div class="warnbox">${stt.noPhone ? `<b>${stt.noPhone}</b> of them have no phone number and will be skipped. ` : ""}${stt.dups ? `${stt.dups} number${stt.dups > 1 ? "s appear" : " appears"} more than once. ` : ""}${bc.file && msg.length > 1024 ? "The message is longer than 1024 characters, so each student gets it as a text and then the file. " : ""}Sending is one by one with a pause between messages — it continues in the background if you open a chat.</div>
  <label class="chk" style="margin-top:10px"><input type="checkbox" id="wa_dedup" checked><span>Send only once to each phone number</span></label>
  <div class="acts"><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" onclick="waBcStart()">Send now</button></div>`;
  $("#ov").classList.add("on");
}
async function waBcStart() {
  const P = WA.pend || { list: [], label: "", msg: "", file: null };
  const dedup = !$("#wa_dedup") || $("#wa_dedup").checked;
  closeM();
  if (WA.run && !WA.run.done) { toast("A broadcast is already running"); return; }
  try {
    const j = await waCall("/sessions/" + waSid());
    const st = (j && j.status) || "";
    if (st !== "ready") { WA.conn = { st, phone: "", push: "" }; waPaint(); toast("WhatsApp session is " + (WA_ST_LABEL[st] || st) + " — link the phone first"); return; }
  } catch (e) { toast("Gateway not reachable: " + e.message); return; }
  const seen = new Set(), list = [];
  let noPhone = 0, dup = 0;
  P.list.forEach((s) => {
    const c = waPhone(s.phone);
    if (!c) { noPhone++; return; }
    if (dedup && seen.has(c)) { dup++; return; }
    seen.add(c); list.push(s);
  });
  if (!list.length) { toast("No one to send to"); return; }
  WA.bc = null;
  waDrawList();
  waRun(list, P.label, P.msg, P.file, { noPhone, dup });
}
function waViewRun() { WA.chat = "__run"; waDrawConv(); waDrawList(); }

/* ----- broadcast engine (unchanged rhythm: one by one + pause) ----- */
async function waRun(list, label, msg, file, skip) {
  WA.run = { list: list.map((s) => ({ s, st: "pend" })), i: -1, ok: 0, fail: 0, errs: [], stop: false, pause: false, done: false, label, skip, msg, file };
  WA.chat = "__run";
  waDrawConv(); waDrawList();
  const R = WA.run;
  for (R.i = 0; R.i < R.list.length && !R.stop; R.i++) {
    while (R.pause && !R.stop) await waSleep(300);
    if (R.stop) break;
    const s = R.list[R.i].s;
    R.list[R.i].st = "sending";
    waDrawRunPanel();
    let err = "";
    const kind = file ? waMediaKind(file.mimetype).replace("send-", "") : "text";
    try { await waSendOne(s, waFill(msg, s), file); R.list[R.i].st = "ok"; R.ok++; }
    catch (e) {
      if (e.status === 429 && e.retry) {
        R.list[R.i].st = "retry";
        waDrawRunPanel();
        await waSleep(Math.min(e.retry, 120) * 1000 + 1000);
        try { await waSendOne(s, waFill(msg, s), file); R.list[R.i].st = "ok"; R.ok++; }
        catch (e2) { err = e2.message; R.list[R.i].st = "fail"; R.fail++; R.errs.push({ name: s.name, err }); }
      } else { err = e.message; R.list[R.i].st = "fail"; R.fail++; R.errs.push({ name: s.name, err }); }
    }
    waLogAdd({ name: s.name || "", sid: s.sid || "", phone: s.phone || "", kind, file: file ? file.filename : "", ok: err ? 0 : 1, err, label });
    waDrawRunPanel();
    const c = WA.chats.find((x) => x.id === waPhone(s.phone));
    if (c) { c.lastMessage = file ? (waFill(msg, s) || file.filename) : waFill(msg, s); c.timestamp = Math.floor(Date.now() / 1000); }
    if (WA.chat === waPhone(s.phone)) waFetchMsgs(WA.chat).catch(() => {});
    if (R.i + 1 < R.list.length && !R.stop) await waSleep(((Number(WA.cfg.dmin) || 3) + Math.random() * Math.max(0, (Number(WA.cfg.dmax) || 8) - (Number(WA.cfg.dmin) || 3))) * 1000);
  }
  R.done = true;
  waDrawRunPanel(); waDrawList();
  waFetchChats().catch(() => {});
  toast("Broadcast finished: " + R.ok + " sent" + (R.fail ? ", " + R.fail + " failed" : ""));
}
function waRunPanelHtml() {
  const R = WA.run;
  if (!R) return waEmptyHtml();
  return `<div class="waConvH" style="background:#fff">
   <button class="waHb" title="Back" onclick="waBackToList()" style="display:none" id="waBack">${waI("back")}</button>
   <span class="waAv sm" style="background:#00a884">${waI("bc", 18)}</span>
   <div class="nm"><b>Broadcast</b><small id="waRunSub">${esc(R.label)} · 0 sent</small></div>
  </div>
  <div class="waRunBar" id="waRunBar" style="background:#fff;border-left:1px solid #e9edef;padding:0 16px 12px;flex:none"><div class="waBar"><i style="width:0%"></i></div><small class="mut"></small></div>
  <div class="waRunMsgs" id="waRunMsgs"></div>
  <div class="waRunActs" id="waRunActs"></div>`;
}
function waDrawRunPanel() {
  const R = WA.run; if (!R) return;
  const box = $("#waRunMsgs"), acts = $("#waRunActs"), head = $("#waRunBar");
  const sub = $("#waRunSub");
  if (sub) sub.textContent = R.label + " · " + (R.done ? "Finished — " : R.stop ? "Stopping… " : R.pause ? "Paused — " : "") + R.ok + " sent" + (R.fail ? " · " + R.fail + " failed" : "");
  if (head) head.innerHTML = `<div class="waBar"><i style="width:${R.list.length ? Math.round((Math.min(R.i + (R.done ? 0 : 1), R.list.length) / R.list.length) * 100) : 100}%"></i></div>
   <small class="mut">${R.done ? (R.stop ? "Stopped after " : "Finished — ") + R.ok + " of " + R.list.length + " delivered." : ""}${R.skip && R.skip.noPhone ? "Skipped " + R.skip.noPhone + " without a phone" : ""}${R.skip && R.skip.dup ? (R.skip.noPhone ? " · " : "") + R.skip.dup + " duplicate number" + (R.skip.dup === 1 ? "" : "s") : ""}</small>`;
  if (box) {
    box.innerHTML = R.list.map((it, idx) => {
      const out = it.st === "pend" ? '<span class="waTag">queued</span>' : it.st === "sending" ? '<span class="waTag" style="background:#fff3d6;color:#8a6d1a">sending…</span>' : it.st === "retry" ? '<span class="waTag" style="background:#fff3d6;color:#8a6d1a">rate-limited, retrying</span>' : it.st === "ok" ? waTicks("delivered").replace("currentColor", "#008069") : waTicks("failed");
      return `<div class="waB ${it.st === "ok" ? "out" : "in"}" style="${it.st === "pend" ? "opacity:.55" : ""}"><div class="waAuthor">${esc(it.s.name)}</div><div>${esc(waFill(R.msg, it.s) || (R.file ? R.file.filename : ""))}</div><div class="waMeta">${new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} ${out}</div></div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  }
  if (acts) acts.innerHTML = (R.done ? '<button class="btn p" onclick="waClearRun()">Back to chats</button>' : (R.stop ? "" : `<button class="btn" onclick="waPause()">${R.pause ? "Resume" : "Pause"}</button>`) + '<button class="btn d" onclick="waStop()">Stop</button>') + `<span class="mut" style="font-size:12px;flex:1">${R.done ? "" : "Sending continues if you open another chat."}</span>`;
}
function waPause() { const R = WA.run; if (!R || R.done) return; R.pause = !R.pause; waDrawRunPanel(); }
function waStop() { const R = WA.run; if (!R || R.done) return; R.stop = true; waDrawRunPanel(); }
function waClearRun() { WA.run = null; waBackToList(); }

/* ----- sent history (log) modal ----- */
function waLogModal() {
  $("#modal").innerHTML = `<h2>Sent history</h2>
  <p class="mut" style="font-size:12.5px;margin-bottom:10px">Everything sent from this browser, newest first (kept locally, max 200). Full conversations live in WhatsApp — open a chat to read them.</p>
  <div style="display:flex;gap:8px;margin-bottom:10px"><input class="in grow" id="wa_lq" placeholder="Search by name, ID, attachment or error" value="${esc(WA.lq || "")}" oninput="WA.lq=this.value;$('#wa_ltb').innerHTML=waLogRows()"><button class="btn d" onclick="waClearLog()">Clear</button></div>
  <div class="tw"><table><thead><tr><th>When</th><th>Recipient</th><th>Type</th><th>Attachment</th><th>Sent as</th><th>Result</th></tr></thead><tbody id="wa_ltb">${waLogRows()}</tbody></table></div>
  <div class="acts"><button class="btn p" onclick="closeM()">Close</button></div>`;
  $("#ov").classList.add("on");
}
WA.lq = "";
function waLogRows() {
  const q = String(WA.lq || "").toLowerCase();
  const L = WA.log.filter((x) => !q || [x.name, x.sid, x.phone, x.file, x.label, x.err].join(" ").toLowerCase().includes(q));
  return L.map((x) => `<tr><td>${new Date(x.ts).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
   <td><b>${esc(x.name)}</b><small class="mut" style="display:block">${esc(x.sid)} · ${esc(x.phone)}</small></td>
   <td>${esc(x.kind)}</td><td>${esc(x.file || "–")}</td><td>${esc(x.label)}</td>
   <td>${x.ok ? '<span class="chip s-Active">Sent</span>' : `<span class="chip s-Left">Failed</span><small class="mut" style="display:block">${esc(x.err)}</small>`}</td></tr>`).join("") ||
   '<tr><td colspan="6"><div class="empty">Nothing sent yet from this device.</div></td></tr>';
}
function waClearLog() { if (!confirm("Clear the WhatsApp history on this device?")) return; WA.log = []; waSaveLog(); waLogModal(); }

/* ----- settings modal ----- */
function waSettings() {
  const c = WA.cfg;
  $("#modal").innerHTML = `<h2>WhatsApp settings</h2>
  <p class="mut" style="font-size:12.5px;margin-bottom:10px">Connects to your self-hosted <b>OpenWA</b> gateway. The URL and API key are stored only in this browser, per TuitionPro account, and are sent directly to your gateway. Use an <b>HTTPS</b> gateway URL — TuitionPro itself runs on HTTPS, and browsers block plain-HTTP gateway calls from an HTTPS page.</p>
  <div class="f">
   <label class="full">Gateway URL<input class="in" id="wa_u" placeholder="https://wa.yourdomain.com" value="${esc(c.url)}"></label>
   <label class="full">API key<input class="in" id="wa_k" type="password" placeholder="owa_…" value="${esc(c.key)}"></label>
   <label class="full">WhatsApp session
    <span style="display:flex;gap:8px;align-items:center"><select class="in grow" id="wa_sess"><option value="">Select a session</option></select><button class="btn" onclick="waLoadSess()">Load</button></span>
   </label>
   <label>Country code<input class="in" id="wa_cc" value="${esc(c.cc)}" placeholder="880"></label>
   <label>Pause between messages (seconds)<span style="display:flex;gap:8px"><input class="in" id="wa_dmin" type="number" min="1" max="120" value="${esc(c.dmin)}" title="Minimum"><input class="in" id="wa_dmax" type="number" min="1" max="120" value="${esc(c.dmax)}" title="Maximum"></span></label>
  </div>
  <div id="wa_st" class="mut" style="font-size:12.5px;margin:8px 2px"></div>
  <div class="acts" style="justify-content:space-between;flex-wrap:wrap">
   <button class="btn" onclick="waTest()">Test connection</button>
   <span style="display:flex;gap:8px"><button class="btn" onclick="waNewSess()">New session</button><button class="btn p" onclick="waSaveSettings()">Save</button></span>
  </div>`;
  waFillSess();
  $("#ov").classList.add("on");
}
function waFillSess() {
  const sel = $("#wa_sess"); if (!sel) return;
  sel.innerHTML = '<option value="">Select a session</option>' + (WA.sess || []).map((s) => `<option value="${esc(s.id)}" ${s.id === WA.cfg.session ? "selected" : ""}>${esc(s.name || s.id)} — ${esc(s.status || "?")}${s.phone ? " · +" + esc(s.phone) : ""}</option>`).join("");
  if (!WA.sess && waReady()) waLoadSess(true);
}
async function waLoadSess(quiet) {
  const st = $("#wa_st");
  if ($("#wa_u")) { WA.cfg.url = $("#wa_u").value.trim(); WA.cfg.key = $("#wa_k").value.trim(); }
  if (!waBase() || !WA.cfg.key) { if (!quiet && st) st.textContent = "Enter the gateway URL and API key first."; return; }
  try {
    const j = await waCall("/sessions");
    WA.sess = waListResp(j);
    if (!$("#wa_sess")) return;
    waFillSess();
    if (!quiet && st) st.textContent = "Found " + WA.sess.length + " session" + (WA.sess.length === 1 ? "" : "s") + ". Pick one, then press Save.";
  } catch (e) { if (!quiet && st) st.textContent = "Could not load sessions: " + e.message; }
}
async function waTest() {
  const st = $("#wa_st"); if (!st) return;
  const tmp = { url: $("#wa_u").value.trim(), key: $("#wa_k").value.trim(), session: $("#wa_sess").value };
  const old = Object.assign({}, WA.cfg);
  Object.assign(WA.cfg, tmp);
  st.textContent = "Testing…";
  try {
    const L = waListResp(await waCall("/sessions"));
    if (!tmp.session) st.textContent = "Gateway OK — " + L.length + " session" + (L.length === 1 ? "" : "s") + " found. Choose one and press Save.";
    else {
      const s = L.find((x) => x.id === tmp.session), stat = s ? s.status : "not found";
      st.innerHTML = "Gateway OK — session: <b>" + esc(stat === "ready" ? "ready and connected" : WA_ST_LABEL[stat] || stat) + "</b>" + (stat === "qr_ready" ? " — save, then link the phone by QR." : ". Press Save when done.");
    }
  } catch (e) { st.textContent = "Failed: " + e.message; }
  finally { Object.assign(WA.cfg, old); }
}
function waSaveSettings() {
  WA.cfg.url = $("#wa_u").value.trim();
  WA.cfg.key = $("#wa_k").value.trim();
  WA.cfg.session = $("#wa_sess").value;
  WA.cfg.cc = $("#wa_cc").value.trim() || "880";
  WA.cfg.dmin = Math.max(1, Number($("#wa_dmin").value) || 4);
  WA.cfg.dmax = Math.max(WA.cfg.dmin, Number($("#wa_dmax").value) || WA.cfg.dmin + 4);
  waSaveCfg();
  WA.conn = { st: "", phone: "", push: "" };
  closeM();
  if (route === "wa") waPaint();
  toast("WhatsApp settings saved");
}
async function waNewSess() {
  if ($("#wa_u")) { WA.cfg.url = $("#wa_u").value.trim(); WA.cfg.key = $("#wa_k").value.trim(); }
  if (!waBase() || !WA.cfg.key) { const st = $("#wa_st"); if (st) st.textContent = "Enter the gateway URL and API key first."; return; }
  const name = prompt("Name for the new WhatsApp session", "tuitionpro");
  if (!name) return;
  const st = $("#wa_st"); st.textContent = "Creating session…";
  try {
    const j = await waCall("/sessions", { method: "POST", body: JSON.stringify({ name }) });
    WA.cfg.session = (j && j.id) || "";
    waSaveCfg();
    WA.sess = WA.sess || [];
    if (!WA.sess.some((s) => s.id === WA.cfg.session)) WA.sess.push({ id: WA.cfg.session, name, status: "created" });
    st.textContent = "Session created. Press Save, then link the phone by QR code.";
    waFillSess();
    const sel = $("#wa_sess"); if (sel) sel.value = WA.cfg.session;
  } catch (e) { st.textContent = "Could not create the session: " + e.message; }
}

/* ----- WhatsApp button on a student row ----- */
function waOpenStudent(id) {
  const s = DB.Students.find((x) => x.id === id);
  if (!s) { toast("Student not found"); return; }
  if (!waPhone(s.phone)) { toast("This student has no valid phone number"); return; }
  go("wa");
  const wait = () => {
    if (WA.conn.st === "ready" && $("#waShell")) { waOpenStu(id); return; }
    if (route !== "wa") return;
    setTimeout(wait, 250);
  };
  waEnsureConn().then(wait);
}

/* ----- background tick: refresh chats / messages / connection while the page is open ----- */
function waTickStart() { if (WA._tik) return; WA._tik = setInterval(waTick, 2000); }
function waTick() {
  if (route !== "wa") return;
  WA.tickN++;
  if (document.hidden || !waReady()) return;
  if (!$("#waQrA")) { if (WA.tickN % 4 === 0) waEnsureConn(); }
  if (WA.conn.st === "ready") {
    if (WA.tickN % 3 === 0 && WA.chat && WA.chat !== "__run") waFetchMsgs(WA.chat).catch(() => {});
    if (WA.tickN % 10 === 0 && !WA.newChat && !WA.bc) waFetchChats().catch(() => {});
  }
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
