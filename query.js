import mysql from 'mysql2/promise';

const allowedStarts = ['select', 'with', 'show', 'describe', 'desc', 'explain'];
const dangerousPattern = /\b(insert|update|delete|drop|alter|truncate|replace|create|grant|revoke|load|lock|unlock|call|set|into\s+outfile|into\s+dumpfile)\b/i;

function normalizeSql(sql) {
  return String(sql || '').trim().replace(/;\s*$/, '');
}

function isReadOnlySql(sql) {
  const cleaned = normalizeSql(sql)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  if (!allowedStarts.some(word => cleaned.toLowerCase().startsWith(word))) return false;
  if (cleaned.includes(';')) return false;
  return !dangerousPattern.test(cleaned);
}

function ensureLimit(sql) {
  const cleaned = normalizeSql(sql);
  if (/^(show|describe|desc|explain)\b/i.test(cleaned)) return cleaned;
  if (/\blimit\s+\d+/i.test(cleaned)) return cleaned;
  return `${cleaned} LIMIT ${Number(process.env.MAX_QUERY_ROWS || 1000)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const rawSql = normalizeSql(req.body?.sql);
    if (!rawSql) return res.status(400).json({ ok: false, error: 'SQL is required' });
    if (!isReadOnlySql(rawSql)) {
      return res.status(403).json({ ok: false, error: 'Only read-only SQL is allowed' });
    }

    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      ssl: process.env.MYSQL_SSL === 'true' ? {} : undefined,
      multipleStatements: false
    });

    const sql = ensureLimit(rawSql);
    const [rows, fields] = await connection.query(sql);
    await connection.end();

    res.status(200).json({
      ok: true,
      columns: fields ? fields.map(field => field.name) : [],
      rows: Array.isArray(rows) ? rows : [],
      appliedSql: sql
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
