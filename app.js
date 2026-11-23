/* ============ CONFIG ============
   The Apps Script URL lives in config.js (so you never have to edit this file). */
const API_URL = (window.TP_CONFIG && window.TP_CONFIG.API_URL) || "";
const NEED_BUILD = "3"; // must match BUILD in Code.gs
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
let DB = { Students: [], Batches: [], Attendance: [], Fees: [], Results: [] },
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
    data: { Students: [], Batches: [], Attendance: [], Fees: [], Results: [] },
    me: { id: "demo", role: "master", name: "TuitionPro Demo" },
    ver: "0",
  };
  if (a === "save") { const l = (s.data[p.table] = s.data[p.table] || []), i = l.findIndex((x) => x.id === p.row.id); i < 0 ? l.push(p.row) : (l[i] = p.row); }
  if (a === "saveMany") { const l = (s.data[p.table] = s.data[p.table] || []); p.rows.forEach((r) => { const i = l.findIndex((x) => x.id === r.id); i < 0 ? l.push(r) : p.upsert && (l[i] = r); }); }
  if (a === "remove") s.data[p.table] = s.data[p.table].filter((x) => x.id !== p.id);
  if (a === "profile") Object.assign(s.me, p.fields);
  if (["save", "saveMany", "remove", "profile"].includes(a)) { s.ver = String(Date.now()); localStorage.setItem("tuitionpro", JSON.stringify(s)); }
  return Promise.resolve({ ok: true, ver: s.ver, data: s.data, me: s.me, admin: { users: [] } });
}
function applyData(j) {
  DB = j.data; DB.Batches = DB.Batches || [];
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
  DB = { Students: [], Batches: [], Attendance: [], Fees: [], Results: [] }; ME = {}; showLogin();
}

/* ============ SHELL ============ */
function buildNav() {
  const keys = Object.keys(VIEWS).filter((k) => k !== "admin" || ME.role === "master");
  $("#nav").innerHTML = keys.map((k) => `<a data-r="${k}" onclick="go('${k}')" title="${VIEWS[k]}">${svg(NAVICON[k])}<span>${VIEWS[k]}</span>${k === "admin" ? '<em class="nb" hidden></em>' : ""}</a>`).join("");
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
function go(r) { route = r; history.replaceState(null, "", "#" + r); $("#app").classList.remove("mob"); closePops(); render(); }
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
  ({ dash: vDash, students: vStudents, profile: vProfile, admin: vAdmin }[route] || vSoon)();
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
// Payment pending = active students with a monthly fee and no paid Fees record for the current month
function payPending() {
  const m = new Date().toISOString().slice(0, 7);
  const paid = new Set((DB.Fees || []).filter((f) => f.month === m && !["", "0", "false", "no"].includes(String(f.paid).toLowerCase())).map((f) => String(f.studentId)));
  return DB.Students.filter((s) => s.status === "Active" && Number(s.fee) > 0 && !paid.has(String(s.id))).length;
}
function vDash() {
  const S = DB.Students;
  const un = S.filter((s) => !batchOf(s)).length;
  const used = CLASSES.filter((c) => DB.Batches.some((b) => b.class === c));
  $("#view").innerHTML = `
  <div class="grid stats">
   <div class="glass stat"><small>Total students</small><b>${S.length}</b></div>
   <div class="glass stat"><small><i style="background:var(--ok)"></i>Active</small><b>${S.filter((s) => s.status === "Active").length}</b></div>
   <div class="glass stat"><small><i style="background:var(--warn)"></i>Payment pending</small><b>${payPending()}</b></div>
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
      return `<tr><td><b>${esc(s.sid)}</b></td><td>${esc(s.name)}</td><td>${esc(clsLabel(stuClass(s)))}</td><td>${b ? esc(b.section) + " " + t12(b.start) + " " + daysTag(b) : "Unassigned"}</td><td>${esc(s.guardian)}</td><td>${esc(s.phone)}</td><td>${esc(s.fee)}</td><td><span class="chip s-${esc(s.status)}">${esc(s.status)}</span></td>
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
   <label>Monthly/Course Fee<input class="in" id="m_fee" type="number" min="0" value="${v("fee")}"></label>
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
  $("#ov").classList.add("on");
  setTimeout(() => $("#m_name").focus(), 50);
}
function closeM() {
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
