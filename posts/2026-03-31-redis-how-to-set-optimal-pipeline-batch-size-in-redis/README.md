# How to Set Optimal Pipeline Batch Size in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipelining, Batch Size, Performance, Optimization

Description: Find the optimal Redis pipeline batch size by understanding diminishing returns, memory constraints, and latency trade-offs for your workload.

---

## The Batch Size Trade-off

Pipeline batch size controls how many commands are sent in one round-trip. Larger batches mean:

- Fewer round-trips (better throughput)
- More memory held in the pipeline buffer
- Longer wait before the application receives any responses
- Larger chunks of Redis CPU time when processing

The optimal size is the point where throughput gains plateau and latency is still acceptable.

## Benchmark to Find Your Optimal Size

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

def benchmark_pipeline(batch_size, total_ops=100000):
    start = time.perf_counter()
    sent = 0
    while sent < total_ops:
        chunk = min(batch_size, total_ops - sent)
        pipe = r.pipeline(transaction=False)
        for i in range(chunk):
            pipe.set(f'key:{sent + i}', f'value:{sent + i}')
        pipe.execute()
        sent += chunk
    elapsed = time.perf_counter() - start
    return total_ops / elapsed  # ops/sec

print(f"{'Batch Size':<15} {'Throughput (ops/sec)':<25}")
print("-" * 40)

for size in [1, 10, 50, 100, 250, 500, 1000, 5000]:
    throughput = benchmark_pipeline(size)
    print(f"{size:<15} {throughput:,.0f}")
```

Typical output pattern:

```text
Batch Size      Throughput (ops/sec)
----------------------------------------
1               8,500
10              70,000
50              280,000
100             450,000
250             600,000
500             680,000
1000            720,000
5000            730,000   (marginal gain, higher memory usage)
```

The curve typically flattens around 100-500 for most setups.

## Factors That Influence the Optimal Size

### 1. Network Latency (RTT)

Higher latency favors larger batch sizes. At 1ms RTT, a batch of 100 reduces 100 round-trips to 1. At 0.1ms RTT (LAN), even a batch of 10 gives 90% of the benefit.

```bash
# Measure your RTT
redis-cli --latency -h <redis-host>
```

### 2. Value Size

Large values consume more network bandwidth per command. With 100KB values, batch size 100 = 10MB per round-trip. Size your batches to stay under reasonable network chunk sizes (1-10MB per batch):

```python
# Dynamically adjust batch size based on value size
def get_batch_size(value_size_bytes):
    target_batch_bytes = 1_000_000  # 1MB per pipeline
    return max(10, target_batch_bytes // value_size_bytes)
```

### 3. Redis Server Memory

Each queued pipeline response consumes server-side client output buffer. With many concurrent pipeline clients, large batches can cause memory pressure.

```bash
redis-cli INFO clients | grep client_recent_max_output_buffer
```

### 4. Application Latency Requirements

If your application needs to process responses within 50ms, your batch size is constrained by:

```python
# max_batch = latency_budget_ms / per_command_time_ms
# Example: 50ms budget, 0.05ms per command -> max 1000 commands
max_batch = 50 / 0.05  # = 1000
```

## Chunked Pipeline Pattern

For large datasets, avoid holding the entire dataset in one pipeline. Process in chunks:

```python
import redis

r = redis.Redis(host='localhost', port=6379)

def bulk_set(data: dict, batch_size=500):
    """Set many keys in chunks to balance throughput and memory."""
    items = list(data.items())
    results = []

    for i in range(0, len(items), batch_size):
        chunk = items[i:i + batch_size]
        pipe = r.pipeline(transaction=False)
        for key, value in chunk:
            pipe.set(key, value)
        chunk_results = pipe.execute()
        results.extend(chunk_results)

    return results

# Usage
data = {f'product:{i}': f'details_{i}' for i in range(100000)}
bulk_set(data, batch_size=500)
```

## Adaptive Batch Size

Adjust batch size dynamically based on measured throughput:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

class AdaptivePipeline:
    def __init__(self, initial_size=100):
        self.batch_size = initial_size
        self.measurements = []

    def execute_batch(self, commands):
        pipe = r.pipeline(transaction=False)
        for cmd, args in commands:
            getattr(pipe, cmd)(*args)

        start = time.perf_counter()
        results = pipe.execute()
        elapsed = time.perf_counter() - start

        throughput = len(commands) / elapsed
        self.measurements.append(throughput)

        # Adjust size every 10 batches
        if len(self.measurements) % 10 == 0:
            avg = sum(self.measurements[-10:]) / 10
            if avg < sum(self.measurements[-20:-10]) / 10 if len(self.measurements) >= 20 else avg:
                # Throughput decreasing - reduce batch size
                self.batch_size = max(10, self.batch_size // 2)
            else:
                # Throughput stable or increasing - try larger
                self.batch_size = min(5000, int(self.batch_size * 1.5))

        return results
```

## Guidelines by Use Case

| Use Case | Recommended Batch Size |
|---|---|
| Real-time writes (latency sensitive) | 10-50 |
| Bulk data loading | 500-2000 |
| Reporting (many GETs) | 100-500 |
| Session data (small values) | 100-500 |
| Large object caching (>10KB) | 10-50 |
| High-latency remote Redis (>5ms) | 500-2000 |

## Summary

The optimal Redis pipeline batch size is typically between 100 and 500 commands for most workloads, balancing throughput gains against memory usage and response latency. Run a batch size sweep benchmark to find the inflection point where throughput gains plateau for your specific RTT, value size, and concurrency. Use chunked pipeline patterns for bulk operations to avoid holding large amounts of data in memory, and consider adaptive sizing for workloads with variable characteristics.
