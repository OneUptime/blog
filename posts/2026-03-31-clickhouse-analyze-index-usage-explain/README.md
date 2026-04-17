# How to Analyze Index Usage with EXPLAIN in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, EXPLAIN, Index, Performance, Query, Optimization

Description: Learn how to use ClickHouse EXPLAIN statements to analyze primary index and skip index usage, identify full table scans, and optimize query performance.

---

`EXPLAIN` is ClickHouse's primary tool for understanding how a query will be executed. It shows whether indexes are used, how many granules are read, which parts of the query plan are expensive, and whether skip indexes are pruning data. Mastering `EXPLAIN` is essential for diagnosing slow queries.

## EXPLAIN Variants

ClickHouse provides several `EXPLAIN` modes:

| Mode | Description |
|------|-------------|
| `EXPLAIN` | Default: shows the query plan tree |
| `EXPLAIN PLAN` | Same as default |
| `EXPLAIN PIPELINE` | Shows the execution pipeline |
| `EXPLAIN AST` | Shows the abstract syntax tree |
| `EXPLAIN SYNTAX` | Shows normalized query after syntax rewrites |
| `EXPLAIN indexes = 1` | Shows primary key and skip index usage in the plan |

## Basic Usage

```sql
EXPLAIN
SELECT count()
FROM http_logs
WHERE domain = 'example.com'
  AND ts > now() - INTERVAL 7 DAY;
```

## Analyzing Index Usage: indexes = 1

The most useful mode for index analysis is `EXPLAIN indexes = 1`:

```sql
EXPLAIN indexes = 1
SELECT count()
FROM http_logs
WHERE domain = 'example.com'
  AND ts > now() - INTERVAL 7 DAY;
```

Sample output:

```text
Expression ((Projection + Before ORDER BY))
  Aggregating
    Expression (Before GROUP BY)
      Filter (WHERE)
        ReadFromMergeTree (http_logs)
          Indexes:
            PrimaryKey
              Keys:
                domain
                ts
              Condition: and((domain in ['example.com', 'example.com']), (ts in [1704067200, +Inf]))
              Parts: 3/10
              Granules: 45/2000
            Skip
              Name: idx_status
              Description: minmax GRANULARITY 4
              Parts: 2/3
              Granules: 12/45
```

### Reading the Output

- `Parts: 3/10` - only 3 of 10 data parts need to be read
- `Granules: 45/2000` - primary key reduced to 45 out of 2000 granules
- `Granules: 12/45` - skip index further reduced to 12 granules

A query that reads 12 out of 2000 granules (0.6%) is highly optimized.

## Identifying Full Table Scans

A full table scan shows all granules being read:

```sql
EXPLAIN indexes = 1
SELECT count()
FROM http_logs
WHERE status = 404;
```

Output without a skip index on `status`:

```text
ReadFromMergeTree (http_logs)
  Indexes:
    PrimaryKey
      Condition: true
      Parts: 10/10
      Granules: 2000/2000
```

`Granules: 2000/2000` confirms a full scan. Add a skip index to fix this.

## Creating the Missing Index

```sql
ALTER TABLE http_logs
    ADD INDEX idx_status status TYPE set(100) GRANULARITY 4;

ALTER TABLE http_logs MATERIALIZE INDEX idx_status;
```

Re-run the EXPLAIN:

```sql
EXPLAIN indexes = 1
SELECT count()
FROM http_logs
WHERE status = 404;
```

New output:

```text
Skip
  Name: idx_status
  Description: set GRANULARITY 4
  Granules: 180/2000
```

## EXPLAIN PIPELINE

For understanding parallelism and threading:

```sql
EXPLAIN PIPELINE
SELECT sum(bytes), avg(bytes)
FROM http_logs
WHERE ts > now() - INTERVAL 1 HOUR;
```

Output shows the execution pipeline stages, including parallel threads and merge steps.

## EXPLAIN PLAN with Settings

Additional settings for deeper inspection:

```sql
EXPLAIN
    header = 1,
    actions = 1,
    description = 1
SELECT
    domain,
    count() AS cnt
FROM http_logs
WHERE ts > now() - INTERVAL 1 DAY
GROUP BY domain
ORDER BY cnt DESC
LIMIT 10;
```

- `header = 1`: Shows column names and types at each plan node
- `actions = 1`: Shows expression actions (transformations)
- `description = 1`: Adds human-readable descriptions

## Detecting Missing Filters for Partition Pruning

```sql
-- Check if partition pruning works
EXPLAIN indexes = 1
SELECT count()
FROM http_logs
WHERE toYYYYMM(ts) = 202401;
```

If `Parts: 2/120`, only 2 monthly partitions are read. If the table is partitioned by `toYYYYMM(ts)`, this filter prunes correctly because ClickHouse matches the expression against the partition key. If `Parts: 120/120`, the expression does not align with the partition key (for example, the table is partitioned by a different expression) and you should rewrite using a direct range filter that the partition key can evaluate:

```sql
-- Direct range filter also works for partition pruning
SELECT count()
FROM http_logs
WHERE ts >= '2024-01-01' AND ts < '2024-02-01';
```

## Using system.query_log for Post-Execution Analysis

After running queries, check actual rows read:

```sql
SELECT
    query,
    read_rows,
    read_bytes,
    result_rows,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query NOT LIKE '%system%'
ORDER BY event_time DESC
LIMIT 20;
```

Compare `read_rows` to the table's total row count to assess index effectiveness.

## Profiling with system.query_log and EXPLAIN Together

```sql
-- Step 1: Understand the plan
EXPLAIN indexes = 1
SELECT sum(bytes)
FROM http_logs
WHERE domain = 'api.example.com'
  AND status = 500;

-- Step 2: Execute and measure
SELECT sum(bytes)
FROM http_logs
WHERE domain = 'api.example.com'
  AND status = 500;

-- Step 3: Check actual performance
SELECT read_rows, read_bytes, query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 1;
```

## Common Patterns to Look For

| EXPLAIN output | Diagnosis | Fix |
|---------------|-----------|-----|
| `Granules: N/N` on PrimaryKey | Filter does not match ORDER BY prefix | Reorder ORDER BY or add skip index |
| `Condition: true` on PrimaryKey | No index used | Add skip index |
| `Parts: N/N` | No partition pruning | Add partition filter |
| Skip index Granules equals PrimaryKey Granules | Skip index not helping | Check index type and column distribution |

## Summary

`EXPLAIN indexes = 1` is the definitive tool for diagnosing ClickHouse query performance. It shows exactly which indexes are active, how many parts and granules are read, and where full scans are occurring. Use it before deploying queries to production, after adding indexes to confirm they work, and when investigating slow queries in `system.query_log`.
