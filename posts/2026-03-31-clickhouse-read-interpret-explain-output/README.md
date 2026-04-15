# How to Read and Interpret EXPLAIN Output in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, EXPLAIN, Query Optimization, Performance, Execution Plan

Description: Learn how to read and interpret ClickHouse EXPLAIN output to understand query execution plans and identify performance optimization opportunities.

---

ClickHouse's `EXPLAIN` command reveals how the query optimizer plans to execute your query. Understanding the output helps you identify inefficient operations, missing indexes, and opportunities for rewriting queries.

## EXPLAIN Variants

ClickHouse provides several EXPLAIN modes:

```sql
-- Parse tree (AST)
EXPLAIN AST SELECT count() FROM events WHERE date = today();

-- Query text after AST-level optimizations
EXPLAIN SYNTAX SELECT count() FROM events WHERE date = today();

-- Query execution plan (EXPLAIN without a keyword defaults to PLAN)
EXPLAIN PLAN SELECT count() FROM events WHERE date = today();

-- Processor pipeline
EXPLAIN PIPELINE SELECT count() FROM events WHERE date = today();

-- Estimated resource usage
EXPLAIN ESTIMATE SELECT count() FROM events WHERE date = today();
```

## Reading EXPLAIN PLAN Output

```sql
EXPLAIN PLAN
SELECT
    toDate(event_time) AS event_date,
    count() AS events
FROM analytics.events
WHERE event_time >= now() - INTERVAL 7 DAY
GROUP BY event_date
ORDER BY event_date;
```

Example output:

```text
Expression ((Projection + Before ORDER BY))
  Sorting (Sorting for ORDER BY)
    Expression (Before GROUP BY)
      Aggregating
        Expression (Before GROUP BY)
          Filter (WHERE)
            ReadFromMergeTree (analytics.events)
            ReadType: Default
            Parts: 12
            Granules: 348
```

Key things to look for:

- `ReadFromMergeTree` - table scan from a MergeTree-family table
- `Parts` - number of data parts being read (fewer is better)
- `Granules` - number of 8192-row blocks being read (fewer is better)
- `ReadType: Default` - standard parallel read
- `ReadType: InOrder` - reading data in primary key order (used with ORDER BY matching the primary key)
- `ReadType: InReverseOrder` - reading data in reverse primary key order

## Identifying Full Table Scans

Use `EXPLAIN PLAN indexes=1` to see how many parts and granules survive index filtering:

```sql
EXPLAIN PLAN indexes=1
SELECT count() FROM analytics.events WHERE user_id = 12345;
```

```text
ReadFromMergeTree (analytics.events)
ReadType: Default
Parts: 892/892
Granules: 45231/45231
PrimaryKey
  Keys: user_id
  Condition: true
  Parts: 892/892
  Granules: 45231/45231
```

When the "after" count equals the "before" count (e.g., `Parts: 892/892`), no pruning happened — the query reads all data. This means the WHERE clause is not effectively using the primary key. Check if your filter column is in the table's `ORDER BY` definition.

## Reading Filter Pushdown

Good: filter is pushed close to the scan:

```text
Filter (WHERE)
  ReadFromMergeTree
```

Bad: filter happens after aggregation or join - data was read unnecessarily.

## EXPLAIN PIPELINE Output

Shows parallel processing structure:

```sql
EXPLAIN PIPELINE
SELECT count() FROM events WHERE event_date = today();
```

```text
(Expression)
ExpressionTransform
  (Filter)
  FilterTransform
    (ReadFromMergeTree)
    MergeTreeThread 0 -> 1
    MergeTreeThread 0 -> 1
    MergeTreeThread 0 -> 1
```

The number of parallel `MergeTreeThread` processors shows parallelism. If you see only 1, consider `max_threads` settings. You may also see `MergeTreeInOrder` processors when the query reads data in primary key order.

## EXPLAIN ESTIMATE

Quick estimate of rows and data to be read:

```sql
EXPLAIN ESTIMATE
SELECT count() FROM analytics.events
WHERE event_date BETWEEN '2026-01-01' AND '2026-01-31';
```

```text
database  table   parts  rows      marks
analytics events  45     892045231 10892
```

Use this to estimate scan cost before running the actual query.

## Common Patterns to Optimize

When you see these patterns, investigate:

```text
-- Full scan (Parts after = Parts before in indexes=1): add or fix ORDER BY key
Parts: 1000/1000, Granules: 50000/50000

-- Missing join optimization: rewrite as subquery or use IN
HashJoin with large right table

-- Unnecessary sorting: use pre-sorted ORDER BY key
Sorting (Sorting for ORDER BY) with many rows
```

## Summary

ClickHouse EXPLAIN output exposes the execution plan at multiple levels: the logical plan shows data flow, PIPELINE shows parallel execution, and ESTIMATE gives quick scan cost previews. Focus on reducing `Parts` and `Granules` in `ReadFromMergeTree`, ensuring filters align with primary key columns, and verifying that parallelism matches your hardware capabilities.
