# How to Use clickhouse-benchmark for Load Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Benchmark, Load Testing, Performance, CLI, Testing

Description: Use clickhouse-benchmark to run concurrent load tests against ClickHouse, measure query throughput, latency percentiles, and identify performance bottlenecks.

---

## Introduction

`clickhouse-benchmark` is a command-line tool bundled with ClickHouse that sends queries to a ClickHouse server at high concurrency and reports throughput (QPS), latency percentiles, and timing statistics. It is ideal for benchmarking hardware, validating schema changes, or comparing configuration tuning.

## Installation

`clickhouse-benchmark` ships with the `clickhouse-client` package:

```bash
which clickhouse-benchmark
# /usr/bin/clickhouse-benchmark
```

## Basic Usage

```bash
# Run a single query 100 times with 4 concurrent connections
echo "SELECT count() FROM events WHERE event_time >= today() - INTERVAL 7 DAY" \
    | clickhouse-benchmark \
        --host localhost \
        --port 9000 \
        --user default \
        --password '' \
        --concurrency 4 \
        --iterations 100
```

## Running from a Query File

Prepare a file with queries (one per line):

```bash
cat > /tmp/bench_queries.sql << 'EOF'
SELECT count() FROM events WHERE event_time >= today() - INTERVAL 1 DAY
SELECT event_type, count() FROM events GROUP BY event_type ORDER BY count() DESC LIMIT 10
SELECT user_id, sum(amount) FROM orders GROUP BY user_id ORDER BY sum(amount) DESC LIMIT 100
EOF
```

Run the benchmark (queries are read from stdin):

```bash
clickhouse-benchmark \
    --host localhost \
    --port 9000 \
    --user default \
    --concurrency 8 \
    --iterations 200 \
    < /tmp/bench_queries.sql
```

## Key Flags

| Flag | Default | Description |
|---|---|---|
| `--concurrency` | 1 | Number of simultaneous query threads |
| `--iterations` | 0 (unlimited) | Total queries to send (0 = run until Ctrl+C) |
| `--query` / `-q` | — | Inline query string (alternative to reading from stdin) |
| `--delay` | 1 | Delay between statistics outputs (seconds) |
| `--timelimit` | 0 | Stop after N seconds |
| `--randomize` | (flag) | Randomly pick queries from the input instead of cycling in order |
| `--cumulative` | (flag) | Print cumulative data instead of data per interval |
| `--continue_on_errors` | (flag) | Do not stop on query errors (alias of `--ignore-error`) |

## Sample Output

```yaml
Loaded 3 queries.

Queries executed: 200.

localhost:9000, queries: 200, QPS: 124.5, RPS: 2.56e+07, MiB/s: 156.3, result RPS: 2.56e+07, result MiB/s: 156.3
 0.000%      0.004 sec.
 10.000%     0.006 sec.
 20.000%     0.007 sec.
 50.000%     0.008 sec.
 75.000%     0.009 sec.
 90.000%     0.010 sec.
 95.000%     0.012 sec.
 99.000%     0.015 sec.
 99.900%     0.020 sec.
 99.990%     0.025 sec.
```

Metrics:
- **QPS**: Queries per second
- **RPS**: Rows per second read from storage
- **MiB/s**: Data read from storage in MiB/s
- Percentile latencies (p50, p90, p95, p99)

## Comparing Two Configurations

```bash
# Baseline: no query cache
echo "SELECT count() FROM events WHERE event_time >= today() - INTERVAL 7 DAY" \
    | clickhouse-benchmark \
        --concurrency 4 \
        --iterations 100 \
        --query="SELECT count() FROM events WHERE event_time >= today() - INTERVAL 7 DAY SETTINGS use_query_cache=0" \
        2>&1 | tee /tmp/no_cache.txt

# With query cache
echo "SELECT count() FROM events WHERE event_time >= today() - INTERVAL 7 DAY" \
    | clickhouse-benchmark \
        --concurrency 4 \
        --iterations 100 \
        --query="SELECT count() FROM events WHERE event_time >= today() - INTERVAL 7 DAY SETTINGS use_query_cache=1,query_cache_ttl=60" \
        2>&1 | tee /tmp/with_cache.txt
```

## Capturing Output for Automated Processing

`clickhouse-benchmark` writes human-readable statistics to stderr. Redirect it to a file so you can diff or parse it later:

```bash
clickhouse-benchmark \
    --concurrency 8 \
    --iterations 500 \
    < /tmp/bench_queries.sql \
    2> /tmp/benchmark_results.txt
```

## Stress Testing with Time Limit

```bash
# Run for 5 minutes at high concurrency
clickhouse-benchmark \
    --concurrency 32 \
    --timelimit 300 \
    --continue_on_errors \
    < /tmp/bench_queries.sql
```

## Benchmarking Insert Performance

```bash
# Generate INSERT queries
python3 -c "
for i in range(1000):
    print(f\"INSERT INTO events VALUES ({i}, 'click', now())\")
" > /tmp/inserts.sql

clickhouse-benchmark \
    --concurrency 4 \
    < /tmp/inserts.sql
```

## Monitoring During Benchmark

```sql
-- In another session, watch active queries
SELECT
    query_id,
    elapsed,
    read_rows,
    read_bytes,
    query
FROM system.processes
ORDER BY elapsed DESC;
```

```sql
-- Check query throughput from query_log
SELECT
    toStartOfMinute(event_time) AS minute,
    count()                     AS queries_per_minute
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 10 MINUTE
GROUP BY minute
ORDER BY minute;
```

## Summary

`clickhouse-benchmark` tests ClickHouse query performance by running queries at configured concurrency and reporting QPS, row read rates, and latency percentiles. Use it to validate hardware sizing, compare configuration changes (cache, threads, block size), stress test before production rollouts, and identify regression between ClickHouse version upgrades. Run queries from a file to simulate realistic mixed workloads.
