# How ClickHouse Query Pipeline Architecture Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Pipeline, Processor, Parallel Execution, Internal

Description: Explains ClickHouse's query execution pipeline model, how processors connect as a DAG, how parallelism works per-pipeline, and how to inspect pipelines with EXPLAIN PIPELINE.

---

## From SQL to Execution Pipeline

ClickHouse compiles a SQL query into an execution pipeline - a directed acyclic graph (DAG) of processor nodes. Each processor reads from input ports, transforms data, and writes to output ports. Processors run in parallel threads whenever their inputs are ready.

## Key Processor Types

```text
Processor              | Role
-----------------------|---------------------------------------------------
Source                 | Reads data from a column file or table engine
Filter                 | Applies WHERE clause row filtering
Expression             | Evaluates expressions, function calls, aliases
Aggregating            | Performs GROUP BY aggregation (partial or final)
MergingAggregated      | Merges partial aggregates from parallel threads
Sorting                | Sorts data for ORDER BY
Limit                  | Applies LIMIT/OFFSET
Union                  | Merges streams from multiple parallel sources
Resize                 | Changes parallelism (fan-out or fan-in)
```

## Inspecting Pipelines

```sql
-- See the execution pipeline for a query
EXPLAIN PIPELINE
SELECT user_id, sum(amount) AS total
FROM events
WHERE event_time >= today()
GROUP BY user_id
ORDER BY total DESC
LIMIT 10;
```

Sample output (abbreviated):

```text
(Expression)
(Limit)
(Sorting)
  (MergingAggregated)
    (Resize)
      (Aggregating) x 8          <- 8 parallel threads
        (Expression)
          (Filter)
            (ReadFromMergeTree) x 8  <- reads from 8 parts in parallel
```

## Parallelism in Pipelines

ClickHouse uses `max_threads` (default: number of CPU cores) to determine pipeline parallelism. Multiple `Source` processors read different granule ranges simultaneously.

```sql
-- Change parallelism for a specific query
SET max_threads = 4;

SELECT user_id, count() FROM events GROUP BY user_id;
```

For queries on distributed tables, each shard runs its local pipeline in parallel. The coordinator has a separate pipeline to merge results.

## Pipeline for Aggregation

Aggregation in ClickHouse uses a two-phase approach:

1. **Thread-local aggregation**: Each thread builds its own hash table (partial aggregates)
2. **Merge phase**: `MergingAggregated` processor combines partial hash tables into final results

```text
Source x 8 -> Filter x 8 -> Aggregating x 8 (partial)
  -> Resize (8 -> 1) -> MergingAggregated -> Sorting -> Limit
```

## Two-Level Aggregation for Large GROUP BY

When GROUP BY produces many distinct keys, ClickHouse switches to two-level aggregation: the hash table is partitioned by key hash prefix, which allows parallel merge of sub-tables.

```sql
SET group_by_two_level_threshold = 100000;  -- switch to two-level at 100k groups
```

## Streaming vs Blocking Processors

Some processors stream (emit rows as they arrive):
- Filter, Expression, Limit

Some processors are blocking (must consume all input before producing output):
- Sorting (needs all rows to find global order)
- MergingAggregated (needs all partial results)

Understanding this helps identify where pipeline stalls occur in slow queries.

## Summary

ClickHouse executes queries as parallel DAGs of processor nodes. Sources read multiple granule ranges simultaneously using `max_threads` parallel threads. Aggregation runs partially per thread and merges at the end. Use `EXPLAIN PIPELINE` to visualize parallelism, identify blocking processors, and understand how ClickHouse routes data through the execution graph. Increasing `max_threads` parallelizes more work at the cost of CPU and memory.
