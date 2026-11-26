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

const DATA = {
  Students:   ['id','sid','name','class','section','batch','batchId','guardian','phone','fee','status','joined','updated','roll','feeType','feeFrom','school','archived','archivedAt','nextClass','nextYear'],
  Batches:    ['id','class','section','name','start','days','groupLink'],
  Attendance: ['id','date','studentId','batchId','status'],
  Fees:       ['id','studentId','month','amount','paid','date','kind','method','note','rcpt','batchId'],
  Exams:      ['id','name','subject','type','chapters','date','batchId','wf','mf','pf','vf','full','eachPass','created'],
  Results:    ['id','examId','studentId','w','m','p','v','absent','total','pct','grade','gpa']
};
const USERS = ['id','salt','hash','role','status','name','email','phone','address','speciality','trainers','services','logo','photo','lh1','lh2','lh3','lh4','token','exp','created','folderId','sheetId','note'];
const PROFILE = ['name','email','phone','address','speciality','trainers','services','logo','photo','lh1','lh2','lh3','lh4'];
const DAY = 864e5;
const BUILD = '11'; // the app compares this to know whether you deployed the latest Code.gs

/* ---------- small helpers ---------- */
const P_ = () => PropertiesService.getScriptProperties();
const err_ = m => out_({ ok: false, error: m });
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
const h_ = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const hash_ = (salt, pw) => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pw, Utilities.Charset.UTF_8));
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
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const q = JSON.parse(e.postData.contents), a = q.action;
    const sys = sys_(), users = sys.getSheetByName('Users');
    ensureCols_(users, USERS);
    seedMaster_(users);
    const U = rows_(users);

    if (a === 'login') {
      const id = String(q.id || '').trim().toLowerCase();
      const u = U.find(r => String(r.id) === id);
      if (!u || hash_(u.salt, q.pw || '') !== u.hash) { Utilities.sleep(800); return err_('Wrong ID or password'); }
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
