# Data Analytics Studio — Blue Theme + SPSS-style Verified Statistics

เว็บแอปสำหรับ **SQLite + Data Analytics + SPSS-style Statistics + Charts + Dashboard** ทำงานใน Browser พร้อม Light/Dark Mode และคำอธิบายสองภาษา (ไทย/English)

Browser-based **SQLite + Data Analytics + SPSS-style Statistics + Charts + Dashboard** workspace with Light/Dark Mode and bilingual Thai/English explanations.

## Highlights / จุดเด่น

- Blue UI theme with Light / Dark Mode
- SQLite Manager and SQL Editor
- Import CSV / Excel / SQLite and experimental SPSS `.sav`
- Data View preview 500 rows for UI performance
- **Statistical analyses use the complete current table** (not a silent 5,000-row sample)
- Variable View and Data Profile
- SPSS-style statistical output with bilingual explanations
- Formula/source links inside the UI
- Chart Builder and Dashboard
- Guide / คู่มือ explaining each statistical method and each Business Analyst tool

## Statistical Methods / วิธีวิเคราะห์สถิติ

1. Descriptive Statistics / สถิติเชิงพรรณนา
2. Frequencies / ตารางแจกแจงความถี่
3. Crosstabs / ตารางไขว้
4. Pearson Correlation / สหสัมพันธ์เพียร์สัน
5. Simple Linear Regression / การถดถอยเชิงเส้นอย่างง่าย
6. Independent-Samples t Test / t-test สองกลุ่มอิสระ
7. Paired-Samples t Test / t-test แบบจับคู่
8. Chi-Square Test of Independence / ไคสแควร์ทดสอบความเป็นอิสระ
9. One-Way ANOVA / ANOVA ทางเดียว

Core formulas are implemented in `statistics.js` and documented in [`FORMULA_REFERENCES.md`](FORMULA_REFERENCES.md). Primary formula references use the NIST/SEMATECH statistical handbook / NIST Dataplot documentation, with official IBM SPSS documentation used for SPSS workflow context.

## Accuracy Improvements / การปรับปรุงความถูกต้อง

- Sample variance and sample standard deviation use denominator `n − 1`.
- Adjusted Fisher–Pearson skewness is used.
- Statistical procedures use explicit missing-value handling.
- Correlation/regression/t-test pairwise procedures use complete numeric pairs only.
- Pearson correlation includes two-sided significance testing.
- Regression reports OLS model summary, ANOVA, coefficient SE, t, p, and 95% CI.
- Independent t test reports both Welch and pooled equal-variance versions.
- Paired t test analyzes within-pair differences.
- Chi-square computes expected counts from marginal totals and flags sparse expected counts.
- One-way ANOVA reports between/within sums of squares, mean squares, F, p and supplementary effect sizes.
- Frequencies are sorted naturally so cumulative percent follows the displayed value order.
- Crosstab totals are based on the same complete-pair cases as table cells.

## Business Analyst Guide / คู่มือ Business Analyst

The built-in Guide explains the purpose of:

- Excel
- SQL / SQLite
- R / RStudio
- SPSS-style Statistics
- Power Query
- Power BI
- Tableau
- Business Problem Solving

Each item includes Thai and English descriptions plus official reference links where applicable.

## Run / วิธีเปิด

Because the app loads WebAssembly and ES modules, run it through a local web server rather than double-clicking `index.html`.

```bash
cd data-analytics-studio
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## Formula Validation Test / ชุดทดสอบสูตร

If Node.js is installed:

```bash
node statistics.test.mjs
```

Expected:

```text
All statistical core tests passed.
```

## Files / โครงสร้างไฟล์

```text
data-analytics-studio/
├── index.html
├── 404.html
├── manifest.json
├── favicon.svg
├── styles.css
├── app.js
├── statistics.js
├── statistics_test.mjs
├── FORMULA_REFERENCES.md
├── README.md
└── THIRD_PARTY_NOTICES.md
```

## New in this update / อัปเดตล่าสุด

- **Auto-save (IndexedDB)**: the working SQLite database and dashboard charts are saved to the browser's IndexedDB automatically after every change, and restored the next time you open the app — refreshing the page or closing the tab no longer loses your work.
- **Confirm before destructive actions**: "New Database" and "Reset Dashboard" now ask for confirmation before clearing data.
- **Levene's Test** (Brown–Forsythe, median-based) is now reported alongside the Independent-Samples t Test and the One-Way ANOVA to check the equal-variance assumption.
- **Post-hoc pairwise comparisons** are now reported automatically after a significant One-Way ANOVA (pairwise Welch t-tests with Bonferroni correction — chosen over Tukey HSD because it does not require assuming equal variances and needs no studentized-range approximation).

## Production Readiness Notes / บันทึกความพร้อมใช้งาน

- A full-screen boot loader shows load progress and automatically hides once the SQLite engine and sample data are ready.
- If the CDN libraries (sql.js, SheetJS, Chart.js) fail to load — e.g. a blocked network or ad blocker — the boot screen shows a bilingual explanation and a Retry button instead of hanging silently.
- `favicon.svg` + `manifest.json` make the app installable/bookmarkable with a proper icon (Add to Home Screen on mobile).
- `404.html` gives GitHub Pages a branded not-found page.
- Open Graph / Twitter meta tags are included so shared links show a title and description.

## Important Statistical Limitation / ข้อจำกัดสำคัญ

This project is a custom browser analytics application with an SPSS-style workflow; **it is not IBM SPSS Statistics**. Statistical correctness is not only a matter of formulas. Method selection depends on study design, measurement level, independence, distributional/model assumptions, missing-data mechanism, and data quality.

โปรแกรมนี้เป็นเว็บแอปที่พัฒนาขึ้นเองและใช้ workflow แบบ SPSS แต่ **ไม่ใช่ IBM SPSS Statistics** ความถูกต้องไม่ได้ขึ้นกับสูตรเพียงอย่างเดียว แต่ยังขึ้นกับการออกแบบการศึกษา ระดับการวัด ความเป็นอิสระ สมมติฐานของโมเดล ลักษณะข้อมูลสูญหาย และคุณภาพข้อมูล

For high-stakes decisions, regulated work, or publication, independently validate results in a recognized statistical package and have the analysis reviewed by an appropriate domain/statistics expert.
