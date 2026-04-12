# How to Load Test MySQL with sysbench

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Sysbench, Load Testing, Performance Benchmarking, Database Administration

Description: Learn how to install sysbench and run OLTP read/write benchmarks on MySQL to measure throughput, latency, and identify performance bottlenecks.

---

## What Is sysbench

sysbench is an open-source, multi-threaded benchmark tool designed for testing database servers. It provides built-in test scripts for OLTP workloads including read-only, write-only, and read/write mixes. It reports:
- Transactions per second (TPS)
- Queries per second (QPS)
- Latency percentiles (p95, p99)
- Error rates

## Installing sysbench

```bash
# Ubuntu/Debian
sudo apt install sysbench

# CentOS/RHEL
sudo yum install sysbench

# macOS with Homebrew
brew install sysbench

# Verify installation
sysbench --version
```

## Setting Up the Test Database

Create a dedicated database and user for benchmarking:

```sql
CREATE DATABASE sbtest;
CREATE USER 'sbtest'@'localhost' IDENTIFIED BY 'SbPass!1';
GRANT ALL PRIVILEGES ON sbtest.* TO 'sbtest'@'localhost';
FLUSH PRIVILEGES;
```

## Preparing the Test Data

sysbench creates tables prefixed with `sbtest`. Prepare 4 tables with 1 million rows each:

```bash
sysbench oltp_read_write \
  --mysql-host=localhost \
  --mysql-port=3306 \
  --mysql-db=sbtest \
  --mysql-user=sbtest \
  --mysql-password=SbPass!1 \
  --tables=4 \
  --table-size=1000000 \
  prepare
```

This creates `sbtest1`, `sbtest2`, `sbtest3`, `sbtest4` with 1M rows each and appropriate indexes.

## Running the OLTP Read/Write Benchmark

```bash
sysbench oltp_read_write \
  --mysql-host=localhost \
  --mysql-port=3306 \
  --mysql-db=sbtest \
  --mysql-user=sbtest \
  --mysql-password=SbPass!1 \
  --tables=4 \
  --table-size=1000000 \
  --threads=16 \
  --time=60 \
  --report-interval=10 \
  run
```

Parameters:
- `--threads=16` - 16 concurrent connections.
- `--time=60` - run for 60 seconds.
- `--report-interval=10` - print stats every 10 seconds.

## Understanding the Output

```text
SQL statistics:
    queries performed:
        read:                            112742
        write:                           32212
        other:                           16106
        total:                           161060
    transactions:                        8053   (134.17 per sec.)
    queries:                             161060 (2683.42 per sec.)
    ignored errors:                      0      (0.00 per sec.)
    reconnects:                          0      (0.00 per sec.)

Latency (ms):
         min:                                   32.08
         avg:                                  119.23
         max:                                  652.45
         95th percentile:                      193.49
         sum:                               960197.76
```

Key metrics:
- **TPS** (transactions/sec) - 134.17 TPS.
- **QPS** (queries/sec) - 2683.42 QPS.
- **p95 latency** - 95% of transactions completed within 193ms.

## Running Specific Workload Types

### Read-Only Benchmark

```bash
sysbench oltp_read_only \
  --mysql-host=localhost \
  --mysql-user=sbtest \
  --mysql-password=SbPass!1 \
  --mysql-db=sbtest \
  --threads=32 \
  --time=60 \
  run
```

### Write-Only Benchmark

```bash
sysbench oltp_write_only \
  --mysql-host=localhost \
  --mysql-user=sbtest \
  --mysql-password=SbPass!1 \
  --mysql-db=sbtest \
  --threads=16 \
  --time=60 \
  run
```

### Insert-Only Benchmark

```bash
sysbench oltp_insert \
  --mysql-host=localhost \
  --mysql-user=sbtest \
  --mysql-password=SbPass!1 \
  --mysql-db=sbtest \
  --threads=8 \
  --time=30 \
  run
```

## Testing with Increasing Thread Counts

To find the throughput saturation point, run with different thread counts:

```bash
for THREADS in 1 2 4 8 16 32 64; do
  echo "=== $THREADS threads ==="
  sysbench oltp_read_write \
    --mysql-host=localhost \
    --mysql-user=sbtest \
    --mysql-password=SbPass!1 \
    --mysql-db=sbtest \
    --threads=$THREADS \
    --time=30 \
    run | grep "transactions:"
done
```

This shows how TPS scales with concurrency and where it peaks or degrades.

## Cleaning Up After Benchmarks

```bash
sysbench oltp_read_write \
  --mysql-host=localhost \
  --mysql-user=sbtest \
  --mysql-password=SbPass!1 \
  --mysql-db=sbtest \
  --tables=4 \
  cleanup
```

## Comparing Before and After Configuration Changes

A common use of sysbench is to compare MySQL performance before and after a configuration change:

```bash
# Before: note TPS and p95 latency
sysbench oltp_read_write ... run > before.txt

# Change configuration (e.g., increase innodb_buffer_pool_size)
# Then:
sysbench oltp_read_write ... run > after.txt

diff before.txt after.txt
```

## Summary

sysbench is the standard tool for MySQL load testing and benchmarking. Use `prepare` to create test data, then `run` with varying thread counts to measure TPS, QPS, and latency percentiles. The `oltp_read_write`, `oltp_read_only`, and `oltp_write_only` scripts cover the most common workload patterns. Use sysbench before and after configuration changes to quantify the performance impact of tuning changes.
