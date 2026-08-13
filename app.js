import {
  mean, median, sampleVariance as variance, sampleStdDev as stdev, standardError,
  adjustedFisherPearsonSkewness as skewness, correlationTest, simpleLinearRegression,
  independentTTest, pairedTTest, chiSquareIndependence, oneWayAnova, studentTInv,
  leveneTest, pairwisePostHoc, mannWhitneyU, wilcoxonSignedRank, kruskalWallis
} from './statistics.js';

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
  learningChart: null,
  lastLearningResult: null,
  dashboardCharts: [],
  activeAnalysis: 'descriptives',
  totalRows: 0,
  snapshots: [],
};
const MAX_SNAPSHOTS = 5;

const analysisNames = {
  descriptives: 'Descriptive Statistics / สถิติเชิงพรรณนา',
  frequencies: 'Frequencies / ตารางแจกแจงความถี่',
  crosstabs: 'Crosstabs / ตารางไขว้',
  correlation: 'Pearson Correlation / สหสัมพันธ์เพียร์สัน',
  regression: 'Simple Linear Regression / การถดถอยเชิงเส้นอย่างง่าย',
  independentT: 'Independent-Samples t Test / t-test สองกลุ่มอิสระ',
  pairedT: 'Paired-Samples t Test / t-test แบบจับคู่',
  chiSquare: 'Chi-Square Independence / ไคสแควร์ทดสอบความเป็นอิสระ',
  anova: 'One-Way ANOVA / การวิเคราะห์ความแปรปรวนทางเดียว',
  mannWhitney: 'Mann-Whitney U Test / แมนน์-วิตนีย์ยู',
  wilcoxon: 'Wilcoxon Signed-Rank Test / วิลคอกซัน (จับคู่)',
  kruskalWallis: 'Kruskal-Wallis H Test / ครัสคัล-วอลลิส',
};

const METHOD_SOURCES = {
  nistScale: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm',
  nistSkew: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda35b.htm',
  nistTwoT: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm',
  nistPairedT: 'https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm',
  nistChi: 'https://www.itl.nist.gov/div898/handbook/prc/section4/prc45.htm',
  nistAnova: 'https://www.itl.nist.gov/div898/handbook/ppc/section2/ppc231.htm',
  nistRegression: 'https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd141.htm',
  nistCorrelation: 'https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/correlat.htm',
  ibmCorrelation: 'https://www.ibm.com/docs/en/spss-statistics/32.0.0?topic=features-bivariate-correlations',
  ibmTTest: 'https://www.ibm.com/docs/en/spss-statistics/32.0.0?topic=tests-independent-samples-t-test',
  ibmAnova: 'https://www.ibm.com/docs/en/spss-statistics/32.0.0?topic=features-one-way-anova',
  ibmSpss: 'https://www.ibm.com/docs/en/spss-statistics/32.0.0?topic=spss-statistics-32-documentation',
  excel: 'https://support.microsoft.com/en-us/excel/',
  powerQuery: 'https://learn.microsoft.com/en-us/power-query/power-query-what-is-power-query',
  powerBi: 'https://learn.microsoft.com/th-th/power-bi/fundamentals/power-bi-overview',
  tableau: 'https://help.tableau.com/current/guides/get-started-tutorial/en-us/get-started-tutorial-home.htm',
  rProject: 'https://www.r-project.org/about.html',
  sqlite: 'https://sqlite.org/lang_select.html',
  nistMannWhitney: 'https://itl.nist.gov/div898/software/dataplot/refman2/auxillar/mannwhit.htm',
  nistWilcoxon: 'https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/signrank.htm',
  nistKruskal: 'https://www.itl.nist.gov/div898/handbook/prc/section4/prc41.htm',
};

