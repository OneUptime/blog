# How to Use DAYNAME() and MONTHNAME() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Database

Description: Learn how to use MySQL DAYNAME() and MONTHNAME() to retrieve the full weekday and month name from a date for readable reports and grouping.

---

## Overview

`DAYNAME()` and `MONTHNAME()` return the full English name of the weekday or month for a given date. They are useful for generating human-readable labels in reports, building calendar views, and grouping data by weekday or month name.

---

## DAYNAME() Function

Returns the name of the weekday for a given date.

**Syntax:**

```sql
DAYNAME(date)
```

- Returns a string such as `'Monday'`, `'Tuesday'`, etc.
- The language used depends on the `lc_time_names` system variable (default: `en_US`).
- Returns `NULL` if `date` is `NULL`.

### Basic Examples

```sql
SELECT DAYNAME('2026-03-31');
-- Returns: 'Tuesday'

SELECT DAYNAME('2026-03-30');
-- Returns: 'Monday'

SELECT DAYNAME(NOW());
-- Returns: current weekday name

SELECT DAYNAME('2026-01-01');
-- Returns: 'Thursday'

SELECT DAYNAME(NULL);
-- Returns: NULL
```

---

## MONTHNAME() Function

Returns the full name of the month for a given date.

**Syntax:**

```sql
MONTHNAME(date)
```

- Returns a string such as `'January'`, `'February'`, etc.
- Language is controlled by `lc_time_names`.
- Returns `NULL` if `date` is `NULL`.

### Basic Examples

```sql
SELECT MONTHNAME('2026-03-31');
-- Returns: 'March'

SELECT MONTHNAME('2026-12-25');
-- Returns: 'December'

SELECT MONTHNAME(NOW());
-- Returns: current month name

SELECT MONTHNAME(NULL);
-- Returns: NULL
```

---

## How They Work

```mermaid
flowchart LR
    A[Date value] -->|DAYNAME()| B[Weekday name string]
    A -->|MONTHNAME()| C[Month name string]
    A -->|DAYOFWEEK()| D[Weekday number 1-7]
    A -->|MONTH()| E[Month number 1-12]
```

---

## Locale Support with lc_time_names

The names returned by `DAYNAME()` and `MONTHNAME()` can be localized:

```sql
-- Default (English)
SELECT DAYNAME('2026-03-31');
-- Returns: 'Tuesday'

-- Switch to Spanish
SET lc_time_names = 'es_ES';
SELECT DAYNAME('2026-03-31');
-- Returns: 'martes'

SELECT MONTHNAME('2026-03-31');
-- Returns: 'marzo'

-- Switch to German
SET lc_time_names = 'de_DE';
SELECT MONTHNAME('2026-03-31');
-- Returns: 'März'

-- Reset to English
SET lc_time_names = 'en_US';
```

---

## Practical: Report by Weekday

```sql
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_date DATETIME,
    amount DECIMAL(10, 2)
);

-- Sales by day of week
SELECT
    DAYNAME(order_date)  AS weekday,
    COUNT(*)             AS order_count,
    SUM(amount)          AS total_sales
FROM orders
GROUP BY DAYNAME(order_date), DAYOFWEEK(order_date)
ORDER BY DAYOFWEEK(order_date);
```

Note: group by both `DAYNAME()` and `DAYOFWEEK()` to control sort order, since day names do not sort chronologically by alphabet.

---

## Report by Month Name

```sql
-- Monthly revenue with month name
SELECT
    MONTHNAME(order_date) AS month_name,
    MONTH(order_date)     AS month_num,
    SUM(amount)           AS revenue
FROM orders
WHERE YEAR(order_date) = 2026
GROUP BY MONTH(order_date), MONTHNAME(order_date)
ORDER BY month_num;
```

Result example:

| month_name | month_num | revenue   |
|------------|-----------|-----------|
| January    | 1         | 12000.00  |
| February   | 2         | 15000.00  |
| March      | 3         | 18000.00  |

---

## Using DAYNAME() in WHERE Clause

```sql
-- Find all Friday orders
SELECT * FROM orders
WHERE DAYNAME(order_date) = 'Friday';

-- Weekend orders
SELECT * FROM orders
WHERE DAYNAME(order_date) IN ('Saturday', 'Sunday');
```

---

## Generating a Calendar Display

```sql
-- Display dates with full labels for the current week
SELECT
    d.dt AS date_value,
    DAYNAME(d.dt)  AS day_name,
    MONTHNAME(d.dt) AS month_name
FROM (
    SELECT CURDATE() - INTERVAL (seq - 1) DAY AS dt
    FROM (SELECT 1 AS seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
          UNION SELECT 5 UNION SELECT 6 UNION SELECT 7) nums
) d
ORDER BY d.dt;
```

---

## DAYNAME() vs DAYOFWEEK() vs WEEKDAY()

| Function         | Returns                              | Example for Tuesday |
|------------------|--------------------------------------|---------------------|
| `DAYNAME()`      | Full name string                     | 'Tuesday'           |
| `DAYOFWEEK()`    | 1 (Sunday) through 7 (Saturday)      | 3                   |
| `WEEKDAY()`      | 0 (Monday) through 6 (Sunday)        | 1                   |

```sql
SELECT
    DAYNAME('2026-03-31')    AS name,
    DAYOFWEEK('2026-03-31')  AS dow,
    WEEKDAY('2026-03-31')    AS wd;
-- Returns: 'Tuesday', 3, 1
```

---

## Performance Note

`DAYNAME()` and `MONTHNAME()` applied to indexed columns in `WHERE` predicates prevent index usage. For high-performance filtering by day of week or month, add generated columns:

```sql
ALTER TABLE orders
ADD COLUMN order_weekday VARCHAR(10) GENERATED ALWAYS AS (DAYNAME(order_date)) STORED,
ADD INDEX idx_order_weekday (order_weekday);

SELECT * FROM orders WHERE order_weekday = 'Friday';
```

---

## Summary

`DAYNAME()` and `MONTHNAME()` return human-readable weekday and month names from date values, with locale support through the `lc_time_names` system variable. They are most useful in `SELECT` lists for report labels and grouped summaries. When sorting chronologically, always pair them with their numeric counterparts (`DAYOFWEEK()` or `MONTH()`) to ensure correct ordering, since alphabetical sorting of day or month names does not match calendar order.
