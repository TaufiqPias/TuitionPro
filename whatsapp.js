/* ============ WHATSAPP (WAHA) — chats, smart broadcast, smart groups ============
   Layout:   [+ New message] [Send to class / all] [Groups]            [Settings]
             chat list (left)  |  conversation (right)
   Chats     come from the backend inbox (action "waChats"); students and batch groups are matched by phone / group JID.
   Broadcast is sent from this browser one message at a time (waSend), with a random delay, so it never hits the
             Apps Script 6-minute limit, shows live progress, can be stopped, and failed messages can be retried.
   Groups    one WhatsApp group per batch (waCreateGroup), optional welcome message, and matching of existing groups.
   Backend   Code.gs actions used: waChats, waInbox, waSend, waCreateGroup, waListGroups. */

const WA_DEF = {
  cc: "880",                                   // country code for numbers that start with 0
  delay: 5,                                    // seconds between broadcast messages (randomised a little)
  callBase: "https://meet.jit.si/",            // room name is added to the end of this address
  welcome: "Assalamu alaikum! This is the official WhatsApp group of {{batch}}. Class updates, notices and results will be shared here.",
};
const WA = {
  cfg: (() => { try { return { ...WA_DEF, ...JSON.parse(localStorage.getItem("wa_cfg") || "{}") }; } catch (e) { return { ...WA_DEF }; } })(),
  seen: (() => { try { return JSON.parse(localStorage.getItem("wa_seen") || "{}"); } catch (e) { return {}; } })(),
  chats: [],          // conversation summaries from the backend
  loaded: false,      // chat list fetched at least once
  err: "",
  sel: "",            // open chat id: "<number>@c.us" or "<gid>@g.us"
  q: "",              // chat search text
  msgs: [],           // messages of the open chat
  lastTs: "",         // server timestamp of the newest loaded message
  pane: "list",       // mobile: list | chat
  draft: {},          // unsent text per chat
  busy: false,
  lbusy: false,
  tick: 0,
  timer: null,
  q2: null,           // running / last queue (broadcast or group creation)
  ab: { aud: "all", inactive: false, text: "" },   // broadcast form memory
  gsel: new Set(),    // group creation: selected batches
};

