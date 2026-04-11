# How to Load Test Redis with redis-benchmark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Load Testing, Redis-Benchmark, Performance, Throughput

Description: Learn how to use redis-benchmark effectively to load test Redis with realistic workloads, measure throughput and latency, and identify performance bottlenecks.

---

## What Is redis-benchmark

`redis-benchmark` is a built-in Redis tool that generates load against a Redis server and measures throughput (requests per second) and latency percentiles. It ships with every Redis installation and requires no additional dependencies.

## Basic Usage

```bash
# Default benchmark: 100,000 requests, 50 concurrent clients, all command types
redis-benchmark

# Connect to a specific host and port
redis-benchmark -h 192.168.1.100 -p 6379 -n 100000 -c 50

# Benchmark with authentication
redis-benchmark -h localhost -p 6379 -a yourpassword -n 100000
```

## Targeting Specific Commands

Test only the commands your application uses:

```bash
# Test SET and GET only
redis-benchmark -t set,get -n 100000 -c 50

# Test all command types
redis-benchmark -t set,get,incr,lpush,rpush,sadd,zadd,hset,mset -n 100000

# Test LPUSH and LRANGE together
redis-benchmark -t lpush,lrange -n 100000 -c 100
```

Available command types: set, get, incr, lpush, rpush, lpop, rpop, sadd, hset, mset, spop, zadd, zpopmin, ping, lrange, lrange_100, lrange_300, lrange_500, lrange_600

## Setting Payload Size

By default, values are 3 bytes. Use `-d` to set realistic payload sizes:

```bash
# 1KB values (typical for session data)
redis-benchmark -t set,get -d 1024 -n 100000

# 10KB values (larger JSON blobs)
redis-benchmark -t set,get -d 10240 -n 100000

# Compare performance at different payload sizes
for size in 64 512 1024 4096 16384; do
  echo "=== Payload size: ${size} bytes ==="
  redis-benchmark -t set -d $size -n 100000 -q
done
```

## Pipelining

Pipelining dramatically increases throughput by batching multiple commands per network round-trip:

```bash
# No pipeline (default)
redis-benchmark -t set -n 100000 -c 50

# Pipeline 16 commands per batch
redis-benchmark -t set -n 100000 -c 50 -P 16

# Pipeline 64 commands per batch
redis-benchmark -t set -n 100000 -c 50 -P 64

# Compare pipeline sizes
for pipeline in 1 4 8 16 32 64; do
  echo "Pipeline=$pipeline:"
  redis-benchmark -t set -n 100000 -P $pipeline -q
done
```

## Concurrency Testing

Vary the number of concurrent clients to find saturation points:

```bash
# Test with different concurrency levels
for clients in 1 10 50 100 200 500; do
  echo "=== Clients: $clients ==="
  redis-benchmark -t set,get -n 200000 -c $clients -q
done
```

## Using CSV Output for Analysis

```bash
# Output results in CSV for spreadsheet analysis
redis-benchmark -t set,get,incr -n 100000 -c 50 --csv > benchmark_results.csv

# Quick mode - single line output per test
redis-benchmark -t set,get -n 100000 -q
```

CSV output format:

```text
"test","rps","avg_latency_ms","min_latency_ms","p50_latency_ms","p95_latency_ms","p99_latency_ms","max_latency_ms"
"PING_INLINE","185185.19","0.259","0.072","0.255","0.343","0.455","1.343"
"SET","142857.14","0.344","0.080","0.335","0.471","0.623","1.551"
"GET","166666.67","0.295","0.072","0.287","0.391","0.519","1.287"
```

## Testing with Keyspace Size

Control how many unique keys are used to test cache hit rates and memory pressure:

```bash
# 10,000 unique keys (high cache hit ratio)
redis-benchmark -t set,get -n 1000000 -r 10000 -q

# 1,000,000 unique keys (lower hit ratio, more memory pressure)
redis-benchmark -t set,get -n 1000000 -r 1000000 -q

# Compare hit rates
echo "Small keyspace (10K unique keys):"
redis-benchmark -t get -n 500000 -r 10000 -q

echo "Large keyspace (1M unique keys):"
redis-benchmark -t get -n 500000 -r 1000000 -q
```

## Custom Workload with Inline Commands

Test custom commands beyond the built-in set:

```bash
# Test ZADD with random scores and members
redis-benchmark -n 100000 -c 50 -r 10000 \
  ZADD leaderboard:test __rand_int__ member:__rand_int__

# Test HSET with random keys and fields
redis-benchmark -n 100000 -c 50 -r 10000 \
  HSET user:__rand_int__ name user:__rand_int__ score __rand_int__
```

## Running a Comprehensive Load Test Script

```bash
#!/bin/bash
# comprehensive_load_test.sh

HOST=${REDIS_HOST:-localhost}
PORT=${REDIS_PORT:-6379}
REQUESTS=200000
CLIENTS=100

echo "Redis Load Test - $(date)"
echo "Target: $HOST:$PORT"
echo "Requests: $REQUESTS, Clients: $CLIENTS"
echo ""

echo "=== Throughput Test (SET) ==="
redis-benchmark -h $HOST -p $PORT -t set -n $REQUESTS -c $CLIENTS -d 512 -q

echo "=== Throughput Test (GET) ==="
redis-benchmark -h $HOST -p $PORT -t get -n $REQUESTS -c $CLIENTS -q

echo "=== Pipeline Impact (SET with P=16) ==="
redis-benchmark -h $HOST -p $PORT -t set -n $REQUESTS -c $CLIENTS -P 16 -q

echo "=== High Concurrency Test ==="
redis-benchmark -h $HOST -p $PORT -t set,get -n $REQUESTS -c 500 -q

echo "=== Large Payload Test (10KB) ==="
redis-benchmark -h $HOST -p $PORT -t set,get -n 50000 -c 50 -d 10240 -q

echo "=== Sorted Set Operations ==="
redis-benchmark -h $HOST -p $PORT -t zadd,zpopmin -n $REQUESTS -c $CLIENTS -q

echo ""
echo "Load test complete."
```

## Interpreting Results

Key metrics to watch:

```text
Throughput (requests/sec):
- Single-core Redis: 80,000-200,000 SET/GET per second (localhost)
- With pipelining: 500,000+ per second
- Over network: 50,000-150,000 (depending on RTT)

Latency targets (localhost):
- P50: < 0.5ms
- P95: < 1ms
- P99: < 2ms
- P99.9: < 5ms

Warning signs:
- P99 > 5ms on localhost: check for CPU contention or slow commands
- Throughput drops at high concurrency: connection pool exhaustion
- Large gap between P50 and P99: garbage collection or OS jitter
```

## Summary

redis-benchmark is the fastest way to establish Redis performance baselines and test the impact of configuration changes. Use the `-t` flag to target specific commands matching your workload, `-d` to set realistic payload sizes, and `-P` to benchmark pipeline effects. Run with varied concurrency levels to find the saturation point, and output CSV results for trend analysis over time. Always benchmark after infrastructure changes, Redis version upgrades, or significant configuration tuning.
