/* ============ WHATSAPP (OpenWA) ============
   Sends text + attachments to one student, a class / batch, or everyone.
   Talks straight from the browser to your own OpenWA server:
     POST {url}/api/sessions/{session}/messages/send-text | send-image | send-video | send-audio | send-document
   Header X-API-Key. Media goes as { base64, mimetype, filename }.
   Settings (URL, key, session) live only in this browser's localStorage. */

const WA_KEY = "tp_wa";
const WA = { mode: "batch", student: "", scope: "", inactive: false, text: "", files: [], run: null, sessions: [] };
const WA_MAX_FILE = 16 * 1024 * 1024; // WhatsApp's media limit
const WA_MIME = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", txt: "text/plain", csv: "text/csv", zip: "application/zip", mp3: "audio/mpeg", ogg: "audio/ogg", m4a: "audio/mp4", mp4: "video/mp4", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

function waCfg() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem(WA_KEY) || "{}") || {}; } catch (e) {}
  return { url: c.url || "", key: c.key || "", session: c.session || "", cc: c.cc || "880", min: +c.min || 6, max: +c.max || 12 };
}
const waReady = () => { const c = waCfg(); return !!(c.url && c.key && c.session); };
const waCleanUrl = (u) => String(u || "").trim().replace(/\/+$/, "").replace(/\/api$/i, "");

/* ---------- phone numbers -> WhatsApp ids ---------- */
function waId(p, cc) {
  let d = String(p ?? "").split(/[,;/\n]|\sor\s/i)[0].replace(/\D/g, ""); // first number only
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = cc + d.slice(1);
  else if (cc === "880" && /^1\d{9}$/.test(d)) d = cc + d; // Excel dropped the leading 0
  if (d.length < 10 || d.length > 15) return null;
  if (d.startsWith("880") && d.length !== 13) return null;
  return d + "@c.us";
}

/* ---------- recipients ---------- */
function waTargets() {
  const c = waCfg(), all = DB.Students;
  let list = [];
  if (WA.mode === "student") list = all.filter((s) => s.id === WA.student);
  else {
    if (WA.mode === "batch" && WA.scope.startsWith("c:")) list = all.filter((s) => stuClass(s) === WA.scope.slice(2));
    else if (WA.mode === "batch" && WA.scope.startsWith("b:")) list = all.filter((s) => s.batchId === WA.scope.slice(2));
    else if (WA.mode === "all") list = all.slice();
    if (!WA.inactive) list = list.filter((s) => (s.status || "Active") === "Active");
  }
  const ok = [], skipped = [], seen = new Set();
  list.forEach((s) => {
    const wid = waId(s.phone, c.cc);
    if (!wid) skipped.push({ s, why: s.phone ? "Invalid number" : "No phone" });
    else if (seen.has(wid)) skipped.push({ s, why: "Same number as another student" });
    else { seen.add(wid); ok.push({ s, wid }); }
  });
  return { ok, skipped };
}
const waFirst = (n) => String(n || "").trim().split(/\s+/)[0] || "";
function waFill(t, s) {
  const b = batchOf(s);
  const m = { name: s.name, first: waFirst(s.name), guardian: s.guardian || "Guardian", class: clsLabel(stuClass(s)), batch: b ? bLabel(b) : "", sid: s.sid };
  return String(t).replace(/\{(name|first|guardian|class|batch|sid)\}/gi, (_, k) => m[k.toLowerCase()] ?? "");
}

/* ---------- OpenWA calls ---------- */
async function waFetch(path, opt = {}, ms = 120000) {
  const c = waCfg(), ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(c.url + path, { ...opt, headers: { "X-API-Key": c.key, ...(opt.body ? { "Content-Type": "application/json" } : {}) }, signal: ctl.signal });
    if (!r.ok) {
      let m = "";
      try { const j = await r.json(); m = j.message || j.error || JSON.stringify(j); if (Array.isArray(m)) m = m.join(", "); } catch (e) {}
      throw new Error(`${r.status} ${m}`.trim());
    }
    return await r.json().catch(() => ({}));
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Timed out waiting for OpenWA");
    if (e instanceof TypeError) throw new Error("Can't reach OpenWA. Check the server URL, that it is running, HTTPS (an https site can't call plain http) and CORS.");
    throw e;
  } finally { clearTimeout(t); }
}
const waPost = (kind, body) => waFetch(`/api/sessions/${encodeURIComponent(waCfg().session)}/messages/${kind}`, { method: "POST", body: JSON.stringify(body) });