/* ---------- small helpers ---------- */
const waSave = () => { try { localStorage.setItem("wa_cfg", JSON.stringify(WA.cfg)); } catch (e) {} };
const waSeenSave = () => { try { localStorage.setItem("wa_seen", JSON.stringify(WA.seen)); } catch (e) {} };
const waErr = (e) => String((e && e.message) || e || "Something went wrong");
const waDigits = (id) => String(id || "").replace(/@.*$/, "");
const waIsGroup = (id) => String(id || "").endsWith("@g.us");
const waFirst = (n) => String(n || "").trim().split(/\s+/)[0] || "";
const waLinkOk = (u) => /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,}/.test(String(u || "").trim());
const waActive = (s) => (s.status || "Active") === "Active";
const waPersonal = (t) => /\{\{?\s*(name|first|sid)\s*\}\}?/i.test(t || "");
const waSleep = async (ms, Q) => { const end = Date.now() + ms; while (Date.now() < end && !(Q && Q.stop)) await new Promise((r) => setTimeout(r, 250)); };
const waGrow = (el) => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 180) + "px"; };
const waHue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const waAv = (seed, html) => `<span class="wa-av" style="background:hsl(${waHue(seed)} 52% 46%)">${html}</span>`;
const waTime = (ts) => { const d = new Date(ts); return isNaN(d) ? "" : d; };
const waFull = (ts) => { const d = waTime(ts); return d ? d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""; };
function waShort(ts) {
  const d = waTime(ts); if (!d) return "";
  const n = new Date();
  if (d.toDateString() === n.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (n - d < 6 * 864e5) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
const waDur = (n, secs) => { const t = Math.max(1, Math.round((n * secs * 1.1) / 60)); return t < 2 ? "about a minute" : "about " + t + " minutes"; };

/* ---------- phone numbers -> WhatsApp ids ---------- */
function waNum(p) {
  const cc = String(WA.cfg.cc || "880");
  let d = String(p ?? "").split(/[,;/\n]|\sor\s/i)[0].replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = cc + d.slice(1);
  else if (cc === "880" && /^1\d{9}$/.test(d)) d = cc + d;
  if (d.length < 10 || d.length > 15) return null;
  if (d.startsWith("880") && d.length !== 13) return null;
  return d;
}
const waChatId = (s) => { const n = waNum(s.phone); return n ? n + "@c.us" : null; };

// {{name}} {{first}} {{guardian}} {{class}} {{batch}} {{sid}} {{link}}  (single braces still work)
function waFill(t, s, bOverride) {
  const b = bOverride || (s ? batchOf(s) : null);
  const m = {
    name: s ? s.name : "", first: s ? waFirst(s.name) : "", guardian: s ? s.guardian || "Guardian" : "everyone",
    class: b ? clsLabel(b.class) : s ? clsLabel(stuClass(s)) : "", batch: b ? bLabel(b) : "", sid: s ? s.sid : "",
    link: b && b.groupLink ? b.groupLink : "",
  };
  return String(t).replace(/\{\{?\s*(name|first|guardian|class|batch|sid|link)\s*\}\}?/gi, (_, k) => m[k.toLowerCase()] ?? "");
}

/* ---------- conversations (backend chats + students + batch groups) ---------- */
function waConvos() {
  const byNum = new Map();
  DB.Students.slice().sort((a, b) => (isArch(a) ? 1 : 0) - (isArch(b) ? 1 : 0)).forEach((s) => { const n = waNum(s.phone); if (n && !byNum.has(n)) byNum.set(n, s); });
  const byJid = new Map(DB.Batches.filter((b) => b.groupJid).map((b) => [b.groupJid, b]));
  const list = WA.chats.map((c) => waConvo(c, byNum, byJid));
  if (WA.sel && !list.some((c) => c.id === WA.sel)) list.unshift(waConvo({ id: WA.sel, name: "", from: "", text: "", ts: "", dir: "", n: 0 }, byNum, byJid));
  return list;
}
function waConvo(c, byNum, byJid) {
  const id = c.id, group = waIsGroup(id), num = group ? "" : waDigits(id);
  let title, sub, av, s = null, b = null;
  if (group) {
    b = byJid.get(id) || null;
    title = b ? bLabel(b) + " · group" : "WhatsApp group";
    sub = b ? "WhatsApp group · " + DB.Students.filter((x) => x.batchId === b.id && !isArch(x) && waActive(x)).length + " students" : "WhatsApp group";
    av = waAv(b ? b.class : id, b ? esc(clsCode(b.class)) : "G");
  } else {
    s = byNum.get(num) || null;
    if (s) { const sb = batchOf(s); title = s.name; sub = s.sid + (sb ? " · " + bLabel(sb) : ""); av = waAv(s.name, init(s.name)); }
    else { title = c.name || "+" + num; sub = c.name ? "+" + num : "Not in your student list"; av = waAv(num, c.name ? init(c.name) : "+"); }
  }
  const preview = c.text ? (c.dir === "out" ? "You: " : group && c.from ? c.from + ": " : "") + c.text : "";
  const unread = c.dir === "in" && c.ts && c.ts > (WA.seen[id] || "");
  return { id, title, sub, num, group, s, b, av, text: preview, ts: c.ts, unread };
}
const waCurrent = () => (WA.sel ? waConvos().find((c) => c.id === WA.sel) || null : null);

/* ---------- page shell ---------- */
function vWA() {
  const v = $("#view");
  if (v.querySelector("#wa")) { waRenderList(); waHead(); waQueueUI(); return; }   // background data refresh: keep the chat as it is
  v.innerHTML = `
  <div class="wa2">
   <div class="wa-tools glass">
    <button class="btn p" onclick="waNew()"><b>+</b> New message</button>
    <button class="btn" onclick="waBroadcast()">Send to class / all</button>
    <button class="btn" onclick="waGroups()">Groups</button>
    <span class="grow"></span>
    <button class="btn" onclick="waSettings()">Settings</button>
   </div>
   <div id="wa_queue"></div>
   <div class="wa ${WA.pane === "chat" && WA.sel ? "show-chat" : ""}" id="wa">
    <aside class="wa-side glass">
     <div class="wa-search"><input class="in" id="wa_find" type="search" autocomplete="off" placeholder="Search chats" value="${esc(WA.q)}"></div>
     <div class="wa-list" id="wa_list"></div>
    </aside>
    <section class="wa-chat glass">
     <header class="wa-ch" id="wa_head"></header>
     <div class="wa-thread" id="wa_thread"></div>
     <footer class="wa-comp" id="wa_comp">
      <div class="wa-in">
       <textarea class="wa-ta" id="wa_text" rows="1" placeholder="Type a message"></textarea>
       <button type="button" class="wa-send" id="wa_send" onclick="waSend()">Send</button>
      </div>
      <div class="wa-hint">Enter to send · Shift+Enter for a new line · {{first}}, {{guardian}} and {{batch}} work in messages</div>
     </footer>
    </section>
   </div>
  </div>`;
  const ta = $("#wa_text");
  ta.oninput = () => { if (WA.sel) WA.draft[WA.sel] = ta.value; waGrow(ta); waSyncSend(); };
  ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(hover: hover)").matches) { e.preventDefault(); waSend(); } };
  $("#wa_find").oninput = (e) => { WA.q = e.target.value; waRenderList(); };
  $("#wa_list").onclick = (e) => { const r = e.target.closest("[data-id]"); if (r) waOpen(r.dataset.id); };
  waRenderList(); waRenderChat(); waQueueUI();
  if (WA.sel) waLoadHistory();
  waLoadChats();
  if (!WA.timer) WA.timer = setInterval(waTick, 5000);
}
function waTick() {
  if (!$("#wa")) { clearInterval(WA.timer); WA.timer = null; return; }
  if (route !== "wa" || document.hidden || !API_URL || !TOKEN) return;
  WA.tick++;
  if (WA.sel) waPoll();
  if (WA.tick % 3 === 0) waLoadChats();
}
window.addEventListener("beforeunload", (e) => { if (WA.q2 && WA.q2.running) { e.preventDefault(); e.returnValue = ""; } });

/* ---------- chat list ---------- */
async function waLoadChats() {
  if (!API_URL) { WA.loaded = true; waRenderList(); return; }
  if (WA.lbusy) return;
  WA.lbusy = true;
  try {
    const j = await api("waChats"); WA.chats = j.chats || []; WA.err = "";
    if (!WA.seenInit) {   // first time on this device: existing conversations count as read
      WA.seenInit = true;
      if (!localStorage.getItem("wa_seen")) { WA.chats.forEach((c) => { WA.seen[c.id] = c.ts; }); waSeenSave(); }
    }
  }
  catch (e) { WA.err = e.auth ? "" : waErr(e); if (e.auth && typeof showLogin === "function") showLogin(); }
  WA.loaded = true; WA.lbusy = false;
  waRenderList(); waHead();
}
function waRow(c) {
  return `<button type="button" class="wa-row ${WA.sel === c.id ? "sel" : ""} ${c.unread ? "unread" : ""}" data-id="${esc(c.id)}">${c.av}
   <span class="wa-rt"><b>${esc(c.title)}</b><small>${esc(c.text || c.sub)}</small></span>
   <span class="wa-rm">${c.ts ? `<em>${esc(waShort(c.ts))}</em>` : ""}${c.unread ? `<i class="wa-dot"></i>` : ""}</span></button>`;
}
function waRenderList() {
  const el = $("#wa_list"); if (!el) return;
  const q = WA.q.trim().toLowerCase(), all = waConvos();
  let cv = q ? all.filter((c) => [c.title, c.sub, c.num, c.text].some((v) => String(v || "").toLowerCase().includes(q))) : all;
  let h = cv.map(waRow).join("");
  if (q) {
    const have = new Set(all.map((c) => c.id));
    const extra = liveStu().filter((s) => { const n = waNum(s.phone); return n && !have.has(n + "@c.us") && [s.name, s.sid, s.phone, s.guardian].some((v) => String(v || "").toLowerCase().includes(q)); }).slice(0, 25);
    if (extra.length) h += `<div class="wa-grp">Start a new chat</div>` + extra.map((s) => waRow({ id: waChatId(s), title: s.name, sub: s.sid, text: "", ts: "", unread: false, av: waAv(s.name, init(s.name)) })).join("");
  }
  if (!h) {
    h = `<div class="wa-empty">${q ? "No chats match your search." : !API_URL ? "Connect the Apps Script backend to see WhatsApp conversations." : WA.err ? "Could not load chats: " + esc(WA.err) + "<br>If you just updated the code, deploy Code.gs as a new version." : !WA.loaded ? "Loading chats…" : "No conversations yet.<br>Use <b>+ New message</b> or <b>Send to class / all</b>."}</div>`;
  }
  if (el._h === h) return;
  el._h = h;
  const top = el.scrollTop; el.innerHTML = h; el.scrollTop = top;
}
function waOpen(id) {
  if (!id) return;
  const ta = $("#wa_text"); if (ta && WA.sel) WA.draft[WA.sel] = ta.value;
  WA.sel = id; WA.msgs = []; WA.lastTs = ""; WA.pane = "chat";
  const c = WA.chats.find((x) => x.id === id); WA.seen[id] = c ? c.ts : WA.seen[id] || ""; waSeenSave();
  const w = $("#wa"); if (w) w.classList.add("show-chat");
  waRenderList(); waRenderChat(); waLoadHistory();
  if (matchMedia("(hover: hover)").matches && $("#wa_text")) $("#wa_text").focus();
}
function waBack() { WA.pane = "list"; const w = $("#wa"); if (w) w.classList.remove("show-chat"); }
// Students table button: open this student's chat
function waOne(id) {
  const s = DB.Students.find((x) => x.id === id), cid = s && waChatId(s);
  if (!cid) { toast("This student has no valid phone number"); return; }
  WA.sel = cid; WA.msgs = []; WA.lastTs = ""; WA.pane = "chat";
  go("wa");
}

/* ---------- conversation pane ---------- */
function waHead() {
  const el = $("#wa_head"); if (!el) return;
  const back = `<button type="button" class="wa-back" onclick="waBack()" title="Back to chats" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>`;
  const c = waCurrent();
  if (!c) { el.innerHTML = `${back}<div class="wa-ht"><b>WhatsApp</b><small>Choose a chat to start</small></div>`; return; }
  const acts = c.group ? `<span class="wa-tag ok">WhatsApp group</span>` :
    `<button type="button" class="btn" onclick="waCall('voice')">Voice call link</button><button type="button" class="btn" onclick="waCall('video')">Video link</button><a class="btn wa-tel" href="tel:+${esc(c.num)}">Phone call</a>`;
  el.innerHTML = `${back}${c.av}<div class="wa-ht"><b>${esc(c.title)}</b><small>${esc(c.sub)}</small></div><div class="wa-hacts">${acts}</div>`;
}
function waRenderChat() {
  waHead();
  const comp = $("#wa_comp"), ta = $("#wa_text"); if (!comp || !ta) return;
  comp.hidden = !WA.sel;
  ta.value = WA.draft[WA.sel] || ""; waGrow(ta); waSyncSend();
  waRenderThread(true);
}
function waRenderThread(force) {
  const el = $("#wa_thread"); if (!el) return;
  if (!WA.sel) { el.innerHTML = `<div class="wa-blank"><div class="wa-blank-i">${svg("wa")}</div><b>Message your students</b><span>Pick a chat on the left, or press <b>+ New message</b>.<br>Use <b>Send to class / all</b> for announcements and <b>Groups</b> to create batch groups.</span></div>`; return; }
  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  if (!WA.msgs.length) el.innerHTML = `<div class="wa-blank"><div class="wa-blank-i">${svg("wa")}</div><b>No messages yet</b><span>Send the first message below.</span></div>`;
  else el.innerHTML = WA.msgs.map(waBubble).join("");
  if (force || near) el.scrollTop = el.scrollHeight;
}
function waBubble(m) {
  const t = waFull(m.ts);
  if (m.dir === "out") return `<div class="wa-msg out"><div class="wa-bub"><div class="wa-tx">${esc(m.text)}</div><div class="wa-meta">${esc(t)} · ${m.tmp ? "sending" : "sent"}</div></div></div>`;
  return `<div class="wa-msg in"><div class="wa-bub">${m.name && waIsGroup(WA.sel) ? `<small class="wa-sn">${esc(m.name)}</small>` : ""}<div class="wa-tx">${esc(m.text)}</div><div class="wa-meta">${esc(t)}</div></div></div>`;
}
function waSyncSend() { const b = $("#wa_send"), ta = $("#wa_text"); if (b && ta) b.disabled = !WA.sel || !ta.value.trim(); }

async function waLoadHistory() {
  const id = WA.sel; if (!id || !API_URL) return;
  try {
    const j = await api("waInbox", { chatId: id, limit: 300 });
    if (id !== WA.sel) return;
    WA.msgs = j.messages || [];
    WA.lastTs = WA.msgs.length ? WA.msgs[WA.msgs.length - 1].ts : "";
    waRenderThread(true);
  } catch (e) { if (id === WA.sel) toast(waErr(e)); }
}
async function waPoll() {
  const id = WA.sel; if (!id || WA.busy || !API_URL) return;
  WA.busy = true;
  try {
    const j = await api("waInbox", { chatId: id, since: WA.lastTs });
    if (id === WA.sel && j.messages && j.messages.length) {
      WA.msgs = WA.msgs.filter((m) => !m.tmp).concat(j.messages);
      WA.lastTs = j.messages[j.messages.length - 1].ts;
      WA.seen[id] = WA.lastTs; waSeenSave();
      waRenderThread(); waLoadChats();
    }
  } catch (e) { /* the next poll retries */ }
  WA.busy = false;
}
async function waSend() {
  const ta = $("#wa_text"); if (!ta || !WA.sel) return;
  let text = ta.value.trim(); if (!text) return;
  if (!API_URL) { toast("Connect the Apps Script backend to send WhatsApp messages."); return; }
  const id = WA.sel, c = waCurrent(), group = waIsGroup(id);
  text = waFill(text, c && c.s, c && c.b);
  $("#wa_send").disabled = true;
  try {
    await api("waSend", { chat: group ? id : waDigits(id), text, isGroup: group });
    if (id === WA.sel) {
      WA.msgs.push({ ts: new Date().toISOString(), dir: "out", name: "", text, tmp: true });
      ta.value = ""; WA.draft[id] = ""; waGrow(ta); waRenderThread(true);
      waPoll();
    }
    const ch = WA.chats.find((x) => x.id === id);
    if (ch) { ch.text = text; ch.dir = "out"; ch.ts = new Date().toISOString(); } else WA.chats.unshift({ id, name: "", from: "", text, dir: "out", ts: new Date().toISOString(), n: 1 });
    waRenderList(); waLoadChats();
  } catch (e) { toast(waErr(e)); }
  waSyncSend();
  if (matchMedia("(hover: hover)").matches) ta.focus();
}
// Voice / video: adds a meeting link to the message box so you can check it before sending
function waCall(kind) {
  const ta = $("#wa_text"); if (!ta || !WA.sel) return;
  let base = String(WA.cfg.callBase || "").trim();
  if (!/^https:\/\//i.test(base)) base = WA_DEF.callBase;
  if (!/[\/=]$/.test(base)) base += "/";
  const room = "TP-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const link = base + room + (kind === "voice" && /jit\.si|jitsi/i.test(base) ? "#config.startWithVideoMuted=true" : "");
  const t = `Assalamu alaikum {{first}}, please join our ${kind === "voice" ? "voice call" : "video class"} here:\n${link}`;
  ta.value = ta.value.trim() ? ta.value.trim() + "\n" + t : t;
  WA.draft[WA.sel] = ta.value; waGrow(ta); waSyncSend(); ta.focus();
  toast("Link added. Check it, then press Send.");
}

/* ---------- queue runner (broadcast + group creation) ---------- */
async function waRun(Q) {
  if (Q.running) return;
  WA.q2 = Q; Q.running = true; Q.stop = false; Q.done = false;
  let streak = 0;
  waQueueUI();
  while (!Q.stop) {
    const it = Q.items.find((x) => x.status === "wait"); if (!it) break;
    it.status = "run"; waQueueUI();
    try { await Q.fn(it); it.status = "ok"; it.err = ""; streak = 0; }
    catch (e) {
      it.status = "fail"; it.err = waErr(e); streak++;
      if (e && e.auth) { Q.stop = true; Q.note = "Signed out"; if (typeof showLogin === "function") showLogin(); }
      else if (streak >= 3) { Q.stop = true; Q.note = "Stopped after 3 failures in a row: " + it.err; }
    }
    waQueueUI();
    if (!Q.stop && Q.items.some((x) => x.status === "wait")) await waSleep(Math.max(2, Q.gap) * (0.8 + Math.random() * 0.6) * 1000, Q);
  }
  Q.running = false; Q.done = !Q.items.some((x) => x.status === "wait");
  waQueueUI();
  const ok = Q.items.filter((x) => x.status === "ok").length, bad = Q.items.filter((x) => x.status === "fail").length;
  toast(Q.title + ": " + ok + " done" + (bad ? ", " + bad + " failed" : ""));
  if (Q.onDone) { try { Q.onDone(); } catch (e) {} }
  waLoadChats();
}
function waQAct(a) {
  const Q = WA.q2; if (!Q) return;
  if (a === "stop") { Q.stop = true; return; }
  if (a === "dismiss") { if (!Q.running) { WA.q2 = null; waQueueUI(); } return; }
  if (a === "retry") Q.items.forEach((x) => { if (x.status === "fail") x.status = "wait"; });
  Q.note = ""; waRun(Q);
}
function waQueueUI() {
  const el = $("#wa_queue"); if (!el) return;
  const Q = WA.q2;
  if (!Q) { el.innerHTML = ""; return; }
  const n = Q.items.length, ok = Q.items.filter((x) => x.status === "ok").length, bad = Q.items.filter((x) => x.status === "fail").length;
  const left = Q.items.filter((x) => x.status === "wait" || x.status === "run").length;
  const head = Q.running ? `${esc(Q.title)}: ${Math.min(n, ok + bad + 1)} of ${n}…` : left ? `${esc(Q.title)} stopped` : `${esc(Q.title)} finished`;
  const btns = Q.running ? `<button class="btn" onclick="waQAct('stop')">Stop</button>` :
    (left ? `<button class="btn p" onclick="waQAct('resume')">Resume</button>` : "") + (bad ? `<button class="btn" onclick="waQAct('retry')">Retry failed (${bad})</button>` : "") + `<button class="btn" onclick="waQAct('dismiss')">Dismiss</button>`;
  const fails = Q.items.filter((x) => x.status === "fail");
  el.innerHTML = `<div class="wa-q glass"><div class="wa-qh"><span><b>${head}</b> <span class="mut">${ok} done${bad ? ", " + bad + " failed" : ""}${Q.note ? " · " + esc(Q.note) : ""}</span></span><span class="wa-qb">${btns}</span></div>
   <div class="wa-qbar"><i style="width:${Math.round(((ok + bad) / n) * 100)}%"></i></div>
   ${fails.length ? `<details class="wa-skip"><summary>Failed (${fails.length})</summary>${fails.map((x) => `<div>${esc(x.label)} — ${esc(x.err)}</div>`).join("")}</details>` : ""}</div>`;
}

/* ---------- + New message ---------- */
function waNew() {
  $("#modal").innerHTML = `<h2>New message</h2>
   <input class="in" id="wn_q" type="search" autocomplete="off" placeholder="Search student, ID, phone or batch group" style="width:100%;color:var(--tx)">
   <div class="wa-pick" id="wn_list"></div>
   <div class="acts"><button class="btn" onclick="closeM()">Cancel</button></div>`;
  $("#ov").classList.add("on");
  const draw = () => {
    const q = $("#wn_q").value.trim().toLowerCase();
    const S = liveStu().filter((s) => !q || [s.name, s.sid, s.phone, s.guardian].some((v) => String(v || "").toLowerCase().includes(q))).sort((a, b) => String(a.name).localeCompare(String(b.name))).slice(0, 60);
    const G = DB.Batches.filter((b) => b.groupJid && (!q || bLabel(b).toLowerCase().includes(q) || "group".includes(q)));
    let h = G.map((b) => `<button type="button" class="wa-row" data-id="${esc(b.groupJid)}">${waAv(b.class, esc(clsCode(b.class)))}<span class="wa-rt"><b>${esc(bLabel(b))} · group</b><small>WhatsApp group</small></span></button>`).join("");
    h += S.map((s) => { const id = waChatId(s), sb = batchOf(s); return `<button type="button" class="wa-row" ${id ? `data-id="${esc(id)}"` : "disabled"}>${waAv(s.name, init(s.name))}<span class="wa-rt"><b>${esc(s.name)}</b><small>${esc(s.sid)}${sb ? " · " + esc(bLabel(sb)) : ""}</small></span>${id ? "" : `<i class="wa-tag">No phone</i>`}</button>`; }).join("");
    $("#wn_list").innerHTML = h || `<div class="wa-empty">No students match.</div>`;
  };
  $("#wn_q").oninput = draw;
  $("#wn_list").onclick = (e) => { const r = e.target.closest("[data-id]"); if (r) { closeM(); waOpen(r.dataset.id); } };
  draw(); setTimeout(() => $("#wn_q").focus(), 50);
}

/* ---------- Send to class / all ---------- */
function waAudience(aud, inactive, text) {
  if (aud === "G:all" || aud.startsWith("g:")) {
    const bs = aud === "G:all" ? sortBatches(DB.Batches).filter((b) => b.groupJid) : DB.Batches.filter((b) => b.id === aud.slice(2) && b.groupJid);
    return { group: true, ok: bs.map((b) => ({ chat: b.groupJid, isGroup: true, b, label: bLabel(b) + " · group" })), skipped: [] };
  }
  let list = liveStu();
  if (aud.startsWith("c:")) list = list.filter((s) => stuClass(s) === aud.slice(2));
  else if (aud.startsWith("b:")) list = list.filter((s) => s.batchId === aud.slice(2));
  if (!inactive) list = list.filter(waActive);
  const personal = waPersonal(text), ok = [], skipped = [], seen = new Set();
  list.forEach((s) => {
    const n = waNum(s.phone);
    if (!n) skipped.push({ s, why: s.phone ? "Invalid number" : "No phone" });
    else if (!personal && seen.has(n)) skipped.push({ s, why: "Same number as another student (sent once)" });
    else { seen.add(n); ok.push({ chat: n, isGroup: false, s, label: s.name }); }
  });
  return { group: false, ok, skipped };
}
function waBroadcast() {
  const B = sortBatches(DB.Batches), used = CLASSES.filter((x) => B.some((b) => b.class === x)), gb = B.filter((b) => b.groupJid), sel = WA.ab.aud;
  const opt = (v, l) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(l)}</option>`;
  const chips = ["first", "name", "guardian", "class", "batch", "sid", "link"].map((k) => `<button type="button" class="chip" onclick="waIns('wb_text','{{${k}}}')">{{${k}}}</button>`).join("");
  $("#modal").innerHTML = `<h2>Send to class / all</h2>
   <div class="f">
    <label class="full">Audience<select class="in" id="wb_aud">
     <optgroup label="Students — one message each">${opt("all", "All active students")}${used.map((x) => opt("c:" + x, clsLabel(x) + " — all batches")).join("")}${B.map((b) => opt("b:" + b.id, bLabel(b))).join("")}</optgroup>
     ${gb.length ? `<optgroup label="WhatsApp groups — one message per group">${opt("G:all", "Every batch group (" + gb.length + ")")}${gb.map((b) => opt("g:" + b.id, "Group · " + bLabel(b))).join("")}</optgroup>` : ""}
    </select></label>
    <label class="wa-inc full" id="wb_incw"><input type="checkbox" id="wb_inact" ${WA.ab.inactive ? "checked" : ""}> Include Inactive, Suspended and Left students</label>
    <label class="full">Message<textarea class="in ta" id="wb_text" rows="5" placeholder="Dear {{guardian}}, {{name}}'s class is cancelled tomorrow due to the holiday.">${esc(WA.ab.text)}</textarea></label>
   </div>
   <div class="wa-chips">${chips}</div>
   <div class="wb-note" id="wb_count"></div>
   <div class="wb-prev" id="wb_prev" hidden></div>
   <details class="wa-skip" id="wb_skip" hidden></details>
   <div class="acts"><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" id="wb_go" onclick="waBroadcastGo()">Send</button></div>`;
  ["wb_aud", "wb_inact", "wb_text"].forEach((id) => { $("#" + id).oninput = waBUpdate; $("#" + id).onchange = waBUpdate; });
  $("#ov").classList.add("on");
  waBUpdate(); setTimeout(() => $("#wb_text").focus(), 50);
}
function waIns(id, t) {
  const el = $("#" + id); if (!el) return;
  const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  el.value = el.value.slice(0, a) + t + el.value.slice(b);
  el.focus(); el.selectionStart = el.selectionEnd = a + t.length;
  el.dispatchEvent(new Event("input"));
}
function waBUpdate() {
  const aud = $("#wb_aud").value, inactive = $("#wb_inact").checked, text = $("#wb_text").value;
  WA.ab.aud = aud; WA.ab.inactive = inactive; WA.ab.text = text;
  $("#wb_incw").hidden = aud === "G:all" || aud.startsWith("g:");
  const A = waAudience(aud, inactive, text), n = A.ok.length, secs = WA.cfg.delay;
  $("#wb_count").innerHTML = n
    ? `${n} ${A.group ? "group" : "recipient"}${n > 1 ? "s" : ""}${A.group ? "" : " with a valid phone number"}. Messages go out slowly (about ${secs} seconds apart) to protect your number${n > 1 ? " — " + waDur(n, secs) + " in total" : ""}.`
    : A.group ? "No batch has a WhatsApp group yet. Use <b>Groups</b> to create them." : "Nobody in this audience has a valid phone number.";
  const first = A.ok[0], pv = $("#wb_prev");
  if (first && text.trim()) { pv.hidden = false; pv.innerHTML = `<small>Preview for ${esc(first.label)}</small><div>${esc(waFill(text.trim(), first.s, first.b))}</div>`; } else pv.hidden = true;
  const sk = $("#wb_skip");
  if (A.skipped.length) { sk.hidden = false; sk.innerHTML = `<summary>Skipped (${A.skipped.length})</summary>${A.skipped.map((x) => `<div>${esc(x.s.name)} · ${esc(x.why)}${x.s.phone ? " (" + esc(x.s.phone) + ")" : ""}</div>`).join("")}`; } else sk.hidden = true;
  $("#wb_go").disabled = !n || !text.trim();
}
function waBroadcastGo() {
  const aud = $("#wb_aud").value, inactive = $("#wb_inact").checked, text = $("#wb_text").value.trim();
  const A = waAudience(aud, inactive, text), n = A.ok.length;
  if (!n || !text) return;
  if (!API_URL) { toast("Connect the Apps Script backend to send WhatsApp messages."); return; }
  if (WA.q2 && WA.q2.running) { toast("Another send is still running. Stop it first."); return; }
  if (!confirm(`Send this message to ${n} ${A.group ? "group" : "recipient"}${n > 1 ? "s" : ""}?\n\nIt will take ${waDur(n, WA.cfg.delay)}. Keep this tab open until it finishes.`)) return;
  closeM();
  const items = A.ok.map((x) => ({ chat: x.chat, isGroup: x.isGroup, text: waFill(text, x.s, x.b), label: x.label, status: "wait" }));
  WA.ab.text = "";
  waRun({ title: "Broadcast", items, gap: WA.cfg.delay, fn: (it) => api("waSend", { chat: it.chat, text: it.text, isGroup: it.isGroup }) });
}

/* ---------- Groups (smart group creation) ---------- */
function waGroupInfo(b) {
  const seen = new Set(), nums = []; let skipped = 0;
  liveStu().filter((s) => s.batchId === b.id && waActive(s)).forEach((s) => { const n = waNum(s.phone); if (!n) skipped++; else if (!seen.has(n)) { seen.add(n); nums.push(n); } });
  return { nums, skipped };
}
function waGroups() {
  const B = sortBatches(DB.Batches);
  if (!B.length) { toast("Add a class/batch first"); return; }
  WA.gsel = new Set(B.filter((b) => !b.groupJid && waGroupInfo(b).nums.length).map((b) => b.id));
  const rows = B.map((b) => {
    const g = waGroupInfo(b), can = !b.groupJid && g.nums.length;
    return `<label class="wa-gr ${can ? "" : "off"}"><input type="checkbox" value="${esc(b.id)}" ${WA.gsel.has(b.id) ? "checked" : ""} ${can ? "" : "disabled"}>
     <span class="wa-rt"><b>${esc(bLabel(b))}</b><small>${g.nums.length} student${g.nums.length === 1 ? "" : "s"} with a valid number${g.skipped ? " · " + g.skipped + " without" : ""}</small></span>
     ${b.groupJid ? `<i class="wa-tag ok">Group ready</i>` : g.nums.length ? `<i class="wa-tag">No group</i>` : `<i class="wa-tag">No numbers</i>`}</label>`;
  }).join("");
  $("#modal").classList.add("wide");
  $("#modal").innerHTML = `<h2>Smart groups</h2>
   <p class="mut" style="font-size:12.5px;margin-bottom:10px">Creates one WhatsApp group per batch with its active students and saves the group on the batch, so you can chat with it and broadcast to it. Anyone whose WhatsApp privacy blocks being added needs the invite link instead.</p>
   <div class="wa-grlist" id="gr_list">${rows}</div>
   <label class="wa-inc"><input type="checkbox" id="wg_wel" checked> Send a welcome message in each new group</label>
   <textarea class="in ta" id="wg_text" rows="3" style="width:100%;color:var(--tx)">${esc(WA.cfg.welcome)}</textarea>
   <div class="acts"><button class="btn" onclick="waMatchGroups()" style="margin-right:auto">Match existing groups</button><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" id="wg_go" onclick="waGroupsGo()">Create groups</button></div>`;
  const upd = () => { const n = document.querySelectorAll("#gr_list input:checked").length; $("#wg_go").disabled = !n; $("#wg_go").textContent = n ? `Create ${n} group${n > 1 ? "s" : ""}` : "Create groups"; };
  $("#gr_list").onchange = upd; upd();
  $("#ov").classList.add("on");
}
function waGroupHint(m) { return /plus|not implemented|not supported|501/i.test(m) ? "This WAHA edition may not support groups (WAHA Plus is needed). " + m : m; }
function waGroupsGo() {
  const ids = [...document.querySelectorAll("#gr_list input:checked")].map((i) => i.value);
  if (!ids.length) return;
  if (!API_URL) { toast("Connect the Apps Script backend first."); return; }
  if (WA.q2 && WA.q2.running) { toast("Another job is still running. Stop it first."); return; }
  const wel = $("#wg_wel").checked ? $("#wg_text").value.trim() : "";
  if (!confirm(`Create ${ids.length} WhatsApp group${ids.length > 1 ? "s" : ""}?\n\nGroups are created about 15 seconds apart to protect your number (${Math.max(1, Math.ceil((ids.length * 15) / 60))} min). Keep this tab open until it finishes.`)) return;
  closeM();
  const items = ids.map((id) => { const b = DB.Batches.find((x) => x.id === id); return { b, label: bLabel(b), parts: waGroupInfo(b).nums, status: "wait" }; });
  waRun({
    title: "Creating groups", items, gap: 15,
    fn: async (it) => {
      let j;
      try { j = await api("waCreateGroup", { batchId: it.b.id, participants: it.parts }); } catch (e) { e.message = waGroupHint(waErr(e)); throw e; }
      it.b.groupJid = j.groupJid; waRenderList();
      if (wel) { await waSleep(3000); try { await api("waSend", { chat: j.groupJid, text: waFill(wel, null, it.b), isGroup: true }); } catch (e) { /* the group exists; welcome message is optional */ } }
    },
    onDone: () => load(false),
  });
}
async function waMatchGroups() {
  if (!API_URL) { toast("Connect the Apps Script backend first."); return; }
  toast("Looking for your existing groups…");
  try {
    const j = await api("waListGroups"), gs = (j.groups || []).filter((g) => typeof g.id === "string" && g.id.endsWith("@g.us"));
    let n = 0;
    for (const b of DB.Batches) {
      if (b.groupJid) continue;
      const g = gs.find((x) => String(x.name || "").trim().toLowerCase() === bLabel(b).trim().toLowerCase());
      if (g) { b.groupJid = g.id; if (await write("save", { table: "Batches", row: b }, "")) n++; }
    }
    toast(n ? `Linked ${n} existing group${n > 1 ? "s" : ""}` : "No group with a matching batch name was found");
    waGroups(); waRenderList();
  } catch (e) { toast(waGroupHint(waErr(e))); }
}

/* ---------- Settings ---------- */
function waSettings() {
  const c = WA.cfg;
  $("#modal").innerHTML = `<h2>WhatsApp settings</h2>
   <div class="f">
    <label>Country code<input class="in" id="ws_cc" inputmode="numeric" value="${esc(c.cc)}"></label>
    <label>Seconds between messages<input class="in" id="ws_delay" type="number" min="3" max="60" value="${esc(c.delay)}"></label>
    <label class="full">Call link address (the room name is added at the end)<input class="in" id="ws_call" value="${esc(c.callBase)}"></label>
    <label class="full">Welcome message for new groups<textarea class="in ta" id="ws_wel" rows="3">${esc(c.welcome)}</textarea></label>
   </div>
   <p class="mut" style="font-size:12px;margin-top:8px">A longer gap between messages is safer for your number. Numbers that start with 0 get the country code added.</p>
   <div class="acts"><button class="btn" onclick="waSettingsReset()" style="margin-right:auto">Reset</button><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" onclick="waSettingsSave()">Save</button></div>`;
  $("#ov").classList.add("on");
}
function waSettingsSave() {
  const cc = $("#ws_cc").value.replace(/\D/g, ""), d = Number($("#ws_delay").value), call = $("#ws_call").value.trim(), wel = $("#ws_wel").value.trim();
  if (!cc || cc.length > 4) { toast("Enter a valid country code, for example 880"); return; }
  if (!(d >= 3 && d <= 60)) { toast("Use 3 to 60 seconds between messages"); return; }
  if (call && !/^https:\/\//i.test(call)) { toast("The call link must start with https://"); return; }
  WA.cfg = { cc, delay: Math.round(d), callBase: call || WA_DEF.callBase, welcome: wel || WA_DEF.welcome };
  waSave(); closeM(); waRenderList(); waHead(); toast("Settings saved");
}
function waSettingsReset() { WA.cfg = { ...WA_DEF }; waSave(); closeM(); waRenderList(); toast("Settings reset"); }
