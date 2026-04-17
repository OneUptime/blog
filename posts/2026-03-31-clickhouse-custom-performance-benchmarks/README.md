# How to Create Custom Performance Benchmarks for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Benchmark, Performance Testing, Custom, SQL

Description: Learn how to create custom performance benchmarks for ClickHouse to test your specific schema, queries, and data volumes against realistic workloads.

---

## Why Custom Benchmarks?

Standard benchmarks like ClickBench use generic web analytics data. Your production workload has different table schemas, cardinalities, and query patterns. A custom benchmark using representative data gives you accurate performance expectations.

## Planning Your Benchmark

Before writing queries, define what you are measuring:

```text
1. Which queries matter most (80/20 rule)
2. Realistic data volumes (row counts, column cardinalities)
3. Concurrency levels expected in production
4. Metrics to capture (p50, p95, p99 latency, QPS)
```

## Generating Realistic Test Data

Use ClickHouse's `generateRandom` and `numbers` functions to create test data without real data:

```sql
INSERT INTO orders
SELECT
    number AS order_id,
    rand() % 100000 AS customer_id,
    ['Electronics', 'Clothing', 'Food', 'Books'][rand() % 4 + 1] AS category,
    round(rand() % 1000 + 10, 2) AS amount,
    now() - rand() % (86400 * 365) AS order_time
FROM numbers(10000000);
```

## Building a Query Suite File

Create a `benchmark_queries.sql` file with representative queries:

```sql
SELECT count() FROM orders WHERE order_time >= now() - INTERVAL 7 DAY;
SELECT category, sum(amount) FROM orders GROUP BY category ORDER BY sum(amount) DESC;
SELECT customer_id, count() AS orders FROM orders GROUP BY customer_id ORDER BY orders DESC LIMIT 100;
SELECT toStartOfHour(order_time), count() FROM orders WHERE order_time >= now() - INTERVAL 24 HOUR GROUP BY 1;
SELECT quantile(0.95)(amount) FROM orders WHERE category = 'Electronics';
```

## Running the Benchmark

```bash
clickhouse-benchmark \
    --concurrency 4 \
    --iterations 200 \
    --host localhost \
    --database mydb \
    < benchmark_queries.sql 2>&1 | tee results_baseline.txt
```

## Capturing System Metrics During Benchmark

```bash
#!/bin/bash
# Start benchmark in background
clickhouse-benchmark --iterations 500 < queries.sql &
BENCH_PID=$!

# Sample system metrics every second
while kill -0 $BENCH_PID 2>/dev/null; do
    clickhouse-client --query "
    SELECT now(), metric, value
    FROM system.metrics
    WHERE metric IN ('Query', 'MemoryTracking', 'BackgroundMergesAndMutationsPoolTask')
    " --format CSV >> metrics.csv
    sleep 1
done
```

## Query-Level Profiling

Add timing around individual queries:

```bash
for query in \
    "SELECT count() FROM orders" \
    "SELECT category, sum(amount) FROM orders GROUP BY category" \
    "SELECT uniq(customer_id) FROM orders WHERE order_time >= today() - 30"
do
    echo -n "Query: ${query:0:50}... "
    clickhouse-client \
        --query "$query" \
        --time \
        --format Null 2>&1 | tail -1
done
```

## Comparing Before and After a Change

```bash
# Baseline
clickhouse-benchmark --iterations 100 < queries.sql > before.txt

# Apply change (e.g., add an index, modify settings)
clickhouse-client --query "ALTER TABLE orders ADD INDEX idx_category category TYPE bloom_filter GRANULARITY 1"
clickhouse-client --query "ALTER TABLE orders MATERIALIZE INDEX idx_category"

# After
clickhouse-benchmark --iterations 100 < queries.sql > after.txt

# Compare
paste before.txt after.txt | column -t
```

## Summary

Custom ClickHouse benchmarks use `generateRandom` and `numbers()` for realistic synthetic data, a query suite file representing production traffic, and `clickhouse-benchmark` with concurrency levels matching production. Capture both before and after metrics for any change to quantify the impact.
