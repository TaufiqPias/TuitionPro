/* ============ WHATSAPP CLICK-TO-CHAT ============
   No server and no API. For each student it opens  https://wa.me/<number>?text=<message>
   in WhatsApp Web / the phone app with the message already typed. You press Send there.
   Also sends each batch's saved group invite link to its students. */

const WA_CC = "880"; // default country code for numbers that start with 0
const WA_GROUP_TEXT = "Assalamu alaikum {guardian},\nPlease join the WhatsApp group of {batch} for {first} using this link:\n{link}";
const WA = { mode: "batch", student: "", scope: "", inactive: false, txt: { student: "", batch: "", all: "", group: WA_GROUP_TEXT }, done: new Set(), q: "", pane: "list" };

/* ---------- phone numbers -> digits for wa.me ---------- */
function waNum(p) {
  let d = String(p ?? "").split(/[,;/\n]|\sor\s/i)[0].replace(/\D/g, ""); // first number only
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = WA_CC + d.slice(1);
  else if (WA_CC === "880" && /^1\d{9}$/.test(d)) d = WA_CC + d; // Excel dropped the leading 0
  if (d.length < 10 || d.length > 15) return null;
  if (d.startsWith("880") && d.length !== 13) return null;
  return d;
}
const waUrl = (num, text) => `https://wa.me/${num}` + (text ? `?text=${encodeURIComponent(text)}` : "");
const waLinkOk = (u) => /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,}/.test(String(u || "").trim());
const waFirst = (n) => String(n || "").trim().split(/\s+/)[0] || "";

function waFill(t, s) {
  const b = batchOf(s);
  const m = { name: s.name, first: waFirst(s.name), guardian: s.guardian || "Guardian", class: clsLabel(stuClass(s)), batch: b ? bLabel(b) : "", sid: s.sid, link: b && b.groupLink ? b.groupLink : "" };
  return String(t).replace(/\{(name|first|guardian|class|batch|sid|link)\}/gi, (_, k) => m[k.toLowerCase()] ?? "");
}

/* ---------- recipients ---------- */
function waTargets() {
  const all = liveStu();
  let list = [];
  if (WA.mode === "student") list = all.filter((s) => s.id === WA.student);
  else {
    if (WA.mode === "batch" && WA.scope.startsWith("c:")) list = all.filter((s) => stuClass(s) === WA.scope.slice(2));
    else if ((WA.mode === "batch" || WA.mode === "group") && WA.scope.startsWith("b:")) list = all.filter((s) => s.batchId === WA.scope.slice(2));
    else if (WA.mode === "all") list = all.slice();
    if (!WA.inactive) list = list.filter((s) => (s.status || "Active") === "Active");
  }
  const ok = [], skipped = [], seen = new Set();
  list.forEach((s) => {
    const num = waNum(s.phone);
    if (!num) skipped.push({ s, why: s.phone ? "Invalid number" : "No phone" });
    else if (seen.has(num)) skipped.push({ s, why: "Same number as another student" });
    else { seen.add(num); ok.push({ s, num }); }
  });
  return { ok, skipped };
}

/* ---------- messenger UI helpers ---------- */
const WA_ICO = {
  send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.5L15 12 3.39 13.9z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13l4 4 9-10M11 15l2 2 9-10"/></svg>',
};
const waHue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const waAv = (seed, html) => `<span class="wa-av" style="background:hsl(${waHue(seed)} 52% 46%)">${html}</span>`;
const waPicked = () => (WA.mode === "student" ? !!WA.student : WA.mode === "all" || !!WA.scope);
const waBatch = () => (WA.mode === "group" && WA.scope.startsWith("b:") ? DB.Batches.find((x) => x.id === WA.scope.slice(2)) : null);
const waGrow = (el) => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 140) + "px"; };

function waInfo() {
  const m = WA.mode;
  if (m === "student") { const s = DB.Students.find((x) => x.id === WA.student); return s ? { t: s.name, av: waAv(s.name, init(s.name)) } : null; }
  if (m === "all") return { t: "Everyone", av: waAv("all", "All") };
  if (!WA.scope) return null;
  if (WA.scope.startsWith("c:")) { const c = WA.scope.slice(2); return { t: clsLabel(c), av: waAv(c, esc(clsCode(c))) }; }
  const b = DB.Batches.find((x) => x.id === WA.scope.slice(2));
  return b ? { t: bLabel(b) + (m === "group" ? " · group invite" : ""), av: waAv(b.class, esc(clsCode(b.class))) } : null;
}

