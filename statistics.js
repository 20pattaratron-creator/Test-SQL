/**
 * Data Analytics Studio — Statistical Core
 * Pure JavaScript statistical functions with explicit sample-statistic conventions.
 *
 * Reference conventions:
 * - Sample variance / SD use denominator n - 1 (NIST e-Handbook, Measures of Scale).
 * - Skewness uses adjusted Fisher-Pearson coefficient G1 (NIST e-Handbook).
 * - Independent t test implements Welch-Satterthwaite and pooled equal-variance variants.
 * - Paired t test operates on within-row differences.
 * - Chi-square independence uses expected = row total × column total / grand total.
 * - One-way ANOVA uses between- and within-group sums of squares.
 */

const EPS = 1e-14;

export function cleanNumeric(values) {
  return values
    .filter(v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)))
    .map(Number);
}

export function mean(values) {
  const a = cleanNumeric(values);
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN;
}

export function median(values) {
  const a = cleanNumeric(values).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function sampleVariance(values) {
  const a = cleanNumeric(values);
  if (a.length < 2) return NaN;
  const m = a.reduce((s, v) => s + v, 0) / a.length;
  return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1);
}

export function sampleStdDev(values) {
  const v = sampleVariance(values);
  return Number.isFinite(v) ? Math.sqrt(v) : NaN;
}

export function standardError(values) {
  const a = cleanNumeric(values);
  return a.length > 1 ? sampleStdDev(a) / Math.sqrt(a.length) : NaN;
}

export function adjustedFisherPearsonSkewness(values) {
  const a = cleanNumeric(values);
  const n = a.length;
  if (n < 3) return NaN;
  const m = mean(a);
  let s2 = 0;
  let s3 = 0;
  for (const v of a) {
    const d = v - m;
    s2 += d * d;
    s3 += d * d * d;
  }
  const m2 = s2 / n;
  const m3 = s3 / n;
  if (m2 <= EPS) return 0;
  const g1 = m3 / (m2 ** 1.5);
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
}

export function pearsonCorrelation(xValues, yValues) {
  const n = Math.min(xValues.length, yValues.length);
  if (n < 2) return NaN;
  const x = xValues.slice(0, n).map(Number);
  const y = yValues.slice(0, n).map(Number);
  if (!x.every(Number.isFinite) || !y.every(Number.isFinite)) return NaN;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const denom = Math.sqrt(sxx * syy);
  return denom > EPS ? sxy / denom : NaN;
}

// ---------- Probability distributions (for p-values and confidence limits) ----------

// Lanczos approximation for log Gamma.
export function logGamma(z) {
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betaContinuedFraction(a, b, x) {
  const MAX_ITER = 300;
  const FPMIN = 1e-300;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;

    aa = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}

export function regularizedBeta(x, a, b) {
  if (!(a > 0) || !(b > 0)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) return (bt * betaContinuedFraction(a, b, x)) / a;
  return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

export function studentTCdf(t, df) {
  if (!(df > 0) || Number.isNaN(t)) return NaN;
  if (t === Infinity) return 1;
  if (t === -Infinity) return 0;
  if (t === 0) return 0.5;
  const x = df / (df + t * t);
  const ib = regularizedBeta(x, df / 2, 0.5);
  return t > 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

export function studentTInv(p, df) {
  if (!(df > 0) || !(p > 0 && p < 1)) return NaN;
  if (Math.abs(p - 0.5) < EPS) return 0;
  const sign = p < 0.5 ? -1 : 1;
  const target = p < 0.5 ? 1 - p : p;
  let lo = 0;
  let hi = 1;
  while (studentTCdf(hi, df) < target && hi < 1e6) hi *= 2;
  for (let i = 0; i < 120; i++) {
    const mid = (lo + hi) / 2;
    if (studentTCdf(mid, df) < target) lo = mid;
    else hi = mid;
  }
  return sign * (lo + hi) / 2;
}

function regularizedGammaP(a, x) {
  if (!(a > 0) || x < 0) return NaN;
  if (x === 0) return 0;
  const ITMAX = 300;
  const EPSG = 3e-14;
  const FPMIN = 1e-300;
  const gln = logGamma(a);

  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let sum = del;
    for (let n = 1; n <= ITMAX; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * EPSG) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }

  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= ITMAX; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPSG) break;
  }
  const q = Math.exp(-x + a * Math.log(x) - gln) * h;
  return 1 - q;
}

export function chiSquareCdf(x, df) {
  if (!(df > 0)) return NaN;
  if (x <= 0) return 0;
  if (x === Infinity) return 1;
  return regularizedGammaP(df / 2, x / 2);
}

export function fCdf(x, df1, df2) {
  if (!(df1 > 0) || !(df2 > 0)) return NaN;
  if (x <= 0) return 0;
  if (x === Infinity) return 1;
  const z = (df1 * x) / (df1 * x + df2);
  return regularizedBeta(z, df1 / 2, df2 / 2);
}

export function twoTailedTPValue(t, df) {
  if (!Number.isFinite(t) || !(df > 0)) return NaN;
  const upper = 1 - studentTCdf(Math.abs(t), df);
  return Math.min(1, Math.max(0, 2 * upper));
}