const analysisInfo = {
  descriptives: {
    th: 'สรุปลักษณะของตัวแปรเชิงปริมาณ เช่น ค่าเฉลี่ย มัธยฐาน ส่วนเบี่ยงเบนมาตรฐาน ความแปรปรวน ค่าต่ำสุด ค่าสูงสุด และความเบ้ เพื่อเข้าใจศูนย์กลาง การกระจาย และรูปร่างของข้อมูล',
    en: 'Summarizes a quantitative variable using center, spread, range, and shape statistics such as mean, median, sample standard deviation, variance, minimum, maximum, and adjusted skewness.',
    formula: 's² = Σ(xᵢ − x̄)² / (n − 1);  s = √s²;  SE = s/√n',
    refs: [['NIST: Measures of Scale', METHOD_SOURCES.nistScale], ['NIST: Skewness', METHOD_SOURCES.nistSkew]],
  },
  frequencies: {
    th: 'นับจำนวนและร้อยละของแต่ละค่า เหมาะกับตัวแปรเชิงกลุ่ม/อันดับ และใช้ตรวจค่าที่ผิดปกติหรือข้อมูลสูญหาย',
    en: 'Counts each observed value and reports Percent, Valid Percent, and Cumulative Percent; useful for categorical/ordinal variables and data-quality checks.',
    formula: 'Percent = frequency / all cases × 100; Valid Percent = frequency / nonmissing cases × 100',
    refs: [['IBM SPSS Statistics', METHOD_SOURCES.ibmSpss]],
  },
  crosstabs: {
    th: 'สร้างตารางไขว้ระหว่างตัวแปรเชิงกลุ่มสองตัวเพื่อดูรูปแบบการกระจายร่วมกัน โดยตัดกรณีที่ขาดข้อมูลในตัวแปรใดตัวแปรหนึ่งออกแบบ pairwise',
    en: 'Builds a two-way contingency table for two categorical variables using complete pairs, making joint category patterns easier to inspect.',
    formula: 'Cell Count = number of complete cases in row category i and column category j',
    refs: [['NIST: Contingency Tables', METHOD_SOURCES.nistChi]],
  },
  correlation: {
    th: 'วัดความแรงและทิศทางของความสัมพันธ์เชิงเส้นระหว่างตัวแปรเชิงปริมาณสองตัว ค่า r อยู่ระหว่าง −1 ถึง +1 และใช้ complete pairs เท่านั้น',
    en: 'Measures the strength and direction of a linear relationship between two quantitative variables. Pearson r ranges from −1 to +1 and uses complete pairs only.',
    formula: 'r = Σ[(xᵢ−x̄)(yᵢ−ȳ)] / √(Σ(xᵢ−x̄)² Σ(yᵢ−ȳ)²)',
    refs: [['IBM: Bivariate Correlations', METHOD_SOURCES.ibmCorrelation], ['NIST: Pearson Correlation Formula', METHOD_SOURCES.nistCorrelation]],
  },
  regression: {
    th: 'ประมาณสมการเส้นตรง ŷ = b₀ + b₁x ด้วยวิธีกำลังสองน้อยที่สุด พร้อม R², Adjusted R², ANOVA F-test, ค่าสัมประสิทธิ์, Standard Error, t-test, p-value และช่วงความเชื่อมั่น 95%',
    en: 'Fits ŷ = b₀ + b₁x by ordinary least squares and reports model fit, ANOVA, coefficient standard errors, t tests, p-values, and 95% confidence intervals.',
    formula: 'b₁ = Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²;  b₀ = ȳ − b₁x̄',
    refs: [['NIST: Linear Least Squares', METHOD_SOURCES.nistRegression]],
  },
  independentT: {
    th: 'เปรียบเทียบค่าเฉลี่ยของสองกลุ่มที่เป็นอิสระต่อกัน โปรแกรมรายงานทั้ง Welch t-test (ไม่สมมติความแปรปรวนเท่ากัน) และ pooled t-test (สมมติความแปรปรวนเท่ากัน)',
    en: 'Compares means of two independent groups and reports both Welch’s unequal-variance t test and the pooled equal-variance t test.',
    formula: 'Welch: t = (x̄₁−x̄₂) / √(s₁²/n₁ + s₂²/n₂), with Welch–Satterthwaite df',
    refs: [['NIST: Two-Sample t Test', METHOD_SOURCES.nistTwoT], ['IBM: Independent-Samples T Test', METHOD_SOURCES.ibmTTest]],
  },
  pairedT: {
    th: 'เปรียบเทียบค่าเฉลี่ยของข้อมูลสองชุดที่จับคู่กัน เช่น ก่อน–หลัง โดยคำนวณผลต่างภายในคู่ก่อนแล้วทดสอบว่าค่าเฉลี่ยของผลต่างเท่ากับศูนย์หรือไม่',
    en: 'Compares paired measurements such as before/after data by testing whether the mean within-pair difference is zero.',
    formula: 'dᵢ = xᵢ−yᵢ;  t = d̄ / (s_d/√n);  df = n−1',
    refs: [['NIST: Paired Observations', METHOD_SOURCES.nistPairedT]],
  },
  chiSquare: {
    th: 'ทดสอบว่าตัวแปรเชิงกลุ่มสองตัวเป็นอิสระต่อกันหรือไม่จากตารางไขว้ พร้อม Expected Count และ Cramér’s V สำหรับขนาดความสัมพันธ์',
    en: 'Tests whether two categorical variables are independent using observed versus expected cell counts and reports Cramér’s V as an association effect size.',
    formula: 'Eᵢⱼ = rowᵢ×columnⱼ / n;  χ² = Σ(Oᵢⱼ−Eᵢⱼ)²/Eᵢⱼ;  df=(r−1)(c−1)',
    refs: [['NIST: Chi-Square Independence', METHOD_SOURCES.nistChi]],
  },
  anova: {
    th: 'เปรียบเทียบค่าเฉลี่ยของตั้งแต่สองกลุ่มขึ้นไปด้วยอัตราส่วนความแปรปรวนระหว่างกลุ่มต่อความแปรปรวนภายในกลุ่ม พร้อม Eta-squared และ Omega-squared',
    en: 'Compares means across two or more independent groups using the ratio of between-group to within-group variance and reports eta-squared and omega-squared effect sizes.',
    formula: 'F = MS_between / MS_within;  df_between=k−1;  df_within=N−k',
    refs: [['NIST: One-Way ANOVA', METHOD_SOURCES.nistAnova], ['IBM: One-Way ANOVA', METHOD_SOURCES.ibmAnova]],
  },
  mannWhitney: {
    th: 'ทางเลือกแบบไม่อิงพารามิเตอร์ของ Independent t-test ใช้เมื่อข้อมูลไม่เป็นโค้งปกติหรือมี outlier มาก โดยเปรียบเทียบอันดับ (rank) แทนค่าเฉลี่ยจริง',
    en: 'Nonparametric alternative to the independent-samples t test. Compares the ranks of two independent groups instead of their raw means; useful when data are skewed, ordinal, or contain outliers.',
    formula: 'U₁ = R₁ − n₁(n₁+1)/2;  z = (U₁ − μ_U ± 0.5) / σ_U (tie-corrected, normal approximation)',
    refs: [['NIST Dataplot: Mann-Whitney U', METHOD_SOURCES.nistMannWhitney]],
  },
  wilcoxon: {
    th: 'ทางเลือกแบบไม่อิงพารามิเตอร์ของ Paired t-test ใช้กับผลต่างรายคู่ (ก่อน–หลัง) ที่ไม่เป็นโค้งปกติ โดยจัดอันดับขนาดผลต่างแล้วเปรียบเทียบผลรวมอันดับบวก/ลบ',
    en: 'Nonparametric alternative to the paired-samples t test. Ranks the absolute within-pair differences and compares the sum of positive vs. negative ranks; zero differences are excluded.',
    formula: 'W₊ = Σ ranks of positive dᵢ;  z = (W₊ − μ_W ± 0.5) / σ_W (tie-corrected, normal approximation)',
    refs: [['NIST Dataplot: Signed Rank Test', METHOD_SOURCES.nistWilcoxon]],
  },
  kruskalWallis: {
    th: 'ทางเลือกแบบไม่อิงพารามิเตอร์ของ One-Way ANOVA ใช้เมื่อข้อมูลไม่เป็นโค้งปกติ โดยจัดอันดับข้อมูลทั้งหมดรวมกันแล้วเปรียบเทียบผลรวมอันดับของแต่ละกลุ่ม',
    en: 'Nonparametric alternative to one-way ANOVA for comparing three or more independent groups. Ranks all observations together and compares each group\u2019s rank sum; a significant result does not identify which pairs differ.',
    formula: 'H = 12/(N(N+1)) · Σ(Rᵢ²/nᵢ) − 3(N+1), tie-corrected; H ~ χ²(k−1)',
    refs: [['NIST e-Handbook §7.4.1: Kruskal-Wallis', METHOD_SOURCES.nistKruskal]],
  },
};

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ===== IndexedDB persistence: auto-save the working database + dashboard so a
// refresh or accidental tab close does not lose the user's work. =====
const IDB_NAME = 'das-workspace';
const IDB_STORE = 'kv';

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, value) {
  const db = await idbOpen();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function idbGet(key) {
  const db = await idbOpen();
  const value = await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}
async function idbClear() {
  const db = await idbOpen();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

let autosaveTimer = null;
function scheduleAutosave() {
  if (!state.db) return;
  clearTimeout(autosaveTimer);
  const el = $('#autosaveStatus');
  if (el) el.textContent = 'กำลังบันทึก... / Saving...';
  autosaveTimer = setTimeout(saveWorkspace, 700);
}
async function saveWorkspace() {
  if (!state.db) return;
  try {
    const binary = state.db.export();
    await idbSet('database', binary);
    await idbSet('meta', {
      fileName: state.fileName,
      currentTable: state.currentTable,
      dashboardCharts: state.dashboardCharts,
    });
    const el = $('#autosaveStatus');
    if (el) el.textContent = `บันทึกอัตโนมัติแล้ว ${new Date().toLocaleTimeString('th-TH')} / Auto-saved`;
  } catch (err) {
    console.warn('Autosave failed', err);
    const el = $('#autosaveStatus');
    if (el) el.textContent = 'บันทึกอัตโนมัติไม่สำเร็จ / Auto-save failed';
  }
}
async function restoreWorkspace() {
  try {
    const binary = await idbGet('database');
    if (!binary) return false;
    const meta = (await idbGet('meta')) || {};
    state.db?.close();
    state.db = new state.SQL.Database(new Uint8Array(binary));
    state.fileName = meta.fileName || 'Browser Data Workbench';
    state.dashboardCharts = Array.isArray(meta.dashboardCharts) ? meta.dashboardCharts : [];
    await refreshDatabaseUI(meta.currentTable || null);
    const el = $('#autosaveStatus');
    if (el) el.textContent = 'กู้คืนข้อมูลจากครั้งก่อนแล้ว / Restored your last session';
    return true;
  } catch (err) {
    console.warn('Restore failed', err);
    return false;
  }
}
async function clearWorkspaceStorage() {
  try { await idbClear(); } catch (err) { console.warn('Clear storage failed', err); }
}

// ===== In-session snapshot history: a lightweight safety net so a mistaken
// DROP/DELETE/UPDATE/ALTER or a file import that overwrites the current
// database can be undone within the same tab session. Kept in memory only
// (not persisted) — capped at MAX_SNAPSHOTS to bound memory use. =====
function takeSnapshot(label) {
  if (!state.db) return;
  try {
    state.snapshots.push({ label, time: new Date(), binary: state.db.export() });
    if (state.snapshots.length > MAX_SNAPSHOTS) state.snapshots.shift();
    renderHistoryPanel();
  } catch (err) {
    console.warn('Snapshot failed', err);
  }
}

function renderHistoryPanel() {
  const countEl = $('#historyCount');
  if (countEl) countEl.textContent = state.snapshots.length;
  const panel = $('#historyPanel');
  if (!panel) return;
  if (!state.snapshots.length) {
    panel.innerHTML = '<div class="empty-state" style="min-height:60px">ยังไม่มีประวัติให้กู้คืน / No snapshots yet — one is taken automatically before risky queries or file imports</div>';
    return;
  }
  panel.innerHTML = [...state.snapshots].reverse().map((s, revIdx) => {
    const idx = state.snapshots.length - 1 - revIdx;
    return `<div class="history-item"><span title="${escapeHtml(s.label)}">${s.time.toLocaleTimeString('th-TH')} · ${escapeHtml(s.label.slice(0, 46))}${s.label.length > 46 ? '…' : ''}</span><button class="text-btn" data-restore="${idx}">กู้คืน / Restore</button></div>`;
  }).join('');
  $$('[data-restore]').forEach(btn => btn.addEventListener('click', () => restoreSnapshot(Number(btn.dataset.restore))));
}

async function restoreSnapshot(index) {
  const snap = state.snapshots[index];
  if (!snap || !state.SQL) return;
  const ok = confirm(`กู้คืนไปยัง "${snap.label}" (${snap.time.toLocaleTimeString('th-TH')})?\nข้อมูลปัจจุบันที่ยังไม่ได้บันทึกจะถูกแทนที่\n\nRestore to this snapshot? Your current unsaved changes will be replaced.`);
  if (!ok) return;
  state.db?.close();
  state.db = new state.SQL.Database(new Uint8Array(snap.binary));
  await refreshDatabaseUI();
  scheduleAutosave();
  toast('กู้คืนข้อมูลแล้ว / Restored');
}

function destructiveSqlLabel(sql) {
  const oneLine = sql.replace(/\s+/g, ' ').trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 60)}…` : oneLine;
}

function setStatus(message) { $('#statusText').textContent = message; }
function safeId(name) { return `"${String(name).replaceAll('"', '""')}"`; }
function fmt(n, digits = 2) { return Number.isFinite(n) ? n.toLocaleString('th-TH', { maximumFractionDigits: digits }) : '—'; }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

function setBootMessage(msg) { const el = $('#bootMessage'); if (el) el.textContent = msg; }

function hideBootLoader() {
  const el = $('#bootLoader');
  if (!el) return;
  el.classList.add('hidden');
  setTimeout(() => el.remove(), 400);
}

function showBootRetry(msg) {
  setBootMessage(msg);
  const actions = $('#bootActions');
  if (actions) actions.hidden = false;
}

function timeoutAfter(ms, message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

async function init() {
  const bootRetryBtn = $('#bootRetryBtn');
  bootRetryBtn?.addEventListener('click', () => window.location.reload());

  let eventsAlreadyBound = false;
  try {
    if (typeof initSqlJs !== 'function' || !window.XLSX || !window.Chart) {
      throw new Error('CDN library not loaded');
    }
    setBootMessage('กำลังเริ่มต้น SQLite engine... / Starting SQLite engine...');
    state.SQL = await Promise.race([
      initSqlJs({ locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/${file}` }),
      timeoutAfter(20000, 'SQLite engine timed out'),
    ]);
    state.db = new state.SQL.Database();
    $('#engineStatus').textContent = 'SQLite พร้อมใช้งาน';
    setStatus('SQLite engine ready');
    bindEvents();
    eventsAlreadyBound = true;
    setBootMessage('กำลังกู้คืนข้อมูลครั้งก่อน... / Checking for a saved session...');
    const restored = await restoreWorkspace();
    if (!restored) {
      setBootMessage('กำลังเตรียมข้อมูลตัวอย่าง... / Preparing sample data...');
      await loadSampleData(false);
    }
    hideBootLoader();
  } catch (err) {
    console.error(err);
    $('#engineStatus').textContent = 'โหลด SQLite ไม่สำเร็จ';
    setStatus('SQLite engine error');
    if (!eventsAlreadyBound) bindEvents();
    showBootRetry('โหลดเครื่องมือไม่สำเร็จ อาจเกิดจากอินเทอร์เน็ตหรือตัวบล็อกโฆษณา / Failed to load required libraries — check your connection or disable ad blockers, then retry.');
  }
}

window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
});

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
  $('#historyBtn').addEventListener('click', () => {
    const panel = $('#historyPanel');
    panel.hidden = !panel.hidden;
    if (!panel.hidden) renderHistoryPanel();
  });
  $('#tableSearch').addEventListener('input', renderTableList);
  $('#runAnalysisBtn').addEventListener('click', runAnalysis);
  $('#clearOutputBtn').addEventListener('click', () => { $('#analysisOutput').className = 'analysis-output empty-state'; $('#analysisOutput').textContent = 'ผลวิเคราะห์จะแสดงในรูปแบบ Output Viewer'; });
  $$('.analysis-item').forEach(btn => btn.addEventListener('click', () => { state.activeAnalysis = btn.dataset.analysis; $$('.analysis-item').forEach(x => x.classList.remove('active')); btn.classList.add('active'); renderAnalysisControls(); }));
  $('#buildChartBtn').addEventListener('click', buildChart);
  $('#addDashboardBtn').addEventListener('click', addChartToDashboard);
  $('#resetDashboardBtn').addEventListener('click', () => {
    if (!state.dashboardCharts.length) return;
    if (!confirm('ล้างกราฟทั้งหมดใน Dashboard?\nClear all charts from the Dashboard? This cannot be undone.')) return;
    state.dashboardCharts = [];
    renderDashboard();
    scheduleAutosave();
  });
  $$('.quick-card').forEach(btn => btn.addEventListener('click', () => {
    const a = btn.dataset.action;
    if (a === 'open-file') $('#fileInput').click();
    if (a === 'go-smart-import') switchView('smart-import');
    if (a === 'go-sql-learning') switchView('sql-learning');
    if (a === 'go-data-quality') switchView('data-quality');
    if (a === 'go-sql') switchView('sql');
    if (a === 'go-spss') switchView('spss');
    if (a === 'go-chart') switchView('charts');
  }));

  $('#smartFileInput')?.addEventListener('change', e => e.target.files[0] && smartImportFile(e.target.files[0]));
  $('#smartUseCurrentBtn')?.addEventListener('click', renderSmartImport);
  $('#smartGoQualityBtn')?.addEventListener('click', () => switchView('data-quality'));
  $('#learningBuildBtn')?.addEventListener('click', buildLearningSql);
  $('#learningRunBtn')?.addEventListener('click', runLearningSql);
  $('#learningSendToSqlBtn')?.addEventListener('click', sendLearningSqlToEditor);
  $('#learningChartBtn')?.addEventListener('click', buildLearningChart);
  $('#learningLesson')?.addEventListener('change', buildLearningSql);
  $('#learningTable')?.addEventListener('change', () => { populateLearningSelectors(); buildLearningSql(); });
  $('#learningGroup')?.addEventListener('change', buildLearningSql);
  $('#learningMetric')?.addEventListener('change', buildLearningSql);
  $('#dqScanBtn')?.addEventListener('click', renderDataQualityCenter);
  $('#privacyScanBtn')?.addEventListener('click', renderPrivacyCenter);
}


function switchView(view) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(v => v.classList.remove('active'));
  $(`#view-${view}`).classList.add('active');
  $(`.nav-item[data-view="${view}"]`)?.classList.add('active');
  if (view === 'dashboard') renderDashboard();
  if (view === 'charts') populateChartSelectors();
  if (view === 'smart-import') renderSmartImport();
  if (view === 'sql-learning') { populateLearningSelectors(); buildLearningSql(); }
  if (view === 'data-quality') renderDataQualityCenter();
  if (view === 'privacy') renderPrivacyCenter();
  if (view === 'guide') renderGuide();
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
  if (state.totalRows > 0 || getTableNames().length > 0) {
    const ok = confirm('สร้างฐานข้อมูลใหม่จะลบข้อมูลปัจจุบันทั้งหมด (มีจุดกู้คืนในประวัติหากเปลี่ยนใจ)\nCreate a new database? This clears all current data. A restore point will be kept in History if you change your mind.');
    if (!ok) return;
    takeSnapshot('Before "New Database"');
  }
  state.db?.close();
  state.db = new state.SQL.Database();
  state.fileName = 'new-database.sqlite';
  state.currentTable = null; state.rows = []; state.columns = []; state.schema = []; state.totalRows = 0;
  state.dashboardCharts = [];
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
      order_id TEXT,
      order_date TEXT,
      day INTEGER,
      month INTEGER,
      month_name TEXT,
      year INTEGER,
      year_th INTEGER,
      quarter TEXT,
      year_month TEXT,
      weekday_name TEXT,
      region TEXT,
      province TEXT,
      category TEXT,
      product_id TEXT,
      product_name TEXT,
      customer_id TEXT,
      customer_name TEXT,
      channel TEXT,
      salesperson TEXT,
      units INTEGER,
      quantity INTEGER,
      unit_price REAL,
      discount REAL,
      cost REAL,
      revenue REAL,
      gross_sales REAL,
      discount_amount REAL,
      net_sales REAL,
      total_cost REAL,
      profit REAL,
      satisfaction REAL,
      order_status TEXT,
      _data_quality_status TEXT,
      _exclude_from_analysis INTEGER,
      _exclude_reason TEXT,
      _last_updated_at TEXT
    );
  `);
  const regions = ['Bangkok','Northeast','North','South','Central'];
  const provinces = ['Bangkok','Khon Kaen','Chiang Mai','Phuket','Ubon Ratchathani'];
  const categories = ['Electronics','Furniture','Office','Food','Beauty'];
  const products = [
    ['P001','Thai Rice Set'], ['P002','Premium Tea'], ['P003','Organic Meal Box'],
    ['P004','Skincare Serum'], ['P005','Office Chair'], ['P006','Wireless Keyboard']
  ];
  const customers = [['C001','Anan'],['C002','Mali'],['C003','Suda'],['C004','Krit'],['C005','Pim'],['C006','Nok']];
  const channels = ['Online','Store','Marketplace','Phone'];
  const people = ['Anan','Mali','Krit','Pim','Nok','Beam'];
  const stmt = state.db.prepare(`INSERT INTO sales VALUES (${Array.from({length:37},()=>'?').join(',')})`);
  for (let i = 1; i <= 180; i++) {
    const d = new Date(Date.UTC(2026, (i - 1) % 8, ((i * 7) % 27) + 1));
    const parsed = normalizeDateObject(d);
    const qty = 1 + (i * 3) % 18;
    const unitPrice = 120 + (i * 137) % 2200;
    const discount = (i % 12 === 0) ? 0.15 : ((i % 5) * 0.03);
    const cost = Math.round(unitPrice * (0.52 + (i % 7) * 0.025));
    const grossSales = Math.round(qty * unitPrice * 100) / 100;
    const discountAmount = Math.round(grossSales * discount * 100) / 100;
    const netSales = Math.round((grossSales - discountAmount) * 100) / 100;
    const totalCost = Math.round(qty * cost * 100) / 100;
    const profit = Math.round((netSales - totalCost) * 100) / 100;
    const satisfaction = i % 23 === 0 ? null : Math.round((2.7 + ((i * 17) % 23) / 10) * 10) / 10;
    const [productId, productName] = products[i % products.length];
    const [customerId, customerName] = customers[i % customers.length];
    const status = i % 19 === 0 ? 'Cancelled' : 'Completed';
    const exclude = status === 'Cancelled' ? 1 : 0;
    stmt.run([
      i, `O${String(1000+i).padStart(4,'0')}`, parsed.order_date, parsed.day, parsed.month,
      parsed.month_name, parsed.year, parsed.year_th, parsed.quarter, parsed.year_month, parsed.weekday_name,
      regions[i % regions.length], provinces[i % provinces.length], categories[i % categories.length], productId, productName,
      customerId, customerName, channels[i % channels.length], people[i % people.length], qty, qty, unitPrice, discount, cost,
      netSales, grossSales, discountAmount, netSales, totalCost, profit, satisfaction, status,
      exclude ? 'warning' : 'valid', exclude, exclude ? 'Cancelled order' : '', new Date().toISOString()
    ]);
  }
  stmt.free();
  state.fileName = 'sample-sales.sqlite';
  await refreshDatabaseUI('sales');
  if (showToast) toast('โหลดข้อมูลตัวอย่างแล้ว');
}

async function importFile(file) {
  try {
    setStatus(`กำลังเปิด ${file.name}...`);
    if (state.db && getTableNames().length > 0) takeSnapshot(`Before importing ${file.name}`);
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
  else { state.rows=[];state.columns=[];state.schema=[];state.totalRows=0;renderAll(); }
  scheduleAutosave();
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
  const countResult = state.db.exec(`SELECT COUNT(*) AS n FROM ${safeId(state.currentTable)}`)[0];
  state.totalRows = Number(countResult?.values?.[0]?.[0] ?? 0);

  // Statistical procedures must use the complete table, not a silent preview sample.
  // The Data View still renders only the first 500 rows for UI performance.
  const res = state.db.exec(`SELECT * FROM ${safeId(state.currentTable)}`)[0];
  state.columns = res?.columns || state.schema.map(x=>x.name);
  state.rows = res?.values.map(vals => Object.fromEntries(state.columns.map((c,i)=>[c, vals[i]]))) || [];
  renderAll();
}

function renderAll() {
  renderMetrics(); renderDataTable(); renderVariableView(); renderProfile(); renderAnalysisControls(); populateChartSelectors(); renderDashboard();
  $('#dataSubtitle').textContent = state.currentTable
    ? `${state.currentTable} · Preview 500 rows / แสดงตัวอย่าง 500 แถว · Analysis uses all ${state.totalRows.toLocaleString()} rows / วิเคราะห์จากข้อมูลทั้งหมด`
    : 'แสดงข้อมูลแบบตาราง';
  $('#statusStats').textContent = `${state.totalRows.toLocaleString()} rows · ${state.columns.length} columns`;
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
  $('#metricRows').textContent = state.totalRows.toLocaleString();
  $('#metricColumns').textContent = state.columns.length;
  $('#metricMissing').textContent = `${fmt(p.missingPct,1)}%`;
  $('#dashRows').textContent = state.totalRows.toLocaleString(); $('#dashCols').textContent=state.columns.length; $('#dashNumeric').textContent=p.numeric; $('#dashMissing').textContent=`${fmt(p.missingPct,1)}%`;
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
    ['Analysis rows / แถวที่ใช้วิเคราะห์', state.totalRows.toLocaleString()],
    ['Columns / ตัวแปร',state.columns.length],
    ['Numeric variables / ตัวแปรตัวเลข',p.numeric],
    ['Missing cells / ค่าว่าง',`${p.missing.toLocaleString()} (${fmt(p.missingPct,1)}%)`],
    ['Data preview / ตัวอย่างหน้า Data View','500 rows']
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
  const isDestructive = /\b(drop|delete|truncate|update|alter)\b/i.test(sql);
  if (isDestructive) takeSnapshot(destructiveSqlLabel(sql));
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

function isMissing(v) {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function numericValues(col) {
  return state.rows
    .map(r => r[col])
    .filter(v => !isMissing(v) && Number.isFinite(Number(v)))
    .map(Number);
}

function pairedNumeric(xc, yc) {
  const pairs = [];
  for (const row of state.rows) {
    if (isMissing(row[xc]) || isMissing(row[yc])) continue;
    const x = Number(row[xc]);
    const y = Number(row[yc]);
    if (Number.isFinite(x) && Number.isFinite(y)) pairs.push([x, y]);
  }
  return { x: pairs.map(p => p[0]), y: pairs.map(p => p[1]) };
}

function optionList(cols = state.columns, selected = null) {
  return cols.map((c, i) => `<option value="${escapeHtml(c)}" ${(selected === c || (selected === null && i === 0)) ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function fmtP(p) {
  if (!Number.isFinite(p)) return '—';
  if (p < 0.001) return '&lt; .001';
  return p.toFixed(3);
}

function decisionText(p, alpha = 0.05) {
  if (!Number.isFinite(p)) return 'p-value is unavailable / ไม่สามารถคำนวณ p-value ได้';
  return p < alpha
    ? `Statistically significant at α = ${alpha} (reject H₀) / มีนัยสำคัญทางสถิติที่ระดับ α = ${alpha} (ปฏิเสธ H₀)`
    : `Not statistically significant at α = ${alpha} (fail to reject H₀) / ยังไม่มีหลักฐานเพียงพอที่จะปฏิเสธ H₀ ที่ระดับ α = ${alpha}`;
}

function sourceLinks(refs = []) {
  return refs.map(([label, url]) => `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`).join('');
}

function methodCardHtml(key) {
  const info = analysisInfo[key];
  if (!info) return '';
  return `<div class="method-info">
    <div class="method-info-head"><strong>${escapeHtml(analysisNames[key])}</strong><span>TH + EN</span></div>
    <p><b>TH:</b> ${escapeHtml(info.th)}</p>
    <p><b>EN:</b> ${escapeHtml(info.en)}</p>
    <div class="formula-box"><span>Formula / สูตร</span><code>${escapeHtml(info.formula)}</code></div>
    <div class="source-links">${sourceLinks(info.refs)}</div>
  </div>`;
}

function uniqueValidValues(col) {
  const map = new Map();
  for (const row of state.rows) {
    const v = row[col];
    if (isMissing(v)) continue;
    const key = String(v);
    if (!map.has(key)) map.set(key, v);
  }
  return [...map.values()].sort(naturalCompare);
}

function naturalCompare(a, b) {
  const na = Number(a), nb = Number(b);
  const aNum = !isMissing(a) && Number.isFinite(na);
  const bNum = !isMissing(b) && Number.isFinite(nb);
  if (aNum && bNum) return na - nb;
  return String(a).localeCompare(String(b), 'th', { numeric: true, sensitivity: 'base' });
}

function categoricalColumns(maxUnique = 50) {
  return state.columns.filter(c => {
    const n = uniqueValidValues(c).length;
    return n >= 2 && n <= maxUnique;
  });
}

function selectDifferentSecond(selectId, cols) {
  const el = $(selectId);
  if (el && cols.length > 1) el.selectedIndex = 1;
}

function renderAnalysisControls() {
  $('#analysisTitle').textContent = analysisNames[state.activeAnalysis];
  const box = $('#analysisControls');
  if (!state.columns.length) {
    box.innerHTML = '<div class="empty-state">Import data before analysis / กรุณานำเข้าข้อมูลก่อนเริ่มวิเคราะห์</div>';
    return;
  }
  const nums = state.columns.filter(c => numericValues(c).length >= 2);
  const cats = categoricalColumns(50);
  const intro = methodCardHtml(state.activeAnalysis);
  let controls = '';

  if (state.activeAnalysis === 'descriptives') {
    controls = `<label>Variable / ตัวแปร<select id="aVar">${optionList(nums)}</select></label>`;
  } else if (state.activeAnalysis === 'frequencies') {
    controls = `<label>Variable / ตัวแปร<select id="aVar">${optionList()}</select></label>`;
  } else if (state.activeAnalysis === 'crosstabs') {
    const choices = cats.length ? cats : state.columns;
    controls = `<label>Row Variable / ตัวแปรแถว<select id="aRow">${optionList(choices)}</select></label><label>Column Variable / ตัวแปรคอลัมน์<select id="aCol">${optionList(choices)}</select></label>`;
  } else if (state.activeAnalysis === 'correlation') {
    controls = `<label>Variable X / ตัวแปร X<select id="aX">${optionList(nums)}</select></label><label>Variable Y / ตัวแปร Y<select id="aY">${optionList(nums)}</select></label>`;
  } else if (state.activeAnalysis === 'regression') {
    controls = `<label>Independent X / ตัวแปรอิสระ<select id="aX">${optionList(nums)}</select></label><label>Dependent Y / ตัวแปรตาม<select id="aY">${optionList(nums)}</select></label>`;
  } else if (state.activeAnalysis === 'independentT') {
    const groups = cats.length ? cats : state.columns;
    controls = `<label>Test Variable / ตัวแปรที่ทดสอบ<select id="aY">${optionList(nums)}</select></label><label>Grouping Variable / ตัวแปรแบ่งกลุ่ม<select id="aGroup">${optionList(groups)}</select></label><label>Group 1 / กลุ่ม 1<select id="aGroup1"></select></label><label>Group 2 / กลุ่ม 2<select id="aGroup2"></select></label>`;
  } else if (state.activeAnalysis === 'pairedT') {
    controls = `<label>Variable 1 / ตัวแปร 1<select id="aX">${optionList(nums)}</select></label><label>Variable 2 / ตัวแปร 2<select id="aY">${optionList(nums)}</select></label>`;
  } else if (state.activeAnalysis === 'chiSquare') {
    const choices = cats.length ? cats : state.columns;
    controls = `<label>Row Variable / ตัวแปรแถว<select id="aRow">${optionList(choices)}</select></label><label>Column Variable / ตัวแปรคอลัมน์<select id="aCol">${optionList(choices)}</select></label>`;
  } else if (state.activeAnalysis === 'anova') {
    const groups = cats.length ? cats : state.columns;
    controls = `<label>Dependent Variable / ตัวแปรตาม<select id="aY">${optionList(nums)}</select></label><label>Factor / ตัวแปรกลุ่ม<select id="aFactor">${optionList(groups)}</select></label>`;
  } else if (state.activeAnalysis === 'mannWhitney') {
    const groups = cats.length ? cats : state.columns;
    controls = `<label>Test Variable / ตัวแปรที่ทดสอบ<select id="aY">${optionList(nums)}</select></label><label>Grouping Variable / ตัวแปรแบ่งกลุ่ม<select id="aGroup">${optionList(groups)}</select></label><label>Group 1 / กลุ่ม 1<select id="aGroup1"></select></label><label>Group 2 / กลุ่ม 2<select id="aGroup2"></select></label>`;
  } else if (state.activeAnalysis === 'wilcoxon') {
    controls = `<label>Variable 1 / ตัวแปร 1<select id="aX">${optionList(nums)}</select></label><label>Variable 2 / ตัวแปร 2<select id="aY">${optionList(nums)}</select></label>`;
  } else if (state.activeAnalysis === 'kruskalWallis') {
    const groups = cats.length ? cats : state.columns;
    controls = `<label>Dependent Variable / ตัวแปรตาม<select id="aY">${optionList(nums)}</select></label><label>Factor / ตัวแปรกลุ่ม<select id="aFactor">${optionList(groups)}</select></label>`;
  }

  box.innerHTML = intro + controls;
  if (['correlation', 'regression', 'pairedT', 'wilcoxon'].includes(state.activeAnalysis)) selectDifferentSecond('#aY', nums);
  if (['crosstabs', 'chiSquare'].includes(state.activeAnalysis)) selectDifferentSecond('#aCol', cats.length ? cats : state.columns);
  if (['independentT', 'mannWhitney'].includes(state.activeAnalysis)) {
    updateIndependentGroupSelectors();
    $('#aGroup')?.addEventListener('change', updateIndependentGroupSelectors);
  }
}

function updateIndependentGroupSelectors() {
  const groupVar = $('#aGroup')?.value;
  if (!groupVar) return;
  const values = uniqueValidValues(groupVar);
  const opts = values.map(v => `<option value="${escapeHtml(String(v))}">${escapeHtml(v)}</option>`).join('');
  $('#aGroup1').innerHTML = opts;
  $('#aGroup2').innerHTML = opts;
  if (values.length > 1) $('#aGroup2').selectedIndex = 1;
}

function runAnalysis() {
  if (!state.rows.length) return toast('ยังไม่มีข้อมูล / No data');
  try {
    let html = '';
    if (state.activeAnalysis === 'descriptives') html = outputDescriptives($('#aVar').value);
    if (state.activeAnalysis === 'frequencies') html = outputFrequencies($('#aVar').value);
    if (state.activeAnalysis === 'crosstabs') html = outputCrosstab($('#aRow').value, $('#aCol').value);
    if (state.activeAnalysis === 'correlation') html = outputCorrelation($('#aX').value, $('#aY').value);
    if (state.activeAnalysis === 'regression') html = outputRegression($('#aX').value, $('#aY').value);
    if (state.activeAnalysis === 'independentT') html = outputIndependentT($('#aY').value, $('#aGroup').value, $('#aGroup1').value, $('#aGroup2').value);
    if (state.activeAnalysis === 'pairedT') html = outputPairedT($('#aX').value, $('#aY').value);
    if (state.activeAnalysis === 'chiSquare') html = outputChiSquare($('#aRow').value, $('#aCol').value);
    if (state.activeAnalysis === 'anova') html = outputAnova($('#aY').value, $('#aFactor').value);
    if (state.activeAnalysis === 'mannWhitney') html = outputMannWhitney($('#aY').value, $('#aGroup').value, $('#aGroup1').value, $('#aGroup2').value);
    if (state.activeAnalysis === 'wilcoxon') html = outputWilcoxon($('#aX').value, $('#aY').value);
    if (state.activeAnalysis === 'kruskalWallis') html = outputKruskalWallis($('#aY').value, $('#aFactor').value);
    $('#analysisOutput').className = 'analysis-output';
    $('#analysisOutput').innerHTML = html;
  } catch (err) {
    console.error(err);
    toast(err.message);
  }
}

function outputHeader(key, extra = '') {
  return `<div class="output-method-note">${methodCardHtml(key)}${extra}</div>`;
}

function outputDescriptives(c) {
  const a = numericValues(c);
  if (!a.length) throw new Error('ตัวแปรนี้ไม่มีข้อมูลตัวเลข / No numeric data');
  const missing = state.rows.length - a.length;
  const m = mean(a);
  const med = median(a);
  const sd = stdev(a);
  const v = variance(a);
  const se = standardError(a);
  const sk = skewness(a);
  let ciLow = NaN, ciHigh = NaN;
  if (a.length >= 2 && Number.isFinite(se)) {
    const tc = studentTInv(0.975, a.length - 1);
    ciLow = m - tc * se;
    ciHigh = m + tc * se;
  }
  return `${outputHeader('descriptives')}
    <div class="output-block"><h3>Descriptive Statistics / สถิติเชิงพรรณนา</h3>
    <div class="caption">Variable / ตัวแปร: ${escapeHtml(c)} · Sample formulas use n−1 where applicable / สูตรตัวอย่างใช้ตัวหาร n−1 เมื่อเกี่ยวข้อง</div>
    <div class="data-table-wrap"><table class="spss-table"><thead><tr><th>Variable</th><th>N</th><th>Missing</th><th>Mean</th><th>Std. Error</th><th>95% CI Mean</th><th>Median</th><th>Std. Deviation</th><th>Variance</th><th>Minimum</th><th>Maximum</th><th>Adjusted Skewness</th></tr></thead><tbody><tr>
      <td>${escapeHtml(c)}</td><td>${a.length}</td><td>${missing}</td><td>${fmt(m,4)}</td><td>${fmt(se,4)}</td><td>[${fmt(ciLow,4)}, ${fmt(ciHigh,4)}]</td><td>${fmt(med,4)}</td><td>${fmt(sd,4)}</td><td>${fmt(v,4)}</td><td>${fmt(Math.min(...a),4)}</td><td>${fmt(Math.max(...a),4)}</td><td>${fmt(sk,4)}</td>
    </tr></tbody></table></div></div>`;
}

function outputFrequencies(c) {
  const vals = state.rows.map(r => r[c]);
  const valid = vals.filter(v => !isMissing(v));
  const counts = new Map();
  for (const v of valid) {
    const key = String(v);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let cumulative = 0;
  const entries = [...counts.entries()].sort((a, b) => naturalCompare(a[0], b[0]));
  const rows = entries.map(([value, n]) => {
    const pct = vals.length ? n / vals.length * 100 : NaN;
    const validPct = valid.length ? n / valid.length * 100 : NaN;
    cumulative += Number.isFinite(validPct) ? validPct : 0;
    return `<tr><td>${escapeHtml(value)}</td><td>${n}</td><td>${fmt(pct,2)}</td><td>${fmt(validPct,2)}</td><td>${fmt(Math.min(100, cumulative),2)}</td></tr>`;
  }).join('');
  return `${outputHeader('frequencies')}
    <div class="output-block"><h3>Frequencies / ตารางแจกแจงความถี่</h3><div class="caption">${escapeHtml(c)} · Valid ${valid.length} · Missing ${vals.length - valid.length} · Values sorted naturally / เรียงค่าตามลำดับธรรมชาติ</div>
    <div class="data-table-wrap"><table class="spss-table"><thead><tr><th>Value / ค่า</th><th>Frequency / ความถี่</th><th>Percent</th><th>Valid Percent</th><th>Cumulative Percent</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function completeCategoricalPairs(rowCol, colCol, maxCategories = 30) {
  const pairs = state.rows.filter(r => !isMissing(r[rowCol]) && !isMissing(r[colCol]));
  const rowValues = [...new Set(pairs.map(r => String(r[rowCol])))].sort(naturalCompare);
  const colValues = [...new Set(pairs.map(r => String(r[colCol])))].sort(naturalCompare);
  if (rowValues.length < 1 || colValues.length < 1) throw new Error('ไม่มีข้อมูลคู่ที่สมบูรณ์ / No complete category pairs');
  if (rowValues.length > maxCategories || colValues.length > maxCategories) {
    throw new Error(`มีหมวดหมู่มากเกิน ${maxCategories} ค่า โปรดกรองข้อมูลก่อน / Too many categories; filter the data first.`);
  }
  return { pairs, rowValues, colValues };
}

function outputCrosstab(r, c) {
  if (r === c) throw new Error('กรุณาเลือกตัวแปรสองตัวที่ต่างกัน / Choose two different variables');
  const { pairs, rowValues, colValues } = completeCategoricalPairs(r, c);
  const matrix = rowValues.map(rv => colValues.map(cv => pairs.filter(x => String(x[r]) === rv && String(x[c]) === cv).length));
  const rowTotals = matrix.map(row => row.reduce((s, v) => s + v, 0));
  const colTotals = colValues.map((_, j) => matrix.reduce((s, row) => s + row[j], 0));
  const body = rowValues.map((rv, i) => `<tr><td>${escapeHtml(rv)}</td>${matrix[i].map(n => `<td>${n}</td>`).join('')}<td><b>${rowTotals[i]}</b></td></tr>`).join('');
  const totalRow = `<tr class="total-row"><td><b>Total</b></td>${colTotals.map(n => `<td><b>${n}</b></td>`).join('')}<td><b>${pairs.length}</b></td></tr>`;
  return `${outputHeader('crosstabs')}
    <div class="output-block"><h3>Crosstabulation / ตารางไขว้</h3><div class="caption">${escapeHtml(r)} × ${escapeHtml(c)} · Complete pairs N = ${pairs.length} / ใช้เฉพาะกรณีที่ทั้งสองตัวแปรไม่สูญหาย</div>
    <div class="data-table-wrap"><table class="spss-table"><thead><tr><th>${escapeHtml(r)}</th>${colValues.map(v => `<th>${escapeHtml(v)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${body}${totalRow}</tbody></table></div></div>`;
}

function outputCorrelation(xc, yc) {
  if (xc === yc) throw new Error('กรุณาเลือกตัวแปรสองตัวที่ต่างกัน / Choose two different variables');
  const { x, y } = pairedNumeric(xc, yc);
  if (x.length < 3) throw new Error('ต้องมีข้อมูลคู่ตัวเลขอย่างน้อย 3 คู่ / At least 3 complete numeric pairs are required');
  const m = correlationTest(x, y);
  return `${outputHeader('correlation')}
    <div class="output-block"><h3>Correlations / สหสัมพันธ์</h3>
    <table class="spss-table"><thead><tr><th></th><th>${escapeHtml(xc)}</th><th>${escapeHtml(yc)}</th></tr></thead><tbody>
      <tr><td>${escapeHtml(xc)} · Pearson Correlation</td><td>1.0000</td><td>${fmt(m.r,4)}</td></tr>
      <tr><td>Sig. (2-tailed) / p-value</td><td>—</td><td>${fmtP(m.p)}</td></tr>
      <tr><td>${escapeHtml(yc)} · Pearson Correlation</td><td>${fmt(m.r,4)}</td><td>1.0000</td></tr>
      <tr><td>Sig. (2-tailed) / p-value</td><td>${fmtP(m.p)}</td><td>—</td></tr>
      <tr><td>N / จำนวนคู่สมบูรณ์</td><td>${m.n}</td><td>${m.n}</td></tr>
    </tbody></table>
    <div class="insight-box"><b>Inference / การอนุมาน:</b> t(${m.df}) = ${fmt(m.t,4)}, p ${fmtP(m.p)}. ${decisionText(m.p)}</div>
    <div class="method-warning">Correlation describes linear association, not causation / สหสัมพันธ์บอกความสัมพันธ์เชิงเส้น ไม่ได้ยืนยันเหตุและผล</div></div>`;
}

function outputRegression(xc, yc) {
  if (xc === yc) throw new Error('X และ Y ต้องเป็นคนละตัวแปร / X and Y must be different variables');
  const { x, y } = pairedNumeric(xc, yc);
  if (x.length < 3) throw new Error('ต้องมีข้อมูลคู่ตัวเลขอย่างน้อย 3 คู่ / At least 3 complete numeric pairs are required');
  const m = simpleLinearRegression(x, y);
  return `${outputHeader('regression')}
    <div class="output-block"><h3>Model Summary / สรุปโมเดล</h3><table class="spss-table"><thead><tr><th>Model</th><th>R</th><th>R Square</th><th>Adjusted R Square</th><th>Std. Error of Estimate</th><th>N</th></tr></thead><tbody><tr><td>1</td><td>${fmt(Math.sqrt(m.r2),4)}</td><td>${fmt(m.r2,4)}</td><td>${fmt(m.adjustedR2,4)}</td><td>${fmt(m.see,4)}</td><td>${m.n}</td></tr></tbody></table></div>
    <div class="output-block"><h3>ANOVA / การทดสอบโมเดล</h3><table class="spss-table"><thead><tr><th>Source</th><th>Sum of Squares</th><th>df</th><th>Mean Square</th><th>F</th><th>Sig.</th></tr></thead><tbody>
      <tr><td>Regression</td><td>${fmt(m.ssr,5)}</td><td>${m.dfModel}</td><td>${fmt(m.msModel,5)}</td><td>${fmt(m.f,5)}</td><td>${fmtP(m.pModel)}</td></tr>
      <tr><td>Residual</td><td>${fmt(m.sse,5)}</td><td>${m.dfResidual}</td><td>${fmt(m.mse,5)}</td><td>—</td><td>—</td></tr>
      <tr><td>Total</td><td>${fmt(m.sst,5)}</td><td>${m.n-1}</td><td>—</td><td>—</td><td>—</td></tr>
    </tbody></table></div>
    <div class="output-block"><h3>Coefficients / สัมประสิทธิ์</h3><table class="spss-table"><thead><tr><th>Term</th><th>B</th><th>Std. Error</th><th>Standardized Beta</th><th>t</th><th>Sig.</th><th>95% CI for B</th></tr></thead><tbody>
      <tr><td>(Constant)</td><td>${fmt(m.intercept,6)}</td><td>${fmt(m.seIntercept,6)}</td><td>—</td><td>${fmt(m.tIntercept,4)}</td><td>${fmtP(m.pIntercept)}</td><td>[${fmt(m.interceptCi[0],6)}, ${fmt(m.interceptCi[1],6)}]</td></tr>
      <tr><td>${escapeHtml(xc)}</td><td>${fmt(m.slope,6)}</td><td>${fmt(m.seSlope,6)}</td><td>${fmt(m.r,4)}</td><td>${fmt(m.tSlope,4)}</td><td>${fmtP(m.pSlope)}</td><td>[${fmt(m.slopeCi[0],6)}, ${fmt(m.slopeCi[1],6)}]</td></tr>
    </tbody></table>
    <div class="insight-box"><b>Equation / สมการ:</b> ${escapeHtml(yc)} = ${fmt(m.intercept,5)} + ${fmt(m.slope,5)} × ${escapeHtml(xc)}<br><b>Model inference / การทดสอบโมเดล:</b> ${decisionText(m.pModel)}</div>
    <div class="method-warning">OLS inference assumes an appropriate linear model and well-behaved residuals; inspect residuals before high-stakes interpretation / การอนุมาน OLS ควรตรวจความเป็นเส้นตรงและเศษเหลือก่อนนำไปตัดสินใจสำคัญ</div></div>`;
}

function outputIndependentT(testVar, groupVar, group1, group2) {
  if (group1 === group2) throw new Error('กรุณาเลือกสองกลุ่มที่ต่างกัน / Choose two different groups');
  const g1 = state.rows.filter(r => !isMissing(r[groupVar]) && String(r[groupVar]) === String(group1)).map(r => r[testVar]);
  const g2 = state.rows.filter(r => !isMissing(r[groupVar]) && String(r[groupVar]) === String(group2)).map(r => r[testVar]);
  const m = independentTTest(g1, g2);
  const se1 = m.sd1 / Math.sqrt(m.n1), se2 = m.sd2 / Math.sqrt(m.n2);
  let leveneRow = '';
  try {
    const lev = leveneTest([{ label: group1, values: g1 }, { label: group2, values: g2 }]);
    const verdict = lev.p < 0.05
      ? 'Variances differ significantly — prefer the Welch row above / ความแปรปรวนต่างกันอย่างมีนัยสำคัญ ควรใช้แถว Welch'
      : 'No evidence variances differ — pooled row is also reasonable / ยังไม่มีหลักฐานว่าความแปรปรวนต่างกัน ใช้แถว Pooled ได้เช่นกัน';
    leveneRow = `<div class="output-block"><h3>Levene's Test for Equality of Variances / ทดสอบความเท่ากันของความแปรปรวน</h3>
      <table class="spss-table"><thead><tr><th>F</th><th>df1</th><th>df2</th><th>Sig.</th></tr></thead><tbody>
      <tr><td>${fmt(lev.statistic,4)}</td><td>${lev.dfBetween}</td><td>${lev.dfWithin}</td><td>${fmtP(lev.p)}</td></tr>
      </tbody></table><div class="caption">Brown\u2013Forsythe variant (deviations from group median) / ใช้ตัวแปรผันจากมัธยฐานของแต่ละกลุ่ม</div>
      <div class="insight-box">${verdict}</div></div>`;
  } catch { /* skip if not computable */ }
  return `${outputHeader('independentT')}
    <div class="output-block"><h3>Group Statistics / สถิติรายกลุ่ม</h3><table class="spss-table"><thead><tr><th>${escapeHtml(groupVar)}</th><th>N</th><th>Mean</th><th>Std. Deviation</th><th>Std. Error Mean</th></tr></thead><tbody>
      <tr><td>${escapeHtml(group1)}</td><td>${m.n1}</td><td>${fmt(m.mean1,5)}</td><td>${fmt(m.sd1,5)}</td><td>${fmt(se1,5)}</td></tr>
      <tr><td>${escapeHtml(group2)}</td><td>${m.n2}</td><td>${fmt(m.mean2,5)}</td><td>${fmt(m.sd2,5)}</td><td>${fmt(se2,5)}</td></tr>
    </tbody></table></div>
    ${leveneRow}
    <div class="output-block"><h3>Independent Samples Test / การทดสอบสองกลุ่มอิสระ</h3><div class="caption">Mean Difference = Group 1 − Group 2 / ผลต่างเฉลี่ย = กลุ่ม 1 − กลุ่ม 2</div><div class="data-table-wrap"><table class="spss-table"><thead><tr><th>Variance assumption</th><th>t</th><th>df</th><th>Sig. (2-tailed)</th><th>Mean Difference</th><th>Std. Error Difference</th><th>95% CI Difference</th></tr></thead><tbody>
      <tr><td>Welch · Equal variances not assumed / ไม่สมมติความแปรปรวนเท่ากัน</td><td>${fmt(m.welch.t,5)}</td><td>${fmt(m.welch.df,4)}</td><td>${fmtP(m.welch.p)}</td><td>${fmt(m.diff,5)}</td><td>${fmt(m.welch.se,5)}</td><td>[${fmt(m.welch.ci[0],5)}, ${fmt(m.welch.ci[1],5)}]</td></tr>
      <tr><td>Pooled · Equal variances assumed / สมมติความแปรปรวนเท่ากัน</td><td>${fmt(m.pooled.t,5)}</td><td>${m.pooled.df}</td><td>${fmtP(m.pooled.p)}</td><td>${fmt(m.diff,5)}</td><td>${fmt(m.pooled.se,5)}</td><td>[${fmt(m.pooled.ci[0],5)}, ${fmt(m.pooled.ci[1],5)}]</td></tr>
    </tbody></table></div>
    <div class="insight-box"><b>Welch inference / ผลแบบ Welch:</b> ${decisionText(m.welch.p)}<br><b>Effect size / ขนาดอิทธิพล:</b> Cohen's d = ${fmt(m.cohenD,4)}, Hedges' g = ${fmt(m.hedgesG,4)}</div>
    <div class="method-warning">This implementation reports both Welch and pooled results instead of silently choosing an equal-variance assumption / โปรแกรมรายงานทั้งสองวิธีแทนที่จะสมมติความแปรปรวนเท่ากันไว้ก่อน</div></div>`;
}

function outputPairedT(xc, yc) {
  if (xc === yc) throw new Error('กรุณาเลือกตัวแปรสองตัวที่ต่างกัน / Choose two different variables');
  const { x, y } = pairedNumeric(xc, yc);
  const m = pairedTTest(x, y);
  return `${outputHeader('pairedT')}
    <div class="output-block"><h3>Paired Samples Statistics / สถิติข้อมูลจับคู่</h3><table class="spss-table"><thead><tr><th>Variable</th><th>Mean</th><th>N</th><th>Std. Deviation</th><th>Std. Error Mean</th></tr></thead><tbody>
      <tr><td>${escapeHtml(xc)}</td><td>${fmt(mean(x),5)}</td><td>${x.length}</td><td>${fmt(stdev(x),5)}</td><td>${fmt(standardError(x),5)}</td></tr>
      <tr><td>${escapeHtml(yc)}</td><td>${fmt(mean(y),5)}</td><td>${y.length}</td><td>${fmt(stdev(y),5)}</td><td>${fmt(standardError(y),5)}</td></tr>
    </tbody></table></div>
    <div class="output-block"><h3>Paired Samples Test / การทดสอบแบบจับคู่</h3><table class="spss-table"><thead><tr><th>Pair</th><th>Mean Difference</th><th>Std. Deviation Difference</th><th>Std. Error Difference</th><th>95% CI Difference</th><th>t</th><th>df</th><th>Sig. (2-tailed)</th></tr></thead><tbody><tr>
      <td>${escapeHtml(xc)} − ${escapeHtml(yc)}</td><td>${fmt(m.meanDifference,5)}</td><td>${fmt(m.sdDifference,5)}</td><td>${fmt(m.seDifference,5)}</td><td>[${fmt(m.ci[0],5)}, ${fmt(m.ci[1],5)}]</td><td>${fmt(m.t,5)}</td><td>${m.df}</td><td>${fmtP(m.p)}</td>
    </tr></tbody></table>
    <div class="insight-box">${decisionText(m.p)}<br><b>Paired effect size / ขนาดอิทธิพลแบบจับคู่:</b> Cohen's dz = ${fmt(m.cohenDz,4)}</div></div>`;
}

function buildContingency(rowCol, colCol) {
  const { pairs, rowValues, colValues } = completeCategoricalPairs(rowCol, colCol);
  if (rowValues.length < 2 || colValues.length < 2) throw new Error('Chi-square ต้องมีอย่างน้อย 2 หมวดในแต่ละตัวแปร / Need at least 2 categories per variable');
  const observed = rowValues.map(rv => colValues.map(cv => pairs.filter(x => String(x[rowCol]) === rv && String(x[colCol]) === cv).length));
  return { pairs, rowValues, colValues, observed };
}

function outputChiSquare(rowCol, colCol) {
  if (rowCol === colCol) throw new Error('กรุณาเลือกตัวแปรสองตัวที่ต่างกัน / Choose two different variables');
  const { pairs, rowValues, colValues, observed } = buildContingency(rowCol, colCol);
  const m = chiSquareIndependence(observed);
  const body = rowValues.map((rv, i) => `<tr><td>${escapeHtml(rv)}</td>${observed[i].map((o, j) => `<td>${o}<small class="expected">E=${fmt(m.expected[i][j],2)}</small></td>`).join('')}<td><b>${m.rowTotals[i]}</b></td></tr>`).join('');
  const totals = `<tr class="total-row"><td><b>Total</b></td>${m.colTotals.map(v => `<td><b>${v}</b></td>`).join('')}<td><b>${m.total}</b></td></tr>`;
  const sparsePct = m.cells ? (m.expectedBelow5 / m.cells) * 100 : 0;
  const warning = m.expectedBelow5
    ? `<div class="method-warning"><b>Expected-count check / ตรวจ Expected Count:</b> ${m.expectedBelow5}/${m.cells} cells (${fmt(sparsePct,1)}%) have expected count &lt; 5; ${m.expectedBelow1} cell(s) are &lt; 1. A sparse table can weaken the chi-square approximation / ตารางที่เบาบางอาจทำให้การประมาณแบบไคสแควร์ไม่น่าเชื่อถือ ควรพิจารณารวมหมวดหรือใช้ exact method ที่เหมาะสม</div>`
    : `<div class="insight-box">Expected counts are all at least 5 / Expected Count ทุกช่อง ≥ 5</div>`;
  return `${outputHeader('chiSquare')}
    <div class="output-block"><h3>Crosstab: Observed (Expected) / ตารางสังเกต (ค่าคาดหมาย)</h3><div class="data-table-wrap"><table class="spss-table"><thead><tr><th>${escapeHtml(rowCol)}</th>${colValues.map(v => `<th>${escapeHtml(v)}</th>`).join('')}<th>Total</th></tr></thead><tbody>${body}${totals}</tbody></table></div></div>
    <div class="output-block"><h3>Chi-Square Tests / การทดสอบไคสแควร์</h3><table class="spss-table"><thead><tr><th>Test</th><th>Value</th><th>df</th><th>Asymptotic Sig. (2-sided)</th><th>N</th><th>Cramér's V</th></tr></thead><tbody><tr><td>Pearson Chi-Square</td><td>${fmt(m.chi2,5)}</td><td>${m.df}</td><td>${fmtP(m.p)}</td><td>${m.total}</td><td>${fmt(m.cramerV,4)}</td></tr></tbody></table>
    <div class="insight-box">${decisionText(m.p)}</div>${warning}</div>`;
}

function outputAnova(dependent, factor) {
  const groupsMap = new Map();
  for (const row of state.rows) {
    if (isMissing(row[factor]) || isMissing(row[dependent])) continue;
    const v = Number(row[dependent]);
    if (!Number.isFinite(v)) continue;
    const key = String(row[factor]);
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(v);
  }
  if (groupsMap.size > 50) throw new Error('Factor มีมากกว่า 50 กลุ่ม โปรดกรองก่อน / Factor has more than 50 groups; filter first');
  const entries = [...groupsMap.entries()].sort((a,b) => naturalCompare(a[0], b[0])).map(([label, values]) => ({ label, values }));
  const m = oneWayAnova(entries);
  const desc = m.summaries.map(g => `<tr><td>${escapeHtml(g.label)}</td><td>${g.n}</td><td>${fmt(g.mean,5)}</td><td>${fmt(g.sd,5)}</td></tr>`).join('');

  let leveneRow = '';
  try {
    const lev = leveneTest(entries);
    leveneRow = `<div class="output-block"><h3>Levene's Test for Equality of Variances / ทดสอบความเท่ากันของความแปรปรวน</h3>
      <table class="spss-table"><thead><tr><th>F</th><th>df1</th><th>df2</th><th>Sig.</th></tr></thead><tbody>
      <tr><td>${fmt(lev.statistic,4)}</td><td>${lev.dfBetween}</td><td>${lev.dfWithin}</td><td>${fmtP(lev.p)}</td></tr>
      </tbody></table><div class="caption">Brown\u2013Forsythe variant (deviations from group median). ANOVA is fairly robust to mild violations with similar group sizes / ANOVA ทนต่อการละเมิดเล็กน้อยได้พอสมควรหากขนาดกลุ่มใกล้เคียงกัน</div></div>`;
  } catch { /* skip */ }

  let postHoc = '';
  if (m.p < 0.05 && entries.length >= 2 && entries.length <= 12) {
    try {
      const ph = pairwisePostHoc(entries);
      const rows = ph.comparisons.map(c => `<tr class="${c.significant ? 'sig-row' : ''}"><td>${escapeHtml(c.a)} vs ${escapeHtml(c.b)}</td><td>${fmt(c.meanDiff,5)}</td><td>${fmt(c.t,4)}</td><td>${fmt(c.df,2)}</td><td>${fmtP(c.p)}</td><td>${fmtP(c.pAdjusted)}</td><td>${c.significant ? 'Yes / ใช่' : 'No / ไม่'}</td></tr>`).join('');
      postHoc = `<div class="output-block"><h3>Post-Hoc Pairwise Comparisons / การเปรียบเทียบรายคู่หลัง ANOVA</h3>
        <div class="caption">${ph.method} · ${ph.m} comparisons / การเปรียบเทียบ · α = 0.05</div>
        <div class="data-table-wrap"><table class="spss-table"><thead><tr><th>Pair / คู่กลุ่ม</th><th>Mean Diff.</th><th>t</th><th>df</th><th>Sig.</th><th>Sig. (Bonferroni)</th><th>Significant?</th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="method-warning">Bonferroni correction controls the family-wise error rate but is conservative with many groups; treat borderline pairs cautiously / การแก้ไข Bonferroni ควบคุมอัตราความผิดพลาดรวมแต่อาจเข้มงวดเกินไปเมื่อมีหลายกลุ่ม</div></div>`;
    } catch { /* skip if not computable */ }
  } else if (m.p < 0.05 && entries.length > 12) {
    postHoc = `<div class="method-warning">Factor has more than 12 groups — post-hoc pairwise comparisons are skipped to avoid an unreadable table with too many comparisons / มีมากกว่า 12 กลุ่ม จึงข้ามการเปรียบเทียบรายคู่เพื่อไม่ให้ตารางอ่านยากเกินไป</div>`;
  }

  return `${outputHeader('anova')}
    <div class="output-block"><h3>Descriptives by Group / สถิติแยกตามกลุ่ม</h3><table class="spss-table"><thead><tr><th>${escapeHtml(factor)}</th><th>N</th><th>Mean</th><th>Std. Deviation</th></tr></thead><tbody>${desc}</tbody></table></div>
    ${leveneRow}
    <div class="output-block"><h3>ANOVA / การวิเคราะห์ความแปรปรวน</h3><table class="spss-table"><thead><tr><th>Source</th><th>Sum of Squares</th><th>df</th><th>Mean Square</th><th>F</th><th>Sig.</th></tr></thead><tbody>
      <tr><td>Between Groups</td><td>${fmt(m.ssBetween,5)}</td><td>${m.dfBetween}</td><td>${fmt(m.msBetween,5)}</td><td>${fmt(m.f,5)}</td><td>${fmtP(m.p)}</td></tr>
      <tr><td>Within Groups</td><td>${fmt(m.ssWithin,5)}</td><td>${m.dfWithin}</td><td>${fmt(m.msWithin,5)}</td><td>—</td><td>—</td></tr>
      <tr><td>Total</td><td>${fmt(m.ssTotal,5)}</td><td>${m.n-1}</td><td>—</td><td>—</td><td>—</td></tr>
    </tbody></table>
    <div class="insight-box">${decisionText(m.p)}<br><b>Effect sizes / ขนาดอิทธิพล:</b> η² = ${fmt(m.etaSquared,4)}, ω² = ${fmt(m.omegaSquared,4)}</div>
    <div class="method-warning">A significant omnibus ANOVA shows that not all group means are equal; it does not identify which pairs differ. See the post-hoc table below for pairwise conclusions / ANOVA ที่มีนัยสำคัญบอกเพียงว่าค่าเฉลี่ยบางกลุ่มต่างกัน ดูตาราง post-hoc ด้านล่างเพื่อระบุคู่ที่ต่าง</div></div>
    ${postHoc}`;
}

function outputMannWhitney(testVar, groupVar, group1, group2) {
  if (group1 === group2) throw new Error('กรุณาเลือกสองกลุ่มที่ต่างกัน / Choose two different groups');
  const g1 = state.rows.filter(r => !isMissing(r[groupVar]) && String(r[groupVar]) === String(group1)).map(r => r[testVar]);
  const g2 = state.rows.filter(r => !isMissing(r[groupVar]) && String(r[groupVar]) === String(group2)).map(r => r[testVar]);
  const m = mannWhitneyU(g1, g2);
  return `${outputHeader('mannWhitney')}
    <div class="output-block"><h3>Ranks / อันดับ</h3><table class="spss-table"><thead><tr><th>${escapeHtml(groupVar)}</th><th>N</th><th>Sum of Ranks</th></tr></thead><tbody>
      <tr><td>${escapeHtml(group1)}</td><td>${m.n1}</td><td>${fmt(m.u1 + (m.n1*(m.n1+1))/2,2)}</td></tr>
      <tr><td>${escapeHtml(group2)}</td><td>${m.n2}</td><td>${fmt(m.u2 + (m.n2*(m.n2+1))/2,2)}</td></tr>
    </tbody></table></div>
    <div class="output-block"><h3>Test Statistics / สถิติทดสอบ</h3><table class="spss-table"><thead><tr><th>Mann-Whitney U</th><th>Z</th><th>Asymp. Sig. (2-tailed)</th><th>Effect size r</th></tr></thead><tbody>
      <tr><td>${fmt(m.uMin,3)}</td><td>${fmt(m.z,4)}</td><td>${fmtP(m.p)}</td><td>${fmt(m.effectSizeR,4)}</td></tr>
    </tbody></table>
    <div class="insight-box">${decisionText(m.p)}</div>
    <div class="method-warning">Uses the normal approximation with a tie correction; this is standard for moderate/large samples but is less exact for very small groups (n &lt; ~8 per group) / ใช้การประมาณแบบโค้งปกติพร้อมปรับค่าจากข้อมูลซ้ำ ซึ่งเหมาะกับกลุ่มตัวอย่างขนาดกลาง/ใหญ่ อาจแม่นยำน้อยลงเมื่อกลุ่มมีขนาดเล็กมาก</div></div>`;
}

function outputWilcoxon(xc, yc) {
  if (xc === yc) throw new Error('กรุณาเลือกตัวแปรสองตัวที่ต่างกัน / Choose two different variables');
  const { x, y } = pairedNumeric(xc, yc);
  const m = wilcoxonSignedRank(x, y);
  return `${outputHeader('wilcoxon')}
    <div class="output-block"><h3>Ranks / อันดับ</h3><div class="caption">${escapeHtml(xc)} − ${escapeHtml(yc)} · N (nonzero differences) = ${m.n} · Zero differences excluded = ${m.ignoredZeros} / ผลต่างเท่ากับ 0 ถูกตัดออก ${m.ignoredZeros} คู่</div>
    <table class="spss-table"><thead><tr><th>Sign</th><th>Sum of Ranks</th></tr></thead><tbody>
      <tr><td>Positive (${escapeHtml(xc)} &gt; ${escapeHtml(yc)})</td><td>${fmt(m.wPlus,2)}</td></tr>
      <tr><td>Negative (${escapeHtml(xc)} &lt; ${escapeHtml(yc)})</td><td>${fmt(m.wMinus,2)}</td></tr>
    </tbody></table></div>
    <div class="output-block"><h3>Test Statistics / สถิติทดสอบ</h3><table class="spss-table"><thead><tr><th>Z</th><th>Asymp. Sig. (2-tailed)</th></tr></thead><tbody>
      <tr><td>${fmt(m.z,4)}</td><td>${fmtP(m.p)}</td></tr>
    </tbody></table>
    <div class="insight-box">${decisionText(m.p)}</div>
    <div class="method-warning">Uses the normal approximation with a tie correction, matching the NIST-documented approach for moderate/large samples / ใช้การประมาณแบบโค้งปกติพร้อมปรับค่าจากข้อมูลซ้ำ ตามแนวทางที่ NIST บันทึกไว้สำหรับกลุ่มตัวอย่างขนาดกลาง/ใหญ่</div></div>`;
}

function outputKruskalWallis(dependent, factor) {
  const groupsMap = new Map();
  for (const row of state.rows) {
    if (isMissing(row[factor]) || isMissing(row[dependent])) continue;
    const v = Number(row[dependent]);
    if (!Number.isFinite(v)) continue;
    const key = String(row[factor]);
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(v);
  }
  if (groupsMap.size > 50) throw new Error('Factor มีมากกว่า 50 กลุ่ม โปรดกรองก่อน / Factor has more than 50 groups; filter first');
  const entries = [...groupsMap.entries()].sort((a,b) => naturalCompare(a[0], b[0])).map(([label, values]) => ({ label, values }));
  const m = kruskalWallis(entries);
  const ranks = m.groups.map(g => `<tr><td>${escapeHtml(g.label)}</td><td>${g.n}</td><td>${fmt(g.meanRank,3)}</td><td>${fmt(g.rankSum,2)}</td></tr>`).join('');
  return `${outputHeader('kruskalWallis')}
    <div class="output-block"><h3>Ranks / อันดับ</h3><table class="spss-table"><thead><tr><th>${escapeHtml(factor)}</th><th>N</th><th>Mean Rank</th><th>Sum of Ranks</th></tr></thead><tbody>${ranks}</tbody></table></div>
    <div class="output-block"><h3>Test Statistics / สถิติทดสอบ</h3><table class="spss-table"><thead><tr><th>Kruskal-Wallis H</th><th>df</th><th>Asymp. Sig.</th></tr></thead><tbody>
      <tr><td>${fmt(m.h,4)}</td><td>${m.df}</td><td>${fmtP(m.p)}</td></tr>
    </tbody></table>
    <div class="insight-box">${decisionText(m.p)}</div>
    <div class="method-warning">A significant Kruskal-Wallis result shows at least one group differs, not which pairs. Follow up with pairwise Mann-Whitney U tests (Bonferroni-adjusted) if needed / ผลที่มีนัยสำคัญบอกเพียงว่ามีอย่างน้อยหนึ่งกลุ่มต่างกัน ยังไม่ระบุคู่ ควรตามด้วย Mann-Whitney U รายคู่พร้อมปรับ Bonferroni หากต้องการทราบคู่ที่ต่าง</div></div>`;
}

// ============================================================
// Smart Beginner Content: Excel/CSV wizard, multilingual mapping,
// Thai/CE date parsing, data-quality checks, privacy checks, and
// SQL Learning Mode. These features are intentionally browser-only
// so the project remains safe for GitHub Pages.
// ============================================================
const STANDARD_COLUMN_DICTIONARY = {
  order_date: ['order_date','date','วันที่','วันที่ขาย','วันขาย','วันที่สั่งซื้อ','transaction_date','created_at','order date','sale date','订单日期','销售日期','注文日','売上日'],
  order_id: ['order_id','transaction_id','เลขที่บิล','เลขที่ออเดอร์','รหัสคำสั่งซื้อ','bill_no','invoice_no','order no','订单编号','注文番号'],
  national_id: ['เลขบัตร','เลขบัตรประชาชน','เลขประจำตัว','บัตรประชาชน','national_id','id_card','citizen_id','personal_id'],
  customer_id: ['customer_id','customer code','client_id','member_id','รหัสลูกค้า','รหัสสมาชิก','รหัสผู้ซื้อ','客户编号','顧客ID'],
  customer_name: ['customer_name','customer','client_name','name','ชื่อลูกค้า','ชื่อผู้ซื้อ','ลูกค้า','客户名称','顧客名'],
  product_id: ['product_id','product_code','sku','item_code','รหัสสินค้า','รหัสผลิตภัณฑ์','商品コード','产品编号'],
  product_name: ['product_name','product','item_name','description','รายละเอียดสินค้า','ชื่อสินค้า','สินค้า','รายการสินค้า','产品名称','商品名'],
  category: ['category','หมวดหมู่','ประเภทสินค้า','กลุ่มสินค้า','ประเภท','类别','カテゴリ'],
  quantity: ['quantity','qty','units','จำนวน','จำนวนขาย','ปริมาณ','数量','数量'],
  unit_price: ['unit_price','price','ราคาต่อหน่วย','ราคา','售价','単価'],
  discount: ['discount','discount_rate','ส่วนลด','ลดราคา','折扣','割引'],
  cost: ['cost','unit_cost','ต้นทุน','ราคาทุน','成本','原価'],
  net_sales: ['net_sales','sales','revenue','amount','ยอดขาย','ยอดขายสุทธิ','ยอดรวม','รายได้','金额','売上'],
  profit: ['profit','gross_profit','net_profit','กำไร','กำไรสุทธิ','利益','粗利'],
  region: ['region','area','ภูมิภาค','เขต','พื้นที่','区域','地域'],
  province: ['province','state','จังหวัด','เมือง','都道府県','省份'],
  channel: ['channel','sales_channel','ช่องทางขาย','แพลตฟอร์ม','ช่องทาง','渠道','チャネル'],
  order_status: ['status','order_status','สถานะ','สถานะคำสั่งซื้อ','订单状态','ステータス'],
};
const PII_KEYWORDS = ['national_id','id_card','citizen','เลขบัตร','บัตรประชาชน','เลขประจำตัว','phone','tel','mobile','เบอร์','โทร','email','อีเมล','address','ที่อยู่','name','ชื่อ'];

function normalizeHeaderName(name) {
  return String(name ?? '').trim().toLowerCase().replace(/[\s\-./]+/g, '_').replace(/_+/g, '_');
}

function suggestStandardColumn(header) {
  const raw = String(header ?? '').trim();
  const norm = normalizeHeaderName(raw);
  let best = { standard: '', confidence: 0, reason: 'ไม่พบคำใกล้เคียง / no match' };
  for (const [standard, terms] of Object.entries(STANDARD_COLUMN_DICTIONARY)) {
    for (const term of terms) {
      const t = normalizeHeaderName(term);
      let confidence = 0;
      if (norm === t || raw === term) confidence = 99;
      else if (norm.includes(t) || t.includes(norm)) confidence = Math.min(92, 55 + Math.min(norm.length, t.length) * 3);
      else if (norm.replaceAll('_','') === t.replaceAll('_','')) confidence = 88;
      if (confidence > best.confidence) best = { standard, confidence, reason: `matched: ${term}` };
    }
  }
  return best;
}

function excelSerialToDate(serial) {
  if (typeof serial !== 'number' || serial < 20000 || serial > 80000) return null;
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + serial * 86400000);
}

function normalizeDateParts(year, month, day, era='auto') {
  let y = Number(year), m = Number(month), d = Number(day);
  if (![y,m,d].every(Number.isFinite)) return null;
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
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const monthNames = ['', 'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const weekdays = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  return {
    order_date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
    day: d,
    month: m,
    month_name: monthNames[m] || '',
    year: y,
    year_th: y + 543,
    quarter: `Q${Math.ceil(m / 3)}`,
    year_month: `${y}-${String(m).padStart(2,'0')}`,
    weekday_name: weekdays[date.getUTCDay()] || '',
  };
}

function parseFlexibleDate(value, format='DMY', era='auto') {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return normalizeDateObject(value);
  const serial = excelSerialToDate(value);
  if (serial) return normalizeDateObject(serial);
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return normalizeDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3]), era);
  const slash = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const a = Number(slash[1]), b = Number(slash[2]), y = Number(slash[3]);
    if (format === 'MDY') return normalizeDateParts(y, a, b, era);
    if (format === 'YMD') return normalizeDateParts(a, b, y, era);
    return normalizeDateParts(y, b, a, era);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : normalizeDateObject(new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())));
}

function currentMappingRows() {
  return state.columns.map(col => ({ original: col, ...suggestStandardColumn(col) }));
}

function renderSmartImport() {
  const badge = $('#smartMappingBadge');
  const result = $('#smartMappingResult');
  const dateBox = $('#smartDateExamples');
  if (badge) badge.textContent = state.currentTable || 'No table';
  if (result) {
    if (!state.columns.length) {
      result.className = 'data-table-wrap empty-state';
      result.textContent = 'ยังไม่มีตารางให้ตรวจ Mapping — อัปโหลดไฟล์หรือกดข้อมูลตัวอย่างก่อน';
    } else {
      const rows = currentMappingRows();
      result.className = 'data-table-wrap';
      result.innerHTML = `<table class="data-table"><thead><tr><th>Column จากไฟล์</th><th>ระบบแนะนำ</th><th>Confidence</th><th>หมายเหตุ</th></tr></thead><tbody>${rows.map(r => `<tr><td>${escapeHtml(r.original)}</td><td>${escapeHtml(r.standard || 'ไม่จับคู่')}</td><td>${r.confidence}%</td><td>${escapeHtml(r.reason)}</td></tr>`).join('')}</tbody></table>`;
    }
  }
  if (dateBox) {
    const examples = [
      ['06/11/2026', 'DMY', 'auto'],
      ['06/11/2026', 'MDY', 'auto'],
      ['6/8/69', 'DMY', 'auto'],
      ['06-11-2569', 'DMY', 'BE'],
      ['2026-11-06', 'YMD', 'CE'],
    ];
    dateBox.innerHTML = examples.map(([raw, format, era]) => {
      const d = parseFlexibleDate(raw, format, era);
      return `<div class="date-example"><b>${escapeHtml(raw)}</b><span>${format} / ${era}</span><code>${d ? `${d.order_date} · ${d.month_name} · ${d.quarter}` : 'อ่านไม่ได้'}</code></div>`;
    }).join('');
  }
}

async function smartImportFile(file) {
  try {
    if (!window.XLSX) throw new Error('SheetJS ยังไม่พร้อม');
    if (state.db && getTableNames().length > 0) takeSnapshot(`Before Smart Import ${file.name}`);
    setStatus(`Smart Import: ${file.name}`);
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array', cellDates: false });
    if (!wb.SheetNames.length) throw new Error('ไม่พบ Sheet ในไฟล์');
    const many = wb.SheetNames.length > 1;
    const importAll = many ? confirm(`พบ ${wb.SheetNames.length} Sheets ต้องการนำเข้าทุก Sheet เป็นคนละตารางหรือไม่?\nOK = ทุก Sheet, Cancel = Sheet แรกเท่านั้น`) : true;
    const sheetNames = importAll ? wb.SheetNames : [wb.SheetNames[0]];
    let firstTable = null;
    for (const sheetName of sheetNames) {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
      if (!rows.length) continue;
      const enhanced = enhanceSmartRows(rows, sheetName, file.name);
      const base = `${file.name.replace(/\.[^.]+$/, '')}_${sheetName}`.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]+/g, '_').slice(0, 58) || 'smart_import';
      const table = uniqueTableName(base);
      createTableFromObjects(table, enhanced);
      if (!firstTable) firstTable = table;
    }
    if (!firstTable) throw new Error('ไม่มีข้อมูลใน Sheet ที่นำเข้า');
    state.fileName = file.name;
    await refreshDatabaseUI(firstTable);
    renderSmartImport();
    toast('Smart Import สำเร็จ');
  } catch (err) {
    console.error(err);
    toast(`Smart Import ไม่สำเร็จ: ${err.message}`);
  } finally {
    const input = $('#smartFileInput');
    if (input) input.value = '';
  }
}

function enhanceSmartRows(rows, sheetName, fileName) {
  const headers = [...new Set(rows.flatMap(Object.keys))];
  const mapping = Object.fromEntries(headers.map(h => [h, suggestStandardColumn(h)]));
  const dateHeader = headers.find(h => mapping[h].standard === 'order_date' && mapping[h].confidence >= 60);
  return rows.map((row, idx) => {
    const copy = { ...row };
    copy._source_file = fileName;
    copy._source_sheet = sheetName;
    copy._original_row_number = idx + 2;
    if (dateHeader && !copy.order_date) {
      copy.order_date_original = row[dateHeader];
      const parsed = parseFlexibleDate(row[dateHeader], 'DMY', 'auto') || parseFlexibleDate(row[dateHeader], 'MDY', 'auto') || parseFlexibleDate(row[dateHeader], 'YMD', 'auto');
      if (parsed) Object.assign(copy, parsed);
    }
    const issues = detectRowIssues(copy, idx);
    copy._data_quality_status = issues.length ? 'warning' : 'valid';
    copy._exclude_from_analysis = issues.some(i => /วันที่|ยอดขาย|จำนวน|รหัสลูกค้า|รหัสสินค้า|date|sales|quantity/.test(i)) ? 1 : 0;
    copy._exclude_reason = issues.join('; ');
    copy._last_updated_at = new Date().toISOString();
    return copy;
  });
}

function detectRowIssues(row, idx=0) {
  const issues = [];
  const keys = Object.keys(row);
  const byStandard = (standard) => keys.find(k => k === standard || suggestStandardColumn(k).standard === standard);
  const orderDate = byStandard('order_date');
  const customer = byStandard('customer_id');
  const product = byStandard('product_id');
  const qty = byStandard('quantity');
  const sales = byStandard('net_sales');
  const discount = byStandard('discount');
  const cost = byStandard('cost');
  if (orderDate && !parseFlexibleDate(row[orderDate], 'DMY', 'auto')) issues.push('วันที่อ่านไม่ได้');
  if (customer && isMissing(row[customer])) issues.push('รหัสลูกค้าว่าง');
  if (product && isMissing(row[product])) issues.push('รหัสสินค้าว่าง');
  if (qty && (!Number.isFinite(Number(row[qty])) || Number(row[qty]) <= 0)) issues.push('จำนวนไม่ถูกต้อง');
  if (sales && (!Number.isFinite(Number(row[sales])) || Number(row[sales]) < 0)) issues.push('ยอดขายไม่ถูกต้อง');
  if (discount && Number.isFinite(Number(row[discount])) && Number(row[discount]) > 1 && Number(row[discount]) > 100) issues.push('ส่วนลดมากกว่า 100%');
  if (cost && Number.isFinite(Number(row[cost])) && Number(row[cost]) < 0) issues.push('ต้นทุนติดลบ');
  if (row._exclude_from_analysis === 1 || row._exclude_from_analysis === '1') issues.push('ถูกตั้งค่าไม่นำไปคำนวณ');
  return issues;
}

function renderDataQualityCenter() {
  const rows = state.rows || [];
  const columns = state.columns || [];
  const cellCount = Math.max(1, rows.length * Math.max(1, columns.length));
  let missing = 0;
  for (const r of rows) for (const c of columns) if (isMissing(r[c])) missing++;
  const issues = [];
  rows.forEach((row, i) => detectRowIssues(row, i).forEach(issue => issues.push({ row: i + 1, issue, sample: JSON.stringify(Object.fromEntries(Object.entries(row).slice(0, 4))) })));
  const duplicateCandidates = ['order_id','transaction_id','invoice_no'];
  for (const c of duplicateCandidates.filter(c => columns.includes(c))) {
    const seen = new Set(), dup = new Set();
    for (const r of rows) { const v = String(r[c] ?? ''); if (!v) continue; if (seen.has(v)) dup.add(v); else seen.add(v); }
    if (dup.size) issues.push({ row: '-', issue: `พบ ${dup.size} ${c} ซ้ำ`, sample: [...dup].slice(0, 5).join(', ') });
  }
  $('#dqRows') && ($('#dqRows').textContent = rows.length.toLocaleString('th-TH'));
  $('#dqIssues') && ($('#dqIssues').textContent = issues.length.toLocaleString('th-TH'));
  $('#dqMissing') && ($('#dqMissing').textContent = `${fmt((missing / cellCount) * 100, 1)}%`);
  const risk = !rows.length ? '—' : issues.length > rows.length * 0.1 ? 'สูง' : issues.length ? 'กลาง' : 'ต่ำ';
  $('#dqRisk') && ($('#dqRisk').textContent = risk);
  $('#dqTableBadge') && ($('#dqTableBadge').textContent = state.currentTable || 'No table');
  const result = $('#dqResult');
  if (!result) return;
  if (!rows.length) {
    result.className = 'data-table-wrap empty-state';
    result.textContent = 'ยังไม่มีข้อมูลให้ตรวจ';
    return;
  }
  if (!issues.length) {
    result.className = 'data-table-wrap empty-state';
    result.textContent = 'ไม่พบปัญหาหลักจากกฎตรวจเบื้องต้น';
    return;
  }
  result.className = 'data-table-wrap';
  result.innerHTML = `<table class="data-table"><thead><tr><th>Row</th><th>Issue</th><th>Sample</th></tr></thead><tbody>${issues.slice(0, 500).map(x => `<tr><td>${escapeHtml(x.row)}</td><td>${escapeHtml(x.issue)}</td><td>${escapeHtml(x.sample)}</td></tr>`).join('')}</tbody></table>`;
}

function maskValue(v) {
  const s = String(v ?? '');
  if (!s) return '';
  if (s.includes('@')) {
    const [name, domain] = s.split('@');
    return `${name.slice(0,2)}***@${domain || ''}`;
  }
  if (/\d/.test(s) && s.length >= 9) return `${s.slice(0,3)}******${s.slice(-3)}`;
  if (s.length > 4) return `${s.slice(0,2)}***${s.slice(-1)}`;
  return '***';
}

function renderPrivacyCenter() {
  const result = $('#privacyResult');
  if (!result) return;
  const hits = state.columns.filter(c => PII_KEYWORDS.some(k => normalizeHeaderName(c).includes(normalizeHeaderName(k))));
  $('#privacyBadge') && ($('#privacyBadge').textContent = hits.length ? `${hits.length} columns` : 'No obvious PII');
  if (!state.columns.length) {
    result.className = 'data-table-wrap empty-state';
    result.textContent = 'ยังไม่มีข้อมูลให้ตรวจ';
    return;
  }
  if (!hits.length) {
    result.className = 'data-table-wrap empty-state';
    result.textContent = 'ไม่พบชื่อคอลัมน์ที่เข้าข่ายข้อมูลส่วนบุคคลจากกฎเบื้องต้น';
    return;
  }
  result.className = 'data-table-wrap';
  result.innerHTML = `<table class="data-table"><thead><tr><th>Column</th><th>Example</th><th>Masked Example</th><th>คำแนะนำ</th></tr></thead><tbody>${hits.map(c => {
    const sample = (state.rows.find(r => !isMissing(r[c])) || {})[c] ?? '';
    return `<tr><td>${escapeHtml(c)}</td><td>${escapeHtml(sample)}</td><td>${escapeHtml(maskValue(sample))}</td><td>ควร Mask หรือไม่ใช้ใน public demo</td></tr>`;
  }).join('')}</tbody></table>`;
}

function populateLearningSelectors() {
  const tables = getTableNames();
  const tableSel = $('#learningTable');
  if (!tableSel) return;
  if (!tableSel.value || !tables.includes(tableSel.value)) {
    tableSel.innerHTML = tables.map(t => `<option value="${escapeHtml(t)}" ${t === state.currentTable ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('') || '<option value="">No table</option>';
  } else {
    const current = tableSel.value;
    tableSel.innerHTML = tables.map(t => `<option value="${escapeHtml(t)}" ${t === current ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('') || '<option value="">No table</option>';
  }
  const selectedTable = tableSel.value || state.currentTable;
  let columns = state.columns;
  if (selectedTable && selectedTable !== state.currentTable && state.db) {
    const info = state.db.exec(`PRAGMA table_info(${safeId(selectedTable)})`)[0];
    columns = info ? info.values.map(v => v[1]) : [];
  }
  const groupCols = columns.filter(c => numericValues(c).length < Math.max(3, state.rows.length * .6));
  const numCols = columns.filter(c => ['INTEGER','REAL','NUMERIC'].some(_ => true) && (state.rows.length ? numericValues(c).length > 0 : true));
  $('#learningGroup') && ($('#learningGroup').innerHTML = optionList(groupCols.length ? groupCols : columns, groupCols[0] || columns[0]));
  $('#learningMetric') && ($('#learningMetric').innerHTML = optionList(numCols.length ? numCols : columns, numCols[0] || columns[0]));
  $('#learningTableBadge') && ($('#learningTableBadge').textContent = selectedTable || 'No table');
}


function columnsForTable(table) {
  if (!state.db || !table) return [];
  try {
    const info = state.db.exec(`PRAGMA table_info(${safeId(table)})`)[0];
    return info ? info.values.map(v => v[1]) : [];
  } catch { return []; }
}

function analysisWhereClause(table) {
  const cols = columnsForTable(table);
  return cols.includes('_exclude_from_analysis') ? 'COALESCE(_exclude_from_analysis, 0) = 0' : '1 = 1';
}

function qualityWhereClause(table) {
  const cols = columnsForTable(table);
  const parts = [];
  if (cols.includes('_exclude_from_analysis')) parts.push('COALESCE(_exclude_from_analysis, 0) = 1');
  if (cols.includes('_data_quality_status')) parts.push("COALESCE(_data_quality_status, '') IN ('warning', 'error')");
  return parts.length ? parts.join('\n   OR ') : '1 = 0';
}

function buildLearningSql() {
  const table = $('#learningTable')?.value || state.currentTable || 'sales_data';
  const lesson = $('#learningLesson')?.value || 'preview';
  const group = $('#learningGroup')?.value || state.columns[0] || 'category';
  const metric = $('#learningMetric')?.value || state.columns.find(c => /sales|ยอดขาย|amount|revenue/i.test(c)) || 'net_sales';
  const validWhere = analysisWhereClause(table);
  const qualityWhere = qualityWhereClause(table);
  let sql = '';
  if (lesson === 'preview') sql = `SELECT *\nFROM ${safeId(table)}\nLIMIT 20;`;
  if (lesson === 'groupSum') sql = `SELECT\n  ${safeId(group)} AS group_name,\n  SUM(COALESCE(${safeId(metric)}, 0)) AS total_value\nFROM ${safeId(table)}\nWHERE ${validWhere}\nGROUP BY ${safeId(group)}\nORDER BY total_value DESC\nLIMIT 20;`;
  if (lesson === 'monthlyTrend') sql = `SELECT\n  COALESCE(year_month, substr(order_date, 1, 7)) AS month,\n  SUM(COALESCE(${safeId(metric)}, 0)) AS total_value\nFROM ${safeId(table)}\nWHERE ${validWhere}\nGROUP BY COALESCE(year_month, substr(order_date, 1, 7))\nORDER BY month;`;
  if (lesson === 'topCustomers') sql = `SELECT\n  COALESCE(customer_id, customer_name) AS customer,\n  COUNT(*) AS total_rows,\n  SUM(COALESCE(${safeId(metric)}, 0)) AS total_value\nFROM ${safeId(table)}\nWHERE ${validWhere}\nGROUP BY COALESCE(customer_id, customer_name)\nORDER BY total_value DESC\nLIMIT 20;`;
  if (lesson === 'profitMargin') sql = `SELECT\n  ${safeId(group)} AS group_name,\n  SUM(COALESCE(net_sales, 0)) AS total_sales,\n  SUM(COALESCE(profit, 0)) AS total_profit,\n  SUM(COALESCE(profit, 0)) / NULLIF(SUM(COALESCE(net_sales, 0)), 0) AS profit_margin\nFROM ${safeId(table)}\nWHERE ${validWhere}\nGROUP BY ${safeId(group)}\nORDER BY profit_margin DESC\nLIMIT 20;`;
  if (lesson === 'qualityRows') sql = `SELECT *\nFROM ${safeId(table)}\nWHERE ${qualityWhere}\nLIMIT 100;`;
  $('#learningSql') && ($('#learningSql').value = sql);
  renderSqlExplanation(sql);
  return sql;
}

function renderSqlExplanation(sql) {
  const explain = $('#learningExplain');
  if (!explain) return;
  const parts = [
    ['SELECT', 'เลือกคอลัมน์หรือสูตรที่ต้องการแสดงผล'],
    ['FROM', 'ระบุตารางที่จะใช้วิเคราะห์'],
    ['WHERE', 'กรองข้อมูล เช่น ไม่เอาแถวที่ถูก exclude'],
    ['SUM', 'รวมค่าตัวเลข เช่น ยอดขายหรือกำไร'],
    ['GROUP BY', 'รวมข้อมูลตามกลุ่ม เช่น หมวดสินค้า จังหวัด หรือช่องทางขาย'],
    ['ORDER BY', 'เรียงผลลัพธ์จากมากไปน้อยหรือน้อยไปมาก'],
    ['LIMIT', 'จำกัดจำนวนแถวเพื่อให้อ่านง่ายและรันเร็ว'],
    ['NULLIF', 'ป้องกันการหารด้วยศูนย์'],
    ['COALESCE', 'แทนค่า NULL ด้วยค่าที่กำหนด เช่น 0'],
  ].filter(([key]) => new RegExp(`\\b${key}\\b`, 'i').test(sql));
  explain.className = 'learning-explain';
  explain.innerHTML = parts.map(([k, v]) => `<div class="explain-row"><code>${k}</code><span>${escapeHtml(v)}</span></div>`).join('') || '<div class="empty-state">ยังไม่มี SQL ให้อธิบาย</div>';
}

function learningFriendlyError(message) {
  const m = String(message || '');
  if (/no such table/i.test(m)) return 'ไม่พบตารางนี้ กรุณาเลือกตารางจาก dropdown หรือดูรายชื่อตารางด้านซ้าย';
  if (/no such column/i.test(m)) return 'ไม่พบคอลัมน์นี้ กรุณาตรวจชื่อคอลัมน์จาก Data View / Variable View';
  if (/syntax error/i.test(m)) return 'SQL syntax อาจผิด เช่น ลืม comma, FROM, วงเล็บ หรือพิมพ์คำสั่งผิด';
  if (/near.*FORM/i.test(m)) return 'คุณอาจพิมพ์ FROM ผิดเป็น FORM';
  return m;
}

function runLearningSql() {
  const sql = $('#learningSql')?.value.trim() || buildLearningSql();
  if (!state.db || !sql) return toast('ยังไม่มีฐานข้อมูลหรือ SQL');
  const start = performance.now();
  try {
    const results = state.db.exec(sql);
    const ms = performance.now() - start;
    $('#learningMeta') && ($('#learningMeta').textContent = `${fmt(ms, 1)} ms`);
    const wrap = $('#learningResult');
    if (!wrap) return;
    if (!results.length) { wrap.className = 'data-table-wrap empty-state'; wrap.textContent = 'Query สำเร็จ แต่ไม่มี result set'; return; }
    const r = results[results.length - 1];
    state.lastLearningResult = r;
    wrap.className = 'data-table-wrap';
    wrap.innerHTML = `<table class="data-table"><thead><tr>${r.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${r.values.slice(0, 1000).map(row => `<tr>${row.map(v => `<td>${escapeHtml(v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  } catch (err) {
    const wrap = $('#learningResult');
    if (wrap) { wrap.className = 'data-table-wrap empty-state'; wrap.textContent = `SQL Error: ${learningFriendlyError(err.message)}`; }
    $('#learningMeta') && ($('#learningMeta').textContent = 'Error');
  }
}

function sendLearningSqlToEditor() {
  const sql = $('#learningSql')?.value || buildLearningSql();
  $('#sqlEditor').value = sql;
  switchView('sql');
  toast('ส่ง SQL ไปยัง SQL Editor แล้ว');
}

function buildLearningChart() {
  const r = state.lastLearningResult;
  if (!r || r.columns.length < 2) return toast('ต้องรัน SQL ที่มีอย่างน้อย 2 คอลัมน์ก่อน');
  const canvas = $('#learningChartCanvas');
  if (!canvas || !window.Chart) return toast('Chart.js ยังไม่พร้อม');
  const labels = r.values.map(v => String(v[0] ?? '')).slice(0, 30);
  let valueIndex = r.columns.findIndex((_, idx) => idx > 0 && r.values.some(row => Number.isFinite(Number(row[idx]))));
  if (valueIndex < 1) return toast('ไม่พบคอลัมน์ตัวเลขสำหรับสร้างกราฟ');
  const data = r.values.map(v => Number(v[valueIndex]) || 0).slice(0, 30);
  state.learningChart?.destroy?.();
  $('#learningChartPlaceholder') && ($('#learningChartPlaceholder').style.display = 'none');
  state.learningChart = new Chart(canvas, { type: 'bar', data: { labels, datasets: [{ label: r.columns[valueIndex], data }] }, options: { responsive: true, maintainAspectRatio: false } });
  toast('สร้างกราฟจาก SQL แล้ว');
}

function renderGuide() {
  const root = $('#guideContent');
  if (!root) return;
  const methodCards = Object.keys(analysisInfo).map(key => `<article class="guide-card">${methodCardHtml(key)}</article>`).join('');
  const tools = [
    ['Excel', 'ใช้สูตร ตาราง PivotTable และการจัดเตรียมข้อมูลสำหรับงานวิเคราะห์ธุรกิจ', 'Uses formulas, PivotTables, and structured worksheets for business analysis and reporting.', METHOD_SOURCES.excel],
    ['SQL / SQLite', 'ใช้ดึง กรอง JOIN จัดกลุ่ม และสรุปข้อมูลจากฐานข้อมูลก่อนวิเคราะห์', 'Queries, filters, joins, groups, and aggregates database data before analysis.', METHOD_SOURCES.sqlite],
    ['R / RStudio', 'ใช้คำนวณสถิติ สร้างโมเดล และกราฟด้วยภาษา R; RStudio เป็นสภาพแวดล้อมสำหรับทำงานกับ R', 'Uses R for statistical computing, modeling, and graphics; RStudio is an IDE commonly used with R.', METHOD_SOURCES.rProject],
    ['SPSS-style Statistics', 'ใช้สถิติเชิงพรรณนา การทดสอบสมมติฐาน ความสัมพันธ์ และการถดถอยในรูปแบบ Output ที่คุ้นเคย', 'Provides descriptive, hypothesis-testing, association, and regression workflows with familiar statistical output.', METHOD_SOURCES.ibmSpss],
    ['Power Query', 'ใช้แนวคิด ETL เพื่อเชื่อมต่อ ทำความสะอาด แปลง และเตรียมข้อมูลเป็นขั้นตอนที่ทำซ้ำได้', 'Uses an ETL-style workflow to connect, clean, transform, and prepare data through repeatable steps.', METHOD_SOURCES.powerQuery],
    ['Power BI', 'ใช้สร้าง data model, measures, interactive reports และ dashboards สำหรับ Business Intelligence', 'Builds data models, measures, interactive reports, and dashboards for business intelligence.', METHOD_SOURCES.powerBi],
    ['Tableau', 'ใช้ Visual Analytics เพื่อสร้าง worksheet, dashboard และ story สำหรับสื่อสาร insight', 'Uses visual analytics to create worksheets, dashboards, and stories for communicating insights.', METHOD_SOURCES.tableau],
    ['Business Problem Solving', 'เริ่มจากคำถามธุรกิจ → นิยาม KPI → ตรวจคุณภาพข้อมูล → วิเคราะห์ → ทดสอบสมมติฐาน → สรุป Insight → ข้อเสนอแนะที่นำไปใช้ได้', 'Moves from business question → KPI definition → data quality → analysis → hypothesis testing → insight → actionable recommendation.', null],
  ];
  const toolCards = tools.map(([name, th, en, url]) => `<article class="tool-guide-card"><h3>${escapeHtml(name)}</h3><p><b>TH:</b> ${escapeHtml(th)}</p><p><b>EN:</b> ${escapeHtml(en)}</p>${url ? `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Official reference / แหล่งอ้างอิงทางการ ↗</a>` : ''}</article>`).join('');
  root.innerHTML = `
    <section class="guide-section accuracy-banner">
      <div><span class="eyebrow">ACCURACY FIRST</span><h2>Statistical Accuracy / ความถูกต้องทางสถิติ</h2><p><b>TH:</b> สูตรหลักของโมดูลสถิตินี้อิง NIST/SEMATECH e-Handbook และเอกสาร IBM SPSS ทางการ โดยการวิเคราะห์ใช้ข้อมูลทุกแถวในตาราง ส่วน Data View แสดงตัวอย่างเพียง 500 แถวเพื่อความลื่นไหลของ UI</p><p><b>EN:</b> Core formulas follow the NIST/SEMATECH e-Handbook and official IBM SPSS documentation. Analyses use the full current table; only Data View is limited to a 500-row preview for UI performance.</p></div>
      <div class="accuracy-checks"><span>✓ Sample variance uses n−1</span><span>✓ Pairwise missing-data handling</span><span>✓ Two-tailed p-values</span><span>✓ 95% confidence intervals</span><span>✓ Welch + pooled independent t</span><span>✓ Formula regression tests included</span></div>
    </section>
    <section class="guide-section"><div class="guide-heading"><div><span class="eyebrow">STATISTICAL METHODS</span><h2>Formula Guide / คู่มือสูตร</h2></div><p>แต่ละการวิเคราะห์แสดง What it does / ทำอะไร, Formula / สูตร และ Official Sources / แหล่งอ้างอิง</p></div><div class="guide-grid">${methodCards}</div></section>
    <section class="guide-section"><div class="guide-heading"><div><span class="eyebrow">BUSINESS ANALYST TOOLKIT</span><h2>What each tool is for / แต่ละเครื่องมือใช้ทำอะไร</h2></div></div><div class="tool-guide-grid">${toolCards}</div></section>
    <section class="guide-section caution-card"><h2>Important limitation / ข้อจำกัดสำคัญ</h2><p><b>TH:</b> โปรแกรมนี้เป็น Web Analytics Studio ที่สร้างขึ้นเองและมีหน้าตา/แนว workflow แบบ SPSS แต่ไม่ใช่ IBM SPSS Statistics การเลือกสถิติที่ถูกต้องยังขึ้นกับการออกแบบการศึกษา ระดับการวัด สมมติฐานของแบบจำลอง และคุณภาพข้อมูล งานที่มีผลต่อการแพทย์ กฎหมาย การเงิน งานวิจัยตีพิมพ์ หรือการตัดสินใจที่มีความเสี่ยงสูงควรตรวจซ้ำด้วยซอฟต์แวร์สถิติที่ได้รับการยอมรับและผู้เชี่ยวชาญที่เกี่ยวข้อง</p><p><b>EN:</b> This is a custom browser analytics studio with an SPSS-style workflow; it is not IBM SPSS Statistics. Correct method selection still depends on study design, measurement level, model assumptions, and data quality. High-stakes or publication work should be independently validated in a recognized statistical package and reviewed by an appropriate expert.</p></section>`;
}

function populateChartSelectors(){const x=$('#chartX'),y=$('#chartY');if(!x||!y)return;x.innerHTML=optionList();const nums=state.columns.filter(c=>numericValues(c).length>=1);y.innerHTML=optionList(nums.length?nums:state.columns);}
function aggregateForChart(xCol,yCol,agg,type){if(type==='scatter'){return state.rows.map(r=>({x:Number(r[xCol]),y:Number(r[yCol])})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,1000)}const groups=new Map();for(const r of state.rows){const k=String(r[xCol]??'(Missing)');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r[yCol])}const labels=[...groups.keys()].slice(0,50);const data=labels.map(k=>{const vals=groups.get(k).filter(v=>v!==null&&v!==''&&!Number.isNaN(Number(v))).map(Number);if(agg==='count')return groups.get(k).length;if(!vals.length)return 0;return agg==='avg'?mean(vals):vals.reduce((s,v)=>s+v,0)});return{labels,data}}
function chartConfig(){const type=$('#chartType').value,xCol=$('#chartX').value,yCol=$('#chartY').value,agg=$('#chartAgg').value;if(!xCol||!yCol)throw new Error('เลือกตัวแปรก่อน');if(type==='scatter'){const pts=aggregateForChart(xCol,yCol,agg,type);return{type:'scatter',data:{datasets:[{label:`${yCol} vs ${xCol}`,data:pts}]},options:{responsive:true,maintainAspectRatio:false,scales:{x:{title:{display:true,text:xCol}},y:{title:{display:true,text:yCol}}}}}}const g=aggregateForChart(xCol,yCol,agg,type);return{type,data:{labels:g.labels,datasets:[{label:`${agg.toUpperCase()} ${yCol} by ${xCol}`,data:g.data,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false}}}
function buildChart(){try{if(!window.Chart)throw new Error('Chart.js ยังไม่พร้อม');const cfg=chartConfig();state.chart?.destroy();$('#chartPlaceholder').style.display='none';state.chart=new Chart($('#chartCanvas'),cfg);toast('สร้างกราฟแล้ว')}catch(err){toast(err.message)}}
function addChartToDashboard(){try{const cfg=chartConfig();state.dashboardCharts.push(JSON.parse(JSON.stringify(cfg)));if(state.dashboardCharts.length>6)state.dashboardCharts.shift();renderDashboard();scheduleAutosave();toast('เพิ่มกราฟลง Dashboard แล้ว')}catch(err){toast(err.message)}}
function renderDashboard(){renderMetrics();const wrap=$('#dashboardCharts');if(!state.dashboardCharts.length){wrap.innerHTML='<div class="panel empty-state">ยังไม่มีกราฟใน Dashboard — สร้างจาก Chart Builder แล้วกด Add to Dashboard</div>';return}wrap.innerHTML=state.dashboardCharts.map((_,i)=>`<article class="panel dash-chart-card"><canvas id="dashChart${i}"></canvas></article>`).join('');requestAnimationFrame(()=>state.dashboardCharts.forEach((cfg,i)=>new Chart($(`#dashChart${i}`),cfg)))}

init();
