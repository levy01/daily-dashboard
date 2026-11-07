/**
 * Daily Dashboard - Google Apps Script backend.
 *
 * Paste this into Extensions > Apps Script of the Google Sheet that holds your tasks
 * (a container-bound script), then follow SETUP.md.
 *
 * Tabs (created by setup):
 *   Tasks    ID | Section | Task | Day | Done | Updated | Deleted
 *   Settings Key | Value
 *
 * Day  = the day a task is planned for (YYYY-MM-DD). Unfinished tasks keep their Day, so the
 *        dashboard can show how many days they have been carried over.
 * Done = the date a task was completed (blank = open). Finished tasks disappear the next day,
 *        but stay in this sheet as history.
 *
 * You can type tasks straight into the Tasks tab (Section + Task is enough). ID, Day and
 * Updated are filled in automatically the next time any device syncs.
 */

var TAB_TASKS = 'Tasks';
var TAB_SETTINGS = 'Settings';
var HEADERS = ['ID', 'Section', 'Task', 'Day', 'Done', 'Updated', 'Deleted'];
var COL = { ID: 0, SECTION: 1, TEXT: 2, DAY: 3, DONE: 4, UPDATED: 5, DELETED: 6 };

var DEFAULTS = [
  ['sections', 'Work,FinTech,Personal'],  // up to 4, in column order
  ['timezone', 'America/New_York'],
  ['evening_hour', '17'],                 // tasks added at/after this hour default to TOMORROW
  ['color', 'red'],                       // red, green, cyan, amber, purple, white
  ['clock24h', 'no'],
  ['countdown', '5'],                     // stopwatch get-ready seconds
  ['lat', '25.7617'],
  ['lon', '-80.1918'],
  ['unit', 'fahrenheit'],                 // or celsius
  ['dim_start', '22:00'],
  ['dim_end', '06:00'],
  ['reload_at', '03:00']                  // nightly page refresh on the kiosk
];

var ID_RE = /^[a-z0-9]{6,24}$/;
var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
var MAX_OPS = 50;
var MAX_TEXT = 200;
var MAX_SECTION = 30;

// ---------------------------------------------------------------- menu + setup

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Dashboard')
    .addItem('Set up / repair this sheet', 'setup')
    .addItem('Show connection info', 'showInfo')
    .addItem('Rotate secret key', 'rotateKey')
    .addToUi();
}

function setup() {
  var ss = ss_();

  var tasks = ss.getSheetByName(TAB_TASKS) || ss.insertSheet(TAB_TASKS);
  tasks.getRange('A:G').setNumberFormat('@');   // plain text: stops dates and "=..." being auto-parsed
  if (tasks.getLastRow() === 0) tasks.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  tasks.setFrozenRows(1);

  var st = ss.getSheetByName(TAB_SETTINGS) || ss.insertSheet(TAB_SETTINGS);
  st.getRange('A:B').setNumberFormat('@');
  if (st.getLastRow() === 0) st.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
  var have = {};
  if (st.getLastRow() >= 2) {
    st.getRange(2, 1, st.getLastRow() - 1, 1).getValues().forEach(function (r) { have[String(r[0]).trim()] = true; });
  }
  var missing = DEFAULTS.filter(function (d) { return !have[d[0]]; });
  if (missing.length) st.getRange(st.getLastRow() + 1, 1, missing.length, 2).setValues(missing);

  var tz = readSettings_(ss).timezone;
  try { ss.setSpreadsheetTimeZone(tz); } catch (e) { /* leave the sheet's current zone */ }

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_KEY')) props.setProperty('API_KEY', newKey_());
  return props.getProperty('API_KEY');
}

function showInfo() {
  var key = setup();
  var url = ScriptApp.getService().getUrl();
  var ui = SpreadsheetApp.getUi();
  if (!url) {
    ui.alert('Not deployed yet',
      'Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone), then run this again.',
      ui.ButtonSet.OK);
    return;
  }
  ui.alert('Dashboard connection',
    'Key:\n' + key +
    '\n\nAPI URL: do NOT use the address this menu reports; it can differ from the real deployment.' +
    '\nCopy the Web app URL from Deploy > Manage deployments instead (ends in /exec), paste it in the dashboard gear screen with this key.',
    ui.ButtonSet.OK);
}

