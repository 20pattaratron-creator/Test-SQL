# คู่มือ SPSS สำหรับผู้เริ่มต้น: ใส่ข้อมูลจาก Excel และเตรียมข้อมูลให้วิเคราะห์ได้จริง

เอกสารนี้ออกแบบสำหรับผู้ที่ไม่เคยใช้ IBM SPSS Statistics มาก่อน โดยเริ่มตั้งแต่เตรียมตารางใน Excel, เปิดไฟล์ใน SPSS, ตั้งค่า Variable View, ตรวจ Data View, ตั้งค่า Missing Values และเลือกเมนูวิเคราะห์พื้นฐาน

## 1) หลักการทำงานของ SPSS แบบเข้าใจง่าย

SPSS ทำงานเหมือนสมุดข้อมูล 2 มุมมองหลัก

1. **Data View** = ตารางข้อมูลจริง คล้าย Excel  
   - แถว = 1 case / 1 record / 1 รายการ เช่น 1 ออเดอร์ หรือ 1 ผู้ตอบแบบสอบถาม
   - คอลัมน์ = ตัวแปร เช่น customer_id, gender, net_sales, satisfaction

2. **Variable View** = หน้าตั้งค่าความหมายของแต่ละคอลัมน์  
   - Name = ชื่อตัวแปร
   - Type = ชนิดข้อมูล เช่น Numeric, String, Date
   - Label = คำอธิบายเต็มของตัวแปร
   - Values = คำอธิบายรหัส เช่น 1=ชาย, 2=หญิง
   - Missing = ค่าที่ถือว่าเป็นข้อมูลหาย เช่น 99, 999
   - Measure = ระดับการวัด เช่น Nominal, Ordinal, Scale

> จำง่าย: Data View คือ “ข้อมูล” ส่วน Variable View คือ “พจนานุกรมของข้อมูล”

## 2) เตรียมไฟล์ Excel ก่อนนำเข้า SPSS

ไฟล์ Excel ที่ดีสำหรับ SPSS ควรมีรูปแบบดังนี้

| สิ่งที่ควรทำ | ตัวอย่างที่ถูกต้อง | เหตุผล |
|---|---|---|
| แถวแรกเป็นชื่อตัวแปร | `order_id`, `net_sales`, `profit` | SPSS ใช้แถวแรกเป็น Variable Name ได้ |
| ชื่อตัวแปรไม่มีช่องว่าง | ใช้ `net_sales` แทน `Net Sales` | ลดปัญหาชื่อตัวแปรผิดกฎ |
| ข้อมูลเริ่มที่แถว 2 | แถว 2 เป็นต้นไปเป็น record | ป้องกัน SPSS อ่านหมายเหตุเป็นข้อมูล |
| ไม่มี merged cells | ไม่รวมเซลล์หัวข้อ | SPSS อ่านเป็นตารางตรง ๆ ได้ง่าย |
| ไม่มีแถวรวมยอด | ไม่ใส่ Total row ด้านล่าง | แถวรวมยอดจะกลายเป็นข้อมูลปลอม |
| ตัวเลขเป็นตัวเลขจริง | `1200.50` ไม่ใช่ `1,200 บาท` | SPSS จะอ่านเป็น Numeric/Scale ได้ |
| วันที่อยู่รูปแบบเดียวกัน | `2026-01-05` | ลดปัญหาแปลงวันที่ผิด |
| มี codebook | 1=ชาย, 2=หญิง | ช่วยตั้ง Value Labels |

## 3) ตัวอย่างตาราง Excel ที่เหมาะกับ SPSS

ใช้ไฟล์ตัวอย่างในโปรเจกต์:

`docs/spss_excel_data_entry_template.xlsx`

ไฟล์นี้มี 3 ชีต

1. `Data_for_SPSS` = ตารางข้อมูลตัวอย่างสำหรับนำเข้า SPSS
2. `Codebook` = ตารางอธิบายตัวแปรและรหัสข้อมูล
3. `Checklist` = รายการตรวจสอบก่อน Import

ตัวอย่างคอลัมน์ในชีต Data_for_SPSS

| variable | ความหมาย | SPSS Measure |
|---|---|---|
| order_id | รหัสคำสั่งซื้อ | Nominal |
| order_date | วันที่สั่งซื้อ | Scale / Date |
| customer_id | รหัสลูกค้า | Nominal |
| gender | เพศ 1=ชาย, 2=หญิง | Nominal |
| age_group | ช่วงอายุ | Ordinal |
| satisfaction | ความพึงพอใจ 1-5 | Ordinal |
| category | หมวดสินค้า | Nominal |
| channel | ช่องทางขาย | Nominal |
| quantity | จำนวนสินค้า | Scale |
| net_sales | ยอดขายสุทธิ | Scale |
| profit | กำไร | Scale |
| use_in_analysis | ใช้วิเคราะห์หรือไม่ 1=ใช้, 0=ไม่ใช้ | Nominal |

