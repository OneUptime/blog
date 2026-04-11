# How to Use TIME Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Date, Storage

Description: Learn how the TIME data type works in MySQL for storing durations and time-of-day values, with practical examples and time arithmetic.

---

## What Is the TIME Data Type

`TIME` stores a time value in the format `HHH:MM:SS`, representing either a time of day or a duration. Unlike `DATETIME` and `TIMESTAMP`, `TIME` has a range from `-838:59:59` to `838:59:59`, making it useful for elapsed time measurements beyond 24 hours.

Storage: 3 bytes (plus 0-3 bytes for fractional seconds).

## Declaring a TIME Column

```sql
CREATE TABLE work_shifts (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee   VARCHAR(100) NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time   TIME NOT NULL
);
```

## Inserting TIME Values

```sql
INSERT INTO work_shifts (employee, shift_date, start_time, end_time)
VALUES ('Alice', '2026-04-01', '09:00:00', '17:30:00');

-- Short formats are accepted
INSERT INTO work_shifts (employee, shift_date, start_time, end_time)
VALUES ('Bob', '2026-04-01', '8:30', '16:00:00');
-- '8:30' is interpreted as 08:30:00 (colon-delimited shorthand)
-- Without colons, '830' would mean 00:08:30 (8 min 30 sec), not 08:30:00
```

## Querying TIME Data

```sql
-- Employees starting before 9 AM
SELECT * FROM work_shifts WHERE start_time < '09:00:00';

-- Shifts on a specific date
SELECT employee, start_time, end_time
FROM work_shifts
WHERE shift_date = '2026-04-01'
ORDER BY start_time;
```

## Time Arithmetic

```sql
-- Duration of each shift in minutes
SELECT
    employee,
    shift_date,
    start_time,
    end_time,
    TIMEDIFF(end_time, start_time) AS duration,
    TIME_TO_SEC(TIMEDIFF(end_time, start_time)) / 60 AS duration_min
FROM work_shifts;

-- Add 30 minutes to a start time
SELECT employee, ADDTIME(start_time, '00:30:00') AS adjusted_start
FROM work_shifts;
```

## Extracting Time Parts

```sql
SELECT
    employee,
    HOUR(start_time)   AS start_hour,
    MINUTE(start_time) AS start_minute,
    SECOND(start_time) AS start_second
FROM work_shifts;
```

## Fractional Seconds

```sql
CREATE TABLE race_results (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    runner_name VARCHAR(100) NOT NULL,
    finish_time TIME(3) NOT NULL  -- millisecond precision
);

INSERT INTO race_results (runner_name, finish_time)
VALUES ('Runner A', '00:04:32.812');

SELECT runner_name, finish_time FROM race_results ORDER BY finish_time ASC;
```

## Storing Durations vs Time of Day

`TIME` works equally well for both:

```sql
-- Duration: time elapsed for a task
CREATE TABLE task_log (
    task_id    INT UNSIGNED,
    duration   TIME NOT NULL  -- e.g. '02:15:30' = 2 hours 15 min 30 sec
);

-- Time of day: scheduled event time
CREATE TABLE schedule (
    event      VARCHAR(100),
    start_time TIME NOT NULL,
    end_time   TIME NOT NULL
);
```

## Formatting TIME Output

```sql
SELECT
    runner_name,
    TIME_FORMAT(finish_time, '%H:%i:%s') AS formatted
FROM race_results;
```

## Summary

`TIME` is a versatile type for storing both time-of-day values and durations. Its range extends beyond 24 hours, accommodating elapsed-time tracking that spans days. Use `TIME(n)` with a precision argument when sub-second accuracy is needed. Combine `TIME` with `DATE` in separate columns, or use `DATETIME` when you need both in a single column.
