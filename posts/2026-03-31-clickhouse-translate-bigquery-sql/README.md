# How to Translate BigQuery SQL to ClickHouse SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, BigQuery, Migration, Query Translation, Analytics

Description: A practical guide to converting BigQuery SQL queries to ClickHouse, covering syntax, functions, and structural differences between the two systems.

---

## Why Move Queries from BigQuery to ClickHouse

BigQuery is managed and serverless, but costs scale with bytes scanned. ClickHouse on self-hosted or cloud infrastructure often delivers comparable analytical speed at lower cost, especially for high-frequency queries against large event tables.

## Data Type Mapping

```sql
-- BigQuery               ClickHouse
INT64                  -> Int64
FLOAT64                -> Float64
NUMERIC(p,s)           -> Decimal(p,s)
STRING                 -> String
BOOL                   -> UInt8
TIMESTAMP              -> DateTime64(6, 'UTC')
DATE                   -> Date
ARRAY<T>               -> Array(T)
STRUCT<...>            -> Tuple(...)
```

## Backtick Quoting vs Standard

BigQuery uses backtick-quoted table references including project and dataset. ClickHouse uses dot notation for database and table.

```sql
-- BigQuery
SELECT * FROM `myproject.analytics.events` LIMIT 100;

-- ClickHouse
SELECT * FROM analytics.events LIMIT 100;
```

## Date and Timestamp Functions

```sql
-- BigQuery
SELECT
  DATE_TRUNC(created_at, MONTH) AS month,
  TIMESTAMP_DIFF(end_time, start_time, SECOND) AS duration_s
FROM sessions;

-- ClickHouse
SELECT
  toStartOfMonth(created_at) AS month,
  dateDiff('second', start_time, end_time) AS duration_s
FROM sessions;
```

## ARRAY_AGG and Array Functions

```sql
-- BigQuery
SELECT user_id, ARRAY_AGG(product_id ORDER BY created_at) AS products
FROM orders
GROUP BY user_id;

-- ClickHouse
SELECT user_id, groupArray(product_id) AS products
FROM orders
GROUP BY user_id;
-- Note: to replicate ORDER BY created_at, collect tuples and sort by the first element
SELECT user_id,
  arrayMap(x -> x.2, arraySort(x -> x.1, groupArray(tuple(created_at, product_id)))) AS products
FROM orders
GROUP BY user_id;
```

## UNNEST vs arrayJoin

```sql
-- BigQuery
SELECT user_id, tag
FROM users, UNNEST(tags) AS tag;

-- ClickHouse
SELECT user_id, arrayJoin(tags) AS tag
FROM users;
```

## IF and CASE

BigQuery's `IF(cond, true_val, false_val)` maps to ClickHouse `if()`.

```sql
-- BigQuery
SELECT IF(status = 'active', 1, 0) AS is_active FROM users;

-- ClickHouse
SELECT if(status = 'active', 1, 0) AS is_active FROM users;
```

## APPROX_COUNT_DISTINCT

```sql
-- BigQuery
SELECT APPROX_COUNT_DISTINCT(user_id) FROM events;

-- ClickHouse
SELECT uniq(user_id) FROM events;
-- or for HyperLogLog++
SELECT uniqHLL12(user_id) FROM events;
```

## Summary

BigQuery to ClickHouse translation focuses on removing project/dataset backtick references, replacing `DATE_TRUNC` with `toStartOfMonth`/`toStartOfWeek`, swapping `ARRAY_AGG` for `groupArray`, using `arrayJoin` instead of `UNNEST`, and mapping `APPROX_COUNT_DISTINCT` to `uniq`. Type names shift from BigQuery's verbose forms to ClickHouse's compact signed/unsigned integers and Decimal types.