/* ---------- page ---------- */
function waOne(id) { WA.mode = "student"; WA.student = id; WA.done = new Set(); WA.q = ""; WA.pane = "chat"; go("wa"); }
function waSetMode(m) {
  WA.mode = m; WA.done = new Set(); WA.q = "";
  if (m === "group" && !WA.scope.startsWith("b:")) WA.scope = "";
  WA.pane = m === "all" ? "chat" : "list";
  vWA();
}
function vWA() {
  const m = WA.mode;
  const tabs = [["student", "Student"], ["batch", "Class / batch"], ["all", "Everyone"], ["group", "Group invite"]]
    .map(([k, l]) => `<button type="button" class="${m === k ? "on" : ""}" onclick="waSetMode('${k}')">${l}</button>`).join("");
  const chips = ["name", "first", "guardian", "class", "batch", "sid", "link"];
  $("#view").innerHTML = `
  <div class="wa ${WA.pane === "chat" ? "show-chat" : ""}" id="wa">
   <aside class="wa-side glass">
    <div class="wa-sh"><h3>Chats</h3></div>
    <div class="wa-pills">${tabs}</div>
    ${m === "all" ? "" : `<div class="wa-search"><input class="in" id="wa_find" type="search" autocomplete="off" placeholder="${m === "student" ? "Search name, ID or phone" : "Search classes and batches"}" value="${esc(WA.q)}"></div>`}
    <div class="wa-list" id="wa_list"></div>
    ${m === "student" ? "" : `<label class="wa-inc"><input type="checkbox" id="wa_inact" ${WA.inactive ? "checked" : ""}> Include Inactive, Suspended and Left students</label>`}
   </aside>
   <section class="wa-chat glass">
    <header class="wa-ch" id="wa_head"></header>
    <div class="wa-thread" id="wa_thread"></div>
    <footer class="wa-comp">
     <div class="wa-chips">${chips.map((k) => `<button type="button" class="chip" onclick="waIns('{${k}}')">{${k}}</button>`).join("")}</div>
     <div class="wa-in">
      <textarea class="wa-ta" id="wa_text" rows="1" placeholder="Write a message…">${esc(WA.txt[m])}</textarea>
      <button type="button" class="wa-send" id="wa_send" onclick="waSend()" title="Open the next chat in WhatsApp">${WA_ICO.send}</button>
     </div>
     <div class="wa-hint" id="wa_hint"></div>
     <div class="wa-hint">Photos and files can't be attached by link. After a chat opens, use the paperclip in WhatsApp.</div>
    </footer>
   </section>
  </div>`;
  const ta = $("#wa_text");
  ta.oninput = (e) => { WA.txt[m] = e.target.value; waGrow(ta); waPrev(); };
  ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(hover: hover)").matches) { e.preventDefault(); waSend(); } };
  if ($("#wa_find")) $("#wa_find").oninput = (e) => { WA.q = e.target.value; waList(); };
  if ($("#wa_inact")) $("#wa_inact").onchange = (e) => { WA.inactive = e.target.checked; WA.done = new Set(); waList(); waQ(); };
  waList(); waQ(); waGrow(ta);
}
function waIns(t) {
  const el = $("#wa_text"); if (!el) return;
  const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  el.value = el.value.slice(0, a) + t + el.value.slice(b); WA.txt[WA.mode] = el.value;
  el.focus(); el.selectionStart = el.selectionEnd = a + t.length; waGrow(el); waPrev();
}

