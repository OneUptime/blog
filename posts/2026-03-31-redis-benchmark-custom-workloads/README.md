# How to Benchmark Redis with Custom Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Benchmark, Performance, Testing, Workload

Description: Learn how to benchmark Redis with realistic custom workloads using redis-benchmark's scripting options and client-side benchmark scripts that match your application's patterns.

---

The default `redis-benchmark` tests simple GET/SET, but your application likely uses a mix of commands, varying key counts, and specific data sizes. Custom benchmarks give you meaningful performance numbers.

## Custom Command Benchmarks with redis-benchmark

Pass the command and its arguments directly after the options:

```bash
# Benchmark HSET with specific field count
redis-benchmark -n 100000 -c 50 -r 100000 \
  HSET user:__rand_int__ name Alice age 30 score 95.5

# Benchmark ZADD (sorted set)
redis-benchmark -n 100000 -c 50 -r 100000 \
  ZADD leaderboard __rand_int__ player:__rand_int__

# Benchmark LPUSH (list)
redis-benchmark -n 100000 -c 50 -r 100000 \
  LPUSH queue:events __rand_int__
```

`__rand_int__` is replaced with a random integer, distributing load across many keys.

## Test Realistic Read/Write Ratios

Most applications are read-heavy (80-95% reads):

```bash
# Simulate 90% reads, 10% writes using two parallel runs
redis-benchmark -n 90000 -c 45 -t get -q &
redis-benchmark -n 10000 -c 5 -t set -q &
wait
```

## Python Custom Workload Script

Write a benchmark that mirrors your application's exact patterns:

```python
import redis
import time
import random
import threading

r = redis.Redis(host="127.0.0.1", port=6379)
REQUESTS = 50000
THREADS = 10

def run_workload(thread_id, results):
    start = time.perf_counter()
    for i in range(REQUESTS // THREADS):
        uid = random.randint(1, 10000)
        # Simulate: read user, increment counter, set session
        pipe = r.pipeline()
        pipe.hgetall(f"user:{uid}")
        pipe.incr(f"pageviews:{uid}")
        pipe.setex(f"session:{uid}", 3600, "active")
        pipe.execute()
    elapsed = time.perf_counter() - start
    results[thread_id] = elapsed

results = {}
threads = [threading.Thread(target=run_workload, args=(i, results)) for i in range(THREADS)]
[t.start() for t in threads]
[t.join() for t in threads]

total_ops = REQUESTS * 3  # 3 commands per pipeline
total_time = max(results.values())
print(f"Throughput: {total_ops / total_time:.0f} ops/sec")
```

## Test with Different Key Spaces

A large key space stresses memory and eviction; a small one tests CPU throughput:

```bash
# Small key space (hot cache)
redis-benchmark -n 1000000 -c 50 -t get -r 1000

# Large key space (eviction pressure)
redis-benchmark -n 1000000 -c 50 -t get -r 1000000
```

`-r` controls the range of random keys used.

## Test Cluster with Multiple Slots

```bash
# Benchmark against a Redis Cluster
redis-benchmark -h cluster-node1 -p 6379 -c 50 -n 100000 \
  --cluster -t set,get
```

## Summary

Custom Redis benchmarks require passing commands as trailing arguments for non-standard commands, specifying key ranges with `-r`, and writing client-side scripts that replicate your actual command mix and data access patterns. Always test with realistic read/write ratios and key space sizes, and run benchmarks from the same network as production application servers.
