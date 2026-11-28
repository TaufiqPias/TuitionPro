/**
 * TuitionPro backend — Google Apps Script
 *
 * • Sign up / sign in handled here. New sign-ups wait for Master Admin approval.
 * • Master Admin approves/rejects/creates users. Each approved user gets their OWN
 *   Drive sub-folder + a fresh, clean data spreadsheet inside it.
 * • Emails (confirmation, rejection, new-request alert) are sent from the Master Admin's Google account.
 *
 * SETUP
 *  1. Paste this file into script.google.com (New project) — keep this project PRIVATE.
 *  2. Optional: put your GitHub Pages address in APP_URL (used as a link in emails).
 *  3. Run the function `authorize` once (Run button) and accept the permissions.
 *  4. Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone. Copy the /exec URL.
 *  5. After you have signed in once as Master Admin and changed your password,
 *     replace MASTER_INITIAL_PASSWORD below with an empty string ''.
 */
const MASTER_ID = 'taufiqws';                 // sign-in is not case-sensitive: TaufiqWS works
const MASTER_NAME = 'TaufiqWS';
const MASTER_INITIAL_PASSWORD = '13110491';   // used ONCE to create the master account
const APP_URL = 'https://taufiqpias.github.io/TuitionPro'; // link used in emails
const ROOT_NAME = 'TuitionPro';               // top-level Drive folder

/* ---------- WAHA WhatsApp HTTP API ----------
   Run setWaha() ONCE from the Apps Script editor (Run button) to save these values:
     WAHA_URL  -> the public HTTPS URL of your WAHA instance (from Cloudflare Tunnel)
     WAHA_KEY  -> the value of WAHA_API_KEY env var on the WAHA container
   The session name is hard-coded below — change it if you named your session differently. */
const WAHA_SESSION = 'TuitionPro';            // must match WHATSAPP_DEFAULT_SESSION on the WAHA container
const WAHA_URL = () => P_().getProperty('WAHA_URL') || '';
const WAHA_KEY = () => P_().getProperty('WAHA_KEY') || '';
function setWaha() {
  P_().setProperty('WAHA_URL', 'https://sustainable-perth-gis-episode.trycloudflare.com'); // ← your tunnel URL
  P_().setProperty('WAHA_KEY', 'tp-waha-secret-2026');                                      // ← your WAHA_API_KEY value
}

const DATA = {
  Students:   ['id','sid','name','class','section','batch','batchId','guardian','phone','fee','status','joined','updated','roll','feeType','feeFrom','school','archived','archivedAt','nextClass','nextYear'],
  Batches:    ['id','class','section','name','start','days','groupLink','groupJid'],
  Attendance: ['id','date','studentId','batchId','status'],
  Fees:       ['id','studentId','month','amount','paid','date','kind','method','note','rcpt','batchId'],
  Exams:      ['id','name','subject','type','chapters','date','batchId','wf','mf','pf','vf','full','eachPass','created'],
  Results:    ['id','examId','studentId','w','m','p','v','absent','total','pct','grade','gpa']
};
const USERS = ['id','salt','hash','role','status','name','email','phone','address','speciality','trainers','services','logo','photo','lh1','lh2','lh3','lh4','token','exp','created','folderId','sheetId','note'];
const PROFILE = ['name','email','phone','address','speciality','trainers','services','logo','photo','lh1','lh2','lh3','lh4'];
const DAY = 864e5;
const BUILD = '14'; // bumped: WAHA inbox schema + group creation + chat view

/* ---------- small helpers ---------- */
const P_ = () => PropertiesService.getScriptProperties();
const err_ = m => out_({ ok: false, error: m });
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
const h_ = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const hash_ = (salt, pw) => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pw, Utilities.Charset.UTF_8));
// Same phone number even if written with/without the country code or spaces (compares the last 10 digits)
const samePhone_ = (stored, digits) => { const a = String(stored == null ? '' : stored).replace(/\D/g, ''); return a.length >= 7 && digits.length >= 7 && (a === digits || (a.length >= 10 && digits.length >= 10 && a.slice(-10) === digits.slice(-10))); };
const ver_ = k => P_().getProperty('V_' + k) || '0';
const bump_ = k => { const v = String(Date.now()); P_().setProperty('V_' + k, v); return v; };
const adminVer_ = () => P_().getProperty('VADMIN') || '0';
const curVer_ = u => u.role === 'master' ? ver_(u.id) + '.' + adminVer_() : ver_(u.id);

