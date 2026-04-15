# How to Translate Redshift SQL to ClickHouse SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Redshift, Migration, Query Translation, Analytics

Description: A step-by-step guide to translating Amazon Redshift SQL to ClickHouse SQL, covering types, date functions, window functions, and distribution style differences.

---

## Redshift to ClickHouse Migration Overview

Redshift is a managed MPP warehouse on AWS. ClickHouse is often chosen as a self-hosted or ClickHouse Cloud alternative when you want lower per-query cost or sub-second latency on event data. Query translation is the main technical friction point.

## Data Type Mapping

```sql
-- Redshift              ClickHouse
INTEGER               -> Int32
BIGINT                -> Int64
DOUBLE PRECISION      -> Float64
NUMERIC(p,s)          -> Decimal(p,s)
VARCHAR(n)            -> String
BOOLEAN               -> UInt8
TIMESTAMP             -> DateTime
TIMESTAMPTZ           -> DateTime('UTC')
DATE                  -> Date
SUPER                 -> String (JSON raw)
```

## Date Functions

Redshift uses PostgreSQL-style functions. ClickHouse has its own naming.

```sql
-- Redshift
SELECT
  DATE_TRUNC('week', event_time) AS week,
  DATEADD(HOUR, 6, event_time) AS adjusted,
  DATEDIFF(SECOND, start_time, end_time) AS duration_s
FROM events;

-- ClickHouse
SELECT
  toStartOfWeek(event_time, 1) AS week,
  addHours(event_time, 6) AS adjusted,
  dateDiff('second', start_time, end_time) AS duration_s
FROM events;
```

## NVL and COALESCE

Redshift's `NVL` is an alias for `COALESCE`. ClickHouse uses `coalesce` or `ifNull`.

```sql
-- Redshift
SELECT NVL(revenue, 0) FROM orders;

-- ClickHouse
SELECT ifNull(revenue, 0) FROM orders;
-- or
SELECT coalesce(revenue, 0) FROM orders;
```

## LISTAGG vs groupArray

```sql
-- Redshift
SELECT user_id, LISTAGG(tag, ',') WITHIN GROUP (ORDER BY tag) AS tags
FROM user_tags
GROUP BY user_id;

-- ClickHouse
SELECT user_id, arrayStringConcat(arraySort(groupArray(tag)), ',') AS tags
FROM user_tags
GROUP BY user_id;
```

## Distribution Keys

Redshift has `DISTKEY` and `SORTKEY` clauses in `CREATE TABLE`. ClickHouse equivalents are the `ORDER BY` and `PARTITION BY` clauses in the MergeTree engine definition. There is no direct syntax translation - you redesign the table engine.

```sql
-- Redshift
CREATE TABLE events (
  event_id BIGINT,
  user_id  BIGINT DISTKEY,
  event_time TIMESTAMP SORTKEY
);

-- ClickHouse
CREATE TABLE events (
  event_id  Int64,
  user_id   Int64,
  event_time DateTime
) ENGINE = MergeTree()
ORDER BY (user_id, event_time);
```

## APPROXIMATE COUNT

```sql
-- Redshift
SELECT APPROXIMATE COUNT(DISTINCT user_id) FROM events;

-- ClickHouse
SELECT uniq(user_id) FROM events;
```

## Summary

Redshift to ClickHouse translation means replacing PostgreSQL-style date functions with ClickHouse's `toStartOf*` and `addHours`/`addDays` helpers, swapping `NVL` for `ifNull`, converting `LISTAGG` to `arrayStringConcat(arraySort(groupArray(...)))`, and redesigning distribution and sort keys as MergeTree `ORDER BY` clauses. The biggest structural shift is moving from Redshift's distributed SORT/DIST model to ClickHouse's primary key index.
