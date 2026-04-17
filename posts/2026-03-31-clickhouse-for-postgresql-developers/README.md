# ClickHouse for PostgreSQL Developers - Key Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, PostgreSQL, Migration, Analytics, Columnar Database

Description: A practical guide for PostgreSQL developers learning ClickHouse, highlighting key differences in SQL dialect, storage engines, and query optimization.

---

PostgreSQL developers often turn to ClickHouse when their analytical queries become too slow on large datasets. While the SQL syntax looks similar, there are important differences in how ClickHouse stores data, handles transactions, and optimizes queries.

## No ACID Transactions

PostgreSQL has full MVCC-based transactions. ClickHouse does not support multi-statement transactions. Each INSERT is atomic at the block level, but there is no BEGIN/COMMIT/ROLLBACK:

```sql
-- PostgreSQL: this is transactional
BEGIN;
INSERT INTO orders ...;
UPDATE inventory ...;
COMMIT;

-- ClickHouse: no transaction support - design around idempotent inserts
INSERT INTO orders ...;  -- atomic, but standalone
```

## Table Engines Replace Storage Options

PostgreSQL uses tablespaces and storage parameters. ClickHouse uses table engines that define storage behavior:

```sql
-- Most common: MergeTree for analytical data
CREATE TABLE events (
    event_time DateTime,
    user_id UInt32,
    action String
) ENGINE = MergeTree()
ORDER BY (user_id, event_time);

-- ReplacingMergeTree for upsert-like behavior
CREATE TABLE users (
    user_id UInt32,
    email String,
    version DateTime
) ENGINE = ReplacingMergeTree(version)
ORDER BY user_id;
```

## ARRAY Functions Differ

PostgreSQL uses `ARRAY[]` and array operators. ClickHouse has its own array functions:

```sql
-- PostgreSQL
SELECT ARRAY[1, 2, 3];
SELECT array_length(my_array, 1) FROM t;

-- ClickHouse
SELECT [1, 2, 3];
SELECT length(my_array) FROM t;
SELECT arrayMap(x -> x * 2, [1, 2, 3]);
SELECT arrayFilter(x -> x > 1, [1, 2, 3]);
```

## Window Functions Have Syntax Differences

```sql
-- Both support window functions with the same standard SQL syntax
-- (ClickHouse added window functions in 21.10, no longer experimental)
SELECT
    user_id,
    event_time,
    row_number() OVER (PARTITION BY user_id ORDER BY event_time) AS rn
FROM events;
```

## EXPLAIN Differences

PostgreSQL uses `EXPLAIN ANALYZE`. ClickHouse uses `EXPLAIN` with different modes:

```sql
-- See query plan
EXPLAIN SELECT count() FROM events WHERE user_id = 42;

-- See pipeline
EXPLAIN PIPELINE SELECT count() FROM events;

-- See estimated rows
EXPLAIN ESTIMATE SELECT count() FROM events WHERE user_id = 42;
```

## String Functions

Many PostgreSQL string functions have different names in ClickHouse:

```sql
-- PostgreSQL                   -- ClickHouse
SELECT substring(s, 1, 5);  -- SELECT substring(s, 1, 5); -- same
SELECT length(s);            -- SELECT length(s); -- same
SELECT s || ' world';        -- SELECT concat(s, ' world');
SELECT regexp_match(s, '\\d+'); -- SELECT extract(s, '\\d+');
SELECT split_part(s, ',', 1);   -- SELECT splitByChar(',', s)[1];
```

## Summary

PostgreSQL developers will find ClickHouse SQL familiar but must adapt to no transactions, table engines instead of tablespaces, and different functions for arrays and strings. The biggest mindset shift is moving from normalized schemas with frequent updates to denormalized, append-only tables optimized for aggregate query performance.
