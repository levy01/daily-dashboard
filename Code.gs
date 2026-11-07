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

// Where the dashboard page is hosted. Change this if you host your own copy of index.html.
var DASHBOARD_URL = 'https://levy01.github.io/daily-dashboard/';

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
  ['reload_at', '03:00'],                 // nightly page refresh on the kiosk
  ['pomodoro_min', '25'],                 // timer presets, minutes
  ['short_min', '5'],
  ['long_min', '15'],
  ['news_topics', 'finance,health,sports,business,education'],  // comma separated, up to 6
  ['language', 'en']                      // en or es
];

var ID_RE = /^[a-z0-9]{6,24}$/;
var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
var MAX_OPS = 50;
var MAX_TEXT = 200;
var MAX_SECTION = 30;

// ---------------------------------------------------------------- menu + setup

function onOpen() {
  var es = es_();
  SpreadsheetApp.getUi().createMenu('Dashboard')
    .addItem(es ? 'Configurar / reparar esta hoja' : 'Set up / repair this sheet', 'setup')
    .addItem(es ? 'Mostrar datos de conexión' : 'Show connection info', 'showInfo')
    .addItem(es ? 'Cambiar la clave secreta' : 'Rotate secret key', 'rotateKey')
    .addItem(es ? 'Probar noticias' : 'Test news feed', 'testNewsMenu')
    .addSeparator()
    .addItem('Usar español', 'setSpanish')
    .addItem('Use English', 'setEnglish')
    .addToUi();
}

// Language: 'en' or 'es'. Controls the dashboard text, the news edition and this menu.
function es_() {
  try { return readSettings_(ss_()).language === 'es'; } catch (e) { return false; }
}
var ES_NEWS_TOPICS = 'finanzas,salud,deportes,negocios,educación';
var EN_NEWS_TOPICS = 'finance,health,sports,business,education';

function setSpanish() {
  setup();
  writeSetting_('language', 'es');
  var cur = readSettings_(ss_());
  if (cur.news_topics.join(',') === EN_NEWS_TOPICS) writeSetting_('news_topics', ES_NEWS_TOPICS);
  var tasks = ss_().getSheetByName(TAB_TASKS);
  if (tasks && tasks.getLastRow() < 2 && cur.sections.join(',') === 'Work,FinTech,Personal') writeSetting_('sections', 'Trabajo,Personal,Compras');
  onOpen();
  SpreadsheetApp.getUi().alert('Español activado',
    'El panel, las noticias y este menú ahora están en español. Los dispositivos se actualizan en menos de un minuto.\n\n' +
    'Puedes cambiar los nombres de las secciones con el lápiz del panel, o en la pestaña Settings.', SpreadsheetApp.getUi().ButtonSet.OK);
}

