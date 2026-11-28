/* ============ WHATSAPP (WAHA) IM-STYLE CHAT ============
   Two-way chat UI powered by WAHA through the Apps Script backend.
   • Left pane: list of conversations — students, classes/batches (real WhatsApp groups), everyone (broadcast).
   • Right pane: WhatsApp-style chat — incoming grey bubbles, outgoing green bubbles, auto-grow composer.
   • Polls the backend inbox every 3 seconds for new incoming messages while a chat is open.
   • For batches with no group yet: "Create WhatsApp Group" button creates one via WAHA and saves the JID.
   • For batches with a group: chat is the actual WhatsApp group conversation.
   • "Send to everyone" broadcast button stays for the Everyone tab. */

const WA_CC = "880"; // default country code for numbers that start with 0
const WA_GROUP_TEXT = "Assalamu alaikum {guardian},\nPlease join the WhatsApp group of {batch} for {first} using this link:\n{link}";
const WA = {
  mode: "student",
  student: "",
  scope: "",
  inactive: false,
  txt: { student: "", batch: "", all: "", group: WA_GROUP_TEXT },
  done: new Set(),
  q: "",
  pane: "list",
  inbox: [],          // messages for the currently open chat (ts, dir, name, text)
  lastTs: "",         // timestamp of the newest message we have loaded (for polling)
  poll: null,         // active setInterval handle
  busy: false,        // prevents overlapping polls
};

/* ---------- phone numbers -> chatId ---------- */
function waNum(p) {
  let d = String(p ?? "").split(/[,;/\n]|\sor\s/i)[0].replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = WA_CC + d.slice(1);
  else if (WA_CC === "880" && /^1\d{9}$/.test(d)) d = WA_CC + d;
  if (d.length < 10 || d.length > 15) return null;
  if (d.startsWith("880") && d.length !== 13) return null;
  return d;
}
const waLinkOk = (u) => /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,}/.test(String(u || "").trim());
const waFirst = (n) => String(n || "").trim().split(/\s+/)[0] || "";

// Chat ID for a student: phone@c.us
const waChatId = (s) => { const n = waNum(s.phone); return n ? n + "@c.us" : null; };

function waFill(t, s) {
  const b = batchOf(s);
  const m = { name: s.name, first: waFirst(s.name), guardian: s.guardian || "Guardian", class: clsLabel(stuClass(s)), batch: b ? bLabel(b) : "", sid: s.sid, link: b && b.groupLink ? b.groupLink : "" };
  return String(t).replace(/\{(name|first|guardian|class|batch|sid|link)\}/gi, (_, k) => m[k.toLowerCase()] ?? "");
}

/* ---------- recipients (for broadcast mode + group creation) ---------- */
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

/* ---------- UI helpers (same look as before) ---------- */
const WA_ICO = {
  send: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.5L15 12 3.39 13.9z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
  tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 13l4 4 9-10M11 15l2 2 9-10"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
};
const waHue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const waAv = (seed, html) => `<span class="wa-av" style="background:hsl(${waHue(seed)} 52% 46%)">${html}</span>`;
const waPicked = () => (WA.mode === "student" ? !!WA.student : WA.mode === "all" || !!WA.scope);
const waBatch = () => (WA.scope.startsWith("b:") ? DB.Batches.find((x) => x.id === WA.scope.slice(2)) : null);
const waGrow = (el) => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; };

// What's the chatId of the currently selected conversation? null if not a single chat (e.g. broadcast).
function waCurrentChatId() {
  if (WA.mode === "student") {
    const s = DB.Students.find((x) => x.id === WA.student);
    return s ? waChatId(s) : null;
  }
  if (WA.scope && WA.scope.startsWith("b:")) {
    const b = waBatch();
    return b && b.groupJid ? b.groupJid : null;
  }
  return null;
}

