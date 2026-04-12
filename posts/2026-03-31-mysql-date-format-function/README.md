# How to Use DATE_FORMAT() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, String Function, Database

Description: Learn how to use MySQL DATE_FORMAT() to convert dates and datetimes into custom string formats using format specifiers for display and reporting.

---

## What Is DATE_FORMAT()?

`DATE_FORMAT()` converts a date or datetime value into a formatted string according to a format string you specify. It is the primary MySQL function for controlling how dates appear in query results.

**Syntax:**

```sql
DATE_FORMAT(date, format)
```

- `date` - a `DATE`, `DATETIME`, or `TIMESTAMP` value
- `format` - a string containing format specifiers prefixed with `%`

## Common Format Specifiers

| Specifier | Description              | Example |
|-----------|--------------------------|---------|
| `%Y`      | 4-digit year             | 2024    |
| `%y`      | 2-digit year             | 24      |
| `%m`      | Month (01-12)            | 06      |
| `%c`      | Month (1-12, no padding) | 6       |
| `%M`      | Full month name          | June    |
| `%b`      | Abbreviated month name   | Jun     |
| `%d`      | Day (01-31)              | 05      |
| `%e`      | Day (1-31, no padding)   | 5       |
| `%D`      | Day with suffix          | 5th     |
| `%H`      | Hour (00-23)             | 14      |
| `%h`      | Hour (01-12)             | 02      |
| `%i`      | Minutes (00-59)          | 30      |
| `%s`      | Seconds (00-59)          | 45      |
| `%p`      | AM or PM                 | PM      |
| `%W`      | Full weekday name        | Monday  |
| `%a`      | Abbreviated weekday      | Mon     |

## Basic Examples

```sql
-- US date format: MM/DD/YYYY
SELECT DATE_FORMAT('2024-06-15', '%m/%d/%Y');
-- Returns: 06/15/2024

-- European format: DD.MM.YYYY
SELECT DATE_FORMAT('2024-06-15', '%d.%m.%Y');
-- Returns: 15.06.2024

-- Full readable date
SELECT DATE_FORMAT('2024-06-15', '%W, %M %D, %Y');
-- Returns: Saturday, June 15th, 2024

-- Time with AM/PM
SELECT DATE_FORMAT('2024-06-15 14:30:00', '%h:%i %p');
-- Returns: 02:30 PM

-- ISO 8601 datetime
SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s');
-- Returns: 2026-03-31T14:30:00
```

## Applying DATE_FORMAT() in Queries

Format dates in SELECT results for display:

```sql
SELECT
  order_id,
  DATE_FORMAT(order_date, '%M %d, %Y') AS formatted_date,
  DATE_FORMAT(order_date, '%H:%i') AS order_time,
  total_amount
FROM orders
ORDER BY order_date DESC
LIMIT 10;
```

## Grouping by Formatted Period

Use `DATE_FORMAT()` to group data by year-month:

```sql
SELECT
  DATE_FORMAT(sale_date, '%Y-%m') AS period,
  SUM(amount) AS monthly_revenue,
  COUNT(*) AS transaction_count
FROM sales
GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
ORDER BY period;
```

Output example:

| period  | monthly_revenue | transaction_count |
|---------|-----------------|-------------------|
| 2024-01 | 45200.00        | 312               |
| 2024-02 | 41800.00        | 289               |
| 2024-03 | 53100.00        | 367               |

## Weekly Grouping

```sql
SELECT
  DATE_FORMAT(created_at, '%x-W%v') AS iso_week,
  COUNT(*) AS signups
FROM users
GROUP BY iso_week
ORDER BY iso_week;
```

`%x` is the ISO year and `%v` is the ISO week number (01-53).

## Generating Report Headers

```sql
SELECT
  CONCAT('Report for ', DATE_FORMAT(CURDATE(), '%M %Y')) AS report_title;
-- Returns: Report for March 2026
```

## Performance Consideration

Using `DATE_FORMAT()` on an indexed column in a `WHERE` clause prevents index use:

```sql
-- Avoid: full table scan
WHERE DATE_FORMAT(created_at, '%Y-%m') = '2024-06'

-- Prefer: range scan uses index
WHERE created_at >= '2024-06-01'
  AND created_at < '2024-07-01'
```

Apply `DATE_FORMAT()` in the `SELECT` list for display, and use range conditions in `WHERE` for filtering.

## Locale-Aware Formatting

`DATE_FORMAT()` outputs weekday and month names in English by default. For localized names, set the `lc_time_names` variable:

```sql
SET lc_time_names = 'es_ES';
SELECT DATE_FORMAT('2024-06-15', '%W, %d de %M de %Y');
-- Returns: sábado, 15 de junio de 2024
```

## Summary

`DATE_FORMAT()` is the go-to MySQL function for converting dates into human-readable strings. Use format specifiers like `%Y`, `%m`, `%d`, `%H`, and `%M` to build any output format needed for reports, APIs, or UI display. Apply it in `SELECT` and `GROUP BY` clauses, and avoid wrapping indexed date columns in `DATE_FORMAT()` inside `WHERE` conditions for best query performance.