function setEnglish() {
  setup();
  writeSetting_('language', 'en');
  var cur = readSettings_(ss_());
  if (cur.news_topics.join(',') === ES_NEWS_TOPICS) writeSetting_('news_topics', EN_NEWS_TOPICS);
  onOpen();
  SpreadsheetApp.getUi().alert('English enabled',
    'The dashboard, news and this menu are now in English. Devices update within a minute.', SpreadsheetApp.getUi().ButtonSet.OK);
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

// Asks for the Web app URL once (the script cannot reliably know its own /exec address), remembers it,
// and shows a ready-made pairing link: open it on any device to connect that device in one step.
function showInfo() {
  var key = setup();
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  var saved = props.getProperty('API_URL') || '';
  var es = es_();
  var r = ui.prompt(es ? 'Conexión del panel' : 'Dashboard connection',
    es ? 'Pega la URL de la aplicación web (Implementar > Administrar implementaciones > URL de la aplicación web, termina en /exec).' +
         (saved ? '\n\nDeja en blanco para conservar:\n' + saved : '\n\n¿Aún no la has publicado? Primero: Implementar > Nueva implementación > Aplicación web (Ejecutar como: Yo, Quién tiene acceso: Cualquier persona).')
       : 'Paste your Web app URL (Deploy > Manage deployments > Web app URL, ends in /exec).' +
         (saved ? '\n\nLeave blank to keep:\n' + saved : '\n\nNot deployed yet? Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone) first.'),
    ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var url = r.getResponseText().trim() || saved;
  if (!/^https:\/\/script\.google\.com\/(macros\/s\/[A-Za-z0-9_-]+|a\/[^\/]+\/macros\/s\/[A-Za-z0-9_-]+)\/exec$/.test(url)) {
    ui.alert(es ? 'Eso no parece una URL de aplicación web' : 'That does not look like a Web app URL',
      es ? 'Debe empezar con https://script.google.com/macros/s/ y terminar en /exec.'
         : 'It should start with https://script.google.com/macros/s/ and end with /exec.', ui.ButtonSet.OK);
    return;
  }
  props.setProperty('API_URL', url);
  var link = DASHBOARD_URL + '#api=' + encodeURIComponent(url) + '&key=' + encodeURIComponent(key) + '&lang=' + (es ? 'es' : 'en');
  var body = es
    ? '<p><b>Abre este enlace en cada dispositivo que quieras conectar</b> (iPad, computadora, teléfono). ' +
      'Conecta el dispositivo automáticamente. Mantenlo privado: quien lo tenga puede ver y cambiar tus tareas.</p>' +
      '<p><a href="' + esc_(link) + '" target="_blank" style="font-size:16px">Abrir el panel y conectar este dispositivo</a></p>' +
      '<p>Para conectar otro dispositivo, copia el enlace:</p>'
    : '<p><b>Open this link on each device you want to connect</b> (iPad, laptop, phone). ' +
      'It pairs the device automatically. Keep it private: anyone with it can see and change your tasks.</p>' +
      '<p><a href="' + esc_(link) + '" target="_blank" style="font-size:16px">Open dashboard and pair this device</a></p>' +
      '<p>To pair another device, copy the link:</p>';
  var tail = es
    ? 'App en la pantalla de inicio del iPad: el icono tiene su propio almacenamiento. Abre primero el enlace en Safari, luego agrégalo a la pantalla de inicio, ' +
      'y pega la URL y la clave con el engranaje (Clave: ' + esc_(key) + ').'
    : 'iPad Home Screen app: a Home Screen icon has its own storage, so open the link in Safari first, ' +
      'then add to Home Screen, then paste the URL and key under the gear icon (Key: ' + esc_(key) + ').';
  var html = HtmlService.createHtmlOutput(
    '<div style="font:14px Arial,sans-serif;line-height:1.5">' + body +
    '<textarea readonly onclick="this.select()" style="width:100%;height:110px;font:12px monospace">' + esc_(link) + '</textarea>' +
    '<p style="color:#666;font-size:12px">' + tail + '</p>' +
    '</div>').setWidth(560).setHeight(420);
  ui.showModalDialog(html, es ? 'Conexión del panel' : 'Dashboard connection');
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
    if (p.action === 'news') return newsOut_();
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

    if (op.op === 'secRename' || op.op === 'secAdd' || op.op === 'secDel') {
      sectionOp_(op, rows, settings, dirty);
      return;
    }

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

// Rename / add / remove a section. Rename also re-labels every task row in that section.
function sectionOp_(op, rows, settings, dirty) {
  var s = settings.sections.slice();
  function find(n) {
    for (var j = 0; j < s.length; j++) if (s[j].toLowerCase() === n.toLowerCase()) return j;
    return -1;
  }
  if (op.op === 'secRename') {
    var from = cleanSection_(op.from), to = cleanSection_(op.to);
    if (!from || !to) return;
    var k = find(from), dup = find(to);
    if (dup >= 0 && dup !== k) return;                  // name already used by another section
    if (k >= 0) s[k] = to; else if (s.length < 4) s.push(to);
    rows.forEach(function (r, i) {
      if (r[COL.SECTION].toLowerCase() === from.toLowerCase()) { r[COL.SECTION] = to; r[COL.UPDATED] = stamp_(); dirty[i] = true; }
    });
  } else if (op.op === 'secAdd') {
    var name = cleanSection_(op.name);
    if (!name || find(name) >= 0 || s.length >= 4) return;
    s.push(name);
  } else {
    var del = find(cleanSection_(op.name));
    if (del < 0 || s.length <= 1) return;
    s.splice(del, 1);
  }
  settings.sections = s;
  writeSetting_('sections', s.join(','));
}

function cleanSection_(v) { return cleanText_(String(v || '').replace(/,/g, ' '), MAX_SECTION); }

function writeSetting_(key, value) {
  var st = ss_().getSheetByName(TAB_SETTINGS), n = st.getLastRow();
  if (n >= 2) {
    var keys = st.getRange(2, 1, n - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]).trim() === key) { st.getRange(i + 2, 2).setValue(value); return; }
    }
  }
  st.getRange(n + 1, 1, 1, 2).setValues([[key, value]]);
}

