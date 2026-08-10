# คู่มือ IBM SPSS Statistics สำหรับผู้เริ่มต้น

คู่มือนี้ทำขึ้นสำหรับผู้ใช้ที่ไม่เคยใช้ SPSS มาก่อน และต้องการนำข้อมูลจาก **Data Insight SQL Dashboard Pro Friendly** ไปวิเคราะห์ต่อใน IBM SPSS Statistics เช่น ข้อมูลยอดขาย ลูกค้า สินค้า ช่องทางขาย แบบสอบถาม หรือข้อมูลเชิงธุรกิจอื่น ๆ

> หมายเหตุ: SPSS เป็นโปรแกรม Desktop/Enterprise สำหรับงานสถิติ ไม่ได้รันอยู่ใน GitHub Pages โดยตรง ระบบเว็บนี้ทำหน้าที่เตรียมข้อมูล, ตรวจคุณภาพข้อมูล, Export CSV และให้ Syntax Template เพื่อเปิดใน SPSS ได้ง่ายขึ้น

---

## 1) SPSS คืออะไร และเหมาะกับงานแบบไหน

SPSS หรือ IBM SPSS Statistics เป็นซอฟต์แวร์วิเคราะห์สถิติที่นิยมใช้กับงานวิจัย แบบสอบถาม ธุรกิจ การตลาด การศึกษา และงานวิเคราะห์ข้อมูลเชิงสถิติ เช่น Descriptive Statistics, Crosstabs, t-test, ANOVA, Correlation, Regression และการทำรายงานผลลัพธ์

ในงาน Data Analytics / Business Analytics ระบบนี้จะใช้ SPSS เป็นเครื่องมือเสริมสำหรับคำถามเหล่านี้:

- ลูกค้าแต่ละกลุ่มมีพฤติกรรมต่างกันหรือไม่
- ช่องทาง Online กับ Store มียอดขายเฉลี่ยต่างกันหรือไม่
- ภูมิภาคต่าง ๆ มียอดขายเฉลี่ยต่างกันหรือไม่
- ส่วนลดมีความสัมพันธ์กับกำไรหรือไม่
- quantity, discount, unit_price สามารถอธิบาย net_sales หรือ profit ได้แค่ไหน
- ตัวแปรแบบสอบถาม เช่น satisfaction มีความสัมพันธ์กับการซื้อซ้ำหรือไม่

---

## 2) โครงสร้างหน้าจอ SPSS ที่ต้องรู้

### 2.1 Data View

คล้าย Excel หรือ Spreadsheet

- 1 แถว = 1 case / 1 record / 1 order / 1 respondent
- 1 คอลัมน์ = 1 variable เช่น customer_id, net_sales, profit, region

ตัวอย่าง:

| order_id | customer_id | region | net_sales | profit |
|---|---|---|---:|---:|
| O1001 | C001 | Bangkok | 2280 | 880 |
| O1002 | C002 | Chiang Mai | 850 | 350 |

### 2.2 Variable View

เป็นหน้าที่สำคัญมากสำหรับมือใหม่ เพราะใช้กำหนดความหมายและชนิดของตัวแปร

คอลัมน์สำคัญใน Variable View:

| ช่องใน SPSS | ความหมาย | ตัวอย่าง |
|---|---|---|
| Name | ชื่อตัวแปร ห้ามมีช่องว่าง | net_sales |
| Type | ชนิดข้อมูล Numeric/String/Date | Numeric |
| Width/Decimals | ความกว้างและทศนิยม | 12, 2 |
| Label | คำอธิบายตัวแปร | ยอดขายสุทธิ |
| Values | คำอธิบายรหัส เช่น 1=ชาย, 2=หญิง | 1=Online, 2=Store |
| Missing | ค่าที่ถือว่า missing | 99 หรือ 999 |
| Measure | ระดับการวัด Nominal/Ordinal/Scale | Scale |

---

