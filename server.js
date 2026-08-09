require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');

const app = express();
const port = Number(process.env.PORT || 3000);
const maxRows = Number(process.env.MAX_QUERY_ROWS || 5000);
const queryTimeout = Number(process.env.QUERY_TIMEOUT_MS || 15000);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:8080' }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  multipleStatements: false,
  namedPlaceholders: true,
});

function quoteIdent(identifier) {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return `\`${identifier.replace(/`/g, '``')}\``;
}

function normalizeSql(sql) {
  return String(sql || '').trim().replace(/;\s*$/, '');
}

function isReadOnlySql(sql) {
  const cleaned = normalizeSql(sql)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();
  if (!/^(SELECT|WITH|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i.test(cleaned)) return false;
  if (/;/.test(cleaned)) return false;
  const dangerous = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|REPLACE|CREATE|GRANT|REVOKE|LOAD|LOCK|UNLOCK|CALL|SET|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i;
  return !dangerous.test(cleaned);
}

function ensureSelectLimit(sql) {
  const cleaned = normalizeSql(sql);
  if (/^(SHOW|DESCRIBE|DESC|EXPLAIN)\b/i.test(cleaned)) return cleaned;
  if (/\bLIMIT\s+\d+/i.test(cleaned)) return cleaned;
  return `${cleaned} LIMIT ${maxRows}`;
}

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, service: 'data-insight-mysql-api', mysql: rows[0].ok === 1 });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/schema/tables', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT table_name, table_type
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
       ORDER BY table_name`
    );
    res.json({ ok: true, rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/schema/tables/:table/columns', async (req, res) => {
  try {
    const table = req.params.table;
    quoteIdent(table);
    const [rows] = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_key
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = :table
       ORDER BY ordinal_position`,
      { table }
    );
    res.json({ ok: true, rows });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.get('/api/preview/:table', async (req, res) => {
  try {
    const table = quoteIdent(req.params.table);
    const limit = Math.min(Number(req.query.limit || 100), maxRows);
    const [rows, fields] = await pool.query({ sql: `SELECT * FROM ${table} LIMIT ${limit}`, timeout: queryTimeout });
    res.json({ ok: true, columns: fields.map(f => f.name), rows });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post('/api/query', async (req, res) => {
  try {
    const rawSql = normalizeSql(req.body.sql);
    if (!rawSql) return res.status(400).json({ ok: false, error: 'SQL is required' });
    if (process.env.ALLOW_WRITE_SQL !== 'true' && !isReadOnlySql(rawSql)) {
      return res.status(403).json({ ok: false, error: 'อนุญาตเฉพาะ read-only SQL: SELECT/WITH/SHOW/DESCRIBE/EXPLAIN และห้ามหลาย statement' });
    }
    const sql = process.env.ALLOW_WRITE_SQL === 'true' ? rawSql : ensureSelectLimit(rawSql);
    const [rows, fields] = await pool.query({ sql, timeout: queryTimeout });
    res.json({ ok: true, columns: fields ? fields.map(f => f.name) : [], rows: Array.isArray(rows) ? rows.slice(0, maxRows) : rows, appliedSql: sql });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/dashboard/sales', async (req, res) => {
  try {
    const table = quoteIdent(req.query.table || 'orders');
    const dateCol = quoteIdent(req.query.date || 'order_date');
    const salesExpr = String(req.query.sales || 'quantity * unit_price * (1 - discount)');
    const profitExpr = String(req.query.profit || '(quantity * unit_price * (1 - discount)) - (quantity * cost)');
    if (/[;]/.test(salesExpr + profitExpr)) throw new Error('Expressions must not contain semicolons');
    const [kpi] = await pool.query({ sql: `SELECT COUNT(*) AS total_rows, SUM(${salesExpr}) AS total_sales, SUM(${profitExpr}) AS total_profit FROM ${table}`, timeout: queryTimeout });
    const [trend] = await pool.query({ sql: `SELECT DATE_FORMAT(${dateCol}, '%Y-%m') AS period, SUM(${salesExpr}) AS total_sales, SUM(${profitExpr}) AS total_profit FROM ${table} GROUP BY DATE_FORMAT(${dateCol}, '%Y-%m') ORDER BY period LIMIT 60`, timeout: queryTimeout });
    res.json({ ok: true, kpi: kpi[0], trend });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.use((req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

app.listen(port, () => {
  console.log(`Data Insight MySQL API running at http://localhost:${port}`);
});
