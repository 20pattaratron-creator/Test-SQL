# Data Insight SQL Dashboard Pro Friendly

เว็บสำหรับงาน Data Analyst / Data Science / Business Analytics ที่ต่อยอดแนวคิดจาก SQLite Manager โดย Goragod Wiriya พร้อมเพิ่ม Dashboard, Business Analytics Assistant, Data Quality, SQL Editor, MySQL Backend, Tableau Helper และ Power BI Add-on


## Friendly Update

เวอร์ชันนี้เพิ่มการใช้งานที่เป็นมิตรกับผู้เริ่มต้นมากขึ้น:

- หน้า “เริ่มต้น” สำหรับผู้ที่ไม่เคยใช้ SQL มาก่อน
- ปุ่ม “ลองด้วยข้อมูลตัวอย่าง” เพื่อนำผู้ใช้ไป Dashboard ได้ทันที
- คำอธิบายศัพท์ธุรกิจ เช่น Sales, Profit, Profit Margin, AOV, RFM, Churn Risk
- ปุ่มเปลี่ยนโหมดสว่าง/โหมดมืด
- ธีมหลักสีน้ำเงินทั้งสองโหมด
- ปรับข้อความปุ่มและคำอธิบายเป็นภาษาไทยที่เข้าใจง่ายขึ้น
- เพิ่มคู่มือ `docs/FRIENDLY_USER_GUIDE_TH.md`

## เครดิตต้นฉบับ

โปรเจกต์นี้ได้รับแรงบันดาลใจและต่อยอดแนวคิดจาก:

- SQLite Manager by Goragod Wiriya
- Demo: https://goragodwiriya.github.io/SQLLite/
- Code: https://github.com/goragodwiriya/SQLLite
- License: MIT License

โปรดเก็บไฟล์ `NOTICE.md` และ `LICENSE` ไว้เสมอเมื่อเผยแพร่หรือแก้ไขต่อ

## ฟีเจอร์หลัก

- Static Web App: HTML/CSS/JavaScript
- SQLite ใน Browser ผ่าน sql.js
- Import CSV เป็น SQLite Table
- Query SQL และ Export Result เป็น CSV
- Dashboard KPI: Total, Average, Profit, Profit Margin, Customer Count
- Business Analytics Assistant: Sales Growth, AOV, Profit Margin, RFM, Churn Risk, Product Strategy Matrix และ Recommendation
- Data Quality Check: Missing Value, Duplicate, Preview
- MySQL Helper: สร้าง Query สำหรับ MySQL Workbench / Tableau
- Optional Node.js Backend สำหรับเชื่อม MySQL จริงแบบ read-only
- Tableau Helper: สูตร Calculated Fields และ Tableau Embed
- Power BI Helper: DAX Measures, Power Query ตัวอย่าง และ Power BI Embed
- เอกสารภาษาไทยละเอียดใน `docs/`

## Run แบบเร็ว

```bash
cd data-insight-sql-dashboard-pro
python3 -m http.server 8080
```

เปิดเว็บ:

```text
http://localhost:8080
```

จากนั้นกด `สร้างข้อมูลตัวอย่าง`

## Run Backend MySQL

```bash
cd backend-node
cp .env.example .env
npm install
npm start
```

API จะอยู่ที่:

```text
http://localhost:3000/api/health
```

## เอกสารสำคัญ

- `docs/INSTALL_TH.md` ขั้นตอนติดตั้งละเอียด
- `docs/USER_GUIDE_TH.md` วิธีใช้งานทีละหน้า
- `docs/SECURITY_TH.md` ความปลอดภัยและข้อควรระวัง
- `docs/TEST_PLAN_TH.md` Checklist ทดสอบระบบ
- `docs/TABLEAU_FIELDS.md` สูตร Tableau
- `docs/POWERBI_GUIDE_TH.md` คู่มือ Power BI Add-on
- `docs/POWERBI_DAX_MEASURES.md` สูตร DAX สำหรับ Power BI
- `docs/BUSINESS_ANALYTICS_GUIDE_TH.md` คู่มือ Business Analytics
- `docs/BUSINESS_ANALYTICS_FORMULAS.md` รวมสูตร SQL/MySQL/Tableau/Power BI
- `docs/BUSINESS_ANALYTICS_SOURCES.md` แหล่งอ้างอิงสูตรและแนวคิด
- `docs/BUSINESS_ANALYTICS_MYSQL_TEMPLATES.sql` SQL Template สำหรับ MySQL
- `docs/mysql_schema_sample.sql` SQL ตัวอย่าง MySQL

