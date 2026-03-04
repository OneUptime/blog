# How to Use pgbench for PostgreSQL Load Testing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, pgbench, PostgreSQL, Load Testing, Database, Benchmarking

Description: Learn how to use pgbench on RHEL to load test PostgreSQL databases, measuring transaction throughput and latency.

---

pgbench is a built-in benchmarking tool that ships with PostgreSQL. It runs a TPC-B-like workload and is useful for measuring database transaction throughput.

## Prerequisites

```bash
# Ensure PostgreSQL is installed and running
sudo dnf install -y postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

## Initializing the Benchmark Database

```bash
# Create a benchmark database
sudo -u postgres createdb pgbench_test

# Initialize pgbench tables with a scale factor of 50
# Scale factor 1 = ~16MB of data; 50 = ~800MB
sudo -u postgres pgbench -i -s 50 pgbench_test
```

## Running a Basic Benchmark

```bash
# Run the default TPC-B-like benchmark
# -c: number of clients (connections)
# -j: number of threads
# -T: duration in seconds
sudo -u postgres pgbench -c 10 -j 4 -T 60 pgbench_test
```

## Read-Only Benchmark

```bash
# Run select-only workload
sudo -u postgres pgbench -c 20 -j 4 -T 60 -S pgbench_test

# -S flag runs SELECT-only transactions
# Useful for testing read performance
```

## Custom SQL Scripts

```bash
# Create a custom benchmark script
cat > /tmp/custom-bench.sql << 'SQL'
\set aid random(1, 50 * 100000)
SELECT abalance FROM pgbench_accounts WHERE aid = :aid;
UPDATE pgbench_accounts SET abalance = abalance + 1 WHERE aid = :aid;
SQL

# Run with custom script
sudo -u postgres pgbench -c 10 -j 4 -T 60 \
  -f /tmp/custom-bench.sql pgbench_test
```

## Detailed Latency Reporting

```bash
# Get per-statement latency and progress reports
sudo -u postgres pgbench -c 10 -j 4 -T 60 \
  --progress=5 \
  --report-per-command \
  pgbench_test

# Output latency histogram
sudo -u postgres pgbench -c 10 -j 4 -T 60 \
  --log --log-prefix=/tmp/pgbench_log \
  pgbench_test
```

## Interpreting Results

```bash
# Key metrics from pgbench output:
# tps = 1500.234 (without initial connection establishing)
#   -- Transactions per second (main throughput metric)
# latency average = 6.665 ms
#   -- Average transaction latency
# number of transactions actually processed: 90000
```

Higher scale factors produce more realistic results because the dataset is too large to fit entirely in memory. Start with a scale factor that creates a dataset 2-3 times larger than your shared_buffers setting.
