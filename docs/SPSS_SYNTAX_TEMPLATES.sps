* ============================================================.
* SPSS Syntax Templates for Data Insight SQL Dashboard Pro.
* ใช้กับ sample_sales.csv หรือ CSV ที่ Export จากเว็บนี้.
* แก้ path ใน /FILE ให้ตรงกับตำแหน่งไฟล์บนเครื่องของคุณ.
* ============================================================.

GET DATA
  /TYPE=TXT
  /FILE='sample_sales.csv'
  /ENCODING='UTF8'
  /DELCASE=LINE
  /DELIMITERS="," 
  /QUALIFIER='"'
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
    order_id A20
    order_date A10
    customer_id A20
    customer_name A80
    product_id A20
    category A40
    product_name A80
    region A40
    channel A40
    quantity F8.0
    unit_price F12.2
    discount F8.4
    cost F12.2
    order_status A30
    gross_sales F12.2
    discount_amount F12.2
    net_sales F12.2
    total_cost F12.2
    profit F12.2
    exclude_from_analysis F1.0
    exclude_reason A120
    last_updated_at A30.
CACHE.
EXECUTE.

DATASET NAME SalesData.

VARIABLE LABELS
  order_id 'เลขคำสั่งซื้อ'
  order_date 'วันที่สั่งซื้อ'
  customer_id 'รหัสลูกค้า'
  customer_name 'ชื่อลูกค้า'
  product_id 'รหัสสินค้า'
  category 'หมวดสินค้า'
  product_name 'ชื่อสินค้า'
  region 'ภูมิภาค/พื้นที่'
  channel 'ช่องทางขาย'
  quantity 'จำนวนสินค้า'
  unit_price 'ราคาต่อหน่วย'
  discount 'อัตราส่วนลด'
  cost 'ต้นทุนต่อหน่วย'
  order_status 'สถานะคำสั่งซื้อ'
  gross_sales 'ยอดขายก่อนส่วนลด'
  discount_amount 'มูลค่าส่วนลด'
  net_sales 'ยอดขายสุทธิ'
  total_cost 'ต้นทุนรวม'
  profit 'กำไร'
  exclude_from_analysis '0=นำไปวิเคราะห์, 1=ไม่นำไปวิเคราะห์'.

VALUE LABELS exclude_from_analysis
  0 'Use in analysis'
  1 'Exclude from analysis'.

VARIABLE LEVEL order_id customer_id customer_name product_id product_name category region channel order_status exclude_from_analysis (NOMINAL).
VARIABLE LEVEL quantity unit_price discount cost gross_sales discount_amount net_sales total_cost profit (SCALE).

FORMATS net_sales profit gross_sales discount_amount total_cost unit_price cost (F12.2) discount (F8.4).
EXECUTE.

* ------------------------------------------------------------.
* Filter: ใช้เฉพาะแถวที่ไม่ถูก exclude.
* ------------------------------------------------------------.
USE ALL.
COMPUTE filter_$=(exclude_from_analysis = 0 OR MISSING(exclude_from_analysis)).
FILTER BY filter_$.
EXECUTE.

* ------------------------------------------------------------.
* 1) Frequencies: ดูจำนวนและเปอร์เซ็นต์ของตัวแปรกลุ่ม.
* ------------------------------------------------------------.
FREQUENCIES VARIABLES=category region channel order_status
  /ORDER=ANALYSIS.

* ------------------------------------------------------------.
* 2) Descriptives: ดูค่าเฉลี่ย ส่วนเบี่ยงเบน ต่ำสุด สูงสุด.
* ------------------------------------------------------------.
DESCRIPTIVES VARIABLES=net_sales profit quantity unit_price discount cost
  /STATISTICS=MEAN STDDEV MIN MAX.

* ------------------------------------------------------------.
* 3) Explore: ดู outlier และ boxplot ตาม region.
* ------------------------------------------------------------.
EXAMINE VARIABLES=net_sales profit BY region
  /PLOT BOXPLOT
  /STATISTICS DESCRIPTIVES
  /CINTERVAL 95
  /MISSING LISTWISE.

* ------------------------------------------------------------.
* 4) Crosstabs + Chi-square: channel กับ order_status.
* ------------------------------------------------------------.
CROSSTABS
  /TABLES=channel BY order_status
  /FORMAT=AVALUE TABLES
  /STATISTICS=CHISQ
  /CELLS=COUNT ROW COLUMN
  /COUNT ROUND CELL.

* ------------------------------------------------------------.
* 5) Independent samples t-test: Online vs Store.
* ถ้า channel ในข้อมูลไม่มี Online/Store ให้แก้ชื่อกลุ่มให้ตรงกับข้อมูลจริง.
* ------------------------------------------------------------.
T-TEST GROUPS=channel('Online' 'Store')
  /VARIABLES=net_sales profit
  /CRITERIA=CI(.95).

* ------------------------------------------------------------.
* 6) One-way ANOVA: เปรียบเทียบ net_sales ตาม region.
* ------------------------------------------------------------.
ONEWAY net_sales BY region
  /STATISTICS DESCRIPTIVES HOMOGENEITY
  /MISSING ANALYSIS.

* ------------------------------------------------------------.
* 7) Correlation: ความสัมพันธ์ระหว่างตัวเลข.
* ------------------------------------------------------------.
CORRELATIONS
  /VARIABLES=discount quantity unit_price net_sales profit
  /PRINT=TWOTAIL NOSIG
  /MISSING=PAIRWISE.

* ------------------------------------------------------------.
* 8) Linear Regression: อธิบาย net_sales จาก quantity/unit_price/discount/cost.
* ------------------------------------------------------------.
REGRESSION
  /DEPENDENT net_sales
  /METHOD=ENTER quantity unit_price discount cost
  /STATISTICS COEFF OUTS R ANOVA COLLIN TOL
  /CRITERIA=PIN(.05) POUT(.10).

* ------------------------------------------------------------.
* 9) ยกเลิก Filter หากต้องการกลับมาใช้ข้อมูลทั้งหมด.
* ------------------------------------------------------------.
* FILTER OFF.
* USE ALL.
* EXECUTE.
