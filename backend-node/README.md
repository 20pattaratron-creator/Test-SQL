# Backend Node.js สำหรับ MySQL

Backend นี้มีไว้เพื่อเชื่อม MySQL อย่างปลอดภัยกว่าเอา host/user/password ไปใส่ใน Browser โดยตรง

## Run

```bash
cd backend-node
cp .env.example .env
npm install
npm start
```

## API

```text
GET  /api/health
GET  /api/schema/tables
GET  /api/schema/tables/:table/columns
GET  /api/preview/:table?limit=100
POST /api/query body: { "sql": "SELECT * FROM orders LIMIT 20" }
GET  /api/dashboard/sales?table=orders&date=order_date
```

## Security default

- ค่าเริ่มต้นอนุญาตเฉพาะ read-only SQL
- ปิด multiple statements
- จำกัด rate limit
- จำกัด JSON body size
- ไม่ควรใช้ user MySQL ที่มีสิทธิ์ DROP/ALTER/DELETE ใน production
