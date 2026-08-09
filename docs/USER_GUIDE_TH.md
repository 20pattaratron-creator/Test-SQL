# คู่มือใช้งานระบบ

## 1. Dashboard

ใช้สำหรับดู KPI และกราฟ โดยเลือก:

- ตาราง
- Metric หลัก เช่น net_sales, sales, amount
- Profit เช่น profit
- Date เช่น order_date
- Category เช่น category, region, channel
- Customer เช่น customer_id

ระบบจะแสดง:

- Total Metric
- Rows
- Average
- Total Profit
- Profit Margin
- Customers
- Trend รายเดือน
- ยอดรวมตามกลุ่ม
- Top Customers
- Insight อัตโนมัติ

## 2. Data Quality

ใช้ตรวจข้อมูลก่อนวิเคราะห์:

- Total Rows
- Missing Cells
- Duplicate Rows
- Missing by Column
- Preview Data

คำแนะนำ:

- ถ้า Missing สูงกว่า 20% ควรตรวจแหล่งข้อมูล
- ถ้ามี Duplicate ต้องดูว่าเป็นข้อมูลซ้ำจริงหรือเป็นรายการซ้ำตามธรรมชาติ
- ถ้าวันที่เป็น Text ควรแปลงรูปแบบให้เป็น YYYY-MM-DD

## 3. SQL Editor

ใช้ฝึก SQL และดึงข้อมูล:

```sql
SELECT * FROM sales_data LIMIT 20;
```

ตัวอย่างยอดขายตามกลุ่ม:

```sql
SELECT category, SUM(net_sales) AS total_sales
FROM sales_data
GROUP BY category
ORDER BY total_sales DESC;
```

ตัวอย่าง trend รายเดือนใน SQLite:

```sql
SELECT substr(order_date, 1, 7) AS month, SUM(net_sales) AS total_sales
FROM sales_data
GROUP BY substr(order_date, 1, 7)
ORDER BY month;
```

## 4. Table Browser

ใช้ดูข้อมูลในตารางแบบเร็ว:

- เลือกตาราง
- ค้นหาคำ
- เลือกจำนวนแถว
- Export Table CSV

## 5. MySQL

ใช้สร้าง Query สำหรับ MySQL Workbench และทดสอบ Backend API

ตัวอย่าง MySQL:

```sql
SELECT
  DATE_FORMAT(order_date, '%Y-%m') AS order_month,
  SUM(quantity * unit_price * (1 - discount)) AS net_sales
FROM orders
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY order_month;
```

## 6. Tableau

ใช้เตรียมสูตร Calculated Fields และใส่ URL Dashboard ที่ publish แล้ว

ควรใช้ Tableau เพื่อทำ:

- Executive Dashboard
- Customer Analysis
- Product Performance
- Churn / Retention
- Sales Trend


## การใช้งาน Power BI Add-on

1. ไปที่แท็บ `Power BI`
2. เลือกโหมดการฝังรายงาน เช่น Publish to web หรือ Secure embed
3. วาง Power BI URL หรือ iframe HTML
4. กด `Load Power BI`
5. ใช้ DAX Measures และ Power Query template ในหน้าเดียวกันเพื่อสร้างรายงานใน Power BI Desktop

ถ้าข้อมูลเป็นข้อมูลภายในองค์กร ให้หลีกเลี่ยง Publish to web และใช้ Secure embed / Power BI Embedded แทน


## Business Analytics Assistant

- เปิดแท็บ Business Analytics หลังสร้างข้อมูลตัวอย่างหรือ Import CSV
- เลือกคอลัมน์ยอดขาย กำไร วันที่ กลุ่ม ลูกค้า สินค้า และออเดอร์
- กด วิเคราะห์ธุรกิจ
- ตรวจ KPI, MoM Growth, Product Matrix, RFM/Churn และ Recommendation
- Export Report เพื่อนำผลลัพธ์ไปสรุปต่อ