// Is the current chat a real WhatsApp group?
function waIsGroupChat() {
  if (WA.scope && WA.scope.startsWith("b:")) {
    const b = waBatch();
    return !!(b && b.groupJid);
  }
  return false;
}

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
function waOne(id) { WA.mode = "student"; WA.student = id; WA.done = new Set(); WA.q = ""; WA.pane = "chat"; WA.inbox = []; WA.lastTs = ""; go("wa"); }
function waSetMode(m) {
  stopPolling();
  WA.mode = m; WA.done = new Set(); WA.q = "";
  if (m === "group" && !WA.scope.startsWith("b:")) WA.scope = "";
  WA.pane = m === "all" ? "chat" : "list";
  WA.inbox = []; WA.lastTs = "";
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
      <button type="button" class="wa-send" id="wa_send" onclick="waSend()" title="Send">${WA_ICO.send}</button>
     </div>
     <div class="wa-hint" id="wa_hint"></div>
     ${m === "student" || (m === "batch" && waBatch()) ? "" : `<div class="wa-hint"><button type="button" class="btn" onclick="waSendAll()">Send to everyone via WAHA</button> &nbsp; <span class="mut">broadcasts individually with a 1.5s delay</span></div>`}
    </footer>
   </section>
  </div>`;
  const ta = $("#wa_text");
  ta.oninput = (e) => { WA.txt[m] = e.target.value; waGrow(ta); waSync(); };
  ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(hover: hover)").matches) { e.preventDefault(); waSend(); } };
  if ($("#wa_find")) $("#wa_find").oninput = (e) => { WA.q = e.target.value; waList(); };
  if ($("#wa_inact")) $("#wa_inact").onchange = (e) => { WA.inactive = e.target.checked; WA.done = new Set(); waList(); waSync(); };
  waList(); waQ(); waGrow(ta);
}
function waIns(t) {
  const el = $("#wa_text"); if (!el) return;
  const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  el.value = el.value.slice(0, a) + t + el.value.slice(b); WA.txt[WA.mode] = el.value;
  el.focus(); el.selectionStart = el.selectionEnd = a + t.length; waGrow(el); waSync();
}

/* ---------- left pane: conversation list ---------- */
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
    if (bl.length) h += `<div class="wa-grp">Batches</div>` + bl.map((b) => row("b:" + b.id, WA.scope === "b:" + b.id, waAv(b.class, esc(clsCode(b.class))), bLabel(b),
      b.groupJid ? "WhatsApp group · " + nIn((s) => s.batchId === b.id) + " students" : nIn((s) => s.batchId === b.id) + " students",
      m === "group" ? (waLinkOk(b.groupLink) ? `<i class="wa-tag ok">Link saved</i>` : `<i class="wa-tag">No link</i>`) : (b.groupJid ? `<i class="wa-tag ok">Group ready</i>` : `<i class="wa-tag">No group</i>`))).join("");
    if (!h) h = `<div class="wa-empty">${DB.Batches.length ? "Nothing matches." : "No batches yet."}</div>`;
  }
  el.innerHTML = h;
}
function waPick(k) {
  if (k.startsWith("s:")) WA.student = k.slice(2); else if (k !== "all") WA.scope = k;
  WA.done = new Set(); WA.pane = "chat";
  WA.inbox = []; WA.lastTs = "";
  const w = $("#wa"); if (w) w.classList.add("show-chat");
  waList(); waQ();
  // If this is a real chat (student or batch group), fetch its history once
  if (waCurrentChatId()) waLoadHistory();
}
function waBack() { stopPolling(); WA.pane = "list"; const w = $("#wa"); if (w) w.classList.remove("show-chat"); }

/* ---------- right pane: header, thread, composer ---------- */
function waHead() {
  const el = $("#wa_head"); if (!el) return;
  const back = `<button type="button" class="wa-back" onclick="waBack()" title="Back to chats">${WA_ICO.back}</button>`;
  const i = waInfo();
  if (!i) { el.innerHTML = `${back}<div class="wa-ht"><b>WhatsApp</b><small>Choose a chat to start</small></div>`; return; }
  const cid = waCurrentChatId();
  const sub = cid ? (esc(cid.length > 22 ? "Group" : cid)) : "Broadcast mode";
  el.innerHTML = `${back}${i.av}<div class="wa-ht"><b>${esc(i.t)}</b><small>${sub}</small></div>`;
}

// Render the conversation thread. For a real chat (student or batch group), show the message bubbles.
// For broadcast mode (Everyone, batch without group), show the recipient list (old behavior).
function waQ() {
  const el = $("#wa_thread"); if (!el) return;
  const m = WA.mode;
  waHead();

  if (!waPicked()) {
    el.innerHTML = `<div class="wa-blank"><div class="wa-blank-i">${svg("wa")}</div><b>Message your students</b><span>Pick a ${m === "student" ? "student" : m === "group" ? "batch" : "class or batch"} on the left, write your message and press send.</span></div>`;
    waSync(); return;
  }

  const cid = waCurrentChatId();

  // Real 1-on-1 chat (student) or group chat (batch with groupJid)
  if (cid) {
    let h = `<div class="wa-sys">${waIsGroupChat() ? "Group chat via WAHA" : "1-on-1 chat via WAHA"}</div>`;
    if (WA.inbox.length === 0) {
      h += `<div class="wa-blank"><div class="wa-blank-i">${svg("wa")}</div><b>No messages yet</b><span>Send the first message below.</span></div>`;
    } else {
      h += WA.inbox.map(waBubble).join("");
    }
    el.innerHTML = h;
    el.scrollTop = el.scrollHeight;
    startPolling();
    waSync();
    return;
  }

  // Batch with no group yet — show Create Group button + broadcast recipients
  const b = waBatch();
  if (b && !b.groupJid) {
    const { ok, skipped } = waTargets();
    let h = `<div class="wa-sys">No WhatsApp group yet for this batch.</div>`;
    h += `<div class="wa-msg in"><div class="wa-bub">
      <small>Create a WhatsApp group</small>
      Creates a real WhatsApp group with all <b>${ok.length}</b> active students of this batch as members. The group JID is saved on the batch so future messages go to the group.
      ${skipped.length ? `<br><span class="mut">${skipped.length} student(s) skipped (no phone).</span>` : ""}
      <div class="wa-acts">
        <button type="button" class="btn p" onclick="waCreateGroup('${esc(b.id)}')">Create WhatsApp group</button>
        <button type="button" class="btn" onclick="editBatch('${esc(b.id)}')">Edit batch</button>
      </div>
    </div></div>`;
    h += `<div class="wa-sys">Or broadcast individually</div>`;
    h += broadcastListHtml(ok, skipped);
    el.innerHTML = h;
    waSync();
    return;
  }

  // Group invite mode (old behavior — show invite link)
  if (WA.mode === "group" && b) {
    let h = `<div class="wa-sys">Send the saved group invite link to each student individually.</div>`;
    if (waLinkOk(b.groupLink)) {
      h += `<div class="wa-msg in"><div class="wa-bub"><small>Group invite link</small><a href="${esc(b.groupLink)}" target="_blank" rel="noopener">${esc(b.groupLink)}</a><div class="wa-acts"><button type="button" class="btn" onclick="waCopy('${esc(b.groupLink)}')">Copy</button><button type="button" class="btn" onclick="editBatch('${esc(b.id)}')">Change</button></div></div></div>`;
    } else {
      h += `<div class="wa-msg in"><div class="wa-bub">This batch has no WhatsApp group link yet. Create the group in WhatsApp, copy its invite link, then save it on the batch.<div class="wa-acts"><button type="button" class="btn p" onclick="editBatch('${esc(b.id)}')">Add link</button></div></div></div>`;
    }
    const { ok, skipped } = waTargets();
    h += broadcastListHtml(ok, skipped);
    el.innerHTML = h;
    waSync();
    return;
  }

  // Everyone / class broadcast
  const { ok, skipped } = waTargets();
  let h = `<div class="wa-sys">Broadcast mode — sends individually to ${ok.length} recipient(s).</div>`;
  h += broadcastListHtml(ok, skipped);
  el.innerHTML = h;
  waSync();
}

function broadcastListHtml(ok, skipped) {
  const next = ok.find((x) => !WA.done.has(x.s.id));
  let h = "";
  if (ok.length) {
    h += `<div class="wa-sys">Recipients</div><div class="wa-rcp">${ok.map((x) => `<div class="wa-rr ${next && next.s.id === x.s.id ? "nx" : ""}">${waAv(x.s.name, init(x.s.name))}<span class="wa-rt"><b>${esc(x.s.name)}</b><small>${esc(x.s.sid)} · ${esc(x.num)}</small></span>${WA.done.has(x.s.id) ? `<span class="wa-tick" title="Sent">${WA_ICO.tick}</span>` : ""}<button type="button" class="btn" onclick="waOpenOne('${esc(x.s.id)}')">${WA.done.has(x.s.id) ? "Send again" : "Send"}</button></div>`).join("")}</div>`;
  } else {
    h += `<div class="wa-sys">No one here has a usable phone number.</div>`;
  }
  if (skipped.length) h += `<details class="wa-skip"><summary>Skipped (${skipped.length})</summary>${skipped.map((x) => `<div>${esc(x.s.name)} · ${esc(x.why)}${x.s.phone ? " (" + esc(x.s.phone) + ")" : ""}</div>`).join("")}</details>`;
  return h;
}

// Render a single message bubble (incoming or outgoing)
function waBubble(msg) {
  const t = new Date(msg.ts);
  const time = isNaN(t) ? "" : t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (msg.dir === "out") {
    return `<div class="wa-msg out"><div class="wa-bub"><div class="wa-tx">${esc(msg.text)}</div><div class="wa-meta">${WA_ICO.tick} ${time}</div></div></div>`;
  }
  const sender = msg.name ? `<small>${esc(msg.name)}</small>` : "";
  return `<div class="wa-msg in"><div class="wa-bub">${sender}<div class="wa-tx">${esc(msg.text)}</div><div class="wa-meta">${time}</div></div></div>`;
}

function waSync() {
  const btn = $("#wa_send"), hint = $("#wa_hint"); if (!btn) return;
  const txt = (WA.txt[WA.mode] || "").trim();
  const picked = waPicked();
  const cid = waCurrentChatId();
  let ready = picked && !!txt;
  // For broadcast mode, also need recipients
  if (ready && !cid && WA.mode !== "student") {
    const { ok } = waTargets();
    ready = ok.length > 0;
  }
  btn.disabled = !ready;
  if (!picked) hint.textContent = "Choose a chat first.";
  else if (!txt) hint.textContent = "Write a message.";
  else if (!cid && WA.mode !== "student") hint.textContent = "Broadcasts to each recipient individually.";
  else hint.textContent = "Enter sends · Shift+Enter for a new line.";
}

/* ---------- polling for incoming messages ---------- */
function startPolling() {
  stopPolling();
  if (!API_URL) return;
  WA.poll = setInterval(async () => {
    if (WA.busy) return;
    const cid = waCurrentChatId();
    if (!cid) return;
    WA.busy = true;
    try {
      const j = await api("waInbox", { chatId: cid, since: WA.lastTs });
      if (j.ok && j.messages && j.messages.length) {
        WA.inbox.push(...j.messages);
        WA.lastTs = WA.inbox[WA.inbox.length - 1].ts;
        // re-render just the thread (preserve scroll position near bottom)
        const el = $("#wa_thread"); if (el) {
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          waQ();
          if (nearBottom) el.scrollTop = el.scrollHeight;
        }
      }
    } catch (e) { /* silent fail; next poll will retry */ }
    WA.busy = false;
  }, 3000);
}
function stopPolling() { if (WA.poll) { clearInterval(WA.poll); WA.poll = null; } }

// Manually fetch the full conversation (called when a chat is first opened)
async function waLoadHistory() {
  const cid = waCurrentChatId();
  if (!cid || !API_URL) return;
  try {
    const j = await api("waInbox", { chatId: cid });
    if (j.ok) {
      WA.inbox = j.messages || [];
      WA.lastTs = WA.inbox.length ? WA.inbox[WA.inbox.length - 1].ts : "";
      waQ();
    }
  } catch (e) { /* ignore — chat will start empty */ }
}

/* ---------- actions ---------- */

// Send the current message. Behavior depends on mode:
//   student 1-on-1 → waSend to student's chatId, clear input, reload history
//   batch with groupJid → waSend to the group chatId, clear input, reload history
//   broadcast (everyone, class, batch without group) → send to the next unsent recipient
async function waSend() {
  const text = (WA.txt[WA.mode] || "").trim();
  if (!text) return;

  // Real chat (1-on-1 or group)
  const cid = waCurrentChatId();
  if (cid && (WA.mode === "student" || waIsGroupChat())) {
    if (!API_URL) { toast("Backend required for WAHA sending."); return; }
    try {
      const j = await api("waSend", { chat: cid, text, isGroup: waIsGroupChat() });
      if (j.ok) {
        // optimistically add the outgoing message to the thread
        WA.inbox.push({ ts: new Date().toISOString(), dir: "out", name: "", text });
        WA.lastTs = WA.inbox[WA.inbox.length - 1].ts;
        WA.txt[WA.mode] = "";
        const ta = $("#wa_text"); if (ta) { ta.value = ""; waGrow(ta); }
        waQ();
        toast("Sent");
      } else toast(j.error || "Send failed");
    } catch (e) { toast(e.message); }
    return;
  }

  // Broadcast: send to next unsent recipient
  const { ok } = waTargets();
  const next = ok.find((x) => !WA.done.has(x.s.id));
  if (!next) { toast("All recipients done"); return; }
  await waOpenOne(next.s.id);
}

// Broadcast to a single recipient (used in broadcast lists)
async function waOpenOne(id) {
  const x = waTargets().ok.find((r) => r.s.id === id);
  if (!x) return;
  const text = waFill(WA.txt[WA.mode].trim(), x.s);
  if (!text) { toast("Write a message first"); return; }
  if (!API_URL) { toast("Backend required for WAHA sending."); return; }
  try {
    const j = await api("waSend", { chat: x.num, text });
    if (j.ok) { WA.done.add(id); toast("Sent to " + x.s.name); waQ(true); }
    else toast(j.error || "Send failed");
  } catch (e) { toast(e.message); }
}

// Bulk send to everyone in the current scope (broadcast mode)
async function waSendAll() {
  const { ok } = waTargets();
  if (!ok.length) { toast("No recipients"); return; }
  if (!API_URL) { toast("Connect to the Apps Script backend to send all via WAHA."); return; }
  if (!confirm("Send the same message to " + ok.length + " recipients via WAHA?\n\nEach message is sent with a 1.5-second delay to avoid WhatsApp bans.")) return;

  const items = ok.map((x) => ({ chat: x.num, text: waFill(WA.txt[WA.mode].trim(), x.s) }));
  toast("Sending " + items.length + " messages via WAHA…");
  try {
    const j = await api("waSendMany", { items, delayMs: 1500 });
    const sent = j.sent || 0, failed = j.failed || 0;
    (j.results || []).forEach((r, i) => { if (r.ok && ok[i]) WA.done.add(ok[i].s.id); });
    toast("Sent " + sent + (failed ? ", " + failed + " failed" : "") + (sent ? " - done" : ""));
    waQ(true);
  } catch (e) { toast(e.message); }
}

// Create a WhatsApp group for a batch and save the JID
async function waCreateGroup(batchId) {
  if (!API_URL) { toast("Backend required."); return; }
  const b = DB.Batches.find((x) => x.id === batchId);
  if (!b) return;
  if (b.groupJid) { toast("This batch already has a group."); return; }
  const { ok } = waTargets();
  if (!ok.length) { toast("No students with valid phone numbers in this batch."); return; }
  if (!confirm("Create a WhatsApp group named '" + bLabel(b) + "' with " + ok.length + " students?")) return;
  toast("Creating group…");
  try {
    const j = await api("waCreateGroup", { batchId, participants: ok.map((x) => x.num) });
    if (j.ok) {
      toast("Group created!");
      // refresh data so the batch shows the new groupJid
      await load(false);
      waQ();
    } else toast(j.error || "Group creation failed");
  } catch (e) { toast(e.message); }
}

async function waCopy(t) { try { await navigator.clipboard.writeText(t); toast("Copied"); } catch (e) { toast("Could not copy. Select and copy it manually."); } }
