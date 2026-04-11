# How to Implement Redlock in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redlock, Distributed Locking, Python, Concurrency

Description: Learn how to implement the Redlock distributed locking algorithm in Python using multiple Redis instances for fault-tolerant mutual exclusion.

---

## What Is Redlock

Redlock is a distributed mutual exclusion algorithm designed by Salvatore Sanfilippo (antirez) for Redis. It uses N independent Redis instances (typically 5) to achieve consensus before granting a lock. A lock is considered acquired if the client can successfully set the lock on a majority (N/2 + 1) of instances within a validity time window.

Redlock is designed for cases where a single Redis instance is insufficient for distributed locking guarantees, such as when split-brain scenarios or Redis failover could cause two clients to hold the same lock simultaneously.

## Installing the Python Redlock Library

```bash
pip install redis redlock-py
# Or the more maintained alternative:
pip install pottery
```

The `pottery` library provides a Redlock implementation:

```bash
pip install pottery
```

## Basic Redlock with pottery

```python
from pottery import Redlock
import redis

# Create connections to multiple independent Redis instances
nodes = [
    redis.Redis(host='redis-1.example.com', port=6379),
    redis.Redis(host='redis-2.example.com', port=6379),
    redis.Redis(host='redis-3.example.com', port=6379),
    redis.Redis(host='redis-4.example.com', port=6379),
    redis.Redis(host='redis-5.example.com', port=6379),
]

# Use as a context manager
lock = Redlock(key='resource-lock', masters=nodes, auto_release_time=10)

with lock:
    # Critical section - only one process can be here at a time
    print("Lock acquired, doing work...")
    # ... your critical work here ...
    print("Work done, releasing lock")
```

## Implementing Redlock from Scratch

For learning purposes, here is a minimal Redlock implementation:

```python
import redis
import time
import uuid
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class RedlockError(Exception):
    pass

class Redlock:
    ACQUIRE_SCRIPT = """
    if redis.call('exists', KEYS[1]) == 0 then
        return redis.call('set', KEYS[1], ARGV[1], 'px', ARGV[2])
    end
    return nil
    """

    RELEASE_SCRIPT = """
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    end
    return 0
    """

    def __init__(self, nodes: list, retry_count: int = 3, retry_delay: float = 0.2):
        self.nodes = nodes
        self.quorum = len(nodes) // 2 + 1
        self.retry_count = retry_count
        self.retry_delay = retry_delay
        self.clock_drift_factor = 0.01

    def _acquire_on_instance(self, node, resource: str, value: str, ttl_ms: int) -> bool:
        try:
            result = node.eval(self.ACQUIRE_SCRIPT, 1, resource, value, ttl_ms)
            return result == b'OK' or result == 'OK'
        except Exception as e:
            logger.warning(f"Failed to acquire lock on node: {e}")
            return False

    def _release_on_instance(self, node, resource: str, value: str):
        try:
            node.eval(self.RELEASE_SCRIPT, 1, resource, value)
        except Exception as e:
            logger.warning(f"Failed to release lock on node: {e}")

    def acquire(self, resource: str, ttl_ms: int) -> Optional[dict]:
        value = str(uuid.uuid4())

        for attempt in range(self.retry_count):
            start_time = int(time.time() * 1000)
            acquired = sum(
                1 for node in self.nodes
                if self._acquire_on_instance(node, resource, value, ttl_ms)
            )
            elapsed = int(time.time() * 1000) - start_time
            validity = ttl_ms - elapsed - int(self.clock_drift_factor * ttl_ms)

            if acquired >= self.quorum and validity > 0:
                return {
                    'resource': resource,
                    'value': value,
                    'validity': validity,
                    'expiry': start_time + ttl_ms
                }
            else:
                # Failed - release on all nodes
                for node in self.nodes:
                    self._release_on_instance(node, resource, value)

            if attempt < self.retry_count - 1:
                time.sleep(self.retry_delay * (2 ** attempt))

        return None

    def release(self, lock: dict):
        for node in self.nodes:
            self._release_on_instance(node, lock['resource'], lock['value'])

    def __call__(self, resource: str, ttl_ms: int = 10000):
        return RedlockContext(self, resource, ttl_ms)


class RedlockContext:
    def __init__(self, redlock: Redlock, resource: str, ttl_ms: int):
        self.redlock = redlock
        self.resource = resource
        self.ttl_ms = ttl_ms
        self.lock = None

    def __enter__(self):
        self.lock = self.redlock.acquire(self.resource, self.ttl_ms)
        if self.lock is None:
            raise RedlockError(f"Could not acquire lock for {self.resource}")
        return self.lock

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.lock:
            self.redlock.release(self.lock)


# Usage example
nodes = [
    redis.Redis(host='redis-1', port=6379),
    redis.Redis(host='redis-2', port=6379),
    redis.Redis(host='redis-3', port=6379),
]

rl = Redlock(nodes=nodes)

try:
    with rl("payment-processing:order-123", ttl_ms=30000) as lock:
        print(f"Lock acquired with validity: {lock['validity']}ms")
        # Process payment
        time.sleep(0.5)
        print("Payment processed")
except RedlockError as e:
    print(f"Could not acquire lock: {e}")
```

## Single-Instance Redis Lock (for development)

When you only have one Redis instance (not production-safe for distributed systems):

```python
import redis
import uuid
import time
import contextlib

r = redis.Redis(host='localhost', port=6379)

RELEASE_SCRIPT = """
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
end
return 0
"""

@contextlib.contextmanager
def redis_lock(resource: str, ttl_seconds: int = 10):
    lock_value = str(uuid.uuid4())
    acquired = r.set(resource, lock_value, ex=ttl_seconds, nx=True)

    if not acquired:
        raise Exception(f"Could not acquire lock for {resource}")

    try:
        yield lock_value
    finally:
        r.eval(RELEASE_SCRIPT, 1, resource, lock_value)

# Usage
with redis_lock("inventory:item-42", ttl_seconds=5):
    print("Processing inventory item...")
    time.sleep(1)
```

## Testing Redlock Concurrency

```python
import threading
import time
from collections import Counter

access_log = []
lock_errors = Counter()

def worker(worker_id: int, rl: Redlock):
    for i in range(5):
        try:
            with rl(f"shared-resource:job-{i}", ttl_ms=2000) as lock:
                access_log.append({'worker': worker_id, 'job': i, 'time': time.time()})
                time.sleep(0.1)  # Simulate work
        except RedlockError:
            lock_errors[worker_id] += 1
        time.sleep(0.05)

# Run concurrent workers
nodes = [redis.Redis(host='localhost', port=6379)]  # Single node for testing
rl = Redlock(nodes=nodes)

threads = [threading.Thread(target=worker, args=(i, rl)) for i in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()

# Verify no two workers held the same lock at the same time
print(f"Total lock acquisitions: {len(access_log)}")
print(f"Lock errors: {dict(lock_errors)}")
```

## Summary

Redlock in Python involves connecting to multiple independent Redis instances (typically 5, and an odd number is recommended for quorum efficiency), acquiring a lock on a majority of them within the lock TTL, and measuring elapsed time to ensure the remaining validity is positive. Use the pottery library for a production-ready implementation, or the single-instance redis_lock context manager for simpler use cases where distributed Redis consensus is not required. Always use a Lua script for lock release to ensure the release is atomic - only delete the key if the stored value matches your lock identifier.
