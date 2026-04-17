# How to Analyze Query Plans with EXPLAIN in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, EXPLAIN, Query Plan, Optimization, Performance

Description: Learn how to use EXPLAIN in ClickHouse to analyze query execution plans, understand index usage, and identify performance bottlenecks in your SQL queries.

---

## EXPLAIN Variants in ClickHouse

ClickHouse provides several EXPLAIN modes, each showing a different level of the query execution:

```text
EXPLAIN PLAN     - logical query plan
EXPLAIN AST      - abstract syntax tree
EXPLAIN SYNTAX   - normalized query syntax
EXPLAIN PIPELINE - physical execution pipeline
EXPLAIN indexes  - index usage details
```

## EXPLAIN PLAN

```sql
EXPLAIN PLAN
SELECT user_id, count() AS cnt
FROM events
WHERE ts >= '2026-01-01'
GROUP BY user_id
ORDER BY cnt DESC
LIMIT 10;
```

Sample output:

```text
Expression (Projection)
  Limit (preliminary LIMIT (without OFFSET))
    Sorting (Sorting for ORDER BY)
      Expression (Before ORDER BY)
        Aggregating
          Expression (Before GROUP BY)
            Filter (WHERE)
              ReadFromMergeTree
```

## EXPLAIN with Index Details

```sql
EXPLAIN indexes = 1
SELECT sum(value)
FROM events
WHERE user_id = 42 AND ts >= '2026-01-01';
```

```text
ReadFromMergeTree
  Indexes:
    PrimaryKey
      Condition: and((user_id in [42, 42]), (ts in [1767225600, +Inf)))
      Parts: 2/12
      Granules: 8/1440
```

`Granules: 8/1440` means only 8 of 1440 granules are read - excellent index usage.

## EXPLAIN PIPELINE

```sql
EXPLAIN PIPELINE
SELECT user_id, sum(value)
FROM events
GROUP BY user_id;
```

Shows the physical execution pipeline with processors and their parallelism level.

## EXPLAIN AST

```sql
EXPLAIN AST
SELECT user_id, count() FROM events WHERE ts > now() - 86400;
```

Useful for debugging how ClickHouse parses your query.

## EXPLAIN SYNTAX

```sql
EXPLAIN SYNTAX
SELECT * FROM events WHERE toDate(ts) = today();
```

Shows the rewritten and normalized query - useful to verify that aliases and shortcuts resolve correctly.

## Reading the Plan

Key things to look for:

```text
ReadFromMergeTree - table scan step
Filter           - WHERE clause application
Aggregating      - GROUP BY processing
Sorting          - ORDER BY
Expression       - column computation
Limit            - LIMIT/OFFSET
```

## Identify Missing Index

```sql
EXPLAIN indexes = 1
SELECT sum(value) FROM events WHERE country = 'US';
```

If the output shows `Parts: 12/12` and `Granules: 1440/1440`, there is no index helping this query.

**Solution:** Add a skip index or projection for `country`.

## Detect Unnecessary Sorting

```sql
EXPLAIN PLAN
SELECT user_id, sum(value)
FROM events
GROUP BY user_id
ORDER BY user_id;
```

If `user_id` is in your ORDER BY key, ClickHouse may optimize away the sort.

## Compare Plans Before and After Optimization

```sql
-- Before: filter on non-indexed column
EXPLAIN indexes = 1
SELECT count() FROM events WHERE event_type = 'click';

-- After adding skip index
ALTER TABLE events ADD INDEX idx_event_type event_type TYPE bloom_filter(0.01) GRANULARITY 4;
ALTER TABLE events MATERIALIZE INDEX idx_event_type;

EXPLAIN indexes = 1
SELECT count() FROM events WHERE event_type = 'click';
```

## Summary

Use `EXPLAIN indexes = 1` to verify index usage and count granules skipped. Use `EXPLAIN PLAN` to understand the logical query steps and find unnecessary operations. These tools are essential for iterative query optimization in ClickHouse.