/* ---------- left pane: chat list ---------- */
function waList() {
  const el = $("#wa_list"); if (!el) return;
  const m = WA.mode, q = WA.q.trim().toLowerCase();
  const nIn = (f) => liveStu().filter((s) => (WA.inactive || (s.status || "Active") === "Active") && f(s)).length;
  const row = (key, sel, av, title, sub, tag) => `<button type="button" class="wa-row ${sel ? "sel" : ""}" onclick="waPick('${esc(key)}')">${av}<span class="wa-rt"><b>${esc(title)}</b><small>${esc(sub)}</small></span>${tag || ""}</button>`;
  let h = "";
  if (m === "student") {
    const L = liveStu().filter((s) => !q || [s.name, s.sid, s.phone, s.guardian].some((v) => String(v || "").toLowerCase().includes(q)))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    h = L.slice(0, 300).map((s) => { const b = batchOf(s); return row("s:" + s.id, WA.student === s.id, waAv(s.name, init(s.name)), s.name, s.sid + (b ? " · " + bLabel(b) : ""), waNum(s.phone) ? "" : `<i class="wa-tag">No phone</i>`); }).join("");
    if (L.length > 300) h += `<div class="wa-empty">Showing the first 300. Keep typing to narrow it down.</div>`;
    if (!L.length) h = `<div class="wa-empty">No students match.</div>`;
  } else if (m === "all") {
    h = row("all", true, waAv("all", "All"), "Everyone", nIn(() => true) + " students");
  } else {
    const B = sortBatches(DB.Batches), used = CLASSES.filter((x) => B.some((b) => b.class === x));
    const bl = B.filter((b) => !q || bLabel(b).toLowerCase().includes(q) || clsLabel(b.class).toLowerCase().includes(q));
    const cl = m === "batch" ? used.filter((x) => !q || clsLabel(x).toLowerCase().includes(q)) : [];
    if (cl.length) h += `<div class="wa-grp">Whole class</div>` + cl.map((x) => row("c:" + x, WA.scope === "c:" + x, waAv(x, esc(clsCode(x))), clsLabel(x), nIn((s) => stuClass(s) === x) + " students · all batches")).join("");
    if (bl.length) h += `<div class="wa-grp">Batches</div>` + bl.map((b) => row("b:" + b.id, WA.scope === "b:" + b.id, waAv(b.class, esc(clsCode(b.class))), bLabel(b), nIn((s) => s.batchId === b.id) + " students",
      m === "group" ? (waLinkOk(b.groupLink) ? `<i class="wa-tag ok">Link saved</i>` : `<i class="wa-tag">No link</i>`) : "")).join("");
    if (!h) h = `<div class="wa-empty">${DB.Batches.length ? "Nothing matches." : "No batches yet."}</div>`;
  }
  el.innerHTML = h;
}
function waPick(k) {
  if (k.startsWith("s:")) WA.student = k.slice(2); else if (k !== "all") WA.scope = k;
  WA.done = new Set(); WA.pane = "chat";
  const w = $("#wa"); if (w) w.classList.add("show-chat");
  waList(); waQ();
}
function waBack() { WA.pane = "list"; const w = $("#wa"); if (w) w.classList.remove("show-chat"); }

