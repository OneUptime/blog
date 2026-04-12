# How to Benchmark MySQL Performance with sysbench

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Benchmark, Performance, Sysbench, Testing

Description: Learn how to benchmark MySQL performance using sysbench to measure throughput, latency, and transaction rates under simulated workloads.

---

## Introduction

Benchmarking your MySQL server helps you understand its performance baseline before and after configuration changes, hardware upgrades, or schema optimizations. sysbench is a popular open-source benchmarking tool that simulates OLTP workloads and reports key metrics like transactions per second and latency percentiles.

## Installing sysbench

On Ubuntu/Debian:

```bash
curl -s https://packagecloud.io/install/repositories/akopytov/sysbench/script.deb.sh | sudo bash
sudo apt install sysbench
```

On CentOS/RHEL:

```bash
curl -s https://packagecloud.io/install/repositories/akopytov/sysbench/script.rpm.sh | sudo bash
sudo yum install sysbench
```

## Preparing the Test Database

Create a dedicated database and user for benchmarking:

```sql
CREATE DATABASE sbtest;
CREATE USER 'sbtest'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON sbtest.* TO 'sbtest'@'localhost';
FLUSH PRIVILEGES;
```

## Preparing the Benchmark Data

The `prepare` step creates test tables and fills them with sample data:

```bash
sysbench oltp_read_write \
  --db-driver=mysql \
  --mysql-db=sbtest \
  --mysql-user=sbtest \
  --mysql-password=password \
  --tables=10 \
  --table-size=100000 \
  prepare
```

## Running the Benchmark

Run a mixed read/write OLTP benchmark for 60 seconds with 16 concurrent threads:

```bash
sysbench oltp_read_write \
  --db-driver=mysql \
  --mysql-db=sbtest \
  --mysql-user=sbtest \
  --mysql-password=password \
  --tables=10 \
  --table-size=100000 \
  --threads=16 \
  --time=60 \
  --report-interval=10 \
  run
```

Sample output excerpt:

```text
SQL statistics:
    queries performed:
        read:    196280
        write:   56080
        other:   28040
        total:   280400
transactions:     14020  (233.67 per sec.)
queries:          280400 (4673.40 per sec.)
Latency (ms):
         min:     24.83
         avg:     68.47
         max:    312.45
         95th percentile: 112.67
```

## Running Read-Only and Write-Only Tests

For focused workloads, use the read-only or write-only test scripts:

```bash
# Read-only benchmark
sysbench oltp_read_only \
  --db-driver=mysql \
  --mysql-db=sbtest \
  --mysql-user=sbtest \
  --mysql-password=password \
  --tables=10 \
  --table-size=100000 \
  --threads=8 \
  --time=60 \
  run

# Write-only benchmark
sysbench oltp_write_only \
  --db-driver=mysql \
  --mysql-db=sbtest \
  --mysql-user=sbtest \
  --mysql-password=password \
  --tables=10 \
  --table-size=100000 \
  --threads=8 \
  --time=60 \
  run
```

## Cleaning Up

After benchmarking, remove the test data:

```bash
sysbench oltp_read_write \
  --db-driver=mysql \
  --mysql-db=sbtest \
  --mysql-user=sbtest \
  --mysql-password=password \
  --tables=10 \
  cleanup
```

## Interpreting Results

Focus on these key metrics:
- **Transactions per second (TPS)** - overall throughput of the server
- **95th percentile latency** - worst-case response time for most requests
- **Queries per second (QPS)** - raw query throughput

A healthy OLTP MySQL instance on moderate hardware typically achieves 200-1000 TPS depending on configuration, storage type, and InnoDB buffer pool settings.

## Summary

sysbench is a reliable tool for measuring MySQL OLTP performance. By running prepare, run, and cleanup phases against a dedicated test database, you can compare baseline performance across configuration changes and validate that tuning efforts produce measurable improvements. Always benchmark with thread counts that match your production concurrency levels for accurate results.