// ---------------------------------------------------------------- news (Google News RSS, no key needed)

function newsOut_() {
  var settings = readSettings_(ss_());
  var cache = CacheService.getScriptCache();
  var topics = settings.news_topics.map(function (topic) {
    var ck = 'news_' + settings.language + '_' + topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
    var hit = cache.get(ck);
    if (hit) { try { return JSON.parse(hit); } catch (e) { /* refetch */ } }
    var f = fetchNews_(topic, settings.language);
    var res = { topic: topic, items: f.items };
    if (f.err) { res.err = f.err; return res; }          // never cache failures
    if (res.items.length) { try { cache.put(ck, JSON.stringify(res), 1800); } catch (e) { /* too big: skip cache */ } }
    return res;
  });
  return { ok: true, topics: topics };
}

function fetchNews_(topic, lang) {
  try {
    var edition = lang === 'es' ? '&hl=es-419&gl=US&ceid=US:es-419' : '&hl=en-US&gl=US&ceid=US:en';
    var url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(topic + ' when:2d') + edition;
    var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (resp.getResponseCode() !== 200) return { items: [], err: 'HTTP ' + resp.getResponseCode() };
    var channel = XmlService.parse(resp.getContentText()).getRootElement().getChild('channel');
    if (!channel) return { items: [], err: 'no channel in feed' };
    var items = channel.getChildren('item').slice(0, 8).map(function (it) {
      var title = it.getChildText('title') || '', src = it.getChildText('source') || '';
      var tail = ' - ' + src;
      if (src && title.slice(-tail.length) === tail) title = title.slice(0, -tail.length);
      var t = Date.parse(it.getChildText('pubDate') || '');
      return { title: cleanText_(title, 200), link: String(it.getChildText('link') || ''), source: cleanText_(src, 60), t: isNaN(t) ? 0 : t };
    });
    return { items: items };
  } catch (e) { return { items: [], err: cleanText_((e && e.message) || e, 160) }; }
}

// Run once from the editor (or Dashboard > Test news feed) to grant the "connect to external service" permission.
function testNews() {                       // run from the editor: result goes to the Execution log, no dialog
  var es = es_();
  var r = fetchNews_(es ? 'finanzas' : 'finance', es ? 'es' : 'en');
  var msg = r.err ? 'FAILED: ' + r.err : 'OK: ' + r.items.length + ' stories. First: ' + (r.items[0] ? r.items[0].title : '-');
  Logger.log(msg);
  return msg;
}

function testNewsMenu() {                   // Dashboard menu: shows the result in a dialog
  SpreadsheetApp.getUi().alert(es_() ? 'Prueba de noticias' : 'News feed test', testNews(), SpreadsheetApp.getUi().ButtonSet.OK);
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
    reload_at: kv.reload_at,
    language: /^es/i.test(String(kv.language || '')) ? 'es' : 'en',
    pomodoro_min: num_(kv.pomodoro_min, 25, 1, 180),
    short_min: num_(kv.short_min, 5, 1, 180),
    long_min: num_(kv.long_min, 15, 1, 180),
    news_topics: String(kv.news_topics || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; }).slice(0, 6)
  };
}

function num_(v, def, lo, hi) { var n = parseFloat(v); return isNaN(n) ? def : Math.min(hi, Math.max(lo, n)); }
function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function newKey_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}