// ---------- Inferential procedures ----------

export function correlationTest(xValues, yValues) {
  const n = Math.min(xValues.length, yValues.length);
  const r = pearsonCorrelation(xValues, yValues);
  if (n < 3 || !Number.isFinite(r)) return { n, r, df: n - 2, t: NaN, p: NaN };
  if (Math.abs(r) >= 1 - 1e-15) return { n, r, df: n - 2, t: Math.sign(r) * Infinity, p: 0 };
  const df = n - 2;
  const t = r * Math.sqrt(df / (1 - r * r));
  return { n, r, df, t, p: twoTailedTPValue(t, df) };
}

export function simpleLinearRegression(xValues, yValues, alpha = 0.05) {
  const n = Math.min(xValues.length, yValues.length);
  const x = xValues.slice(0, n).map(Number);
  const y = yValues.slice(0, n).map(Number);
  if (n < 3 || !x.every(Number.isFinite) || !y.every(Number.isFinite)) {
    throw new Error('Simple linear regression requires at least 3 complete numeric pairs.');
  }
  const mx = mean(x);
  const my = mean(y);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx <= EPS) throw new Error('Independent variable has zero variance.');
  if (syy <= EPS) throw new Error('Dependent variable has zero variance.');

  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const residual = y[i] - (intercept + slope * x[i]);
    sse += residual * residual;
  }
  // Numerical guard: SSR = SST - SSE should not be slightly negative.
  const sst = syy;
  const ssr = Math.max(0, sst - sse);
  const dfModel = 1;
  const dfResidual = n - 2;
  const msModel = ssr / dfModel;
  const mse = sse / dfResidual;
  const see = Math.sqrt(mse);
  const r2 = Math.min(1, Math.max(0, 1 - sse / sst));
  const adjustedR2 = 1 - (1 - r2) * ((n - 1) / dfResidual);
  const r = sxy / Math.sqrt(sxx * syy);
  const f = mse > EPS ? msModel / mse : Infinity;
  const pModel = Number.isFinite(f) ? Math.max(0, 1 - fCdf(f, dfModel, dfResidual)) : 0;
  const seSlope = Math.sqrt(mse / sxx);
  const seIntercept = Math.sqrt(mse * (1 / n + (mx * mx) / sxx));
  const tSlope = seSlope > EPS ? slope / seSlope : Math.sign(slope) * Infinity;
  const tIntercept = seIntercept > EPS ? intercept / seIntercept : Math.sign(intercept) * Infinity;
  const pSlope = Number.isFinite(tSlope) ? twoTailedTPValue(tSlope, dfResidual) : 0;
  const pIntercept = Number.isFinite(tIntercept) ? twoTailedTPValue(tIntercept, dfResidual) : 0;
  const tCrit = studentTInv(1 - alpha / 2, dfResidual);

  return {
    n, r, r2, adjustedR2, slope, intercept,
    sst, ssr, sse, dfModel, dfResidual, msModel, mse, see, f, pModel,
    seSlope, seIntercept, tSlope, tIntercept, pSlope, pIntercept,
    slopeCi: [slope - tCrit * seSlope, slope + tCrit * seSlope],
    interceptCi: [intercept - tCrit * seIntercept, intercept + tCrit * seIntercept],
  };
}

export function independentTTest(group1Values, group2Values, alpha = 0.05) {
  const x = cleanNumeric(group1Values);
  const y = cleanNumeric(group2Values);
  if (x.length < 2 || y.length < 2) throw new Error('Each independent group needs at least 2 numeric observations.');
  const n1 = x.length, n2 = y.length;
  const m1 = mean(x), m2 = mean(y);
  const v1 = sampleVariance(x), v2 = sampleVariance(y);
  const diff = m1 - m2;

  const seWelch = Math.sqrt(v1 / n1 + v2 / n2);
  const tWelch = seWelch > EPS ? diff / seWelch : NaN;
  const dfWelch = ((v1 / n1 + v2 / n2) ** 2) /
    (((v1 / n1) ** 2) / (n1 - 1) + ((v2 / n2) ** 2) / (n2 - 1));
  const pWelch = twoTailedTPValue(tWelch, dfWelch);
  const critWelch = studentTInv(1 - alpha / 2, dfWelch);

  const dfPooled = n1 + n2 - 2;
  const pooledVar = (((n1 - 1) * v1) + ((n2 - 1) * v2)) / dfPooled;
  const pooledSd = Math.sqrt(pooledVar);
  const sePooled = pooledSd * Math.sqrt(1 / n1 + 1 / n2);
  const tPooled = sePooled > EPS ? diff / sePooled : NaN;
  const pPooled = twoTailedTPValue(tPooled, dfPooled);
  const critPooled = studentTInv(1 - alpha / 2, dfPooled);
  const cohenD = pooledSd > EPS ? diff / pooledSd : NaN;
  const correction = 1 - 3 / (4 * dfPooled - 1);
  const hedgesG = Number.isFinite(cohenD) ? correction * cohenD : NaN;

  return {
    n1, n2, mean1: m1, mean2: m2, sd1: Math.sqrt(v1), sd2: Math.sqrt(v2), diff,
    welch: { t: tWelch, df: dfWelch, se: seWelch, p: pWelch, ci: [diff - critWelch * seWelch, diff + critWelch * seWelch] },
    pooled: { t: tPooled, df: dfPooled, se: sePooled, p: pPooled, pooledSd, ci: [diff - critPooled * sePooled, diff + critPooled * sePooled] },
    cohenD, hedgesG,
  };
}

