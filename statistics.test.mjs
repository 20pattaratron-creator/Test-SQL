import assert from 'node:assert/strict';
import {
  mean, sampleVariance, sampleStdDev, adjustedFisherPearsonSkewness,
  correlationTest, simpleLinearRegression, independentTTest, pairedTTest,
  chiSquareIndependence, oneWayAnova
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
console.log('All statistical core tests passed.');
