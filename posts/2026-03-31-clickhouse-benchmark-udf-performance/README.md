# How to Benchmark UDF Performance in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UDF, Performance, Benchmark, Profiling

Description: Learn how to benchmark and compare ClickHouse UDF performance against built-in functions using query profiling, system logs, and the clickhouse-benchmark tool.

---

Before deploying a UDF in production, you should benchmark it to understand its performance characteristics relative to built-in alternatives. This post covers how to measure UDF execution time and identify bottlenecks.

## Using query_log to Measure Execution Time

```sql
SET log_queries = 1;

SELECT myUDF(text_column) FROM large_table LIMIT 1000000;

SELECT
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage
FROM system.query_log
WHERE query LIKE '%myUDF%'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 5;
```

## Comparing SQL UDF vs Inline Expression

```sql
-- Benchmark inline expression
SELECT count() FROM (
    SELECT if(clicks = 0, 0.0, toFloat64(conversions) / toFloat64(clicks)) AS ctr
    FROM ad_stats
);

-- Benchmark SQL UDF
CREATE FUNCTION calcCtr AS (c, v) -> if(c = 0, 0.0, toFloat64(v) / toFloat64(c));

SELECT count() FROM (
    SELECT calcCtr(clicks, conversions) AS ctr
    FROM ad_stats
);
```

SQL UDFs have identical performance to inline expressions since they are inlined into the query plan.

## Benchmarking Executable UDFs

Executable UDFs have subprocess communication overhead. Measure the baseline:

```sql
-- Warm up
SELECT myExecUDF(text_col) FROM sample_table LIMIT 10000;

-- Timed run
SELECT count()
FROM (SELECT myExecUDF(text_col) FROM large_table)
SETTINGS max_threads = 4;
```

Check `query_log` for duration comparison.

## Using clickhouse-benchmark

```bash
echo "SELECT myUDF(text_column) FROM large_table LIMIT 100000" | \
  clickhouse-benchmark -i 10 --concurrency 4
```

Output shows:

```text
Queries executed: 10.

localhost:9000, queries: 10, QPS: 12.300, RPS: ..., MiB/s: ..., result RPS: ..., result MiB/s: ...

0.000%      0.780 sec.
10.000%     0.790 sec.
50.000%     0.813 sec.
95.000%     0.950 sec.
99.000%     1.100 sec.
```

## Profiling with perf_events

```sql
SET query_profiler_real_time_period_ns = 1000000;  -- 1ms sampling

SELECT myExecUDF(text_col) FROM large_table LIMIT 100000;

SELECT
    trace_type,
    count() AS samples
FROM system.trace_log
WHERE query_id = (SELECT query_id FROM system.query_log WHERE query LIKE '%myExecUDF%' ORDER BY event_time DESC LIMIT 1)
GROUP BY trace_type;
```

## Throughput Test for Executable UDF

```bash
time echo -e "test1\ntest2\ntest3" | python3 /var/lib/clickhouse/user_scripts/my_func.py
```

Measure rows per second at the script level before testing inside ClickHouse.

## pool_size Tuning for executable_pool

```text
<type>executable_pool</type>
<pool_size>8</pool_size>
```

Test different pool sizes and measure with `clickhouse-benchmark` at your expected concurrency level.

## Summary Comparison

| UDF Type | Overhead | When Faster Than Built-in |
|----------|----------|--------------------------|
| SQL UDF | None (inlined) | Never slower |
| Executable UDF (single) | Process spawn per query | Never for high-frequency |
| Executable pool UDF | IPC serialization | When logic is very complex |

## Summary

Benchmark ClickHouse UDFs by comparing `query_log` durations against inline alternatives. SQL UDFs are free of overhead. Executable UDFs carry IPC serialization cost that you should measure under realistic concurrency using `clickhouse-benchmark`. Use `executable_pool` with a tuned pool size to minimize overhead for persistent-process UDFs.