export function pairedTTest(xValues, yValues, alpha = 0.05) {
  const n = Math.min(xValues.length, yValues.length);
  if (n < 2) throw new Error('Paired t test needs at least 2 complete pairs.');
  const d = [];
  for (let i = 0; i < n; i++) {
    const x = Number(xValues[i]), y = Number(yValues[i]);
    if (Number.isFinite(x) && Number.isFinite(y)) d.push(x - y);
  }
  if (d.length < 2) throw new Error('Paired t test needs at least 2 complete numeric pairs.');
  const nd = d.length;
  const md = mean(d);
  const sd = sampleStdDev(d);
  const se = sd / Math.sqrt(nd);
  const t = se > EPS ? md / se : NaN;
  const df = nd - 1;
  const p = twoTailedTPValue(t, df);
  const crit = studentTInv(1 - alpha / 2, df);
  return {
    n: nd, meanDifference: md, sdDifference: sd, seDifference: se, t, df, p,
    ci: [md - crit * se, md + crit * se],
    cohenDz: sd > EPS ? md / sd : NaN,
  };
}

export function chiSquareIndependence(observed) {
  const matrix = observed.map(row => row.map(Number));
  const r = matrix.length;
  const c = matrix[0]?.length || 0;
  if (r < 2 || c < 2 || matrix.some(row => row.length !== c || row.some(v => !Number.isFinite(v) || v < 0))) {
    throw new Error('Chi-square independence requires a rectangular nonnegative table with at least 2 rows and 2 columns.');
  }
  const rowTotals = matrix.map(row => row.reduce((s, v) => s + v, 0));
  const colTotals = Array.from({ length: c }, (_, j) => matrix.reduce((s, row) => s + row[j], 0));
  const total = rowTotals.reduce((s, v) => s + v, 0);
  if (total <= 0) throw new Error('Contingency table has no observations.');

  const expected = matrix.map((_, i) => Array.from({ length: c }, (_, j) => rowTotals[i] * colTotals[j] / total));
  let chi2 = 0;
  let expectedBelow5 = 0;
  let expectedBelow1 = 0;
  for (let i = 0; i < r; i++) {
    for (let j = 0; j < c; j++) {
      const e = expected[i][j];
      if (e < 5) expectedBelow5++;
      if (e < 1) expectedBelow1++;
      if (e > 0) chi2 += ((matrix[i][j] - e) ** 2) / e;
    }
  }
  const df = (r - 1) * (c - 1);
  const p = Math.max(0, 1 - chiSquareCdf(chi2, df));
  const cramerV = Math.sqrt(chi2 / (total * Math.min(r - 1, c - 1)));
  return { chi2, df, p, total, expected, rowTotals, colTotals, cramerV, expectedBelow5, expectedBelow1, cells: r * c };
}

export function oneWayAnova(groupEntries) {
  const groups = groupEntries
    .map(g => ({ label: g.label, values: cleanNumeric(g.values) }))
    .filter(g => g.values.length > 0);
  if (groups.length < 2) throw new Error('One-way ANOVA needs at least 2 non-empty groups.');
  if (groups.some(g => g.values.length < 2)) throw new Error('Each ANOVA group needs at least 2 observations for a stable within-group variance estimate.');

  const all = groups.flatMap(g => g.values);
  const n = all.length;
  const k = groups.length;
  const grandMean = mean(all);
  let ssBetween = 0;
  let ssWithin = 0;
  const summaries = groups.map(g => {
    const m = mean(g.values);
    const sd = sampleStdDev(g.values);
    ssBetween += g.values.length * (m - grandMean) ** 2;
    ssWithin += g.values.reduce((s, v) => s + (v - m) ** 2, 0);
    return { label: g.label, n: g.values.length, mean: m, sd };
  });
  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = n - k;
  if (dfWithin <= 0) throw new Error('Not enough residual degrees of freedom for ANOVA.');
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msWithin > EPS ? msBetween / msWithin : Infinity;
  const p = Number.isFinite(f) ? Math.max(0, 1 - fCdf(f, dfBetween, dfWithin)) : 0;
  const etaSquared = ssTotal > EPS ? ssBetween / ssTotal : NaN;
  const omegaSquared = ssTotal + msWithin > EPS ? (ssBetween - dfBetween * msWithin) / (ssTotal + msWithin) : NaN;
  return { n, k, grandMean, summaries, ssBetween, ssWithin, ssTotal, dfBetween, dfWithin, msBetween, msWithin, f, p, etaSquared, omegaSquared };
}
