# How ClickHouse Pipeline Execution Model Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pipeline, Execution Model, Processor, Internal

Description: Learn how ClickHouse's push-based pipeline model connects processors with queues, enables parallel execution, and flows data as columnar blocks through a query plan.

---

## From Query Plan to Pipeline

ClickHouse compiles each query into a pipeline of processors connected by bounded queues. Unlike the traditional Volcano (pull) model where each operator calls `getNext()` on its child, ClickHouse uses a reactive state-machine model. Each processor declares its status (`NeedData`, `PortFull`, `Ready`, `Finished`, etc.) via a `prepare()` method, and a central executor drives the scheduling loop based on these statuses.

Inspect a pipeline:

```sql
EXPLAIN PIPELINE
SELECT user_id, count()
FROM events
WHERE event_date = today()
GROUP BY user_id;
```

## Processors and Ports

Each processor has one or more input ports and output ports. Data flows as `Chunk` objects (columnar chunks of typically 65,536 rows, controlled by `max_block_size`) through these ports. A `Block` in ClickHouse serves as the schema/header (column names and types) for a port, while `Chunk` carries the actual data payload. Processors include:

- `MergeTreeThread` - reads granules from disk
- `FilterTransform` - applies WHERE/PREWHERE conditions
- `AggregatingTransform` - builds hash tables for GROUP BY
- `MergingAggregatedTransform` - merges partial aggregations
- `LimitsCheckingTransform` - enforces `LIMIT` and quotas
- `IOutputFormat` - serializes chunks to the wire format (e.g., `LazyOutputFormat`)

## Parallel Reading

The `ReadFromMergeTree` step spawns multiple `MergeTreeThread` processors, each reading a separate set of granules in parallel:

```sql
SET max_threads = 8;
```

Each thread has its own reader and processes its assigned granules independently, then pushes blocks into a shared queue consumed by the aggregation stage.

## Thread Pool and Scheduling

ClickHouse uses a `PipelineExecutor` that drives a reactive scheduling loop. The executor calls each processor's `prepare()` method, which returns a status indicating what the processor needs (e.g., `NeedData`, `Ready`, `PortFull`, `Async`, `Finished`). Based on these statuses, the executor schedules `work()` calls on a thread pool. Processors do not block or sleep - the executor efficiently manages the graph of dependencies.

```sql
-- See thread pool usage
SELECT name, value
FROM system.metrics
WHERE name LIKE '%Thread%';
```

## Back-Pressure

Queues between processors are bounded. If a downstream processor is slow (e.g., writing to the network), the upstream processor blocks when the queue is full. This back-pressure mechanism prevents unbounded memory growth in streaming queries.

## Pipeline for Distributed Queries

For distributed tables, the pipeline has an additional `RemoteSource` processor that opens connections to remote shards and reads their results. Results from all shards are merged by a `Resize` processor (for unordered merging of multiple streams into one) before aggregation.

```sql
EXPLAIN PIPELINE
SELECT count() FROM distributed_events;
```

## Debugging Pipeline Execution

The `ProfileEvents` for a query show counters for each event class:

```sql
SELECT
    ProfileEvents['SelectedRows'] AS rows_read,
    ProfileEvents['NetworkReceiveBytes'] AS net_bytes
FROM system.query_log
WHERE query_id = 'your-query-id';
```

## Summary

ClickHouse's pipeline execution model connects processors - each performing a single operation like filtering, aggregating, or sorting - through bounded queues that carry columnar chunks. Parallel processors read granules independently, back-pressure prevents memory overuse, and the reactive `PipelineExecutor` efficiently maps processor work to CPU threads based on declared processor statuses.
