# Security Policy / นโยบายความปลอดภัย

## Reporting a Vulnerability / การแจ้งช่องโหว่

หากพบช่องโหว่ด้านความปลอดภัยในโปรเจกต์นี้ (เช่น ใน `app.js`, `statistics.js` หรือ dependency ที่โหลดจาก CDN) กรุณาแจ้งผ่าน **GitHub Issues** ของ repository นี้ พร้อมระบุ:

- ขั้นตอนที่ทำให้เกิดปัญหา (steps to reproduce)
- ผลกระทบที่คาดว่าจะเกิด (impact)
- เบราว์เซอร์/เวอร์ชันที่ทดสอบ

If you find a security issue in this project (in `app.js`, `statistics.js`, or a CDN dependency it loads), please report it via a **GitHub Issue** on this repository, including reproduction steps, expected impact, and the browser/version you tested with.

## Scope / ขอบเขต

- แอปนี้เป็น **Static Web App 100%** ไม่มี backend/API/server-side code และไม่มีการเก็บข้อมูลผู้ใช้ไว้บนเซิร์ฟเวอร์ใดๆ
- ข้อมูลที่ผู้ใช้อัปโหลด (CSV/Excel/SQLite) ประมวลผลใน browser ของผู้ใช้เองทั้งหมด และเก็บไว้ใน IndexedDB ของเบราว์เซอร์นั้นเท่านั้น ไม่ถูกส่งไปที่ใด
- แอปโหลด runtime library จาก CDN ภายนอก (sql.js, SheetJS, Chart.js) — ดู [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) สำหรับรายการทั้งหมด หากพบช่องโหว่ใน library เหล่านี้เอง ควรรายงานไปยัง repository ต้นทางของ library นั้นโดยตรงด้วย

This app is a 100% static web app with no backend, API, or server-side code, and stores no user data on any server. Uploaded data (CSV/Excel/SQLite) is processed entirely in the user's own browser and persisted only to that browser's local IndexedDB. Runtime libraries are loaded from external CDNs (sql.js, SheetJS, Chart.js) — see `THIRD_PARTY_NOTICES.md`; vulnerabilities in those libraries themselves should also be reported upstream.

## Do Not / ข้อควรหลีกเลี่ยงเมื่อ Fork ต่อยอด

- ห้ามใส่ API key, token, password หรือ credential ใดๆ ลงในโค้ด frontend
- ห้ามส่งข้อมูลที่ผู้ใช้อัปโหลดออกไปยัง server ภายนอกโดยไม่แจ้งให้ผู้ใช้ทราบอย่างชัดเจน
