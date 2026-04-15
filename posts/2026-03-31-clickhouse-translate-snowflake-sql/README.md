# How to Translate Snowflake SQL to ClickHouse SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Snowflake, Migration, Query Translation, Analytics

Description: Learn how to convert Snowflake SQL queries to ClickHouse, including type mappings, date functions, semi-structured data, and aggregation differences.

---

## Snowflake vs ClickHouse

Snowflake's virtual warehouse model separates compute from storage and handles concurrency well. ClickHouse excels at single-table analytical scans with its columnar MergeTree engine. When moving workloads, query translation is the practical starting point.

## Data Type Mapping

```sql
-- Snowflake            ClickHouse
NUMBER(p,s)          -> Decimal(p,s)
FLOAT                -> Float64
VARCHAR              -> String
BOOLEAN              -> Bool
TIMESTAMP_NTZ        -> DateTime64(9)
DATE                 -> Date
VARIANT              -> JSON  (or String for raw storage)
ARRAY                -> Array(String)
OBJECT               -> Map(String, String) or JSON
```

## LIMIT and TOP

Both use `LIMIT`, so this is a direct translation.

```sql
-- Snowflake
SELECT order_id, total FROM orders ORDER BY created_at DESC LIMIT 50;

-- ClickHouse (identical)
SELECT order_id, total FROM orders ORDER BY created_at DESC LIMIT 50;
```

## Date Functions

```sql
-- Snowflake
SELECT
  DATE_TRUNC('month', order_date) AS month,
  DATEADD('day', 30, order_date) AS due_date,
  DATEDIFF('day', start_date, end_date) AS age
FROM orders;

-- ClickHouse
SELECT
  toStartOfMonth(order_date) AS month,
  addDays(order_date, 30) AS due_date,
  dateDiff('day', start_date, end_date) AS age
FROM orders;
```

## FLATTEN vs arrayJoin

Snowflake's `LATERAL FLATTEN` expands variant arrays. ClickHouse uses `arrayJoin`.

```sql
-- Snowflake
SELECT u.user_id, f.value::STRING AS tag
FROM users u,
  LATERAL FLATTEN(input => u.tags) f;

-- ClickHouse
SELECT user_id, arrayJoin(tags) AS tag
FROM users;
```

## IFF vs if

```sql
-- Snowflake
SELECT IFF(is_premium = TRUE, 'premium', 'free') AS tier FROM users;

-- ClickHouse
SELECT if(is_premium = 1, 'premium', 'free') AS tier FROM users;
```

## QUALIFY Clause

Snowflake supports `QUALIFY` to filter window function results inline. ClickHouse also supports `QUALIFY`, so this is a direct translation.

```sql
-- Snowflake
SELECT user_id, event_time,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_time DESC) AS rn
FROM events
QUALIFY rn = 1;

-- ClickHouse (identical)
SELECT user_id, event_time,
  row_number() OVER (PARTITION BY user_id ORDER BY event_time DESC) AS rn
FROM events
QUALIFY rn = 1;
```

## Semi-Structured JSON

```sql
-- Snowflake (VARIANT access)
SELECT data:user_id::INT, data:event_name::STRING FROM raw_events;

-- ClickHouse (JSON stored as String)
SELECT
  JSONExtractInt(data, 'user_id'),
  JSONExtractString(data, 'event_name')
FROM raw_events;
```

## Summary

Translating Snowflake to ClickHouse requires replacing `DATE_TRUNC` with ClickHouse's `toStartOf*` family, swapping `LATERAL FLATTEN` with `arrayJoin`, converting `IFF` to `if`, and using `JSONExtract*` functions in place of Snowflake's colon-based variant access. `QUALIFY`, `LIMIT`, and type names are the easiest parts of the migration since they translate directly.
