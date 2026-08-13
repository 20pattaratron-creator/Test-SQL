-- Business Analytics MySQL Templates
-- ปรับชื่อ table/column ให้ตรงกับฐานข้อมูลจริงก่อนใช้งาน

CREATE OR REPLACE VIEW vw_sales_dashboard AS
SELECT
  order_id,
  order_date,
  customer_id,
  customer_name,
  product_name,
  category,
  region,
  channel,
  quantity,
  unit_price,
  discount,
  cost,
  quantity * unit_price AS gross_sales,
  quantity * unit_price * discount AS discount_amount,
  quantity * unit_price * (1 - discount) AS net_sales,
  quantity * cost AS total_cost,
  (quantity * unit_price * (1 - discount)) - (quantity * cost) AS profit
FROM orders
WHERE order_status IN ('Completed', 'Complete', 'Paid', 'Success');

-- Executive KPI
SELECT
  COUNT(DISTINCT order_id) AS total_orders,
  COUNT(DISTINCT customer_id) AS total_customers,
  SUM(net_sales) AS total_sales,
  SUM(profit) AS total_profit,
  SUM(profit) / NULLIF(SUM(net_sales), 0) AS profit_margin,
  SUM(net_sales) / NULLIF(COUNT(DISTINCT order_id), 0) AS aov
FROM vw_sales_dashboard;

-- Monthly trend and MoM growth
WITH monthly AS (
  SELECT
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    SUM(net_sales) AS sales,
    SUM(profit) AS profit
  FROM vw_sales_dashboard
  GROUP BY DATE_FORMAT(order_date, '%Y-%m')
)
SELECT
  month,
  sales,
  profit,
  LAG(sales) OVER (ORDER BY month) AS previous_sales,
  (sales - LAG(sales) OVER (ORDER BY month)) / NULLIF(LAG(sales) OVER (ORDER BY month), 0) AS mom_growth
FROM monthly
ORDER BY month;

-- Customer value and churn signal
SELECT
  customer_id,
  COUNT(DISTINCT order_id) AS frequency,
  SUM(net_sales) AS monetary,
  MAX(order_date) AS last_order_date,
  DATEDIFF((SELECT MAX(order_date) FROM vw_sales_dashboard), MAX(order_date)) AS recency_days,
  CASE
    WHEN DATEDIFF((SELECT MAX(order_date) FROM vw_sales_dashboard), MAX(order_date)) > 180 THEN 'Churned'
    WHEN DATEDIFF((SELECT MAX(order_date) FROM vw_sales_dashboard), MAX(order_date)) > 90 THEN 'High Risk'
    WHEN DATEDIFF((SELECT MAX(order_date) FROM vw_sales_dashboard), MAX(order_date)) > 30 THEN 'Medium Risk'
    ELSE 'Active'
  END AS churn_status
FROM vw_sales_dashboard
GROUP BY customer_id
ORDER BY monetary DESC;

-- Product strategy matrix
WITH product_summary AS (
  SELECT
    product_name,
    category,
    SUM(net_sales) AS sales,
    SUM(profit) AS profit,
    SUM(profit) / NULLIF(SUM(net_sales), 0) AS profit_margin
  FROM vw_sales_dashboard
  GROUP BY product_name, category
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
