# Data Analytics Studio

เว็บแอปแบบ Static (HTML + CSS + JavaScript) สำหรับจัดการ SQLite, วิเคราะห์ข้อมูลแบบ SPSS-style และสร้างกราฟ/Dashboard ใน Browser

## ความสามารถใน Prototype

- เปิด/สร้าง/บันทึก SQLite (`.db`, `.sqlite`, `.sqlite3`)
- Import CSV / Excel (`.xlsx`, `.xls`) เป็น SQLite table
- Import SPSS `.sav` แบบ Experimental ผ่าน `jsavvy` CDN
- Data View และ Variable View แบบใกล้เคียงแนวคิด SPSS
- SQL Editor และ Query Result
- SPSS Mode
  - Descriptive Statistics
  - Frequencies
  - Crosstabs
  - Pearson Correlation
  - Simple Linear Regression
- Chart Builder: Bar, Line, Pie, Scatter
- Dashboard ที่บันทึกกราฟจาก Chart Builder
- Dark / Light Theme
- Export CSV และ SQLite
- Sample sales dataset ในตัว

## วิธีเปิด

เนื่องจากมี WebAssembly / ES Module แนะนำให้เปิดผ่าน Local Web Server แทนการดับเบิลคลิก `index.html`

### วิธีที่ 1: Python

```bash
cd data-analytics-studio
python -m http.server 8080
```

จากนั้นเปิด `http://localhost:8080`

### วิธีที่ 2: VS Code

ติดตั้ง Live Server แล้วเลือก **Open with Live Server** ที่ `index.html`

## Dependencies (โหลดผ่าน CDN)

- sql.js — SQLite in the browser
- SheetJS — CSV / Excel import
- Chart.js — Charts
- jsavvy — Experimental SPSS `.sav` reader

ดังนั้นการเปิดครั้งแรกต้องมีอินเทอร์เน็ต หากต้องการทำเป็น Offline 100% ให้ดาวน์โหลด dependency มาไว้ใน `vendor/` และแก้ URL ใน `index.html` / `app.js`

## หมายเหตุ SPSS

`SPSS Mode` ในโปรเจกต์นี้หมายถึง UI/Workflow และชุดการวิเคราะห์สถิติที่คล้ายการใช้งาน SPSS ไม่ใช่ IBM SPSS Statistics และไม่ได้ใช้โค้ดของ IBM SPSS

การอ่าน `.sav` ใช้ parser โอเพนซอร์สที่ยังอยู่ระหว่างการพัฒนา จึงอาจไม่รองรับ `.sav` บางชนิด โดยเฉพาะรูปแบบ compression/encoding/metadata บางแบบ หากอ่านไม่สำเร็จให้ Export จาก SPSS/PSPP เป็น CSV หรือ Excel ก่อน

## โครงสร้าง

```text
data-analytics-studio/
├── index.html
├── styles.css
├── app.js
└── README.md
```

## แนวทางต่อยอด

- IndexedDB autosave workspace
- Query history / Saved query
- Editable Data View
- Value Labels / Missing Values / Measure settings
- Chi-square, t-test, ANOVA, non-parametric tests
- Multiple regression / Logistic regression
- Pivot table builder
- Dashboard filters / slicers
- Export dashboard เป็น PDF/PNG
- PWA และ Offline mode
- Web Worker สำหรับ dataset ขนาดใหญ่


## Blue Light / Dark Theme

- UI ใหม่ใช้ Blue Design System ทั้งระบบ
- Light Mode: พื้นขาว/ฟ้าอ่อน พร้อม Sidebar สีน้ำเงินเข้ม
- Dark Mode: Navy / Deep Blue ลดแสงจ้าและยังคง contrast ของข้อมูล
- ปุ่มสลับ Light / Dark อยู่ด้านขวาบน
- ระบบจำธีมล่าสุดด้วย localStorage
- หากยังไม่เคยเลือก จะอิง theme preference ของระบบปฏิบัติการ
