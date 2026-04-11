# How to Monitor Stored Programs with Performance Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Stored Procedure, Stored Function, Monitoring

Description: Use MySQL Performance Schema to monitor execution time and call counts for stored procedures, functions, triggers, and events.

---

## Overview

Stored programs - procedures, functions, triggers, and scheduled events - execute inside the MySQL server and can be difficult to profile with traditional tools. Performance Schema provides the `events_statements_summary_by_program` table specifically for tracking stored program performance.

## Enabling Stored Program Instrumentation

```sql
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'statement/sp/%';

UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN ('statements_digest', 'events_statements_current',
               'events_statements_history', 'events_statements_history_long');
```

## Querying events_statements_summary_by_program

This table aggregates execution statistics per stored program:

```sql
SELECT
  OBJECT_TYPE,
  OBJECT_SCHEMA,
  OBJECT_NAME,
  COUNT_STAR AS call_count,
  ROUND(SUM_TIMER_WAIT / 1e12, 2) AS total_sec,
  ROUND(AVG_TIMER_WAIT / 1e9, 2) AS avg_ms,
  ROUND(MAX_TIMER_WAIT / 1e9, 2) AS max_ms
FROM performance_schema.events_statements_summary_by_program
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;
```

## Finding the Slowest Stored Procedures

```sql
SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  COUNT_STAR,
  ROUND(AVG_TIMER_WAIT / 1e9, 2) AS avg_ms,
  ROUND(MAX_TIMER_WAIT / 1e9, 2) AS max_ms
FROM performance_schema.events_statements_summary_by_program
WHERE OBJECT_TYPE = 'PROCEDURE'
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;
```

## Monitoring Trigger Performance

Triggers execute automatically and their overhead is often invisible. Detect slow triggers:

```sql
SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  COUNT_STAR AS fire_count,
  ROUND(SUM_TIMER_WAIT / 1e12, 2) AS total_sec,
  ROUND(AVG_TIMER_WAIT / 1e9, 2) AS avg_ms
FROM performance_schema.events_statements_summary_by_program
WHERE OBJECT_TYPE = 'TRIGGER'
ORDER BY SUM_TIMER_WAIT DESC;
```

## Monitoring Function Calls

```sql
SELECT
  OBJECT_SCHEMA,
  OBJECT_NAME,
  COUNT_STAR,
  ROUND(AVG_TIMER_WAIT / 1e9, 2) AS avg_ms,
  SUM_ROWS_EXAMINED,
  SUM_ROWS_SENT
FROM performance_schema.events_statements_summary_by_program
WHERE OBJECT_TYPE = 'FUNCTION'
ORDER BY AVG_TIMER_WAIT DESC;
```

## Drilling Into Stored Procedure Internals

To see which statements inside a stored procedure are slow, query the statement history for events nested within another statement (such as a CALL):

```sql
SELECT
  SQL_TEXT,
  TIMER_WAIT / 1e9 AS exec_ms,
  ROWS_EXAMINED,
  NESTING_EVENT_TYPE
FROM performance_schema.events_statements_history_long
WHERE NESTING_EVENT_TYPE = 'STATEMENT'
ORDER BY TIMER_WAIT DESC
LIMIT 20;
```

## Resetting Statistics

```sql
TRUNCATE TABLE performance_schema.events_statements_summary_by_program;
```

## Summary

The `events_statements_summary_by_program` table gives you aggregated performance data for all stored procedures, functions, and triggers. By tracking call counts, average execution time, and rows examined, you can identify which stored programs need optimization and drill into their internals using statement history tables.