// Reads a sheet into objects. Self-heals: adds missing columns, and turns any value Sheets auto-converted
// (times, dates, phone numbers) back into the plain text the app expects.
function rows_(sh, cols) {
  if (sh.getLastRow() < 2) { if (cols) ensureCols_(sh, cols); return []; }
  const v = sh.getDataRange().getValues(), h = v.shift();
  if (cols && cols.some(c => h.indexOf(c) < 0)) { ensureCols_(sh, cols); return rows_(sh); }
  const tz = sh.getParent().getSpreadsheetTimeZone();
  const sc = h.indexOf('start');
  const disp = sc >= 0 && v.some(r => r[sc] instanceof Date) ? sh.getRange(2, sc + 1, v.length, 1).getDisplayValues() : null;
  return v.map((r, ri) => Object.fromEntries(h.map((k, i) => [k, norm_(k, r[i], tz, disp && disp[ri][0])])))
          .filter(o => o[h[0]] !== '');
}
function hhmm_(s) { // "4:25:00 PM" or "16:25:00" -> "16:25"
  const m = String(s).match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
  if (!m) return '';
  let hr = +m[1]; const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && hr < 12) hr += 12;
  if (ap === 'am' && hr === 12) hr = 0;
  return String(hr).padStart(2, '0') + ':' + m[2];
}
function norm_(k, v, tz, shown) {
  if (k === 'phone' && typeof v === 'number') return /^1\d{9}$/.test(String(v)) ? '0' + v : String(v);
  if (!(v instanceof Date)) return v;
  if (k === 'start') return hhmm_(shown) || Utilities.formatDate(v, tz, 'HH:mm');
  if (k === 'joined' || k === 'date') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  if (k === 'month' || k === 'feeFrom') return Utilities.formatDate(v, tz, 'yyyy-MM');
  return v.toISOString();
}
// Always write as text so Sheets never reinterprets what we store.
function writeRows_(sh, startRow, lines) {
  const rng = sh.getRange(startRow, 1, lines.length, lines[0].length);
  rng.setNumberFormat('@');
  rng.setValues(lines);
}
function put_(sh, o) {
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const ids = sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat().map(String);
  const at = ids.indexOf(String(o.id));
  const line = h.map(k => o[k] === undefined ? '' : o[k]);
  if (at >= 0) return writeRows_(sh, at + 2, [line]);
  const r = sh.getLastRow() + 1;
  if (r > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);
  writeRows_(sh, r, [line]);
}
function del_(sh, id) {
  if (sh.getLastRow() < 2) return;
  const at = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat().map(String).indexOf(String(id));
  if (at >= 0) sh.deleteRow(at + 2);
}
function ensureCols_(sh, cols) { // adds any missing columns to an older sheet
  const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  cols.filter(c => h.indexOf(c) < 0).forEach(c => {
    const col = sh.getLastColumn() + 1;
    sh.getRange(1, col).setValue(c);
    sh.getRange(2, col, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
  });
}
function initSheet_(sh, cols) {
  sh.getRange(1, 1, 1, cols.length).setValues([cols]);
  sh.setFrozenRows(1);
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), cols.length).setNumberFormat('@'); // keep phones/times as text
}

/* ---------- Drive: system sheet + per-user workspaces ---------- */
function sys_() {
  const id = P_().getProperty('SYS');
  if (id) return SpreadsheetApp.openById(id);
  const root = DriveApp.createFolder(ROOT_NAME);
  P_().setProperty('ROOT', root.getId());
  const ss = SpreadsheetApp.create('TuitionPro System (do not edit)');
  DriveApp.getFileById(ss.getId()).moveTo(root);
  P_().setProperty('SYS', ss.getId());
  const sh = ss.getSheets()[0]; sh.setName('Users'); initSheet_(sh, USERS);
  return ss;
}

// Creates the user's own folder + a fresh spreadsheet inside it (first time only), and makes sure all tables exist.
function ws_(users, u) {
  let ss = null;
  if (u.sheetId) { try { ss = SpreadsheetApp.openById(u.sheetId); } catch (e) { ss = null; } }
  if (!ss) {
    const root = DriveApp.getFolderById(P_().getProperty('ROOT'));
    const folder = root.createFolder(u.name + ' (' + u.id + ')');
    ss = SpreadsheetApp.create('TuitionPro Data - ' + u.name);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    u.folderId = folder.getId(); u.sheetId = ss.getId();
    put_(users, u);
  }
  let first = ss.getSheetByName('Sheet1');
  for (const t in DATA) {
    const have = ss.getSheetByName(t);
    if (have) continue;
    const sh = first ? first.setName(t) : ss.insertSheet(t);
    first = null;
    initSheet_(sh, DATA[t]);
  }
  return ss;
}

