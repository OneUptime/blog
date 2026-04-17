# How to Benchmark ClickHouse Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Benchmark, Performance, Testing, clickhouse-benchmark, Query

Description: Use clickhouse-benchmark and custom SQL scripts to measure ClickHouse query throughput, latency, and insert performance accurately.

---

Benchmarking ClickHouse requires testing both query performance and insert throughput. This guide covers the built-in `clickhouse-benchmark` tool and how to design meaningful performance tests for your specific workload.

## Using clickhouse-benchmark

The `clickhouse-benchmark` tool measures query throughput and latency by running queries repeatedly:

```bash
echo "SELECT count() FROM events WHERE event_date >= '2025-01-01'" \
  | clickhouse-benchmark --host=localhost --port=9000 \
    --iterations=1000 --concurrency=10
```

Key flags:
- `--iterations` - total number of query executions
- `--concurrency` - parallel connections
- `--delay` - seconds between intermediate reports (default 1, set 0 to disable)
- `--randomize` - randomize query order from input file

## Running Multiple Queries

Create a file with multiple queries and benchmark all of them:

```bash
cat queries.sql | clickhouse-benchmark --concurrency=4 --iterations=500
```

Example `queries.sql`:

```sql
SELECT count() FROM events WHERE event_type = 'page_view';
SELECT uniq(user_id) FROM events WHERE event_date = today();
SELECT event_type, count() FROM events GROUP BY event_type ORDER BY count() DESC LIMIT 10;
```

## Measuring Cold vs Warm Cache Performance

Drop caches to simulate cold reads:

```bash
# Drop OS page cache
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# Drop ClickHouse mark cache and uncompressed cache
clickhouse-client --query="SYSTEM DROP MARK CACHE"
clickhouse-client --query="SYSTEM DROP UNCOMPRESSED CACHE"
```

Then run your benchmark:

```bash
echo "SELECT count() FROM events" | clickhouse-benchmark --iterations=100
```

## Benchmarking Insert Throughput

Generate test data and measure insert rate:

```bash
clickhouse-client --query="INSERT INTO test_inserts SELECT
    now() - rand() % 86400 AS event_time,
    toString(rand() % 10) AS event_type,
    rand() % 1000000 AS user_id
FROM numbers(10000000)"
```

Check insert throughput via system logs:

```sql
SELECT
    formatReadableSize(sum(bytes_on_disk)) AS size,
    sum(rows) AS rows,
    count() AS parts
FROM system.parts
WHERE table = 'test_inserts' AND active = 1;
```

## Using the ClickHouse Performance Test Framework

Run one of the official performance tests defined as XML files under `tests/performance/`:

```bash
git clone https://github.com/ClickHouse/ClickHouse.git
cd ClickHouse
pip3 install clickhouse_driver scipy
./tests/performance/scripts/perf.py --runs 3 tests/performance/insert_parallel.xml
```

## Comparing Before and After

Use `system.query_log` to compare query performance across configurations:

```sql
SELECT
    query,
    avg(query_duration_ms) AS avg_ms,
    min(query_duration_ms) AS min_ms,
    max(query_duration_ms) AS max_ms,
    count() AS runs
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%events%'
  AND event_time > now() - INTERVAL 1 HOUR
GROUP BY query
ORDER BY avg_ms DESC;
```

## Summary

ClickHouse benchmarking starts with `clickhouse-benchmark` for query throughput testing, supplemented by manual insert tests and `system.query_log` analysis. Always test with cold and warm caches, use realistic data distributions, and measure at your expected concurrency level to get results that reflect production performance.
