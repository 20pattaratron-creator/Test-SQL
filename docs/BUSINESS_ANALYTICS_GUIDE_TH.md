# คู่มือ Business Analytics Assistant

เอกสารนี้อธิบายการใช้งานแท็บ **Business Analytics** ที่เพิ่มเข้ามา เพื่อเปลี่ยนเว็บจาก Dashboard ธรรมดาให้เป็นเครื่องมือช่วยตัดสินใจทางธุรกิจจากข้อมูลที่ผู้ใช้อัปโหลด

## 1. จุดประสงค์

Business Analytics Assistant ใช้ตอบคำถามสำคัญ เช่น

- ธุรกิจมียอดขาย กำไร และ Profit Margin เท่าไร
- เดือนล่าสุดยอดขายโตหรือลดลงจากเดือนก่อน
- หมวดสินค้า/พื้นที่/ช่องทางใดสร้างรายได้สูงสุด
- ลูกค้ารายใดมีมูลค่าสูง หรือเริ่มเสี่ยงหาย
- สินค้าใดเป็น Hero Product หรือขายดีแต่กำไรต่ำ
- ควรทำ Action Plan อะไรต่อจากข้อมูลชุดนี้

## 2. วิธีใช้งาน

1. กด **สร้างข้อมูลตัวอย่าง** หรือ Import CSV ของคุณเอง
2. เข้าแท็บ **Business Analytics**
3. เลือกตารางที่ต้องการวิเคราะห์ เช่น `sales_data`
4. เลือกคอลัมน์สำคัญ
   - ยอดขาย/รายได้: `net_sales`, `sales`, `revenue`, `amount`
   - กำไร: `profit`
   - วันที่: `order_date`, `date`
   - หมวด/พื้นที่/ช่องทาง: `category`, `region`, `channel`
   - ลูกค้า: `customer_id`
   - สินค้า: `product_name`, `product_id`, `category`
   - เลขออเดอร์: `order_id`
5. ตั้งค่า Churn Risk เช่น 90 วัน
6. กด **วิเคราะห์ธุรกิจ**

## 3. KPI ที่ระบบคำนวณ

| KPI | ความหมาย | สูตร |
|---|---|---|
| Total Sales | รายได้/ยอดขายรวม | `SUM(sales)` |
| Total Profit | กำไรรวม | `SUM(profit)` |
| Profit Margin | อัตรากำไร | `SUM(profit) / SUM(sales)` |
| AOV | ยอดซื้อต่อออเดอร์เฉลี่ย | `SUM(sales) / COUNTD(order_id)` |
| MoM Growth | การเติบโตจากเดือนก่อน | `(sales_this_month - sales_previous_month) / sales_previous_month` |
| Repeat Rate | อัตราลูกค้าซื้อซ้ำ | `repeat_customers / total_customers` |
| Churn Risk | ลูกค้าที่ไม่ซื้อเกินเกณฑ์ | `days_since_last_order > threshold_days` |

## 4. Product Strategy Matrix

ระบบแบ่งสินค้าเป็น 4 กลุ่มตามยอดขายและ Profit Margin เทียบกับค่าเฉลี่ยของชุดข้อมูล

| กลุ่ม | ความหมาย | คำแนะนำ |
|---|---|---|
| Hero Product | ยอดขายสูง + Margin สูง | เพิ่มงบ/รักษาสต็อก/ทำแคมเปญหลัก |
| High Sales / Low Margin | ยอดขายสูง + Margin ต่ำ | ลดต้นทุน ปรับราคา ลดส่วนลด |
| Niche High Margin | ยอดขายต่ำ + Margin สูง | โปรโมตเพิ่ม ทำ Bundle หรือ Cross-sell |
| Low Priority | ยอดขายต่ำ + Margin ต่ำ | ลดความสำคัญหรือทบทวนสินค้า |

## 5. Customer Analytics: RFM และ Churn

RFM ใช้วิเคราะห์ลูกค้าโดยดู 3 มิติ

- Recency: ซื้อล่าสุดห่างจากวันที่ล่าสุดในข้อมูลกี่วัน
- Frequency: ซื้อกี่ครั้ง
- Monetary: ใช้เงินรวมเท่าไร

ระบบให้คะแนน RFM แบบ 1-5 ตาม distribution ของข้อมูล แล้วจัดกลุ่ม เช่น Best Customer, Loyal, At Risk, Churn Risk และ Regular

## 6. การแปลผลคำแนะนำ

แท็บ Recommendation & Action Plan จะแบ่งคำแนะนำเป็น

- Executive Summary
- สิ่งที่ทำได้ดี
- สิ่งที่ควรระวัง
- โอกาสทางธุรกิจ
- Customer Retention
- Action Plan

> คำแนะนำเป็น heuristic จากข้อมูลเบื้องต้น ไม่ควรใช้แทนการตัดสินใจสุดท้าย ควรตรวจคุณภาพข้อมูลและบริบททางธุรกิจร่วมด้วยเสมอ

## 7. ข้อมูลที่เหมาะสม

เหมาะกับข้อมูลลักษณะนี้

```csv
order_id,order_date,customer_id,product_name,category,region,channel,quantity,unit_price,discount,cost,net_sales,profit
```

ถ้ามี `quantity`, `unit_price`, `discount`, `cost` ระบบจะพยายามสร้าง `gross_sales`, `discount_amount`, `net_sales`, `total_cost`, `profit` ให้อัตโนมัติหลัง Import CSV