## 4) วิธี Import Excel เข้า SPSS แบบเมนู

ทำตามนี้ทีละขั้น

1. เปิด IBM SPSS Statistics
2. ไปที่เมนู **File > Import Data > Excel...**
3. เลือกไฟล์ `.xlsx`
4. ติ๊กตัวเลือก **Read variable names from the first row of data** ถ้าแถวแรกเป็นชื่อตัวแปร
5. ถ้าไฟล์มีหลายชีต ให้เลือกชีตที่ต้องการ เช่น `Data_for_SPSS`
6. กด **OK**
7. ตรวจว่า SPSS แสดงข้อมูลใน **Data View** ครบทุกแถวและทุกคอลัมน์
8. ไปที่ **Variable View** เพื่อตรวจ Type, Label, Values, Missing และ Measure
9. บันทึกเป็นไฟล์ SPSS ด้วย **File > Save As...** แล้วเลือก `.sav`

## 5) วิธีกรอกข้อมูลเองใน SPSS

ใช้เมื่อมีข้อมูลจำนวนน้อย เช่น แบบสอบถาม 20-100 ชุด

### ขั้นตอนสร้างตัวแปรก่อนกรอกข้อมูล

1. เปิด SPSS
2. ไปที่ **Variable View**
3. กรอกตัวแปรทีละแถว เช่น

| Name | Type | Label | Values | Measure |
|---|---|---|---|---|
| id | Numeric | รหัสผู้ตอบ | - | Nominal |
| gender | Numeric | เพศ | 1=ชาย, 2=หญิง | Nominal |
| age | Numeric | อายุ | - | Scale |
| satisfaction | Numeric | ความพึงพอใจ | 1=น้อยที่สุด ... 5=มากที่สุด | Ordinal |
| net_sales | Numeric | ยอดขายสุทธิ | - | Scale |

4. ไปที่ **Data View**
5. กรอกข้อมูลในตารางเหมือน Excel
6. บันทึกไฟล์ `.sav`

## 6) ตั้งค่า Variable View ให้ถูกต้อง

### 6.1 Name

ใช้ชื่อสั้น อ่านง่าย ไม่มีช่องว่าง เช่น

- ถูก: `customer_id`, `net_sales`, `order_status`
- ไม่แนะนำ: `Customer ID`, `Net Sales (Baht)`, `ยอดขายสุทธิ`

### 6.2 Type

| Type | ใช้กับข้อมูล | ตัวอย่าง |
|---|---|---|
| Numeric | ตัวเลข | quantity, net_sales, profit |
| String | ข้อความ/รหัส | customer_id, product_name |
| Date | วันที่ | order_date |

### 6.3 Label

Label คือชื่อเต็มที่อ่านง่าย เช่น

- Name: `net_sales`
- Label: `ยอดขายสุทธิหลังหักส่วนลด`

### 6.4 Values

ใช้กับตัวแปรแบบรหัส เช่น

| ตัวแปร | Value Labels |
|---|---|
| gender | 1=ชาย, 2=หญิง, 3=อื่นๆ/ไม่ระบุ |
| use_in_analysis | 1=ใช้ในการวิเคราะห์, 0=ไม่นำไปวิเคราะห์ |
| satisfaction | 1=น้อยที่สุด, 2=น้อย, 3=ปานกลาง, 4=มาก, 5=มากที่สุด |

### 6.5 Missing

ใช้กำหนดค่าที่แปลว่า “ไม่มีข้อมูล” เช่น

| ตัวแปร | Missing Code |
|---|---|
| satisfaction | 99 = ไม่ตอบ |
| age | 999 = ไม่ระบุ |
| use_in_analysis | 0 ไม่ใช่ missing แต่ใช้เป็น filter |

### 6.6 Measure

| Measure | ความหมาย | ตัวอย่าง |
|---|---|---|
| Nominal | กลุ่มที่ไม่มีลำดับ | gender, region, channel, category |
| Ordinal | กลุ่มที่มีลำดับ | satisfaction 1-5, age_group |
| Scale | ตัวเลขต่อเนื่อง/ปริมาณ | net_sales, profit, quantity, age |

## 7) การกรองข้อมูลที่ไม่ควรนำมาวิเคราะห์

ถ้ามีคอลัมน์ `use_in_analysis` ให้ใช้ 1=ใช้ และ 0=ไม่ใช้

วิธีกรองใน SPSS

1. ไปที่ **Data > Select Cases...**
2. เลือก **If condition is satisfied**
3. กด **If...**
4. ใส่เงื่อนไข:

```spss
use_in_analysis = 1
```

5. เลือก **Filter out unselected cases**
6. กด **OK**

หลังจากนี้ SPSS จะไม่นำแถวที่ `use_in_analysis = 0` ไปคำนวณในหลายเมนูวิเคราะห์

## 8) การตรวจ Missing Value หลังนำเข้า

เมนูที่ใช้บ่อย

