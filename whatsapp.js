/* ============ WHATSAPP CLICK-TO-CHAT ============
   No server and no API. For each student it opens  https://wa.me/<number>?text=<message>
   in WhatsApp Web / the phone app with the message already typed. You press Send there.
   Also sends each batch's saved group invite link to its students. */

const WA_CC = "880"; // default country code for numbers that start with 0
const WA_GROUP_TEXT = "Assalamu alaikum {guardian},\nPlease join the WhatsApp group of {batch} for {first} using this link:\n{link}";
const WA = { mode: "batch", student: "", scope: "", inactive: false, txt: { student: "", batch: "", all: "", group: WA_GROUP_TEXT }, done: new Set() };

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
  const all = DB.Students;
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

/* ---------- page ---------- */
function waOne(id) { WA.mode = "student"; WA.student = id; WA.done = new Set(); go("wa"); }
function waSetMode(m) { WA.mode = m; WA.done = new Set(); if (m === "group" && !WA.scope.startsWith("b:")) WA.scope = ""; vWA(); }
function vWA() {
  const B = sortBatches(DB.Batches), used = CLASSES.filter((x) => B.some((b) => b.class === x));
  const nIn = (f) => DB.Students.filter((s) => (WA.inactive || (s.status || "Active") === "Active") && f(s)).length;
  const stu = DB.Students.find((s) => s.id === WA.student), m = WA.mode;
  const tabs = [["student", "One student"], ["batch", "Class / batch"], ["all", "Everyone"], ["group", "Group invite"]]
    .map(([k, l]) => `<button type="button" class="${m === k ? "on" : ""}" onclick="waSetMode('${k}')">${l}</button>`).join("");
  const bOpt = (b) => `<option value="b:${esc(b.id)}" ${WA.scope === "b:" + b.id ? "selected" : ""}>${esc(bLabel(b))} (${nIn((s) => s.batchId === b.id)})${m === "group" ? (waLinkOk(b.groupLink) ? " · link saved" : " · no link") : ""}</option>`;
  const picker = m === "student"
    ? `<label class="full">Student<input class="in" id="wa_stu" list="wa_stul" autocomplete="off" placeholder="Type a name or student ID" value="${esc(stu ? stu.name + " · " + stu.sid : "")}"><datalist id="wa_stul">${DB.Students.map((s) => `<option value="${esc(s.name + " · " + s.sid)}">`).join("")}</datalist></label>`
    : m === "batch"
      ? `<label class="full">Class or batch<select class="in" id="wa_scope"><option value="">Choose…</option>
          <optgroup label="Whole class (all its batches)">${used.map((x) => `<option value="c:${esc(x)}" ${WA.scope === "c:" + x ? "selected" : ""}>${esc(clsLabel(x))} (${nIn((s) => stuClass(s) === x)})</option>`).join("")}</optgroup>
          <optgroup label="Single batch">${B.map(bOpt).join("")}</optgroup></select></label>`
      : m === "group"
        ? `<label class="full">Batch<select class="in" id="wa_scope"><option value="">Choose…</option>${B.map(bOpt).join("")}</select></label><div class="full" id="wa_glink"></div>`
        : "";
  const chips = ["name", "first", "guardian", "class", "batch", "sid", "link"];
  $("#view").innerHTML = `
  <div class="glass wa-card wa-how">
   <b>How it works:</b> TuitionPro opens WhatsApp with each student's message already typed. You press <b>Send</b> in WhatsApp, then come back for the next one. Nothing is sent automatically and no server is needed.
  </div>
  <div class="glass wa-card">
   <div class="sec" style="margin-top:0">1 · Send to</div>
   <div class="tabs" style="width:max-content;max-width:100%;flex-wrap:wrap">${tabs}</div>
   <div class="f" style="margin-top:10px">${picker}
    ${m === "batch" || m === "all" || m === "group" ? `<label class="full chk"><input type="checkbox" id="wa_inact" ${WA.inactive ? "checked" : ""}> Include Inactive, Suspended and Left students</label>` : ""}</div>
  </div>
  <div class="glass wa-card">
   <div class="sec" style="margin-top:0">2 · Message</div>
   <textarea class="in ta" id="wa_text" rows="6" placeholder="Write your message…">${esc(WA.txt[m])}</textarea>
   <div class="wa-chips"><small class="mut">Insert:</small>${chips.map((k) => `<button type="button" class="chip" onclick="waIns('{${k}}')">{${k}}</button>`).join("")}</div>
   <div class="mut" style="font-size:12px">Photos and files can't be attached by link. After a chat opens, add them with the paperclip in WhatsApp.</div>
  </div>
  <div id="wa_q"></div>`;
  $("#wa_text").oninput = (e) => { WA.txt[m] = e.target.value; };
  if ($("#wa_scope")) $("#wa_scope").onchange = (e) => { WA.scope = e.target.value; WA.done = new Set(); waQ(); };
  if ($("#wa_inact")) $("#wa_inact").onchange = (e) => { WA.inactive = e.target.checked; WA.done = new Set(); vWA(); };
  if ($("#wa_stu")) $("#wa_stu").oninput = (e) => { const s = DB.Students.find((x) => x.name + " · " + x.sid === e.target.value); WA.student = s ? s.id : ""; WA.done = new Set(); waQ(); };
  waQ();
}
function waIns(t) {
  const el = $("#wa_text"); if (!el) return;
  const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  el.value = el.value.slice(0, a) + t + el.value.slice(b); WA.txt[WA.mode] = el.value;
  el.focus(); el.selectionStart = el.selectionEnd = a + t.length;
}

