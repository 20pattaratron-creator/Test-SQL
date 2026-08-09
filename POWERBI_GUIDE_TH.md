# คู่มือ Power BI Add-on สำหรับ Data Insight SQL Dashboard Pro

เอกสารนี้อธิบายวิธีใช้ Power BI เป็นส่วนเสริมร่วมกับ SQL / MySQL / Tableau ในโปรเจกต์นี้

## ใช้ Power BI ร่วมกับระบบนี้ได้อย่างไร

แนวทางที่แนะนำมี 3 แบบ

1. **Publish to web / Public iframe**
   - เหมาะกับข้อมูลตัวอย่าง ข้อมูลสาธารณะ หรือ Dashboard ที่เปิดเผยได้
   - ไม่เหมาะกับข้อมูลลูกค้า ยอดขายจริง ข้อมูลภายใน หรือข้อมูลส่วนบุคคล

2. **Secure embed**
   - เหมาะกับรายงานภายในองค์กร
   - ผู้ใช้งานต้องมีสิทธิ์เข้าถึงรายงานตามที่ตั้งค่าใน Power BI Service

3. **Power BI Embedded / Embed token**
   - เหมาะกับเว็บแอปจริงที่ต้องการควบคุมผู้ใช้เอง
   - ต้องมี backend สำหรับขอ access token และ generate embed token
   - ไม่ควรสร้าง token หรือเก็บ client secret ใน frontend

## วิธีใช้งานแท็บ Power BI ในเว็บ

1. เปิดเว็บ `Data Insight SQL Dashboard Pro`
2. ไปที่แท็บ `Power BI`
3. เลือกรูปแบบการฝังรายงาน
4. วาง URL หรือ iframe HTML จาก Power BI
5. กำหนดความสูงของ iframe
6. กด `Load Power BI`

## วิธีนำ URL จาก Power BI แบบ Publish to web

1. เปิดรายงานใน Power BI Service
2. ไปที่ `File`
3. เลือก `Embed report`
4. เลือก `Publish to web (public)`
5. อ่านคำเตือนเรื่องข้อมูลสาธารณะให้ครบถ้วน
6. Copy iframe หรือ link มาใส่ในแท็บ Power BI

## วิธีเตรียมข้อมูลจาก MySQL เข้า Power BI

แนะนำให้สร้าง View ใน MySQL ก่อน เช่น

```sql
CREATE OR REPLACE VIEW vw_sales_dashboard AS
SELECT
  order_id,
  order_date,
  customer_id,
  customer_name,
  category,
  region,
  channel,
  quantity,
  unit_price,
  discount,
  cost,
  quantity * unit_price AS gross_sales,
  quantity * unit_price * discount AS discount_amount,
  quantity * unit_price * (1 - discount) AS net_sales,
  quantity * cost AS total_cost,
  (quantity * unit_price * (1 - discount)) - (quantity * cost) AS profit
FROM orders
WHERE order_status IN ('Completed', 'Paid', 'Success');
```

จากนั้นใน Power BI Desktop ให้ใช้ `Get Data` → `MySQL database` แล้วเลือก view `vw_sales_dashboard`

## โมเดลข้อมูลที่แนะนำใน Power BI

สำหรับงาน Data Analyst ควรแยกเป็น Star Schema

```text
FactOrders
├── order_id
├── order_date
├── customer_id
├── product_id
├── quantity
├── net_sales
├── profit

DimDate
DimCustomer
DimProduct
DimRegion
```

## Checklist ก่อนเผยแพร่ Power BI

- ตรวจว่าไม่มีข้อมูลส่วนบุคคลที่ไม่ควรเผยแพร่
- ถ้าใช้ Publish to web ต้องถือว่าคนทั่วไปอาจเข้าถึงรายงานได้
- ถ้าข้อมูลภายใน ให้ใช้ Secure embed หรือ Power BI Embedded
- ตรวจสิทธิ์ Workspace, Report, Dataset/Semantic model
- ตรวจ Refresh schedule และ Gateway ถ้าใช้ฐานข้อมูลภายในองค์กร
- ตั้งชื่อ Measures ให้เข้าใจง่าย
- ตรวจ Filter / Slicer ว่าทำงานถูกต้อง

