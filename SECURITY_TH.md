# Security Checklist ภาษาไทย

## 1. ห้ามใส่รหัสผ่าน MySQL ใน Frontend

Browser code ทุกคนดู source ได้ ดังนั้นห้ามใส่:

- MYSQL_HOST
- MYSQL_USER
- MYSQL_PASSWORD
- API Key

ให้เก็บไว้ใน backend `.env` เท่านั้น

## 2. ใช้ MySQL User แบบ Read-only

สำหรับ Dashboard ควรใช้ user ที่มีสิทธิ์เฉพาะ:

```sql
GRANT SELECT, SHOW VIEW ON database_name.* TO 'data_reader'@'%';
```

ไม่ควรใช้ root user

## 3. จำกัด SQL ที่ให้ผู้ใช้รัน

Backend ตัวอย่างนี้ตั้งค่าเริ่มต้นให้รันเฉพาะ:

- SELECT
- WITH
- SHOW
- DESCRIBE
- EXPLAIN

และปิด multiple statements

## 4. ตั้งค่า CORS

ใน `.env`:

```env
ALLOWED_ORIGIN=http://localhost:8080
```

ตอน deploy จริงให้เปลี่ยนเป็น domain จริง เช่น:

```env
ALLOWED_ORIGIN=https://yourdomain.com
```

## 5. ไม่อัปโหลดข้อมูลส่วนบุคคลถ้าไม่มีมาตรการป้องกัน

ข้อมูลที่ต้องระวัง:

- ชื่อ-นามสกุลจริง
- เบอร์โทร
- อีเมล
- เลขบัตรประชาชน
- ที่อยู่
- ข้อมูลยอดขายภายในบริษัท

## 6. Production เพิ่มเติมที่ควรทำ

- Login
- Role-based access control
- HTTPS
- Audit log
- Backup database
- จำกัด IP
- Monitoring
- Error logging


## ข้อควรระวัง Power BI

- `Publish to web` เหมาะกับข้อมูลที่เปิดเผยสาธารณะได้เท่านั้น
- ห้ามเผยแพร่ข้อมูลลูกค้า ยอดขายจริง ข้อมูลส่วนบุคคล หรือข้อมูลภายในผ่าน public iframe
- ถ้าต้องการระบบภายใน ให้ใช้ Secure embed หรือ Power BI Embedded
- ห้ามเก็บ client secret, tenant id, app secret หรือ embed token ใน frontend
- ถ้าใช้ Embedded/API ต้องออก token ผ่าน backend เท่านั้น
