# How to Use DATE() and TIME() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Date Function, Time Function, Database

Description: Learn how to use MySQL DATE() and TIME() to extract the date or time portion from a datetime value for filtering, grouping, and display.

---

## Overview

`DATE()` and `TIME()` are MySQL functions that extract the date portion or time portion, respectively, from a `DATETIME` or `TIMESTAMP` value. They are essential for separating datetime components when you need to filter or group by just the date or just the time.

---

## DATE() Function

`DATE()` extracts and returns the date part from a `DATETIME` or `TIMESTAMP` expression.

**Syntax:**

```sql
DATE(expr)
```

- Returns a `DATE` value (`YYYY-MM-DD`).
- Returns `NULL` if `expr` is `NULL`.

### Basic Examples

```sql
SELECT DATE('2026-03-31 14:30:45');
-- Returns: '2026-03-31'

SELECT DATE(NOW());
-- Returns: '2026-03-31'  (today's date)

SELECT DATE('2026-03-31');
-- Returns: '2026-03-31'  (no-op on DATE type)

SELECT DATE(NULL);
-- Returns: NULL
```

---

## TIME() Function

`TIME()` extracts and returns the time part from a `DATETIME`, `TIMESTAMP`, or `TIME` expression.

**Syntax:**

```sql
TIME(expr)
```

- Returns a `TIME` value (`HH:MM:SS`).
- Returns `NULL` if `expr` is `NULL`.

### Basic Examples

```sql
SELECT TIME('2026-03-31 14:30:45');
-- Returns: '14:30:45'

SELECT TIME(NOW());
-- Returns: '14:30:45'  (current time)

SELECT TIME('14:30:45');
-- Returns: '14:30:45'  (no-op on TIME type)

SELECT TIME(NULL);
-- Returns: NULL
```

---

## How DATE() and TIME() Work

```mermaid
flowchart LR
    A["'2026-03-31 14:30:45'"] -->|DATE()| B["'2026-03-31'"]
    A -->|TIME()| C["'14:30:45'"]
```

---

## Filtering by Date Only

A very common use case is filtering rows by date when the column stores a full `DATETIME`:

```sql
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(100),
    event_time DATETIME
);

INSERT INTO events (event_name, event_time) VALUES
('Morning standup', '2026-03-31 09:00:00'),
('Lunch meeting',   '2026-03-31 12:30:00'),
('Evening webinar', '2026-03-31 18:00:00'),
('Next day call',   '2026-04-01 10:00:00');

-- Get all events for March 31st only
SELECT id, event_name, event_time
FROM events
WHERE DATE(event_time) = '2026-03-31';
```

---

## Filtering by Time Range

```sql
-- Find all afternoon events (12:00 to 17:59)
SELECT id, event_name, event_time
FROM events
WHERE TIME(event_time) BETWEEN '12:00:00' AND '17:59:59';
```

---

## Grouping by Date

```sql
CREATE TABLE page_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page VARCHAR(200),
    viewed_at DATETIME
);

-- Daily view counts
SELECT
    DATE(viewed_at) AS view_date,
    COUNT(*)        AS views
FROM page_views
GROUP BY DATE(viewed_at)
ORDER BY view_date;
```

---

## Grouping by Hour of Day

```sql
-- Traffic distribution by hour
SELECT
    HOUR(TIME(viewed_at)) AS hour_of_day,
    COUNT(*)              AS views
FROM page_views
GROUP BY HOUR(TIME(viewed_at))
ORDER BY hour_of_day;
```

---

## Combining DATE() and TIME() with Other Functions

```sql
-- Format the date portion separately
SELECT
    event_name,
    DATE_FORMAT(DATE(event_time), '%W, %M %d, %Y') AS formatted_date,
    TIME(event_time)                                AS time_only
FROM events;
```

---

## DATE() vs CURDATE() vs CAST

| Expression                  | Returns                       |
|-----------------------------|-------------------------------|
| `DATE(some_datetime)`       | Date part of an existing value |
| `CURDATE()`                 | Today's date                  |
| `CAST(dt AS DATE)`          | Date part (SQL standard way)  |
| `DATE_FORMAT(dt, '%Y-%m-%d')` | Date string (VARCHAR output)|

```sql
-- All extract the date portion, but DATE_FORMAT returns a VARCHAR, not a DATE
SELECT DATE('2026-03-31 14:30:00');
SELECT CAST('2026-03-31 14:30:00' AS DATE);
SELECT DATE_FORMAT('2026-03-31 14:30:00', '%Y-%m-%d');
```

---

## Index Considerations

Using `DATE()` on an indexed `DATETIME` column in a `WHERE` clause prevents the index from being used:

```sql
-- Index on event_time NOT used
SELECT * FROM events WHERE DATE(event_time) = '2026-03-31';

-- Index on event_time IS used
SELECT * FROM events
WHERE event_time >= '2026-03-31 00:00:00'
  AND event_time <  '2026-04-01 00:00:00';
```

For large tables, always prefer explicit range comparisons over `DATE()` in `WHERE` clauses.

---

## Using DATE() and TIME() in Stored Procedures

```sql
DELIMITER //
CREATE PROCEDURE get_events_for_date(IN target_date DATE)
BEGIN
    SELECT id, event_name, TIME(event_time) AS start_time
    FROM events
    WHERE DATE(event_time) = target_date
    ORDER BY event_time;
END //
DELIMITER ;

CALL get_events_for_date('2026-03-31');
```

---

## NULL Handling

```sql
SELECT DATE(NULL);
-- Returns: NULL

SELECT TIME(NULL);
-- Returns: NULL

-- Safe usage with COALESCE
SELECT COALESCE(DATE(event_time), '1970-01-01') AS safe_date
FROM events;
```

---

## Summary

`DATE()` and `TIME()` are MySQL functions for splitting a `DATETIME` or `TIMESTAMP` into its date and time components. `DATE()` returns the `YYYY-MM-DD` portion while `TIME()` returns `HH:MM:SS`. They are widely used for grouping data by day, filtering events on a specific date, or extracting just the time for time-of-day analysis. When used in `WHERE` predicates on large indexed tables, replace them with explicit range comparisons to preserve index usage.
