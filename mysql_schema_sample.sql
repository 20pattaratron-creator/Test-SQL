CREATE DATABASE IF NOT EXISTS data_insight_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE data_insight_demo;

DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  order_id VARCHAR(50) PRIMARY KEY,
  order_date DATE NOT NULL,
  customer_id VARCHAR(50),
  customer_name VARCHAR(255),
  category VARCHAR(100),
  region VARCHAR(100),
  channel VARCHAR(100),
  quantity INT,
  unit_price DECIMAL(12,2),
  discount DECIMAL(5,4),
  cost DECIMAL(12,2),
  order_status VARCHAR(50),
  INDEX idx_order_date (order_date),
  INDEX idx_customer (customer_id),
  INDEX idx_category (category)
);

INSERT INTO orders VALUES
('O1001','2026-01-03','C001','Anan','Food','Bangkok','Online',2,1200,0.05,700,'Completed'),
('O1002','2026-01-05','C002','Mali','Drink','Chiang Mai','Store',1,850,0,500,'Completed'),
('O1003','2026-01-12','C001','Anan','Food','Bangkok','Online',3,1500,0.10,800,'Completed'),
('O1004','2026-02-01','C003','Suda','Beauty','Phuket','Online',4,2200,0.12,1300,'Completed'),
('O1005','2026-02-04','C004','Somchai','Food','Khon Kaen','Store',1,900,0,550,'Completed'),
('O1006','2026-02-10','C005','Naree','Tech','Bangkok','Online',1,12900,0.08,9800,'Completed');

CREATE OR REPLACE VIEW vw_sales_dashboard AS
SELECT
  *,
  quantity * unit_price AS gross_sales,
  quantity * unit_price * discount AS discount_amount,
  quantity * unit_price * (1 - discount) AS net_sales,
  quantity * cost AS total_cost,
  (quantity * unit_price * (1 - discount)) - (quantity * cost) AS profit
FROM orders
WHERE order_status = 'Completed';

-- สร้าง user read-only สำหรับ API แนะนำให้เปลี่ยนรหัสผ่านก่อนใช้จริง
CREATE USER IF NOT EXISTS 'data_reader'@'%' IDENTIFIED BY 'change_this_password';
GRANT SELECT, SHOW VIEW ON data_insight_demo.* TO 'data_reader'@'%';
FLUSH PRIVILEGES;