/* ---------- queue ---------- */
function waQ(keepScroll) {
  const el = $("#wa_q"), m = WA.mode; if (!el) return;
  const picked = m === "student" ? !!WA.student : m === "all" || !!WA.scope;
  const b = m === "group" && WA.scope.startsWith("b:") ? DB.Batches.find((x) => x.id === WA.scope.slice(2)) : null;
  const gl = $("#wa_glink");
  if (gl) gl.innerHTML = b ? (waLinkOk(b.groupLink)
    ? `<div class="wa-gl ok"><span>Group link: <a href="${esc(b.groupLink)}" target="_blank" rel="noopener">${esc(b.groupLink)}</a></span><button type="button" class="btn" onclick="waCopy('${esc(b.groupLink)}')">Copy</button><button type="button" class="btn" onclick="editBatch('${esc(b.id)}')">Change</button></div>`
    : `<div class="wa-gl"><span>This batch has no WhatsApp group link yet. Create the group in WhatsApp, copy its invite link, then save it on the batch.</span><button type="button" class="btn p" onclick="editBatch('${esc(b.id)}')">Add link</button></div>`) : "";
  if (!picked) { el.innerHTML = `<div class="glass wa-card mut">${m === "student" ? "Choose a student above." : m === "group" ? "Choose a batch above." : "Choose a class or batch above."}</div>`; return; }
  if (m === "group" && b && !waLinkOk(b.groupLink)) { el.innerHTML = ""; return; }
  const { ok, skipped } = waTargets();
  const opened = ok.filter((x) => WA.done.has(x.s.id)).length, next = ok.find((x) => !WA.done.has(x.s.id));
  const keep = keepScroll && $("#wa_tw") ? $("#wa_tw").scrollTop : 0;
  el.innerHTML = `<div class="glass wa-card"><div class="sec" style="margin-top:0">3 · Open the chats</div>
   <div class="wa-cnt"><span><b>${opened}</b> of <b>${ok.length}</b> opened</span>${skipped.length ? `<span style="color:var(--warn)">${skipped.length} skipped</span>` : ""}<span style="flex:1"></span>
    ${opened ? `<button class="btn" onclick="WA.done=new Set();waQ()">Start over</button>` : ""}
    <button class="btn p" ${next ? "" : "disabled"} onclick="waNext()">${opened ? (next ? "Open next" : "All opened") : "Open first"}</button></div>
   <div class="wa-bar"><i style="width:${ok.length ? Math.round((opened / ok.length) * 100) : 0}%"></i></div>
   ${ok.length ? `<div class="tw" id="wa_tw" style="max-height:360px;overflow:auto;margin-top:8px"><table><thead><tr><th>Student</th><th>Number</th><th></th></tr></thead><tbody>
   ${ok.map((x) => `<tr class="${next && next.s.id === x.s.id ? "wa-nx" : ""}"><td>${esc(x.s.name)}<small class="mut" style="display:block">${esc(x.s.sid)}</small></td><td>${esc(x.num)}</td>
    <td style="text-align:right">${WA.done.has(x.s.id) ? `<span class="chip wa-ok">Opened</span> ` : ""}<button class="btn" onclick="waOpen('${esc(x.s.id)}')">${WA.done.has(x.s.id) ? "Open again" : "Open chat"}</button></td></tr>`).join("")}</tbody></table></div>` : `<div class="mut" style="margin-top:8px">No one here has a usable phone number.</div>`}
   ${skipped.length ? `<details style="margin-top:8px"><summary class="mut">Skipped (${skipped.length})</summary>${skipped.map((x) => `<div class="mut" style="font-size:12px">${esc(x.s.name)} · ${esc(x.why)}${x.s.phone ? " (" + esc(x.s.phone) + ")" : ""}</div>`).join("")}</details>` : ""}</div>`;
  if (keep && $("#wa_tw")) $("#wa_tw").scrollTop = keep;
  const nx = $(".wa-nx"); if (nx && !keepScroll) nx.scrollIntoView({ block: "nearest" });
}
function waOpen(id) {
  const x = waTargets().ok.find((r) => r.s.id === id); if (!x) return;
  const text = waFill(WA.txt[WA.mode].trim(), x.s);
  const w = window.open(waUrl(x.num, text), "tp_whatsapp"); // same tab every time
  if (!w) { toast("Your browser blocked the pop-up. Allow pop-ups for this site and try again."); return; }
  WA.done.add(id); waQ(true);
}
function waNext() { const n = waTargets().ok.find((r) => !WA.done.has(r.s.id)); if (n) waOpen(n.s.id); }
async function waCopy(t) { try { await navigator.clipboard.writeText(t); toast("Copied"); } catch (e) { toast("Could not copy. Select and copy it manually."); } }
