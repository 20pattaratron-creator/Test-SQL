# คู่มือติดตั้ง Data Insight SQL Dashboard Pro แบบละเอียด

เอกสารนี้เขียนสำหรับผู้เริ่มต้น เพื่อให้รันระบบได้ผิดพลาดน้อยที่สุด

## 1. สิ่งที่ต้องมี

### ใช้งานเฉพาะหน้าเว็บ SQLite / CSV / Dashboard

ต้องมีอย่างน้อย:

- Browser: Chrome, Edge, Firefox หรือ Safari เวอร์ชันใหม่
- Python 3 หรือ Node.js สำหรับเปิด local static server

### ใช้งาน MySQL Backend เพิ่มเติม

ต้องมีเพิ่ม:

- Node.js LTS
- MySQL Server หรือ Docker
- MySQL Workbench สำหรับทดสอบ SQL
- VS Code สำหรับแก้โค้ด

## 2. แตกไฟล์โปรเจกต์

แตกไฟล์ zip จะได้โฟลเดอร์:

```text
data-insight-sql-dashboard-pro/
```

เข้าไปในโฟลเดอร์นี้ก่อน:

```bash
cd data-insight-sql-dashboard-pro
```

## 3. รันเว็บแบบ Local

แนะนำใช้ Python local server:

```bash
python3 -m http.server 8080
```

ถ้า Windows แล้วคำสั่ง `python3` ใช้ไม่ได้ ให้ลอง:

```bash
python -m http.server 8080
```

จากนั้นเปิด Browser:

```text
http://localhost:8080
```

เหตุผลที่ไม่แนะนำเปิด `index.html` ตรง ๆ เพราะบาง Browser บล็อก WebAssembly จาก `file://`

## 4. ทดสอบเว็บครั้งแรก

1. เปิดเว็บ
2. รอข้อความ `พร้อมใช้งาน`
3. กด `สร้างข้อมูลตัวอย่าง`
4. ดูแท็บ Dashboard ต้องเห็น KPI และกราฟ
5. ไปแท็บ SQL Editor แล้วกด Run SQL
6. ไปแท็บ Data Quality แล้วกด Run Quality Check
7. ไปแท็บ Table Browser ต้องเห็นข้อมูล `sales_data`

## 5. Import CSV ของคุณเอง

1. กดเลือกไฟล์ CSV
2. ตั้งชื่อตาราง เช่น `my_sales`
3. กด Import CSV
4. ระบบจะสร้างตาราง SQLite ให้โดยอัตโนมัติ
5. ไป Dashboard แล้วเลือกตาราง `my_sales`
6. เลือก Metric / Date / Category / Customer ตามคอลัมน์จริง

## 6. ติดตั้ง Backend MySQL

เข้าโฟลเดอร์ backend:

```bash
cd backend-node
cp .env.example .env
npm install
npm start
```

ถ้าสำเร็จจะเห็น:

```text
Data Insight MySQL API running at http://localhost:3000
```

เปิดทดสอบ:

```text
http://localhost:3000/api/health
```

## 7. ตั้งค่า .env

เปิดไฟล์ `backend-node/.env` แล้วแก้:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=data_insight_demo
MYSQL_USER=data_reader
MYSQL_PASSWORD=change_this_password
ALLOWED_ORIGIN=http://localhost:8080
```

คำเตือน: ห้าม commit ไฟล์ `.env` ขึ้น GitHub

## 8. สร้าง MySQL Database ตัวอย่าง

เปิด MySQL Workbench แล้วรันไฟล์:

```text
docs/mysql_schema_sample.sql
```

หรือใช้ Docker:

```bash
docker compose up -d
```

## 9. เชื่อมหน้าเว็บกับ Backend

1. เปิดแท็บ MySQL ในเว็บ
2. ช่อง API Base URL ใส่ `http://localhost:3000`
3. กด Test API
4. ถ้าสำเร็จ ให้ลอง Query:

```sql
SELECT * FROM vw_sales_dashboard LIMIT 20
```

## 10. Deploy เป็นเว็บไซต์

Frontend สามารถ deploy เป็น static site ได้ เช่น GitHub Pages, Netlify, Vercel หรือ Cloudflare Pages

Backend ต้อง deploy แยกเป็น Node.js server เช่น VPS, Render, Railway, Fly.io, Azure App Service หรือภายในองค์กร

## 11. ปัญหาที่เจอบ่อย

### หน้าเว็บขึ้นว่าโหลด SQLite Engine ไม่สำเร็จ

สาเหตุที่พบบ่อย:

- เปิดผ่าน `file://`
- Internet ใช้งาน CDN ไม่ได้
- Browser บล็อก WebAssembly

วิธีแก้:

- เปิดผ่าน local server
- ตรวจ internet
- ใช้ Chrome/Edge เวอร์ชันใหม่

### Backend ต่อ MySQL ไม่ได้

ตรวจ:

- MySQL เปิดอยู่ไหม
- Host/Port ถูกไหม
- Database มีจริงไหม
- User/password ถูกไหม
- User มีสิทธิ์ SELECT หรือไม่

### Tableau ไม่แสดงผล

ตรวจ:

- URL ถูกต้องไหม
- Dashboard publish แล้วไหม
- Tableau Public/Cloud/Server อนุญาต embed หรือไม่

## การตรวจ Business Analytics หลังติดตั้ง

1. เปิดเว็บผ่าน local server
2. กด `สร้างข้อมูลตัวอย่าง`
3. เปิดแท็บ `Business Analytics`
4. ตรวจว่าระบบเลือกคอลัมน์ `net_sales`, `profit`, `order_date`, `category`, `customer_id`, `order_id` ให้อัตโนมัติ
5. กด `วิเคราะห์ธุรกิจ`
6. ตรวจ KPI, กราฟ Trend, Revenue Share, Product Strategy Matrix, Customer RFM และ Recommendation
7. กด `Export Report` เพื่อดาวน์โหลดรายงานข้อความ

เอกสารสูตรและที่มาอยู่ที่:

- `docs/BUSINESS_ANALYTICS_GUIDE_TH.md`
- `docs/BUSINESS_ANALYTICS_FORMULAS.md`
- `docs/BUSINESS_ANALYTICS_SOURCES.md`
- `docs/BUSINESS_ANALYTICS_MYSQL_TEMPLATES.sql`
