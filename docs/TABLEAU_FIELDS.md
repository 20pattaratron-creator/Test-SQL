# Tableau Calculated Fields สำหรับ Dashboard

## Net Sales

```tableau
[Quantity] * [Unit Price] * (1 - [Discount])
```

## Gross Sales

```tableau
[Quantity] * [Unit Price]
```

## Discount Amount

```tableau
[Quantity] * [Unit Price] * [Discount]
```

## Total Cost

```tableau
[Quantity] * [Cost]
```

## Profit

```tableau
[Net Sales] - [Total Cost]
```

## Profit Margin

```tableau
IF SUM([Net Sales]) = 0 THEN 0
ELSE SUM([Profit]) / SUM([Net Sales])
END
```

## Average Order Value

```tableau
SUM([Net Sales]) / COUNTD([Order ID])
```

## Order Month

```tableau
DATETRUNC('month', [Order Date])
```

## Customer Type

```tableau
IF { FIXED [Customer ID] : COUNTD([Order ID]) } >= 2 THEN
    "Repeat Customer"
ELSE
    "One-time Customer"
END
```

## Days Since Last Order

```tableau
DATEDIFF(
    'day',
    { FIXED [Customer ID] : MAX([Order Date]) },
    TODAY()
)
```

## Churn Status

```tableau
IF [Days Since Last Order] > 180 THEN
    "Churned"
ELSEIF [Days Since Last Order] >= 91 THEN
    "High Risk"
ELSEIF [Days Since Last Order] >= 31 THEN
    "Medium Risk"
ELSE
    "Active"
END
```
