# Formula & Method References / แหล่งอ้างอิงสูตรและวิธีวิเคราะห์

เอกสารนี้อธิบายสูตรหลักที่ใช้จริงใน **Data Analytics Studio – SPSS-style Statistics** ทั้งภาษาไทยและอังกฤษ พร้อมแหล่งอ้างอิงทางการ

This document describes the core formulas actually implemented in **Data Analytics Studio – SPSS-style Statistics**, in Thai and English, with authoritative references.

> **Important / สำคัญ:** โปรแกรมนี้เป็น implementation บน Browser ที่พัฒนาขึ้นเอง ไม่ใช่ IBM SPSS Statistics. การเลือกวิธีวิเคราะห์ที่ถูกต้องขึ้นอยู่กับ study design, measurement level, assumptions และ data quality ด้วย

## 1) Descriptive Statistics / สถิติเชิงพรรณนา

**TH:** ใช้สรุปศูนย์กลาง การกระจาย ช่วง และรูปร่างของตัวแปรเชิงปริมาณ  
**EN:** Summarizes center, spread, range, and shape of a quantitative variable.

Sample variance / ความแปรปรวนตัวอย่าง:

` s² = Σ(xᵢ − x̄)² / (n − 1) `

Sample standard deviation / ส่วนเบี่ยงเบนมาตรฐานตัวอย่าง:

` s = √s² `

Standard error of the mean / ค่าคลาดเคลื่อนมาตรฐานของค่าเฉลี่ย:

` SE = s / √n `

95% confidence interval of the mean / ช่วงความเชื่อมั่น 95% ของค่าเฉลี่ย:

` x̄ ± t(0.975, n−1) × SE `

Adjusted Fisher–Pearson skewness is used for skewness.

Official references:
- NIST Measures of Scale: https://www.itl.nist.gov/div898/handbook/eda/section3/eda356.htm
- NIST Skewness: https://www.itl.nist.gov/div898/handbook/eda/section3/eda35b.htm

## 2) Frequencies / ตารางแจกแจงความถี่

**TH:** นับจำนวนแต่ละค่า พร้อม Percent, Valid Percent และ Cumulative Percent.  
**EN:** Counts each observed value and reports Percent, Valid Percent, and Cumulative Percent.

`Percent = Frequency / Total cases × 100`

`Valid Percent = Frequency / Nonmissing cases × 100`

Missing values are excluded from Valid Percent / ค่าว่างไม่รวมในตัวหารของ Valid Percent.

Official reference:
- IBM SPSS Statistics documentation: https://www.ibm.com/docs/en/spss-statistics/32.0.0?topic=spss-statistics-32-documentation

## 3) Crosstabs / ตารางไขว้

**TH:** แสดงจำนวนกรณีร่วมกันของตัวแปรเชิงกลุ่มสองตัว โดยใช้เฉพาะ complete pairs.  
**EN:** Displays joint counts for two categorical variables using complete pairs only.

`Cell(i,j) = number of complete cases belonging to row i and column j`

Official reference:
- NIST Chi-Square / Contingency Table discussion: https://www.itl.nist.gov/div898/handbook/prc/section4/prc45.htm

## 4) Pearson Correlation / สหสัมพันธ์เพียร์สัน

**TH:** วัดความแรงและทิศทางของความสัมพันธ์เชิงเส้นระหว่างตัวแปรเชิงปริมาณสองตัว.  
**EN:** Measures the strength and direction of the linear relationship between two quantitative variables.

`Sxx = Σ(xᵢ − x̄)²`

`Syy = Σ(yᵢ − ȳ)²`

`Sxy = Σ(xᵢ − x̄)(yᵢ − ȳ)`

`r = Sxy / √(Sxx × Syy)`

For the two-sided significance test / สำหรับการทดสอบนัยสำคัญแบบสองด้าน:

`t = r × √[(n−2)/(1−r²)]`, `df = n−2`

Official references:
- NIST Dataplot Correlation: https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/correlat.htm
- IBM Bivariate Correlations: https://www.ibm.com/docs/en/spss-statistics/32.0.0?topic=features-bivariate-correlations

## 5) Simple Linear Regression / การถดถอยเชิงเส้นอย่างง่าย

**TH:** ประมาณความสัมพันธ์เชิงเส้นของ Y จาก X ด้วย Ordinary Least Squares (OLS).  
**EN:** Fits a linear relationship predicting Y from X using ordinary least squares.

`b₁ = Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²`

`b₀ = ȳ − b₁x̄`

`ŷ = b₀ + b₁x`

The implementation also reports R², Adjusted R², regression ANOVA, coefficient standard errors, t statistics, p-values, and 95% confidence intervals.

Official reference:
- NIST Linear Least Squares Regression: https://www.itl.nist.gov/div898/handbook/pmd/section1/pmd141.htm

## 6) Independent-Samples t Test / t-test สองกลุ่มอิสระ

**TH:** เปรียบเทียบค่าเฉลี่ยของสองกลุ่มอิสระ. โปรแกรมแสดงทั้ง Welch และ pooled equal-variance result เพื่อไม่ซ่อนสมมติฐานเรื่องความแปรปรวน.  
**EN:** Compares means of two independent groups. Both Welch and pooled equal-variance results are reported so the variance assumption is explicit.

