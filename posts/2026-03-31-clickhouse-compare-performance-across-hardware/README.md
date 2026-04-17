# How to Compare ClickHouse Performance Across Hardware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hardware Benchmark, Performance Comparison, NVMe, CPU

Description: Learn how to compare ClickHouse performance across different hardware configurations by running standardized benchmarks and analyzing CPU, memory, and storage impact.

---

## Why Compare Across Hardware?

ClickHouse performance scales with CPU core count, RAM, and storage speed. Before committing to a hardware purchase, run benchmarks on candidate configurations to quantify the cost/performance tradeoff.

## Standardized Test Setup

Use the same dataset and queries on each machine:

```bash
# On each test machine, run the same setup
wget https://datasets.clickhouse.com/hits_compatible/hits.csv.gz
gunzip hits.csv.gz

clickhouse-client --query "CREATE TABLE hits_bench (...)" # standard schema
clickhouse-client --query "INSERT INTO hits_bench FORMAT CSV" < hits.csv
```

## Collecting Hardware Information

```bash
# CPU info
lscpu | grep -E "Model name|CPU\(s\)|Thread|Socket"

# Memory
free -h

# Storage
df -h /var/lib/clickhouse
lsblk -d -o NAME,ROTA,SIZE,MODEL
```

## Running the Benchmark Suite

```bash
#!/bin/bash
MACHINE_ID="$1"  # e.g., "m5.4xlarge-nvme"

# Run 30 iterations per query to get a stable median
clickhouse-benchmark \
    --iterations 30 \
    --concurrency 1 \
    < clickbench_queries.sql \
    2>&1 | tee "results_${MACHINE_ID}.txt"
```

## Querying ClickHouse's Own Hardware Metrics

```sql
-- CPU usage during queries
SELECT
    hostname(),
    avg(ProfileEvent_OSCPUVirtualTimeMicroseconds) AS avg_cpu_us,
    avg(CurrentMetric_MemoryTracking) AS avg_memory_bytes
FROM system.metric_log
WHERE event_time >= now() - INTERVAL 5 MINUTE
GROUP BY hostname();
```

## Comparing Storage Performance

Test pure storage read speed:

```bash
# Using clickhouse-local to avoid server overhead
time clickhouse local \
    --query "SELECT count(), sum(amount) FROM file('large_data.parquet', Parquet)" \
    --format Null
```

Then compare:

```text
NVMe SSD:  0.8s - 3.2 GB/s read
SATA SSD:  2.1s - 1.2 GB/s read
HDD:       8.4s - 0.3 GB/s read
```

## Comparing CPU Parallelism

Test how performance scales with thread count:

```bash
for THREADS in 1 2 4 8 16 32; do
    echo -n "Threads=$THREADS: "
    clickhouse-client \
        --query "SELECT uniq(user_id) FROM events" \
        --time \
        --format Null \
        --max_threads=$THREADS \
        2>&1 | tail -1
done
```

## Memory Impact on Performance

```bash
for MEMORY_MB in 512 1024 2048 4096 8192; do
    echo -n "Memory limit ${MEMORY_MB}MB: "
    clickhouse-client \
        --query "SELECT category, sum(amount) FROM orders GROUP BY category" \
        --time \
        --format Null \
        --max_memory_usage=$((MEMORY_MB * 1024 * 1024)) \
        2>&1 | tail -1
done
```

## Documenting Results

```text
Machine comparison table:
| Config            | Q1 (count) | Q37 (regex) | Q43 (agg) | Cost/month |
|-------------------|------------|-------------|-----------|------------|
| m5.4xlarge SATA   | 0.012s     | 1.2s        | 2.1s      | $620       |
| m5.4xlarge NVMe   | 0.009s     | 0.7s        | 1.4s      | $720       |
| r5.4xlarge NVMe   | 0.008s     | 0.6s        | 1.1s      | $900       |
```

## Summary

Hardware comparison requires identical datasets, queries, and warm-up conditions on each machine. Combine `clickhouse-benchmark` for query latency, shell tests for storage throughput, and thread-count sweeps to understand CPU scaling. Document results in a comparison table before making procurement decisions.
