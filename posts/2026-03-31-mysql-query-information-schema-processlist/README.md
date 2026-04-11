# How to Query INFORMATION_SCHEMA.PROCESSLIST in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, INFORMATION_SCHEMA, Process, Connection, Monitoring

Description: Learn how to query INFORMATION_SCHEMA.PROCESSLIST in MySQL to monitor active connections, identify long-running queries, and diagnose blocking sessions.

---

## Overview

`INFORMATION_SCHEMA.PROCESSLIST` shows all currently active MySQL connections and the SQL statement each is executing. It is the equivalent of `SHOW PROCESSLIST` but can be joined with other tables and filtered with standard SQL. For production monitoring, this is a critical real-time diagnostic tool.

## Basic Query

```sql
SELECT
  ID,
  USER,
  HOST,
  DB,
  COMMAND,
  TIME,
  STATE,
  INFO
FROM information_schema.PROCESSLIST
ORDER BY TIME DESC;
```

## Key Columns

| Column | Description |
|--------|-------------|
| `ID` | Connection/thread ID |
| `USER` | MySQL username |
| `HOST` | Client hostname:port |
| `DB` | Current default database |
| `COMMAND` | Query, Sleep, Connect, etc. |
| `TIME` | Seconds the thread has been in current state |
| `STATE` | Thread state (Waiting for lock, Sending data, etc.) |
| `INFO` | Full SQL text (LONGTEXT; `NULL` if idle) |

## Finding Long-Running Queries

```sql
SELECT ID, USER, HOST, DB, TIME, STATE, INFO
FROM information_schema.PROCESSLIST
WHERE COMMAND != 'Sleep'
  AND TIME > 30
ORDER BY TIME DESC;
```

## Finding Idle Connections Held for Too Long

```sql
SELECT ID, USER, HOST, DB, TIME
FROM information_schema.PROCESSLIST
WHERE COMMAND = 'Sleep'
  AND TIME > 600
ORDER BY TIME DESC;
```

## Finding Blocked Queries (Waiting for Lock)

```sql
SELECT ID, USER, HOST, DB, TIME, STATE
FROM information_schema.PROCESSLIST
WHERE STATE LIKE '%lock%'
   OR STATE LIKE '%wait%'
ORDER BY TIME DESC;
```

## Counting Connections Per User

```sql
SELECT USER, COUNT(*) AS connections
FROM information_schema.PROCESSLIST
GROUP BY USER
ORDER BY connections DESC;
```

## Generating KILL Statements for Long Queries

```sql
SELECT
  CONCAT('KILL QUERY ', ID, ';') AS kill_stmt,
  USER,
  TIME,
  INFO
FROM information_schema.PROCESSLIST
WHERE COMMAND != 'Sleep'
  AND TIME > 120
ORDER BY TIME DESC;
```

Then execute the kill after review:

```sql
KILL QUERY 1234;
```

## Preferring Performance Schema for Production

For more detail and less lock contention, use the Performance Schema alternative:

```sql
SELECT
  PROCESSLIST_ID,
  PROCESSLIST_USER,
  PROCESSLIST_HOST,
  PROCESSLIST_DB,
  PROCESSLIST_COMMAND,
  PROCESSLIST_TIME,
  PROCESSLIST_STATE
FROM performance_schema.threads
WHERE TYPE = 'FOREGROUND'
ORDER BY PROCESSLIST_TIME DESC;
```

## Summary

`INFORMATION_SCHEMA.PROCESSLIST` is the standard way to view active MySQL connections and running queries. Use it to detect long-running queries, stuck transactions, idle connection accumulation, and lock wait states. For high-frequency monitoring in production, prefer `performance_schema.threads` as it is implemented without internal mutex locks and has lower overhead.