/* ---------- accounts ---------- */
function seedMaster_(users) {
  if (rows_(users).some(r => r.role === 'master') || !MASTER_INITIAL_PASSWORD) return;
  const salt = Utilities.getUuid();
  put_(users, { id: MASTER_ID, salt, hash: hash_(salt, MASTER_INITIAL_PASSWORD), role: 'master', status: 'active',
    name: MASTER_NAME, email: Session.getEffectiveUser().getEmail(), created: new Date().toISOString() });
}
const masterEmail_ = U => { const m = U.find(r => r.role === 'master'); return (m && m.email) || Session.getEffectiveUser().getEmail(); };
const pub_ = u => { const o = { id: String(u.id), role: u.role, status: u.status }; PROFILE.forEach(k => o[k] = u[k] === undefined ? '' : u[k]); return o; };
const brief_ = u => ({ id: String(u.id), name: u.name, email: u.email, phone: u.phone, status: u.status, note: u.note, created: u.created });
function auth_(U, token) {
  if (!token) return null;
  const u = U.find(r => r.token && r.token === token && Number(r.exp) > Date.now() && r.status === 'active');
  if (u) u.id = String(u.id);
  return u || null;
}
function session_(users, u) {
  u.token = Utilities.getUuid() + Utilities.getUuid();
  u.exp = String(Date.now() + 30 * DAY);
  put_(users, u);
  return u.token;
}
function allPayload_(users, U, u) { // everything the app needs on start-up
  const ss = ws_(users, u), data = {};
  for (const t in DATA) data[t] = rows_(ss.getSheetByName(t), DATA[t]);
  const res = { build: BUILD, ver: curVer_(u), data, me: pub_(u) };
  if (u.role === 'master') res.admin = { users: U.filter(r => r.role !== 'master').map(brief_) };
  return res;
}
function check_(U, q, needEmail, needPhone) {
  const id = String(q.id || '').trim().toLowerCase();
  if (!/^(?=.*[a-z])[a-z0-9_.-]{3,30}$/.test(id)) return { e: 'ID needs 3–30 characters (letters, numbers, . _ -) with at least one letter' };
  if (String(q.pw || '').length < 6) return { e: 'Password needs at least 6 characters' };
  const name = String(q.name || '').trim().slice(0, 80);
  if (!name) return { e: 'Enter the institute or trainer name' };
  const email = String(q.email || '').trim();
  if ((needEmail || email) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { e: 'Enter a valid email address' };
  const phone = String(q.phone || '').trim().slice(0, 30), pd = phone.replace(/\D/g, '');
  if ((needPhone || phone) && (pd.length < 7 || pd.length > 15)) return { e: 'Enter a valid phone number' };
  if (U.some(r => String(r.id) === id)) return { e: 'That ID is already taken' };
  if (email && U.some(r => String(r.email || '').trim().toLowerCase() === email.toLowerCase())) return { e: 'That email is already used by another account' };
  if (pd && U.some(r => samePhone_(r.phone, pd))) return { e: 'That phone number is already used by another account' };
  const salt = Utilities.getUuid();
  return { u: { id, salt, hash: hash_(salt, q.pw), name, email, phone, created: new Date().toISOString() } };
}
function mail_(to, subject, body) {
  if (!to) return false;
  try {
    const link = APP_URL ? '<p><a href="' + h_(APP_URL) + '">Open TuitionPro</a></p>' : '';
    MailApp.sendEmail({ to, subject, name: 'TuitionPro Master Admin',
      htmlBody: '<div style="font-family:Arial,sans-serif;font-size:14px;color:#17324d">' + body + link + '<p style="color:#64809b">TuitionPro</p></div>' });
    return true;
  } catch (e) { return false; }
}

/* ---------- http ---------- */
function authorize() { sys_(); MailApp.getRemainingDailyQuota(); DriveApp.getRootFolder(); } // run once to grant permissions
function doGet() { return out_({ ok: true, msg: 'TuitionPro API is running' }); }

function doPost(e) {
  /* ----- WAHA webhook (incoming WhatsApp messages) -----
     If the request comes from WAHA (it has an "event" field and our ?key= matches),
     log it and return. Otherwise fall through to the normal app logic. */
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
    if (raw && raw.indexOf('"event"') >= 0) {
      const key = (e.parameter && e.parameter.key) || '';
      if (key && key === WAHA_KEY()) { logWahaEvent_(raw); return out_({ ok: true }); }
      return err_('bad webhook key');
    }
  } catch (_) { /* fall through to normal handling */ }

  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const q = JSON.parse(e.postData.contents), a = q.action;
    const sys = sys_(), users = sys.getSheetByName('Users');
    ensureCols_(users, USERS);
    seedMaster_(users);
    const U = rows_(users);

    if (a === 'login') {
      const key = String(q.id || '').trim().toLowerCase(), digits = key.replace(/\D/g, '');
      let m = U.filter(r => String(r.id) === key);                                                              // 1. ID
      if (!m.length && key.indexOf('@') > 0) m = U.filter(r => String(r.email || '').trim().toLowerCase() === key); // 2. email
      if (!m.length && digits.length >= 7) m = U.filter(r => samePhone_(r.phone, digits));                      // 3. phone
      if (m.length > 1) m = m.filter(r => hash_(r.salt, q.pw || '') === r.hash);                                // shared by several accounts: the password decides
      const u = m.length === 1 ? m[0] : null;
      if (!u || hash_(u.salt, q.pw || '') !== u.hash) { Utilities.sleep(800); return err_('Wrong ID, email, phone or password'); }
      if (u.status === 'pending') return err_('Your sign-up is waiting for approval. You will get an email once it is approved.');
      if (u.status === 'rejected') return err_('Your sign-up request was not approved.' + (u.note ? ' Reason: ' + u.note : ''));
      u.id = String(u.id);
      const token = session_(users, u);
      return out_(Object.assign({ ok: true, token }, allPayload_(users, U, u)));
    }

    if (a === 'signup') {
      if (U.filter(r => r.status === 'pending').length >= 50) return err_('Too many pending requests. Please try again later.');
      const c = check_(U, q, true, true);
      if (c.e) return err_(c.e);
      c.u.role = 'user'; c.u.status = 'pending';
      put_(users, c.u);
      P_().setProperty('VADMIN', String(Date.now()));
      mail_(masterEmail_(U), 'New TuitionPro sign-up request: ' + c.u.name,
        '<p><b>' + h_(c.u.name) + '</b> (@' + h_(c.u.id) + ') asked for an account.</p><p>Email: ' + h_(c.u.email) + '<br>Phone: ' + h_(c.u.phone) + '</p><p>Open the Admin panel to approve or reject this request.</p>');
      return out_({ ok: true, pending: true });
    }

    const u = auth_(U, q.token);
    if (!u) return out_({ ok: false, auth: true, error: 'Please sign in again' });
    const master = u.role === 'master';

    switch (a) {
      case 'ping':
        return out_({ ok: true, ver: curVer_(u), pending: master ? U.filter(r => r.status === 'pending').length : undefined });

      case 'logout': u.token = ''; u.exp = ''; put_(users, u); return out_({ ok: true });

      case 'all':
        return out_(Object.assign({ ok: true }, allPayload_(users, U, u)));

      case 'save': {
        if (!DATA[q.table] || !q.row || !q.row.id) return err_('Bad request');
        put_(ws_(users, u).getSheetByName(q.table), q.row);
        bump_(u.id);
        return out_({ ok: true, ver: curVer_(u) });
      }

      case 'saveMany': { // bulk insert (imports) or bulk update when upsert is true
        if (!DATA[q.table] || !Array.isArray(q.rows) || q.rows.length > 500) return err_('Bad import request');
        const sh = ws_(users, u).getSheetByName(q.table);
        const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        const ids = sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat().map(String);
        const at = new Map(ids.map((v, i) => [v, i + 2]));
        const adds = [];
        q.rows.forEach(r => {
          if (!r.id) return;
          const line = h.map(k => r[k] === undefined ? '' : r[k]);
          if (!at.has(String(r.id))) adds.push(line);
          else if (q.upsert) writeRows_(sh, at.get(String(r.id)), [line]);
        });
        if (adds.length) {
          const need = sh.getLastRow() + adds.length - sh.getMaxRows();
          if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need);
          writeRows_(sh, sh.getLastRow() + 1, adds);
        }
        bump_(u.id);
        return out_({ ok: true, ver: curVer_(u) });
      }

      case 'remove': {
        if (!DATA[q.table]) return err_('Unknown table');
        del_(ws_(users, u).getSheetByName(q.table), q.id);
        bump_(u.id);
        return out_({ ok: true, ver: curVer_(u) });
      }

      case 'removeWhere': { // delete every row of a table whose column equals a value (e.g. all results of one exam)
        if (!DATA[q.table] || !q.field) return err_('Bad request');
        const sh = ws_(users, u).getSheetByName(q.table);
        if (sh.getLastRow() >= 2) {
          const v = sh.getDataRange().getValues(), ci = v[0].indexOf(q.field);
          if (ci < 0) return err_('Unknown column');
          for (let i = v.length - 1; i >= 1; i--) if (String(v[i][ci]) === String(q.value)) sh.deleteRow(i + 1);
        }
        bump_(u.id);
        return out_({ ok: true, ver: curVer_(u) });
      }

      case 'profile': {
        const oldName = u.name;
        const pf = q.fields || {}, pe = String(pf.email || '').trim().toLowerCase(), pp = String(pf.phone || '').replace(/\D/g, '');
        if (pe && U.some(r => String(r.id) !== String(u.id) && String(r.email || '').trim().toLowerCase() === pe)) return err_('That email is already used by another account');
        if (pp && U.some(r => String(r.id) !== String(u.id) && samePhone_(r.phone, pp))) return err_('That phone number is already used by another account');
        PROFILE.forEach(k => { if (q.fields && q.fields[k] !== undefined) u[k] = q.fields[k]; });
        if (q.newPassword) {
          if (hash_(u.salt, q.oldPassword || '') !== u.hash) return err_('Current password is wrong');
          if (String(q.newPassword).length < 6) return err_('New password needs at least 6 characters');
          u.hash = hash_(u.salt, q.newPassword);
        }
        put_(users, u);
        if (u.name !== oldName && u.folderId) { try { DriveApp.getFolderById(u.folderId).setName(u.name + ' (' + u.id + ')'); } catch (x) {} }
        bump_(u.id);
        return out_({ ok: true, ver: curVer_(u) });
      }

      case 'waSend': {
        // Send ONE WhatsApp message via WAHA and log it to WhatsAppInbox so it appears in the chat history.
        // q = { chat: "88017...", text: "Hello" }  OR  { chat: "<groupid>@g.us", text: "Hello", isGroup: true }
        if (!WAHA_URL() || !WAHA_KEY()) return err_('WAHA not configured. Run setWaha() in Apps Script.');
        const chatRaw = String(q.chat || '');
        const isGroup = !!q.isGroup || chatRaw.indexOf('@g.us') >= 0;
        const chat = isGroup ? chatRaw : chatRaw.replace(/\D/g, '');
        const text = String(q.text || '');
        if (!chat || !text) return err_('Bad chat or text');
        const chatId = isGroup ? chat : (chat + '@c.us');
        try {
          const resp = UrlFetchApp.fetch(WAHA_URL() + '/api/sendText', {
            method: 'post',
            contentType: 'application/json',
            headers: { 'X-Api-Key': WAHA_KEY() },
            muteHttpExceptions: true,
            payload: JSON.stringify({ session: WAHA_SESSION, chatId: chatId, text: text })
          });
          const code = resp.getResponseCode();
          if (code === 200 || code === 201) {
            logWahaOut_(chatId, text);
            return out_({ ok: true });
          }
          return err_('WAHA error ' + code + ': ' + resp.getContentText().slice(0, 300));
        } catch (ex) { return err_('WAHA fetch failed: ' + ex); }
      }

      case 'waSendMany': {
        // Send the same (or per-recipient) text to many numbers, with a delay between each.
        // q = { items: [{ chat: "88017...", text: "Hello" }, ...], delayMs: 1500 }
        if (!WAHA_URL() || !WAHA_KEY()) return err_('WAHA not configured.');
        if (!Array.isArray(q.items) || q.items.length === 0 || q.items.length > 100) return err_('Send between 1 and 100 messages per call');
        const delay = Math.max(800, Number(q.delayMs) || 1500);
        const results = [];
        for (const it of q.items) {
          const chat = String(it.chat || '').replace(/\D/g, '');
          if (chat.length < 10) { results.push({ chat, ok: false, error: 'bad number' }); continue; }
          const chatId = chat + '@c.us';
          try {
            const resp = UrlFetchApp.fetch(WAHA_URL() + '/api/sendText', {
              method: 'post', contentType: 'application/json',
              headers: { 'X-Api-Key': WAHA_KEY() }, muteHttpExceptions: true,
              payload: JSON.stringify({ session: WAHA_SESSION, chatId: chatId, text: String(it.text || '') })
            });
            const code = resp.getResponseCode();
            const ok = (code === 200 || code === 201);
            if (ok) logWahaOut_(chatId, String(it.text || ''));
            results.push({ chat, ok: ok, code: code });
          } catch (ex) { results.push({ chat, ok: false, error: String(ex).slice(0, 200) }); }
          Utilities.sleep(delay);
        }
        bump_(u.id);
        return out_({ ok: true, results: results, sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length });
      }

      case 'waInbox': {
        // Return conversation history for one chatId. q = { chatId: "880176...@c.us" or "<gid>@g.us", since: "<iso ts>" }
        // 'since' is optional — if provided, only rows newer than it are returned (for polling).
        if (!WAHA_URL() && !WAHA_KEY()) { /* still allow read from local sheet */ }
        const chatId = String(q.chatId || '').trim();
        if (!chatId) return err_('chatId required');
        const since = String(q.since || '');
        const ss = sys_();
        const sh = ss.getSheetByName('WhatsAppInbox');
        if (!sh || sh.getLastRow() < 2) return out_({ ok: true, messages: [] });
        const v = sh.getDataRange().getValues();
        const h = v.shift();
        const ci = { ts: h.indexOf('ts'), dir: h.indexOf('dir'), chat: h.indexOf('chatId'), name: h.indexOf('name'), text: h.indexOf('text') };
        const msgs = [];
        for (const r of v) {
          if (String(r[ci.chat]) !== chatId) continue;
          const ts = String(r[ci.ts]);
          if (since && ts <= since) continue;
          msgs.push({ ts: ts, dir: String(r[ci.dir]), name: String(r[ci.name] || ''), text: String(r[ci.text] || '') });
        }
        msgs.sort((a, b) => a.ts < b.ts ? -1 : 1);
        const lim = Math.min(1000, Math.max(20, Number(q.limit) || 300));   // first load returns only the newest messages
        return out_({ ok: true, messages: (!since && msgs.length > lim) ? msgs.slice(-lim) : msgs, chatId: chatId });
      }

      case 'waChats': {
        // Conversation list for the chat sidebar: one row per chatId with its newest message.
        // Returns { chats: [{ id, name, from, text, ts, dir, n }] } newest first (max 200).
        const sh = sys_().getSheetByName('WhatsAppInbox');
        if (!sh || sh.getLastRow() < 2) return out_({ ok: true, chats: [] });
        const hdr = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
        const ci = { ts: hdr.indexOf('ts'), dir: hdr.indexOf('dir'), chat: hdr.indexOf('chatId'), name: hdr.indexOf('name'), text: hdr.indexOf('text') };
        if (ci.ts < 0 || ci.chat < 0 || ci.dir < 0) return out_({ ok: true, chats: [] });
        const width = Math.max(ci.ts, ci.dir, ci.chat, ci.name, ci.text) + 1;   // skip the big 'raw' column
        const rows = sh.getRange(2, 1, sh.getLastRow() - 1, width).getValues();
        const map = {};
        for (const r of rows) {
          const id = String(r[ci.chat] || '');
          if (id.indexOf('@') < 0) continue;
          const ts = String(r[ci.ts]), dir = String(r[ci.dir]);
          const c = map[id] || (map[id] = { id: id, name: '', from: '', text: '', ts: '', dir: '', n: 0 });
          c.n++;
          if (ts >= c.ts) { c.ts = ts; c.dir = dir; c.text = String(r[ci.text] || '').slice(0, 140); c.from = dir === 'in' ? String(r[ci.name] || '') : ''; }
          if (dir === 'in' && id.indexOf('@g.us') < 0 && r[ci.name]) c.name = String(r[ci.name]);
        }
        const chats = Object.keys(map).map(k => map[k]).sort((a, b) => a.ts < b.ts ? 1 : -1).slice(0, 200);
        return out_({ ok: true, chats: chats });
      }

      case 'waListGroups': {
        // Fetch the WhatsApp groups this session knows about. q = {} (no params)
        if (!WAHA_URL() || !WAHA_KEY()) return err_('WAHA not configured.');
        try {
          const resp = UrlFetchApp.fetch(WAHA_URL() + '/api/' + WAHA_SESSION + '/groups', {
            method: 'get',
            headers: { 'X-Api-Key': WAHA_KEY() },
            muteHttpExceptions: true
          });
          const code = resp.getResponseCode();
          if (code !== 200) return err_('WAHA error ' + code + ': ' + resp.getContentText().slice(0, 300));
          const groups = JSON.parse(resp.getContentText()).map(g => ({ id: g.id || '', name: g.name || g.subject || '', size: (g.participants || g.size || 0) }));
          return out_({ ok: true, groups: groups });
        } catch (ex) { return err_('WAHA fetch failed: ' + ex); }
      }

      case 'waCreateGroup': {
        // Create a WhatsApp group with the students of a batch and save its JID on the batch.
        // q = { batchId: "...", participants: ["88017...", "88018..."] }
        if (!WAHA_URL() || !WAHA_KEY()) return err_('WAHA not configured.');
        if (!q.batchId) return err_('batchId required');
        const b = DB_Batches_(users, u, q.batchId);
        if (!b) return err_('Batch not found');
        if (b.groupJid) return err_('This batch already has a WhatsApp group: ' + b.groupJid);
        if (!Array.isArray(q.participants) || q.participants.length === 0) return err_('No participants');
        // WAHA expects participants as objects with .id = "<phone>@c.us"
        const participants = q.participants.map(p => ({ id: p.replace(/\D/g, '') + '@c.us' }));
        try {
          const resp = UrlFetchApp.fetch(WAHA_URL() + '/api/' + WAHA_SESSION + '/groups', {
            method: 'post', contentType: 'application/json',
            headers: { 'X-Api-Key': WAHA_KEY() }, muteHttpExceptions: true,
            payload: JSON.stringify({ name: bLabel_(b) || ('TuitionPro ' + b.id), participants: participants })
          });
          const code = resp.getResponseCode();
          if (code !== 200 && code !== 201) return err_('WAHA error ' + code + ': ' + resp.getContentText().slice(0, 300));
          const g = JSON.parse(resp.getContentText());
          // WAHA returns the group JID in various nested locations — try them all
          const gid = g.id || g.groupId ||
                      (g._data && g._data.id && (g._data.id._serialized || g._data.id)) ||
                      (g.id && g.id._serialized) ||
                      '';
          const cleanGid = String(gid).indexOf('@g.us') >= 0 ? String(gid).match(/[\d-]+@g\.us/)[0] : '';
          if (!cleanGid) return err_('Group created but JID not found in response: ' + resp.getContentText().slice(0, 300));
          b.groupJid = cleanGid;
          put_(ws_(users, u).getSheetByName('Batches'), b);
          bump_(u.id);
          return out_({ ok: true, groupJid: cleanGid, name: bLabel_(b) });
        } catch (ex) { return err_('WAHA fetch failed: ' + ex); }
      }
    }

    /* ----- Master Admin only ----- */
    if (!master) return err_('Admin only');
    const target = q.id ? U.find(r => String(r.id) === String(q.id).toLowerCase()) : null;

    switch (a) {
      case 'approve': {
        if (!target || target.status !== 'pending') return err_('This request is no longer pending');
        target.status = 'active'; target.note = '';
        ws_(users, target); // creates the user's Drive folder + fresh spreadsheet
        put_(users, target);
        const emailed = mail_(target.email, 'Your TuitionPro account is approved',
          '<p>Hello ' + h_(target.name) + ',</p><p>Good news — your TuitionPro account has been <b>approved</b>.</p><p>Your ID: <b>' + h_(target.id) + '</b></p><p>You can now sign in with the ID and password you chose when you signed up.</p>');
        P_().setProperty('VADMIN', String(Date.now()));
        return out_({ ok: true, emailed, ver: curVer_(u) });
      }
      case 'reject': {
        if (!target || target.status !== 'pending') return err_('This request is no longer pending');
        target.status = 'rejected'; target.note = String(q.reason || '').slice(0, 200);
        put_(users, target);
        const emailed = mail_(target.email, 'Your TuitionPro sign-up request',
          '<p>Hello ' + h_(target.name) + ',</p><p>Sorry — your TuitionPro sign-up request was not approved.</p>' + (target.note ? '<p>Reason: ' + h_(target.note) + '</p>' : ''));
        P_().setProperty('VADMIN', String(Date.now()));
        return out_({ ok: true, emailed, ver: curVer_(u) });
      }
      case 'createUser': {
        const c = check_(U, q, false, false);
        if (c.e) return err_(c.e);
        c.u.role = 'user'; c.u.status = 'active';
        put_(users, c.u);
        ws_(users, c.u);
        const emailed = c.u.email ? mail_(c.u.email, 'Your TuitionPro account is ready',
          '<p>Hello ' + h_(c.u.name) + ',</p><p>Your TuitionPro account has been created.</p><p>Your ID: <b>' + h_(c.u.id) + '</b></p><p>The Master Admin will share your password with you separately.</p>') : undefined;
        P_().setProperty('VADMIN', String(Date.now()));
        return out_({ ok: true, emailed, ver: curVer_(u) });
      }
      case 'resetPassword': {
        if (!target || target.role === 'master') return err_('No such ID');
        if (String(q.pw || '').length < 6) return err_('Password needs at least 6 characters');
        target.hash = hash_(target.salt, q.pw); target.token = ''; target.exp = '';
        put_(users, target);
        return out_({ ok: true, ver: curVer_(u) });
      }
      case 'removeUser': { // the user's Drive folder is kept, so no data is lost
        if (!target || target.role === 'master') return err_('No such ID');
        del_(users, target.id);
        P_().setProperty('VADMIN', String(Date.now()));
        return out_({ ok: true, ver: curVer_(u) });
      }
    }
    return err_('Unknown action');
  } catch (ex) {
    return err_(String(ex));
  } finally {
    lock.releaseLock();
  }
}

