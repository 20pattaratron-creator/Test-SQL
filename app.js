const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const state = {
  SQL: null,
  db: null,
  currentTable: null,
  rows: [],
  columns: [],
  schema: [],
  fileName: 'Browser Data Workbench',
  chart: null,
  dashboardCharts: [],
  activeAnalysis: 'descriptives',
};

const analysisNames = {
  descriptives: 'Descriptive Statistics',
  frequencies: 'Frequencies',
  crosstabs: 'Crosstabs',
  correlation: 'Correlations',
  regression: 'Linear Regression',
};

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function setStatus(message) { $('#statusText').textContent = message; }
function safeId(name) { return `"${String(name).replaceAll('"', '""')}"`; }
function fmt(n, digits = 2) { return Number.isFinite(n) ? n.toLocaleString('th-TH', { maximumFractionDigits: digits }) : '—'; }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

async function init() {
  try {
    state.SQL = await initSqlJs({ locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}` });
    state.db = new state.SQL.Database();
    $('#engineStatus').textContent = 'SQLite พร้อมใช้งาน';
    setStatus('SQLite engine ready');
    bindEvents();
    await loadSampleData(false);
  } catch (err) {
    console.error(err);
    $('#engineStatus').textContent = 'โหลด SQLite ไม่สำเร็จ';
    setStatus('SQLite engine error');
    bindEvents();
  }
}

function bindEvents() {
  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  $('#sidebarToggle').addEventListener('click', () => $('#sidebar').classList.toggle('closed'));
  $('#themeBtn').addEventListener('click', toggleTheme);
  syncThemeButton();
  $('#fileInput').addEventListener('change', e => e.target.files[0] && importFile(e.target.files[0]));
  $('#importShortcut').addEventListener('click', () => $('#fileInput').click());
  $('#newDbBtn').addEventListener('click', createNewDatabase);
  $('#sampleBtn').addEventListener('click', () => loadSampleData(true));
  $('#saveDbBtn').addEventListener('click', saveDatabase);
  $('#exportCsvBtn').addEventListener('click', exportCurrentCsv);
  $('#runSqlBtn').addEventListener('click', runSql);
  $('#sqlEditor').addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runSql(); }});
  $('#formatSqlBtn').addEventListener('click', () => { $('#sqlEditor').value = state.currentTable ? `SELECT *\nFROM ${safeId(state.currentTable)}\nLIMIT 100;` : 'SELECT sqlite_version();'; });
  $('#tableSearch').addEventListener('input', renderTableList);
  $('#runAnalysisBtn').addEventListener('click', runAnalysis);
  $('#clearOutputBtn').addEventListener('click', () => { $('#analysisOutput').className = 'analysis-output empty-state'; $('#analysisOutput').textContent = 'ผลวิเคราะห์จะแสดงในรูปแบบ Output Viewer'; });
  $$('.analysis-item').forEach(btn => btn.addEventListener('click', () => { state.activeAnalysis = btn.dataset.analysis; $$('.analysis-item').forEach(x => x.classList.remove('active')); btn.classList.add('active'); renderAnalysisControls(); }));
  $('#buildChartBtn').addEventListener('click', buildChart);
  $('#addDashboardBtn').addEventListener('click', addChartToDashboard);
  $('#resetDashboardBtn').addEventListener('click', () => { state.dashboardCharts = []; renderDashboard(); });
  $$('.quick-card').forEach(btn => btn.addEventListener('click', () => {
    const a = btn.dataset.action;
    if (a === 'open-file') $('#fileInput').click();
    if (a === 'go-sql') switchView('sql');
    if (a === 'go-spss') switchView('spss');
    if (a === 'go-chart') switchView('charts');
  }));
}

function switchView(view) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(v => v.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');
  $(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  if (view === 'dashboard') renderDashboard();
  if (view === 'charts') populateChartSelectors();
}

function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const label = $('#themeLabel');
  const btn = $('#themeBtn');
  if (label) label.textContent = dark ? 'Dark' : 'Light';
  if (btn) {
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    btn.title = dark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด';
  }
}

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('das-theme', next);
  syncThemeButton();
  toast(next === 'dark' ? 'เปิด Dark Mode แล้ว' : 'เปิด Light Mode แล้ว');
}

function createNewDatabase() {
  if (!state.SQL) return toast('SQLite engine ยังไม่พร้อม');
  state.db?.close();
  state.db = new state.SQL.Database();
  state.fileName = 'new-database.sqlite';
  state.currentTable = null; state.rows = []; state.columns = []; state.schema = [];
  refreshDatabaseUI();
  toast('สร้างฐานข้อมูลใหม่แล้ว');
}

async function loadSampleData(showToast = true) {
  if (!state.SQL) return;
  state.db?.close();
  state.db = new state.SQL.Database();
  state.db.run(`
    CREATE TABLE sales (
      id INTEGER PRIMARY KEY,
      order_date TEXT,
      region TEXT,
      category TEXT,
      salesperson TEXT,
      units INTEGER,
      revenue REAL,
      profit REAL,
      satisfaction REAL
    );
  `);
  const regions = ['Bangkok','Northeast','North','South','Central'];
  const categories = ['Electronics','Furniture','Office','Food'];
  const people = ['Anan','Mali','Krit','Pim','Nok','Beam'];
  const stmt = state.db.prepare('INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (let i = 1; i <= 180; i++) {
    const d = new Date(2026, (i - 1) % 8, ((i * 7) % 27) + 1);
    const units = 1 + (i * 3) % 18;
    const revenue = Math.round((900 + (i * 137) % 7200 + units * 240) * 100) / 100;
    const margin = 0.08 + ((i % 20) / 100);
    const profit = Math.round(revenue * margin * 100) / 100;
    const satisfaction = i % 23 === 0 ? null : Math.round((2.7 + ((i * 17) % 23) / 10) * 10) / 10;
    stmt.run([i, d.toISOString().slice(0,10), regions[i % regions.length], categories[i % categories.length], people[i % people.length], units, revenue, profit, satisfaction]);
  }
  stmt.free();
  state.fileName = 'sample-sales.sqlite';
  await refreshDatabaseUI('sales');
  if (showToast) toast('โหลดข้อมูลตัวอย่างแล้ว');
}

async function importFile(file) {
  try {
    setStatus(`กำลังเปิด ${file.name}...`);
    const ext = file.name.split('.').pop().toLowerCase();
    state.fileName = file.name;
    if (['db','sqlite','sqlite3'].includes(ext)) {
      if (!state.SQL) throw new Error('SQLite engine not ready');
      const bytes = new Uint8Array(await file.arrayBuffer());
      state.db?.close(); state.db = new state.SQL.Database(bytes);
      await refreshDatabaseUI();
    } else if (['csv','xlsx','xls'].includes(ext)) {
      await importSpreadsheet(file);
    } else if (ext === 'sav') {
      await importSavExperimental(file);
    } else {
      throw new Error('Unsupported file type');
    }
    $('#fileNameLabel').textContent = state.fileName;
    toast(`เปิด ${file.name} สำเร็จ`);
  } catch (err) {
    console.error(err);
    toast(`เปิดไฟล์ไม่สำเร็จ: ${err.message}`);
  } finally {
    $('#fileInput').value = '';
  }
}

async function importSpreadsheet(file) {
  if (!window.XLSX) throw new Error('SheetJS ยังไม่พร้อม');
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array', cellDates: false });
  if (!wb.SheetNames.length) throw new Error('ไม่พบ Worksheet');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
  if (!rows.length) throw new Error('ไฟล์ไม่มีข้อมูล');
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]+/g, '_').slice(0, 50) || 'imported_data';
  if (!state.db) state.db = new state.SQL.Database();
  const table = uniqueTableName(base);
  createTableFromObjects(table, rows);
  await refreshDatabaseUI(table);
}

async function importSavExperimental(file) {
  setStatus('กำลังโหลด SPSS parser...');
  try {
    const mod = await import('https://esm.sh/jsavvy@0.0.6');
    const SavParser = mod.SavParser || mod.default?.SavParser;
    const Feeder = mod.Feeder || mod.default?.Feeder;
    const Savvy = mod.Savvy || mod.default?.Savvy;
    if (!SavParser || !Feeder) throw new Error('SPSS parser API ไม่ตรงกับเวอร์ชันที่คาดไว้');
    const buffer = await file.arrayBuffer();
    const parsed = await new SavParser().all(new Feeder(buffer));
    let rows = [];
    if (Savvy) {
      const dataset = new Savvy(parsed);
      rows = Array.from({length: dataset.n}, (_, i) => Object.fromEntries(dataset.row(i)));
    } else if (Array.isArray(parsed?.rows)) {
      rows = parsed.rows;
    }
    if (!rows.length) throw new Error('อ่านข้อมูล .sav ไม่สำเร็จหรือรูปแบบไฟล์ยังไม่รองรับ');
    const table = uniqueTableName(file.name.replace(/\.sav$/i,'').replace(/\W+/g,'_') || 'spss_data');
    createTableFromObjects(table, rows);
    await refreshDatabaseUI(table);
  } catch (err) {
    throw new Error(`SPSS .sav Experimental: ${err.message}. แนะนำ Export จาก SPSS เป็น CSV/XLSX หากไฟล์นี้ยังอ่านไม่ได้`);
  }
}

function uniqueTableName(base) {
  const names = getTableNames(); let name = base; let i = 2;
  while (names.includes(name)) name = `${base}_${i++}`;
  return name;
}

function inferSqlType(values) {
  const nonNull = values.filter(v => v !== null && v !== '' && v !== undefined);
  if (!nonNull.length) return 'TEXT';
  if (nonNull.every(v => typeof v === 'number' && Number.isInteger(v))) return 'INTEGER';
  if (nonNull.every(v => typeof v === 'number' || (!Number.isNaN(Number(v)) && String(v).trim() !== ''))) return 'REAL';
  return 'TEXT';
}

function createTableFromObjects(table, objects) {
  if (!state.db) throw new Error('Database not ready');
  const cols = [...new Set(objects.flatMap(Object.keys))];
  const types = Object.fromEntries(cols.map(c => [c, inferSqlType(objects.map(r => r[c]))]));
  state.db.run(`CREATE TABLE ${safeId(table)} (${cols.map(c => `${safeId(c)} ${types[c]}`).join(', ')})`);
  const stmt = state.db.prepare(`INSERT INTO ${safeId(table)} (${cols.map(safeId).join(',')}) VALUES (${cols.map(()=>'?').join(',')})`);
  for (const row of objects) stmt.run(cols.map(c => row[c] === '' ? null : row[c]));
  stmt.free();
}

function getTableNames() {
  if (!state.db) return [];
  const res = state.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  return res[0]?.values.map(r => r[0]) || [];
}

async function refreshDatabaseUI(preferredTable = null) {
  const tables = getTableNames();
  state.currentTable = preferredTable && tables.includes(preferredTable) ? preferredTable : (state.currentTable && tables.includes(state.currentTable) ? state.currentTable : tables[0] || null);
  renderTableList();
  $('#tableCountBadge').textContent = tables.length;
  $('#metricTables').textContent = tables.length;
  $('#fileNameLabel').textContent = state.fileName;
  if (state.currentTable) loadCurrentTable();
  else { state.rows=[];state.columns=[];state.schema=[];renderAll(); }
}

function renderTableList() {
  const list = $('#tableList');
  const q = $('#tableSearch').value.toLowerCase();
  const tables = getTableNames().filter(t => t.toLowerCase().includes(q));
  if (!tables.length) { list.className='table-list empty-state'; list.textContent='ยังไม่มีตาราง'; return; }
  list.className='table-list';
  list.innerHTML = tables.map(t => `<div class="table-item ${t===state.currentTable?'active':''}" data-table="${escapeHtml(t)}"><span>▦</span><span>${escapeHtml(t)}</span></div>`).join('');
  $$('.table-item').forEach(el => el.addEventListener('click', () => { state.currentTable = el.dataset.table; loadCurrentTable(); renderTableList(); switchView('data'); }));
}

function loadCurrentTable() {
  if (!state.db || !state.currentTable) return;
  const info = state.db.exec(`PRAGMA table_info(${safeId(state.currentTable)})`)[0];
  state.schema = info ? info.values.map(v => ({ cid:v[0], name:v[1], type:v[2], notnull:v[3], default:v[4], pk:v[5] })) : [];
  const res = state.db.exec(`SELECT * FROM ${safeId(state.currentTable)} LIMIT 5000`)[0];
  state.columns = res?.columns || state.schema.map(x=>x.name);
  state.rows = res?.values.map(vals => Object.fromEntries(state.columns.map((c,i)=>[c, vals[i]]))) || [];
  renderAll();
}

function renderAll() {
  renderMetrics(); renderDataTable(); renderVariableView(); renderProfile(); renderAnalysisControls(); populateChartSelectors(); renderDashboard();
  $('#dataSubtitle').textContent = state.currentTable ? `${state.currentTable} · แสดงสูงสุด 5,000 แถว` : 'แสดงข้อมูลแบบตาราง';
  $('#statusStats').textContent = `${state.rows.length.toLocaleString()} rows · ${state.columns.length} columns`;
}

function dataProfile() {
  const totalCells = state.rows.length * state.columns.length;
  let missing = 0;
  for (const r of state.rows) for (const c of state.columns) if (r[c] === null || r[c] === undefined || r[c] === '') missing++;
  const numeric = state.columns.filter(c => numericValues(c).length >= Math.max(1, Math.floor(state.rows.length * .5))).length;
  return { missing, missingPct: totalCells ? (missing/totalCells)*100 : 0, numeric };
}

function renderMetrics() {
  const p = dataProfile();
  $('#metricRows').textContent = state.rows.length.toLocaleString();
  $('#metricColumns').textContent = state.columns.length;
  $('#metricMissing').textContent = `${fmt(p.missingPct,1)}%`;
  $('#dashRows').textContent = state.rows.length.toLocaleString(); $('#dashCols').textContent=state.columns.length; $('#dashNumeric').textContent=p.numeric; $('#dashMissing').textContent=`${fmt(p.missingPct,1)}%`;
}

function renderDataTable() {
  const wrap = $('#dataTableWrap');
  if (!state.rows.length || !state.columns.length) { wrap.className='data-table-wrap empty-state'; wrap.textContent='ยังไม่มีข้อมูล'; return; }
  wrap.className='data-table-wrap';
  const preview = state.rows.slice(0,500);
  wrap.innerHTML = `<table class="data-table"><thead><tr><th>#</th>${state.columns.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${preview.map((r,i)=>`<tr><td>${i+1}</td>${state.columns.map(c=>`<td title="${escapeHtml(r[c])}">${escapeHtml(r[c] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function variableMeta(c) {
  const vals = state.rows.map(r=>r[c]).filter(v => v !== null && v !== undefined && v !== '');
  const numeric = vals.length && vals.every(v => !Number.isNaN(Number(v)));
  const unique = new Set(vals.map(String)).size;
  let measure = 'Nominal';
  if (numeric && unique > Math.min(10, Math.max(4, state.rows.length*.05))) measure = 'Scale';
  else if (numeric) measure = 'Ordinal';
  return { type:numeric?'Numeric':'String', width:numeric?8:Math.max(8,Math.min(255,Math.max(...vals.map(v=>String(v).length),8))), decimals:numeric?2:0, measure, unique, missing:state.rows.length-vals.length };
}

function renderVariableView() {
  const wrap = $('#variableTableWrap');
  if (!state.columns.length) { wrap.className='data-table-wrap empty-state'; wrap.textContent='ยังไม่มีตัวแปร'; return; }
  wrap.className='data-table-wrap';
  wrap.innerHTML = `<table class="data-table"><thead><tr><th>Name</th><th>Type</th><th>Width</th><th>Decimals</th><th>Label</th><th>Missing</th><th>Unique</th><th>Measure</th></tr></thead><tbody>${state.columns.map(c=>{const m=variableMeta(c);return `<tr><td>${escapeHtml(c)}</td><td>${m.type}</td><td>${m.width}</td><td>${m.decimals}</td><td>${escapeHtml(c)}</td><td>${m.missing}</td><td>${m.unique}</td><td>${m.measure}</td></tr>`}).join('')}</tbody></table>`;
}

function renderProfile() {
  const p = dataProfile();
  $('#profileTableName').textContent = state.currentTable || 'No table';
  const el = $('#profileContent');
  if (!state.currentTable) { el.className='profile-list empty-state'; el.textContent='เลือกหรือนำเข้าตารางเพื่อดู Profile'; return; }
  el.className='profile-list';
  el.innerHTML = [
    ['Rows', state.rows.length.toLocaleString()], ['Columns',state.columns.length], ['Numeric variables',p.numeric], ['Missing cells',`${p.missing.toLocaleString()} (${fmt(p.missingPct,1)}%)`], ['Preview limit','5,000 rows']
  ].map(([a,b])=>`<div class="profile-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
}

function saveDatabase() {
  if (!state.db) return toast('ยังไม่มีฐานข้อมูล');
  const binary = state.db.export();
  downloadBlob(new Blob([binary],{type:'application/x-sqlite3'}), state.fileName.replace(/\.(csv|xlsx|xls|sav)$/i,'') + '.sqlite');
  toast('Export SQLite แล้ว');
}

function exportCurrentCsv() {
  if (!state.rows.length) return toast('ไม่มีข้อมูลให้ Export');
  const lines = [state.columns, ...state.rows.map(r=>state.columns.map(c=>r[c]))].map(row => row.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
  downloadBlob(new Blob(['\ufeff'+lines],{type:'text/csv;charset=utf-8'}), `${state.currentTable || 'data'}.csv`);
}

function runSql() {
  if (!state.db) return toast('SQLite ยังไม่พร้อม');
  const sql = $('#sqlEditor').value.trim(); if (!sql) return;
  const start = performance.now();
  try {
    const results = state.db.exec(sql);
    const ms = performance.now()-start;
    $('#queryMeta').textContent = `${fmt(ms,1)} ms`;
    renderQueryResults(results);
    if (/\b(insert|update|delete|create|drop|alter|replace)\b/i.test(sql)) refreshDatabaseUI();
    setStatus('Query completed');
  } catch (err) {
    $('#queryResult').className='data-table-wrap empty-state'; $('#queryResult').textContent=`SQL Error: ${err.message}`; $('#queryMeta').textContent='Error';
  }
}

function renderQueryResults(results) {
  const wrap = $('#queryResult');
  if (!results.length) { wrap.className='data-table-wrap empty-state'; wrap.textContent='Query สำเร็จ (ไม่มี result set)'; return; }
  const r = results[results.length-1];
  wrap.className='data-table-wrap';
  wrap.innerHTML = `<table class="data-table"><thead><tr>${r.columns.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${r.values.slice(0,1000).map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function numericValues(col) { return state.rows.map(r=>r[col]).filter(v=>v!==null&&v!==''&&v!==undefined&&!Number.isNaN(Number(v))).map(Number); }
function mean(a){return a.length?a.reduce((s,v)=>s+v,0)/a.length:NaN}
function median(a){if(!a.length)return NaN;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2}
function variance(a){if(a.length<2)return NaN;const m=mean(a);return a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1)}
function stdev(a){return Math.sqrt(variance(a))}
function pearson(x,y){const n=Math.min(x.length,y.length);if(n<2)return NaN;const mx=mean(x),my=mean(y);let num=0,dx=0,dy=0;for(let i=0;i<n;i++){const a=x[i]-mx,b=y[i]-my;num+=a*b;dx+=a*a;dy+=b*b}return num/Math.sqrt(dx*dy)}
function skewness(a){const n=a.length;if(n<3)return NaN;const m=mean(a),sd=stdev(a);if(!sd)return 0;const sum=a.reduce((s,v)=>s+((v-m)/sd)**3,0);return n/((n-1)*(n-2))*sum}
function linearRegression(x,y){const n=x.length,mx=mean(x),my=mean(y);let sxy=0,sxx=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2}const slope=sxy/sxx,intercept=my-slope*mx;const pred=x.map(v=>intercept+slope*v);const ssRes=y.reduce((s,v,i)=>s+(v-pred[i])**2,0);const ssTot=y.reduce((s,v)=>s+(v-my)**2,0);return{slope,intercept,r2:1-ssRes/ssTot,n}}

function optionList(cols=state.columns){ return cols.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join(''); }
function renderAnalysisControls() {
  $('#analysisTitle').textContent = analysisNames[state.activeAnalysis];
  const box = $('#analysisControls');
  if (!state.columns.length) { box.innerHTML='<div class="empty-state">นำเข้าข้อมูลก่อนเริ่มวิเคราะห์</div>'; return; }
  const nums = state.columns.filter(c=>numericValues(c).length >= 2);
  if (state.activeAnalysis === 'descriptives') box.innerHTML = `<label>Variable<select id="aVar">${optionList(nums)}</select></label>`;
  if (state.activeAnalysis === 'frequencies') box.innerHTML = `<label>Variable<select id="aVar">${optionList()}</select></label>`;
  if (state.activeAnalysis === 'crosstabs') box.innerHTML = `<label>Row Variable<select id="aRow">${optionList()}</select></label><label>Column Variable<select id="aCol">${optionList()}</select></label>`;
  if (state.activeAnalysis === 'correlation') box.innerHTML = `<label>Variable X<select id="aX">${optionList(nums)}</select></label><label>Variable Y<select id="aY">${optionList(nums)}</select></label>`;
  if (state.activeAnalysis === 'regression') box.innerHTML = `<label>Independent (X)<select id="aX">${optionList(nums)}</select></label><label>Dependent (Y)<select id="aY">${optionList(nums)}</select></label>`;
}

function runAnalysis() {
  if (!state.rows.length) return toast('ยังไม่มีข้อมูล');
  try {
    let html = '';
    if (state.activeAnalysis === 'descriptives') html = outputDescriptives($('#aVar').value);
    if (state.activeAnalysis === 'frequencies') html = outputFrequencies($('#aVar').value);
    if (state.activeAnalysis === 'crosstabs') html = outputCrosstab($('#aRow').value,$('#aCol').value);
    if (state.activeAnalysis === 'correlation') html = outputCorrelation($('#aX').value,$('#aY').value);
    if (state.activeAnalysis === 'regression') html = outputRegression($('#aX').value,$('#aY').value);
    $('#analysisOutput').className='analysis-output'; $('#analysisOutput').innerHTML=html;
  } catch (err) { toast(err.message); }
}

function outputDescriptives(c){const a=numericValues(c);if(!a.length)throw new Error('ตัวแปรนี้ไม่มีข้อมูลตัวเลข');const missing=state.rows.length-a.length;return `<div class="output-block"><h3>Descriptive Statistics</h3><div class="caption">Variable: ${escapeHtml(c)}</div><table class="spss-table"><thead><tr><th>Variable</th><th>N</th><th>Missing</th><th>Mean</th><th>Median</th><th>Std. Deviation</th><th>Variance</th><th>Minimum</th><th>Maximum</th><th>Skewness</th></tr></thead><tbody><tr><td>${escapeHtml(c)}</td><td>${a.length}</td><td>${missing}</td><td>${fmt(mean(a),3)}</td><td>${fmt(median(a),3)}</td><td>${fmt(stdev(a),3)}</td><td>${fmt(variance(a),3)}</td><td>${fmt(Math.min(...a),3)}</td><td>${fmt(Math.max(...a),3)}</td><td>${fmt(skewness(a),3)}</td></tr></tbody></table></div>`}

function outputFrequencies(c){const vals=state.rows.map(r=>r[c]);const valid=vals.filter(v=>v!==null&&v!==undefined&&v!=='');const counts=new Map();valid.forEach(v=>counts.set(String(v),(counts.get(String(v))||0)+1));let cum=0;const rows=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,100).map(([v,n])=>{const pct=n/vals.length*100;const vp=n/valid.length*100;cum+=vp;return `<tr><td>${escapeHtml(v)}</td><td>${n}</td><td>${fmt(pct,1)}</td><td>${fmt(vp,1)}</td><td>${fmt(cum,1)}</td></tr>`}).join('');return `<div class="output-block"><h3>Frequencies</h3><div class="caption">${escapeHtml(c)} · Valid ${valid.length} · Missing ${vals.length-valid.length}</div><table class="spss-table"><thead><tr><th>Value</th><th>Frequency</th><th>Percent</th><th>Valid Percent</th><th>Cumulative Percent</th></tr></thead><tbody>${rows}</tbody></table></div>`}

function outputCrosstab(r,c){const rv=[...new Set(state.rows.map(x=>x[r]).filter(v=>v!==null&&v!==''))].slice(0,30),cv=[...new Set(state.rows.map(x=>x[c]).filter(v=>v!==null&&v!==''))].slice(0,30);const body=rv.map(a=>{const subset=state.rows.filter(x=>String(x[r])===String(a));return `<tr><td>${escapeHtml(a)}</td>${cv.map(b=>`<td>${subset.filter(x=>String(x[c])===String(b)).length}</td>`).join('')}<td>${subset.length}</td></tr>`}).join('');return `<div class="output-block"><h3>Crosstabulation</h3><div class="caption">${escapeHtml(r)} × ${escapeHtml(c)} (สูงสุด 30 หมวดต่อแกน)</div><div class="data-table-wrap"><table class="spss-table"><thead><tr><th>${escapeHtml(r)}</th>${cv.map(v=>`<th>${escapeHtml(v)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${body}</tbody></table></div></div>`}

function pairedNumeric(xc,yc){const pairs=state.rows.map(r=>[Number(r[xc]),Number(r[yc])]).filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y));return {x:pairs.map(p=>p[0]),y:pairs.map(p=>p[1])}}
function outputCorrelation(xc,yc){const {x,y}=pairedNumeric(xc,yc);if(x.length<2)throw new Error('ข้อมูลคู่ไม่เพียงพอ');const r=pearson(x,y);return `<div class="output-block"><h3>Correlations</h3><table class="spss-table"><thead><tr><th></th><th>${escapeHtml(xc)}</th><th>${escapeHtml(yc)}</th></tr></thead><tbody><tr><td>${escapeHtml(xc)} · Pearson Correlation</td><td>1.000</td><td>${fmt(r,4)}</td></tr><tr><td>${escapeHtml(yc)} · Pearson Correlation</td><td>${fmt(r,4)}</td><td>1.000</td></tr><tr><td>N</td><td>${x.length}</td><td>${x.length}</td></tr></tbody></table></div>`}
function outputRegression(xc,yc){const {x,y}=pairedNumeric(xc,yc);if(x.length<3)throw new Error('ต้องมีข้อมูลคู่ตัวเลขอย่างน้อย 3 แถว');const m=linearRegression(x,y);return `<div class="output-block"><h3>Model Summary</h3><table class="spss-table"><thead><tr><th>Model</th><th>R</th><th>R Square</th><th>N</th></tr></thead><tbody><tr><td>1</td><td>${fmt(Math.sqrt(Math.max(0,m.r2)),4)}</td><td>${fmt(m.r2,4)}</td><td>${m.n}</td></tr></tbody></table></div><div class="output-block"><h3>Coefficients</h3><table class="spss-table"><thead><tr><th>Term</th><th>B</th></tr></thead><tbody><tr><td>(Constant)</td><td>${fmt(m.intercept,5)}</td></tr><tr><td>${escapeHtml(xc)}</td><td>${fmt(m.slope,5)}</td></tr></tbody></table><div class="caption">Equation: ${escapeHtml(yc)} = ${fmt(m.intercept,4)} + ${fmt(m.slope,4)} × ${escapeHtml(xc)}</div></div>`}

function populateChartSelectors(){const x=$('#chartX'),y=$('#chartY');if(!x||!y)return;x.innerHTML=optionList();const nums=state.columns.filter(c=>numericValues(c).length>=1);y.innerHTML=optionList(nums.length?nums:state.columns);}
function aggregateForChart(xCol,yCol,agg,type){if(type==='scatter'){return state.rows.map(r=>({x:Number(r[xCol]),y:Number(r[yCol])})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,1000)}const groups=new Map();for(const r of state.rows){const k=String(r[xCol]??'(Missing)');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r[yCol])}const labels=[...groups.keys()].slice(0,50);const data=labels.map(k=>{const vals=groups.get(k).filter(v=>v!==null&&v!==''&&!Number.isNaN(Number(v))).map(Number);if(agg==='count')return groups.get(k).length;if(!vals.length)return 0;return agg==='avg'?mean(vals):vals.reduce((s,v)=>s+v,0)});return{labels,data}}
function chartConfig(){const type=$('#chartType').value,xCol=$('#chartX').value,yCol=$('#chartY').value,agg=$('#chartAgg').value;if(!xCol||!yCol)throw new Error('เลือกตัวแปรก่อน');if(type==='scatter'){const pts=aggregateForChart(xCol,yCol,agg,type);return{type:'scatter',data:{datasets:[{label:`${yCol} vs ${xCol}`,data:pts}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{title:{display:true,text:xCol}},y:{title:{display:true,text:yCol}}}}}}const g=aggregateForChart(xCol,yCol,agg,type);return{type,data:{labels:g.labels,datasets:[{label:`${agg.toUpperCase()} ${yCol} by ${xCol}`,data:g.data,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false}}}
function buildChart(){try{if(!window.Chart)throw new Error('Chart.js ยังไม่พร้อม');const cfg=chartConfig();state.chart?.destroy();$('#chartPlaceholder').style.display='none';state.chart=new Chart($('#chartCanvas'),cfg);toast('สร้างกราฟแล้ว')}catch(err){toast(err.message)}}
function addChartToDashboard(){try{const cfg=chartConfig();state.dashboardCharts.push(JSON.parse(JSON.stringify(cfg)));if(state.dashboardCharts.length>6)state.dashboardCharts.shift();renderDashboard();toast('เพิ่มกราฟลง Dashboard แล้ว')}catch(err){toast(err.message)}}
function renderDashboard(){renderMetrics();const wrap=$('#dashboardCharts');if(!state.dashboardCharts.length){wrap.innerHTML='<div class="panel empty-state">ยังไม่มีกราฟใน Dashboard — สร้างจาก Chart Builder แล้วกด Add to Dashboard</div>';return}wrap.innerHTML=state.dashboardCharts.map((_,i)=>`<article class="panel dash-chart-card"><canvas id="dashChart${i}"></canvas></article>`).join('');requestAnimationFrame(()=>state.dashboardCharts.forEach((cfg,i)=>new Chart($(`#dashChart${i}`),cfg)))}

init();
