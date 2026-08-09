/* Data Insight SQL Dashboard Pro */
const state = {
  SQL: null,
  db: null,
  dbName: 'untitled.db',
  tables: [],
  lastSqlRows: [],
  lastSqlColumns: [],
  queryHistory: [],
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
    setStatus('พร้อมใช้งาน: สร้าง DB ใหม่หรือ Import CSV ได้', 'ok');
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
  $('btnApiHealth').addEventListener('click', apiHealth);
  $('btnApiQuery').addEventListener('click', apiQuery);
  $('btnLoadTableau').addEventListener('click', loadTableau);
  $('btnLoadPowerBi').addEventListener('click', loadPowerBi);
  document.querySelectorAll('.sql-template').forEach(btn => btn.addEventListener('click', () => { $('sqlInput').value = btn.dataset.sql; runSqlEditor(); }));
  $('sqlInput').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runSqlEditor();
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === tabName));
  if (tabName === 'browser') renderBrowser();
  if (tabName === 'quality') renderQuality();
  if (tabName === 'dashboard') renderDashboard();
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
  profit REAL
);
INSERT INTO sales_data (order_id, order_date, customer_id, customer_name, category, product_name, region, channel, quantity, unit_price, discount, cost, order_status, gross_sales, discount_amount, net_sales, total_cost, profit) VALUES
('O1001','2026-01-03','C001','Anan','Food','Thai Rice Set','Bangkok','Online',2,1200,0.05,700,'Completed',2400,120,2280,1400,880),
('O1002','2026-01-05','C002','Mali','Drink','Premium Tea','Chiang Mai','Store',1,850,0,500,'Completed',850,0,850,500,350),
('O1003','2026-01-12','C001','Anan','Food','Organic Meal Box','Bangkok','Online',3,1500,0.1,800,'Completed',4500,450,4050,2400,1650),
('O1004','2026-02-01','C003','Suda','Beauty','Skincare Serum','Phuket','Online',4,2200,0.12,1300,'Completed',8800,1056,7744,5200,2544),
('O1005','2026-02-04','C004','Somchai','Food','Healthy Snack','Khon Kaen','Store',1,900,0,550,'Completed',900,0,900,550,350),
('O1006','2026-02-10','C005','Naree','Tech','Laptop Accessory','Bangkok','Online',1,12900,0.08,9800,'Completed',12900,1032,11868,9800,2068),
('O1007','2026-03-02','C002','Mali','Drink','Energy Drink','Chiang Mai','Store',6,250,0,120,'Completed',1500,0,1500,720,780),
('O1008','2026-03-05','C006','Kanda','Beauty','Beauty Set','Bangkok','Online',2,3200,0.15,1900,'Completed',6400,960,5440,3800,1640),
('O1009','2026-03-12','C003','Suda','Tech','Smart Device','Phuket','Partner',1,18500,0.05,14000,'Completed',18500,925,17575,14000,3575),
('O1010','2026-04-01','C007','Prasert','Food','Frozen Food','Udon Thani','Online',8,180,0,90,'Completed',1440,0,1440,720,720),
('O1011','2026-04-15','C008','Wilai','Drink','Coffee Pack','Bangkok','Store',5,320,0.03,140,'Completed',1600,48,1552,700,852),
('O1012','2026-05-03','C001','Anan','Beauty','Luxury Cream','Bangkok','Online',1,4500,0.2,2700,'Completed',4500,900,3600,2700,900),
('O1013','2026-05-09','C009','Pim','Tech','Tablet Bundle','Chiang Mai','Online',1,22000,0.1,17000,'Completed',22000,2200,19800,17000,2800),
('O1014','2026-06-02','C010','Kit','Food','Seafood Pack','Phuket','Partner',12,150,0,70,'Completed',1800,0,1800,840,960),
('O1016','2026-06-18','C006','Kanda','Tech','Wireless Earbuds','Bangkok','Online',1,15900,0.05,12000,'Completed',15900,795,15105,12000,3105),
('O1017','2026-07-04','C004','Somchai','Food','Rice Bowl','Khon Kaen','Store',4,450,0,240,'Completed',1800,0,1800,960,840),
('O1018','2026-07-10','C012','Dao','Drink','Juice Set','Udon Thani','Partner',9,180,0.02,80,'Completed',1620,32.4,1587.6,720,867.6),
('O1019','2026-07-21','C013','Win','Beauty','Face Mask','Bangkok','Online',2,2600,0.08,1600,'Completed',5200,416,4784,3200,1584),
('O1020','2026-08-01','C002','Mali','Tech','Phone Case','Chiang Mai','Online',1,19900,0.07,15000,'Completed',19900,1393,18507,15000,3507);
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
  generateMysqlSql();
}