/* ---------- settings ---------- */
function waSettings() {
  const c = waCfg();
  $("#modal").innerHTML = `<h2>WhatsApp settings</h2>
  <p class="mut" style="font-size:12px;margin:-6px 0 12px">Connects to your own <b>OpenWA</b> server. These details are stored only in this browser.</p>
  <div class="f">
   <label class="full">OpenWA server URL<input class="in" id="w_url" placeholder="https://wa.example.com or http://localhost:2785" value="${esc(c.url)}"></label>
   <label class="full">API key<input class="in" id="w_key" type="password" autocomplete="off" value="${esc(c.key)}"></label>
   <label class="full">Session<input class="in" id="w_ses" list="w_sl" placeholder="Session ID" value="${esc(c.session)}"><datalist id="w_sl">${WA.sessions.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.status)})</option>`).join("")}</datalist></label>
   <label>Default country code<input class="in" id="w_cc" value="${esc(c.cc)}"></label>
   <label>Gap between students (seconds)<span style="display:flex;gap:6px"><input class="in" id="w_min" type="number" min="2" value="${c.min}"><input class="in" id="w_max" type="number" min="2" value="${c.max}"></span></label>
   <div class="full mut" id="w_msg" style="font-size:12px;min-height:16px"></div>
  </div>
  <div class="acts"><button class="btn" onclick="waTest()">Test connection</button><span style="flex:1"></span><button class="btn" onclick="closeM()">Cancel</button><button class="btn p" onclick="waSaveSettings()">Save</button></div>`;
  $("#ov").classList.add("on");
}
async function waTest() {
  const keep = JSON.parse(localStorage.getItem(WA_KEY) || "{}");
  localStorage.setItem(WA_KEY, JSON.stringify({ ...keep, url: waCleanUrl($("#w_url").value), key: $("#w_key").value.trim() }));
  $("#w_msg").textContent = "Testing…";
  try {
    const j = await waFetch("/api/sessions", {}, 15000);
    const arr = Array.isArray(j) ? j : j.data || j.sessions || j.items || [];
    WA.sessions = arr.map((s) => ({ id: s.id || s.sessionId || s.name, name: s.name || s.id, status: s.status || s.state || "?" })).filter((s) => s.id);
    $("#w_sl").innerHTML = WA.sessions.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} (${esc(s.status)})</option>`).join("");
    if (!$("#w_ses").value && WA.sessions.length === 1) $("#w_ses").value = WA.sessions[0].id;
    $("#w_msg").textContent = "Connected. " + (WA.sessions.length ? WA.sessions.map((s) => `${s.name}: ${s.status}`).join(" · ") : "No sessions found. Create and scan one in the OpenWA dashboard.");
  } catch (e) { $("#w_msg").textContent = "Failed: " + e.message; }
}
function waSaveSettings() {
  const url = waCleanUrl($("#w_url").value), min = Math.max(2, +$("#w_min").value || 6), max = Math.max(min, +$("#w_max").value || 12);
  if (!/^https?:\/\//i.test(url)) { toast("Enter the full server URL, starting with http:// or https://"); return; }
  if (location.protocol === "https:" && /^http:\/\//i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(url)) { toast("This site is on https, so the OpenWA URL must be https too"); return; }
  const cc = ($("#w_cc").value.replace(/\D/g, "") || "880");
  localStorage.setItem(WA_KEY, JSON.stringify({ url, key: $("#w_key").value.trim(), session: $("#w_ses").value.trim(), cc, min, max }));
  closeM(); toast("WhatsApp settings saved");
  if (route === "wa") vWA();
}

/* ---------- attachments ---------- */
const waKind = (t) => (/^image\//.test(t) ? "image" : /^video\//.test(t) ? "video" : /^audio\//.test(t) ? "audio" : "document");
const waSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
function waRead(f) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = () => rej(new Error("Could not read " + f.name));
    r.readAsDataURL(f);
  });
}
async function waAddFiles(list) {
  for (const f of list) {
    if (f.size > WA_MAX_FILE) { toast(`${f.name} is over 16 MB`); continue; }
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const type = f.type || WA_MIME[ext] || "application/octet-stream";
    try { WA.files.push({ name: f.name, type, size: f.size, kind: waKind(type), b64: await waRead(f) }); } catch (e) { toast(e.message); }
  }
  waFilesDraw();
}
function waFilesDraw() {
  const el = $("#wa_files"); if (!el) return;
  el.innerHTML = WA.files.map((f, i) => `<span class="chip wa-file">${esc(f.name)} <small>${waSize(f.size)}</small><button type="button" title="Remove" onclick="WA.files.splice(${i},1);waFilesDraw()">×</button></span>`).join("");
}

