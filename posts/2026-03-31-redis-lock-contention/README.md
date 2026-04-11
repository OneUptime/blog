# How to Handle Lock Contention in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lock Contention, Distributed Lock, Performance, Concurrency

Description: Learn how to detect, measure, and reduce lock contention in Redis distributed locking systems through backoff strategies, lock sharding, and contention-free patterns.

---

Lock contention occurs when multiple clients compete for the same Redis lock simultaneously. High contention causes increased latency, failed lock acquisitions, and reduced throughput. This guide covers measuring contention and practical strategies to reduce it.

## Detecting Lock Contention

Measure lock wait times and failure rates:

```python
import redis
import time
import uuid
from dataclasses import dataclass

@dataclass
class LockMetrics:
    attempts: int = 0
    acquired: int = 0
    failed: int = 0
    total_wait_ms: float = 0.0

    @property
    def contention_rate(self) -> float:
        return (self.failed / self.attempts * 100) if self.attempts > 0 else 0

    @property
    def avg_wait_ms(self) -> float:
        return self.total_wait_ms / self.acquired if self.acquired > 0 else 0

metrics = LockMetrics()

def acquire_with_metrics(r: redis.Redis, resource: str, ttl_ms: int, timeout_ms: int = 5000) -> str | None:
    token = str(uuid.uuid4())
    start = time.time()
    deadline = start + (timeout_ms / 1000)
    metrics.attempts += 1

    while time.time() < deadline:
        if r.set(resource, token, nx=True, px=ttl_ms):
            wait_ms = (time.time() - start) * 1000
            metrics.acquired += 1
            metrics.total_wait_ms += wait_ms
            return token
        time.sleep(0.01)

    metrics.failed += 1
    return None

# Log contention stats periodically
def log_contention_stats():
    print(f"Lock contention rate: {metrics.contention_rate:.1f}%")
    print(f"Average wait: {metrics.avg_wait_ms:.1f}ms")
    print(f"Failures: {metrics.failed}/{metrics.attempts}")
```

## Strategy 1: Exponential Backoff with Jitter

Naive retry with fixed intervals causes thundering herd. Add jitter:

```python
import random

def acquire_with_backoff(r: redis.Redis, resource: str, ttl_ms: int,
                         max_retries: int = 10) -> str | None:
    token = str(uuid.uuid4())
    base_wait = 0.05  # 50ms

    for attempt in range(max_retries):
        if r.set(resource, token, nx=True, px=ttl_ms):
            return token

        # Full jitter: random between 0 and cap
        cap = min(base_wait * (2 ** attempt), 2.0)
        wait = random.uniform(0, cap)
        time.sleep(wait)

    return None
```

## Strategy 2: Lock Sharding

Split a single hot lock into N shards. Each client picks a random shard:

```python
def acquire_sharded_lock(r: redis.Redis, resource: str, ttl_ms: int,
                         num_shards: int = 8) -> tuple[str | None, int]:
    """Try to acquire one of N shards for the resource."""
    token = str(uuid.uuid4())
    shard = random.randint(0, num_shards - 1)
    key = f"{resource}:shard:{shard}"

    if r.set(key, token, nx=True, px=ttl_ms):
        return token, shard
    return None, -1

def release_sharded_lock(r: redis.Redis, resource: str, token: str, shard: int):
    key = f"{resource}:shard:{shard}"
    RELEASE = "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end"
    r.eval(RELEASE, 1, key, token)
```

Use sharding for rate limiters and counters, not for exclusive resource locks.

## Strategy 3: Eliminate Locks with Atomic Operations

Many use cases don't need a lock at all - Redis atomic commands provide the same guarantee:

```python
# Instead of: lock -> read -> increment -> write -> unlock
# Use: INCR (atomic increment)
def increment_counter_atomically(r: redis.Redis, key: str) -> int:
    return r.incr(key)

# Instead of: lock -> check -> set if absent -> unlock
# Use: SETNX
def claim_resource(r: redis.Redis, resource_id: str, owner: str, ttl: int) -> bool:
    return r.set(f"claim:{resource_id}", owner, nx=True, ex=ttl) is not None

# Instead of: lock -> read list -> append -> write -> unlock
# Use: RPUSH (atomic list append)
def enqueue(r: redis.Redis, queue: str, item: str):
    r.rpush(queue, item)
```

## Monitoring Contention in Production

Track WAIT events and slow lock acquisitions:

```bash
# Monitor lock-related commands
redis-cli monitor | grep -i "setnx\|set.*nx"

# Check for hot keys (high contention indicators)
redis-cli --hotkeys

# View slow log for lock operations
redis-cli slowlog get 20
```

## Summary

Redis lock contention is diagnosed by measuring failed acquisition rates and average wait times. Reduce contention through exponential backoff with full jitter to spread retry attempts, lock sharding when protecting a counter or aggregate, and eliminating locks entirely by using Redis atomic commands like INCR, SETNX, and RPUSH. High contention is often a signal that the lock scope is too broad.
