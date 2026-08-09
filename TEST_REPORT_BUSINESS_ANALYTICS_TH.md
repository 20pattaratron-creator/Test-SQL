# รายงานทดสอบ Business Analytics Add-on

วันที่จัดทำ: 2026-08-09

## สิ่งที่ตรวจแล้ว

- ตรวจ syntax ของ `app.js`, `api/health.js`, `api/query.js`, `backend-node/server.js` ด้วย `npm run check`
- เพิ่มแท็บ `Business Analytics` ใน `index.html`
- เพิ่ม DOM element สำหรับ KPI, Trend Chart, Segment Chart, Product Matrix, Customer RFM และ Recommendation
- เพิ่ม event listener สำหรับการเปลี่ยนคอลัมน์และปุ่ม `วิเคราะห์ธุรกิจ`
- เพิ่ม function `renderBusinessAnalytics()` สำหรับคำนวณ KPI และสร้างคำแนะนำ
- เพิ่ม `product_name` ใน sample data และ `sample_sales.csv`
- เพิ่มเอกสารสูตรและแหล่งอ้างอิง

## ผลลัพธ์

- JavaScript syntax: ผ่าน
- Node backend syntax: ผ่าน
- Vercel API syntax: ผ่าน
- เอกสาร Business Analytics: สร้างแล้ว

## สิ่งที่ยังควรทดสอบบนเครื่องผู้ใช้

1. เปิดเว็บผ่าน `python3 -m http.server 8080`
2. กด `สร้างข้อมูลตัวอย่าง`
3. เปิดแท็บ `Business Analytics`
4. ตรวจว่าระบบเลือก column ให้อัตโนมัติ
5. กด `วิเคราะห์ธุรกิจ`
6. ตรวจว่า KPI, Chart, Matrix, RFM และ Recommendation แสดงครบ
7. Import CSV จริงของผู้ใช้ และตรวจว่าคอลัมน์ถูก detect ถูกต้อง
8. Export Report แล้วเปิดไฟล์ `.txt` ตรวจเนื้อหา
9. Deploy GitHub Pages และทดสอบซ้ำ

## ข้อควรระวัง

- คำแนะนำเป็น rule-based analytics ไม่ใช่ AI prediction ขั้นสูง
- ข้อมูลที่มีวันที่ผิดรูปแบบอาจทำให้ Trend/RFM ไม่สมบูรณ์
- ถ้าข้อมูลไม่มี `customer_id` ระบบจะไม่สามารถทำ RFM/Churn ได้
- ถ้าข้อมูลไม่มี `profit` ระบบจะยังคำนวณยอดขายได้ แต่ทำ Profit Margin และ Product Matrix ด้านกำไรได้จำกัด
