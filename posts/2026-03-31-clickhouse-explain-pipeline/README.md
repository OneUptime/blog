# How to Use EXPLAIN PIPELINE in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, EXPLAIN, Pipeline, Query Analysis

Description: Learn how to use EXPLAIN PIPELINE in ClickHouse to visualize the physical execution pipeline and identify parallelism bottlenecks.

---

While `EXPLAIN` shows a logical query plan, `EXPLAIN PIPELINE` reveals the physical execution graph - the actual streams of data that ClickHouse will create when running your query. This view is particularly valuable for understanding how many threads are used, where parallelism is reduced, and which steps serialize the data flow.

## Basic EXPLAIN PIPELINE Syntax

```sql
EXPLAIN PIPELINE
SELECT user_id, count() AS total_events
FROM events
WHERE event_date >= '2024-01-01'
GROUP BY user_id;
```

Sample output:

```text
(Expression)
ExpressionTransform
  (Aggregating)
  Resize 8 -> 1
    AggregatingTransform × 8
      (Expression)
      ExpressionTransform × 8
        (Filter)
        FilterTransform × 8
          (ReadFromMergeTree)
          MergeTreeThread × 8
```

The graph reads from bottom to top. `MergeTreeThread × 8` means 8 parallel reader threads. The `Resize 8 -> 1` step is where the parallel streams are merged into a single stream for the final aggregation.

## Reading the Pipeline Graph

### Thread Multiplicity

The `× N` suffix on a transform shows how many parallel instances exist at that stage.

```sql
EXPLAIN PIPELINE
SELECT event_type, sum(value)
FROM metrics
GROUP BY event_type;
```

```text
ExpressionTransform
  Resize 4 -> 1
    AggregatingTransform × 4
      ExpressionTransform × 4
        MergeTreeThread × 4
```

Here 4 threads read data in parallel, aggregate independently, and then merge results. More threads generally mean better CPU utilization on multi-core servers.

### Resize Transform

A `Resize M -> N` transform either fans in (M > N) or fans out (M < N) streams. Fan-in is common before final aggregation or sorting:

```sql
EXPLAIN PIPELINE
SELECT user_id, count()
FROM events
GROUP BY user_id
ORDER BY count() DESC
LIMIT 100;
```

```text
LimitTransform
  MergeSortingTransform
    Resize 8 -> 1
      PartialSortingTransform × 8
        AggregatingTransform × 8
          MergeTreeThread × 8
```

Partial sorting happens in parallel (`× 8`), then results are merged (`Resize 8 -> 1`) and final merge-sorted before the limit is applied.

## EXPLAIN PIPELINE with graph Option

The `graph = 1` option renders the pipeline as a DOT graph description, which can be piped into Graphviz for visualization. The `compact = 1` option (enabled by default when `graph = 1` is set) collapses identical parallel branches so the output stays readable for highly parallel queries.

```sql
-- Default text output
EXPLAIN PIPELINE
SELECT count() FROM events;

-- DOT graph output (pipe to Graphviz to render)
EXPLAIN PIPELINE graph = 1, compact = 1
SELECT count() FROM events;
```

In DOT output each processor becomes a node and each data stream becomes an edge. With `compact = 1` parallel processors of the same type are merged into a single node, making it easier to reason about the overall shape of the pipeline for complex queries.

## Identifying Bottlenecks

### Unnecessary Serialization

Watch for a `Resize N -> 1` that appears too early in the pipeline:

```sql
EXPLAIN PIPELINE
SELECT a.user_id, b.name, count()
FROM events a
JOIN users b ON a.user_id = b.user_id
GROUP BY a.user_id, b.name;
```

```text
ExpressionTransform
  AggregatingTransform
    Resize 8 -> 1
      JoiningTransform × 8
        MergeTreeThread × 8
        -- (broadcast side for users table)
        SourceFromSingleChunk
```

If the join forces a `Resize` before aggregation, it may indicate that the join algorithm cannot be parallelized effectively for your data distribution.

### Single-Threaded Reading

```sql
EXPLAIN PIPELINE
SELECT count() FROM small_table;
```

```text
ExpressionTransform
  AggregatingTransform
    ExpressionTransform
      MergeTreeThread
```

No `× N` means single-threaded execution - expected for very small tables where spawning multiple threads would add overhead.

## Practical Example: Tuning Parallelism

You can control the number of threads with the `max_threads` setting and use EXPLAIN PIPELINE to confirm the change:

```sql
-- Check default parallelism
EXPLAIN PIPELINE
SELECT region, sum(revenue)
FROM sales
GROUP BY region;

-- Force more threads
EXPLAIN PIPELINE
SELECT region, sum(revenue)
FROM sales
GROUP BY region
SETTINGS max_threads = 16;
```

Comparing both outputs lets you confirm whether increasing `max_threads` actually adds more `MergeTreeThread` instances before committing to a production setting change.

## Summary

`EXPLAIN PIPELINE` exposes the physical execution graph that ClickHouse builds for a query, including the number of parallel threads at each stage and where fan-in or fan-out occurs. Look for `Resize N -> 1` steps that appear early as potential parallelism bottlenecks, verify that `MergeTreeThread × N` counts match your expected thread count, and use `graph = 1` to produce DOT output for Graphviz when working with complex multi-join queries.
