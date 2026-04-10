# How to Use Redis Pipeline vs Transaction for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipeline, Transaction, Performance, MULTI

Description: Learn the performance differences between Redis pipelines and MULTI/EXEC transactions, when to use each, and how they affect throughput and latency.

---

Redis pipelines and transactions (MULTI/EXEC) both batch commands, but they serve different purposes and have distinct performance characteristics. Understanding the difference is key to choosing the right tool.

## Pipelines: Network Optimization

Pipelines reduce round-trip time by sending multiple commands without waiting for each response:

```python
import redis
import time

r = redis.Redis()

# Without pipeline: N round-trips
start = time.perf_counter()
for i in range(1000):
    r.set(f"key:{i}", i)
    r.expire(f"key:{i}", 3600)
print(f"Without pipeline: {time.perf_counter() - start:.3f}s")

# With pipeline: 1 round-trip for all 2000 commands
start = time.perf_counter()
pipe = r.pipeline(transaction=False)
for i in range(1000):
    pipe.set(f"key:{i}", i)
    pipe.expire(f"key:{i}", 3600)
pipe.execute()
print(f"With pipeline: {time.perf_counter() - start:.3f}s")
```

Typical speedup: 5-10x for batches of 100+ commands.

## MULTI/EXEC Transactions: Atomicity Guarantee

MULTI/EXEC ensures a block of commands executes atomically - no other client can interleave:

```bash
MULTI
SET balance:alice 900
SET balance:bob 1100
EXEC
```

All commands in the block succeed or none do (on errors, not on runtime failures).

## Key Differences

| Feature | Pipeline | MULTI/EXEC |
|---|---|---|
| Network optimization | Yes | Yes (also batched) |
| Atomicity | No | Yes |
| Command result usable in block | No | No |
| Performance overhead | Very low | Slightly higher (MULTI/EXEC overhead) |
| Error handling | Per-command | All-or-nothing on syntax errors |

## When to Use Each

Use **pipeline** when:
- You need to execute many independent commands quickly
- You do not need atomicity
- Maximum throughput is the goal

Use **MULTI/EXEC** when:
- Multiple operations must appear atomic (e.g., transferring funds)
- You need other clients to see either all changes or none

## Benchmark Comparison

```python
# Pipeline performance
start = time.perf_counter()
pipe = r.pipeline(transaction=False)
for i in range(10000):
    pipe.incr(f"counter:{i}")
pipe.execute()
print(f"Pipeline: {time.perf_counter() - start:.3f}s")

# MULTI/EXEC transaction performance
start = time.perf_counter()
pipe = r.pipeline(transaction=True)
for i in range(10000):
    pipe.incr(f"counter:{i}")
pipe.execute()
print(f"Transaction: {time.perf_counter() - start:.3f}s")
```

Pipelines are slightly faster because `MULTI` and `EXEC` commands add a small overhead.

## Optimistic Locking with WATCH

For conditional transactions, use WATCH:

```python
with r.pipeline() as pipe:
    while True:
        try:
            pipe.watch("balance:alice")
            current = int(pipe.get("balance:alice") or 0)
            if current >= 100:
                pipe.multi()
                pipe.decrby("balance:alice", 100)
                pipe.incrby("balance:bob", 100)
                pipe.execute()
                break
        except redis.WatchError:
            continue  # Retry if key was modified
```

## Summary

Use Redis pipelines for maximum throughput when atomicity is not needed - they batch commands over one round-trip without guarantees. Use MULTI/EXEC when operations must be atomic, accepting a small performance overhead. Pipelines offer better raw performance; transactions provide correctness guarantees. In Python, `transaction=False` on the pipeline object gives pure pipelining without MULTI/EXEC overhead.
