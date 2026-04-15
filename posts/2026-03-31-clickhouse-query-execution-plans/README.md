# How to Read ClickHouse Query Execution Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, SQL, Analytics, Database

Description: Learn how to read and interpret ClickHouse query execution plans produced by EXPLAIN, including plan steps, index usage, pipeline operators, and optimization hints.

## Introduction

A query execution plan is the sequence of operations ClickHouse will perform to answer your query. Reading execution plans correctly lets you pinpoint why a query is slow, verify that indexes are being used, confirm that partition pruning is happening, and understand memory and CPU usage before a query runs. This guide teaches you to read every section of a ClickHouse execution plan from top to bottom.

## The Structure of a ClickHouse Execution Plan

A ClickHouse query plan is a tree of steps. Each step takes input from child steps and produces output for its parent. The tree is read from bottom to top: data enters at the leaves (reads from storage) and flows up through filters, aggregations, sorts, and projections until it reaches the output.

```sql
EXPLAIN indexes = 1
SELECT
    service,
    count()     AS events,
    avg(value)  AS avg_value
FROM metrics
WHERE recorded_at >= now() - INTERVAL 24 HOUR
  AND service IN ('api', 'web', 'worker')
GROUP BY service
ORDER BY events DESC
LIMIT 10;
```

```text
Expression ((Projection + Before ORDER BY))       <- Step 6: final projection
  Limit (preliminary LIMIT)                       <- Step 5: apply LIMIT 10
    Sorting (Sorting for ORDER BY)                <- Step 4: sort by events DESC
      Expression (Before GROUP BY)               <- Step 3: evaluate expressions
        Aggregating                              <- Step 3: GROUP BY + count/avg
          Expression (Before GROUP BY)           <- Step 2: column selection
            Filter (WHERE)                       <- Step 2: apply WHERE filter
              ReadFromMergeTree (metrics)         <- Step 1: read from storage
              Indexes:
                PrimaryKey
                  Keys:
                    recorded_at
                  Condition: (recorded_at in [1711828800, +Inf))
                  Parts: 8/72
                  Granules: 203/9216
```

## Reading Each Plan Step

### ReadFromMergeTree - Storage Read

This is always the bottom step. It shows which table is being read and how much data is being selected.

```text
ReadFromMergeTree (metrics)
Indexes:
  PrimaryKey
    Keys:
      recorded_at
    Condition: (recorded_at in [1711828800, +Inf))
    Parts: 8/72
    Granules: 203/9216
```

Key fields to interpret:

- `Parts: 8/72` - 8 parts read out of 72 total. 89% of parts pruned by partition or primary key - excellent.
- `Granules: 203/9216` - 203 granules read out of 9216. Each granule is typically 8192 rows. Reading 203 granules means about 1.66 million rows, not 75 million. Good pruning.
- `Condition` - the expression used to prune granules. If this shows `1 = 1` or no condition, the primary key is not helping.

If you see `Parts: 72/72` and `Granules: 9216/9216`, there is no index pruning. The query is doing a full table scan.

### Filter - WHERE Evaluation

```text
Filter (WHERE)
```

This step applies the `WHERE` clause to rows after they have been read. If `PREWHERE` was applied automatically (check with `EXPLAIN SYNTAX`), you will see a separate `Prewhere info` section inside `ReadFromMergeTree`. Any remaining filters appear here.

### Expression - Column Evaluation

```text
Expression (Before GROUP BY)
```

This step evaluates computed expressions such as `toDate(event_time)` or arithmetic on columns. If you have expensive expressions here that appear on every row, consider pre-computing them as materialized columns.

### Aggregating - GROUP BY

```text
Aggregating
```

This step performs the GROUP BY and computes aggregate functions. The key concern here is memory: if the number of groups is very large, this step can consume significant RAM. Check `system.query_log.memory_usage` after the query runs to see how much memory was used.

### Sorting - ORDER BY

```text
Sorting (Sorting for ORDER BY)
```

Sorting is one of the most memory-intensive steps. ClickHouse sorts in memory when possible and spills to disk when the sort buffer exceeds `max_bytes_before_external_sort`. If you see `Sorting` in a plan on a very large dataset, verify that your `ORDER BY` is necessary or that you can apply a `LIMIT` earlier to reduce the data being sorted.

