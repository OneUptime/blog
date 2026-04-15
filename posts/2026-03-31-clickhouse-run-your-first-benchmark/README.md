# How to Run Your First ClickHouse Benchmark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Benchmark, Performance, Testing, clickhouse-benchmark

Description: Learn how to run your first ClickHouse benchmark using the built-in clickhouse-benchmark tool and the ClickBench standard dataset for meaningful results.

---

Benchmarking ClickHouse helps you understand query performance before going to production, compare configuration changes, and evaluate hardware choices. ClickHouse ships with a built-in `clickhouse-benchmark` tool that makes it easy to run repeatable tests.

## Using clickhouse-benchmark

The `clickhouse-benchmark` tool reads queries from stdin and runs them concurrently, reporting latency percentiles and throughput.

Create a file of queries to benchmark:

```bash
cat > queries.sql << 'EOF'
SELECT count() FROM hits;
SELECT uniq(UserID) FROM hits;
SELECT RegionID, count() FROM hits GROUP BY RegionID ORDER BY count() DESC LIMIT 10;
EOF
```

Run the benchmark with 4 concurrent connections and 100 iterations:

```bash
clickhouse-benchmark --concurrency=4 --iterations=100 < queries.sql
```

Sample output:

```text
QPS: 142.5
RPS: 2.1 billion rows/sec
MiB/s: 4320
Latency percentiles (ms): p50=28.1, p95=35.2, p99=42.8
```

## Loading the ClickBench Dataset

ClickBench is the standard ClickHouse benchmark with 100 million rows of web analytics data and 43 queries:

```bash
wget https://datasets.clickhouse.com/hits_compatible/hits.csv.gz
clickhouse-client --query "CREATE TABLE hits (
    WatchID UInt64, JavaEnable UInt8, Title String, ...
) ENGINE = MergeTree() ORDER BY (CounterID, EventDate, UserID)"

zcat hits.csv.gz | clickhouse-client --query "INSERT INTO hits FORMAT CSV"
```

Run the official ClickBench queries:

```bash
wget https://raw.githubusercontent.com/ClickHouse/ClickBench/main/clickhouse/queries.sql
clickhouse-benchmark --iterations=3 < queries.sql
```

## Benchmarking Configuration Changes

Use the `--query` flag to test specific queries before and after a config change:

```bash
# Before change
clickhouse-benchmark --iterations=50 \
  --query="SELECT count() FROM hits WHERE URL LIKE '%google%'"

# Modify setting, then re-run
clickhouse-benchmark --iterations=50 \
  --query="SELECT count() FROM hits WHERE URL LIKE '%google%'" \
  --max_threads=8
```

## Measuring Cold vs. Warm Cache

To test cold cache performance, drop the page cache between runs:

```bash
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
clickhouse-benchmark --iterations=1 < queries.sql
```

Run without dropping the cache to measure warm performance.

## Key Metrics to Track

- QPS (queries per second) - throughput
- p50/p95/p99 latency - tail latency matters for dashboards
- Rows/sec and MB/sec - data scanning efficiency
- Memory usage during the run via `system.query_log`

```sql
SELECT
    query,
    memory_usage,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 20;
```

## Summary

The `clickhouse-benchmark` tool provides repeatable latency and throughput measurements for any set of SQL queries. Using the standard ClickBench dataset gives you a reference point to compare your ClickHouse deployment against community baselines and track the impact of configuration or schema changes over time.
