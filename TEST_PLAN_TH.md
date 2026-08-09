# Test Plan / Checklist

ใช้เช็กก่อนส่งระบบให้คนอื่นใช้งาน

## A. Frontend Basic

- [ ] เปิด `http://localhost:8080` ได้
- [ ] SQLite Engine โหลดสำเร็จ
- [ ] กดสร้างข้อมูลตัวอย่างแล้วเห็นตาราง `sales_data`
- [ ] Dashboard แสดง KPI
- [ ] Trend chart แสดงผล
- [ ] Category chart แสดงผล
- [ ] Customer chart แสดงผล
- [ ] Export Report ได้

## B. CSV Import

- [ ] Import `sample_sales.csv` ได้
- [ ] ระบบสร้างตารางตามชื่อที่ตั้ง
- [ ] ตรวจชนิดข้อมูล INTEGER/REAL/TEXT ได้พอสมควร
- [ ] Query ตารางที่ Import ได้
- [ ] Export Table CSV ได้

## C. SQL Editor

- [ ] SELECT * FROM sales_data LIMIT 20 ทำงาน
- [ ] GROUP BY ทำงาน
- [ ] SQL Error แสดงข้อความไม่ทำให้เว็บพัง
- [ ] Query History แสดงรายการล่าสุด

## D. Data Quality

- [ ] Missing table แสดงผล
- [ ] Duplicate rows คำนวณได้
- [ ] Preview data แสดงผล

## E. Backend MySQL

- [ ] npm install สำเร็จ
- [ ] npm start สำเร็จ
- [ ] /api/health ได้ ok: true
- [ ] /api/schema/tables แสดงตาราง
- [ ] POST /api/query ด้วย SELECT ได้
- [ ] POST /api/query ด้วย DROP TABLE ถูกปฏิเสธ
- [ ] CORS ตรงกับ frontend origin

## F. Tableau

- [ ] ใส่ Tableau Public URL แล้วแสดงผล
- [ ] ถ้า URL ไม่ได้ publish ระบบไม่ควรพัง
- [ ] สูตร Calculated Fields อ่านได้ครบ

## G. License / Credit

- [ ] README มีเครดิตต้นฉบับ
- [ ] NOTICE.md มีเครดิตต้นฉบับ
- [ ] LICENSE อยู่ในโปรเจกต์


## Test Case: Power BI Add-on

- เปิดแท็บ Power BI ได้
- วาง Power BI iframe HTML แล้วระบบดึง `src` ได้
- วาง URL `https://app.powerbi.com/...` แล้ว iframe แสดงผล
- URL ที่ไม่ใช่ `https://*.powerbi.com` ต้องถูกปฏิเสธ
- ตรวจว่าหน้าเว็บแสดงคำเตือนกรณี Publish to web
- ตรวจว่า DAX Measures อ่านได้และคัดลอกไปสร้างใน Power BI Desktop ได้


## Business Analytics Assistant

- เปิดแท็บ Business Analytics หลังสร้างข้อมูลตัวอย่างหรือ Import CSV
- เลือกคอลัมน์ยอดขาย กำไร วันที่ กลุ่ม ลูกค้า สินค้า และออเดอร์
- กด วิเคราะห์ธุรกิจ
- ตรวจ KPI, MoM Growth, Product Matrix, RFM/Churn และ Recommendation
- Export Report เพื่อนำผลลัพธ์ไปสรุปต่อ
