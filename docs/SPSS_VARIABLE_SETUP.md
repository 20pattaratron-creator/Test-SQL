# ตารางแนะนำการตั้งค่า Variable View ใน SPSS

ไฟล์นี้ใช้เป็น checklist หลังนำข้อมูล CSV/Excel จากเว็บ Data Insight เข้า SPSS แล้ว

| Variable | Label แนะนำ | Type | Measure | Values / Missing ที่แนะนำ | ใช้ทำอะไร |
|---|---|---|---|---|---|
| order_id | เลขคำสั่งซื้อ | String | Nominal | - | นับจำนวนออเดอร์ / ตรวจ duplicate |
| order_date | วันที่สั่งซื้อ | Date หรือ String | Scale | - | Trend, filtering, time analysis |
| customer_id | รหัสลูกค้า | String | Nominal | Missing ถ้าว่าง | Customer analysis, RFM |
| customer_name | ชื่อลูกค้า | String | Nominal | Missing ถ้าว่าง | อ้างอิง customer_id |
| product_id | รหัสสินค้า | String | Nominal | Missing ถ้าว่าง | Product analysis |
| product_name | ชื่อสินค้า | String | Nominal | Missing ถ้าว่าง | อ้างอิง product_id |
| category | หมวดสินค้า | String | Nominal | Missing ถ้าว่าง | Crosstabs, ANOVA, segment |
| region | ภูมิภาค/พื้นที่ | String | Nominal | Missing ถ้าว่าง | Sales by area, ANOVA |
| province | จังหวัด | String | Nominal | Missing ถ้าว่าง | Geographic analysis |
| channel | ช่องทางขาย | String | Nominal | Values เช่น Online, Store | Channel analysis, t-test |
| quantity | จำนวนสินค้า | Numeric | Scale | Missing ถ้าติดลบผิดปกติ | Descriptives, regression |
| unit_price | ราคาต่อหน่วย | Numeric | Scale | Missing ถ้าติดลบ | Descriptives, regression |
| discount | ส่วนลด | Numeric | Scale | ตรวจว่าควรอยู่ระหว่าง 0-1 | Correlation, regression |
| cost | ต้นทุนต่อหน่วย | Numeric | Scale | Missing ถ้าติดลบ | Profit calculation |
| gross_sales | ยอดขายก่อนส่วนลด | Numeric | Scale | - | KPI |
| discount_amount | มูลค่าส่วนลด | Numeric | Scale | - | Discount analysis |
| net_sales | ยอดขายสุทธิ | Numeric | Scale | - | KPI, t-test, ANOVA, regression |
| total_cost | ต้นทุนรวม | Numeric | Scale | - | KPI |
| profit | กำไร | Numeric | Scale | - | KPI, regression |
| profit_margin | อัตรากำไร | Numeric | Scale | ตรวจค่ามากผิดปกติ | Profitability analysis |
| order_status | สถานะคำสั่งซื้อ | String | Nominal | Completed, Cancelled ฯลฯ | Filter / Crosstabs |
| _exclude_from_analysis | สถานะใช้วิเคราะห์ | Numeric | Nominal | 0=ใช้, 1=ไม่ใช้ | Filter before analysis |
| _exclude_reason | เหตุผลที่ไม่ใช้ | String | Nominal | - | Audit / Data quality |

## คำแนะนำสำหรับผู้เริ่มต้น

1. ตัวแปรที่เป็นรหัสหรือชื่อ แม้จะมีตัวเลข เช่น customer_id = C001 ให้ตั้งเป็น **Nominal**
2. ตัวแปรที่นำไปบวก ลบ เฉลี่ย หรือทำ Regression ได้ ให้ตั้งเป็น **Scale**
3. ตัวแปรแบบคะแนนเรียงลำดับ เช่น 1=น้อย ถึง 5=มาก ให้ตั้งเป็น **Ordinal**
4. ถ้าใช้ค่า 99, 999, -1 แทนค่าว่าง ต้องตั้งในช่อง **Missing** ไม่เช่นนั้นค่าเฉลี่ยจะผิด
5. ก่อนวิเคราะห์ให้รัน Frequencies/Descriptives เพื่อตรวจค่าผิดปกติก่อนเสมอ
