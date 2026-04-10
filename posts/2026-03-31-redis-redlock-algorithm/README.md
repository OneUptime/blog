# How the Redlock Algorithm Works in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redlock, Distributed Lock, Algorithm, Concurrency

Description: Understand how the Redlock distributed locking algorithm works in Redis, including its design rationale, safety properties, and the steps for acquiring and releasing locks.

---

Redlock is a distributed locking algorithm designed by Salvatore Sanfilippo (the creator of Redis) to provide mutual exclusion across multiple independent Redis instances. It solves the problem of distributed locks being unreliable when using a single Redis node.

## Why Not Use a Single Redis Node for Locks?

A simple `SET key value NX PX 30000` on a single Redis instance fails when:
- The Redis node crashes after the lock is acquired but before the work is done
- A network partition makes the Redis node appear unreachable
- Failover to a replica may lose the lock write if replication hasn't completed

Redlock uses N independent Redis instances (not a cluster) to address this.

## The Redlock Algorithm Steps

Redlock is typically deployed with an odd number of Redis instances (commonly 5) that are completely independent (no replication between them). An odd number is not strictly required, but it is more efficient since even numbers provide the same fault tolerance as the odd number below them.

### Step 1: Record Start Time

```python
import time

start_ms = int(time.time() * 1000)
```

### Step 2: Acquire Lock on Each Node

Try to acquire the lock on all N nodes using `SET NX PX`:

```python
import redis
import uuid

def acquire_lock_on_node(node: redis.Redis, resource: str, token: str, ttl_ms: int) -> bool:
    try:
        result = node.set(resource, token, nx=True, px=ttl_ms)
        return result is True
    except redis.RedisError:
        return False
```

### Step 3: Check Quorum and Time

The lock is acquired only if you got locks from a majority (N/2 + 1) of nodes AND the elapsed time is less than the TTL:

```python
def acquire_redlock(nodes: list, resource: str, ttl_ms: int) -> tuple[bool, str, int]:
    token = str(uuid.uuid4())
    n = len(nodes)
    quorum = n // 2 + 1
    acquired = []

    start_ms = int(time.time() * 1000)

    for node in nodes:
        if acquire_lock_on_node(node, resource, token, ttl_ms):
            acquired.append(node)

    elapsed_ms = int(time.time() * 1000) - start_ms
    validity_time = ttl_ms - elapsed_ms - drift_ms(ttl_ms)

    if len(acquired) >= quorum and validity_time > 0:
        return True, token, validity_time
    else:
        # Release on all nodes (even ones we believe we failed to lock)
        for node in nodes:
            release_lock_on_node(node, resource, token)
        return False, "", 0

def drift_ms(ttl_ms: int) -> int:
    """Clock drift compensation (common implementation choice: 0.01 * TTL + 2ms)"""
    return int(ttl_ms * 0.01) + 2
```

### Step 4: Use the Lock

Work is performed only within the `validity_time` window:

```python
acquired, token, validity_ms = acquire_redlock(nodes, "resource:order:42", 30000)

if acquired:
    try:
        # Critical section - must complete within validity_ms
        process_order(42)
    finally:
        release_redlock(nodes, "resource:order:42", token)
```

### Step 5: Release the Lock

Release uses a Lua script to ensure atomicity - only delete the key if the value matches:

```python
RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

def release_lock_on_node(node: redis.Redis, resource: str, token: str) -> bool:
    try:
        result = node.eval(RELEASE_SCRIPT, 1, resource, token)
        return result == 1
    except redis.RedisError:
        return False

def release_redlock(nodes: list, resource: str, token: str):
    for node in nodes:
        release_lock_on_node(node, resource, token)
```

## Safety Properties

Redlock guarantees:
1. **Mutual exclusion**: Only one client holds the lock at a time (with high probability)
2. **Deadlock-free**: Locks always expire even if the client crashes
3. **Fault tolerance**: Locks work as long as N/2 + 1 nodes are available

## Limitations

- Redlock is controversial - Martin Kleppmann identified edge cases with GC pauses and clock drift
- Not suitable for "fencing token" patterns (use database sequences instead)
- Performance overhead from acquiring on 5 independent nodes

## Summary

Redlock improves upon single-node Redis locking by requiring a majority quorum across N independent instances. The key insight is that a lock is only valid if acquired from more than half the nodes within the TTL window, accounting for clock drift. Always use a unique token per lock attempt and the atomic Lua release script to prevent stale unlocks.