## 3) การเตรียมไฟล์จากเว็บนี้ก่อนเข้า SPSS

ในเว็บ Data Insight ให้ทำตามนี้:

1. อัปโหลด CSV หรือกดสร้างข้อมูลตัวอย่าง
2. ไปที่ Data Quality เพื่อตรวจค่าว่างและข้อมูลซ้ำ
3. ไปที่ข้อมูลอ้างอิง/แก้ไขข้อมูล ถ้าพบ customer_id, product_id หรือยอดขายผิด
4. ถ้าแถวใดไม่ควรใช้วิเคราะห์ ให้ติ๊ก “ไม่นำแถวนี้ไปคำนวณ”
5. Export CSV จาก Table Browser หรือ SQL Result
6. เปิด CSV นั้นใน SPSS

โครงสร้างคอลัมน์ที่แนะนำสำหรับ SPSS:

| คอลัมน์ | ใช้ทำอะไร | Measure ที่แนะนำ |
|---|---|---|
| order_id | เลขออเดอร์ | Nominal |
| order_date | วันที่ | Scale หรือ Date |
| customer_id | รหัสลูกค้า | Nominal |
| customer_name | ชื่อลูกค้า | Nominal |
| product_id | รหัสสินค้า | Nominal |
| category | หมวดสินค้า | Nominal |
| product_name | ชื่อสินค้า | Nominal |
| region | ภูมิภาค/พื้นที่ | Nominal |
| channel | ช่องทางขาย | Nominal |
| quantity | จำนวน | Scale |
| unit_price | ราคาต่อหน่วย | Scale |
| discount | ส่วนลด | Scale |
| cost | ต้นทุนต่อหน่วย | Scale |
| net_sales | ยอดขายสุทธิ | Scale |
| profit | กำไร | Scale |
| order_status | สถานะคำสั่งซื้อ | Nominal |
| _exclude_from_analysis | 0=ใช้, 1=ไม่ใช้ | Nominal |

---

## 4) วิธี Import CSV / Excel เข้า SPSS

### 4.1 Import CSV

1. เปิด SPSS
2. ไปที่ `File > Import Data > CSV Data...` หรือบางเวอร์ชันใช้ `File > Open > Data...`
3. เลือกไฟล์ CSV
4. ตรวจว่าเลือก `Read variable names from first row` หรืออ่านชื่อคอลัมน์จากแถวแรก
5. ตรวจ delimiter ว่าเป็น comma `,`
6. กด Finish
7. ไปที่ Variable View เพื่อตรวจ Type และ Measure

### 4.2 Import Excel

1. ไปที่ `File > Import Data > Excel...`
2. เลือกไฟล์ `.xlsx`
3. เลือก worksheet ที่ต้องการ
4. ติ๊กอ่านชื่อคอลัมน์จากแถวแรก หากไฟล์มีหัวตาราง
5. กด OK

IBM ระบุว่าสามารถนำเข้า Excel ผ่าน File > Import Data > Excel หรือ drag-and-drop ไฟล์ Excel เข้า SPSS ได้ และถ้าชื่อหัวคอลัมน์ไม่ตรงกฎการตั้งชื่อตัวแปร SPSS จะปรับเป็นชื่อตัวแปรที่ถูกต้องและใช้ชื่อเดิมเป็น variable label

---

## 5) การตั้งค่า Variable View แบบมือใหม่

### 5.1 ตัวแปร Nominal

ใช้กับข้อมูลที่เป็นกลุ่ม ไม่มีลำดับมากน้อย เช่น:

- customer_id
- product_id
- category
- region
- channel
- order_status

ใน Variable View ให้ตั้ง:

- Type = String หรือ Numeric แล้วแต่ข้อมูล
- Measure = Nominal

### 5.2 ตัวแปร Ordinal

ใช้กับข้อมูลที่มีลำดับ เช่น:

- satisfaction_level: 1=ต่ำ, 2=กลาง, 3=สูง
- rating: 1 ถึง 5 ดาว
- income_group: Low, Medium, High