/* ---------- page ---------- */
function waOne(id) { WA.mode = "student"; WA.student = id; go("wa"); }
function vWA() {
  const c = waCfg(), ok = waReady(), B = sortBatches(DB.Batches);
  const used = CLASSES.filter((x) => B.some((b) => b.class === x));
  const nIn = (f) => DB.Students.filter((s) => (WA.inactive || (s.status || "Active") === "Active") && f(s)).length;
  const stu = DB.Students.find((s) => s.id === WA.student);
  const modeTabs = [["student", "One student"], ["batch", "Class / batch"], ["all", "Everyone"]]
    .map(([k, l]) => `<button type="button" class="${WA.mode === k ? "on" : ""}" onclick="WA.mode='${k}';vWA()">${l}</button>`).join("");
  const picker = WA.mode === "student"
    ? `<label class="full">Student<input class="in" id="wa_stu" list="wa_stul" autocomplete="off" placeholder="Type a name or student ID" value="${esc(stu ? stu.name + " · " + stu.sid : "")}"><datalist id="wa_stul">${DB.Students.map((s) => `<option value="${esc(s.name + " · " + s.sid)}">`).join("")}</datalist></label>`
    : WA.mode === "batch"
      ? `<label class="full">Class or batch<select class="in" id="wa_scope"><option value="">Choose…</option>
          <optgroup label="Whole class (all its batches)">${used.map((x) => `<option value="c:${esc(x)}" ${WA.scope === "c:" + x ? "selected" : ""}>${esc(clsLabel(x))} (${nIn((s) => stuClass(s) === x)})</option>`).join("")}</optgroup>
          <optgroup label="Single batch">${B.map((b) => `<option value="b:${esc(b.id)}" ${WA.scope === "b:" + b.id ? "selected" : ""}>${esc(bLabel(b))} (${nIn((s) => s.batchId === b.id)})</option>`).join("")}</optgroup></select></label>`
      : "";
  $("#view").innerHTML = `
  <div class="glass wa-conn ${ok ? "ok" : ""}">
   <i class="dot"></i><span>${ok ? `Connected to OpenWA · session <b>${esc(c.session)}</b>` : "WhatsApp is not set up yet. Add your OpenWA server details to start."}</span>
   <span style="flex:1"></span><button class="btn" onclick="waSettings()">${ok ? "Settings" : "Set up"}</button>
  </div>
  <div class="glass wa-card">
   <div class="sec" style="margin-top:0">1 · Send to</div>
   <div class="tabs" style="width:max-content;max-width:100%">${modeTabs}</div>
   <div class="f" style="margin-top:10px">${picker}
    ${WA.mode !== "student" ? `<label class="full chk"><input type="checkbox" id="wa_inact" ${WA.inactive ? "checked" : ""}> Include Inactive, Suspended and Left students</label>` : ""}</div>
   <div id="wa_sum" class="wa-sum"></div>
  </div>
  <div class="glass wa-card">
   <div class="sec" style="margin-top:0">2 · Message</div>
   <textarea class="in ta" id="wa_text" rows="6" placeholder="Write your message…">${esc(WA.text)}</textarea>
   <div class="wa-chips"><small class="mut">Insert:</small>${["name", "first", "guardian", "class", "batch", "sid"].map((k) => `<button type="button" class="chip" onclick="waIns('{${k}}')">{${k}}</button>`).join("")}</div>
   <div class="wa-attach"><label class="btn">Attach files<input type="file" id="wa_file" multiple hidden></label><span class="mut" style="font-size:12px">Images, videos, audio, PDF or any document · up to 16 MB each</span></div>
   <div id="wa_files" class="wa-files"></div>
   <div class="acts" style="margin-top:10px"><span class="mut" style="font-size:12px;flex:1">With an image or video first, your text is sent as its caption.</span><button class="btn p" id="wa_send" onclick="waSend()">Send</button></div>
  </div>
  <div id="wa_prog"></div>
  <p class="mut wa-note">WhatsApp can restrict numbers that send many messages quickly or to people who don't expect them. Use a dedicated number, message only students and guardians, and keep the gap between students at 6 seconds or more.</p>`;
  $("#wa_text").oninput = (e) => (WA.text = e.target.value);
  $("#wa_file").onchange = (e) => { waAddFiles([...e.target.files]); e.target.value = ""; };
  if ($("#wa_scope")) $("#wa_scope").onchange = (e) => { WA.scope = e.target.value; waSum(); };
  if ($("#wa_inact")) $("#wa_inact").onchange = (e) => { WA.inactive = e.target.checked; vWA(); };
  if ($("#wa_stu")) $("#wa_stu").oninput = (e) => { const s = DB.Students.find((x) => x.name + " · " + x.sid === e.target.value); WA.student = s ? s.id : ""; waSum(); };
  waSum(); waFilesDraw(); waDraw();
}
function waIns(t) {
  const el = $("#wa_text"); if (!el) return;
  const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  el.value = el.value.slice(0, a) + t + el.value.slice(b); WA.text = el.value;
  el.focus(); el.selectionStart = el.selectionEnd = a + t.length;
}
function waSum() {
  const el = $("#wa_sum"); if (!el) return;
  const { ok, skipped } = waTargets(), pick = WA.mode === "student" ? !!WA.student : WA.mode === "all" || !!WA.scope;
  if (!pick) { el.innerHTML = `<span class="mut">${WA.mode === "student" ? "Choose a student." : "Choose a class or batch."}</span>`; return; }
  el.innerHTML = `<b>${ok.length}</b> ${ok.length === 1 ? "person" : "people"} will receive this${skipped.length ? ` · <span style="color:var(--warn)">${skipped.length} skipped</span>` : ""}
   ${skipped.length ? `<details><summary class="mut">Who is skipped?</summary>${skipped.map((x) => `<div class="mut" style="font-size:12px">${esc(x.s.name)} · ${esc(x.why)}${x.s.phone ? " (" + esc(x.s.phone) + ")" : ""}</div>`).join("")}</details>` : ""}`;
}

