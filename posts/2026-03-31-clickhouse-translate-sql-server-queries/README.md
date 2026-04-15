# How to Translate SQL Server Queries to ClickHouse SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL Server, Migration, Query Translation, Analytics

Description: A practical guide to converting common SQL Server queries to ClickHouse SQL, covering syntax differences, functions, and data type mappings.

---

## Why Migrate from SQL Server to ClickHouse

SQL Server is a solid OLTP database, but when analytical query volumes grow and latency climbs, teams often look to ClickHouse for its columnar storage and vectorized execution. Translating existing queries is usually the first practical step.

## Data Type Mapping

Start with types before touching query logic.

```sql
-- SQL Server                  ClickHouse equivalent
INT                         -> Int32
BIGINT                      -> Int64
NVARCHAR(255)               -> String
DATETIME2                   -> DateTime64(3)
BIT                         -> UInt8
DECIMAL(18,4)               -> Decimal(18,4)
UNIQUEIDENTIFIER            -> UUID
```

## TOP vs LIMIT

SQL Server uses `TOP`; ClickHouse uses `LIMIT`.

```sql
-- SQL Server
SELECT TOP 100 event_id, user_id, created_at
FROM events
ORDER BY created_at DESC;

-- ClickHouse
SELECT event_id, user_id, created_at
FROM events
ORDER BY created_at DESC
LIMIT 100;
```

## Date Functions

Date arithmetic syntax differs significantly.

```sql
-- SQL Server: add 7 days
SELECT DATEADD(day, 7, order_date) AS due_date FROM orders;

-- ClickHouse
SELECT addDays(order_date, 7) AS due_date FROM orders;

-- SQL Server: difference in days
SELECT DATEDIFF(day, start_date, end_date) FROM sessions;

-- ClickHouse
SELECT dateDiff('day', start_date, end_date) FROM sessions;
```

## String Functions

```sql
-- SQL Server
SELECT LEN(name), SUBSTRING(name, 1, 10), CHARINDEX('a', name)
FROM users;

-- ClickHouse
SELECT lengthUTF8(name), substring(name, 1, 10), position(name, 'a')
FROM users;
```

## Aggregation with OVER

Window functions translate fairly directly but syntax for frame bounds is stricter in ClickHouse.

```sql
-- SQL Server
SELECT user_id, amount,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM payments;

-- ClickHouse (same syntax works)
SELECT user_id, amount,
  sum(amount) OVER (PARTITION BY user_id ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM payments;
```

## ISNULL vs ifNull

```sql
-- SQL Server
SELECT ISNULL(revenue, 0) FROM campaigns;

-- ClickHouse
SELECT ifNull(revenue, 0) FROM campaigns;
```

## CTEs

Both support CTEs with `WITH`, so this translation is often copy-paste safe. Watch for recursive CTEs - ClickHouse supports them from v24.3 onward (requires the new query analyzer).

```sql
-- SQL Server
WITH monthly AS (
  SELECT DATETRUNC(MONTH, event_time) AS month, COUNT(*) AS cnt
  FROM events
  GROUP BY DATETRUNC(MONTH, event_time)
)
SELECT month, cnt FROM monthly ORDER BY month;

-- ClickHouse
WITH monthly AS (
  SELECT toStartOfMonth(event_time) AS month, count() AS cnt
  FROM events
  GROUP BY month
)
SELECT month, cnt FROM monthly ORDER BY month;
```

## Summary

Translating SQL Server queries to ClickHouse mainly involves swapping `TOP` for `LIMIT`, replacing `DATEADD`/`DATEDIFF` with ClickHouse date functions, changing `ISNULL` to `ifNull`, and remapping data types. Window function syntax is largely compatible. Running a query through ClickHouse's `EXPLAIN` after translation helps catch planning issues early.
