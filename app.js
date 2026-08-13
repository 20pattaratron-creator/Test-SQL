/* Data Insight SQL Dashboard Pro */
const state = {
  SQL: null,
  db: null,
  dbName: 'untitled.db',
  tables: [],
  lastSqlRows: [],
  lastSqlColumns: [],
  queryHistory: [],
  theme: 'light',
  objectTypes: {},
  editing: { table: '', rowid: null, columns: [] },
};

const $ = (id) => document.getElementById(id);

function toast(message, type = 'info') {
  const host = $('toast');
  const node = document.createElement('div');
  node.className = 'toast-message';
  node.textContent = message;
  if (type === 'error') node.style.borderLeftColor = 'var(--danger)';
  if (type === 'success') node.style.borderLeftColor = 'var(--success)';
  host.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

function setStatus(message, cls = '') {
  const el = $('dbStatus');
  el.className = `status ${cls}`.trim();
  el.textContent = message;
}

function formatNumber(value, digits = 2) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: digits }).format(num);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeIdentifier(name) {
  const clean = String(name || '').trim().replace(/[^A-Za-z0-9_ก-๙]/g, '_');
  return clean || 'uploaded_data';
}

function quoteIdent(name) {
  return '"' + String(name).replaceAll('"', '""') + '"';
}

function quoteMysqlIdent(name) {
  return '`' + String(name).replaceAll('`', '``') + '`';
}

function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function rowsToCsv(columns, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
    return s;
  };
  return [columns.map(esc).join(','), ...rows.map(r => columns.map(c => esc(r[c])).join(','))].join('\n');
}

function resultToObjects(result) {
  if (!result || !result.columns) return [];
  return result.values.map(values => Object.fromEntries(result.columns.map((c, i) => [c, values[i]])));
}

function query(sql) {
  const results = state.db.exec(sql);
  if (!results.length) return { columns: [], rows: [] };
  return { columns: results[0].columns, rows: resultToObjects(results[0]) };
}

function run(sql) {
  state.db.run(sql);
}

