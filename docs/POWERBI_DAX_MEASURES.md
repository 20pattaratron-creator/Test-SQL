# Power BI DAX Measures สำหรับ Sales / Customer Analytics

## Sales Measures

```DAX
Gross Sales =
SUMX(
    orders,
    orders[quantity] * orders[unit_price]
)
```

```DAX
Discount Amount =
SUMX(
    orders,
    orders[quantity] * orders[unit_price] * orders[discount]
)
```

```DAX
Net Sales =
SUMX(
    orders,
    orders[quantity] * orders[unit_price] * (1 - orders[discount])
)
```

```DAX
Total Cost =
SUMX(
    orders,
    orders[quantity] * orders[cost]
)
```

```DAX
Profit =
[Net Sales] - [Total Cost]
```

```DAX
Profit Margin =
DIVIDE([Profit], [Net Sales], 0)
```

## Order / Customer Measures

```DAX
Total Orders =
DISTINCTCOUNT(orders[order_id])
```

```DAX
Total Customers =
DISTINCTCOUNT(orders[customer_id])
```

```DAX
Average Order Value =
DIVIDE([Net Sales], [Total Orders], 0)
```

```DAX
Sales per Customer =
DIVIDE([Net Sales], [Total Customers], 0)
```

## Time Intelligence

ต้องมีตารางวันที่ เช่น `Calendar` และตั้ง relationship กับ `orders[order_date]`

```DAX
Sales Previous Month =
CALCULATE(
    [Net Sales],
    DATEADD('Calendar'[Date], -1, MONTH)
)
```

```DAX
MoM Growth =
DIVIDE(
    [Net Sales] - [Sales Previous Month],
    [Sales Previous Month],
    0
)
```

```DAX
YTD Sales =
TOTALYTD([Net Sales], 'Calendar'[Date])
```

## Customer Segmentation Example

```DAX
Customer Segment =
VAR CustomerSales = [Net Sales]
RETURN
SWITCH(
    TRUE(),
    CustomerSales >= 100000, "VIP",
    CustomerSales >= 50000, "High Value",
    CustomerSales >= 10000, "Medium Value",
    "Low Value"
)
```

