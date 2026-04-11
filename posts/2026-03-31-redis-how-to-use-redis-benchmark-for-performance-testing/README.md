# How to Use redis-benchmark for Performance Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Benchmarking, Testing, Operation

Description: Learn how to use redis-benchmark to measure Redis throughput and latency, interpret results, and design custom workload tests for your use case.

---

## What Is redis-benchmark

`redis-benchmark` is a built-in tool that ships with Redis. It simulates N clients sending M total requests for a set of commands and reports throughput (requests per second) and latency percentiles. It is the first tool to reach for when you want to understand raw Redis performance on your hardware.

## Basic Usage

Run the default benchmark suite:
```bash
redis-benchmark
```

This runs 100,000 requests for the most common commands using 50 parallel clients. Sample output:
```text
====== SET ======
  100000 requests completed in 0.88 seconds
  50 parallel clients
  3 bytes payload
  keep alive: 1

99.28% <= 1 milliseconds
100.00% <= 1 milliseconds
114155.25 requests per second
```

## Common Flags

| Flag | Description |
|------|-------------|
| `-h <host>` | Redis host (default: 127.0.0.1) |
| `-p <port>` | Redis port (default: 6379) |
| `-c <clients>` | Number of parallel connections |
| `-n <requests>` | Total number of requests |
| `-d <bytes>` | Data size of SET/GET values |
| `-t <tests>` | Comma-separated list of tests to run |
| `-P <count>` | Number of requests per pipeline |
| `-q` | Quiet mode (summary only) |
| `--csv` | Output in CSV format |

## Testing Specific Commands

Run only SET and GET benchmarks:
```bash
redis-benchmark -t set,get -n 100000 -c 50 -q
```

Output:
```text
SET: 125000.00 requests per second
GET: 131578.13 requests per second
```

## Testing with Different Payload Sizes

Simulate realistic payload sizes for your application:
```bash
# Small payload (cache keys)
redis-benchmark -t set,get -d 64 -n 100000 -q

# Medium payload (JSON objects)
redis-benchmark -t set,get -d 1024 -n 100000 -q

# Large payload (blobs)
redis-benchmark -t set,get -d 10240 -n 100000 -q
```

## Testing with Pipelining

Pipelining batches multiple commands into a single network round trip, dramatically improving throughput:
```bash
# Pipeline 16 commands per batch
redis-benchmark -t set,get -n 100000 -c 50 -P 16 -q
```

Compare pipelining vs no pipelining:
```bash
# Without pipelining
redis-benchmark -t set -n 100000 -c 50 -q

# With pipelining (16 commands per batch)
redis-benchmark -t set -n 100000 -c 50 -P 16 -q
```

## Testing with Multiple Clients

Simulate high concurrency to find saturation points:
```bash
for c in 1 10 50 100 200 500; do
  echo "Clients: $c"
  redis-benchmark -t set,get -n 100000 -c $c -q
done
```

## Custom Commands with EVAL

Test Lua scripts or non-standard commands:
```bash
redis-benchmark -n 100000 \
  EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 testkey testvalue
```

## Running Against a Remote Server

```bash
redis-benchmark -h redis.production.internal -p 6379 \
  -a yourpassword \
  -t set,get,lpush,lpop \
  -n 200000 \
  -c 100 \
  -q
```

## Saving Results to CSV for Analysis

```bash
redis-benchmark -t set,get,hset,hget -n 100000 -c 50 --csv > /tmp/redis_bench.csv
```

Parse with Python:
```python
import csv

fieldnames = ['test', 'rps', 'avg_latency_ms', 'min_latency_ms',
              'p50_latency_ms', 'p95_latency_ms', 'p99_latency_ms', 'max_latency_ms']

with open('/tmp/redis_bench.csv', 'r') as f:
    reader = csv.DictReader(f, fieldnames=fieldnames)
    for row in reader:
        print(f"{row['test']}: {row['rps']} req/s, p99={row['p99_latency_ms']}ms")
```

## Interpreting Results

Key metrics to analyze:
- **Throughput (req/s)** - Higher is better. Typical single-node Redis handles 100k-200k ops/sec on modern hardware.
- **Latency percentiles** - The p99 and p999 values reveal tail latency. If p99 is much higher than p50, investigate OS scheduling, network jitter, or slow commands.
- **Keep alive** - Shows whether connections are reused (should be 1 for accurate benchmarks).

Warning signs:
```text
# High variance indicates external interference
99.00% <= 1 milliseconds
99.50% <= 2 milliseconds
100.00% <= 45 milliseconds   <- spike!
```

## Comparing Before and After Configuration Changes

Save baseline results and compare after tuning:
```bash
# Baseline
redis-benchmark -t set,get -n 500000 -c 100 --csv > /tmp/before_tuning.csv

# After changing maxmemory-policy, tcp-backlog, etc.
redis-benchmark -t set,get -n 500000 -c 100 --csv > /tmp/after_tuning.csv

# Compare
diff /tmp/before_tuning.csv /tmp/after_tuning.csv
```

## Summary

`redis-benchmark` is the fastest way to establish a performance baseline for your Redis deployment. Use it with different client counts, payload sizes, and pipeline depths to characterize throughput and latency behavior. Always run benchmarks from a machine with low-latency network access to your Redis server, and compare results before and after configuration changes to validate improvements.
