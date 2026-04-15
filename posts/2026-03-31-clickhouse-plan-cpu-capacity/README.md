# How to Plan ClickHouse CPU Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CPU, Capacity Planning, Performance, Infrastructure

Description: Plan ClickHouse CPU capacity by profiling query CPU consumption, estimating concurrency requirements, and choosing the right core count per node.

---

ClickHouse is CPU-intensive during query execution. Its vectorized engine uses SIMD instructions and parallelizes across all available cores. Undersizing CPU leads to slow queries; oversizing wastes money.

## Measure Current CPU Usage per Query

```sql
SELECT
    query_id,
    query_duration_ms,
    ProfileEvents.Values[indexOf(ProfileEvents.Names, 'UserTimeMicroseconds')] AS user_cpu_us,
    ProfileEvents.Values[indexOf(ProfileEvents.Names, 'SystemTimeMicroseconds')] AS sys_cpu_us,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_duration_ms > 500
ORDER BY user_cpu_us DESC
LIMIT 20;
```

## CPU Scaling Model

ClickHouse query time scales roughly as: `T = data_scanned / (cores * scan_rate_per_core)`

Typical scan rate per core: 200-500 MB/s (compressed). Measure yours:

```bash
# Baseline: single-threaded scan on your hardware
clickhouse-benchmark --concurrency 1 --iterations 10 \
  --query "SELECT count() FROM events WHERE ts >= today() - 1"
```

## Estimating Core Count

```text
Peak concurrent queries: 8
Average compressed data scanned per query: 5 GB
Required scan throughput: 8 * 5 GB = 40 GB/sec
Scan rate per core: 0.3 GB/sec
Cores needed: 40 / 0.3 = ~134 cores
```

Distribute across nodes: 4 nodes * 32 cores = 128 cores (close enough; adjust with benchmarks).

## Ingestion CPU

Insert path also consumes CPU for compression and part creation. Budget roughly 2-4 cores per 100,000 rows/sec ingestion rate.

## Setting CPU Limits

```xml
<max_threads>16</max_threads>                 <!-- per-query thread limit (profile setting) -->
<background_move_pool_size>2</background_move_pool_size>
<merge_tree>
    <background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
</merge_tree>
```

## CPU Profiling a Slow Query

```sql
SET query_profiler_cpu_time_period_ns = 100000000;  -- sample every 100ms
SELECT ... FROM large_table ...;

SELECT *
FROM system.trace_log
WHERE query_id = 'your-query-id'
ORDER BY event_time;
```

## Monitoring

Export CPU utilization per node to [OneUptime](https://oneuptime.com). Alert when sustained CPU exceeds 80% - this is a signal to add nodes or optimize the heaviest queries.

## Summary

Plan ClickHouse CPU by measuring actual scan throughput per core, estimating peak concurrent data scanned, and dividing by node count. Add ingestion CPU on top and leave 20% headroom for merges and background tasks.
