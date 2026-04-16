# How to Implement Query Queuing in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Queue, Concurrency, max_concurrent_queries, Resource Management

Description: Configure query queuing in ClickHouse to prevent resource exhaustion by limiting concurrent queries and queuing excess requests until capacity is available.

---

ClickHouse can run many queries simultaneously, but too many concurrent heavy queries exhaust CPU and memory. Query queuing holds incoming requests in a waiting state until a running query completes, smoothing out bursts without rejecting requests.

## max_concurrent_queries

The global limit on simultaneously executing queries:

```xml
<!-- config.xml -->
<max_concurrent_queries>100</max_concurrent_queries>
```

Or limit per-user via `max_concurrent_queries_for_user` in a profile:

```xml
<profiles>
  <analytics_team>
    <max_concurrent_queries_for_user>10</max_concurrent_queries_for_user>
  </analytics_team>
</profiles>
```

When this limit is reached, new queries are either queued or rejected depending on `max_waiting_queries`.

## max_waiting_queries

Controls how many queries may wait in the queue before ClickHouse starts rejecting them:

```xml
<max_waiting_queries>20</max_waiting_queries>
```

With this set, ClickHouse accepts up to `max_concurrent_queries + max_waiting_queries` total query submissions. Queries beyond that threshold receive an error.

## Waiting Timeout

`queue_max_wait_ms` controls how long a client waits for a free slot when `max_concurrent_queries` is exceeded before the query is rejected (default 5000 ms):

```sql
SET queue_max_wait_ms = 30000; -- wait up to 30 seconds for a slot
```

## Monitoring the Queue

```sql
SELECT
    query,
    elapsed,
    memory_usage,
    read_rows
FROM system.processes
ORDER BY elapsed DESC;
```

`system.processes` shows currently executing queries. To observe queueing pressure, track the `Query` metric in `system.metrics` (executing count) alongside `system.events` for rejected or preempted queries.

## Queue Depth Metric

```sql
SELECT
    metric,
    value
FROM system.metrics
WHERE metric IN ('Query', 'DelayedInserts', 'QueryThread');
```

## Workload-Based Queuing with Query Complexity

For finer control, reject queries that exceed a complexity budget rather than queuing them:

```sql
SET max_rows_to_read          = 1000000000;
SET max_bytes_to_read         = 10737418240; -- 10 GB
SET timeout_overflow_mode     = 'throw';
```

## Priority Queuing

ClickHouse does not have native priority queues in the traditional sense, but you can approximate priority by assigning different `max_threads` limits to different user profiles:

```xml
<profiles>
  <high_priority>
    <max_threads>8</max_threads>
  </high_priority>
  <low_priority>
    <max_threads>2</max_threads>
  </low_priority>
</profiles>
```

High-priority queries consume more threads per query and complete faster, freeing slots for the next query.

## Summary

ClickHouse query queuing is configured through `max_concurrent_queries` and `max_waiting_queries` in the server config. Monitor queue depth via `system.processes` and `system.metrics`. For priority management, use per-profile `max_threads` limits to give time-sensitive queries more CPU while background analytics run with limited parallelism.
