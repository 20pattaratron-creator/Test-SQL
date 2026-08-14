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
10. Mann-Whitney U Test / แมนน์-วิตนีย์ยู (nonparametric)
11. Wilcoxon Signed-Rank Test / วิลคอกซัน (nonparametric, paired)
12. Kruskal-Wallis H Test / ครัสคัล-วอลลิส (nonparametric, k groups)

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
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .gitignore
├── .nojekyll
├── index.html
├── 404.html
├── manifest.json
├── favicon.svg
├── styles.css
├── app.js
├── statistics.js
├── statistics_test.mjs
├── sample_sales.csv
├── package.json
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
├── FORMULA_REFERENCES.md
├── README.md
└── THIRD_PARTY_NOTICES.md
```

## New in this update / อัปเดตล่าสุด

- **Undo per edit**: editing a cell, deleting a row, or adding a row now shows an inline "เลิกทำ / Undo" button in the toast for 6 seconds — reverts just that one change instantly, without touching the full-database History snapshot.
- **Type-mismatch warning**: editing a cell in a numeric (INTEGER/REAL) column with a non-numeric value now asks for confirmation before saving, explaining that statistical analyses will treat it as missing.
- **Find & Replace (bulk edit)**: a collapsible panel in Data View lets you replace a value across an entire column in one action — choose the column, find value (exact or "contains"), replacement, preview the affected row count, then apply. A restore point is captured in History beforehand.
- **Inline data editing** (previous update): double-click any cell in Data View to edit it directly — saves as a real SQL `UPDATE` behind the scenes. Add and delete rows directly from Data View too.
- **Data Quality → Edit jump link**: each flagged issue in the Data Quality Center has an "แก้ไข / Edit" button that jumps straight to that row in Data View and highlights it.
- **GitHub Actions CI + auto-deploy**: `.github/workflows/ci.yml` runs `npm run check` and `npm test` on every push/PR; `.github/workflows/deploy.yml` publishes straight to GitHub Pages on every push to `main`.
- **SECURITY.md** added for vulnerability reporting guidance on the public repo.

- **Nonparametric tests**: Mann-Whitney U, Wilcoxon Signed-Rank, and Kruskal-Wallis H are now available for skewed/ordinal data, with NIST-referenced formulas and bilingual output.
- **Query snapshot / undo**: a restore point is automatically captured before any DROP/DELETE/TRUNCATE/UPDATE/ALTER query and before file imports or "New Database" that would overwrite existing data. Restore points are listed under the "History" button in the SQL Editor (last 5 kept, in-session only).
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

---

## GitHub Pages Free Edition / เวอร์ชันสำหรับ GitHub Pages

เวอร์ชันนี้ถูกจัดโครงสร้างให้เหมาะกับการอัปโหลดขึ้น GitHub Pages และเปิดให้คนอื่นใช้ฟรีหรือนำไป Fork ต่อได้ง่าย โดยยึดโค้ดต้นแบบ `Data Analytics Studio` ที่แยกส่วนหลักเป็น:

- `index.html` — โครงสร้าง UI แบบ App Shell, Sidebar, Workspace และ Views
- `styles.css` — ธีมสีน้ำเงิน รองรับ Light/Dark และ Responsive UI
- `app.js` — Logic หลัก: SQLite, import file, SQL Editor, SPSS Mode, Charts, Dashboard, autosave
- `statistics.js` — Statistical core แยกต่างหาก เพื่อง่ายต่อการตรวจสอบสูตรและทดสอบ
- `statistics_test.mjs` — ชุดทดสอบสูตรสถิติ

### เหมาะกับ GitHub Pages เพราะ

- เป็น Static Web App 100%
- ไม่มี backend/API/server-side code
- วิเคราะห์ข้อมูลใน browser ของผู้ใช้
- ไม่ต้องตั้งค่า server หรือ database กลาง
- มี `.nojekyll` เพื่อให้ GitHub Pages เสิร์ฟไฟล์ static ตามโครงสร้างจริง

### วิธี Deploy บน GitHub Pages

**วิธีที่ 1 — อัตโนมัติ (แนะนำ):** repo นี้มี `.github/workflows/deploy.yml` อยู่แล้ว แค่:
1. สร้าง repository ใหม่ใน GitHub แล้ว push ไฟล์ทั้งหมดขึ้น branch `main`
2. เข้า `Settings → Pages → Build and deployment → Source` เลือก **GitHub Actions** (ครั้งเดียว)
3. ทุกครั้งที่ push ขึ้น `main` เว็บจะ deploy ให้อัตโนมัติ (ดูสถานะได้ที่แท็บ Actions)

**วิธีที่ 2 — Manual:**
1. สร้าง repository ใหม่ใน GitHub แล้ว Upload ไฟล์ทั้งหมดขึ้น repository
2. เข้า `Settings → Pages`
3. เลือก `Deploy from a branch`
4. เลือก branch `main` และ folder `/ (root)`
5. กด Save

> **สำคัญ:** ไฟล์ `.gitignore` และ `.nojekyll` ต้องขึ้นต้นด้วยจุด (`.`) จริงๆ เวลา push ขึ้น GitHub — ถ้าดาวน์โหลดมาจากที่อื่นแล้วเห็นเป็น `_gitignore`/`_nojekyll` (ขีดเส้นใต้) ให้เปลี่ยนชื่อก่อน commit ไม่งั้น Jekyll อาจไปกรองไฟล์ที่ขึ้นต้นด้วย `_` ทิ้งโดยไม่ตั้งใจ

หลังจาก deploy แล้วเว็บจะอยู่ที่ (แทนที่ด้วย username/repo ของคุณเอง):

```text
https://<github-username>.github.io/<repository-name>/
```

### หมายเหตุด้านความเป็นส่วนตัว

ข้อมูลที่ผู้ใช้อัปโหลดจะประมวลผลใน browser เป็นหลัก แต่ถ้าเปิดใช้งานผ่าน CDN browser จะต้องโหลด library จากภายนอก เช่น sql.js, SheetJS และ Chart.js ดังนั้นถ้าต้องใช้กับข้อมูลลับมาก ควรพิจารณา self-host dependency ภายหลัง


## v4.1 Complete Learning Update

เวอร์ชันนี้เพิ่มเนื้อหาที่คุยกันไว้ลงในโค้ด `Data Analytics Studio` ล่าสุด โดยยังเป็น Static Web App สำหรับ GitHub Pages 100%:

- **Smart Import Wizard**: อธิบาย workflow Excel/CSV หลาย Sheet, Mapping หัวตารางหลายภาษา, Date Parser ค.ศ./พ.ศ. และ checklist ก่อน import
- **SQL Learning Mode**: ผู้ใช้มือใหม่เลือกคำถามธุรกิจ แล้วระบบสร้าง SQL, อธิบายทีละส่วน, รัน query และสร้างกราฟจากผลลัพธ์
- **Data Quality Center**: ตรวจค่าว่าง วันที่อ่านไม่ได้ ตัวเลขผิดปกติ แถวที่ถูก exclude และรายการที่ควรแก้ไขก่อนคำนวณ
- **Privacy & Public Demo**: ตรวจคอลัมน์ที่อาจเป็นข้อมูลส่วนบุคคล เช่น เลขบัตร เบอร์โทร อีเมล และแนะนำการ mask ข้อมูล
- **Sample data ที่เหมาะกับ Dashboard**: ข้อมูลตัวอย่างมี customer_id, product_id, net_sales, profit, date parts และคอลัมน์ data quality

ทุกอย่างทำงานใน Browser ผ่าน sql.js, SheetJS และ Chart.js จึงเหมาะกับการอัปขึ้น GitHub Pages ให้คนใช้ฟรีหรือ Fork ไปต่อยอด