ใน Variable View ให้ตั้ง:

- Measure = Ordinal
- Values = กำหนดรหัสและคำอธิบาย

### 5.3 ตัวแปร Scale

ใช้กับตัวเลขที่คำนวณค่าเฉลี่ย ผลรวม ความสัมพันธ์ หรือ regression ได้ เช่น:

- net_sales
- profit
- quantity
- discount
- unit_price
- cost

ใน Variable View ให้ตั้ง:

- Type = Numeric
- Measure = Scale

---

## 6) การตรวจคุณภาพข้อมูลใน SPSS

ก่อนวิเคราะห์ควรตรวจเสมอ:

### 6.1 ตรวจจำนวนและค่าว่าง

เมนู:

`Analyze > Descriptive Statistics > Frequencies`

เลือกตัวแปรกลุ่ม เช่น category, region, channel, order_status แล้วดูจำนวน missing / valid

Syntax:

```spss
FREQUENCIES VARIABLES=category region channel order_status.
```

### 6.2 ตรวจค่าเฉลี่ย/ต่ำสุด/สูงสุด

เมนู:

`Analyze > Descriptive Statistics > Descriptives`

เลือกตัวแปรตัวเลข เช่น net_sales, profit, quantity, discount

Syntax:

```spss
DESCRIPTIVES VARIABLES=net_sales profit quantity discount
  /STATISTICS=MEAN STDDEV MIN MAX.
```

### 6.3 ตรวจ Outlier เบื้องต้น

เมนู:

`Analyze > Descriptive Statistics > Explore`

เลือกตัวแปร เช่น net_sales หรือ profit แล้วดู Boxplot และค่า Extreme Values

---

## 7) วิเคราะห์พื้นฐานสำหรับ Data Analytics

## 7.1 Frequencies: ดูจำนวนและเปอร์เซ็นต์

ใช้กับตัวแปรกลุ่ม เช่น region, channel, category

เมนู:

`Analyze > Descriptive Statistics > Frequencies`

ควรอ่าน:

- Frequency = จำนวน
- Percent = เปอร์เซ็นต์จากทั้งหมด
- Valid Percent = เปอร์เซ็นต์หลังตัด missing

Syntax:

```spss
FREQUENCIES VARIABLES=category region channel order_status
  /ORDER=ANALYSIS.
```

## 7.2 Descriptives: ดูค่าเฉลี่ยและการกระจาย

ใช้กับตัวแปรตัวเลข เช่น net_sales, profit, discount

เมนู:

`Analyze > Descriptive Statistics > Descriptives`

ควรอ่าน:

- Mean = ค่าเฉลี่ย
- Std. Deviation = การกระจาย
- Min / Max = ค่าต่ำสุด/สูงสุด

Syntax:

```spss
DESCRIPTIVES VARIABLES=net_sales profit quantity discount
  /STATISTICS=MEAN STDDEV MIN MAX.
```

## 7.3 Explore: ดูการกระจายและ Boxplot

ใช้เมื่อต้องการดู outlier หรือการกระจายข้อมูลเชิงลึก

เมนู:

`Analyze > Descriptive Statistics > Explore`

Syntax:

```spss
EXAMINE VARIABLES=net_sales profit BY region
  /PLOT BOXPLOT STEMLEAF
  /STATISTICS DESCRIPTIVES
  /CINTERVAL 95
  /MISSING LISTWISE.
```

---

## 8) วิเคราะห์ความสัมพันธ์ของตัวแปรกลุ่ม: Crosstabs และ Chi-square

ใช้ตอบคำถามเช่น:

- channel เกี่ยวข้องกับ order_status หรือไม่
- region เกี่ยวข้องกับ category หรือไม่
- customer_segment เกี่ยวข้องกับ churn_status หรือไม่

เมนู:

`Analyze > Descriptive Statistics > Crosstabs`

ตั้งค่า:

- Row = channel
- Column = order_status
- Statistics = Chi-square
- Cells = Observed, Row %, Column %

Syntax:

```spss
CROSSTABS
  /TABLES=channel BY order_status
  /FORMAT=AVALUE TABLES
  /STATISTICS=CHISQ
  /CELLS=COUNT ROW COLUMN
  /COUNT ROUND CELL.
```

วิธีอ่านผล:

- ดูตาราง Crosstab ว่ากลุ่มใดมีสัดส่วนสูง
- ดู Pearson Chi-Square แถว Sig.
- ถ้า Sig. < .05 แปลว่าตัวแปรสองตัวมีความสัมพันธ์กันในเชิงสถิติ แต่ต้องดูสัดส่วนและบริบทธุรกิจร่วมด้วย

---

## 9) เปรียบเทียบค่าเฉลี่ย 2 กลุ่ม: Independent-Samples t-test

ใช้ตอบคำถามเช่น:

- ยอดขายเฉลี่ยของ Online ต่างจาก Store หรือไม่
- กำไรเฉลี่ยของสมาชิกกับไม่ใช่สมาชิกต่างกันหรือไม่

เมนู:

`Analyze > Compare Means > Independent-Samples T Test`

เงื่อนไขพื้นฐาน:

- ตัวแปรตามเป็น Scale เช่น net_sales
- ตัวแปรกลุ่มมี 2 กลุ่ม เช่น channel มี Online และ Store

Syntax ตัวอย่าง:

```spss
T-TEST GROUPS=channel('Online' 'Store')
  /VARIABLES=net_sales profit
  /CRITERIA=CI(.95).
```

วิธีอ่านผล:

- ดู Group Statistics เพื่อดูค่าเฉลี่ยแต่ละกลุ่ม
- ดู Levene's Test ว่าความแปรปรวนเท่ากันหรือไม่
- ดู Sig. (2-tailed) ถ้า < .05 แปลว่าค่าเฉลี่ยต่างกันอย่างมีนัยสำคัญ
- ดู Mean Difference เพื่อดูต่างกันเท่าไร

---

## 10) เปรียบเทียบค่าเฉลี่ยหลายกลุ่ม: One-Way ANOVA

ใช้ตอบคำถามเช่น:

- ยอดขายเฉลี่ยต่างกันตาม region หรือไม่
- profit เฉลี่ยต่างกันตาม category หรือไม่

เมนู:

`Analyze > Compare Means > One-Way ANOVA`

Syntax:

```spss
ONEWAY net_sales BY region
  /STATISTICS DESCRIPTIVES HOMOGENEITY
  /MISSING ANALYSIS.
```

วิธีอ่านผล:

- ดู Descriptives เพื่อเปรียบเทียบค่าเฉลี่ยแต่ละกลุ่ม
- ดู ANOVA table แถว Sig.
- ถ้า Sig. < .05 แปลว่ามีอย่างน้อย 1 กลุ่มที่ค่าเฉลี่ยต่างจากกลุ่มอื่น
- ถ้าต้องรู้ว่ากลุ่มไหนต่าง ให้ใช้ Post Hoc เช่น Tukey เมื่อเงื่อนไขเหมาะสม

---

## 11) Correlation: ความสัมพันธ์ระหว่างตัวเลข

ใช้ตอบคำถามเช่น:

- discount สัมพันธ์กับ profit หรือไม่
- quantity สัมพันธ์กับ net_sales หรือไม่
- unit_price สัมพันธ์กับ profit_margin หรือไม่

เมนู:

`Analyze > Correlate > Bivariate`

Syntax:

```spss
CORRELATIONS
  /VARIABLES=discount quantity unit_price net_sales profit
  /PRINT=TWOTAIL NOSIG
  /MISSING=PAIRWISE.
```

วิธีอ่านผล:

- Pearson Correlation ใกล้ 1 = ความสัมพันธ์บวกสูง
- ใกล้ -1 = ความสัมพันธ์ลบสูง
- ใกล้ 0 = ความสัมพันธ์เชิงเส้นต่ำ
- Sig. < .05 = มีนัยสำคัญทางสถิติ

ข้อควรระวัง: Correlation ไม่ได้แปลว่าเหตุและผล ต้องใช้บริบทและการออกแบบข้อมูลประกอบ

---

## 12) Linear Regression: ทำนายหรืออธิบายยอดขาย/กำไร

ใช้ตอบคำถามเช่น:

- quantity, unit_price, discount อธิบาย net_sales ได้มากแค่ไหน
- discount ส่งผลต่อ profit หรือไม่เมื่อควบคุม quantity และ unit_price

เมนู:

`Analyze > Regression > Linear`

ตั้งค่า:

- Dependent = net_sales หรือ profit
- Independent(s) = quantity, unit_price, discount, cost

Syntax:

```spss
REGRESSION
  /DEPENDENT net_sales
  /METHOD=ENTER quantity unit_price discount cost
  /STATISTICS COEFF OUTS R ANOVA COLLIN TOL
  /CRITERIA=PIN(.05) POUT(.10).
```

วิธีอ่านผล:

- Model Summary: R Square บอกว่าสมการอธิบายตัวแปรตามได้กี่เปอร์เซ็นต์
- ANOVA: Sig. ถ้า < .05 แปลว่าโมเดลโดยรวมมีนัยสำคัญ
- Coefficients: ดู B, Beta, t, Sig. ของแต่ละตัวแปร
- Collinearity: ดู Tolerance/VIF ถ้ามี multicollinearity สูงต้องระวัง

---

## 13) Reliability: Cronbach's Alpha สำหรับแบบสอบถาม

ใช้เมื่อมีคำถามหลายข้อที่ต้องวัดเรื่องเดียวกัน เช่น satisfaction_1 ถึง satisfaction_5

เมนู:

`Analyze > Scale > Reliability Analysis`

Syntax:

```spss
RELIABILITY
  /VARIABLES=satisfaction_1 satisfaction_2 satisfaction_3 satisfaction_4 satisfaction_5
  /SCALE('Satisfaction') ALL
  /MODEL=ALPHA
  /STATISTICS=DESCRIPTIVE SCALE CORR.
```

วิธีอ่าน:

- Cronbach's Alpha ยิ่งสูงยิ่งสอดคล้องกันมาก
- ค่าที่ใช้กันบ่อยในงานทั่วไปคือประมาณ .70 ขึ้นไป แต่ต้องพิจารณาบริบท จำนวนข้อ และวัตถุประสงค์การวิจัยร่วมด้วย

---

## 14) การกรองข้อมูลก่อนวิเคราะห์

ถ้าต้องการไม่เอาข้อมูลบางแถวไปคำนวณ เช่น `_exclude_from_analysis = 1` ให้ใช้ Select Cases

เมนู:

`Data > Select Cases`

เลือก `If condition is satisfied` แล้วใส่:

```text
_exclude_from_analysis = 0
```

Syntax:

```spss
USE ALL.
COMPUTE filter_$=(_exclude_from_analysis = 0).
FILTER BY filter_$.
EXECUTE.
```

เมื่อต้องการยกเลิก filter:

```spss
FILTER OFF.
USE ALL.
EXECUTE.
```

---

## 15) วิธี Export ผลลัพธ์จาก SPSS

ผลลัพธ์จะอยู่ใน Output Viewer

เมนู:

`File > Export`

รูปแบบที่แนะนำ:

- PDF สำหรับส่งรายงาน
- Word สำหรับแก้ไขรายงานต่อ
- Excel สำหรับนำตารางไปใช้ต่อ
- HTML สำหรับแชร์ผ่านเว็บภายใน

---

## 16) Workflow ที่แนะนำสำหรับระบบนี้ + SPSS