Welch:

`t = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)`

Welch–Satterthwaite degrees of freedom are used.

Pooled equal variance:

`sₚ² = [(n₁−1)s₁² + (n₂−1)s₂²] / (n₁+n₂−2)`

`t = (x̄₁ − x̄₂) / [sₚ √(1/n₁ + 1/n₂)]`

Official references:
- NIST Two-Sample t Test: https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm
- IBM Independent-Samples T Test: https://www.ibm.com/docs/en/spss-statistics/32.0.0?topic=tests-independent-samples-t-test

## 7) Paired-Samples t Test / t-test แบบจับคู่

**TH:** เปรียบเทียบข้อมูลสองชุดที่มีการจับคู่ เช่น ก่อน–หลัง โดยวิเคราะห์ผลต่างในแต่ละคู่.  
**EN:** Compares paired measurements such as before/after values by analyzing within-pair differences.

`dᵢ = xᵢ − yᵢ`

`t = d̄ / (s_d / √n)`, `df = n−1`

Official reference:
- NIST Paired Observations: https://www.itl.nist.gov/div898/handbook/prc/section3/prc311.htm

## 8) Chi-Square Test of Independence / ไคสแควร์ทดสอบความเป็นอิสระ

**TH:** ทดสอบว่าตัวแปรเชิงกลุ่มสองตัวสัมพันธ์กันหรือเป็นอิสระต่อกัน.  
**EN:** Tests whether two categorical variables are associated or independent.

Expected count / ค่าคาดหมาย:

`Eᵢⱼ = (Row totalᵢ × Column totalⱼ) / n`

Pearson chi-square:

`χ² = Σ (Oᵢⱼ − Eᵢⱼ)² / Eᵢⱼ`

`df = (r−1)(c−1)`

The UI also reports expected-count diagnostics and Cramér's V. Sparse expected counts are explicitly flagged instead of silently ignored.

Official reference:
- NIST Chi-Square Test for Independence: https://www.itl.nist.gov/div898/handbook/prc/section4/prc45.htm

## 9) One-Way ANOVA / การวิเคราะห์ความแปรปรวนทางเดียว

**TH:** ทดสอบค่าเฉลี่ยของหลายกลุ่มอิสระด้วยอัตราส่วนความแปรปรวนระหว่างกลุ่มต่อภายในกลุ่ม.  
**EN:** Tests equality of means across independent groups using the ratio of between-group to within-group variation.

`F = MS_between / MS_within`

`df_between = k−1`

`df_within = N−k`

The implementation also reports η² and ω² as supplementary effect-size measures. A significant omnibus ANOVA does not by itself identify which pairs of groups differ.

Official references:
- NIST One-Way ANOVA: https://www.itl.nist.gov/div898/handbook/ppc/section2/ppc231.htm
- IBM One-Way ANOVA: https://www.ibm.com/docs/en/spss-statistics/32.0.0?topic=features-one-way-anova

---

# Business Analyst Tool Guide / คู่มือเครื่องมือ Business Analyst

## Excel
**TH:** สูตร, PivotTable, ตาราง และ workflow สำหรับสรุป/ตรวจ/วิเคราะห์ข้อมูลธุรกิจ.  
**EN:** Formulas, PivotTables, structured tables, and workflows for business analysis.

Official: https://support.microsoft.com/en-us/excel/

## SQL / SQLite
**TH:** SELECT, WHERE, JOIN, GROUP BY และ aggregation สำหรับดึงและเตรียมข้อมูลจากฐานข้อมูล.  
**EN:** SELECT, WHERE, JOIN, GROUP BY, and aggregation for retrieving and preparing database data.

Official: https://sqlite.org/lang_select.html

## R / RStudio
**TH:** R ใช้สำหรับ statistical computing, modeling และ graphics; RStudio เป็น IDE ที่นิยมใช้ร่วมกับ R.  
**EN:** R is used for statistical computing, modeling, and graphics; RStudio is a commonly used IDE for R.

Official R Project: https://www.r-project.org/about.html

## Power Query
**TH:** Data preparation / ETL แบบเป็นขั้นตอนสำหรับเชื่อมต่อ ทำความสะอาด และแปลงข้อมูล.  
**EN:** Step-based data preparation / ETL for connecting, cleaning, and transforming data.

Official: https://learn.microsoft.com/en-us/power-query/power-query-what-is-power-query

## Power BI
**TH:** สร้าง data model, measures, visual reports และ dashboards.  
**EN:** Builds data models, measures, visual reports, and dashboards.

Official: https://learn.microsoft.com/th-th/power-bi/fundamentals/power-bi-overview

## Tableau
**TH:** Visual analytics สำหรับ worksheet, dashboard และ story.  
**EN:** Visual analytics for worksheets, dashboards, and stories.

Official: https://help.tableau.com/current/guides/get-started-tutorial/en-us/get-started-tutorial-home.htm

---

## Validation / การตรวจสอบความถูกต้อง

The core calculation module is isolated in `statistics.js`. A regression test suite is included in `statistics.test.mjs`, with expected values cross-checked against a reference scientific-computing implementation during development.

Run locally with Node.js:

```bash
node statistics.test.mjs
```

Expected output:

```text
All statistical core tests passed.
```