function rotateKey() {
  PropertiesService.getScriptProperties().setProperty('API_KEY', newKey_());
  showInfo();
}

// ---------------------------------------------------------------- web app entry points

function doGet(e) {
  return respond_(function () {
    var p = (e && e.parameter) || {};
    auth_(p.key);
    return run_(null, p.today);
  });
}

function doPost(e) {
  return respond_(function () {
    var body = JSON.parse(e.postData.contents);
    auth_(body.key);
    return run_(body.ops || [], body.today);
  });
}

function respond_(fn) {
  var out;
  try { out = fn(); } catch (err) { out = { ok: false, error: String((err && err.message) || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function auth_(key) {
  var real = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!real) throw new Error('not set up (run Dashboard > Set up in the sheet)');
  key = String(key || '');
  var diff = key.length === real.length ? 0 : 1;
  for (var i = 0; i < real.length; i++) diff |= (key.charCodeAt(i) || 0) ^ real.charCodeAt(i);
  if (diff) throw new Error('auth');
}

// ---------------------------------------------------------------- core

function run_(ops, todayParam) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var ss = ss_();
    if (!ss.getSheetByName(TAB_TASKS) || !ss.getSheetByName(TAB_SETTINGS)) setup();
    var sheet = ss.getSheetByName(TAB_TASKS);
    var settings = readSettings_(ss);
    var today = DAY_RE.test(String(todayParam || '')) ? String(todayParam) : fmt_(new Date(), 'yyyy-MM-dd');

    var rows = readRows_(sheet);
    var originalCount = rows.length;
    var dirty = {};

    normalize_(rows, settings, dirty);
    if (ops && ops.length) applyOps_(rows, ops.slice(0, MAX_OPS), settings, today, dirty);
    flush_(sheet, rows, dirty, originalCount);

    return listOut_(rows, settings, today);
  } finally {
    lock.releaseLock();
  }
}

function listOut_(rows, settings, today) {
  var tasks = [];
  rows.forEach(function (r) {
    if (!r[COL.TEXT].trim() || r[COL.DELETED] === 'TRUE') return;
    if (r[COL.DONE] && r[COL.DONE] !== today) return;   // finished on an earlier day: history only
    tasks.push({ id: r[COL.ID], section: r[COL.SECTION], text: r[COL.TEXT], day: r[COL.DAY], done: r[COL.DONE] });
  });
  return { ok: true, today: today, tasks: tasks, settings: settings };
}

function applyOps_(rows, ops, settings, today, dirty) {
  var index = {};
  rows.forEach(function (r, i) { if (!(r[COL.ID] in index)) index[r[COL.ID]] = i; });

  ops.forEach(function (op) {
    if (!op || typeof op !== 'object') return;
    var id = String(op.id || '');
    if (!ID_RE.test(id)) return;

    if (op.op === 'add') {
      if (id in index) return;                          // idempotent: retries never duplicate
      var text = cleanText_(op.text, MAX_TEXT);
      var section = cleanText_(op.section, MAX_SECTION) || settings.sections[0];
      if (!text) return;
      var day = DAY_RE.test(String(op.day || '')) ? String(op.day) : defaultDay_(settings);
      rows.push([id, section, text, day, '', stamp_(), '']);
      index[id] = rows.length - 1;
      return;
    }

    if (!(id in index)) return;
    var i = index[id], r = rows[i];

    if (op.op === 'done') {
      r[COL.DONE] = DAY_RE.test(String(op.done || '')) ? String(op.done) : '';
    } else if (op.op === 'del') {
      r[COL.DELETED] = 'TRUE';
    } else if (op.op === 'edit') {
      var t = cleanText_(op.text, MAX_TEXT);
      if (t) r[COL.TEXT] = t;
      var s = cleanText_(op.section, MAX_SECTION);
      if (s) r[COL.SECTION] = s;
      if (DAY_RE.test(String(op.day || ''))) r[COL.DAY] = String(op.day);
    } else {
      return;
    }
    r[COL.UPDATED] = stamp_();
    dirty[i] = true;
  });
}

// Fill in anything missing on rows typed by hand in the sheet (ID, Section, Day) and fix duplicate IDs.
function normalize_(rows, settings, dirty) {
  var seen = {};
  var day = defaultDay_(settings);
  rows.forEach(function (r, i) {
    if (!r[COL.TEXT].trim()) return;
    var changed = false;
    if (!ID_RE.test(r[COL.ID]) || seen[r[COL.ID]]) { r[COL.ID] = newId_(); changed = true; }
    seen[r[COL.ID]] = true;
    if (!r[COL.SECTION].trim()) { r[COL.SECTION] = settings.sections[0]; changed = true; }
    if (!DAY_RE.test(r[COL.DAY])) { r[COL.DAY] = day; changed = true; }
    if (changed) { r[COL.UPDATED] = stamp_(); dirty[i] = true; }
  });
}

function flush_(sheet, rows, dirty, originalCount) {
  Object.keys(dirty).forEach(function (k) {
    var i = +k;
    if (i < originalCount) sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([rows[i]]);
  });
  if (rows.length > originalCount) {
    sheet.getRange(originalCount + 2, 1, rows.length - originalCount, HEADERS.length)
      .setValues(rows.slice(originalCount));
  }
}

// ---------------------------------------------------------------- helpers

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tz_() { return ss_().getSpreadsheetTimeZone() || 'America/New_York'; }
function fmt_(d, f) { return Utilities.formatDate(d, tz_(), f); }
function stamp_() { return fmt_(new Date(), "yyyy-MM-dd'T'HH:mm:ss"); }

function addDays_(ymd, n) {
  var p = ymd.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
}

// Tasks created at/after evening_hour are planned for tomorrow (the "fill it in the night before" flow).
function defaultDay_(settings) {
  var now = new Date();
  var today = fmt_(now, 'yyyy-MM-dd');
  var hour = parseInt(fmt_(now, 'H'), 10);
  return hour >= settings.evening_hour ? addDays_(today, 1) : today;
}

function cleanText_(v, max) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cell_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return fmt_(v, 'yyyy-MM-dd');
  return String(v);
}