- **Analyze > Descriptive Statistics > Frequencies** สำหรับตัวแปรกลุ่ม
- **Analyze > Descriptive Statistics > Descriptives** สำหรับตัวแปรตัวเลข

ตัวอย่างตัวแปรที่ควรตรวจ

- customer_id ว่างไหม
- product_id ว่างไหม
- quantity เป็น 0 หรือค่าติดลบไหม
- net_sales เป็น missing หรือไม่
- order_status เป็น Completed/Cancelled/Returned ถูกต้องไหม

## 9) วิเคราะห์พื้นฐานสำหรับมือใหม่

| ต้องการตอบคำถาม | เมนู SPSS | ตัวอย่างตัวแปร |
|---|---|---|
| จำนวนแต่ละหมวดสินค้า | Frequencies | category |
| ค่าเฉลี่ยยอดขาย | Descriptives | net_sales |
| ช่องทางขายสัมพันธ์กับสถานะไหม | Crosstabs + Chi-square | channel x order_status |
| Online กับ Store ยอดขายต่างกันไหม | Independent-Samples T Test | net_sales by channel |
| ยอดขายต่างกันตาม region ไหม | One-Way ANOVA | net_sales by region |
| ส่วนลดสัมพันธ์กับกำไรไหม | Correlation | discount, profit |
| quantity, discount, cost ทำนาย net_sales ได้ไหม | Linear Regression | net_sales as dependent |

## 10) ตัวอย่าง Syntax สำหรับเปิด Excel

> หมายเหตุ: path ต้องแก้ให้ตรงกับเครื่องของคุณ

```spss
GET DATA
  /TYPE=XLSX
  /FILE='C:\Users\YourName\Downloads\spss_excel_data_entry_template.xlsx'
  /SHEET=name 'Data_for_SPSS'
  /CELLRANGE=full
  /READNAMES=on.
EXECUTE.
```

## 11) ตัวอย่าง Syntax ตั้งค่า Label และ Value Labels

```spss
VARIABLE LABELS
  order_id 'รหัสคำสั่งซื้อ'
  order_date 'วันที่สั่งซื้อ'
  customer_id 'รหัสลูกค้า'
  gender 'เพศ'
  satisfaction 'ระดับความพึงพอใจ'
  net_sales 'ยอดขายสุทธิ'
  profit 'กำไร'
  use_in_analysis 'ใช้ข้อมูลนี้ในการวิเคราะห์หรือไม่'.

VALUE LABELS gender
  1 'ชาย'
  2 'หญิง'
  3 'อื่นๆ/ไม่ระบุ'.

VALUE LABELS satisfaction
  1 'น้อยที่สุด'
  2 'น้อย'
  3 'ปานกลาง'
  4 'มาก'
  5 'มากที่สุด'.

VALUE LABELS use_in_analysis
  0 'ไม่นำไปวิเคราะห์'
  1 'นำไปวิเคราะห์'.

VARIABLE LEVEL
  order_id customer_id product_id product_name category region channel order_status (NOMINAL)
  age_group satisfaction (ORDINAL)
  quantity unit_price discount cost net_sales profit (SCALE).
EXECUTE.
```

## 12) ข้อผิดพลาดที่มือใหม่เจอบ่อย

| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| SPSS อ่านตัวเลขเป็น String | มีคำว่า บาท, %, comma, หรือช่องว่างปนในข้อมูล | แก้ใน Excel ให้เป็นตัวเลขจริง |
| Measure ผิด | SPSS เดาเองหลัง Import | ไปแก้ใน Variable View |
| category กลายเป็นตัวเลขเฉลี่ย | ตั้ง category เป็น Scale | เปลี่ยนเป็น Nominal |
| satisfaction 1-5 ถูกมองเป็น Scale | ตัวเลข Likert ถูกเดาเป็น scale | เปลี่ยนเป็น Ordinal ถ้าต้องการวิเคราะห์เป็นอันดับ |
| วันที่แสดงผิด | รูปแบบวันที่ไม่สม่ำเสมอ | ใช้รูปแบบเดียว เช่น yyyy-mm-dd |
| ข้อมูล Cancelled ถูกรวมคำนวณ | ไม่ได้ filter order_status/use_in_analysis | ใช้ Select Cases ก่อนวิเคราะห์ |

## 13) แหล่งอ้างอิงและแหล่งเรียนรู้

- IBM SPSS Statistics Documentation: https://www.ibm.com/docs/en/spss-statistics
- Reading Excel files: https://www.ibm.com/docs/en/spss-statistics/31.0.0?topic=files-reading-excel
- Variable View: https://www.ibm.com/docs/en/spss-statistics/31.0.0?topic=editor-variable-view
- Variable measurement level: https://www.ibm.com/docs/en/spss-statistics/30.0.0?topic=view-variable-measurement-level
- GET DATA command: https://www.ibm.com/docs/en/spss-statistics/31.0.0?topic=reference-get-data
