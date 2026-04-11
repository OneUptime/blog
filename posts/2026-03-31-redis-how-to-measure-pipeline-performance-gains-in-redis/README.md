# How to Measure Pipeline Performance Gains in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipelining, Benchmarking, Performance, Throughput

Description: Measure Redis pipeline throughput gains with redis-benchmark and application-level benchmarks to quantify the performance difference between pipelined and non-pipelined commands.

---

## Using redis-benchmark to Measure Pipeline Impact

`redis-benchmark` has built-in support for pipeline testing via the `-P` flag:

```bash
# Without pipelining (baseline)
redis-benchmark -n 100000 -c 10 SET key value

# With pipeline of 16 commands
redis-benchmark -n 100000 -c 10 -P 16 SET key value

# With pipeline of 100 commands
redis-benchmark -n 100000 -c 10 -P 100 SET key value
```

Sample results on a typical setup:

```text
No pipeline (-P 1):
  Throughput: 85,000 req/sec

Pipeline of 16 (-P 16):
  Throughput: 650,000 req/sec  (7.6x improvement)

Pipeline of 100 (-P 100):
  Throughput: 1,200,000 req/sec  (14x improvement)
```

## Comprehensive Benchmark Script

```bash
echo "=== Redis Pipeline Benchmark ==="
echo ""
echo "No pipeline:"
redis-benchmark -n 100000 -c 10 -q -t set

for P in 2 4 8 16 32 64 128; do
    echo ""
    echo "Pipeline size: $P"
    redis-benchmark -n 100000 -c 10 -P $P -q -t set
done
```

## Python Application-Level Benchmark

Measure the real-world impact in your application:

```python
import redis
import time
import statistics

r = redis.Redis(host='localhost', port=6379)

def benchmark(label, func, iterations=5):
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        func()
        elapsed = time.perf_counter() - start
        times.append(elapsed)
    avg = statistics.mean(times)
    ops = 10000 / avg
    print(f"{label}: avg={avg:.3f}s, throughput={ops:,.0f} ops/sec")

def no_pipeline():
    for i in range(10000):
        r.set(f'bench:key:{i}', f'value:{i}')

def with_pipeline():
    pipe = r.pipeline(transaction=False)
    for i in range(10000):
        pipe.set(f'bench:key:{i}', f'value:{i}')
    pipe.execute()

def chunked_pipeline(chunk_size=500):
    for start in range(0, 10000, chunk_size):
        pipe = r.pipeline(transaction=False)
        for i in range(start, min(start + chunk_size, 10000)):
            pipe.set(f'bench:key:{i}', f'value:{i}')
        pipe.execute()

benchmark("No pipeline", no_pipeline)
benchmark("Full pipeline (10k)", with_pipeline)
benchmark("Chunked pipeline (500)", chunked_pipeline)
```

## Measuring Read Pipeline Performance

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

# Seed data
for i in range(1000):
    r.set(f'item:{i}', f'data_{i}')

NUM_KEYS = 1000

def read_sequential():
    start = time.perf_counter()
    for i in range(NUM_KEYS):
        r.get(f'item:{i}')
    return time.perf_counter() - start

def read_pipelined():
    start = time.perf_counter()
    pipe = r.pipeline(transaction=False)
    for i in range(NUM_KEYS):
        pipe.get(f'item:{i}')
    pipe.execute()
    return time.perf_counter() - start

seq_time = read_sequential()
pipe_time = read_pipelined()

print(f"Sequential GET 1000 keys: {seq_time:.3f}s")
print(f"Pipelined GET 1000 keys:  {pipe_time:.3f}s")
print(f"Speedup: {seq_time / pipe_time:.1f}x")
```

## Measuring Latency Contribution

The benefit of pipelining scales with network latency. Measure your actual RTT:

```bash
# Measure Redis round-trip latency
redis-cli --latency -h <redis-host>

# Sample output (LAN):
# min: 0.10, max: 2.43, avg: 0.25 (10000 samples)
```

Expected speedup at different latencies:

| RTT | No pipeline (1000 cmds) | Pipeline (1000 cmds) | Speedup |
|---|---|---|---|
| 0.1ms | 0.1s | ~0.005s | ~20x |
| 1ms | 1.0s | ~0.010s | ~100x |
| 5ms | 5.0s | ~0.015s | ~330x |
| 50ms | 50s | ~0.1s | ~500x |

## Profiling Pipeline Execution Time vs Processing Time

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

# Measure just the execute() call vs building the pipeline
pipeline_build_start = time.perf_counter()
pipe = r.pipeline(transaction=False)
for i in range(10000):
    pipe.set(f'key:{i}', f'val:{i}')
build_time = time.perf_counter() - pipeline_build_start

execute_start = time.perf_counter()
pipe.execute()
execute_time = time.perf_counter() - execute_start

print(f"Pipeline build time (local): {build_time*1000:.1f}ms")
print(f"Pipeline execute time (network): {execute_time*1000:.1f}ms")
print(f"Network % of total: {execute_time/(build_time+execute_time)*100:.0f}%")
```

## redis-benchmark Output Interpretation

```bash
redis-benchmark -n 1000000 -c 50 -P 32 -t set,get -q
```

Output:

```text
SET: 1250000.00 requests per second, p50=1.199 msec, p99=2.399 msec, p99.9=4.799 msec
GET: 1333333.25 requests per second, p50=1.199 msec, p99=2.303 msec, p99.9=4.607 msec
```

Key metrics:
- `requests per second`: throughput
- `p50`, `p99`, `p99.9`: latency percentiles

## Summary

Measure pipeline performance gains using `redis-benchmark -P <pipeline-size>` for synthetic benchmarks or application-level timing with `time.perf_counter()`. The speedup is proportional to network RTT: higher latency connections benefit most from pipelining. Track throughput (ops/sec) and latency percentiles to characterize the improvement. For production tuning, test pipeline sizes of 16, 64, and 256 to find the optimal batch size for your workload.