function refreshTables() {
  if (!state.db) return;
  const result = query("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  state.tables = result.rows.map(r => r.name);
  const list = $('tableList');
  if (!state.tables.length) {
    list.className = 'table-list empty';
    list.textContent = 'ยังไม่มีตาราง';
    return;
  }
  list.className = 'table-list';
  list.innerHTML = state.tables.map(t => `<div class="table-item"><span>${escapeHtml(t)}</span><button data-open-table="${escapeHtml(t)}">ดู</button></div>`).join('');
  list.querySelectorAll('[data-open-table]').forEach(btn => btn.addEventListener('click', () => {
    $('browserTable').value = btn.dataset.openTable;
    switchTab('browser');
    renderBrowser();
  }));
}

function populateTableSelects() {
  const options = state.tables.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  ['dashTable', 'qualityTable', 'browserTable', 'baTable'].forEach(id => {
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
  const rows = query(`SELECT * FROM ${quoteIdent(table)} LIMIT 100000;`).rows;
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
  const baseRows = query(`SELECT * FROM ${quoteIdent(table)} LIMIT 100000;`).rows;
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

function plot(divId, data, layout) {
  const el = $(divId);
  if (!window.Plotly) { el.textContent = 'Plotly ไม่พร้อมใช้งาน'; return; }
  window.Plotly.newPlot(el, data, {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e5e7eb' },
    margin: { t: 20, r: 18, b: 48, l: 68 },
    ...layout,
  }, { responsive: true, displaylogo: false });
}

function renderTrendChart(table, metric, date) {
  if (!date) { $('trendChart').textContent = 'ไม่ได้เลือกคอลัมน์วันที่'; return; }
  const sql = `SELECT substr(${quoteIdent(date)}, 1, 7) AS period, SUM(COALESCE(${quoteIdent(metric)}, 0)) AS value FROM ${quoteIdent(table)} GROUP BY substr(${quoteIdent(date)}, 1, 7) ORDER BY period;`;
  const rows = query(sql).rows;
  plot('trendChart', [{ x: rows.map(r => r.period), y: rows.map(r => r.value), type: 'scatter', mode: 'lines+markers', line: { width: 3 } }], { xaxis: { title: date }, yaxis: { title: metric } });
}

function renderCategoryChart(table, metric, category) {
  if (!category) { $('categoryChart').textContent = 'ไม่ได้เลือกคอลัมน์กลุ่ม'; return; }
  const sql = `SELECT ${quoteIdent(category)} AS label, SUM(COALESCE(${quoteIdent(metric)}, 0)) AS value FROM ${quoteIdent(table)} GROUP BY ${quoteIdent(category)} ORDER BY value DESC LIMIT 15;`;
  const rows = query(sql).rows;
  plot('categoryChart', [{ x: rows.map(r => r.label), y: rows.map(r => r.value), type: 'bar' }], { xaxis: { title: category }, yaxis: { title: metric } });
}

function renderCustomerChart(table, metric, customer) {
  if (!customer) { $('customerChart').textContent = 'ไม่ได้เลือกคอลัมน์ลูกค้า'; return; }
  const sql = `SELECT ${quoteIdent(customer)} AS label, SUM(COALESCE(${quoteIdent(metric)}, 0)) AS value FROM ${quoteIdent(table)} GROUP BY ${quoteIdent(customer)} ORDER BY value DESC LIMIT 10;`;
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
  const cols = getColumns(table).map(c => c.name);
  let rows = query(`SELECT * FROM ${quoteIdent(table)} LIMIT 10000;`).rows;
  if (search) rows = rows.filter(r => cols.some(c => String(r[c] ?? '').toLowerCase().includes(search)));
  $('browserResult').innerHTML = renderTable(cols, rows.slice(0, limit));
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

init();
