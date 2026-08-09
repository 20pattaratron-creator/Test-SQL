# Business Analytics Formula Library

รวมสูตรสำหรับ SQL, MySQL, Tableau และ Power BI ที่ใช้กับ Business Analytics Assistant

## 1. SQL / SQLite

### Executive KPI

```sql
SELECT
  COUNT(*) AS total_rows,
  SUM(net_sales) AS total_sales,
  SUM(profit) AS total_profit,
  SUM(profit) / NULLIF(SUM(net_sales), 0) AS profit_margin,
  COUNT(DISTINCT order_id) AS total_orders,
  COUNT(DISTINCT customer_id) AS total_customers,
  SUM(net_sales) / NULLIF(COUNT(DISTINCT order_id), 0) AS aov
FROM sales_data;
```

### Monthly Trend + MoM Growth

```sql
WITH monthly AS (
  SELECT
    substr(order_date, 1, 7) AS month,
    SUM(net_sales) AS sales
  FROM sales_data
  GROUP BY substr(order_date, 1, 7)
)
SELECT
  month,
  sales,
  LAG(sales) OVER (ORDER BY month) AS previous_sales,
  (sales - LAG(sales) OVER (ORDER BY month)) / NULLIF(LAG(sales) OVER (ORDER BY month), 0) AS mom_growth
FROM monthly
ORDER BY month;
```

### RFM

```sql
SELECT
  customer_id,
  julianday((SELECT MAX(order_date) FROM sales_data)) - julianday(MAX(order_date)) AS recency_days,
  COUNT(DISTINCT order_id) AS frequency,
  SUM(net_sales) AS monetary
FROM sales_data
GROUP BY customer_id;
```

### Product Strategy Matrix

```sql
WITH product_summary AS (
  SELECT
    product_name,
    SUM(net_sales) AS sales,
    SUM(profit) AS profit,
    SUM(profit) / NULLIF(SUM(net_sales), 0) AS profit_margin
  FROM sales_data
  GROUP BY product_name
), benchmark AS (
  SELECT AVG(sales) AS avg_sales, AVG(profit_margin) AS avg_margin
  FROM product_summary
)
SELECT
  p.*,
  CASE
    WHEN p.sales >= b.avg_sales AND p.profit_margin >= b.avg_margin THEN 'Hero Product'
    WHEN p.sales >= b.avg_sales AND p.profit_margin < b.avg_margin THEN 'High Sales / Low Margin'
    WHEN p.sales < b.avg_sales AND p.profit_margin >= b.avg_margin THEN 'Niche High Margin'
    ELSE 'Low Priority'
  END AS product_strategy
FROM product_summary p
CROSS JOIN benchmark b
ORDER BY p.sales DESC;
```

## 2. MySQL

### Monthly Trend

```sql
SELECT
  DATE_FORMAT(order_date, '%Y-%m') AS order_month,
  SUM(net_sales) AS total_sales,
  SUM(profit) AS total_profit,
  SUM(profit) / NULLIF(SUM(net_sales), 0) AS profit_margin
FROM vw_sales_dashboard
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY order_month;
```

### MoM Growth

```sql
WITH monthly AS (
  SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS order_month,
    SUM(net_sales) AS sales
  FROM vw_sales_dashboard
  GROUP BY DATE_FORMAT(order_date, '%Y-%m')
)
SELECT
  order_month,
  sales,
  LAG(sales) OVER (ORDER BY order_month) AS previous_sales,
  (sales - LAG(sales) OVER (ORDER BY order_month)) / NULLIF(LAG(sales) OVER (ORDER BY order_month), 0) AS mom_growth
FROM monthly;
```

## 3. Tableau Calculated Fields

```tableau
// Profit Margin
IF SUM([Net Sales]) = 0 THEN 0
ELSE SUM([Profit]) / SUM([Net Sales])
END
```

```tableau
// AOV
SUM([Net Sales]) / COUNTD([Order ID])
```

```tableau
// MoM Growth
(
  SUM([Net Sales]) - LOOKUP(SUM([Net Sales]), -1)
) / LOOKUP(SUM([Net Sales]), -1)
```

```tableau
// Customer Type
IF { FIXED [Customer ID] : COUNTD([Order ID]) } >= 2 THEN
  "Repeat Customer"
ELSE
  "One-time Customer"
END
```

## 4. Power BI DAX

```DAX
Total Sales = SUM(sales_data[net_sales])
```

```DAX
Total Profit = SUM(sales_data[profit])
```

```DAX
Profit Margin = DIVIDE([Total Profit], [Total Sales], 0)
```

```DAX
Average Order Value = DIVIDE([Total Sales], DISTINCTCOUNT(sales_data[order_id]), 0)
```

```DAX
Sales Previous Month =
CALCULATE(
    [Total Sales],
    DATEADD('Calendar'[Date], -1, MONTH)
)
```

```DAX
Sales MoM Growth =
DIVIDE(
    [Total Sales] - [Sales Previous Month],
    [Sales Previous Month],
    0
)
```
