# How to Use PREWHERE in ClickHouse for Faster Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, SELECT, PREWHERE, Performance, Filter

Description: Learn how PREWHERE in ClickHouse filters data at the granule level before reading other columns, reducing I/O and speeding up selective queries.

---

`PREWHERE` is a ClickHouse-specific optimization clause that sits between the storage layer and the `WHERE` clause. It applies a filter before reading all the requested columns, discarding data granules that cannot match early. This reduces the volume of data read from disk when the filter column is cheap to read and highly selective. For queries against large MergeTree tables with highly selective filters on compact columns, `PREWHERE` can dramatically reduce I/O and query time.

## PREWHERE vs WHERE

Both `PREWHERE` and `WHERE` filter rows, but they operate at different stages:

- `WHERE` reads all selected columns first, then filters.
- `PREWHERE` reads only the filter column(s), discards non-matching granules at the mark level, then reads the remaining columns only for the surviving rows.

```sql
-- WHERE: reads all columns (event_time, user_id, payload, ...) then filters
SELECT user_id, payload
FROM events
WHERE event_time >= '2024-01-01' AND event_time < '2024-02-01';

-- PREWHERE: reads event_time first, discards granules, then reads user_id and payload
SELECT user_id, payload
FROM events
PREWHERE event_time >= '2024-01-01' AND event_time < '2024-02-01';
```

For a table with many wide columns (e.g., a `String` payload column), the `PREWHERE` version avoids reading the large payload for granules that will be discarded.

## Automatic PREWHERE Optimization

ClickHouse automatically promotes eligible `WHERE` conditions to `PREWHERE` for MergeTree family tables when the setting `optimize_move_to_prewhere` is enabled (it is on by default). You rarely need to write `PREWHERE` manually.

```sql
-- Check the setting
SELECT value FROM system.settings WHERE name = 'optimize_move_to_prewhere';
-- Default: 1 (enabled)

-- ClickHouse automatically rewrites this:
SELECT user_id, response_body
FROM http_logs
WHERE status_code = 500;
-- Internally: PREWHERE status_code = 500, then reads response_body
```

To see whether your query uses `PREWHERE`, inspect the query plan:

```sql
EXPLAIN
SELECT user_id, response_body
FROM http_logs
WHERE status_code = 500;
-- Look for "Prewhere info" in the output
```

## Manual PREWHERE

Write `PREWHERE` manually when you want explicit control over which condition is applied early, or when the automatic promotion does not select the most selective filter.

```sql
SELECT
    user_id,
    event_type,
    properties
FROM events
PREWHERE toDate(event_time) = today()
WHERE event_type IN ('purchase', 'refund')
ORDER BY event_time DESC
LIMIT 1000;
```

Here `toDate(event_time) = today()` is applied first to discard all non-today granules before reading the `event_type` and `properties` columns.

## Using Both PREWHERE and WHERE Together

`PREWHERE` and `WHERE` can coexist. `PREWHERE` is evaluated first, and `WHERE` is applied to the surviving rows.

```sql
SELECT
    session_id,
    duration_ms,
    error_message
FROM sessions
PREWHERE status = 'error'          -- cheap Enum8 column, applied first
WHERE duration_ms > 5000           -- applied after PREWHERE discards granules
  AND toDate(started_at) >= today() - 7;
```

## Restrictions on PREWHERE

Not all conditions can be placed in `PREWHERE`:

- `PREWHERE` is only supported by MergeTree family tables (MergeTree, ReplacingMergeTree, SummingMergeTree, etc.).
- `ALIAS` columns cannot be used in `PREWHERE`.
- Columns used in `PREWHERE` can safely appear in the `SELECT` list — ClickHouse retains the column data for rows that pass the filter.

```sql
-- Works correctly: status in both PREWHERE and SELECT
SELECT status, user_id
FROM events
PREWHERE status = 'error';

-- This will NOT work: PREWHERE on a non-MergeTree table
-- SELECT * FROM my_memory_table PREWHERE id = 1;  -- error
```

## When PREWHERE Provides the Most Benefit

`PREWHERE` is most effective when:
- The filter column is physically small (e.g., integers, dates, enums).
- The filter is highly selective (discards most granules).
- Other selected columns are large (e.g., wide strings or arrays).
- The table uses the MergeTree engine family.

```sql
-- High benefit: filter on a 4-byte UInt32 column, select a large String column
SELECT large_payload
FROM logs
PREWHERE server_id = 42;

-- Lower benefit: filter and select are similar-size columns
SELECT user_id
FROM events
PREWHERE user_id > 1000;
```

## Summary

`PREWHERE` is a ClickHouse-specific optimization that reads a filter column first, discards non-matching data granules at the storage level, and then reads the remaining columns only for surviving rows. ClickHouse automatically moves eligible `WHERE` conditions to `PREWHERE` via the `optimize_move_to_prewhere` setting, so manual use is rarely required. Manual `PREWHERE` is most valuable when you want to guarantee that a specific highly selective, low-cost filter column is evaluated before large, expensive columns are read from disk.
