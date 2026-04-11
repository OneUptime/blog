# How to Use MONTH() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Database, Query

Description: Learn how to use the MySQL MONTH() function to extract the numeric month from dates for filtering, grouping, and monthly reporting queries.

---

## What Is the MONTH() Function?

MySQL's `MONTH()` function returns the month part of a date as an integer from 1 (January) to 12 (December). It returns 0 for dates with a zero month component like `'0000-00-00'`.

**Syntax:**

```sql
MONTH(date)
```

The `date` argument accepts `DATE`, `DATETIME`, `TIMESTAMP`, or a string in a recognized date format.

## Basic Examples

```sql
SELECT MONTH('2024-06-15');
-- Returns: 6

SELECT MONTH(NOW());
-- Returns: current month, e.g. 3

SELECT MONTH('2024-12-31 23:59:59');
-- Returns: 12

SELECT MONTH(NULL);
-- Returns: NULL
```

## Filtering Records by Month

Retrieve all orders placed in March regardless of year:

```sql
SELECT order_id, customer_id, order_date
FROM orders
WHERE MONTH(order_date) = 3;
```

To restrict to a specific year and month:

```sql
SELECT *
FROM orders
WHERE YEAR(order_date) = 2024
  AND MONTH(order_date) = 3;
```

The index-friendly equivalent uses a range:

```sql
SELECT *
FROM orders
WHERE order_date >= '2024-03-01'
  AND order_date < '2024-04-01';
```

## Grouping by Month

Count orders per month across all years:

```sql
SELECT
  MONTH(order_date) AS month_num,
  COUNT(*)          AS total_orders
FROM orders
GROUP BY MONTH(order_date)
ORDER BY month_num;
```

Group by both year and month for a time series:

```sql
SELECT
  YEAR(order_date)  AS yr,
  MONTH(order_date) AS mo,
  SUM(total_amount) AS revenue
FROM orders
GROUP BY yr, mo
ORDER BY yr, mo;
```

## Getting the Month Name

Combine `MONTH()` with `MONTHNAME()` for readable labels:

```sql
SELECT
  MONTHNAME(order_date) AS month_name,
  COUNT(*)              AS orders
FROM orders
GROUP BY MONTH(order_date), MONTHNAME(order_date)
ORDER BY MONTH(order_date);
```

Or use `DATE_FORMAT()`:

```sql
SELECT
  DATE_FORMAT(order_date, '%M %Y') AS period,
  SUM(amount) AS revenue
FROM sales
GROUP BY DATE_FORMAT(order_date, '%M %Y')
ORDER BY MIN(order_date);
```

## Comparing Current Month

Find records from the current month:

```sql
SELECT *
FROM invoices
WHERE YEAR(invoice_date)  = YEAR(CURDATE())
  AND MONTH(invoice_date) = MONTH(CURDATE());
```

## Seasonal Analysis

Identify peak months using aggregation:

```sql
SELECT
  MONTH(sale_date) AS month_num,
  MONTHNAME(sale_date) AS month_name,
  AVG(amount) AS avg_sale
FROM sales
GROUP BY month_num, month_name
ORDER BY avg_sale DESC;
```

## NULL Handling

`MONTH()` returns `NULL` when the input is `NULL`:

```sql
SELECT MONTH(NULL);
-- Returns: NULL
```

Use `COALESCE()` if you need a fallback:

```sql
SELECT COALESCE(MONTH(event_date), 0) AS month_num
FROM events;
```

## Summary

`MONTH()` extracts the numeric month (1-12) from any date value in MySQL. Use it to filter rows by month, group sales data into monthly buckets, and build seasonal reports. Pair it with `YEAR()` and `MONTHNAME()` for complete month-level analysis, and prefer range conditions over function-wrapped columns when index performance matters.