```text
Data Insight Web App
↓
Upload CSV / Import Data
↓
Data Quality Check
↓
แก้ไขข้อมูลผิดหรือ Exclude แถวที่ไม่ควรใช้
↓
Dashboard / Business Analytics
↓
Export CSV
↓
เปิดใน SPSS
↓
ตั้งค่า Variable View
↓
Frequencies / Descriptives / Crosstabs / t-test / ANOVA / Correlation / Regression
↓
Export Output เป็น PDF/Word
↓
นำผลไปรายงานร่วมกับ Tableau / Power BI / Business Recommendation
```

---

## 17) ข้อผิดพลาดที่มือใหม่เจอบ่อย

| ปัญหา | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| รัน Descriptives ไม่ได้ | ตัวแปรเป็น String ไม่ใช่ Numeric | ไป Variable View เปลี่ยน Type หรือแปลงข้อมูล |
| ค่าเฉลี่ยแปลกมาก | มี 999 หรือ 99 เป็นรหัส missing แต่ไม่ได้ตั้ง Missing | ตั้ง Missing Values ให้ถูกต้อง |
| กราฟ/สถิติไม่ออก | ไม่มีข้อมูลใน Data Editor หรือ import ผิด sheet | ตรวจ Data View และ import ใหม่ |
| t-test ใช้ไม่ได้ | ตัวแปรกลุ่มมีมากกว่า 2 กลุ่ม | ใช้ ANOVA หรือกรองเฉพาะ 2 กลุ่ม |
| Regression อ่านผลไม่ออก | ตัวแปรอิสระเป็น String | แปลงเป็น dummy หรือใช้ตัวแปร numeric/encoded |
| p-value มีนัยสำคัญแต่ผลต่างเล็ก | sample ใหญ่ทำให้ p เล็ก | ดูขนาดผลและบริบทธุรกิจร่วมด้วย |

---

## 18) แหล่งอ้างอิงหลัก

- IBM SPSS Statistics Documentation: https://www.ibm.com/docs/en/spss-statistics/
- IBM SPSS Command Syntax Reference: https://www.ibm.com/docs/en/spss-statistics/31.0.0?topic=reference-introduction-guide-command-syntax
- IBM Docs: Reading Excel files in SPSS Statistics
- IBM Docs: DESCRIPTIVES, FREQUENCIES, CROSSTABS, T-TEST, CORRELATIONS, REGRESSION command reference

---

# ภาคผนวก: นำข้อมูลจาก Excel เข้า SPSS สำหรับผู้เริ่มต้น

เพิ่มเอกสารละเอียดไว้ที่ `SPSS_EXCEL_IMPORT_GUIDE_TH.md` และเพิ่มไฟล์ตัวอย่าง `spss_excel_data_entry_template.xlsx`

ลำดับแนะนำสำหรับมือใหม่:

1. เริ่มจาก Excel ที่หัวตารางอยู่แถวแรก
2. หลีกเลี่ยง merged cells, แถวรวมยอด, หมายเหตุใต้ตาราง และตัวเลขที่ปนข้อความ
3. เปิด SPSS แล้วใช้ `File > Import Data > Excel...`
4. เลือกให้ SPSS อ่าน variable names จากแถวแรก
5. หลัง Import ให้ตรวจ Data View ว่าข้อมูลเข้าครบ
6. ไปที่ Variable View เพื่อกำหนด Type, Label, Values, Missing และ Measure
7. บันทึกไฟล์เป็น `.sav`
8. เริ่มวิเคราะห์ด้วย Frequencies / Descriptives / Crosstabs / Correlation / Regression ตามชนิดตัวแปร

ไฟล์ตัวอย่างมี 3 ชีต:

- `Data_for_SPSS` ตารางข้อมูลที่พร้อมนำเข้า SPSS
- `Codebook` คำอธิบายตัวแปรและการตั้งค่า Measure
- `Checklist` รายการตรวจสอบก่อนนำเข้า SPSS