### Limit

```text
Limit (preliminary LIMIT)
```

ClickHouse pushes LIMIT early in the pipeline where possible. If you see `preliminary LIMIT`, ClickHouse applied the limit before the final projection. When a `Limit` step appears directly above `Sorting` in the plan, ClickHouse passes the limit to the sorting step, enabling a partial sort (top-N) algorithm that only tracks the needed rows instead of fully sorting all data.

## Reading Index Usage in Detail

```sql
EXPLAIN indexes = 1
SELECT count()
FROM metrics
WHERE recorded_at >= '2024-09-01'
  AND recorded_at <  '2024-10-01'
  AND service = 'api'
  AND value > 100;
```

```text
ReadFromMergeTree (metrics)
Indexes:
  PrimaryKey
    Keys:
      recorded_at
      service
    Condition: and(
      (recorded_at in [1725148800, +Inf)),
      (recorded_at in (-Inf, 1727740800)),
      (service in ['api', 'api'])
    )
    Parts: 3/72
    Granules: 42/9216
  Skip
    Name: idx_value_minmax
    Description: minmax GRANULARITY 4
    Parts: 2/3
    Granules: 18/42
```

The plan shows two index passes:

1. The primary key reduces 9216 granules to 42.
2. The `idx_value_minmax` skipping index further reduces 42 granules to 18.

The `value > 100` condition is handled by the minmax index. Any group of granules where the maximum value across all rows is 100 or less is skipped entirely, since no row in that group can satisfy `value > 100`.

## Reading a Pipeline Plan

```sql
EXPLAIN PIPELINE
SELECT service, count()
FROM metrics
WHERE recorded_at >= now() - INTERVAL 1 HOUR
GROUP BY service
ORDER BY count() DESC
LIMIT 5;
```

```text
(Expression)
ExpressionTransform
  (Limit)
  LimitTransform
    (Sorting)
    MergeSortingTransform
      MergingSortedTransform 8 -> 1
        (Aggregating)
        MergingAggregatedTransform
          Resize 8 -> 8
            AggregatingTransform x8
              (Expression)
              ExpressionTransform x8
                (Filter)
                FilterTransform x8
                  (ReadFromMergeTree)
                  MergeTreeThread x8 0 -> 1
```

Reading the pipeline bottom-up:

- `MergeTreeThread x8` - 8 parallel threads read from storage simultaneously.
- `FilterTransform x8` - 8 parallel filter operations.
- `AggregatingTransform x8` - 8 parallel aggregation threads (partial aggregation per thread).
- `MergingAggregatedTransform` - merges the 8 partial aggregation results into one.
- `MergeSortingTransform` - sorts the merged aggregation result.
- `LimitTransform` - applies LIMIT 5.
- `ExpressionTransform` - final projection.

The `x8` multiplier shows effective parallelism. If you see `x1` throughout, check `max_threads` and ensure your data is distributed across multiple parts.

## Plan Comparison Before and After Optimization

A before/after comparison of granule counts is the most reliable way to verify an optimization worked.

```sql
-- Before: no skipping index on user_id
EXPLAIN indexes = 1
SELECT count() FROM events WHERE user_id = 12345;
-- Granules: 9216/9216  (full scan)

-- Add a bloom filter index
ALTER TABLE events ADD INDEX idx_user user_id TYPE bloom_filter(0.01) GRANULARITY 1;
ALTER TABLE events MATERIALIZE INDEX idx_user;

-- After: bloom filter skips most granules
EXPLAIN indexes = 1
SELECT count() FROM events WHERE user_id = 12345;
-- Granules: 14/9216  (99.8% reduction)
```

## Summary

Reading a ClickHouse execution plan means tracing data flow from `ReadFromMergeTree` at the bottom up through filter, aggregation, sort, and limit steps. The most important numbers are `Parts` and `Granules` in the index section: these tell you how much data ClickHouse will actually read. Good pruning means Parts and Granules are a small fraction of the total. Use `EXPLAIN PIPELINE` to verify parallelism, and compare plan outputs before and after adding indexes or restructuring queries to confirm your optimization had the intended effect.
