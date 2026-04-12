# How to Use CURDATE() and CURTIME() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Database

Description: Learn how MySQL's CURDATE() and CURTIME() functions return the current date and current time separately, with practical filtering and scheduling examples.

---

## What are CURDATE() and CURTIME()?

MySQL provides two functions for obtaining the current date and time as separate components:

- `CURDATE()` - returns the current date as `YYYY-MM-DD`
- `CURTIME()` - returns the current time as `HH:MM:SS`

Both are equivalent to the corresponding parts of `NOW()` but return only the date or time portion. They are also available under aliases:

- `CURDATE()` = `CURRENT_DATE` = `CURRENT_DATE()`
- `CURTIME()` = `CURRENT_TIME` = `CURRENT_TIME()`

## Basic Examples

```sql
SELECT CURDATE();
-- Result: 2026-03-31

SELECT CURTIME();
-- Result: 14:22:07

SELECT CURRENT_DATE;
-- Result: 2026-03-31

SELECT CURRENT_TIME;
-- Result: 14:22:07
```

## Fractional Seconds

`CURTIME()` accepts an optional fractional seconds precision argument (0-6):

```sql
SELECT CURTIME(3);
-- Result: 14:22:07.413

SELECT CURDATE();
-- No precision option for CURDATE()
```

## Using CURDATE() for Date Filtering

Retrieve all records created today:

```sql
SELECT *
FROM orders
WHERE DATE(created_at) = CURDATE();
```

Find records from the last 30 days:

```sql
SELECT *
FROM events
WHERE event_date >= CURDATE() - INTERVAL 30 DAY;
```

Get records for this month:

```sql
SELECT *
FROM invoices
WHERE MONTH(invoice_date) = MONTH(CURDATE())
  AND YEAR(invoice_date) = YEAR(CURDATE());
```

## Age Calculation with CURDATE()

```sql
SELECT
  name,
  birthdate,
  TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) AS age
FROM persons;
```

Find customers who have a birthday today:

```sql
SELECT name, email
FROM customers
WHERE MONTH(birthdate) = MONTH(CURDATE())
  AND DAY(birthdate) = DAY(CURDATE());
```

## Days Until an Event

```sql
SELECT
  event_name,
  event_date,
  DATEDIFF(event_date, CURDATE()) AS days_until
FROM upcoming_events
WHERE event_date >= CURDATE()
ORDER BY event_date;
```

## Using CURTIME() for Time-Based Filtering

Filter records that were created during business hours:

```sql
SELECT *
FROM api_requests
WHERE TIME(created_at) BETWEEN '09:00:00' AND '17:00:00';
```

Or filter stored time values:

```sql
SELECT *
FROM scheduled_tasks
WHERE scheduled_time <= CURTIME()
  AND status = 'pending';
```

## Inserting Current Date and Time Separately

```sql
INSERT INTO daily_report (report_date, generated_at, content)
VALUES (CURDATE(), CURTIME(), 'Daily summary content');
```

## Comparing CURDATE() with DATE Columns

```sql
-- Overdue tasks
SELECT task_name, due_date
FROM tasks
WHERE due_date < CURDATE()
  AND status != 'completed';

-- Tasks due today
SELECT task_name
FROM tasks
WHERE due_date = CURDATE();
```

## CURDATE() vs DATE(NOW())

```sql
SELECT CURDATE();        -- 2026-03-31
SELECT DATE(NOW());      -- 2026-03-31
```

Both return the same date. `CURDATE()` is slightly more efficient as it does not compute the full datetime.

## CURTIME() vs TIME(NOW())

```sql
SELECT CURTIME();        -- 14:22:07
SELECT TIME(NOW());      -- 14:22:07
```

Again equivalent, with `CURTIME()` being more direct.

## Summary

`CURDATE()` returns the current date (`YYYY-MM-DD`) and `CURTIME()` returns the current time (`HH:MM:SS`). They are the date and time components of `NOW()` returned separately. Use `CURDATE()` for date comparisons, age calculations, overdue checks, and birthday filtering. Use `CURTIME()` for scheduling and time-window filtering. Both are consistent within a statement, just like `NOW()`.