## ข้อจำกัดที่ต้องเข้าใจ

- หน้าเว็บหลักใช้ SQLite ใน Browser ไม่ใช่ MySQL Server จริง
- การต่อ MySQL จริงต้องผ่าน backend-node เพื่อไม่ให้รหัสผ่านรั่วใน Browser
- Tableau Embed ต้องใช้ Dashboard ที่ Publish และอนุญาตให้ Embed ได้
- Power BI Embed มีทั้งแบบ Publish to web, Secure embed และ Embedded/API; ข้อมูลภายในไม่ควรใช้ Publish to web
- Static web app เหมาะกับข้อมูลขนาดเล็กถึงกลาง ถ้าข้อมูลใหญ่มากควรใช้ MySQL/PostgreSQL + Backend + BI Platform


## รายงานทดสอบล่าสุด

ดูรายละเอียดได้ที่ `docs/TEST_REPORT_TH.md`

การปรับปรุงหลังทดสอบ:

- เพิ่ม root `package.json` สำหรับตรวจ syntax และเตรียม deploy บน Vercel
- เพิ่ม `api/health.js` และ `api/query.js` สำหรับ Vercel Functions
- ปรับ Import CSV ให้สร้างคอลัมน์ `gross_sales`, `discount_amount`, `net_sales`, `total_cost`, `profit` อัตโนมัติเมื่อพบคอลัมน์ `quantity`, `unit_price`, `discount`, `cost`
- สร้าง view `<table>_completed` อัตโนมัติเมื่อพบ `order_status`
- ปรับ `sample_sales.csv` ให้มีคอลัมน์คำนวณพร้อมใช้กับ Dashboard


## เวอร์ชัน Business Analytics

เพิ่มแท็บ `Business Analytics` เพื่อช่วยแปลข้อมูลเป็นคำแนะนำทางธุรกิจ เช่น Executive Summary, Sales/Profit Trend, Product Strategy Matrix, Customer RFM, Churn Risk และ Action Plan โดยยังคงแนวทาง SQL, MySQL, Tableau และ Power BI ไว้ครบถ้วน


## เพิ่มในเวอร์ชัน Reference & Editable Data

- เพิ่มแท็บ **ข้อมูลอ้างอิง/แก้ไขข้อมูล** สำหรับดูว่า `customer_id` คือใคร และ `product_id` คือสินค้าอะไร
- เพิ่ม Customer Reference และ Product Reference แบบอัตโนมัติจากตารางหลัก
- เพิ่ม Data Review Queue เพื่อแสดงแถวที่มีค่าว่างหรือถูก exclude จากการคำนวณ
- เพิ่มหน้าฟอร์มแก้ไขข้อมูลรายแถวโดยไม่ต้องเขียน SQL
- เพิ่มตัวเลือก `_exclude_from_analysis` เพื่อไม่นำแถวที่ผิด/รอตรวจสอบไปคำนวณ Dashboard และ Business Analytics
- เพิ่มคู่มือ `docs/REFERENCE_DATA_GUIDE_TH.md`

## SPSS Add-on สำหรับผู้เริ่มต้น

เวอร์ชันนี้เพิ่มส่วน SPSS เพื่อช่วยผู้ใช้ที่ต้องการนำข้อมูลจากเว็บไปวิเคราะห์ต่อใน IBM SPSS Statistics โดยมีทั้งหน้า SPSS Helper ในเว็บและเอกสารในโฟลเดอร์ `docs/`:

- `docs/SPSS_GUIDE_TH.md` คู่มือ SPSS ภาษาไทยสำหรับผู้เริ่มต้น
- `docs/SPSS_SYNTAX_TEMPLATES.sps` ตัวอย่าง SPSS Syntax สำหรับเปิด CSV และวิเคราะห์ข้อมูล
- `docs/SPSS_VARIABLE_SETUP.md` ตารางแนะนำการตั้งค่า Variable View เช่น Type, Label, Values, Missing, Measure

แนวทางใช้งานคือ Export CSV จากระบบนี้ แล้วเปิดใน SPSS ผ่าน File > Import Data > CSV/Excel จากนั้นตั้งค่า Variable View และเลือกสถิติ เช่น Frequencies, Descriptives, Crosstabs, t-test, ANOVA, Correlation หรือ Regression ตามคำถามที่ต้องการตอบ
