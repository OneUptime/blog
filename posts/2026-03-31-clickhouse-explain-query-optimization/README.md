# How to Use EXPLAIN for Query Optimization in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Performance, SQL, Analytics, Database

Description: Learn how to use ClickHouse EXPLAIN statements to inspect query plans, identify inefficiencies, and make targeted optimizations based on real execution data.

## Introduction

`EXPLAIN` is the starting point for any ClickHouse query optimization effort. It shows you what the query optimizer intends to do before you run the query, saving you from waiting minutes for a slow query to complete before learning why it is slow. ClickHouse has several variants of `EXPLAIN` that reveal different levels of the query pipeline, from the abstract syntax tree to the physical execution plan with index usage details.

## EXPLAIN Variants

ClickHouse supports several `EXPLAIN` types along with settings that change their output:

| Variant | Shows |
|---|---|
| `EXPLAIN` (alias for `EXPLAIN PLAN`) | Logical query plan (QueryPlan steps) |
| `EXPLAIN AST` | Abstract syntax tree |
| `EXPLAIN SYNTAX` | Query text after syntax-level optimizations |
| `EXPLAIN QUERY TREE` | Query tree produced by the analyzer |
| `EXPLAIN PIPELINE` | Physical execution pipeline with operators |
| `EXPLAIN ESTIMATE` | Estimated rows, marks, and parts to read |
| `EXPLAIN indexes = 1` | Setting on `EXPLAIN PLAN` that adds index usage details |

## EXPLAIN - Logical Query Plan

The default `EXPLAIN` shows the sequence of logical steps ClickHouse will execute.

```sql
EXPLAIN
SELECT
    toDate(event_time) AS date,
    service,
    count()            AS events
FROM user_events
WHERE event_time >= now() - INTERVAL 7 DAY
  AND service = 'checkout'
GROUP BY date, service
ORDER BY date;
```

Sample output:

```text
Expression ((Projection + Before ORDER BY))
  Sorting (Sorting for ORDER BY)
    Expression (Before GROUP BY)
      Aggregating
        Expression (Before GROUP BY)
          Filter (WHERE)
            ReadFromMergeTree (user_events)
```

**Key things to look for:**
- `ReadFromMergeTree` is the leaf step that actually reads data. Its inputs are filtered upward by `Filter`, then aggregated, sorted, and projected.
- `Aggregating` handles the `GROUP BY`, and `Sorting` handles the `ORDER BY`. Both are memory-sensitive.
- The default `EXPLAIN` does not include index statistics. To see how many parts and granules are actually read, use `EXPLAIN indexes = 1`.

## EXPLAIN indexes = 1

This is the most useful variant for diagnosing slow queries. It shows exactly which index conditions are being applied.

```sql
EXPLAIN indexes = 1
SELECT count()
FROM user_events
WHERE event_time >= '2024-09-01'
  AND event_time <  '2024-10-01'
  AND service = 'api';
```

```text
ReadFromMergeTree (user_events)
Indexes:
  PrimaryKey
    Keys:
      event_time
      service
    Condition: and(
      (event_time in [1725148800, +Inf)),
      (event_time in (-Inf, 1727740800)),
      (service in ['api', 'api'])
    )
    Parts: 3/48
    Granules: 42/3840
  Skip
    Name: idx_service
    Description: minmax GRANULARITY 4
    Parts: 3/3
    Granules: 42/42
```

The output shows both the primary key and any skipping indexes being used, along with the reduction in parts and granules they achieve.

## EXPLAIN SYNTAX - See What the Optimizer Rewrites

`EXPLAIN SYNTAX` shows the normalized form of your query after the optimizer applies rewrites. It is useful for checking whether `PREWHERE` was applied automatically.

```sql
EXPLAIN SYNTAX
SELECT url, response_time_ms, user_agent
FROM http_requests
WHERE status_code = 500
  AND response_time_ms > 1000;
```

```sql
-- Output shows the rewritten query:
SELECT
    url,
    response_time_ms,
    user_agent
FROM http_requests
PREWHERE status_code = 500
WHERE response_time_ms > 1000
```

If `status_code = 500` moved to `PREWHERE`, the optimizer determined it is a good early filter. If it did not move, consider adding it explicitly.

## EXPLAIN PIPELINE - Physical Execution Graph

`EXPLAIN PIPELINE` reveals the physical operators, parallelism, and data flow.

```sql
EXPLAIN PIPELINE
SELECT service, count()
FROM user_events
WHERE event_time >= now() - INTERVAL 1 DAY
GROUP BY service;
```

```text
(Expression)
ExpressionTransform
  (Aggregating)
  Resize 1 -> 1
    AggregatingTransform
      (Expression)
      ExpressionTransform x8
        (Filter)
        FilterTransform x8
          (ReadFromMergeTree)
          MergeTreeInOrder x8 0 -> 1
```

The `x8` suffix shows 8 parallel threads reading and filtering. If you see `x1` throughout, parallelism is not being used - check `max_threads` and table size.

Get a visual graph:

```sql
EXPLAIN PIPELINE graph = 1
SELECT service, count()
FROM user_events
WHERE event_time >= now() - INTERVAL 1 DAY
GROUP BY service;
```

Paste the output into an online Graphviz viewer to visualize the pipeline.

## Diagnosing Common Problems with EXPLAIN

### Problem: Full table scan despite a WHERE clause

```sql
-- Check if partition pruning is happening
EXPLAIN indexes = 1
SELECT count() FROM orders WHERE customer_id = 12345;
```

If output shows `Parts: 48/48`, the filter on `customer_id` is not benefiting from the primary key. The fix is to ensure `customer_id` is in the `ORDER BY` or to add a skipping index.

```sql
-- Add a skipping index
ALTER TABLE orders ADD INDEX idx_customer customer_id TYPE bloom_filter(0.01) GRANULARITY 1;
ALTER TABLE orders MATERIALIZE INDEX idx_customer;
```

### Problem: Sort operation consuming large memory

```sql
EXPLAIN
SELECT * FROM events ORDER BY user_id, event_time LIMIT 1000;
```

If you see `Sorting` in the plan with no index support, consider whether `ORDER BY` is necessary or whether you can push a `LIMIT` earlier.

### Problem: JOIN reading the right table multiple times on distributed setup

```sql
EXPLAIN
SELECT e.user_id, u.plan
FROM distributed_events e
JOIN users u ON e.user_id = u.user_id;
```

If the right-table subquery is executed per shard, switch to `GLOBAL JOIN`.

## Combining EXPLAIN with query_log

After running a query, `system.query_log` gives you runtime metrics that complement `EXPLAIN`'s plan-time predictions.

```sql
SELECT
    query_id,
    read_rows,
    read_bytes,
    memory_usage,
    query_duration_ms,
    ProfileEvents['SelectedParts']    AS parts_selected,
    ProfileEvents['SelectedMarks']    AS granules_selected,
    ProfileEvents['MergedRows']       AS rows_merged
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%user_events%'
ORDER BY event_time DESC
LIMIT 5;
```

If `granules_selected` is high (close to total granule count), your primary key is not pruning effectively. If `memory_usage` is high, your aggregation or join is consuming excessive RAM.

## Summary

Use `EXPLAIN indexes = 1` as your first tool when investigating a slow query - it shows exactly how many parts and granules are being read and which indexes are active. Use `EXPLAIN SYNTAX` to verify that `PREWHERE` was applied automatically. Use `EXPLAIN PIPELINE` to confirm parallelism. Then validate your optimization by comparing `system.query_log` metrics before and after the change to confirm that granule count, memory usage, and duration all improved.