/* ---------- right pane: header, thread, composer state ---------- */
function waHead() {
  const el = $("#wa_head"); if (!el) return;
  const back = `<button type="button" class="wa-back" onclick="waBack()" title="Back to chats">${WA_ICO.back}</button>`;
  const i = waInfo();
  if (!i) { el.innerHTML = `${back}<div class="wa-ht"><b>WhatsApp</b><small>Choose a chat to start</small></div>`; return; }
  const { ok, skipped } = waTargets(), opened = ok.filter((x) => WA.done.has(x.s.id)).length, single = WA.mode === "student";
  const s = single ? DB.Students.find((x) => x.id === WA.student) : null, num = s ? waNum(s.phone) : null;
  const sub = single
    ? esc(s.sid) + (num ? " · +" + num : " · No usable phone number")
    : ok.length + (ok.length === 1 ? " recipient" : " recipients") + (skipped.length ? " · " + skipped.length + " skipped" : "") + (opened ? " · " + opened + " opened" : "");
  el.innerHTML = `${back}${i.av}<div class="wa-ht"><b>${esc(i.t)}</b><small>${sub}</small></div>
   ${opened ? `<button type="button" class="btn" onclick="WA.done=new Set();waQ()">Start over</button>` : ""}
   ${!single && ok.length ? `<div class="wa-bar"><i style="width:${Math.round((opened / ok.length) * 100)}%"></i></div>` : ""}`;
}
function waPrev() {
  const el = $("#wa_prev"); if (!el) return;
  const { ok } = waTargets(), raw = WA.txt[WA.mode].trim();
  const s = (ok.find((x) => !WA.done.has(x.s.id)) || ok[0] || {}).s || (WA.mode === "student" ? DB.Students.find((x) => x.id === WA.student) : null);
  el.innerHTML = `<div class="wa-msg out"><div class="wa-bub">${raw ? `<div class="wa-tx">${esc(s ? waFill(raw, s) : raw)}</div>` : `<div class="wa-tx mut"><i>Your message will appear here</i></div>`}<div class="wa-meta">${s ? "Preview for " + esc(waFirst(s.name)) : "Preview"}</div></div></div>`;
}
function waSync() {
  const btn = $("#wa_send"), hint = $("#wa_hint"); if (!btn) return;
  const b = waBatch(), picked = waPicked(), ready = picked && !(b && !waLinkOk(b.groupLink));
  const { ok } = ready ? waTargets() : { ok: [] }, next = ok.find((x) => !WA.done.has(x.s.id));
  btn.disabled = !next;
  hint.textContent = !picked ? "Choose a chat first." : !ready ? "Save a group link on this batch to continue."
    : next ? "Send opens WhatsApp for " + next.s.name + "." : ok.length ? "All chats opened." : "No usable phone numbers.";
}
function waQ(keepScroll) {
  const el = $("#wa_thread"); if (!el) return;
  const m = WA.mode, keep = keepScroll ? el.scrollTop : 0;
  waHead();
  if (!waPicked()) {
    el.innerHTML = `<div class="wa-blank"><div class="wa-blank-i">${svg("wa")}</div><b>Message your students</b><span>Pick a ${m === "student" ? "student" : m === "group" ? "batch" : "class or batch"} on the left, write your message and press send.</span></div>`;
    waSync(); return;
  }
  const b = waBatch();
  let h = `<div class="wa-sys">Nothing is sent automatically. Press send, then press Send in WhatsApp.</div>`;
  if (b) h += waLinkOk(b.groupLink)
    ? `<div class="wa-msg in"><div class="wa-bub"><small>Group invite link</small><a href="${esc(b.groupLink)}" target="_blank" rel="noopener">${esc(b.groupLink)}</a><div class="wa-acts"><button type="button" class="btn" onclick="waCopy('${esc(b.groupLink)}')">Copy</button><button type="button" class="btn" onclick="editBatch('${esc(b.id)}')">Change</button></div></div></div>`
    : `<div class="wa-msg in"><div class="wa-bub">This batch has no WhatsApp group link yet. Create the group in WhatsApp, copy its invite link, then save it on the batch.<div class="wa-acts"><button type="button" class="btn p" onclick="editBatch('${esc(b.id)}')">Add link</button></div></div></div>`;
  if (b && !waLinkOk(b.groupLink)) { el.innerHTML = h; waSync(); return; }
  const { ok, skipped } = waTargets(), next = ok.find((x) => !WA.done.has(x.s.id));
  h += `<div id="wa_prev"></div>`;
  h += ok.length
    ? `<div class="wa-sys">Recipients</div><div class="wa-rcp">${ok.map((x) => `<div class="wa-rr ${next && next.s.id === x.s.id ? "nx" : ""}">${waAv(x.s.name, init(x.s.name))}<span class="wa-rt"><b>${esc(x.s.name)}</b><small>${esc(x.s.sid)} · ${esc(x.num)}</small></span>${WA.done.has(x.s.id) ? `<span class="wa-tick" title="Opened">${WA_ICO.tick}</span>` : ""}<button type="button" class="btn" onclick="waOpen('${esc(x.s.id)}')">${WA.done.has(x.s.id) ? "Open again" : "Open chat"}</button></div>`).join("")}</div>`
    : `<div class="wa-sys">No one here has a usable phone number.</div>`;
  if (skipped.length) h += `<details class="wa-skip"><summary>Skipped (${skipped.length})</summary>${skipped.map((x) => `<div>${esc(x.s.name)} · ${esc(x.why)}${x.s.phone ? " (" + esc(x.s.phone) + ")" : ""}</div>`).join("")}</details>`;
  el.innerHTML = h; waPrev(); waSync();
  if (keepScroll) {
    el.scrollTop = keep;
    const nx = el.querySelector(".wa-rr.nx");
    if (nx && (nx.offsetTop < el.scrollTop || nx.offsetTop + nx.offsetHeight > el.scrollTop + el.clientHeight)) el.scrollTop = Math.max(0, nx.offsetTop - el.clientHeight / 2);
  }
}

/* ---------- actions ---------- */
function waOpen(id) {
  const x = waTargets().ok.find((r) => r.s.id === id); if (!x) return;
  const text = waFill(WA.txt[WA.mode].trim(), x.s);
  const w = window.open(waUrl(x.num, text), "tp_whatsapp"); // same tab every time
  if (!w) { toast("Your browser blocked the pop-up. Allow pop-ups for this site and try again."); return; }
  WA.done.add(id); waQ(true);
}
function waNext() { const n = waTargets().ok.find((r) => !WA.done.has(r.s.id)); if (n) waOpen(n.s.id); }
function waSend() { waNext(); }
async function waCopy(t) { try { await navigator.clipboard.writeText(t); toast("Copied"); } catch (e) { toast("Could not copy. Select and copy it manually."); } }
