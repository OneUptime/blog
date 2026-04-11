# How to Measure Client-Side Caching Effectiveness in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client-Side Caching, Metric, Performance, Monitoring

Description: Learn how to measure Redis client-side caching effectiveness by tracking hit rates, latency reduction, and network savings to validate and optimize your caching strategy.

---

Client-side caching is only valuable if the hit rate is high enough to offset complexity. Measuring effectiveness tells you whether your cache is working, which keys are most valuable to cache, and when to adjust your strategy.

## Key Metrics to Track

The primary metrics for client-side cache effectiveness are:

1. **Hit rate**: percentage of reads served from local cache
2. **Latency reduction**: average read time with vs without cache
3. **Redis command reduction**: how many fewer GET commands reach Redis
4. **Invalidation rate**: how often cached values are invalidated (low = stable data)

## Instrumented Cache Class

```python
import redis
import time
import threading
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class CacheStats:
    hits: int = 0
    misses: int = 0
    invalidations: int = 0
    total_hit_latency_ms: float = 0.0
    total_miss_latency_ms: float = 0.0

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    @property
    def avg_hit_latency_ms(self) -> float:
        return self.total_hit_latency_ms / self.hits if self.hits > 0 else 0.0

    @property
    def avg_miss_latency_ms(self) -> float:
        return self.total_miss_latency_ms / self.misses if self.misses > 0 else 0.0

class InstrumentedCache:
    def __init__(self, host='localhost', port=6379):
        self.r = redis.Redis(host=host, port=port, decode_responses=True)
        self.inv_r = redis.Redis(host=host, port=port, decode_responses=True)
        self.cache = {}
        self.stats = CacheStats()
        self._lock = threading.Lock()
        self._setup_tracking()

    def _setup_tracking(self):
        inv_id = self.inv_r.client_id()
        pubsub = self.inv_r.pubsub()
        pubsub.subscribe('__redis__:invalidate')
        self.r.execute_command('CLIENT', 'TRACKING', 'ON', 'REDIRECT', str(inv_id))

        def listen():
            for msg in pubsub.listen():
                if msg['type'] == 'message' and msg['data']:
                    with self._lock:
                        if msg['data'] in self.cache:
                            del self.cache[msg['data']]
                            self.stats.invalidations += 1

        threading.Thread(target=listen, daemon=True).start()

    def get(self, key: str) -> Optional[str]:
        start = time.perf_counter()

        with self._lock:
            if key in self.cache:
                elapsed_ms = (time.perf_counter() - start) * 1000
                self.stats.hits += 1
                self.stats.total_hit_latency_ms += elapsed_ms
                return self.cache[key]

        value = self.r.get(key)
        elapsed_ms = (time.perf_counter() - start) * 1000

        with self._lock:
            self.stats.misses += 1
            self.stats.total_miss_latency_ms += elapsed_ms
            if value is not None:
                self.cache[key] = value

        return value

    def print_stats(self):
        s = self.stats
        print(f"Hit rate:          {s.hit_rate:.1%}")
        print(f"Hits:              {s.hits:,}")
        print(f"Misses:            {s.misses:,}")
        print(f"Invalidations:     {s.invalidations:,}")
        print(f"Avg hit latency:   {s.avg_hit_latency_ms:.3f} ms")
        print(f"Avg miss latency:  {s.avg_miss_latency_ms:.3f} ms")
        if s.avg_miss_latency_ms > 0:
            speedup = s.avg_miss_latency_ms / max(s.avg_hit_latency_ms, 0.001)
            print(f"Speedup:           {speedup:.0f}x")
```

## Running a Benchmark

```python
def benchmark_cache(key_count=100, reads_per_key=100):
    cache = InstrumentedCache()

    # Seed data
    for i in range(key_count):
        cache.r.set(f'item:{i}', f'value_{i}')

    # Simulate workload: read each key multiple times
    for _ in range(reads_per_key):
        for i in range(key_count):
            cache.get(f'item:{i}')

    print(f"\n--- Cache Stats ({key_count} keys, {reads_per_key} reads each) ---")
    cache.print_stats()

benchmark_cache()
```

```text
--- Cache Stats (100 keys, 100 reads each) ---
Hit rate:          99.0%
Hits:              9,900
Misses:            100
Invalidations:     0
Avg hit latency:   0.002 ms
Avg miss latency:  0.814 ms
Speedup:           407x
```

## Identifying High-Value Keys to Cache

Track which keys are read most frequently to prioritize caching:

```python
from collections import Counter

class ProfiledCache(InstrumentedCache):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.key_reads = Counter()

    def get(self, key):
        self.key_reads[key] += 1
        return super().get(key)

    def top_keys(self, n=10):
        return self.key_reads.most_common(n)
```

## Exporting to Prometheus

```python
from prometheus_client import Counter, Gauge, Histogram

cache_hits = Counter('redis_client_cache_hits_total', 'Cache hits')
cache_misses = Counter('redis_client_cache_misses_total', 'Cache misses')
cache_size = Gauge('redis_client_cache_size', 'Local cache entries')
cache_latency = Histogram('redis_client_cache_latency_ms', 'Cache latency', ['type'])
```

## Summary

Measure client-side caching effectiveness by instrumenting your cache class to track hit rate, per-type latency, and invalidation rate. A healthy cache shows hit rates above 80%, hit latency orders of magnitude lower than miss latency, and a low invalidation rate relative to reads. Use key-level read profiling to identify hot keys worth caching and cold keys that waste cache memory.