/* ---------- WAHA webhook logger ----------
   Inbox schema: ts | dir | chatId | name | text | raw
     dir = "in" (incoming from WhatsApp) or "out" (sent via waSend)
     chatId = the conversation key: "<phone>@c.us" for 1-on-1, "<gid>@g.us" for groups
     name = sender display name (incoming only; empty for outgoing)
   The same sheet is used for both directions so waInbox can return a single conversation. */
function inboxSheet_() {
  const ss = sys_();
  let sh = ss.getSheetByName('WhatsAppInbox');
  if (!sh) {
    sh = ss.insertSheet('WhatsAppInbox');
    sh.getRange(1, 1, 1, 6).setValues([['ts', 'dir', 'chatId', 'name', 'text', 'raw']]);
    sh.setFrozenRows(1);
    sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), 6).setNumberFormat('@');
  }
  return sh;
}

// Incoming message from WAHA webhook. Migrates the old 5-column sheet if needed.
function logWahaEvent_(raw) {
  try {
    const ev = JSON.parse(raw);
    if (ev.event !== 'message' || !ev.payload || ev.payload.fromMe) return;  // skip outgoing + non-message events
    const sh = inboxSheet_();
    migrateInbox_(sh);
    const p = ev.payload;
    const to = String(p.to || '');
    const from = String(p.from || '');
    let chatId = '', name = '';
    if (to.indexOf('@g.us') >= 0) {
      // group message: conversation key is the group JID, sender is the participant
      chatId = to;
      name = String(p.pushName || p.author || p.participant || 'Group member');
    } else {
      // 1-on-1: conversation key is the other person's JID (which is `from`)
      chatId = from;
      name = String(p.pushName || '');
    }
    sh.appendRow([new Date().toISOString(), 'in', chatId, name.slice(0, 80), (p.body || '').slice(0, 1500), raw.slice(0, 1500)]);
  } catch (_) {}
}