/* ---------- sending ---------- */
const waSleep = async (ms, R) => { for (let t = 0; t < ms && !R.stop; t += 250) await new Promise((r) => setTimeout(r, 250)); };
function waSteps(s) {
  const text = waFill(WA.text.trim(), s), steps = [], f0 = WA.files[0];
  const cap = !!(text && f0 && (f0.kind === "image" || f0.kind === "video") && text.length <= 1024);
  if (text && !cap) steps.push({ k: "send-text", b: { text } });
  WA.files.forEach((f, i) => {
    const b = { base64: f.b64, mimetype: f.type };
    if (f.kind !== "audio") b.filename = f.name;
    if (i === 0 && cap) b.caption = text;
    steps.push({ k: "send-" + f.kind, b });
  });
  return steps;
}
function waSend() {
  if (WA.run && WA.run.active) { toast("A send is already running"); return; }
  if (!waReady()) { toast("Set up WhatsApp first"); waSettings(); return; }
  if (!WA.text.trim() && !WA.files.length) { toast("Write a message or attach a file"); return; }
  const { ok, skipped } = waTargets();
  if (!ok.length) { toast(skipped.length ? "No one has a valid phone number" : "Choose who to send to"); return; }
  const c = waCfg(), many = ok.length > 30;
  const msg = `Send to ${ok.length} ${ok.length === 1 ? "person" : "people"}${skipped.length ? ` (${skipped.length} skipped)` : ""}?\n\n` +
    `About ${Math.max(1, Math.round((ok.length * (c.min + c.max)) / 2 / 60))} min to finish. Keep this tab open while it runs.` +
    (many ? "\n\nThat is a large batch. WhatsApp may restrict numbers that send a lot at once, so consider splitting it across the day." : "");
  if (!confirm(msg)) return;
  WA.run = { items: ok.map(({ s, wid }) => ({ s, wid, st: "wait", err: "", done: 0 })), active: false, stop: false, note: "" };
  waRun();
}
async function waRun() {
  const R = WA.run, c = waCfg(); let fails = 0;
  R.active = true; R.stop = false; R.note = ""; waDraw();
  for (let i = 0; i < R.items.length && !R.stop; i++) {
    const it = R.items[i];
    if (it.st === "ok") continue;
    it.st = "send"; it.err = ""; waDraw();
    try {
      const steps = waSteps(it.s);
      for (; it.done < steps.length; it.done++) {
        if (it.done > 0) await waSleep(1500 + Math.random() * 1500, R);
        await waPost(steps[it.done].k, { chatId: it.wid, ...steps[it.done].b });
      }
      it.st = "ok"; fails = 0;
    } catch (e) {
      it.st = "fail"; it.err = e.message; fails++;
      if (fails >= 3) { R.stop = true; R.note = "Stopped after 3 failures in a row: " + e.message; }
    }
    waDraw();
    if (!R.stop && R.items.slice(i + 1).some((x) => x.st !== "ok")) await waSleep((c.min + Math.random() * (c.max - c.min)) * 1000, R);
  }
  R.active = false; waDraw();
}
function waRetry() { const R = WA.run; if (!R || R.active) return; R.items.forEach((x) => x.st === "fail" && (x.st = "wait")); waRun(); }
function waResume() { const R = WA.run; if (!R || R.active) return; waRun(); }
function waDraw() {
  const el = $("#wa_prog"), R = WA.run; if (!el) return;
  const btn = $("#wa_send"); if (btn) btn.disabled = !!(R && R.active);
  if (!R) { el.innerHTML = ""; return; }
  const n = R.items.length, ok = R.items.filter((x) => x.st === "ok").length, bad = R.items.filter((x) => x.st === "fail").length;
  const left = R.items.filter((x) => x.st === "wait" || x.st === "send").length;
  const lbl = { wait: "Waiting", send: "Sending…", ok: "Sent", fail: "Failed" };
  el.innerHTML = `<div class="glass wa-card"><div class="sec" style="margin-top:0">3 · Progress</div>
   <div class="wa-bar"><i style="width:${Math.round(((ok + bad) / n) * 100)}%"></i></div>
   <div class="wa-cnt"><span><b>${ok}</b> sent</span><span style="color:var(--bad)"><b>${bad}</b> failed</span><span class="mut"><b>${left}</b> left</span>
    <span style="flex:1"></span>
    ${R.active ? `<button class="btn d" onclick="WA.run.stop=true">Stop</button>` : `${bad ? `<button class="btn p" onclick="waRetry()">Retry ${bad} failed</button>` : ""}${!bad && left ? `<button class="btn p" onclick="waResume()">Resume</button>` : ""}<button class="btn" onclick="WA.run=null;waDraw()">Clear</button>`}</div>
   ${R.note ? `<div class="wa-err">${esc(R.note)}</div>` : ""}
   <div class="tw" style="max-height:320px;overflow:auto;margin-top:8px"><table><thead><tr><th>Student</th><th>Number</th><th>Status</th></tr></thead><tbody>
   ${R.items.map((x) => `<tr><td>${esc(x.s.name)}<small class="mut" style="display:block">${esc(x.s.sid)}</small></td><td>${esc(x.wid.replace("@c.us", ""))}</td><td><span class="chip wa-${x.st}">${lbl[x.st]}</span>${x.err ? `<small class="mut" style="display:block">${esc(x.err)}</small>` : ""}</td></tr>`).join("")}</tbody></table></div></div>`;
}
window.addEventListener("beforeunload", (e) => { if (WA.run && WA.run.active) { e.preventDefault(); e.returnValue = ""; } });
