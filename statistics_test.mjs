import assert from 'node:assert/strict';
import {
  mean, sampleVariance, sampleStdDev, adjustedFisherPearsonSkewness,
  correlationTest, simpleLinearRegression, independentTTest, pairedTTest,
  chiSquareIndependence, oneWayAnova, leveneTest, pairwisePostHoc,
  mannWhitneyU, wilcoxonSignedRank, kruskalWallis, normalCdf
} from './statistics.js';
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t, `${a} != ${b}`);
const x=[1,2,3,4,5], y=[2,1,4,3,7];
close(mean(x),3); close(sampleVariance(x),2.5); close(sampleStdDev(x),1.5811388300841898); close(adjustedFisherPearsonSkewness(x),0);
const c=correlationTest(x,y); close(c.r,0.8241633836921339); close(c.p,0.08613863131395952,1e-10);
const r=simpleLinearRegression(x,y); close(r.slope,1.2); close(r.intercept,-0.2); close(r.r2,0.6792452830188681); close(r.pSlope,0.08613863131395932,1e-10); close(r.f,6.352941176470593);
const it=independentTTest([10,11,9,10,12],[14,13,15,16,12,14]); close(it.welch.t,-4.673617082005487); close(it.welch.df,8.998579948878161); close(it.welch.p,0.0011631284348993449,1e-10); close(it.pooled.t,-4.57473820727173); close(it.pooled.p,0.0013378197569339674,1e-10);
const pt=pairedTTest([10,12,9,13,11],[9,11,9,12,10]); close(pt.t,4); close(pt.p,0.016130089900092546,1e-10);
const chi=chiSquareIndependence([[10,20,30],[6,9,17]]); close(chi.chi2,0.27157465150403504); close(chi.p,0.873028283380073,1e-10);
const an=oneWayAnova([{label:'A',values:[1,2,3]},{label:'B',values:[2,3,4]},{label:'C',values:[6,7,8]}]); close(an.f,21); close(an.p,0.001953125,1e-12);

// Levene's test: identical within-group deviation patterns across groups -> between-group SS is 0 -> F = 0, p = 1
const levEqual = leveneTest([{label:'A',values:[1,2,3,4,5]},{label:'B',values:[1,2,3,4,5]}]);
close(levEqual.statistic,0); close(levEqual.p,1);
// Groups with clearly different spread should report a positive F statistic
const levDiff = leveneTest([{label:'A',values:[10,10,10,10,10]},{label:'B',values:[1,5,9,13,17]}]);
assert.ok(levDiff.statistic > 0 && Number.isFinite(levDiff.statistic));
assert.ok(levDiff.p >= 0 && levDiff.p <= 1);

// Pairwise post-hoc: 3 groups -> 3 comparisons, Bonferroni-adjusted p >= raw p
const ph = pairwisePostHoc([{label:'A',values:[1,2,3]},{label:'B',values:[2,3,4]},{label:'C',values:[6,7,8]}]);
assert.equal(ph.comparisons.length,3);
assert.equal(ph.m,3);
for (const c of ph.comparisons) {
  assert.ok(c.pAdjusted >= c.p - 1e-12 && c.pAdjusted <= 1);
}
const acVsAb = ph.comparisons.find(c=>c.a==='A'&&c.b==='C');
assert.ok(acVsAb.significant, 'A vs C should be significant given the large mean gap');

// Mann-Whitney U: exact algebraic check with no ties (group 1 strictly below group 2)
const mw = mannWhitneyU([1,2,3],[4,5,6]);
close(mw.u1,0); close(mw.u2,9); close(mw.meanU,4.5); close(mw.sigmaU,Math.sqrt(5.25),1e-9);
assert.ok(mw.p >= 0 && mw.p <= 1);

// Wilcoxon signed-rank: no-tie case where meanW/sigmaW have a known closed form
// (mean_W = n(n+1)/4, sigma_W = sqrt(n(n+1)(2n+1)/24) for n = 25, no ties)
const wsr = wilcoxonSignedRank(Array.from({length:25},(_,i)=>i+1), Array.from({length:25},()=>0));
assert.equal(wsr.n,25); assert.equal(wsr.wMinus,0);
close(wsr.meanW,162.5); close(wsr.sigmaW,Math.sqrt(1381.25),1e-6);

// Kruskal-Wallis: exact hand-computable case with no ties (3 groups of 2, strictly ordered)
const kw = kruskalWallis([{label:'A',values:[1,2]},{label:'B',values:[3,4]},{label:'C',values:[5,6]}]);
close(kw.h, 4.571428571428571, 1e-9); assert.equal(kw.df,2);
close(normalCdf(0), 0.5, 1e-6);

console.log('All statistical core tests passed.');