async function init() {
  try {
    if (!window.initSqlJs) throw new Error('ไม่พบ sql.js จาก CDN');
    state.SQL = await window.initSqlJs({
      locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
    });
    state.db = new state.SQL.Database();
    initTheme();
    setStatus('พร้อมใช้งาน: เริ่มด้วยข้อมูลตัวอย่าง หรืออัปโหลด CSV ได้', 'ok');
    bindEvents();
    refreshAll();
  } catch (error) {
    console.error(error);
    setStatus(`โหลด SQLite Engine ไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  document.querySelectorAll('[data-mobile-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.mobileTab)));
  $('btnSample').addEventListener('click', createSampleData);
  $('btnThemeToggle').addEventListener('click', toggleTheme);
  $('btnGuideSample').addEventListener('click', () => { createSampleData(); switchTab('dashboard'); });
  $('btnGuideDashboard').addEventListener('click', () => switchTab('dashboard'));
  $('btnGuideBusiness').addEventListener('click', () => switchTab('business'));
  $('btnNewDb').addEventListener('click', createNewDb);
  $('btnSaveDb').addEventListener('click', saveDb);
  $('btnExportReport').addEventListener('click', exportReport);
  $('sqliteFile').addEventListener('change', openSqliteFile);
  $('btnImportCsv').addEventListener('click', importCsvFile);
  $('btnRefreshTables').addEventListener('click', refreshAll);
  $('btnRefreshDashboard').addEventListener('click', renderDashboard);
  $('btnRefreshBusiness').addEventListener('click', renderBusinessAnalytics);
  $('btnRunQuality').addEventListener('click', renderQuality);
  $('btnRunSql').addEventListener('click', runSqlEditor);
  $('btnExportSqlCsv').addEventListener('click', exportLastSqlCsv);
  $('btnExportTableCsv').addEventListener('click', exportBrowserCsv);
  $('browserTable').addEventListener('change', renderBrowser);
  $('browserSearch').addEventListener('input', renderBrowser);
  $('browserLimit').addEventListener('change', renderBrowser);
  $('dashTable').addEventListener('change', populateDashboardColumns);
  $('baTable').addEventListener('change', populateBusinessColumns);
  ['metricColumn', 'profitColumn', 'dateColumn', 'categoryColumn', 'customerColumn'].forEach(id => $(id).addEventListener('change', renderDashboard));
  ['baSalesColumn', 'baProfitColumn', 'baDateColumn', 'baCategoryColumn', 'baCustomerColumn', 'baProductColumn', 'baOrderColumn', 'baChurnDays'].forEach(id => $(id).addEventListener('change', renderBusinessAnalytics));
  $('qualityTable').addEventListener('change', renderQuality);
  $('btnGenerateMysql').addEventListener('click', generateMysqlSql);
  $('btnLoadTableau').addEventListener('click', loadTableau);
  $('btnLoadPowerBi').addEventListener('click', loadPowerBi);
  $('btnRefreshRecords').addEventListener('click', renderRecords);
  $('btnBuildReferenceTables').addEventListener('click', buildReferenceTables);
  $('recordSourceTable').addEventListener('change', renderRecords);
  $('recordSearch').addEventListener('input', renderRecords);
  $('recordLimit').addEventListener('change', renderRecords);
  $('btnSaveRowEdit').addEventListener('click', saveRowEdit);
  $('btnExcludeRow').addEventListener('click', () => setEditExclude(true));
  $('btnIncludeRow').addEventListener('click', () => setEditExclude(false));
  document.addEventListener('click', handleRowActionClick);
  document.querySelectorAll('.sql-template').forEach(btn => btn.addEventListener('click', () => { $('sqlInput').value = btn.dataset.sql; runSqlEditor(); }));
  $('sqlInput').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runSqlEditor();
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('[data-mobile-tab]').forEach(t => t.classList.toggle('active', t.dataset.mobileTab === tabName));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === tabName));
  if (window.matchMedia && window.matchMedia('(max-width: 860px)').matches) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  if (tabName === 'browser') renderBrowser();
  if (tabName === 'quality') renderQuality();
  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'business') renderBusinessAnalytics();
  if (tabName === 'records') renderRecords();
}

function initTheme() {
  const saved = localStorage.getItem('dataInsightTheme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(saved || (prefersDark ? 'dark' : 'light'), false);
}

function setTheme(theme, announce = true) {
  state.theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('dataInsightTheme', state.theme);
  const btn = $('btnThemeToggle');
  if (btn) {
    btn.textContent = state.theme === 'dark' ? '☀️ โหมดสว่าง' : '🌙 โหมดมืด';
    btn.setAttribute('aria-pressed', state.theme === 'dark' ? 'true' : 'false');
  }
  if (announce) toast(state.theme === 'dark' ? 'เปลี่ยนเป็นโหมดมืดแล้ว' : 'เปลี่ยนเป็นโหมดสว่างแล้ว', 'success');
  if (state.tables && state.tables.length) {
    try { renderDashboard(); renderBusinessAnalytics(); } catch (_) {}
  }
}

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

function createNewDb() {
  state.db = new state.SQL.Database();
  state.dbName = 'untitled.db';
  state.lastSqlRows = [];
  state.lastSqlColumns = [];
  refreshAll();
  setStatus('สร้างฐานข้อมูลใหม่แล้ว', 'ok');
}

function createSampleData() {
  createNewDb();
  const sql = `
CREATE TABLE sales_data (
  order_id TEXT PRIMARY KEY,
  order_date TEXT,
  customer_id TEXT,
  customer_name TEXT,
  product_id TEXT,
  category TEXT,
  product_name TEXT,
  region TEXT,
  channel TEXT,
  quantity INTEGER,
  unit_price REAL,
  discount REAL,
  cost REAL,
  order_status TEXT,
  gross_sales REAL,
  discount_amount REAL,
  net_sales REAL,
  total_cost REAL,
  profit REAL,
  _exclude_from_analysis INTEGER DEFAULT 0,
  _exclude_reason TEXT,
  _last_updated_at TEXT
);
INSERT INTO sales_data (order_id, order_date, customer_id, customer_name, product_id, category, product_name, region, channel, quantity, unit_price, discount, cost, order_status, gross_sales, discount_amount, net_sales, total_cost, profit) VALUES
('O1001','2026-01-03','C001','Anan','P001','Food','Thai Rice Set','Bangkok','Online',2,1200,0.05,700,'Completed',2400,120,2280,1400,880),
('O1002','2026-01-05','C002','Mali','P002','Drink','Premium Tea','Chiang Mai','Store',1,850,0,500,'Completed',850,0,850,500,350),
('O1003','2026-01-12','C001','Anan','P003','Food','Organic Meal Box','Bangkok','Online',3,1500,0.1,800,'Completed',4500,450,4050,2400,1650),
('O1004','2026-02-01','C003','Suda','P004','Beauty','Skincare Serum','Phuket','Online',4,2200,0.12,1300,'Completed',8800,1056,7744,5200,2544),
('O1005','2026-02-04','C004','Somchai','P005','Food','Healthy Snack','Khon Kaen','Store',1,900,0,550,'Completed',900,0,900,550,350),
('O1006','2026-02-10','C005','Naree','P006','Tech','Laptop Accessory','Bangkok','Online',1,12900,0.08,9800,'Completed',12900,1032,11868,9800,2068),
('O1007','2026-03-02','C002','Mali','P007','Drink','Energy Drink','Chiang Mai','Store',6,250,0,120,'Completed',1500,0,1500,720,780),
('O1008','2026-03-05','C006','Kanda','P008','Beauty','Beauty Set','Bangkok','Online',2,3200,0.15,1900,'Completed',6400,960,5440,3800,1640),
('O1009','2026-03-12','C003','Suda','P009','Tech','Smart Device','Phuket','Partner',1,18500,0.05,14000,'Completed',18500,925,17575,14000,3575),
('O1010','2026-04-01','C007','Prasert','P010','Food','Frozen Food','Udon Thani','Online',8,180,0,90,'Completed',1440,0,1440,720,720),
('O1011','2026-04-15','C008','Wilai','P011','Drink','Coffee Pack','Bangkok','Store',5,320,0.03,140,'Completed',1600,48,1552,700,852),
('O1012','2026-05-03','C001','Anan','P012','Beauty','Luxury Cream','Bangkok','Online',1,4500,0.2,2700,'Completed',4500,900,3600,2700,900),
('O1013','2026-05-09','C009','Pim','P013','Tech','Tablet Bundle','Chiang Mai','Online',1,22000,0.1,17000,'Completed',22000,2200,19800,17000,2800),
('O1014','2026-06-02','C010','Kit','P014','Food','Seafood Pack','Phuket','Partner',12,150,0,70,'Completed',1800,0,1800,840,960),
('O1015','2026-06-10','C011',NULL,NULL,'Beauty','Mystery Product','Bangkok','Online',1,3000,0.1,2100,'Completed',3000,300,2700,2100,600),
('O1016','2026-06-18','C006','Kanda','P015','Tech','Wireless Earbuds','Bangkok','Online',1,15900,0.05,12000,'Completed',15900,795,15105,12000,3105),
('O1017','2026-07-04','C004','Somchai','P016','Food','Rice Bowl','Khon Kaen','Store',4,450,0,240,'Completed',1800,0,1800,960,840),
('O1018','2026-07-10','C012','Dao','P017','Drink','Juice Set','Udon Thani','Partner',9,180,0.02,80,'Completed',1620,32.4,1587.6,720,867.6),
('O1019','2026-07-21','C013','Win','P018','Beauty','Face Mask','Bangkok','Online',2,2600,0.08,1600,'Completed',5200,416,4784,3200,1584),
('O1020','2026-08-01','C002','Mali','P019','Tech','Phone Case','Chiang Mai','Online',1,19900,0.07,15000,'Completed',19900,1393,18507,15000,3507);
CREATE VIEW vw_monthly_sales AS
SELECT substr(order_date, 1, 7) AS order_month, SUM(net_sales) AS net_sales, SUM(profit) AS profit
FROM sales_data
GROUP BY substr(order_date, 1, 7);
`;
  run(sql);
  state.dbName = 'sample_sales.db';
  refreshAll();
  toast('สร้างข้อมูลตัวอย่างสำเร็จ', 'success');
}

function saveDb() {
  if (!state.db) return toast('ยังไม่มีฐานข้อมูล', 'error');
  const data = state.db.export();
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = state.dbName || 'database.db';
  link.click();
  URL.revokeObjectURL(url);
}

async function openSqliteFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const buffer = await file.arrayBuffer();
    state.db = new state.SQL.Database(new Uint8Array(buffer));
    state.dbName = file.name;
    refreshAll();
    setStatus(`เปิดไฟล์ ${file.name} สำเร็จ`, 'ok');
  } catch (error) {
    console.error(error);
    toast(`เปิดไฟล์ไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') { value += '"'; i++; continue; }
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { row.push(value); value = ''; continue; }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      row.push(value); value = '';
      rows.push(row); row = [];
      continue;
    }
    value += char;
  }
  if (value.length || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function inferType(values) {
  const sample = values.filter(v => String(v ?? '').trim() !== '').slice(0, 100);
  if (!sample.length) return 'TEXT';
  const isInt = sample.every(v => /^-?\d+$/.test(String(v).trim()));
  if (isInt) return 'INTEGER';
  const isReal = sample.every(v => /^-?\d+(\.\d+)?$/.test(String(v).trim()));
  if (isReal) return 'REAL';
  return 'TEXT';
}

function uniqueIdentifiers(names) {
  const used = new Map();
  return names.map((name, index) => {
    const base = safeIdentifier(String(name || `column_${index + 1}`).replace(/^\uFEFF/, ''));
    const count = used.get(base) || 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function findColumn(headers, candidates) {
  const lowered = headers.map(h => ({ original: h, key: String(h).toLowerCase() }));
  for (const candidate of candidates) {
    const exact = lowered.find(h => h.key === candidate.toLowerCase());
    if (exact) return exact.original;
  }
  for (const candidate of candidates) {
    const partial = lowered.find(h => h.key.includes(candidate.toLowerCase()));
    if (partial) return partial.original;
  }
  return '';
}

function addColumnIfMissing(table, headers, name, type = 'REAL') {
  if (headers.some(h => h.toLowerCase() === name.toLowerCase())) return findColumn(headers, [name]);
  run(`ALTER TABLE ${quoteIdent(table)} ADD COLUMN ${quoteIdent(name)} ${type};`);
  headers.push(name);
  return name;
}

function enhanceAnalyticsColumns(table, headers) {
  ensureGovernanceColumns(table, headers);
  const quantity = findColumn(headers, ['quantity', 'qty']);
  const unitPrice = findColumn(headers, ['unit_price', 'price', 'unitprice']);
  const discount = findColumn(headers, ['discount', 'discount_rate']);
  const cost = findColumn(headers, ['cost', 'unit_cost']);
  const customer = findColumn(headers, ['customer_id', 'customer']);
  const date = findColumn(headers, ['order_date', 'date', 'created_at']);
  const status = findColumn(headers, ['order_status', 'status']);

  // ถ้ามีโครงสร้างยอดขายแบบพื้นฐาน ให้เพิ่มคอลัมน์คำนวณอัตโนมัติ เพื่อให้ Dashboard ใช้งานได้ทันทีหลัง Import CSV
  if (quantity && unitPrice) {
    const grossSales = addColumnIfMissing(table, headers, 'gross_sales');
    const discountAmount = addColumnIfMissing(table, headers, 'discount_amount');
    const netSales = addColumnIfMissing(table, headers, 'net_sales');
    const totalCost = cost ? addColumnIfMissing(table, headers, 'total_cost') : '';
    const profit = cost ? addColumnIfMissing(table, headers, 'profit') : '';
    const discountExpr = discount ? `COALESCE(${quoteIdent(discount)}, 0)` : '0';

    run(`UPDATE ${quoteIdent(table)} SET
      ${quoteIdent(grossSales)} = COALESCE(${quoteIdent(quantity)}, 0) * COALESCE(${quoteIdent(unitPrice)}, 0),
      ${quoteIdent(discountAmount)} = COALESCE(${quoteIdent(quantity)}, 0) * COALESCE(${quoteIdent(unitPrice)}, 0) * ${discountExpr},
      ${quoteIdent(netSales)} = COALESCE(${quoteIdent(quantity)}, 0) * COALESCE(${quoteIdent(unitPrice)}, 0) * (1 - ${discountExpr})
    ;`);

    if (cost && totalCost && profit) {
      run(`UPDATE ${quoteIdent(table)} SET
        ${quoteIdent(totalCost)} = COALESCE(${quoteIdent(quantity)}, 0) * COALESCE(${quoteIdent(cost)}, 0),
        ${quoteIdent(profit)} = COALESCE(${quoteIdent(netSales)}, 0) - (COALESCE(${quoteIdent(quantity)}, 0) * COALESCE(${quoteIdent(cost)}, 0))
      ;`);
    }
  }

  // ถ้ามีสถานะออเดอร์ ให้สร้าง View เฉพาะ Completed เพื่อใช้กับ Dashboard/BI ได้สะอาดขึ้น
  if (status) {
    const viewName = safeIdentifier(`${table}_completed`);
    run(`DROP VIEW IF EXISTS ${quoteIdent(viewName)};`);
    run(`CREATE VIEW ${quoteIdent(viewName)} AS
      SELECT * FROM ${quoteIdent(table)}
      WHERE lower(COALESCE(${quoteIdent(status)}, '')) IN ('completed', 'complete', 'paid', 'success')
    ;`);
    return viewName;
  }

  // ถ้าไม่มี status แต่มี date/customer อย่างน้อย ให้คง table เดิมไว้เป็นตัวเลือก dashboard
  if (date || customer) return table;
  return '';
}

async function importCsvFile() {
  const file = $('csvFile').files[0];
  if (!file) return toast('กรุณาเลือกไฟล์ CSV ก่อน', 'error');
  const rawName = safeIdentifier($('csvTableName').value || file.name.replace(/\.csv$/i, ''));
  const table = rawName;
  try {
    const text = await file.text();
    let rows = parseCsv(text).filter(r => r.some(v => String(v).trim() !== ''));
    if (rows.length < 2) throw new Error('CSV ต้องมี header และข้อมูลอย่างน้อย 1 แถว');
    const headers = uniqueIdentifiers(rows[0].map((h, i) => h || `column_${i + 1}`));
    const dataRows = rows.slice(1).filter(r => !$('skipEmptyRows').checked || r.some(v => String(v).trim() !== ''));
    const colTypes = headers.map((_, idx) => inferType(dataRows.map(r => r[idx])));
    run(`DROP TABLE IF EXISTS ${quoteIdent(table)};`);
    const ddl = `CREATE TABLE ${quoteIdent(table)} (${headers.map((h, i) => `${quoteIdent(h)} ${colTypes[i]}`).join(', ')});`;
    run(ddl);
    const stmt = state.db.prepare(`INSERT INTO ${quoteIdent(table)} (${headers.map(quoteIdent).join(', ')}) VALUES (${headers.map(() => '?').join(', ')})`);
    state.db.run('BEGIN TRANSACTION');
    for (const r of dataRows) {
      const normalized = headers.map((_, i) => {
        const raw = r[i] ?? null;
        if (raw === '') return null;
        if (colTypes[i] === 'INTEGER') return Number.parseInt(raw, 10);
        if (colTypes[i] === 'REAL') return Number.parseFloat(raw);
        return raw;
      });
      stmt.run(normalized);
    }
    state.db.run('COMMIT');
    stmt.free();
    const preferredTable = enhanceAnalyticsColumns(table, headers);
    refreshAll();
    if (preferredTable && state.tables.includes(preferredTable)) {
      $('dashTable').value = preferredTable;
      $('browserTable').value = preferredTable;
      $('qualityTable').value = preferredTable;
      populateDashboardColumns();
    }
    toast(`Import CSV เป็นตาราง ${table} สำเร็จ (${dataRows.length} rows)`, 'success');
  } catch (error) {
    try { state.db.run('ROLLBACK'); } catch (_) {}
    console.error(error);
    toast(`Import CSV ไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function refreshAll() {
  refreshTables();
  populateTableSelects();
  populateDashboardColumns();
  populateBusinessColumns();
  renderBrowser();
  renderDashboard();
  renderBusinessAnalytics();
  renderQuality();
  renderRecords();
  generateMysqlSql();
}

function refreshTables() {
  if (!state.db) return;
  const result = query("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  state.tables = result.rows.map(r => r.name);
  state.objectTypes = Object.fromEntries(result.rows.map(r => [r.name, r.type]));
  const list = $('tableList');
  if (!state.tables.length) {
    list.className = 'table-list empty';
    list.textContent = 'ยังไม่มีตาราง';
    return;
  }
  list.className = 'table-list';
  list.innerHTML = state.tables.map(t => `<div class="table-item"><span>${escapeHtml(t)} <small>${escapeHtml(getObjectType(t))}</small></span><button data-open-table="${escapeHtml(t)}">ดู</button></div>`).join('');
  list.querySelectorAll('[data-open-table]').forEach(btn => btn.addEventListener('click', () => {
    $('browserTable').value = btn.dataset.openTable;
    switchTab('browser');
    renderBrowser();
  }));
}

function populateTableSelects() {
  const options = state.tables.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  ['dashTable', 'qualityTable', 'browserTable', 'baTable', 'recordSourceTable'].forEach(id => {
    const sel = $(id);
    const old = sel.value;
    sel.innerHTML = options;
    if (state.tables.includes(old)) sel.value = old;
  });
}

function getColumns(table) {
  if (!table) return [];
  return query(`PRAGMA table_info(${quoteIdent(table)});`).rows.map(r => ({ name: r.name, type: r.type }));
}

function getObjectType(name) {
  return (state.objectTypes && state.objectTypes[name]) || query(`SELECT type FROM sqlite_master WHERE name = ${sqlLiteral(name)} LIMIT 1;`).rows[0]?.type || 'table';
}

function sqlLiteral(value) {
  return "'" + String(value ?? '').replaceAll("'", "''") + "'";
}

function isEditableTable(table) {
  return Boolean(table) && getObjectType(table) === 'table';
}

function hasColumn(table, columnName) {
  return getColumns(table).some(c => c.name.toLowerCase() === String(columnName).toLowerCase());
}

function ensureGovernanceColumns(table, headers = null) {
  if (!table || getObjectType(table) === 'view') return;
  const current = headers || getColumns(table).map(c => c.name);
  const add = (name, type) => {
    if (!current.some(c => String(c).toLowerCase() === name.toLowerCase())) {
      run(`ALTER TABLE ${quoteIdent(table)} ADD COLUMN ${quoteIdent(name)} ${type};`);
      current.push(name);
    }
  };
  add('_exclude_from_analysis', 'INTEGER DEFAULT 0');
  add('_exclude_reason', 'TEXT');
  add('_last_updated_at', 'TEXT');
}

function analysisWhereSql(table) {
  try {
    return hasColumn(table, '_exclude_from_analysis') ? 'WHERE COALESCE("_exclude_from_analysis", 0) = 0' : '';
  } catch (_) {
    return '';
  }
}

function getAnalysisRows(table, limit = 100000) {
  if (!table) return [];
  const where = analysisWhereSql(table);
  return query(`SELECT * FROM ${quoteIdent(table)} ${where} LIMIT ${Number(limit) || 100000};`).rows;
}

function populateDashboardColumns() {
  const table = $('dashTable').value || state.tables[0];
  if (table && $('dashTable').value !== table) $('dashTable').value = table;
  const cols = getColumns(table);
  const options = '<option value="">-- ไม่ใช้ --</option>' + cols.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${escapeHtml(c.type || 'TEXT')})</option>`).join('');
  ['metricColumn', 'profitColumn', 'dateColumn', 'categoryColumn', 'customerColumn'].forEach(id => $(id).innerHTML = options);
  autoSelect('metricColumn', cols, ['net_sales','sales','revenue','amount','total','price']);
  autoSelect('profitColumn', cols, ['profit','margin']);
  autoSelect('dateColumn', cols, ['order_date','date','created','month']);
  autoSelect('categoryColumn', cols, ['category','region','channel','product']);
  autoSelect('customerColumn', cols, ['customer_id','customer','client']);
  renderDashboard();
}

function autoSelect(selectId, cols, keywords) {
  const found = cols.find(c => keywords.some(k => c.name.toLowerCase().includes(k)));
  if (found) $(selectId).value = found.name;
}


function populateBusinessColumns() {
  const table = $('baTable').value || $('dashTable').value || state.tables[0];
  if (table && $('baTable').value !== table) $('baTable').value = table;
  const cols = getColumns(table);
  const options = '<option value="">-- ไม่ใช้ --</option>' + cols.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${escapeHtml(c.type || 'TEXT')})</option>`).join('');
  ['baSalesColumn','baProfitColumn','baDateColumn','baCategoryColumn','baCustomerColumn','baProductColumn','baOrderColumn'].forEach(id => $(id).innerHTML = options);
  autoSelect('baSalesColumn', cols, ['net_sales','sales','revenue','amount','total','price']);
  autoSelect('baProfitColumn', cols, ['profit','gross_profit','margin']);
  autoSelect('baDateColumn', cols, ['order_date','date','created','month']);
  autoSelect('baCategoryColumn', cols, ['category','region','channel','segment']);
  autoSelect('baCustomerColumn', cols, ['customer_id','customer','client']);
  autoSelect('baProductColumn', cols, ['product_name','product','sku','item','category']);
  autoSelect('baOrderColumn', cols, ['order_id','transaction_id','invoice','order']);
  renderBusinessAnalytics();
}

function parseDateValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(String(value).slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(value) {
  const s = String(value || '');
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = parseDateValue(value);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function groupSum(rows, groupCol, valueCol, limit = 15) {
  const map = new Map();
  rows.forEach(r => {
    const key = String(r[groupCol] ?? 'ไม่ระบุ');
    map.set(key, (map.get(key) || 0) + Number(r[valueCol] || 0));
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a,b) => b.value - a.value)
    .slice(0, limit);
}

function quantileScore(values, value, highIsGood = true) {
  const sorted = [...values].filter(v => Number.isFinite(v)).sort((a,b) => a-b);
  if (!sorted.length || !Number.isFinite(value)) return 1;
  const rank = sorted.findIndex(v => value <= v);
  const pos = rank < 0 ? sorted.length : rank + 1;
  const bucket = Math.ceil((pos / sorted.length) * 5);
  return highIsGood ? bucket : 6 - bucket;
}

function buildBusinessSql({ table, sales, profit, date, category, customer, order, product }) {
  if (!table || !sales) return '-- เลือกตารางและคอลัมน์ยอดขายก่อน';
  const parts = [];
  parts.push(`-- Executive KPIs\nSELECT\n  COUNT(*) AS total_rows,\n  SUM(${quoteIdent(sales)}) AS total_sales${profit ? `,\n  SUM(${quoteIdent(profit)}) AS total_profit,\n  SUM(${quoteIdent(profit)}) / NULLIF(SUM(${quoteIdent(sales)}), 0) AS profit_margin` : ''}${order ? `,\n  COUNT(DISTINCT ${quoteIdent(order)}) AS total_orders` : ''}${customer ? `,\n  COUNT(DISTINCT ${quoteIdent(customer)}) AS total_customers` : ''}\nFROM ${quoteIdent(table)};`);
  if (date) parts.push(`-- Monthly trend and MoM growth\nWITH monthly AS (\n  SELECT substr(${quoteIdent(date)}, 1, 7) AS month, SUM(${quoteIdent(sales)}) AS sales${profit ? `, SUM(${quoteIdent(profit)}) AS profit` : ''}\n  FROM ${quoteIdent(table)}\n  GROUP BY substr(${quoteIdent(date)}, 1, 7)\n)\nSELECT month, sales, LAG(sales) OVER (ORDER BY month) AS previous_sales,\n  (sales - LAG(sales) OVER (ORDER BY month)) / NULLIF(LAG(sales) OVER (ORDER BY month), 0) AS mom_growth\nFROM monthly\nORDER BY month;`);
  if (category) parts.push(`-- Sales and margin by segment\nSELECT ${quoteIdent(category)} AS segment, SUM(${quoteIdent(sales)}) AS sales${profit ? `, SUM(${quoteIdent(profit)}) AS profit, SUM(${quoteIdent(profit)}) / NULLIF(SUM(${quoteIdent(sales)}), 0) AS profit_margin` : ''}\nFROM ${quoteIdent(table)}\nGROUP BY ${quoteIdent(category)}\nORDER BY sales DESC;`);
  if (customer) parts.push(`-- Customer value and churn signal\nSELECT ${quoteIdent(customer)} AS customer_id, ${order ? `COUNT(DISTINCT ${quoteIdent(order)})` : 'COUNT(*)'} AS frequency, SUM(${quoteIdent(sales)}) AS monetary${date ? `, MAX(${quoteIdent(date)}) AS last_order_date` : ''}\nFROM ${quoteIdent(table)}\nGROUP BY ${quoteIdent(customer)}\nORDER BY monetary DESC;`);
  if (product) parts.push(`-- Product strategy matrix\nSELECT ${quoteIdent(product)} AS product, SUM(${quoteIdent(sales)}) AS sales${profit ? `, SUM(${quoteIdent(profit)}) AS profit, SUM(${quoteIdent(profit)}) / NULLIF(SUM(${quoteIdent(sales)}), 0) AS profit_margin` : ''}\nFROM ${quoteIdent(table)}\nGROUP BY ${quoteIdent(product)}\nORDER BY sales DESC;`);
  return parts.join('\n\n');
}

function renderBusinessAnalytics() {
  if (!$('baExecutiveCards')) return;
  const table = $('baTable').value || state.tables[0];
  const sales = $('baSalesColumn').value;
  if (!table || !sales) {
    $('baExecutiveCards').innerHTML = '<div class="metric-card"><div class="label">สถานะ</div><div class="value">ไม่มีข้อมูล</div><div class="hint">สร้าง sample หรือ Import CSV ก่อน</div></div>';
    $('baTrendChart').textContent = '';
    $('baSegmentChart').textContent = '';
    $('baProductMatrix').innerHTML = '';
    $('baRfmTable').innerHTML = '';
    $('baRecommendationBox').textContent = 'ยังไม่มีข้อมูลสำหรับ Business Analytics';
    $('baBusinessSql').textContent = '';
    return;
  }
  const profit = $('baProfitColumn').value;
  const date = $('baDateColumn').value;
  const category = $('baCategoryColumn').value;
  const customer = $('baCustomerColumn').value;
  const product = $('baProductColumn').value;
  const order = $('baOrderColumn').value;
  const churnDays = Number($('baChurnDays').value || 90);
  const rows = getAnalysisRows(table, 100000);
  const totalSales = rows.reduce((s,r) => s + Number(r[sales] || 0), 0);
  const totalProfit = profit ? rows.reduce((s,r) => s + Number(r[profit] || 0), 0) : null;
  const totalRows = rows.length;
  const orders = order ? new Set(rows.map(r => r[order]).filter(Boolean)).size : totalRows;
  const customers = customer ? new Set(rows.map(r => r[customer]).filter(Boolean)).size : null;
  const aov = orders ? totalSales / orders : 0;
  const margin = totalProfit !== null && totalSales ? totalProfit / totalSales : null;

  const monthly = new Map();
  if (date) {
    rows.forEach(r => {
      const m = monthKey(r[date]);
      if (!m) return;
      const old = monthly.get(m) || { month: m, sales: 0, profit: 0 };
      old.sales += Number(r[sales] || 0);
      old.profit += profit ? Number(r[profit] || 0) : 0;
      monthly.set(m, old);
    });
  }
  const monthlyRows = [...monthly.values()].sort((a,b) => a.month.localeCompare(b.month));
  const latest = monthlyRows.at(-1);
  const previous = monthlyRows.at(-2);
  const momGrowth = latest && previous && previous.sales ? (latest.sales - previous.sales) / previous.sales : null;

  let segmentRows = [];
  if (category) segmentRows = groupSum(rows, category, sales, 15);

  let customerRows = [];
  let repeatRate = null;
  let highRiskCount = null;
  if (customer) {
    const latestDate = date ? rows.map(r => parseDateValue(r[date])).filter(Boolean).sort((a,b) => b-a)[0] : null;
    const map = new Map();
    rows.forEach(r => {
      const key = String(r[customer] ?? 'ไม่ระบุ');
      const old = map.get(key) || { customer: key, frequency: 0, monetary: 0, lastDate: null, orders: new Set() };
      old.monetary += Number(r[sales] || 0);
      if (order && r[order]) old.orders.add(r[order]); else old.frequency += 1;
      const d = date ? parseDateValue(r[date]) : null;
      if (d && (!old.lastDate || d > old.lastDate)) old.lastDate = d;
      map.set(key, old);
    });
    customerRows = [...map.values()].map(c => {
      const frequency = order ? c.orders.size : c.frequency;
      const recency = date ? daysBetween(c.lastDate, latestDate) : null;
      return { customer: c.customer, frequency, monetary: c.monetary, recency_days: recency };
    });
    const recencies = customerRows.map(c => c.recency_days).filter(v => v !== null);
    const freqs = customerRows.map(c => c.frequency);
    const monies = customerRows.map(c => c.monetary);
    customerRows = customerRows.map(c => {
      const rScore = c.recency_days === null ? 1 : quantileScore(recencies, c.recency_days, false);
      const fScore = quantileScore(freqs, c.frequency, true);
      const mScore = quantileScore(monies, c.monetary, true);
      let segment = 'Regular';
      if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = 'Best Customer';
      else if (rScore >= 4 && fScore >= 3) segment = 'Loyal';
      else if (c.recency_days !== null && c.recency_days > churnDays && c.monetary >= (totalSales / Math.max(customers || 1, 1))) segment = 'At Risk';
      else if (c.recency_days !== null && c.recency_days > churnDays) segment = 'Churn Risk';
      else if (fScore <= 2 && rScore >= 4) segment = 'New / Low Frequency';
      return { customer: c.customer, recency_days: c.recency_days ?? '-', frequency: c.frequency, monetary: Number(c.monetary.toFixed(2)), rfm: `${rScore}${fScore}${mScore}`, segment };
    }).sort((a,b) => b.monetary - a.monetary);
    repeatRate = customers ? customerRows.filter(c => c.frequency >= 2).length / customers : null;
    highRiskCount = customerRows.filter(c => String(c.segment).includes('Risk') || c.segment === 'At Risk').length;
  }

  let productRows = [];
  if (product) {
    const map = new Map();
    rows.forEach(r => {
      const key = String(r[product] ?? 'ไม่ระบุ');
      const old = map.get(key) || { product: key, sales: 0, profit: 0 };
      old.sales += Number(r[sales] || 0);
      old.profit += profit ? Number(r[profit] || 0) : 0;
      map.set(key, old);
    });
    productRows = [...map.values()].map(p => ({ ...p, margin: p.sales ? p.profit / p.sales : null }));
    const avgSales = productRows.reduce((s,p) => s + p.sales, 0) / Math.max(productRows.length, 1);
    const avgMargin = productRows.filter(p => p.margin !== null).reduce((s,p) => s + p.margin, 0) / Math.max(productRows.filter(p => p.margin !== null).length, 1);
    productRows = productRows.map(p => {
      let strategy = 'Low Priority';
      if (p.sales >= avgSales && (p.margin ?? 0) >= avgMargin) strategy = 'Hero Product';
      else if (p.sales >= avgSales && (p.margin ?? 0) < avgMargin) strategy = 'High Sales / Low Margin';
      else if (p.sales < avgSales && (p.margin ?? 0) >= avgMargin) strategy = 'Niche High Margin';
      return { product: p.product, sales: Number(p.sales.toFixed(2)), profit: Number(p.profit.toFixed(2)), margin: p.margin === null ? '-' : `${formatNumber(p.margin * 100)}%`, strategy };
    }).sort((a,b) => b.sales - a.sales);
  }

  $('baExecutiveCards').innerHTML = [
    ['Total Sales', formatNumber(totalSales), sales],
    ['Total Profit', totalProfit === null ? '-' : formatNumber(totalProfit), profit || 'ไม่ได้เลือกกำไร'],
    ['Profit Margin', margin === null ? '-' : `${formatNumber(margin * 100)}%`, 'profit / sales'],
    ['AOV', formatNumber(aov), 'sales / orders'],
    ['MoM Growth', momGrowth === null ? '-' : `${formatNumber(momGrowth * 100)}%`, latest ? `เดือนล่าสุด ${latest.month}` : 'ต้องมีวันที่'],
    ['Customers', customers === null ? '-' : formatNumber(customers, 0), customer || 'ไม่ได้เลือกลูกค้า'],
    ['Repeat Rate', repeatRate === null ? '-' : `${formatNumber(repeatRate * 100)}%`, 'ลูกค้าซื้อซ้ำ / ลูกค้าทั้งหมด'],
    ['Churn Risk', highRiskCount === null ? '-' : formatNumber(highRiskCount, 0), `เกิน ${churnDays} วัน`],
  ].map(([l,v,h]) => `<div class="metric-card"><div class="label">${escapeHtml(l)}</div><div class="value">${escapeHtml(v)}</div><div class="hint">${escapeHtml(h)}</div></div>`).join('');

  if (monthlyRows.length) {
    plot('baTrendChart', [
      { x: monthlyRows.map(r => r.month), y: monthlyRows.map(r => r.sales), type: 'scatter', mode: 'lines+markers', name: 'Sales' },
      ...(profit ? [{ x: monthlyRows.map(r => r.month), y: monthlyRows.map(r => r.profit), type: 'bar', name: 'Profit', opacity: .55 }] : [])
    ], { xaxis: { title: 'Month' }, yaxis: { title: 'Value' }, barmode: 'overlay' });
  } else $('baTrendChart').textContent = 'เลือกคอลัมน์วันที่เพื่อดู Trend';

  if (segmentRows.length) plot('baSegmentChart', [{ labels: segmentRows.map(r => r.label), values: segmentRows.map(r => r.value), type: 'pie', hole: .45 }], { showlegend: true });
  else $('baSegmentChart').textContent = 'เลือกคอลัมน์กลุ่มเพื่อดู Revenue Share';

  $('baProductMatrix').innerHTML = productRows.length ? renderTable(['product','sales','profit','margin','strategy'], productRows.slice(0, 20)) : '<p class="status warn">เลือกคอลัมน์สินค้าเพื่อสร้าง Product Matrix</p>';
  $('baRfmTable').innerHTML = customerRows.length ? renderTable(['customer','recency_days','frequency','monetary','rfm','segment'], customerRows.slice(0, 20)) : '<p class="status warn">เลือกคอลัมน์ลูกค้าเพื่อสร้าง RFM/Churn</p>';

  const recommendations = [];
  recommendations.push({ title: 'Executive Summary', text: `ยอดขายรวม ${formatNumber(totalSales)}${margin !== null ? ` และ Profit Margin ${formatNumber(margin * 100)}%` : ''}${momGrowth !== null ? ` โดยเดือนล่าสุดเปลี่ยนแปลง ${formatNumber(momGrowth * 100)}% จากเดือนก่อน` : ''}` });
  if (margin !== null && margin < 0.15) recommendations.push({ title: 'สิ่งที่ควรระวัง', text: 'Profit Margin ต่ำกว่า 15% ควรตรวจสอบต้นทุน ส่วนลด และสินค้าที่ทำให้กำไรลดลง' });
  else if (margin !== null) recommendations.push({ title: 'สิ่งที่ทำได้ดี', text: 'Profit Margin อยู่ในระดับที่ควรนำไปเปรียบเทียบกับค่าเฉลี่ยอุตสาหกรรม และติดตามต่อเนื่องรายเดือน' });
  if (segmentRows[0]) recommendations.push({ title: 'โอกาสทางการขาย', text: `${segmentRows[0].label} เป็นกลุ่มที่สร้างยอดขายสูงสุด ควรดูต่อว่ากำไรดีหรือไม่ก่อนเพิ่มงบโปรโมต` });
  const lowMargin = productRows.find(p => p.strategy === 'High Sales / Low Margin');
  if (lowMargin) recommendations.push({ title: 'ปรับกลยุทธ์สินค้า', text: `${lowMargin.product} มียอดขายสูงแต่กำไรต่ำ ควรลดต้นทุน ปรับราคา หรือลดส่วนลด` });
  const niche = productRows.find(p => p.strategy === 'Niche High Margin');
  if (niche) recommendations.push({ title: 'เพิ่มโอกาสกำไร', text: `${niche.product} เป็นกลุ่มกำไรดีแต่ยอดขายยังไม่สูง ควรทดลองโปรโมตหรือทำ Bundle` });
  if (highRiskCount !== null && highRiskCount > 0) recommendations.push({ title: 'Customer Retention', text: `พบลูกค้าเสี่ยงหาย ${formatNumber(highRiskCount,0)} ราย ควรทำแคมเปญ Win-back หรือ Retargeting` });
  recommendations.push({ title: 'Action Plan', text: 'แนะนำให้ตรวจ Dashboard รายสัปดาห์, ติดตาม MoM Growth, แยกกำไรตามหมวด/สินค้า, และทดสอบแคมเปญกับลูกค้ากลุ่มเสี่ยงก่อนขยายผล' });
  $('baRecommendationBox').innerHTML = recommendations.map(r => `<div class="insight-item"><strong>${escapeHtml(r.title)}:</strong> ${escapeHtml(r.text)}</div>`).join('');
  $('baBusinessSql').textContent = buildBusinessSql({ table, sales, profit, date, category, customer, order, product });
}

function renderDashboard() {
  const table = $('dashTable').value;
  const metric = $('metricColumn').value;
  if (!table || !metric) {
    $('kpiCards').innerHTML = '<div class="metric-card"><div class="label">สถานะ</div><div class="value">ไม่มีข้อมูล</div><div class="hint">สร้าง sample หรือ Import CSV ก่อน</div></div>';
    clearCharts();
    return;
  }
  const profit = $('profitColumn').value;
  const date = $('dateColumn').value;
  const category = $('categoryColumn').value;
  const customer = $('customerColumn').value;
  const baseRows = getAnalysisRows(table, 100000);
  const totalMetric = baseRows.reduce((sum, r) => sum + Number(r[metric] || 0), 0);
  const totalProfit = profit ? baseRows.reduce((sum, r) => sum + Number(r[profit] || 0), 0) : null;
  const rowCount = baseRows.length;
  const uniqueCustomer = customer ? new Set(baseRows.map(r => r[customer]).filter(Boolean)).size : null;
  const avgMetric = rowCount ? totalMetric / rowCount : 0;
  const margin = totalProfit !== null && totalMetric ? (totalProfit / totalMetric) : null;
  const cards = [
    ['Total Metric', formatNumber(totalMetric), metric],
    ['Rows', formatNumber(rowCount, 0), table],
    ['Average', formatNumber(avgMetric), `เฉลี่ยต่อ row ของ ${metric}`],
    [profit ? 'Total Profit' : 'Profit', profit ? formatNumber(totalProfit) : '-', profit || 'ไม่ได้เลือกคอลัมน์'],
    ['Profit Margin', margin === null ? '-' : `${formatNumber(margin * 100)}%`, profit ? 'profit / metric' : 'ต้องเลือก profit'],
    ['Customers', uniqueCustomer === null ? '-' : formatNumber(uniqueCustomer, 0), customer || 'ไม่ได้เลือก customer'],
  ];
  $('kpiCards').innerHTML = cards.map(([label, value, hint]) => `<div class="metric-card"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div><div class="hint">${escapeHtml(hint)}</div></div>`).join('');
  renderTrendChart(table, metric, date);
  renderCategoryChart(table, metric, category);
  renderCustomerChart(table, metric, customer);
  renderInsights({ table, metric, profit, date, category, customer, totalMetric, totalProfit, rowCount, uniqueCustomer, margin });
  $('dashboardSql').textContent = buildDashboardSql({ table, metric, profit, date, category, customer });
}

function clearCharts() {
  ['trendChart','categoryChart','customerChart'].forEach(id => $(id).innerHTML = '');
  $('autoInsights').textContent = 'ยังไม่มีข้อมูล';
  $('dashboardSql').textContent = '';
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function plot(divId, data, layout) {
  const el = $(divId);
  if (!window.Plotly) { el.textContent = 'Plotly ไม่พร้อมใช้งาน'; return; }
  const textColor = cssVar('--text') || '#0f172a';
  const borderColor = cssVar('--border') || '#bfdbfe';
  const accentColor = cssVar('--accent') || '#2563eb';
  const themedData = data.map((trace) => ({ marker: { color: accentColor }, ...trace, line: { color: accentColor, ...(trace.line || {}) } }));
  window.Plotly.newPlot(el, themedData, {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: textColor },
    margin: { t: 20, r: 18, b: 48, l: 68 },
    ...(layout || {}),
    xaxis: { gridcolor: borderColor, zerolinecolor: borderColor, ...(layout && layout.xaxis ? layout.xaxis : {}) },
    yaxis: { gridcolor: borderColor, zerolinecolor: borderColor, ...(layout && layout.yaxis ? layout.yaxis : {}) },
  }, { responsive: true, displaylogo: false });
}

function renderTrendChart(table, metric, date) {
  if (!date) { $('trendChart').textContent = 'ไม่ได้เลือกคอลัมน์วันที่'; return; }
  const sql = `SELECT substr(${quoteIdent(date)}, 1, 7) AS period, SUM(COALESCE(${quoteIdent(metric)}, 0)) AS value FROM ${quoteIdent(table)} ${analysisWhereSql(table)} GROUP BY substr(${quoteIdent(date)}, 1, 7) ORDER BY period;`;
  const rows = query(sql).rows;
  plot('trendChart', [{ x: rows.map(r => r.period), y: rows.map(r => r.value), type: 'scatter', mode: 'lines+markers', line: { width: 3 } }], { xaxis: { title: date }, yaxis: { title: metric } });
}

function renderCategoryChart(table, metric, category) {
  if (!category) { $('categoryChart').textContent = 'ไม่ได้เลือกคอลัมน์กลุ่ม'; return; }
  const sql = `SELECT ${quoteIdent(category)} AS label, SUM(COALESCE(${quoteIdent(metric)}, 0)) AS value FROM ${quoteIdent(table)} ${analysisWhereSql(table)} GROUP BY ${quoteIdent(category)} ORDER BY value DESC LIMIT 15;`;
  const rows = query(sql).rows;
  plot('categoryChart', [{ x: rows.map(r => r.label), y: rows.map(r => r.value), type: 'bar' }], { xaxis: { title: category }, yaxis: { title: metric } });
}

function renderCustomerChart(table, metric, customer) {
  if (!customer) { $('customerChart').textContent = 'ไม่ได้เลือกคอลัมน์ลูกค้า'; return; }
  const sql = `SELECT ${quoteIdent(customer)} AS label, SUM(COALESCE(${quoteIdent(metric)}, 0)) AS value FROM ${quoteIdent(table)} ${analysisWhereSql(table)} GROUP BY ${quoteIdent(customer)} ORDER BY value DESC LIMIT 10;`;
  const rows = query(sql).rows;
  plot('customerChart', [{ x: rows.map(r => r.value), y: rows.map(r => String(r.label)), type: 'bar', orientation: 'h' }], { xaxis: { title: metric }, yaxis: { automargin: true } });
}

function renderInsights(info) {
  const items = [];
  items.push(`ตาราง ${info.table} มีข้อมูล ${formatNumber(info.rowCount, 0)} แถว และ ${info.metric} รวม ${formatNumber(info.totalMetric)}`);
  if (info.profit && info.margin !== null) items.push(`กำไรรวม ${formatNumber(info.totalProfit)} และ Profit Margin ประมาณ ${formatNumber(info.margin * 100)}%`);
  if (info.customer && info.uniqueCustomer !== null) items.push(`พบลูกค้าไม่ซ้ำ ${formatNumber(info.uniqueCustomer, 0)} ราย สามารถใช้ทำ Customer Segmentation ต่อได้`);
  if (info.date) items.push(`มีคอลัมน์วันที่ ${info.date} จึงสามารถวิเคราะห์ Trend / Seasonality / MoM Growth ต่อได้`);
  if (info.category) items.push(`ใช้ ${info.category} เพื่อดูว่าส่วนใดสร้างยอดรวมสูงสุด และควรตรวจ Profit Margin แยกตามกลุ่ม`);
  $('autoInsights').innerHTML = items.map(x => `<div class="insight-item">${escapeHtml(x)}</div>`).join('');
}

function buildDashboardSql({ table, metric, profit, date, category, customer }) {
  const parts = [];
  parts.push(`-- KPI หลัก\nSELECT COUNT(*) AS total_rows, SUM(${quoteIdent(metric)}) AS total_metric${profit ? `, SUM(${quoteIdent(profit)}) AS total_profit` : ''}${customer ? `, COUNT(DISTINCT ${quoteIdent(customer)}) AS unique_customers` : ''}\nFROM ${quoteIdent(table)};`);
  if (date) parts.push(`-- Trend รายเดือน\nSELECT substr(${quoteIdent(date)}, 1, 7) AS period, SUM(${quoteIdent(metric)}) AS total_metric\nFROM ${quoteIdent(table)}\nGROUP BY substr(${quoteIdent(date)}, 1, 7)\nORDER BY period;`);
  if (category) parts.push(`-- ยอดรวมตามกลุ่ม\nSELECT ${quoteIdent(category)} AS group_name, SUM(${quoteIdent(metric)}) AS total_metric\nFROM ${quoteIdent(table)}\nGROUP BY ${quoteIdent(category)}\nORDER BY total_metric DESC\nLIMIT 15;`);
  return parts.join('\n\n');
}

function renderQuality() {
  const table = $('qualityTable').value || state.tables[0];
  if (!table) {
    $('qualityCards').innerHTML = '<div class="metric-card"><div class="label">สถานะ</div><div class="value">ไม่มีข้อมูล</div></div>';
    $('missingTable').innerHTML = '';
    $('qualityPreview').innerHTML = '';
    return;
  }
  const limit = Math.max(10, Math.min(Number($('qualityLimit').value || 2000), 100000));
  const cols = getColumns(table).map(c => c.name);
  const rows = query(`SELECT * FROM ${quoteIdent(table)} LIMIT ${limit};`).rows;
  const totalRows = query(`SELECT COUNT(*) AS n FROM ${quoteIdent(table)};`).rows[0]?.n || rows.length;
  const duplicateCount = countDuplicates(rows);
  const missing = cols.map(c => {
    const n = rows.filter(r => r[c] === null || r[c] === undefined || String(r[c]).trim() === '').length;
    return { column: c, missing: n, percent: rows.length ? (n / rows.length * 100) : 0 };
  });
  const totalMissing = missing.reduce((s, r) => s + r.missing, 0);
  $('qualityCards').innerHTML = [
    ['Total Rows', formatNumber(totalRows,0), 'จำนวนแถวทั้งหมด'],
    ['Checked Rows', formatNumber(rows.length,0), `ตรวจ ${limit} แถวแรก`],
    ['Columns', formatNumber(cols.length,0), 'จำนวนคอลัมน์'],
    ['Missing Cells', formatNumber(totalMissing,0), 'ค่าว่างในชุดที่ตรวจ'],
    ['Duplicate Rows', formatNumber(duplicateCount,0), 'นับจากชุดที่ตรวจ'],
  ].map(([l,v,h]) => `<div class="metric-card"><div class="label">${l}</div><div class="value">${v}</div><div class="hint">${h}</div></div>`).join('');
  $('missingTable').innerHTML = renderTable(['column','missing','percent'], missing.map(r => ({ column: r.column, missing: r.missing, percent: `${r.percent.toFixed(2)}%` })));
  $('qualityPreview').innerHTML = renderTable(cols, rows.slice(0, 50));
}

function countDuplicates(rows) {
  const seen = new Set();
  let dup = 0;
  for (const row of rows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) dup++;
    seen.add(key);
  }
  return dup;
}

function runSqlEditor() {
  const sql = $('sqlInput').value.trim();
  if (!sql) return;
  const started = performance.now();
  try {
    const result = query(sql);
    state.lastSqlColumns = result.columns;
    state.lastSqlRows = result.rows;
    $('sqlResult').innerHTML = renderTable(result.columns, result.rows);
    const ms = Math.round(performance.now() - started);
    $('sqlMessage').className = 'status ok';
    $('sqlMessage').textContent = `สำเร็จ: ${result.rows.length} rows, ${ms} ms`;
    addHistory(sql, result.rows.length, ms);
    refreshAll();
  } catch (error) {
    try {
      run(sql);
      $('sqlResult').innerHTML = '<p class="status ok">รันคำสั่งสำเร็จ ไม่มี result set</p>';
      $('sqlMessage').className = 'status ok';
      $('sqlMessage').textContent = 'รันคำสั่งสำเร็จ';
      addHistory(sql, 0, Math.round(performance.now() - started));
      refreshAll();
    } catch (second) {
      console.error(second);
      $('sqlMessage').className = 'status error';
      $('sqlMessage').textContent = `SQL Error: ${second.message}`;
    }
  }
}

function addHistory(sql, rows, ms) {
  state.queryHistory.unshift({ sql, rows, ms, at: new Date().toLocaleString('th-TH') });
  state.queryHistory = state.queryHistory.slice(0, 30);
  const host = $('queryHistory');
  host.className = 'history-list';
  host.innerHTML = state.queryHistory.map((h, i) => `<button class="history-item" data-history="${i}">${escapeHtml(h.at)} • ${h.rows} rows • ${h.ms} ms • ${escapeHtml(h.sql)}</button>`).join('');
  host.querySelectorAll('[data-history]').forEach(btn => btn.addEventListener('click', () => { $('sqlInput').value = state.queryHistory[Number(btn.dataset.history)].sql; }));
}

function renderBrowser() {
  const table = $('browserTable').value || state.tables[0];
  if (!table) { $('browserResult').innerHTML = 'ยังไม่มีตาราง'; return; }
  const limit = Number($('browserLimit').value || 100);
  const search = $('browserSearch').value.trim().toLowerCase();
  const editable = isEditableTable(table);
  if (editable) ensureGovernanceColumns(table);
  const cols = getColumns(table).map(c => c.name);
  let rows = query(`SELECT ${editable ? 'rowid AS _rowid, ' : ''}* FROM ${quoteIdent(table)} LIMIT 10000;`).rows;
  if (search) rows = rows.filter(r => ['_rowid', ...cols].some(c => String(r[c] ?? '').toLowerCase().includes(search)));
  $('browserResult').innerHTML = editable ? renderEditableTable(table, cols, rows.slice(0, limit)) : renderTable(cols, rows.slice(0, limit));
}


function handleRowActionClick(event) {
  const btn = event.target.closest('[data-edit-row]');
  if (!btn) return;
  loadRowForEdit(btn.dataset.table, Number(btn.dataset.rowid));
  switchTab('records');
}

function getSmartColumns(table) {
  const cols = getColumns(table).map(c => c.name);
  return {
    cols,
    customerId: findColumn(cols, ['customer_id', 'customerid', 'customer', 'client_id']),
    customerName: findColumn(cols, ['customer_name', 'customername', 'name', 'fullname']),
    province: findColumn(cols, ['province', 'จังหวัด']),
    region: findColumn(cols, ['region', 'area', 'พื้นที่']),
    productId: findColumn(cols, ['product_id', 'productid', 'sku', 'item_id']),
    productName: findColumn(cols, ['product_name', 'productname', 'product', 'item_name', 'item']),
    category: findColumn(cols, ['category', 'หมวด', 'group']),
    date: findColumn(cols, ['order_date', 'date', 'created_at', 'วันที่']),
    order: findColumn(cols, ['order_id', 'transaction_id', 'invoice']),
    sales: findColumn(cols, ['net_sales', 'sales', 'revenue', 'amount', 'total']),
    profit: findColumn(cols, ['profit', 'gross_profit'])
  };
}

function renderRecords() {
  if (!$('recordSourceTable')) return;
  const table = $('recordSourceTable').value || state.tables[0];
  if (table && $('recordSourceTable').value !== table) $('recordSourceTable').value = table;
  if (!table) {
    $('recordCards').innerHTML = '<div class="metric-card"><div class="label">สถานะ</div><div class="value">ไม่มีข้อมูล</div><div class="hint">สร้างข้อมูลตัวอย่างหรือ Import CSV ก่อน</div></div>';
    $('customerReferenceTable').innerHTML = '';
    $('productReferenceTable').innerHTML = '';
    $('recordIssueTable').innerHTML = '';
    return;
  }
  const editable = isEditableTable(table);
  if (editable) ensureGovernanceColumns(table);
  const smart = getSmartColumns(table);
  const rows = query(`SELECT ${editable ? 'rowid AS _rowid, ' : ''}* FROM ${quoteIdent(table)} LIMIT 100000;`).rows;
  const includedRows = rows.filter(r => Number(r._exclude_from_analysis || 0) !== 1);
  const excludedRows = rows.length - includedRows.length;
  const customerRows = buildCustomerReferenceRows(includedRows, smart);
  const productRows = buildProductReferenceRows(includedRows, smart);
  const issues = buildIssueRows(rows, smart, Number($('recordLimit').value || 100), editable);
  const search = $('recordSearch').value.trim().toLowerCase();
  const filterText = (r) => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(search));
  const filteredCustomers = search ? customerRows.filter(filterText) : customerRows;
  const filteredProducts = search ? productRows.filter(filterText) : productRows;
  const filteredIssues = search ? issues.filter(filterText) : issues;

  $('recordCards').innerHTML = [
    ['Rows ทั้งหมด', formatNumber(rows.length,0), table],
    ['Rows ที่ใช้คำนวณ', formatNumber(includedRows.length,0), 'ไม่รวมแถวที่ถูก exclude'],
    ['Excluded Rows', formatNumber(excludedRows,0), 'ไม่นำไปคำนวณ'],
    ['Customers', formatNumber(customerRows.length,0), smart.customerId || 'ไม่พบ customer_id'],
    ['Products', formatNumber(productRows.length,0), smart.productId || smart.productName || 'ไม่พบ product_id/product_name'],
    ['แถวที่ควรตรวจ', formatNumber(issues.length,0), 'missing / excluded / data issue']
  ].map(([l,v,h]) => `<div class="metric-card"><div class="label">${escapeHtml(l)}</div><div class="value">${escapeHtml(v)}</div><div class="hint">${escapeHtml(h)}</div></div>`).join('');

  $('customerReferenceTable').innerHTML = smart.customerId
    ? renderTable(['customer_id','customer_name','province','region','orders','total_sales','total_profit','last_order_date'], filteredCustomers.slice(0, 100))
    : '<p class="status warn">ไม่พบคอลัมน์ customer_id ในตารางนี้</p>';
  $('productReferenceTable').innerHTML = (smart.productId || smart.productName)
    ? renderTable(['product_id','product_name','category','rows','total_sales','total_profit','profit_margin'], filteredProducts.slice(0, 100))
    : '<p class="status warn">ไม่พบคอลัมน์ product_id หรือ product_name ในตารางนี้</p>';
  $('recordIssueTable').innerHTML = editable
    ? renderIssueTable(table, filteredIssues.slice(0, Number($('recordLimit').value || 100)))
    : '<p class="status warn">ตารางนี้เป็น View จึงแก้ไขแถวโดยตรงไม่ได้ ให้เลือกตารางจริงแทน</p>';
}

function buildCustomerReferenceRows(rows, smart) {
  if (!smart.customerId) return [];
  const map = new Map();
  rows.forEach(r => {
    const id = String(r[smart.customerId] ?? '').trim() || 'ไม่ระบุ';
    const old = map.get(id) || { customer_id: id, customer_name: '', province: '', region: '', ordersSet: new Set(), orders: 0, total_sales: 0, total_profit: 0, last_order_date: '' };
    if (smart.customerName && r[smart.customerName]) old.customer_name = r[smart.customerName];
    if (smart.province && r[smart.province]) old.province = r[smart.province];
    if (smart.region && r[smart.region]) old.region = r[smart.region];
    if (smart.order && r[smart.order]) old.ordersSet.add(r[smart.order]); else old.orders += 1;
    if (smart.sales) old.total_sales += Number(r[smart.sales] || 0);
    if (smart.profit) old.total_profit += Number(r[smart.profit] || 0);
    if (smart.date && r[smart.date] && String(r[smart.date]) > String(old.last_order_date || '')) old.last_order_date = r[smart.date];
    map.set(id, old);
  });
  return [...map.values()].map(r => ({
    customer_id: r.customer_id,
    customer_name: r.customer_name || '-',
    province: r.province || '-',
    region: r.region || '-',
    orders: smart.order ? r.ordersSet.size : r.orders,
    total_sales: Number(r.total_sales.toFixed(2)),
    total_profit: Number(r.total_profit.toFixed(2)),
    last_order_date: r.last_order_date || '-'
  })).sort((a,b) => b.total_sales - a.total_sales);
}

function buildProductReferenceRows(rows, smart) {
  const idCol = smart.productId || smart.productName;
  if (!idCol) return [];
  const map = new Map();
  rows.forEach(r => {
    const id = String(r[idCol] ?? '').trim() || 'ไม่ระบุ';
    const old = map.get(id) || { product_id: id, product_name: '', category: '', rows: 0, total_sales: 0, total_profit: 0 };
    if (smart.productName && r[smart.productName]) old.product_name = r[smart.productName];
    if (smart.category && r[smart.category]) old.category = r[smart.category];
    old.rows += 1;
    if (smart.sales) old.total_sales += Number(r[smart.sales] || 0);
    if (smart.profit) old.total_profit += Number(r[smart.profit] || 0);
    map.set(id, old);
  });
  return [...map.values()].map(r => ({
    product_id: r.product_id,
    product_name: r.product_name || r.product_id,
    category: r.category || '-',
    rows: r.rows,
    total_sales: Number(r.total_sales.toFixed(2)),
    total_profit: Number(r.total_profit.toFixed(2)),
    profit_margin: r.total_sales ? `${formatNumber((r.total_profit / r.total_sales) * 100)}%` : '-'
  })).sort((a,b) => b.total_sales - a.total_sales);
}

function buildIssueRows(rows, smart, limit, editable) {
  if (!editable) return [];
  const important = [smart.customerId, smart.productId || smart.productName, smart.date, smart.sales].filter(Boolean);
  const items = [];
  for (const r of rows) {
    const issues = [];
    important.forEach(c => {
      if (r[c] === null || r[c] === undefined || String(r[c]).trim() === '') issues.push(`${c} ว่าง`);
    });
    if (Number(r._exclude_from_analysis || 0) === 1) issues.push('ถูกตั้งค่าไม่นำไปคำนวณ');
    if (issues.length) {
      items.push({
        _rowid: r._rowid,
        issues: issues.join(', '),
        customer_id: smart.customerId ? r[smart.customerId] : '-',
        customer_name: smart.customerName ? r[smart.customerName] : '-',
        product_id: smart.productId ? r[smart.productId] : '-',
        product_name: smart.productName ? r[smart.productName] : '-',
        date: smart.date ? r[smart.date] : '-',
        sales: smart.sales ? r[smart.sales] : '-',
        excluded: Number(r._exclude_from_analysis || 0) === 1 ? 'Yes' : 'No',
        reason: r._exclude_reason || ''
      });
    }
    if (items.length >= limit) break;
  }
  return items;
}

function renderIssueTable(table, rows) {
  if (!rows.length) return '<p class="status ok">ไม่พบแถวที่มีปัญหาในคอลัมน์สำคัญตามที่ระบบตรวจได้</p>';
  const cols = ['action','_rowid','issues','customer_id','customer_name','product_id','product_name','date','sales','excluded','reason'];
  const thead = `<thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${cols.map(c => c === 'action' ? `<td><button class="small-btn" data-edit-row="${escapeHtml(r._rowid)}" data-table="${escapeHtml(table)}">แก้ไข</button></td>` : `<td>${escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

function renderEditableTable(table, columns, rows) {
  const displayCols = ['action', '_rowid', ...columns];
  const thead = `<thead><tr>${displayCols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${displayCols.map(c => {
    if (c === 'action') return `<td data-label="action"><button class="small-btn" data-edit-row="${escapeHtml(r._rowid)}" data-table="${escapeHtml(table)}">แก้ไข</button></td>`;
    return `<td data-label="${escapeHtml(c)}">${escapeHtml(r[c])}</td>`;
  }).join('')}</tr>`).join('')}</tbody>`;
  return `<table class="mobile-card-table">${thead}${tbody}</table>`;
}

function loadRowForEdit(table, rowid) {
  if (!isEditableTable(table) || !Number.isFinite(rowid)) return toast('เลือกแถวที่แก้ไขได้จากตารางจริงเท่านั้น', 'error');
  ensureGovernanceColumns(table);
  const cols = getColumns(table).map(c => c.name);
  const row = query(`SELECT rowid AS _rowid, * FROM ${quoteIdent(table)} WHERE rowid = ${Number(rowid)} LIMIT 1;`).rows[0];
  if (!row) return toast('ไม่พบแถวข้อมูลที่เลือก', 'error');
  state.editing = { table, rowid, columns: cols };
  $('editTableName').value = table;
  $('editRowId').value = rowid;
  $('editRowBadge').textContent = `${table} / rowid ${rowid}`;
  $('editExcludeFlag').checked = Number(row._exclude_from_analysis || 0) === 1;
  $('editExcludeReason').value = row._exclude_reason || '';
  $('editForm').innerHTML = cols
    .filter(c => !['_exclude_from_analysis','_exclude_reason','_last_updated_at'].includes(c))
    .map(c => `<label>${escapeHtml(c)}<input data-edit-field="${escapeHtml(c)}" type="text" value="${escapeHtml(row[c] ?? '')}" /></label>`).join('');
  $('editMessage').className = 'status ok';
  $('editMessage').textContent = 'โหลดข้อมูลแถวนี้แล้ว สามารถแก้ไขและกดบันทึกได้';
}

function saveRowEdit() {
  const { table, rowid, columns } = state.editing || {};
  if (!table || !rowid) return toast('กรุณาเลือกแถวที่ต้องการแก้ไขก่อน', 'error');
  const fields = [...document.querySelectorAll('[data-edit-field]')];
  const editableColumns = fields.map(input => input.dataset.editField).filter(c => columns.includes(c));
  const values = fields.map(input => input.value === '' ? null : input.value);
  const setParts = editableColumns.map(c => `${quoteIdent(c)} = ?`);
  setParts.push(`${quoteIdent('_exclude_from_analysis')} = ?`);
  setParts.push(`${quoteIdent('_exclude_reason')} = ?`);
  setParts.push(`${quoteIdent('_last_updated_at')} = ?`);
  values.push($('editExcludeFlag').checked ? 1 : 0);
  values.push($('editExcludeReason').value || null);
  values.push(new Date().toISOString());
  try {
    const stmt = state.db.prepare(`UPDATE ${quoteIdent(table)} SET ${setParts.join(', ')} WHERE rowid = ?;`);
    stmt.run([...values, Number(rowid)]);
    stmt.free();
    $('editMessage').className = 'status ok';
    $('editMessage').textContent = 'บันทึกข้อมูลสำเร็จ Dashboard และ Business Analytics จะไม่นำแถวที่ exclude ไปคำนวณ';
    refreshAll();
    toast('บันทึกการแก้ไขสำเร็จ', 'success');
  } catch (error) {
    console.error(error);
    $('editMessage').className = 'status error';
    $('editMessage').textContent = `บันทึกไม่สำเร็จ: ${error.message}`;
  }
}

function setEditExclude(flag) {
  if (!state.editing || !state.editing.table) return toast('กรุณาเลือกแถวก่อน', 'error');
  $('editExcludeFlag').checked = flag;
  if (flag && !$('editExcludeReason').value) $('editExcludeReason').value = 'ไม่นำแถวนี้ไปคำนวณ รอตรวจสอบข้อมูล';
  saveRowEdit();
}

function buildReferenceTables() {
  const table = $('recordSourceTable').value || state.tables[0];
  if (!table) return toast('ยังไม่มีตารางข้อมูลหลัก', 'error');
  const smart = getSmartColumns(table);
  const rows = getAnalysisRows(table, 100000);
  const customers = buildCustomerReferenceRows(rows, smart);
  const products = buildProductReferenceRows(rows, smart);
  try {
    run('DROP TABLE IF EXISTS ref_customers;');
    run('CREATE TABLE ref_customers (customer_id TEXT PRIMARY KEY, customer_name TEXT, province TEXT, region TEXT, orders INTEGER, total_sales REAL, total_profit REAL, last_order_date TEXT);');
    let stmt = state.db.prepare('INSERT INTO ref_customers VALUES (?, ?, ?, ?, ?, ?, ?, ?);');
    state.db.run('BEGIN TRANSACTION');
    customers.forEach(r => stmt.run([r.customer_id, r.customer_name, r.province, r.region, r.orders, r.total_sales, r.total_profit, r.last_order_date]));
    state.db.run('COMMIT');
    stmt.free();
    run('DROP TABLE IF EXISTS ref_products;');
    run('CREATE TABLE ref_products (product_id TEXT PRIMARY KEY, product_name TEXT, category TEXT, rows INTEGER, total_sales REAL, total_profit REAL, profit_margin TEXT);');
    stmt = state.db.prepare('INSERT INTO ref_products VALUES (?, ?, ?, ?, ?, ?, ?);');
    state.db.run('BEGIN TRANSACTION');
    products.forEach(r => stmt.run([r.product_id, r.product_name, r.category, r.rows, r.total_sales, r.total_profit, r.profit_margin]));
    state.db.run('COMMIT');
    stmt.free();
    refreshAll();
    toast(`สร้าง ref_customers (${customers.length}) และ ref_products (${products.length}) สำเร็จ`, 'success');
  } catch (error) {
    try { state.db.run('ROLLBACK'); } catch (_) {}
    console.error(error);
    toast(`สร้างตารางอ้างอิงไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function renderTable(columns, rows) {
  if (!columns || !columns.length) return '<p class="status warn">ไม่มีข้อมูลแสดงผล</p>';
  const thead = `<thead><tr>${columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${columns.map(c => `<td data-label="${escapeHtml(c)}">${escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table class="mobile-card-table">${thead}${tbody}</table>`;
}

function exportLastSqlCsv() {
  if (!state.lastSqlColumns.length) return toast('ยังไม่มีผลลัพธ์ SQL ให้ Export', 'error');
  downloadText('sql_result.csv', rowsToCsv(state.lastSqlColumns, state.lastSqlRows), 'text/csv;charset=utf-8');
}

function exportBrowserCsv() {
  const table = $('browserTable').value || state.tables[0];
  if (!table) return toast('ยังไม่มีตาราง', 'error');
  const cols = getColumns(table).map(c => c.name);
  const rows = query(`SELECT * FROM ${quoteIdent(table)};`).rows;
  downloadText(`${table}.csv`, rowsToCsv(cols, rows), 'text/csv;charset=utf-8');
}

function generateMysqlSql() {
  const table = quoteMysqlIdent($('mysqlTable').value || 'orders');
  const date = quoteMysqlIdent($('mysqlDate').value || 'order_date');
  const sales = $('mysqlSales').value || 'quantity * unit_price * (1 - discount)';
  const profit = $('mysqlProfit').value || `(${sales}) - (quantity * cost)`;
  const sql = `-- MySQL: View สำหรับต่อ Tableau\nCREATE OR REPLACE VIEW vw_sales_dashboard AS\nSELECT\n  *,\n  (${sales}) AS net_sales,\n  (${profit}) AS profit\nFROM ${table};\n\n-- KPI หลัก\nSELECT\n  COUNT(*) AS total_rows,\n  SUM(net_sales) AS total_sales,\n  SUM(profit) AS total_profit,\n  CASE WHEN SUM(net_sales) = 0 THEN 0 ELSE SUM(profit) / SUM(net_sales) END AS profit_margin\nFROM vw_sales_dashboard;\n\n-- Trend รายเดือน\nSELECT\n  DATE_FORMAT(${date}, '%Y-%m') AS order_month,\n  SUM((${sales})) AS total_sales,\n  SUM((${profit})) AS total_profit\nFROM ${table}\nGROUP BY DATE_FORMAT(${date}, '%Y-%m')\nORDER BY order_month;`;
  $('mysqlSql').textContent = sql;
}

async function apiHealth() {
  const base = $('apiBase').value.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/health`);
    const data = await res.json();
    $('apiMessage').className = 'status ok';
    $('apiMessage').textContent = JSON.stringify(data);
  } catch (error) {
    $('apiMessage').className = 'status error';
    $('apiMessage').textContent = `API Error: ${error.message}`;
  }
}

async function apiQuery() {
  const base = $('apiBase').value.replace(/\/$/, '');
  const sql = $('apiSql').value;
  try {
    const res = await fetch(`${base}/api/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Query failed');
    $('apiMessage').className = 'status ok';
    $('apiMessage').textContent = `สำเร็จ ${data.rows.length} rows`;
    $('apiResult').innerHTML = renderTable(data.columns, data.rows);
  } catch (error) {
    $('apiMessage').className = 'status error';
    $('apiMessage').textContent = `API Error: ${error.message}`;
  }
}

function loadTableau() {
  const url = $('tableauUrl').value.trim();
  const height = Number($('tableauHeight').value || 760);
  if (!url) return toast('กรุณาใส่ Tableau URL', 'error');
  if (!/^https:\/\//i.test(url)) return toast('เพื่อความปลอดภัย Tableau URL ควรเป็น https://', 'error');
  const safeUrl = escapeHtml(url);
  $('tableauEmbed').style.minHeight = `${height}px`;
  $('tableauEmbed').innerHTML = `<tableau-viz src="${safeUrl}" height="${height}" toolbar="bottom"></tableau-viz><p class="small">ถ้าไม่แสดงผล ให้ตรวจว่า Dashboard ถูก Publish และอนุญาต Embed แล้ว</p>`;
}


function extractPowerBiUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const iframeMatch = raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch) return iframeMatch[1].replaceAll('&amp;', '&');
  return raw;
}

function isLikelyPowerBiUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && /(^|\.)powerbi\.com$/i.test(parsed.hostname);
  } catch (_) {
    return false;
  }
}

function loadPowerBi() {
  const mode = $('powerBiMode').value;
  const url = extractPowerBiUrl($('powerBiUrl').value);
  const height = Number($('powerBiHeight').value || 760);
  if (!url) return toast('กรุณาใส่ Power BI URL หรือ iframe HTML', 'error');
  if (!isLikelyPowerBiUrl(url)) return toast('เพื่อความปลอดภัย URL ควรเป็น https://*.powerbi.com', 'error');

  const safeUrl = escapeHtml(url);
  const note = mode === 'public'
    ? 'โหมด Publish to web เหมาะกับข้อมูลที่เผยแพร่สาธารณะได้เท่านั้น'
    : mode === 'secure'
      ? 'โหมด Secure embed ผู้ชมต้องมีสิทธิ์เข้าถึงรายงานตามที่องค์กรกำหนด'
      : 'โหมด Embedded/API ต้องมี backend สำหรับออก embed token ก่อนนำไปใช้จริง';

  $('powerBiEmbed').style.minHeight = `${height}px`;
  $('powerBiEmbed').innerHTML = `<iframe title="Power BI report" src="${safeUrl}" width="100%" height="${height}" allowfullscreen="true"></iframe><p class="small">${escapeHtml(note)}</p>`;
}

function exportReport() {
  const table = $('dashTable').value || state.tables[0] || 'no_table';
  const report = `Data Insight SQL Dashboard Report\nGenerated: ${new Date().toLocaleString('th-TH')}\nDatabase: ${state.dbName}\nTable: ${table}\n\nDashboard SQL:\n${$('dashboardSql').textContent}\n\nInsights:\n${$('autoInsights').innerText}\n`;
  downloadText(`report_${table}.txt`, report, 'text/plain;charset=utf-8');
}


/* Smart Beginner Edition: Excel/CSV Import Wizard, multilingual mapping, date parser, no-SQL mode */
const SMART_STANDARD_ROLES = [
  { value: 'keep', label: 'เก็บเป็นคอลัมน์เดิม' },
  { value: 'ignore', label: 'ไม่ต้องนำเข้าคอลัมน์นี้' },
  { value: 'order_id', label: 'order_id / เลขที่คำสั่งซื้อ' },
  { value: 'order_date', label: 'order_date / วันที่' },
  { value: 'customer_id', label: 'customer_id / รหัสลูกค้า' },
  { value: 'customer_name', label: 'customer_name / ชื่อลูกค้า' },
  { value: 'national_id', label: 'national_id / เลขบัตรหรือรหัสประจำตัว' },
  { value: 'product_id', label: 'product_id / รหัสสินค้า' },
  { value: 'product_name', label: 'product_name / ชื่อหรือรายละเอียดสินค้า' },
  { value: 'category', label: 'category / หมวดสินค้า' },
  { value: 'region', label: 'region / ภูมิภาคหรือพื้นที่' },
  { value: 'province', label: 'province / จังหวัด' },
  { value: 'channel', label: 'channel / ช่องทางขาย' },
  { value: 'payment_method', label: 'payment_method / วิธีชำระเงิน' },
  { value: 'campaign', label: 'campaign / แคมเปญ' },
  { value: 'quantity', label: 'quantity / จำนวน' },
  { value: 'unit_price', label: 'unit_price / ราคาต่อหน่วย' },
  { value: 'discount', label: 'discount / ส่วนลด' },
  { value: 'cost', label: 'cost / ต้นทุนต่อหน่วย' },
  { value: 'gross_sales', label: 'gross_sales / ยอดขายก่อนหักส่วนลด' },
  { value: 'discount_amount', label: 'discount_amount / มูลค่าส่วนลด' },
  { value: 'net_sales', label: 'net_sales / ยอดขายสุทธิ' },
  { value: 'total_cost', label: 'total_cost / ต้นทุนรวม' },
  { value: 'profit', label: 'profit / กำไร' },
  { value: 'order_status', label: 'order_status / สถานะรายการ' },
];

const SMART_COLUMN_DICTIONARY = {
  order_id: ['order_id','orderid','order no','order number','invoice','invoice_no','เลขที่คำสั่งซื้อ','เลขออเดอร์','เลขที่บิล','ใบสั่งซื้อ','订单号','订单编号','注文番号','주문번호','mã đơn hàng','nomor pesanan'],
  order_date: ['order_date','date','transaction_date','created_at','purchase_date','sale_date','วันที่','วันขาย','วันที่ขาย','วันที่สั่งซื้อ','วันที่ทำรายการ','订单日期','交易日期','注文日','購入日','거래일','ngày bán','tanggal'],
  customer_id: ['customer_id','customerid','customer code','client_id','member_id','รหัสลูกค้า','รหัสสมาชิก','เลขลูกค้า','ลูกค้า id','客户编号','客户id','顧客id','会員番号','고객id','mã khách hàng','id pelanggan'],
  customer_name: ['customer_name','customername','customer','client_name','buyer','name','fullname','ชื่อลูกค้า','ชื่อผู้ซื้อ','ลูกค้า','客户名称','客户姓名','顧客名','氏名','고객명','tên khách hàng','nama pelanggan'],
  national_id: ['national_id','citizen_id','id_card','personal_id','เลขบัตรประจำตัว','เลขบัตรประชาชน','เลขประจำตัว','บัตรประชาชน','身份证号','身分證','マイナンバー','주민등록번호','số cmnd','nomor identitas'],
  product_id: ['product_id','productid','product code','sku','item_code','item_id','รหัสสินค้า','รหัสผลิตภัณฑ์','sku','สินค้า id','产品编号','商品编号','商品コード','제품코드','mã sản phẩm','kode produk'],
  product_name: ['product_name','productname','product','item_name','item','description','รายละเอียดสินค้า','ชื่อสินค้า','รายการสินค้า','สินค้า','ผลิตภัณฑ์','产品名称','商品名称','商品名','제품명','tên sản phẩm','nama produk'],
  category: ['category','product_category','group','หมวด','หมวดสินค้า','ประเภทสินค้า','ประเภท','类别','商品类别','カテゴリ','카테고리','danh mục','kategori'],
  region: ['region','area','zone','territory','ภูมิภาค','ภาค','พื้นที่','เขต','区域','地区','地域','지역','khu vực','wilayah'],
  province: ['province','state','city','จังหวัด','เมือง','อำเภอ','省','城市','都道府県','県','지역','tỉnh','provinsi'],
  channel: ['channel','sales_channel','platform','source','ช่องทางขาย','ช่องทาง','แพลตฟอร์ม','渠道','销售渠道','販売チャネル','채널','kênh bán hàng','saluran'],
  payment_method: ['payment_method','payment','pay_type','วิธีชำระเงิน','การชำระเงิน','付款方式','支払方法','결제수단','phương thức thanh toán'],
  campaign: ['campaign','promotion','promo','แคมเปญ','โปรโมชัน','โปรโมชั่น','活动','キャンペーン','캠페인','chiến dịch'],
  quantity: ['quantity','qty','units','unit','จำนวน','จำนวนขาย','ปริมาณ','数量','数量','個数','수량','số lượng','jumlah'],
  unit_price: ['unit_price','unitprice','price','sell_price','ราคาต่อหน่วย','ราคาขาย','ราคา','单价','价格','単価','価格','단가','giá','harga'],
  discount: ['discount','discount_rate','ส่วนลด','เปอร์เซ็นต์ส่วนลด','折扣','割引','할인','giảm giá','diskon'],
  cost: ['cost','unit_cost','ต้นทุน','ต้นทุนต่อหน่วย','成本','原価','비용','chi phí','biaya'],
  gross_sales: ['gross_sales','gross revenue','ยอดขายรวม','ยอดขายก่อนหักส่วนลด','销售总额','売上総額'],
  discount_amount: ['discount_amount','discount value','มูลค่าส่วนลด','จำนวนเงินส่วนลด','折扣金额','割引額'],
  net_sales: ['net_sales','sales','revenue','amount','total','net revenue','ยอดขายสุทธิ','ยอดขาย','รายได้','จำนวนเงิน','รวมเงิน','销售额','收入','売上','売上高','매출','doanh thu','penjualan'],
  total_cost: ['total_cost','cost_total','ต้นทุนรวม','รวมต้นทุน','总成本','総原価'],
  profit: ['profit','gross_profit','margin_amount','กำไร','กำไรสุทธิ','ผลกำไร','利润','利益','이익','lợi nhuận','laba'],
  order_status: ['order_status','status','สถานะ','สถานะคำสั่งซื้อ','สถานะรายการ','订单状态','ステータス','상태','trạng thái','status pesanan'],
};

const SMART_SENSITIVE_ROLES = new Set(['national_id']);

state.smartImport = {
  fileName: '',
  workbook: null,
  sheets: {},
  activeSheet: '',
  headers: [],
  dataRows: [],
  previewRows: [],
  mapping: [],
};

function normalizeColumnKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .replace(/^\ufeff/, '')
    .replace(/[\s_\-./()\[\]{}:;|]+/g, '')
    .replace(/["'`]/g, '');
}

function inferColumnRole(header) {
  const raw = String(header ?? '').trim();
  const key = normalizeColumnKey(raw);
  if (!key) return { role: 'keep', confidence: 0, reason: 'ไม่มีหัวตาราง' };
  for (const [role, names] of Object.entries(SMART_COLUMN_DICTIONARY)) {
    for (const name of names) {
      const nkey = normalizeColumnKey(name);
      if (key === nkey) return { role, confidence: 98, reason: 'ตรงกับพจนานุกรมหลายภาษา' };
    }
  }
  for (const [role, names] of Object.entries(SMART_COLUMN_DICTIONARY)) {
    for (const name of names) {
      const nkey = normalizeColumnKey(name);
      if (key.includes(nkey) || nkey.includes(key)) {
        const confidence = Math.min(92, Math.max(60, Math.round((Math.min(key.length, nkey.length) / Math.max(key.length, nkey.length)) * 100)));
        return { role, confidence, reason: 'ชื่อคอลัมน์คล้ายคำสำคัญ' };
      }
    }
  }
  return { role: 'keep', confidence: 20, reason: 'ไม่พบคำแนะนำอัตโนมัติ' };
}

const originalFindColumnSmart = findColumn;
findColumn = function(headers, candidates) {
  const normalizedCandidates = new Set((candidates || []).map(normalizeColumnKey));
  const roleCandidates = new Set();
  for (const [role, names] of Object.entries(SMART_COLUMN_DICTIONARY)) {
    if (normalizedCandidates.has(normalizeColumnKey(role)) || names.some(n => normalizedCandidates.has(normalizeColumnKey(n)))) {
      roleCandidates.add(role);
    }
  }
  for (const h of headers || []) {
    const inferred = inferColumnRole(h);
    if (roleCandidates.has(inferred.role) && inferred.confidence >= 60) return h;
  }
  return originalFindColumnSmart(headers, candidates);
};

function parseFlexibleDate(value, options = {}) {
  const format = options.format || 'DMY';
  const era = options.era || 'auto';
  if (value === null || value === undefined || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) return normalizeDateObject(value);

  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 90000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return normalizeDateObject(new Date(excelEpoch + value * 86400000));
  }

  let text = String(value).trim();
  if (!text) return null;
  text = text.replace(/พ\.ศ\.|พศ|ค\.ศ\.|คศ/gi, '').trim();

  const monthNames = {
    jan:1, january:1, 'ม.ค.':1, มกราคม:1,
    feb:2, february:2, 'ก.พ.':2, กุมภาพันธ์:2,
    mar:3, march:3, 'มี.ค.':3, มีนาคม:3,
    apr:4, april:4, 'เม.ย.':4, เมษายน:4,
    may:5, 'พ.ค.':5, พฤษภาคม:5,
    jun:6, june:6, 'มิ.ย.':6, มิถุนายน:6,
    jul:7, july:7, 'ก.ค.':7, กรกฎาคม:7,
    aug:8, august:8, 'ส.ค.':8, สิงหาคม:8,
    sep:9, sept:9, september:9, 'ก.ย.':9, กันยายน:9,
    oct:10, october:10, 'ต.ค.':10, ตุลาคม:10,
    nov:11, november:11, 'พ.ย.':11, พฤศจิกายน:11,
    dec:12, december:12, 'ธ.ค.':12, ธันวาคม:12,
  };
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  if (tokens.length >= 3) {
    const monthIndex = tokens.findIndex(t => monthNames[t.toLowerCase()] || monthNames[t]);
    if (monthIndex >= 0) {
      const m = monthNames[tokens[monthIndex].toLowerCase()] || monthNames[tokens[monthIndex]];
      const nums = tokens.filter((_, i) => i !== monthIndex).map(x => Number(String(x).replace(/\D/g, ''))).filter(Number.isFinite);
      if (nums.length >= 2) return normalizeDateParts(nums[1], m, nums[0], era);
    }
  }

  if (/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(text)) {
    const [y, m, d] = text.split(/[\/\-.]/).map(Number);
    return normalizeDateParts(y, m, d, era);
  }

  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(text)) {
    const parts = text.split(/[\/\-.]/).map(Number);
    let d, m, y;
    if (format === 'MDY') [m, d, y] = parts;
    else if (format === 'YMD') [y, m, d] = parts;
    else if (format === 'AUTO') {
      if (parts[0] > 12) [d, m, y] = parts;
      else if (parts[1] > 12) [m, d, y] = parts;
      else [d, m, y] = parts; // default Thai-friendly DMY when ambiguous
    } else [d, m, y] = parts;
    return normalizeDateParts(y, m, d, era);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return normalizeDateObject(parsed);
  return null;
}

function normalizeDateParts(year, month, day, era = 'auto') {
  let y = Number(year), m = Number(month), d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (y < 100) {
    if (era === 'BE' || era === 'auto') y = 2500 + y - 543;
    else y = 2000 + y;
  }
  if (y > 2400) y -= 543;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return normalizeDateObject(date);
}

function normalizeDateObject(date) {
  const y = date.getUTCFullYear ? date.getUTCFullYear() : date.getFullYear();
  const m = (date.getUTCMonth ? date.getUTCMonth() : date.getMonth()) + 1;
  const d = date.getUTCDate ? date.getUTCDate() : date.getDate();
  const thaiMonths = ['', 'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const thaiWeekdays = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  return {
    iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    day: d,
    month: m,
    month_name: thaiMonths[m] || '',
    year: y,
    year_th: y + 543,
    quarter: `Q${Math.ceil(m / 3)}`,
    year_month: `${y}-${String(m).padStart(2, '0')}`,
    weekday_name: thaiWeekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
  };
}

parseDateValue = function(value) {
  const parsed = parseFlexibleDate(value, { format: $('smartDateFormat')?.value || 'DMY', era: $('smartEra')?.value || 'auto' });
  if (!parsed) return null;
  const [y, m, d] = parsed.iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

monthKey = function(value) {
  const parsed = parseFlexibleDate(value, { format: $('smartDateFormat')?.value || 'DMY', era: $('smartEra')?.value || 'auto' });
  return parsed ? parsed.year_month : '';
};

function parseSmartNumber(value, role = '') {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  let text = String(value).trim().replace(/,/g, '');
  if (!text) return null;
  const isPercent = text.endsWith('%');
  text = text.replace('%', '').replace(/[^0-9.\-]/g, '');
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  if (role === 'discount' && (isPercent || n > 1)) return n / 100;
  return n;
}

function maskSensitiveValue(value, roleOrName) {
  const text = String(value ?? '');
  const role = inferColumnRole(roleOrName).role;
  if (SMART_SENSITIVE_ROLES.has(role) || /เลขบัตร|citizen|national|phone|โทร|email|อีเมล/i.test(String(roleOrName))) {
    if (/@/.test(text)) return text.replace(/^(.{2}).*(@.*)$/, '$1***$2');
    if (text.length > 6) return `${text.slice(0, 3)}***${text.slice(-3)}`;
  }
  return value;
}

function getSmartRoleSelectHtml(index, currentRole) {
  return `<select class="mapping-select" data-smart-map-index="${index}">${SMART_STANDARD_ROLES.map(r => `<option value="${r.value}" ${r.value === currentRole ? 'selected' : ''}>${escapeHtml(r.label)}</option>`).join('')}</select>`;
}

function confidenceClass(score) {
  if (score >= 85) return 'confidence-high';
  if (score >= 60) return 'confidence-medium';
  return 'confidence-low';
}

function renderSmartMapping(headers) {
  state.smartImport.mapping = headers.map((h, index) => {
    const inferred = inferColumnRole(h);
    return { index, source: h || `column_${index + 1}`, role: inferred.role, confidence: inferred.confidence, reason: inferred.reason };
  });
  const rows = state.smartImport.mapping.map(m => ({
    source_column: m.source,
    mapped_to: getSmartRoleSelectHtml(m.index, m.role),
    confidence: `<span class="${confidenceClass(m.confidence)}">${m.confidence}%</span>`,
    note: m.reason,
  }));
  $('smartMappingTable').innerHTML = renderHtmlTable(['source_column', 'mapped_to', 'confidence', 'note'], rows);
  document.querySelectorAll('[data-smart-map-index]').forEach(sel => sel.addEventListener('change', () => {
    const item = state.smartImport.mapping[Number(sel.dataset.smartMapIndex)];
    if (item) item.role = sel.value;
    renderSmartValidation();
  }));
}

function renderHtmlTable(columns, rows) {
  if (!rows.length) return '<p class="status warn">ไม่มีข้อมูลแสดงผล</p>';
  const thead = `<thead><tr>${columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${columns.map(c => `<td data-label="${escapeHtml(c)}">${r[c] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table class="mobile-card-table">${thead}${tbody}</table>`;
}

async function handleSmartFileChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  state.smartImport = { fileName: file.name, workbook: null, sheets: {}, activeSheet: '', headers: [], dataRows: [], previewRows: [], mapping: [] };
  $('smartImportStatus').className = 'status';
  $('smartImportStatus').textContent = 'กำลังอ่านไฟล์...';
  try {
    if (/\.csv$/i.test(file.name)) {
      const rows = parseCsv(await file.text());
      state.smartImport.sheets = { CSV: rows };
      state.smartImport.activeSheet = 'CSV';
    } else {
      if (!window.XLSX) throw new Error('ไม่พบ SheetJS สำหรับอ่าน Excel จาก CDN');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
      state.smartImport.workbook = workbook;
      workbook.SheetNames.forEach(name => {
        const ws = workbook.Sheets[name];
        state.smartImport.sheets[name] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
      });
      state.smartImport.activeSheet = workbook.SheetNames[0] || '';
    }
    const names = Object.keys(state.smartImport.sheets);
    $('smartSheet').innerHTML = names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    $('smartSheet').value = state.smartImport.activeSheet;
    $('smartTableName').value = safeIdentifier(file.name.replace(/\.(xlsx|xls|csv)$/i, ''));
    $('smartImportStatus').className = 'status ok';
    $('smartImportStatus').textContent = `อ่านไฟล์สำเร็จ พบ ${names.length} sheet/table: ${names.join(', ')}`;
    previewSmartSheet();
  } catch (error) {
    console.error(error);
    $('smartImportStatus').className = 'status error';
    $('smartImportStatus').textContent = `อ่านไฟล์ไม่สำเร็จ: ${error.message}`;
  }
}

function previewSmartSheet() {
  const sheetName = $('smartSheet').value || state.smartImport.activeSheet;
  const rows = state.smartImport.sheets[sheetName] || [];
  const headerRow = Math.max(1, Number($('smartHeaderRow').value || 1)) - 1;
  if (!rows.length || !rows[headerRow]) {
    $('smartPreviewTable').innerHTML = '<p class="status warn">ไม่พบข้อมูลใน Sheet นี้</p>';
    return;
  }
  const headers = uniqueIdentifiers(rows[headerRow].map((h, i) => String(h || `column_${i + 1}`).trim()));
  const dataRows = rows.slice(headerRow + 1).filter(r => r.some(v => String(v ?? '').trim() !== ''));
  state.smartImport.activeSheet = sheetName;
  state.smartImport.headers = headers;
  state.smartImport.dataRows = dataRows;
  const mask = $('smartMaskSensitive')?.checked;
  const preview = dataRows.slice(0, 20).map(r => Object.fromEntries(headers.map((h, i) => [h, mask ? maskSensitiveValue(r[i], h) : r[i]])));
  $('smartPreviewTable').innerHTML = renderTable(headers, preview);
  renderSmartMapping(headers);
  renderSmartValidation();
}

function getCurrentSmartMapping() {
  const roles = new Map();
  (state.smartImport.mapping || []).forEach(m => roles.set(m.index, m.role));
  document.querySelectorAll('[data-smart-map-index]').forEach(sel => roles.set(Number(sel.dataset.smartMapIndex), sel.value));
  return state.smartImport.headers.map((source, index) => ({ source, index, role: roles.get(index) || 'keep' }));
}

function makeUniqueColumnNames(names) {
  const used = new Map();
  return names.map((name, idx) => {
    const base = safeIdentifier(name || `column_${idx + 1}`);
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    return n ? `${base}_${n + 1}` : base;
  });
}

function transformSmartRows() {
  const headers = state.smartImport.headers;
  const mapping = getCurrentSmartMapping();
  const mappedNames = makeUniqueColumnNames(mapping.map(m => m.role === 'keep' ? m.source : m.role === 'ignore' ? '' : m.role));
  const dateFormat = $('smartDateFormat')?.value || 'DMY';
  const era = $('smartEra')?.value || 'auto';
  const autoDateParts = $('smartAutoDateParts')?.checked !== false;
  const invalidAction = $('smartInvalidAction')?.value || 'exclude';
  const out = [];
  const issues = [];
  const importantRoles = new Set(['order_date','customer_id','product_id','net_sales','profit','quantity','unit_price','cost']);

  state.smartImport.dataRows.forEach((row, rowIndex) => {
    const obj = {};
    const rowIssues = [];
    mapping.forEach((m, idx) => {
      if (m.role === 'ignore') return;
      const col = mappedNames[idx];
      const raw = row[m.index] ?? null;
      if (m.role === 'order_date') {
        obj.order_date_original = raw;
        const parsed = parseFlexibleDate(raw, { format: dateFormat, era });
        if (parsed) {
          obj.order_date = parsed.iso;
          if (autoDateParts) {
            obj.day = parsed.day;
            obj.month = parsed.month;
            obj.month_name = parsed.month_name;
            obj.year = parsed.year;
            obj.year_th = parsed.year_th;
            obj.quarter = parsed.quarter;
            obj.year_month = parsed.year_month;
            obj.weekday_name = parsed.weekday_name;
          }
        } else {
          obj.order_date = raw;
          rowIssues.push('วันที่อ่านไม่ได้');
        }
      } else if (['quantity','unit_price','discount','cost','gross_sales','discount_amount','net_sales','total_cost','profit'].includes(m.role)) {
        obj[col] = parseSmartNumber(raw, m.role);
        if (importantRoles.has(m.role) && (obj[col] === null || obj[col] === undefined)) rowIssues.push(`${m.role} ว่างหรือไม่ใช่ตัวเลข`);
      } else {
        obj[col] = raw === '' ? null : raw;
        if (importantRoles.has(m.role) && (obj[col] === null || obj[col] === undefined)) rowIssues.push(`${m.role} ว่าง`);
      }
    });

    if ((obj.net_sales === null || obj.net_sales === undefined) && obj.quantity !== undefined && obj.unit_price !== undefined) {
      const discount = Number(obj.discount || 0);
      obj.gross_sales = Number(obj.quantity || 0) * Number(obj.unit_price || 0);
      obj.discount_amount = obj.gross_sales * discount;
      obj.net_sales = obj.gross_sales - obj.discount_amount;
    }
    if ((obj.total_cost === null || obj.total_cost === undefined) && obj.quantity !== undefined && obj.cost !== undefined) {
      obj.total_cost = Number(obj.quantity || 0) * Number(obj.cost || 0);
    }
    if ((obj.profit === null || obj.profit === undefined) && obj.net_sales !== undefined && obj.total_cost !== undefined) {
      obj.profit = Number(obj.net_sales || 0) - Number(obj.total_cost || 0);
    }
    if (obj.quantity !== undefined && Number(obj.quantity) <= 0) rowIssues.push('quantity น้อยกว่าหรือเท่ากับ 0');
    if (obj.net_sales !== undefined && Number(obj.net_sales) < 0) rowIssues.push('net_sales ติดลบ');
    if (obj.discount !== undefined && Number(obj.discount) > 1) rowIssues.push('discount มากกว่า 100%');
    if (obj.cost !== undefined && Number(obj.cost) < 0) rowIssues.push('cost ติดลบ');

    const status = rowIssues.length ? (rowIssues.some(x => /วันที่|ว่าง|ไม่ใช่ตัวเลข/.test(x)) ? 'error' : 'warning') : 'valid';
    obj._data_quality_status = status;
    obj._exclude_from_analysis = status === 'error' && invalidAction === 'exclude' ? 1 : 0;
    obj._exclude_reason = rowIssues.join('; ') || null;
    obj._last_updated_at = new Date().toISOString();
    obj._original_row_number = rowIndex + Math.max(1, Number($('smartHeaderRow')?.value || 1)) + 1;
    obj._source_sheet = state.smartImport.activeSheet;
    obj._source_file = state.smartImport.fileName;

    if (status !== 'valid') issues.push({ row: obj._original_row_number, status, issue: obj._exclude_reason });
    if (!(status === 'error' && invalidAction === 'skip')) out.push(obj);
  });
  return { rows: out, issues };
}

function renderSmartValidation() {
  if (!state.smartImport.dataRows?.length) return;
  const mapping = getCurrentSmartMapping();
  const roles = new Set(mapping.map(m => m.role));
  const required = ['order_date', 'net_sales'];
  const missingRequired = required.filter(r => !roles.has(r));
  const { rows, issues } = transformSmartRows();
  const cards = [];
  cards.push(`<div class="issue-item ok"><strong>จำนวนแถวที่จะนำเข้า:</strong> ${formatNumber(rows.length, 0)} แถว</div>`);
  if (missingRequired.length) cards.push(`<div class="issue-item warn"><strong>คอลัมน์สำคัญยังไม่ได้จับคู่:</strong> ${missingRequired.join(', ')}</div>`);
  cards.push(`<div class="issue-item ${issues.length ? 'warn' : 'ok'}"><strong>แถวที่ควรตรวจสอบ:</strong> ${formatNumber(issues.length, 0)} แถว</div>`);
  issues.slice(0, 8).forEach(i => cards.push(`<div class="issue-item ${i.status === 'error' ? 'error' : 'warn'}">แถว ${escapeHtml(i.row)}: ${escapeHtml(i.issue)}</div>`));
  if (issues.length > 8) cards.push(`<div class="issue-item warn">ยังมีปัญหาเพิ่มเติมอีก ${formatNumber(issues.length - 8, 0)} แถว ดูต่อได้ใน Data Quality หลัง Import</div>`);
  $('smartValidationSummary').innerHTML = `<div class="issue-list">${cards.join('')}</div>`;
}

function importSmartRows() {
  if (!state.smartImport.dataRows?.length) return toast('กรุณาเลือกไฟล์และกดดูตัวอย่างก่อน', 'error');
  const table = safeIdentifier($('smartTableName')?.value || 'smart_import_data');
  const { rows, issues } = transformSmartRows();
  if (!rows.length) return toast('ไม่มีแถวข้อมูลที่นำเข้าได้', 'error');
  const allCols = makeUniqueColumnNames([...new Set(rows.flatMap(r => Object.keys(r)))]);
  const colTypes = allCols.map(c => inferType(rows.map(r => r[c])));
  try {
    run(`DROP TABLE IF EXISTS ${quoteIdent(table)};`);
    run(`CREATE TABLE ${quoteIdent(table)} (${allCols.map((c, i) => `${quoteIdent(c)} ${colTypes[i]}`).join(', ')});`);
    const stmt = state.db.prepare(`INSERT INTO ${quoteIdent(table)} (${allCols.map(quoteIdent).join(', ')}) VALUES (${allCols.map(() => '?').join(', ')});`);
    state.db.run('BEGIN TRANSACTION');
    rows.forEach(r => stmt.run(allCols.map(c => r[c] ?? null)));
    state.db.run('COMMIT');
    stmt.free();
    ensureGovernanceColumns(table);
    refreshAll();
    ['dashTable','baTable','qualityTable','browserTable','recordSourceTable','noSqlTable'].forEach(id => { if ($(id)) $(id).value = table; });
    populateDashboardColumns();
    populateBusinessColumns();
    if ($('smartCreateReference')?.checked) {
      try { buildReferenceTables(); } catch (_) {}
    }
    switchTab('dashboard');
    toast(`นำเข้า ${formatNumber(rows.length, 0)} แถวสำเร็จ พบรายการควรตรวจสอบ ${formatNumber(issues.length, 0)} แถว`, 'success');
  } catch (error) {
    try { state.db.run('ROLLBACK'); } catch (_) {}
    console.error(error);
    toast(`นำเข้าไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function clearSmartImport() {
  state.smartImport = { fileName: '', workbook: null, sheets: {}, activeSheet: '', headers: [], dataRows: [], previewRows: [], mapping: [] };
  ['smartFile','smartTableName'].forEach(id => { if ($(id)) $(id).value = id === 'smartTableName' ? 'smart_import_data' : ''; });
  ['smartSheet','smartMappingTable','smartPreviewTable'].forEach(id => { if ($(id)) $(id).innerHTML = ''; });
  if ($('smartValidationSummary')) $('smartValidationSummary').textContent = 'ยังไม่มีข้อมูลให้ตรวจ';
  if ($('smartImportStatus')) { $('smartImportStatus').className = 'status'; $('smartImportStatus').textContent = 'ยังไม่ได้เลือกไฟล์'; }
}

function getRoleMapForTable(table) {
  const cols = getColumns(table).map(c => c.name);
  const role = (names) => findColumn(cols, names);
  return {
    cols,
    sales: role(['net_sales','sales','revenue','amount','ยอดขาย']),
    profit: role(['profit','กำไร']),
    date: role(['order_date','date','วันที่','year_month']),
    customer: role(['customer_id','รหัสลูกค้า','customer']),
    customerName: role(['customer_name','ชื่อลูกค้า']),
    product: role(['product_name','product_id','product','สินค้า','category']),
    productId: role(['product_id','sku','รหัสสินค้า']),
    category: role(['category','หมวดสินค้า','region','channel']),
    order: role(['order_id','invoice','เลขที่คำสั่งซื้อ']),
    status: role(['order_status','status','สถานะ']),
    quality: role(['_data_quality_status']),
    exclude: role(['_exclude_from_analysis']),
    reason: role(['_exclude_reason']),
  };
}

function buildNoSqlQuery(table, question, limit) {
  const m = getRoleMapForTable(table);
  const where = analysisWhereSql(table);
  const sales = m.sales ? quoteIdent(m.sales) : '0';
  const profit = m.profit ? quoteIdent(m.profit) : '0';
  const order = m.order ? quoteIdent(m.order) : 'rowid';
  const customer = m.customer ? quoteIdent(m.customer) : 'NULL';
  const date = m.date ? quoteIdent(m.date) : 'NULL';
  const product = m.product ? quoteIdent(m.product) : (m.category ? quoteIdent(m.category) : 'NULL');
  const category = m.category ? quoteIdent(m.category) : product;
  const limitSql = Math.max(1, Math.min(Number(limit || 10), 100));
  if (question === 'overview') return `SELECT COUNT(*) AS rows, COUNT(DISTINCT ${order}) AS orders, COUNT(DISTINCT ${customer}) AS customers, SUM(COALESCE(${sales},0)) AS total_sales, SUM(COALESCE(${profit},0)) AS total_profit, SUM(COALESCE(${profit},0)) / NULLIF(SUM(COALESCE(${sales},0)), 0) AS profit_margin FROM ${quoteIdent(table)} ${where};`;
  if (question === 'monthly_trend') return `SELECT substr(${date}, 1, 7) AS month, SUM(COALESCE(${sales},0)) AS total_sales, SUM(COALESCE(${profit},0)) AS total_profit FROM ${quoteIdent(table)} ${where} GROUP BY substr(${date}, 1, 7) ORDER BY month;`;
  if (question === 'top_products') return `SELECT ${product} AS product_or_category, SUM(COALESCE(${sales},0)) AS total_sales, SUM(COALESCE(${profit},0)) AS total_profit FROM ${quoteIdent(table)} ${where} GROUP BY ${product} ORDER BY total_sales DESC LIMIT ${limitSql};`;
  if (question === 'top_customers') return `SELECT ${customer} AS customer_id${m.customerName ? `, ${quoteIdent(m.customerName)} AS customer_name` : ''}, COUNT(DISTINCT ${order}) AS orders, SUM(COALESCE(${sales},0)) AS total_sales, SUM(COALESCE(${profit},0)) AS total_profit FROM ${quoteIdent(table)} ${where} GROUP BY ${customer}${m.customerName ? `, ${quoteIdent(m.customerName)}` : ''} ORDER BY total_sales DESC LIMIT ${limitSql};`;
  if (question === 'low_margin') return `SELECT ${category} AS segment, SUM(COALESCE(${sales},0)) AS total_sales, SUM(COALESCE(${profit},0)) AS total_profit, SUM(COALESCE(${profit},0)) / NULLIF(SUM(COALESCE(${sales},0)), 0) AS profit_margin FROM ${quoteIdent(table)} ${where} GROUP BY ${category} HAVING total_sales > 0 ORDER BY profit_margin ASC, total_sales DESC LIMIT ${limitSql};`;
  if (question === 'churn_risk') return `SELECT ${customer} AS customer_id${m.customerName ? `, ${quoteIdent(m.customerName)} AS customer_name` : ''}, MAX(${date}) AS last_order_date, COUNT(DISTINCT ${order}) AS orders, SUM(COALESCE(${sales},0)) AS total_sales FROM ${quoteIdent(table)} ${where} GROUP BY ${customer}${m.customerName ? `, ${quoteIdent(m.customerName)}` : ''} ORDER BY last_order_date ASC LIMIT ${limitSql};`;
  if (question === 'data_issues') {
    const conditions = [];
    if (m.quality) conditions.push(`${quoteIdent(m.quality)} <> 'valid'`);
    if (m.exclude) conditions.push(`COALESCE(${quoteIdent(m.exclude)}, 0) = 1`);
    if (m.reason) conditions.push(`${quoteIdent(m.reason)} IS NOT NULL`);
    return `SELECT rowid AS _rowid, * FROM ${quoteIdent(table)} ${conditions.length ? `WHERE ${conditions.join(' OR ')}` : ''} LIMIT ${limitSql};`;
  }
  return `SELECT * FROM ${quoteIdent(table)} ${where} LIMIT ${limitSql};`;
}

function explainNoSqlQuestion(question, rows) {
  const n = rows?.length || 0;
  const messages = {
    overview: 'ภาพรวมใช้ดูตัวเลขหลักของธุรกิจ เช่น จำนวนรายการ ยอดขาย กำไร และ Profit Margin เพื่อประเมินสุขภาพธุรกิจเบื้องต้น',
    monthly_trend: 'แนวโน้มรายเดือนใช้ดูว่ายอดขายโตหรือลดลงตามเวลา เหมาะสำหรับดูฤดูกาลและผลของแคมเปญ',
    top_products: 'รายการขายดีที่สุดช่วยบอกว่าสินค้าหรือหมวดใดเป็นตัวขับเคลื่อนรายได้หลัก',
    top_customers: 'ลูกค้าซื้อสูงสุดช่วยระบุกลุ่มลูกค้ามูลค่าสูงที่ควรรักษาและทำแคมเปญเฉพาะกลุ่ม',
    low_margin: 'กลุ่มที่กำไรต่ำควรตรวจสอบต้นทุน ราคา หรือส่วนลด เพราะยอดขายสูงไม่ได้แปลว่าธุรกิจมีกำไรดี',
    churn_risk: 'ลูกค้าที่ซื้อล่าสุดนานที่สุดเป็นกลุ่มที่ควรพิจารณาทำแคมเปญดึงกลับหรือสอบถามความพึงพอใจ',
    data_issues: 'ข้อมูลที่มีปัญหาควรถูกแก้ไขหรือทำเครื่องหมายไม่นำไปคำนวณก่อนใช้ Dashboard จริง',
  };
  return `<div class="insight-item">${escapeHtml(messages[question] || 'ระบบสร้างคำถามให้อัตโนมัติ')}</div><div class="insight-item">พบผลลัพธ์ ${formatNumber(n,0)} แถว สามารถกดดู SQL ด้านล่างเพื่อเรียนรู้วิธีเขียนคำถามนี้เองในอนาคต</div>`;
}

function runNoSqlQuestion() {
  const table = $('noSqlTable')?.value || state.tables[0];
  if (!table) return toast('ยังไม่มีตารางข้อมูล กรุณานำเข้าไฟล์หรือสร้างข้อมูลตัวอย่างก่อน', 'error');
  const question = $('noSqlQuestion')?.value || 'overview';
  const limit = $('noSqlLimit')?.value || 10;
  const sql = buildNoSqlQuery(table, question, limit);
  try {
    const result = query(sql);
    $('noSqlGeneratedSql').textContent = sql;
    $('noSqlResult').innerHTML = renderTable(result.columns, result.rows);
    $('noSqlExplanation').innerHTML = explainNoSqlQuestion(question, result.rows);
  } catch (error) {
    $('noSqlExplanation').innerHTML = `<div class="issue-item error">ตอบคำถามไม่ได้: ${escapeHtml(error.message)} กรุณาตรวจว่าจับคู่คอลัมน์ครบหรือยัง</div>`;
    $('noSqlGeneratedSql').textContent = sql;
    $('noSqlResult').innerHTML = '';
  }
}

function populateSmartTableSelects() {
  const options = state.tables.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  ['noSqlTable'].forEach(id => { if ($(id)) { const old = $(id).value; $(id).innerHTML = options; if (old) $(id).value = old; } });
}

function renderAdvancedQualityIssues() {
  if (!$('smartQualityIssues')) return;
  const table = $('qualityTable')?.value || state.tables[0];
  if (!table) { $('smartQualityIssues').innerHTML = ''; return; }
  const cols = getColumns(table).map(c => c.name);
  const m = getRoleMapForTable(table);
  const conditions = [];
  if (m.quality) conditions.push(`${quoteIdent(m.quality)} <> 'valid'`);
  if (m.exclude) conditions.push(`COALESCE(${quoteIdent(m.exclude)}, 0) = 1`);
  if (m.reason) conditions.push(`${quoteIdent(m.reason)} IS NOT NULL`);
  for (const col of [m.sales, m.date, m.customer, m.productId]) {
    if (col) conditions.push(`${quoteIdent(col)} IS NULL OR TRIM(CAST(${quoteIdent(col)} AS TEXT)) = ''`);
  }
  if (!conditions.length) {
    $('smartQualityIssues').innerHTML = '<p class="status warn">ยังไม่พบคอลัมน์สำหรับตรวจปัญหาแบบละเอียด</p>';
    return;
  }
  const sql = `SELECT rowid AS _rowid, ${cols.map(quoteIdent).join(', ')} FROM ${quoteIdent(table)} WHERE ${conditions.map(c => `(${c})`).join(' OR ')} LIMIT 100;`;
  const rows = query(sql).rows;
  $('smartQualityIssues').innerHTML = rows.length ? renderEditableTable(table, cols, rows) : '<p class="status ok">ไม่พบปัญหาหลักจากกฎตรวจสอบแบบละเอียด</p>';
}

const originalBindEventsSmart = bindEvents;
bindEvents = function() {
  originalBindEventsSmart();
  const bind = (id, event, handler) => { if ($(id)) $(id).addEventListener(event, handler); };
  bind('smartFile', 'change', handleSmartFileChange);
  bind('smartSheet', 'change', previewSmartSheet);
  bind('smartHeaderRow', 'change', previewSmartSheet);
  bind('btnSmartPreview', 'click', previewSmartSheet);
  bind('btnSmartClear', 'click', clearSmartImport);
  bind('btnImportWizardRun', 'click', importSmartRows);
  ['smartDateFormat','smartEra','smartInvalidAction','smartMaskSensitive','smartAutoDateParts'].forEach(id => bind(id, 'change', () => { previewSmartSheet(); renderSmartValidation(); }));
  bind('btnRunNoSqlQuestion', 'click', runNoSqlQuestion);
  bind('noSqlTable', 'change', runNoSqlQuestion);
  bind('noSqlQuestion', 'change', runNoSqlQuestion);
  bind('noSqlLimit', 'change', runNoSqlQuestion);
};

const originalPopulateTableSelectsSmart = populateTableSelects;
populateTableSelects = function() {
  originalPopulateTableSelectsSmart();
  populateSmartTableSelects();
};

const originalSwitchTabSmart = switchTab;
switchTab = function(tabName) {
  originalSwitchTabSmart(tabName);
  if (tabName === 'askData') runNoSqlQuestion();
  if (tabName === 'importWizard') renderSmartValidation();
};

const originalRenderQualitySmart = renderQuality;
renderQuality = function() {
  originalRenderQualitySmart();
  renderAdvancedQualityIssues();
};


/* ------------------------------------------------------------
   SQL Learning Mode for beginners and SQL-curious users
------------------------------------------------------------ */
function getSqlLearningColumns(table) {
  const cols = table ? getColumns(table).map(c => c.name) : [];
  const numericCols = [];
  const textCols = [];
  const dateCols = [];
  if (table) {
    const sample = query(`SELECT * FROM ${quoteIdent(table)} LIMIT 80;`).rows;
    for (const col of cols) {
      const values = sample.map(r => r[col]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      const numericRatio = values.length ? values.filter(v => !isNaN(Number(v))).length / values.length : 0;
      const dateLike = /date|วันที่|วัน|year_month|month/i.test(col) || values.some(v => /^\d{4}-\d{1,2}(-\d{1,2})?/.test(String(v)) || /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(String(v)));
      if (numericRatio >= 0.75) numericCols.push(col);
      else textCols.push(col);
      if (dateLike) dateCols.push(col);
    }
  }
  const m = table ? getRoleMapForTable(table) : {};
  return {
    cols,
    numericCols,
    textCols,
    dateCols,
    groupDefault: m.category || m.product || m.productId || m.customer || textCols[0] || cols[0] || '',
    metricDefault: m.sales || m.profit || numericCols[0] || '',
    dateDefault: m.date || dateCols[0] || '',
    customerDefault: m.customer || '',
    profitDefault: m.profit || '',
  };
}

function setSelectOptions(id, values, preferred = '') {
  const el = $(id);
  if (!el) return;
  const old = el.value;
  el.innerHTML = values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v || '-')}</option>`).join('');
  if (preferred && values.includes(preferred)) el.value = preferred;
  else if (old && values.includes(old)) el.value = old;
}

function populateSqlLearningSelects() {
  if (!$('sqlLearnTable')) return;
  const options = state.tables.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  const tableSelects = ['sqlLearnTable'];
  for (const id of tableSelects) {
    const sel = $(id);
    if (!sel) continue;
    const old = sel.value;
    sel.innerHTML = options;
    if (old && state.tables.includes(old)) sel.value = old;
  }
  const table = $('sqlLearnTable').value || state.tables[0] || '';
  if (table && $('sqlLearnTable').value !== table) $('sqlLearnTable').value = table;
  const info = getSqlLearningColumns(table);
  const allWithBlank = [''].concat(info.cols);
  const groups = info.textCols.length ? info.textCols : info.cols;
  const metrics = info.numericCols.length ? info.numericCols : info.cols;
  setSelectOptions('sqlLearnGroup', groups, info.groupDefault);
  setSelectOptions('sqlBlankGroup', groups, info.groupDefault);
  setSelectOptions('sqlLearnMetric', metrics, info.metricDefault);
  setSelectOptions('sqlBlankMetric', metrics, info.metricDefault);
  setSelectOptions('sqlLearnDate', allWithBlank, info.dateDefault);
  setSelectOptions('sqlLearnFilterColumn', allWithBlank, info.groupDefault);
}

function sqlLearnWhere(table, extra = '') {
  const parts = [];
  if (hasColumn(table, '_exclude_from_analysis')) parts.push('COALESCE(_exclude_from_analysis, 0) = 0');
  if (extra) parts.push(extra);
  return parts.length ? `WHERE ${parts.join(' AND ')}` : '';
}

function buildSqlLearningQuery() {
  const table = $('sqlLearnTable')?.value || state.tables[0];
  if (!table) return '';
  const lesson = $('sqlLearnLesson')?.value || 'group_sum';
  const group = $('sqlLearnGroup')?.value;
  const metric = $('sqlLearnMetric')?.value;
  const date = $('sqlLearnDate')?.value;
  const filterCol = $('sqlLearnFilterColumn')?.value;
  const filterVal = $('sqlLearnFilterValue')?.value.trim();
  const limit = Number($('sqlLearnLimit')?.value || 10);
  const m = getRoleMapForTable(table);
  const whereExtra = filterCol && filterVal ? `${quoteIdent(filterCol)} = ${sqlLiteral(filterVal)}` : '';
  const where = sqlLearnWhere(table, whereExtra);
  const safeLimit = Math.max(1, Math.min(limit, 500));

  if (lesson === 'select_sample') {
    return `-- บทที่ 1: ดูข้อมูลตัวอย่างจากตาราง\nSELECT *\nFROM ${quoteIdent(table)}\n${where}\nLIMIT 20;`;
  }
  if (lesson === 'where_filter') {
    const col = filterCol || group || m.category || m.channel || m.region || getColumns(table)[0]?.name || '';
    const value = filterVal || 'ใส่ค่าที่ต้องการกรองตรงนี้';
    return `-- บทที่ 2: กรองข้อมูลด้วย WHERE\nSELECT *\nFROM ${quoteIdent(table)}\nWHERE ${hasColumn(table, '_exclude_from_analysis') ? 'COALESCE(_exclude_from_analysis, 0) = 0 AND ' : ''}${quoteIdent(col)} = ${sqlLiteral(value)}\nLIMIT ${safeLimit};`;
  }
  if (lesson === 'monthly_trend') {
    const d = date || m.date;
    if (!d || !metric) return '-- กรุณาเลือกคอลัมน์วันที่และคอลัมน์ตัวเลขก่อน';
    return `-- บทที่ 4: วิเคราะห์แนวโน้มรายเดือน\nSELECT\n  substr(${quoteIdent(d)}, 1, 7) AS year_month,\n  SUM(COALESCE(${quoteIdent(metric)}, 0)) AS total_value\nFROM ${quoteIdent(table)}\n${where}\nGROUP BY substr(${quoteIdent(d)}, 1, 7)\nORDER BY year_month;`;
  }
  if (lesson === 'top_customers') {
    const customer = m.customer || group;
    const customerName = m.customerName;
    if (!customer || !metric) return '-- กรุณาเลือกคอลัมน์ลูกค้าและคอลัมน์ตัวเลขก่อน';
    return `-- บทที่ 5: ลูกค้าที่ซื้อสูงสุด\nSELECT\n  ${quoteIdent(customer)} AS customer_id${customerName ? `,\n  MAX(${quoteIdent(customerName)}) AS customer_name` : ''},\n  SUM(COALESCE(${quoteIdent(metric)}, 0)) AS total_value\nFROM ${quoteIdent(table)}\n${where}\nGROUP BY ${quoteIdent(customer)}\nORDER BY total_value DESC\nLIMIT ${safeLimit};`;
  }
  if (lesson === 'profit_margin') {
    const g = group || m.category || m.product || m.region;
    const sales = m.sales || metric;
    const profit = m.profit || '';
    if (!g || !sales || !profit) return '-- ต้องมีคอลัมน์กลุ่ม ยอดขาย และกำไรก่อนจึงจะคำนวณ Profit Margin ได้';
    return `-- บทที่ 6: Profit Margin ตามกลุ่ม\nSELECT\n  ${quoteIdent(g)} AS group_name,\n  SUM(COALESCE(${quoteIdent(sales)}, 0)) AS total_sales,\n  SUM(COALESCE(${quoteIdent(profit)}, 0)) AS total_profit,\n  CASE\n    WHEN SUM(COALESCE(${quoteIdent(sales)}, 0)) = 0 THEN 0\n    ELSE SUM(COALESCE(${quoteIdent(profit)}, 0)) / SUM(COALESCE(${quoteIdent(sales)}, 0))\n  END AS profit_margin\nFROM ${quoteIdent(table)}\n${where}\nGROUP BY ${quoteIdent(g)}\nORDER BY total_sales DESC\nLIMIT ${safeLimit};`;
  }
  if (lesson === 'rfm_basic') {
    const customer = m.customer || group;
    const sales = m.sales || metric;
    const d = date || m.date;
    const order = m.order || '';
    if (!customer || !sales || !d) return '-- ต้องมี customer_id, order_date และ sales/net_sales ก่อนจึงจะทำ RFM ได้';
    return `-- บทที่ 7: RFM เบื้องต้น\nSELECT\n  ${quoteIdent(customer)} AS customer_id,\n  julianday((SELECT MAX(${quoteIdent(d)}) FROM ${quoteIdent(table)})) - julianday(MAX(${quoteIdent(d)})) AS recency_days,\n  ${order ? `COUNT(DISTINCT ${quoteIdent(order)})` : 'COUNT(*)'} AS frequency,\n  SUM(COALESCE(${quoteIdent(sales)}, 0)) AS monetary\nFROM ${quoteIdent(table)}\n${where}\nGROUP BY ${quoteIdent(customer)}\nORDER BY monetary DESC\nLIMIT ${safeLimit};`;
  }
  if (lesson === 'data_quality') {
    const cols = getColumns(table).map(c => c.name);
    const checks = [];
    for (const c of [m.date, m.sales, m.customer, m.productId, m.product]) {
      if (c) checks.push(`${quoteIdent(c)} IS NULL OR TRIM(CAST(${quoteIdent(c)} AS TEXT)) = ''`);
    }
    if (m.exclude) checks.push(`COALESCE(${quoteIdent(m.exclude)}, 0) = 1`);
    if (!checks.length) return `SELECT *\nFROM ${quoteIdent(table)}\nLIMIT ${safeLimit};`;
    return `-- บทที่ 8: หาแถวที่ควรตรวจสอบ\nSELECT\n  rowid AS _rowid,\n  ${cols.slice(0, 12).map(quoteIdent).join(',\n  ')}\nFROM ${quoteIdent(table)}\nWHERE ${checks.map(c => `(${c})`).join('\n   OR ')}\nLIMIT ${safeLimit};`;
  }
  const g = group || m.category || m.product || m.region || m.customer;
  const value = metric || m.sales || m.profit;
  if (!g || !value) return '-- กรุณาเลือกคอลัมน์กลุ่มและคอลัมน์ตัวเลขก่อน';
  return `-- บทที่ 3: รวมยอดด้วย SUM + GROUP BY\nSELECT\n  ${quoteIdent(g)} AS group_name,\n  SUM(COALESCE(${quoteIdent(value)}, 0)) AS total_value\nFROM ${quoteIdent(table)}\n${where}\nGROUP BY ${quoteIdent(g)}\nORDER BY total_value DESC\nLIMIT ${safeLimit};`;
}

function buildSqlFromBlanks() {
  const table = $('sqlLearnTable')?.value || state.tables[0];
  const group = $('sqlBlankGroup')?.value || $('sqlLearnGroup')?.value;
  const metric = $('sqlBlankMetric')?.value || $('sqlLearnMetric')?.value;
  if (!table || !group || !metric) return toast('กรุณาเลือกตาราง กลุ่ม และตัวเลขก่อน', 'error');
  const sql = `-- แบบฝึกเติมคำในช่องว่าง\nSELECT\n  ${quoteIdent(group)} AS group_name,\n  SUM(COALESCE(${quoteIdent(metric)}, 0)) AS total_value\nFROM ${quoteIdent(table)}\n${sqlLearnWhere(table)}\nGROUP BY ${quoteIdent(group)}\nORDER BY total_value DESC\nLIMIT 10;`;
  $('sqlLearnSql').value = sql;
  explainSqlLearning();
}

function buildSqlLearning() {
  const sql = buildSqlLearningQuery();
  if ($('sqlLearnSql')) $('sqlLearnSql').value = sql;
  explainSqlLearning();
  if ($('sqlLearnMessage')) {
    $('sqlLearnMessage').className = 'status ok';
    $('sqlLearnMessage').textContent = 'สร้าง SQL แล้ว ลองกด “รัน SQL ที่สร้างไว้” เพื่อดูผลลัพธ์';
  }
}

function explainSqlLearning() {
  const sql = $('sqlLearnSql')?.value || '';
  if (!$('sqlLearnExplanation')) return;
  if (!sql.trim()) {
    $('sqlLearnExplanation').innerHTML = 'ยังไม่มี SQL ให้ อธิบาย';
    return;
  }
  const lines = [];
  const clean = sql.replace(/--.*$/gm, '').trim();
  const add = (title, text) => lines.push(`<div class="insight-item"><strong>${escapeHtml(title)}:</strong> ${escapeHtml(text)}</div>`);
  if (/\bSELECT\b/i.test(clean)) add('SELECT', 'เลือกคอลัมน์หรือสูตรคำนวณที่ต้องการให้แสดงในผลลัพธ์');
  if (/\bFROM\b/i.test(clean)) add('FROM', 'ระบุว่าข้อมูลมาจากตารางใด');
  if (/\bWHERE\b/i.test(clean)) add('WHERE', 'กรองเฉพาะแถวที่ตรงเงื่อนไข เช่น ไม่เอาแถวที่ถูกทำเครื่องหมายว่าไม่ใช้คำนวณ');
  if (/\bSUM\s*\(/i.test(clean)) add('SUM()', 'รวมค่าตัวเลข เช่น ยอดขายรวม หรือกำไรรวม');
  if (/\bCOUNT\s*\(/i.test(clean)) add('COUNT()', 'นับจำนวนแถว รายการ หรือลูกค้าที่ไม่ซ้ำ');
  if (/\bGROUP BY\b/i.test(clean)) add('GROUP BY', 'รวมข้อมูลตามกลุ่ม เช่น ตามสินค้า หมวดสินค้า จังหวัด หรือเดือน');
  if (/\bORDER BY\b/i.test(clean)) add('ORDER BY', 'เรียงผลลัพธ์ เช่น เรียงยอดขายจากมากไปน้อย');
  if (/\bLIMIT\b/i.test(clean)) add('LIMIT', 'จำกัดจำนวนผลลัพธ์เพื่อให้อ่านง่ายและไม่โหลดหนัก');
  if (/julianday\s*\(/i.test(clean)) add('julianday()', 'ฟังก์ชัน SQLite สำหรับคำนวณจำนวนวัน ใช้บ่อยในการหา Recency/Churn');
  if (/substr\s*\(/i.test(clean)) add('substr()', 'ใน SQLite ใช้ตัดข้อความวันที่ เช่น 2026-08-13 ให้เหลือปี-เดือน 2026-08');
  $('sqlLearnExplanation').innerHTML = lines.length ? lines.join('') : '<div class="insight-item">ยังอธิบายไม่ได้ชัดเจน ลองใช้ Template ที่ระบบสร้างให้ก่อน</div>';
}

function humanizeSqlLearningError(error, sql) {
  const msg = String(error?.message || error || '');
  const tips = [];
  if (/near\s+"?FORM"?/i.test(msg) || /\bFORM\b/i.test(sql)) tips.push('คุณอาจพิมพ์ FROM ผิดเป็น FORM ให้แก้เป็น FROM');
  if (/no such table/i.test(msg)) tips.push('ไม่พบชื่อตารางนี้ ให้ดูรายชื่อตารางทางซ้ายหรือเลือกจากช่อง “เลือกตาราง”');
  if (/no such column/i.test(msg)) tips.push('ไม่พบชื่อคอลัมน์นี้ ให้เปิด Schema/Data Dictionary หรือตรวจชื่อคอลัมน์จาก Table Browser');
  if (/syntax error/i.test(msg)) tips.push('โครงสร้าง SQL อาจผิด เช่น ลืม comma, ลืม FROM, วงเล็บไม่ครบ หรือใช้คำสั่งผิดตำแหน่ง');
  if (/misuse of aggregate/i.test(msg)) tips.push('ถ้าใช้ SUM/COUNT พร้อมคอลัมน์กลุ่ม ควรมี GROUP BY คอลัมน์นั้นด้วย');
  if (/not authorized|readonly|DROP|DELETE|UPDATE/i.test(msg)) tips.push('คำสั่งนี้อาจเป็นคำสั่งแก้ไข/ลบข้อมูล ควรใช้ SELECT เพื่อฝึกวิเคราะห์ก่อน');
  if (!tips.length) tips.push('ลองเริ่มจาก Template ง่าย ๆ เช่น SELECT * FROM sales_data LIMIT 20; แล้วค่อยปรับทีละส่วน');
  return `<div class="issue-item error"><strong>Error เดิม:</strong> ${escapeHtml(msg)}</div>` + tips.map(t => `<div class="insight-item">${escapeHtml(t)}</div>`).join('');
}

function runSqlLearning() {
  const sql = $('sqlLearnSql')?.value.trim();
  if (!sql) return toast('ยังไม่มี SQL กรุณากดสร้าง SQL ก่อน', 'error');
  const started = performance.now();
  try {
    const result = query(sql);
    state.lastSqlColumns = result.columns;
    state.lastSqlRows = result.rows;
    $('sqlLearnResult').innerHTML = renderTable(result.columns, result.rows);
    $('sqlLearnMessage').className = 'status ok';
    $('sqlLearnMessage').textContent = `สำเร็จ: ${result.rows.length} rows, ${Math.round(performance.now() - started)} ms`;
    $('sqlLearnErrorHelp').innerHTML = '<div class="insight-item">ไม่มี Error รอบนี้ ลองเปลี่ยนคอลัมน์หรือเพิ่ม WHERE เพื่อเรียนรู้ต่อได้</div>';
    addHistory(sql, result.rows.length, Math.round(performance.now() - started));
    explainSqlLearning();
    renderSqlLearningChart();
  } catch (error) {
    console.error(error);
    $('sqlLearnMessage').className = 'status error';
    $('sqlLearnMessage').textContent = `SQL Error: ${error.message}`;
    $('sqlLearnErrorHelp').innerHTML = humanizeSqlLearningError(error, sql);
    $('sqlLearnResult').innerHTML = '';
  }
}

function renderSqlLearningChart() {
  if (!$('sqlLearnChart')) return;
  const rows = state.lastSqlRows || [];
  const cols = state.lastSqlColumns || [];
  if (!rows.length || !cols.length) {
    $('sqlLearnChart').textContent = 'ยังไม่มีผลลัพธ์สำหรับสร้างกราฟ';
    return;
  }
  const numericCols = cols.filter(c => rows.some(r => r[c] !== null && r[c] !== '' && !isNaN(Number(r[c]))));
  const labelCols = cols.filter(c => !numericCols.includes(c));
  const y = numericCols[0];
  const x = labelCols[0] || cols.find(c => c !== y);
  if (!x || !y) {
    $('sqlLearnChart').textContent = 'ผลลัพธ์นี้ยังไม่เหมาะกับกราฟอัตโนมัติ ต้องมีคอลัมน์กลุ่มและคอลัมน์ตัวเลขอย่างน้อยอย่างละ 1 คอลัมน์';
    return;
  }
  const topRows = rows.slice(0, 30);
  plot('sqlLearnChart', [{ x: topRows.map(r => String(r[x])), y: topRows.map(r => Number(r[y] || 0)), type: 'bar' }], { xaxis: { title: x, automargin: true }, yaxis: { title: y } });
}

function sendSqlLearningToEditor() {
  const sql = $('sqlLearnSql')?.value || '';
  if (!sql.trim()) return toast('ยังไม่มี SQL ให้ส่งไป SQL Editor', 'error');
  $('sqlInput').value = sql;
  switchTab('sql');
  toast('ส่ง SQL ไปยัง SQL Editor แล้ว', 'success');
}

const originalBindEventsSqlLearning = bindEvents;
bindEvents = function() {
  originalBindEventsSqlLearning();
  const bind = (id, event, handler) => { if ($(id)) $(id).addEventListener(event, handler); };
  bind('btnSqlLearnBuild', 'click', buildSqlLearning);
  bind('btnSqlLearnRun', 'click', runSqlLearning);
  bind('btnSqlLearnExplain', 'click', explainSqlLearning);
  bind('btnSqlLearnToEditor', 'click', sendSqlLearningToEditor);
  bind('btnSqlLearnChart', 'click', renderSqlLearningChart);
  bind('btnSqlBlankBuild', 'click', buildSqlFromBlanks);
  ['sqlLearnTable','sqlLearnLesson','sqlLearnGroup','sqlLearnMetric','sqlLearnDate','sqlLearnFilterColumn','sqlLearnLimit'].forEach(id => bind(id, 'change', () => { populateSqlLearningSelects(); buildSqlLearning(); }));
  bind('sqlLearnFilterValue', 'input', buildSqlLearning);
  bind('sqlLearnSql', 'input', explainSqlLearning);
};

const originalPopulateTableSelectsSqlLearning = populateTableSelects;
populateTableSelects = function() {
  originalPopulateTableSelectsSqlLearning();
  populateSqlLearningSelects();
};

const originalSwitchTabSqlLearning = switchTab;
switchTab = function(tabName) {
  originalSwitchTabSqlLearning(tabName);
  if (tabName === 'sqlLearn') {
    populateSqlLearningSelects();
    if (!$('sqlLearnSql')?.value.trim()) buildSqlLearning();
  }
};

init();
