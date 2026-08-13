# Data Insight SQL Dashboard — GitHub Pages Free Edition

เว็บวิเคราะห์ข้อมูลแบบ Static Web App สำหรับเผยแพร่ฟรีบน GitHub Pages ให้ผู้ใช้ทั่วไปทดลองวิเคราะห์ Excel/CSV, ดู Dashboard, ตรวจคุณภาพข้อมูล, แก้ไขข้อมูล, เรียน SQL และนำไปต่อยอดได้ โดยไม่ต้องมี Server

## เหมาะกับใคร

- ผู้ใช้มือใหม่ที่มีไฟล์ Excel/CSV แต่อยากดู Dashboard ทันที
- ผู้ที่ไม่รู้ SQL แต่อยากเริ่มเรียนจากข้อมูลจริง
- ครู/อาจารย์/ทีมงานที่อยากเปิดเว็บให้คนใช้ฟรี
- นักพัฒนาที่อยาก Fork ไปต่อยอดเป็นระบบวิเคราะห์ข้อมูลของตนเอง

## หลักการของเวอร์ชันนี้

เวอร์ชันนี้ออกแบบให้ใช้กับ GitHub Pages เท่านั้น จึงเป็น Static Web App 100%:

- ไม่มี Backend Node.js
- ไม่มี Vercel Functions
- ไม่มี MySQL Password หรือ Secret ใน Frontend
- วิเคราะห์ข้อมูลด้วย SQLite ใน Browser ผ่าน sql.js
- อ่าน Excel/CSV ใน Browser ผ่าน SheetJS
- สร้างกราฟใน Browser ผ่าน Plotly
- ข้อมูลที่ผู้ใช้อัปโหลดอยู่ใน Browser ของผู้ใช้เป็นหลัก ไม่ถูกส่งเข้า Server ของโปรเจกต์นี้

## ฟีเจอร์หลัก

- Excel/CSV Smart Import Wizard
- รองรับ Excel หลาย Sheet และเลือก Sheet ได้
- Mapping หัวตารางหลายภาษาเบื้องต้น
- Date Parser รองรับ ค.ศ./พ.ศ./ปี 2 หลัก
- แยกวันที่เป็น วัน เดือน ปี ไตรมาส ปี-เดือน และวันในสัปดาห์
- Data Quality Center ตรวจค่าว่าง วันที่ผิด ยอดขายผิด จำนวนติดลบ ฯลฯ
- แก้ไขข้อมูลรายแถว และเลือกไม่นำแถวผิดไปคำนวณได้
- Dashboard และ Business Analytics
- โหมดถามข้อมูลง่าย ๆ สำหรับผู้ไม่รู้ SQL
- โหมดเรียน SQL พร้อม Query Builder, Explain SQL และ Friendly Error Helper
- Table Browser, SQL Editor, MySQL Template Helper, Tableau Helper, Power BI Helper, SPSS Helper
- Mobile Friendly พร้อม Bottom Navigation
- Light/Dark Mode ธีมน้ำเงิน

## วิธีเปิดบนเครื่องตัวเอง

```bash
cd data-insight-sql-dashboard-github-pages-free
python3 -m http.server 8080
```

เปิดเว็บ:

```text
http://localhost:8080
```

หรือเปิด `index.html` โดยตรงก็ได้ แต่แนะนำผ่าน local server เพื่อให้ไฟล์และ CDN ทำงานใกล้เคียง GitHub Pages มากกว่า

## วิธีอัปโหลดขึ้น GitHub Pages

1. สร้าง GitHub Repository ใหม่ เช่น `data-insight-sql-dashboard`
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น repository
3. เข้า `Settings` → `Pages`
4. เลือก `Deploy from a branch`
5. เลือก Branch: `main`
6. เลือก Folder: `/root`
7. กด Save
8. รอ GitHub สร้างเว็บ แล้วเปิด URL รูปแบบ `https://ชื่อผู้ใช้.github.io/ชื่อ-repository/`

ดูรายละเอียดเพิ่มเติมใน `docs/GITHUB_PAGES_DEPLOY_TH.md`

## โครงสร้างสำคัญ

```text
index.html
styles.css
app.js
sample_sales.csv
manifest.webmanifest
.nojekyll
LICENSE
NOTICE.md
CONTRIBUTING.md
docs/
```

## ข้อจำกัดของ GitHub Pages

GitHub Pages เหมาะกับ HTML/CSS/JavaScript แบบ Static เท่านั้น จึงไม่เหมาะกับงานที่ต้องใช้ Server-side code โดยตรง เช่น Node.js API, Python backend, PHP backend หรือการต่อ MySQL แบบปลอดภัยจากหน้าเว็บโดยตรง

ถ้าในอนาคตต้องใช้ฐานข้อมูลจริง ให้แยกเป็นอีกเวอร์ชันหนึ่ง เช่น Frontend บน GitHub Pages และ Backend/API บนบริการอื่น แต่เวอร์ชันนี้ตั้งใจทำให้ใช้ฟรีและต่อยอดง่ายที่สุด

## เครดิตต้นฉบับ

โปรเจกต์นี้ได้รับแรงบันดาลใจและต่อยอดแนวคิดจาก:

- SQLite Manager by Goragod Wiriya
- Demo: https://goragodwiriya.github.io/SQLLite/
- Code: https://github.com/goragodwiriya/SQLLite
- License: MIT License

โปรดเก็บไฟล์ `NOTICE.md` และ `LICENSE` ไว้เสมอเมื่อเผยแพร่หรือแก้ไขต่อ

## เอกสารแนะนำ

- `docs/GITHUB_PAGES_DEPLOY_TH.md`
- `docs/OPEN_SOURCE_FREE_USE_TH.md`
- `docs/GITHUB_PAGES_LIMITATIONS_TH.md`
- `docs/SMART_IMPORT_WIZARD_TH.md`
- `docs/SQL_LEARNING_MODE_TH.md`
- `docs/DATA_QUALITY_RULES_TH.md`
- `docs/MOBILE_GUIDE_TH.md`
- `docs/SPSS_GUIDE_TH.md`
