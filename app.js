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
  cmEditor: null,
  browserPage: 0,
  browserSort: { col: null, dir: 1 },
  wizardColumns: [],
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
    initSqlEditor();
    if (!state.wizardColumns.length) {
      state.wizardColumns = [{ name: 'id', type: 'INTEGER', pk: true, notNull: false, dflt: '' }];
    }
    renderWizardColumns();
    bindEvents();
    refreshAll();
  } catch (error) {
    console.error(error);
    setStatus(`โหลด SQLite Engine ไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
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
  $('browserTable').addEventListener('change', () => { state.browserPage = 0; state.browserSort = { col: null, dir: 1 }; renderBrowser(); });
  $('browserSearch').addEventListener('input', () => { state.browserPage = 0; renderBrowser(); });
  $('browserLimit').addEventListener('change', () => { state.browserPage = 0; renderBrowser(); });
  $('dashTable').addEventListener('change', populateDashboardColumns);
  $('baTable').addEventListener('change', populateBusinessColumns);
  ['metricColumn', 'profitColumn', 'dateColumn', 'categoryColumn', 'customerColumn'].forEach(id => $(id).addEventListener('change', renderDashboard));
  ['baSalesColumn', 'baProfitColumn', 'baDateColumn', 'baCategoryColumn', 'baCustomerColumn', 'baProductColumn', 'baOrderColumn', 'baChurnDays'].forEach(id => $(id).addEventListener('change', renderBusinessAnalytics));
  $('qualityTable').addEventListener('change', renderQuality);
  $('btnGenerateMysql').addEventListener('click', generateMysqlSql);
  $('btnApiHealth').addEventListener('click', apiHealth);
  $('btnApiQuery').addEventListener('click', apiQuery);
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
  document.querySelectorAll('.sql-template').forEach(btn => btn.addEventListener('click', () => { setSqlValue(btn.dataset.sql); runSqlEditor(); }));
  $('sqlInput').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runSqlEditor();
  });
  $('btnExportSqlJson').addEventListener('click', exportLastSqlJson);
  $('btnExportTableJson').addEventListener('click', exportBrowserJson);
  $('btnDropTable').addEventListener('click', dropCurrentTable);
  $('btnTruncateTable').addEventListener('click', truncateCurrentTable);
  $('btnDeleteSelectedRows').addEventListener('click', deleteSelectedBrowserRows);
  $('btnBrowserPrev').addEventListener('click', () => changeBrowserPage(-1));
  $('btnBrowserNext').addEventListener('click', () => changeBrowserPage(1));
  $('btnAddWizardColumn').addEventListener('click', addWizardColumn);
  $('btnCreateWizardTable').addEventListener('click', createWizardTable);
  $('wizardTableName').addEventListener('input', renderWizardSqlPreview);
  document.addEventListener('click', handleWizardColumnClick);
  document.addEventListener('input', handleWizardColumnInput);
  document.addEventListener('click', handleBrowserSortClick);
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === tabName));
  if (tabName === 'sql' && state.cmEditor) setTimeout(() => state.cmEditor.refresh(), 0);
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

function initSqlEditor() {
  const textarea = $('sqlInput');
  if (!textarea || typeof CodeMirror === 'undefined') return;
  state.cmEditor = CodeMirror.fromTextArea(textarea, {
    mode: 'text/x-sql',
    lineNumbers: true,
    lineWrapping: true,
    matchBrackets: true,
    indentWithTabs: true,
    extraKeys: {
      'Ctrl-Enter': () => runSqlEditor(),
      'Cmd-Enter': () => runSqlEditor(),
      'Ctrl-Space': (cm) => cm.showHint({ hint: CodeMirror.hint.sql, tables: sqlHintTables(), completeSingle: false }),
      'Ctrl-S': () => { saveDb(); return false; },
    },
  });
  state.cmEditor.on('change', (cm) => cm.save());
}

function sqlHintTables() {
  const tables = {};
  (state.tables || []).forEach((t) => {
    try { tables[t] = getColumns(t).map((c) => c.name); } catch (_err) { /* ignore */ }
  });
  return tables;
}

function getSqlValue() {
  return (state.cmEditor ? state.cmEditor.getValue() : $('sqlInput').value).trim();
}

function setSqlValue(text) {
  if (state.cmEditor) state.cmEditor.setValue(text);
  else $('sqlInput').value = text;
}

function runSqlEditor() {
  const sql = getSqlValue();
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
  state.queryHistory = state.queryHistory.slice(0, 200);
  const host = $('queryHistory');
  host.className = 'history-list';
  host.innerHTML = state.queryHistory.map((h, i) => `<button class="history-item" data-history="${i}" title="คลิกเพื่อเปิดคำสั่งนี้อีกครั้ง">${escapeHtml(h.at)} • ${h.rows} rows • ${h.ms} ms • ${escapeHtml(h.sql)}</button>`).join('');
  host.querySelectorAll('[data-history]').forEach(btn => btn.addEventListener('click', () => {
    setSqlValue(state.queryHistory[Number(btn.dataset.history)].sql);
    switchTab('sql');
    runSqlEditor();
  }));
}

function renderBrowser() {
  const table = $('browserTable').value || state.tables[0];
  if (!table) { $('browserResult').innerHTML = 'ยังไม่มีตาราง'; $('browserPageInfo').textContent = ''; return; }
  const limit = Number($('browserLimit').value || 50);
  const search = $('browserSearch').value.trim().toLowerCase();
  const editable = isEditableTable(table);
  if (editable) ensureGovernanceColumns(table);
  const cols = getColumns(table).map(c => c.name);
  let rows = query(`SELECT ${editable ? 'rowid AS _rowid, ' : ''}* FROM ${quoteIdent(table)} LIMIT 20000;`).rows;
  if (search) rows = rows.filter(r => ['_rowid', ...cols].some(c => String(r[c] ?? '').toLowerCase().includes(search)));

  const sort = state.browserSort;
  if (sort.col && (sort.col === '_rowid' || cols.includes(sort.col))) {
    rows = rows.slice().sort((a, b) => {
      const av = a[sort.col];
      const bv = b[sort.col];
      const an = Number(av);
      const bn = Number(bv);
      let cmp;
      if (av !== null && av !== '' && bv !== null && bv !== '' && !Number.isNaN(an) && !Number.isNaN(bn)) cmp = an - bn;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'th');
      return cmp * sort.dir;
    });
  }

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  if (state.browserPage >= totalPages) state.browserPage = totalPages - 1;
  if (state.browserPage < 0) state.browserPage = 0;
  const start = state.browserPage * limit;
  const pageRows = rows.slice(start, start + limit);

  $('browserResult').innerHTML = editable ? renderEditableTable(table, cols, pageRows, sort) : renderSortableTable(cols, pageRows, sort);
  $('browserPageInfo').textContent = totalRows ? `หน้า ${state.browserPage + 1} / ${totalPages} • ทั้งหมด ${totalRows} แถว` : 'ไม่มีข้อมูล';
  bindBrowserCheckboxEvents();
}

function changeBrowserPage(delta) {
  state.browserPage += delta;
  if (state.browserPage < 0) state.browserPage = 0;
  renderBrowser();
}

function handleBrowserSortClick(event) {
  const th = event.target.closest('[data-sort-col]');
  if (!th || !th.closest('#browserResult')) return;
  const col = th.dataset.sortCol;
  if (state.browserSort.col === col) state.browserSort.dir *= -1;
  else state.browserSort = { col, dir: 1 };
  state.browserPage = 0;
  renderBrowser();
}

function sortArrow(col, sort) {
  if (sort.col !== col) return '';
  return sort.dir === 1 ? ' <span class="sort-arrow">▲</span>' : ' <span class="sort-arrow">▼</span>';
}

function renderSortableTable(columns, rows, sort) {
  if (!columns || !columns.length) return '<p class="status warn">ไม่มีข้อมูลแสดงผล</p>';
  const thead = `<thead><tr>${columns.map(c => `<th class="sortable" data-sort-col="${escapeHtml(c)}">${escapeHtml(c)}${sortArrow(c, sort)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

function bindBrowserCheckboxEvents() {
  const selectAll = $('browserSelectAll');
  if (!selectAll) return;
  selectAll.addEventListener('change', () => {
    document.querySelectorAll('#browserResult .row-select').forEach((cb) => { cb.checked = selectAll.checked; });
  });
}

function deleteSelectedBrowserRows() {
  const table = $('browserTable').value || state.tables[0];
  if (!table) return toast('ยังไม่มีตาราง', 'error');
  if (!isEditableTable(table)) return toast('ลบหลายแถวได้เฉพาะตารางข้อมูลจริงเท่านั้น', 'error');
  const ids = Array.from(document.querySelectorAll('#browserResult .row-select:checked'))
    .map((cb) => Number(cb.dataset.rowid))
    .filter(Number.isFinite);
  if (!ids.length) return toast('ยังไม่ได้เลือกแถวที่จะลบ', 'error');
  if (!confirm(`ยืนยันลบ ${ids.length} แถวจากตาราง "${table}" การลบนี้ย้อนกลับไม่ได้`)) return;
  try {
    run(`DELETE FROM ${quoteIdent(table)} WHERE rowid IN (${ids.join(',')});`);
    toast(`ลบ ${ids.length} แถวสำเร็จ`, 'success');
    renderBrowser();
    refreshAll();
  } catch (error) {
    toast(`ลบแถวไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function dropCurrentTable() {
  const table = $('browserTable').value || state.tables[0];
  if (!table) return toast('ยังไม่มีตารางให้ลบ', 'error');
  if (!confirm(`ยืนยันลบตาราง "${table}" ทั้งโครงสร้างและข้อมูล การลบนี้ย้อนกลับไม่ได้`)) return;
  try {
    run(`DROP TABLE ${quoteIdent(table)};`);
    toast(`ลบตาราง "${table}" สำเร็จ`, 'success');
    state.browserPage = 0;
    refreshAll();
  } catch (error) {
    toast(`ลบตารางไม่สำเร็จ: ${error.message}`, 'error');
  }
}

function truncateCurrentTable() {
  const table = $('browserTable').value || state.tables[0];
  if (!table) return toast('ยังไม่มีตารางให้ล้างข้อมูล', 'error');
  if (!confirm(`ยืนยันล้างข้อมูลทั้งหมดในตาราง "${table}" (โครงสร้างตารางยังอยู่) การลบนี้ย้อนกลับไม่ได้`)) return;
  try {
    run(`DELETE FROM ${quoteIdent(table)};`);
    toast(`ล้างข้อมูลตาราง "${table}" สำเร็จ`, 'success');
    state.browserPage = 0;
    renderBrowser();
    refreshAll();
  } catch (error) {
    toast(`ล้างข้อมูลไม่สำเร็จ: ${error.message}`, 'error');
  }
}

const WIZARD_SQLITE_TYPES = ['INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC'];

function renderWizardColumns() {
  const host = $('wizardColumns');
  if (!host) return;
  host.innerHTML = state.wizardColumns.map((col, idx) => `
    <div class="wizard-col-row" data-idx="${idx}">
      <input type="text" data-wizard-field="name" data-idx="${idx}" value="${escapeHtml(col.name)}" placeholder="ชื่อคอลัมน์" />
      <select data-wizard-field="type" data-idx="${idx}">
        ${WIZARD_SQLITE_TYPES.map((t) => `<option value="${t}" ${col.type === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
      <label class="form-check"><input type="checkbox" data-wizard-field="pk" data-idx="${idx}" ${col.pk ? 'checked' : ''} /> PK</label>
      <label class="form-check"><input type="checkbox" data-wizard-field="notNull" data-idx="${idx}" ${col.notNull ? 'checked' : ''} /> NOT NULL</label>
      <input type="text" data-wizard-field="dflt" data-idx="${idx}" value="${escapeHtml(col.dflt)}" placeholder="ค่าเริ่มต้น (ถ้ามี)" />
      <button type="button" class="small-btn" data-wizard-remove="${idx}" ${state.wizardColumns.length <= 1 ? 'disabled' : ''}>ลบ</button>
    </div>`).join('');
  renderWizardSqlPreview();
}

function addWizardColumn() {
  state.wizardColumns.push({ name: '', type: 'TEXT', pk: false, notNull: false, dflt: '' });
  renderWizardColumns();
}

function handleWizardColumnClick(event) {
  const btn = event.target.closest('[data-wizard-remove]');
  if (!btn) return;
  const idx = Number(btn.dataset.wizardRemove);
  if (state.wizardColumns.length <= 1) return;
  state.wizardColumns.splice(idx, 1);
  renderWizardColumns();
}

function handleWizardColumnInput(event) {
  const field = event.target.dataset.wizardField;
  if (!field) return;
  const idx = Number(event.target.dataset.idx);
  if (!state.wizardColumns[idx]) return;
  if (field === 'pk' || field === 'notNull') state.wizardColumns[idx][field] = event.target.checked;
  else state.wizardColumns[idx][field] = event.target.value;
  renderWizardSqlPreview();
}

function buildWizardSql() {
  const name = safeIdentifier($('wizardTableName').value || 'new_table');
  const colsSql = state.wizardColumns
    .filter((c) => c.name.trim())
    .map((c) => {
      let line = `  ${quoteIdent(safeIdentifier(c.name))} ${c.type}`;
      if (c.pk) line += ' PRIMARY KEY';
      if (c.notNull) line += ' NOT NULL';
      const dflt = c.dflt.trim();
      if (dflt) line += ` DEFAULT ${/^-?\d+(\.\d+)?$/.test(dflt) ? dflt : `'${dflt.replaceAll("'", "''")}'`}`;
      return line;
    });
  if (!colsSql.length) return `CREATE TABLE ${quoteIdent(name)} (\n  -- เพิ่มอย่างน้อย 1 คอลัมน์\n);`;
  return `CREATE TABLE ${quoteIdent(name)} (\n${colsSql.join(',\n')}\n);`;
}

function renderWizardSqlPreview() {
  const el = $('wizardSqlPreview');
  if (el) el.textContent = buildWizardSql();
}

function createWizardTable() {
  if (!$('wizardTableName').value.trim()) return toast('กรุณาใส่ชื่อตาราง', 'error');
  if (!state.wizardColumns.some((c) => c.name.trim())) return toast('กรุณาใส่ชื่อคอลัมน์อย่างน้อย 1 คอลัมน์', 'error');
  const sql = buildWizardSql();
  try {
    run(sql);
    toast(`สร้างตาราง "${safeIdentifier($('wizardTableName').value)}" สำเร็จ`, 'success');
    $('wizardTableName').value = '';
    state.wizardColumns = [{ name: 'id', type: 'INTEGER', pk: true, notNull: false, dflt: '' }];
    renderWizardColumns();
    refreshAll();
  } catch (error) {
    toast(`สร้างตารางไม่สำเร็จ: ${error.message}`, 'error');
  }
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

function renderEditableTable(table, columns, rows, sort = state.browserSort) {
  const displayCols = ['action', '_rowid', ...columns];
  const thead = `<thead><tr>
    <th class="checkbox-cell"><input type="checkbox" id="browserSelectAll" title="เลือกทั้งหมดในหน้านี้" /></th>
    ${displayCols.map(c => c === 'action'
      ? '<th>action</th>'
      : `<th class="sortable" data-sort-col="${escapeHtml(c)}">${escapeHtml(c)}${sortArrow(c, sort)}</th>`).join('')}
  </tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>
    <td class="checkbox-cell"><input type="checkbox" class="row-select" data-rowid="${escapeHtml(r._rowid)}" /></td>
    ${displayCols.map(c => {
      if (c === 'action') return `<td><button class="small-btn" data-edit-row="${escapeHtml(r._rowid)}" data-table="${escapeHtml(table)}">แก้ไข</button></td>`;
      return `<td>${escapeHtml(r[c])}</td>`;
    }).join('')}
  </tr>`).join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
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
  const tbody = `<tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

function exportLastSqlCsv() {
  if (!state.lastSqlColumns.length) return toast('ยังไม่มีผลลัพธ์ SQL ให้ Export', 'error');
  downloadText('sql_result.csv', rowsToCsv(state.lastSqlColumns, state.lastSqlRows), 'text/csv;charset=utf-8');
}

function exportLastSqlJson() {
  if (!state.lastSqlColumns.length) return toast('ยังไม่มีผลลัพธ์ SQL ให้ Export', 'error');
  downloadText('sql_result.json', JSON.stringify(state.lastSqlRows, null, 2), 'application/json;charset=utf-8');
}

function exportBrowserCsv() {
  const table = $('browserTable').value || state.tables[0];
  if (!table) return toast('ยังไม่มีตาราง', 'error');
  const cols = getColumns(table).map(c => c.name);
  const rows = query(`SELECT * FROM ${quoteIdent(table)};`).rows;
  downloadText(`${table}.csv`, rowsToCsv(cols, rows), 'text/csv;charset=utf-8');
}

function exportBrowserJson() {
  const table = $('browserTable').value || state.tables[0];
  if (!table) return toast('ยังไม่มีตาราง', 'error');
  const rows = query(`SELECT * FROM ${quoteIdent(table)};`).rows;
  downloadText(`${table}.json`, JSON.stringify(rows, null, 2), 'application/json;charset=utf-8');
}

function safeSpssVar(name) {
  let v = String(name || 'var').trim().replace(/[^A-Za-z0-9_]/g, '_');
  if (!/^[A-Za-z_]/.test(v)) v = 'v_' + v;
  return v.slice(0, 64) || 'var_col';
}

function buildSpssSyntaxText() {
  const tableSelect = $('browserTable');
  const table = (tableSelect && tableSelect.value) || state.tables[0];
  let fileHint = 'sample_sales.csv';
  let varLines;

  if (table) {
    fileHint = `${table}.csv`;
    const cols = getColumns(table);
    varLines = cols.map(c => {
      const t = String(c.type || '').toUpperCase();
      const isNumeric = /INT|REAL|FLOA|DOUB|NUM|DEC/.test(t);
      return `    ${safeSpssVar(c.name)} ${isNumeric ? 'F12.2' : 'A80'}`;
    }).join('\n');
  } else {
    varLines = [
      'order_id A20', 'order_date A10', 'customer_id A20', 'customer_name A80',
      'product_id A20', 'category A40', 'product_name A80', 'region A40',
      'channel A40', 'quantity F8.0', 'unit_price F12.2', 'discount F8.4',
      'cost F12.2', 'order_status A30', 'gross_sales F12.2', 'discount_amount F12.2',
      'net_sales F12.2', 'total_cost F12.2', 'profit F12.2'
    ].map(l => `    ${l}`).join('\n');
  }

  return `* สร้างอัตโนมัติจาก Data Insight SQL Dashboard Pro.
* 1) Export CSV ของตาราง "${table || 'sample_sales'}" จากแท็บ Table Browser หรือ SQL ก่อน แล้วนำไฟล์ไปวางในโฟลเดอร์เดียวกับที่เปิด SPSS หรือแก้ path ด้านล่างให้ตรงตำแหน่งไฟล์.
GET DATA
  /TYPE=TXT
  /FILE='${fileHint}'
  /ENCODING='UTF8'
  /DELCASE=LINE
  /DELIMITERS=","
  /QUALIFIER='"'
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
${varLines}.
EXECUTE.

* 2) ดูภาพรวมเบื้องต้น (ปรับรายชื่อตัวแปรตามข้อมูลจริง).
FREQUENCIES VARIABLES=ALL.
DESCRIPTIVES VARIABLES=ALL /STATISTICS=MEAN STDDEV MIN MAX.
`;
}

function downloadSpssSyntaxTemplate() {
  downloadText('SPSS_Syntax_Template.sps', buildSpssSyntaxText(), 'text/plain;charset=utf-8');
  toast('ดาวน์โหลด SPSS Syntax แล้ว', 'success');
}

function downloadSpssExcelTemplate() {
  if (typeof XLSX === 'undefined') {
    toast('โหลดไลบรารีสร้างไฟล์ Excel ไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่', 'error');
    return;
  }
  const dataRows = [
    ['order_id', 'order_date', 'customer_id', 'customer_name', 'product_id', 'category', 'product_name', 'region', 'channel', 'quantity', 'unit_price', 'discount', 'cost', 'order_status'],
    ['OD0001', '2026-01-05', 'C0001', 'ตัวอย่างลูกค้า 1', 'P0001', 'เครื่องดื่ม', 'ตัวอย่างสินค้า 1', 'กรุงเทพ', 'Online', 3, 120, 0.05, 80, 'Completed'],
    ['OD0002', '2026-01-06', 'C0002', 'ตัวอย่างลูกค้า 2', 'P0002', 'ขนม', 'ตัวอย่างสินค้า 2', 'เชียงใหม่', 'Store', 1, 60, 0, 35, 'Completed'],
    ['OD0003', '2026-01-07', 'C0001', 'ตัวอย่างลูกค้า 1', 'P0003', 'เครื่องดื่ม', 'ตัวอย่างสินค้า 3', 'กรุงเทพ', 'Online', 2, 90, 0.1, 55, 'Pending']
  ];
  const codebookRows = [
    ['คอลัมน์', 'ความหมาย', 'Type ใน SPSS', 'Measure'],
    ['order_id', 'รหัสคำสั่งซื้อ', 'String', 'Nominal'],
    ['order_date', 'วันที่สั่งซื้อ', 'Date', 'Scale'],
    ['customer_id', 'รหัสลูกค้า', 'String', 'Nominal'],
    ['category', 'หมวดหมู่สินค้า', 'String', 'Nominal'],
    ['region', 'ภูมิภาค', 'String', 'Nominal'],
    ['channel', 'ช่องทางขาย', 'String', 'Nominal'],
    ['quantity', 'จำนวนที่ซื้อ', 'Numeric', 'Scale'],
    ['unit_price', 'ราคาต่อหน่วย', 'Numeric', 'Scale'],
    ['discount', 'ส่วนลด (สัดส่วน 0-1)', 'Numeric', 'Scale'],
    ['cost', 'ต้นทุนต่อหน่วย', 'Numeric', 'Scale'],
    ['order_status', 'สถานะคำสั่งซื้อ', 'String', 'Nominal']
  ];
  const checklistRows = [
    ['ข้อตรวจสอบก่อนวิเคราะห์ใน SPSS'],
    ['หัวตารางไม่มีช่องว่างหรือสัญลักษณ์แปลก'],
    ['คอลัมน์ตัวเลขตั้ง Type เป็น Numeric ไม่ใช่ String'],
    ['ตัวแปรกลุ่ม (category, region, channel) ตั้ง Measure เป็น Nominal'],
    ['แถวที่ข้อมูลผิดหรือว่างถูกทำเครื่องหมายหรือแก้ไขแล้วในเว็บนี้ก่อน Export']
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dataRows), 'Data_for_SPSS');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(codebookRows), 'Codebook');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(checklistRows), 'Checklist');
  XLSX.writeFile(wb, 'SPSS_Excel_Data_Entry_Template.xlsx');
  toast('ดาวน์โหลด Excel Template แล้ว', 'success');
}

function downloadSpssExcelGuide() {
  const text = `# คู่มือ Excel → SPSS สำหรับผู้เริ่มต้น

## 1. เตรียมไฟล์ Excel
- เปิดไฟล์ SPSS_Excel_Data_Entry_Template.xlsx (ดาวน์โหลดจากปุ่มถัดไป) หรือใช้ไฟล์ CSV ที่ Export จากเว็บนี้
- ชีต Data_for_SPSS คือข้อมูลจริง 1 แถวต่อ 1 record, แถวแรกเป็นชื่อคอลัมน์
- ชีต Codebook อธิบายความหมายแต่ละคอลัมน์และ Type/Measure ที่แนะนำ
- ชีต Checklist ใช้ตรวจข้อมูลก่อนนำเข้า SPSS

## 2. นำเข้า SPSS
1. เปิด IBM SPSS Statistics
2. ไปที่เมนู File > Import Data > Excel...
3. เลือกไฟล์ Excel ที่เตรียมไว้
4. เลือกชีต Data_for_SPSS
5. ติ๊กเปิด "Read variable names from the first row of data"
6. กด OK

## 3. ตั้งค่า Variable View
- ไปที่แท็บ Variable View (มุมล่างซ้ายของ SPSS)
- ตั้งค่า Type ให้ตรงกับข้อมูล เช่น ตัวเลข = Numeric, ข้อความ = String, วันที่ = Date
- ตั้งค่า Label เป็นคำอธิบายภาษาที่อ่านง่าย
- ตั้งค่า Measure: ตัวเลขต่อเนื่อง = Scale, กลุ่ม/หมวดหมู่ = Nominal, อันดับ = Ordinal

## 4. ตรวจสอบก่อนวิเคราะห์
- ดูชีต Checklist ในไฟล์ Excel Template ประกอบ
- ตรวจว่าไม่มีคอลัมน์ที่หัวตารางมีช่องว่างหรือสัญลักษณ์แปลก
- ตรวจว่าค่าว่าง (missing) ถูกกำหนดใน Missing Values ให้เหมาะสม

## 5. เลือกสถิติให้ตรงคำถาม
- Analyze > Descriptive Statistics > Frequencies/Descriptives สำหรับภาพรวม
- Analyze > Descriptive Statistics > Crosstabs สำหรับดูความสัมพันธ์ตัวแปรกลุ่ม
- Analyze > Correlate / Regression สำหรับดูความสัมพันธ์เชิงตัวเลข
`;
  downloadText('SPSS_Excel_Import_Guide_TH.md', text, 'text/markdown;charset=utf-8');
  toast('ดาวน์โหลดคู่มือแล้ว', 'success');
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

init();
