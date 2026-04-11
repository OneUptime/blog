# How to Use mysqlslap for Benchmarking MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Benchmark, Performance, Command Line

Description: Learn how to use mysqlslap to run load tests against MySQL, simulate concurrent clients, and measure query throughput and latency for performance tuning.

---

## What Is mysqlslap?

`mysqlslap` is a MySQL command-line load-testing tool that simulates multiple concurrent clients connecting to and querying a MySQL server. It measures how long various query workloads take under different concurrency levels, making it useful for capacity planning, configuration tuning, and regression testing.

## Basic Syntax

```bash
mysqlslap [options]
```

## Running a Simple Benchmark

```bash
# Auto-generate a test workload with 50 concurrent clients
mysqlslap -u root -p \
  --auto-generate-sql \
  --concurrency=50 \
  --iterations=5
```

Sample output:

```text
Benchmark
        Average number of seconds to run all queries: 0.412 seconds
        Minimum number of seconds to run all queries: 0.391 seconds
        Maximum number of seconds to run all queries: 0.438 seconds
        Number of clients running queries: 50
        Average number of queries per client: 0
```

## Auto-Generated Workload Options

```bash
# Generate a heavier read workload
mysqlslap -u root -p \
  --auto-generate-sql \
  --auto-generate-sql-load-type=read \
  --auto-generate-sql-write-number=100 \
  --number-of-queries=500 \
  --concurrency=100 \
  --iterations=3
```

Load types: `mixed`, `read`, `write`, `update`, `key`

## Running Custom Queries

```bash
# Benchmark a specific query
mysqlslap -u root -p \
  --create-schema=mydb \
  --query="SELECT id, name FROM customers WHERE status='active' LIMIT 100;" \
  --concurrency=20 \
  --iterations=10
```

## Using a Query File

```bash
# Create a file with multiple queries separated by semicolons
cat > /tmp/benchmark_queries.sql << 'EOF'
SELECT COUNT(*) FROM orders WHERE status = 'pending';
SELECT id, total FROM orders ORDER BY created_at DESC LIMIT 50;
SELECT customer_id, SUM(total) FROM orders GROUP BY customer_id;
EOF

# Run the benchmark
mysqlslap -u root -p \
  --create-schema=mydb \
  --query=/tmp/benchmark_queries.sql \
  --delimiter=';' \
  --concurrency=25 \
  --iterations=5
```

## Testing Multiple Concurrency Levels

```bash
# Run the same workload at different concurrency levels
mysqlslap -u root -p \
  --auto-generate-sql \
  --concurrency=1,10,50,100,200 \
  --iterations=3
```

Sample output (repeated for each concurrency level):

```text
Benchmark
        Average number of seconds to run all queries: 0.025 seconds
        Minimum number of seconds to run all queries: 0.024 seconds
        Maximum number of seconds to run all queries: 0.026 seconds
        Number of clients running queries: 1
        Average number of queries per client: 0

Benchmark
        Average number of seconds to run all queries: 0.078 seconds
        Minimum number of seconds to run all queries: 0.070 seconds
        Maximum number of seconds to run all queries: 0.085 seconds
        Number of clients running queries: 10
        Average number of queries per client: 0

Benchmark
        Average number of seconds to run all queries: 0.312 seconds
        Minimum number of seconds to run all queries: 0.298 seconds
        Maximum number of seconds to run all queries: 0.331 seconds
        Number of clients running queries: 50
        Average number of queries per client: 0

Benchmark
        Average number of seconds to run all queries: 0.689 seconds
        Minimum number of seconds to run all queries: 0.654 seconds
        Maximum number of seconds to run all queries: 0.721 seconds
        Number of clients running queries: 100
        Average number of queries per client: 0
```

## Schema Setup and Teardown

```bash
# Create a fresh schema for the benchmark
mysqlslap -u root -p \
  --create-schema=bench_test \
  --create="CREATE TABLE t1 (id INT AUTO_INCREMENT PRIMARY KEY, val VARCHAR(64));" \
  --query="INSERT INTO t1 (val) VALUES (UUID());" \
  --concurrency=50 \
  --iterations=5 \
  --no-drop  # Don't drop the schema after the test
```

## Using CSV Output for Analysis

```bash
# Write results to a CSV file
mysqlslap -u root -p \
  --auto-generate-sql \
  --concurrency=1,10,50,100 \
  --iterations=5 \
  --csv=/tmp/benchmark_results.csv
```

## Comparing Before and After a Configuration Change

```bash
# Benchmark before changing innodb_buffer_pool_size
mysqlslap -u root -p --auto-generate-sql --concurrency=50 --iterations=10 \
  --csv=/tmp/before_tuning.csv

# Change configuration, restart MySQL, then benchmark again
mysqlslap -u root -p --auto-generate-sql --concurrency=50 --iterations=10 \
  --csv=/tmp/after_tuning.csv
```

## Summary

`mysqlslap` is a practical, built-in benchmarking tool for measuring MySQL performance under simulated load. Use `--auto-generate-sql` for quick baseline tests, `--query` for realistic workloads, and `--concurrency` with multiple values to understand how your server scales. Capture results with `--csv` to track performance changes across configuration tuning iterations.