function readRows_(sheet) {
  var n = sheet.getLastRow();
  if (n < 2) return [];
  return sheet.getRange(2, 1, n - 1, HEADERS.length).getValues().map(function (r) { return r.map(cell_); });
}

function readSettings_(ss) {
  var kv = {};
  DEFAULTS.forEach(function (d) { kv[d[0]] = d[1]; });
  var st = ss.getSheetByName(TAB_SETTINGS);
  if (st && st.getLastRow() >= 2) {
    st.getRange(2, 1, st.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var k = String(r[0] === null || r[0] === undefined ? '' : r[0]).trim();
      if (!k) return;
      var v = r[1];
      if (v instanceof Date) v = Utilities.formatDate(v, ss.getSpreadsheetTimeZone() || 'America/New_York', 'HH:mm');
      kv[k] = String(v === null || v === undefined ? '' : v).trim();
    });
  }
  var sections = kv.sections.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; }).slice(0, 4);
  if (!sections.length) sections = ['Tasks'];
  var eve = parseInt(kv.evening_hour, 10);
  var cd = parseInt(kv.countdown, 10);
  var lat = parseFloat(kv.lat), lon = parseFloat(kv.lon);
  return {
    sections: sections,
    timezone: kv.timezone || 'America/New_York',
    evening_hour: isNaN(eve) ? 17 : Math.min(23, Math.max(0, eve)),
    color: String(kv.color || 'red').toLowerCase(),
    clock24h: /^(yes|true|1|y)$/i.test(kv.clock24h),
    countdown: isNaN(cd) ? 5 : Math.min(30, Math.max(0, cd)),
    lat: isNaN(lat) ? 25.7617 : lat,
    lon: isNaN(lon) ? -80.1918 : lon,
    unit: String(kv.unit).toLowerCase() === 'celsius' ? 'celsius' : 'fahrenheit',
    dim_start: kv.dim_start,
    dim_end: kv.dim_end,
    reload_at: kv.reload_at
  };
}

function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function newKey_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}