// Outgoing message we sent via waSend / waSendMany. Same schema.
function logWahaOut_(chatId, text) {
  try {
    const sh = inboxSheet_();
    migrateInbox_(sh);
    sh.appendRow([new Date().toISOString(), 'out', String(chatId), '', String(text || '').slice(0, 1500), '']);
  } catch (_) {}
}

// If the sheet was created by an older Code.gs (5 columns), add the missing columns and rename.
function migrateInbox_(sh) {
  const h = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  const want = ['ts', 'dir', 'chatId', 'name', 'text', 'raw'];
  const oldHdr = ['ts', 'from', 'name', 'text', 'raw'];
  if (h.length === 5 && h[1] === 'from') {
    // migrate: rename 'from' to 'dir', insert 'chatId' after it, set dir='in' for existing rows
    sh.getRange(1, 2).setValue('dir');
    sh.insertColumnAfter(2);
    sh.getRange(1, 3).setValue('chatId');
    if (sh.getLastRow() >= 2) {
      const n = sh.getLastRow() - 1;
      sh.getRange(2, 2, n, 1).setValue('in');                // mark all old rows as incoming
      sh.getRange(2, 3, n, 1).setValue('=D2');               // copy name → chatId placeholder (best effort)
    }
  }
}

// Helper: fetch a batch row from the user's spreadsheet
function DB_Batches_(users, u, batchId) {
  const ss = ws_(users, u);
  const rows = rows_(ss.getSheetByName('Batches'), DATA.Batches);
  return rows.find(r => String(r.id) === String(batchId)) || null;
}

// Helper: batch label (duplicated from app.js for backend use)
function bLabel_(b) {
  if (!b) return '';
  const cls = String(b.class || '');
  const sec = String(b.section || '');
  const nm = String(b.name || '');
  return [cls && ('Class ' + cls), sec && ('Sec ' + sec), nm].filter(Boolean).join(' - ');
}
