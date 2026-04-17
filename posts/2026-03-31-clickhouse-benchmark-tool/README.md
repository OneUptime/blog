# How to Use clickhouse-benchmark Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-benchmark, Performance, Load Testing, Concurrency

Description: Learn how to use the clickhouse-benchmark CLI tool to measure query latency, throughput, and concurrency performance for ClickHouse workloads.

---

## What is clickhouse-benchmark?

`clickhouse-benchmark` is a built-in ClickHouse tool that sends queries repeatedly with configurable concurrency, measures latency distributions, and reports percentiles. It is the primary tool for stress-testing and profiling ClickHouse query performance.

## Basic Usage

Run a query 100 times and report statistics:

```bash
clickhouse-benchmark \
    --iterations 100 \
    --query "SELECT count() FROM hits WHERE CounterID = 12345"
```

## Concurrency Testing

Simulate multiple simultaneous clients:

```bash
clickhouse-benchmark \
    --concurrency 10 \
    --iterations 1000 \
    --query "SELECT uniq(UserID) FROM hits WHERE EventDate = today()"
```

## Reading Queries from a File

Run multiple queries from a file in rotation:

```bash
clickhouse-benchmark \
    --concurrency 4 \
    --iterations 500 \
    < queries.sql
```

`queries.sql` contains one query per line:

```sql
SELECT count() FROM hits WHERE URL LIKE '%google%';
SELECT avg(Duration) FROM hits WHERE CounterID = 123;
SELECT uniq(UserID) FROM hits WHERE EventDate >= today() - 7;
```

## Output Format

```text
Queries executed: 100.

localhost:9000, queries 100, QPS: 45.230, RPS: 4523000.000, MiB/s: 92.100, result RPS: 45230.000, result MiB/s: 0.920.

0.000%          0.005 sec.
10.000%         0.005 sec.
20.000%         0.005 sec.
30.000%         0.005 sec.
40.000%         0.005 sec.
50.000%         0.006 sec.
60.000%         0.006 sec.
70.000%         0.006 sec.
80.000%         0.006 sec.
90.000%         0.007 sec.
95.000%         0.008 sec.
99.000%         0.012 sec.
99.900%         0.018 sec.
99.990%         0.023 sec.
```

## Testing with Different Connection Settings

```bash
clickhouse-benchmark \
    --host clickhouse-prod.example.com \
    --port 9000 \
    --user analytics \
    --password "$CH_PASSWORD" \
    --database prod_db \
    --concurrency 8 \
    --iterations 200 \
    --query "SELECT region, sum(revenue) FROM orders GROUP BY region"
```

## Comparing Two Server Versions

```bash
# Benchmark against server A
clickhouse-benchmark \
    --host server-a \
    --iterations 100 \
    --query "SELECT count() FROM large_table" > results_a.txt

# Benchmark against server B
clickhouse-benchmark \
    --host server-b \
    --iterations 100 \
    --query "SELECT count() FROM large_table" > results_b.txt

diff results_a.txt results_b.txt
```

## Benchmarking with Different Settings

Test the effect of max_threads:

```bash
clickhouse-benchmark \
    --iterations 50 \
    --query "SELECT count(), sum(amount) FROM orders" \
    --max_threads=1

clickhouse-benchmark \
    --iterations 50 \
    --query "SELECT count(), sum(amount) FROM orders" \
    --max_threads=8
```

## Running a Duration-Based Test

Instead of iterations, run for a fixed time:

```bash
clickhouse-benchmark \
    --concurrency 4 \
    --timelimit 60 \
    --query "SELECT toDate(event_time), count() FROM events GROUP BY 1"
```

## Summary

`clickhouse-benchmark` measures query performance with configurable concurrency, iteration counts, and duration. It reports p50/p95/p99 latency percentiles and QPS. Use it to compare server versions, test the effect of query settings, and validate that changes don't introduce regressions.
