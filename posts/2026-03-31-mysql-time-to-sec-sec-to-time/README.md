# How to Use TIME_TO_SEC() and SEC_TO_TIME() in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Time Function, Database

Description: Learn how to use MySQL TIME_TO_SEC() and SEC_TO_TIME() to convert between time values and total seconds for arithmetic and duration calculations.

---

## Overview

`TIME_TO_SEC()` and `SEC_TO_TIME()` are a complementary pair of MySQL functions for converting between `TIME` values and their equivalent number of seconds. They are essential for performing arithmetic on time durations, calculating averages over time intervals, and accumulating time totals.

---

## TIME_TO_SEC() Function

Converts a time value to the total number of seconds it represents.

**Syntax:**

```sql
TIME_TO_SEC(time)
```

- Returns the total seconds as an integer.
- For `'HH:MM:SS'`, returns `(H * 3600) + (M * 60) + S`.
- Returns `NULL` if `time` is `NULL`.
- Works with `TIME` values beyond 24 hours (MySQL `TIME` range is `-838:59:59` to `838:59:59`).

### Basic Examples

```sql
SELECT TIME_TO_SEC('00:01:00');
-- Returns: 60

SELECT TIME_TO_SEC('01:00:00');
-- Returns: 3600

SELECT TIME_TO_SEC('08:30:00');
-- Returns: 30600

SELECT TIME_TO_SEC('23:59:59');
-- Returns: 86399

SELECT TIME_TO_SEC('100:00:00');
-- Returns: 360000  (time intervals > 24h are supported)

SELECT TIME_TO_SEC(NULL);
-- Returns: NULL
```

---

## SEC_TO_TIME() Function

Converts a number of seconds back to a `TIME` value.

**Syntax:**

```sql
SEC_TO_TIME(seconds)
```

- Returns a `TIME` value in `'HH:MM:SS'` format.
- For seconds >= 3600, hours will exceed 24 if necessary.
- Returns `NULL` if `seconds` is `NULL`.

### Basic Examples

```sql
SELECT SEC_TO_TIME(60);
-- Returns: '00:01:00'

SELECT SEC_TO_TIME(3600);
-- Returns: '01:00:00'

SELECT SEC_TO_TIME(86399);
-- Returns: '23:59:59'

SELECT SEC_TO_TIME(90000);
-- Returns: '25:00:00'  (exceeds 24 hours)

SELECT SEC_TO_TIME(0);
-- Returns: '00:00:00'

SELECT SEC_TO_TIME(NULL);
-- Returns: NULL
```

---

## How They Relate

```mermaid
flowchart LR
    A["TIME '08:30:00'"] -->|TIME_TO_SEC()| B["30600 seconds"]
    B -->|SEC_TO_TIME()| C["TIME '08:30:00'"]
```

---

## Time Arithmetic with TIME_TO_SEC()

Adding or subtracting times directly in MySQL requires converting to seconds first:

```sql
-- Add two time values
SELECT SEC_TO_TIME(TIME_TO_SEC('02:30:00') + TIME_TO_SEC('01:45:00')) AS total;
-- Returns: '04:15:00'

-- Subtract two time values
SELECT SEC_TO_TIME(TIME_TO_SEC('08:30:00') - TIME_TO_SEC('01:15:00')) AS remaining;
-- Returns: '07:15:00'

-- Half of a duration
SELECT SEC_TO_TIME(TIME_TO_SEC('03:00:00') / 2) AS half;
-- Returns: '01:30:00'
```

---

## Calculating Average Duration

```sql
CREATE TABLE work_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT,
    start_time TIME,
    end_time TIME
);

INSERT INTO work_sessions VALUES
(1, 101, '09:00:00', '17:30:00'),
(2, 101, '08:45:00', '17:15:00'),
(3, 102, '10:00:00', '18:00:00');

-- Calculate average session duration per employee
SELECT
    employee_id,
    SEC_TO_TIME(AVG(TIME_TO_SEC(end_time) - TIME_TO_SEC(start_time))) AS avg_duration,
    SEC_TO_TIME(SUM(TIME_TO_SEC(end_time) - TIME_TO_SEC(start_time))) AS total_duration
FROM work_sessions
GROUP BY employee_id;
```

Result:

| employee_id | avg_duration | total_duration |
|-------------|--------------|----------------|
| 101         | 08:30:00     | 17:00:00       |
| 102         | 08:00:00     | 08:00:00       |

---

## Total Hours Worked per Day

```sql
-- Assumes a work_date DATE column has been added to work_sessions
SELECT
    work_date,
    employee_id,
    SEC_TO_TIME(SUM(TIME_TO_SEC(TIMEDIFF(end_time, start_time)))) AS total_hours
FROM work_sessions
GROUP BY work_date, employee_id;
```

---

## Converting Duration to Minutes or Hours

```sql
-- Get duration in minutes
SELECT
    id,
    TIME_TO_SEC(TIMEDIFF(end_time, start_time)) / 60 AS duration_minutes
FROM work_sessions;

-- Get duration in hours (decimal)
SELECT
    id,
    ROUND(TIME_TO_SEC(TIMEDIFF(end_time, start_time)) / 3600, 2) AS duration_hours
FROM work_sessions;
```

---

## Rounding to Nearest Quarter Hour

```sql
-- Round a duration to the nearest 15 minutes
SELECT SEC_TO_TIME(ROUND(TIME_TO_SEC('01:23:00') / 900) * 900) AS rounded;
-- 900 seconds = 15 minutes
-- Returns: '01:30:00'  (rounds up from 01:23)
```

---

## Time Range Filtering

```sql
-- Find sessions longer than 8 hours
SELECT id, employee_id, start_time, end_time
FROM work_sessions
WHERE TIME_TO_SEC(TIMEDIFF(end_time, start_time)) > 8 * 3600;
```

---

## Handling Negative Durations

```sql
SELECT TIME_TO_SEC('-01:30:00');
-- Returns: -5400

SELECT SEC_TO_TIME(-5400);
-- Returns: '-01:30:00'
```

Useful for representing time before a reference point.

---

## Summary

`TIME_TO_SEC()` converts a `TIME` value to its total second count, while `SEC_TO_TIME()` converts a second count back to a `TIME` value. Together they enable time arithmetic that is not directly possible with `TIME` values alone, such as averaging durations, accumulating totals, and rounding time intervals. Use them with `TIMEDIFF()` for session duration calculations and with `SUM()` or `AVG()` for aggregate time analysis.
