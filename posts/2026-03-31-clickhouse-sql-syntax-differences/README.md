# Key SQL Syntax Differences Between ClickHouse and Standard SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Syntax, Migration, Query Optimization

Description: An overview of the most important SQL syntax differences between ClickHouse and ANSI SQL or other major databases, with side-by-side examples.

---

## Why ClickHouse SQL Differs

ClickHouse implements a dialect of SQL optimized for analytical workloads. It supports most ANSI SQL constructs but introduces extensions and deviates in places that matter for performance at scale. Knowing the key differences prevents frustrating surprises.

## COUNT(*) vs count()

ClickHouse allows `count()` without the asterisk. Both work, but `count()` is idiomatic.

```sql
-- Standard SQL
SELECT COUNT(*) FROM events;

-- ClickHouse (preferred)
SELECT count() FROM events;
```

## Case Sensitivity of Function Names

ClickHouse treats function names as case-sensitive by default, but many common functions (aggregates like `sum`, `count`, `avg`, `min`, `max`, and type conversion functions) are explicitly registered as case-insensitive. For these functions, both `sum` and `SUM` work. However, ClickHouse-specific functions such as `arrayJoin`, `toStartOfMonth`, or `multiIf` are case-sensitive and must be written in the exact case documented.

```sql
-- Both work (common aggregates are case-insensitive)
SELECT sum(amount), avg(price) FROM orders;
SELECT SUM(amount), AVG(price) FROM orders;

-- Case-sensitive: ClickHouse-specific functions
SELECT toStartOfMonth(event_time) FROM events;   -- Works
SELECT tostartofmonth(event_time) FROM events;    -- Fails
```

## Array Literals

```sql
-- ClickHouse array syntax
SELECT [1, 2, 3] AS nums;
SELECT array(1, 2, 3) AS nums;

-- Standard SQL (PostgreSQL style) - NOT valid in ClickHouse
SELECT ARRAY[1, 2, 3] AS nums;
```

## Tuple Literals

```sql
SELECT (1, 'hello', 3.14) AS t;
SELECT tuple(1, 'hello', 3.14) AS t;
```

## FINAL Modifier

ClickHouse's ReplacingMergeTree and CollapsingMergeTree engines keep duplicate rows until a background merge runs. `FINAL` forces deduplication at query time.

```sql
SELECT user_id, name FROM users FINAL WHERE is_active = 1;
```

There is no equivalent in standard SQL.

## GROUP BY Positional References

ClickHouse supports positional `GROUP BY` like MySQL.

```sql
SELECT toStartOfMonth(event_time), count()
FROM events
GROUP BY 1;
```

## SAMPLE Clause

ClickHouse has a native `SAMPLE` clause for approximate queries on large tables, controlled by sampling rate or row count.

```sql
SELECT count() FROM events SAMPLE 0.1;   -- 10% of data
SELECT count() FROM events SAMPLE 1000000; -- ~1M rows
```

## Lambda Functions

ClickHouse supports inline lambda functions for array processing.

```sql
SELECT arrayFilter(x -> x > 100, amounts) AS high_amounts
FROM orders;

SELECT arrayMap(x -> x * 1.1, prices) AS adjusted
FROM products;
```

## PREWHERE Clause

`PREWHERE` is a ClickHouse-specific optimization that applies a filter before reading all columns, reducing I/O.

```sql
SELECT user_id, amount
FROM payments
PREWHERE status = 'completed'
WHERE amount > 1000;
```

## Summary

ClickHouse SQL diverges from standard SQL in function name case sensitivity, array literal syntax, the `FINAL` modifier, `PREWHERE` optimization, native `SAMPLE` clauses, and lambda support in array functions. Most ANSI SELECT, JOIN, GROUP BY, and window function syntax works as expected. The biggest pitfall for newcomers is case sensitivity on ClickHouse-specific function names (common aggregates like `sum` and `avg` are case-insensitive, but functions like `toStartOfMonth` are not) and forgetting `FINAL` when reading from deduplication table engines.
