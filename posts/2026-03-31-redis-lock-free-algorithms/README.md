# How to Implement Lock-Free Algorithms with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lock-Free, Atomic Operation, Lua Script, Concurrency

Description: Learn how to implement lock-free algorithms in Redis using atomic commands, Lua scripts, and optimistic concurrency control to avoid distributed locking overhead.

---

Lock-free algorithms avoid mutual exclusion by using atomic operations that either succeed immediately or safely detect conflicts and retry. In Redis, this means using commands like `INCR`, `SETNX`, `GETSET`, and Lua scripts instead of acquiring a separate lock.

## Why Prefer Lock-Free Approaches?

- No lock acquisition latency
- No risk of deadlock
- Better throughput under high concurrency
- Simpler failure semantics

## Pattern 1: Compare and Swap (CAS)

Implement optimistic locking with a version number:

```python
import redis

CAS_SCRIPT = """
local current = redis.call('HGET', KEYS[1], 'version')
if current == ARGV[1] then
    redis.call('HSET', KEYS[1], 'balance', ARGV[2])
    redis.call('HINCRBY', KEYS[1], 'version', 1)
    return 1
else
    return 0
end
"""

def update_with_cas(r: redis.Redis, key: str, expected_version: str, new_data: str) -> bool:
    """Update value only if the version matches (optimistic locking)."""
    result = r.eval(CAS_SCRIPT, 1, key, expected_version, new_data)
    return result == 1

# Usage
def update_user_balance(r: redis.Redis, user_id: str, amount: int, max_retries: int = 5):
    key = f"user:{user_id}"
    for _ in range(max_retries):
        data = r.hgetall(key)
        version = data.get("version", "0")
        current_balance = int(data.get("balance", 0))
        new_balance = current_balance + amount
        new_data = str(new_balance)

        # Try to apply the update
        if update_with_cas(r, key, version, new_data):
            return new_balance
        # Version changed - retry with fresh read
    raise Exception("CAS failed after max retries - high contention")
```

## Pattern 2: Atomic Counter Operations

Use INCR/INCRBY for counters without any locking:

```python
def atomic_decrement_inventory(r: redis.Redis, item_id: str, quantity: int) -> int:
    """
    Decrement inventory atomically. Returns new count or -1 if insufficient.
    """
    DECREMENT_SCRIPT = """
    local current = tonumber(redis.call('GET', KEYS[1])) or 0
    if current < tonumber(ARGV[1]) then
        return -1
    end
    return redis.call('DECRBY', KEYS[1], ARGV[1])
    """
    result = r.eval(DECREMENT_SCRIPT, 1, f"inventory:{item_id}", quantity)
    return int(result)

# Usage
new_count = atomic_decrement_inventory(r, "product:42", 3)
if new_count == -1:
    print("Insufficient inventory")
else:
    print(f"Reserved 3 units. Remaining: {new_count}")
```

## Pattern 3: Append-Only Log

Build a lock-free event log using Redis lists:

```python
import json
import time

def append_event(r: redis.Redis, stream: str, event: dict) -> int:
    """Atomically append an event to a log. Returns log length."""
    event["timestamp"] = time.time()
    return r.rpush(f"events:{stream}", json.dumps(event))

def read_events(r: redis.Redis, stream: str, start: int = 0, end: int = -1) -> list:
    """Read a range of events from the log."""
    raw = r.lrange(f"events:{stream}", start, end)
    return [json.loads(e) for e in raw]

# Multiple writers can append concurrently - no lock needed
append_event(r, "order:42", {"type": "created", "amount": 99.99})
append_event(r, "order:42", {"type": "payment_received", "method": "card"})
append_event(r, "order:42", {"type": "shipped", "tracking": "1Z999AA1"})
```

## Pattern 4: Test-and-Set for Idempotent Operations

Ensure an operation runs exactly once:

```python
def run_once(r: redis.Redis, job_id: str, ttl_seconds: int = 86400) -> bool:
    """
    Returns True if this is the first call for job_id.
    Uses SETNX for atomic test-and-set.
    """
    key = f"job:done:{job_id}"
    result = r.set(key, "1", nx=True, ex=ttl_seconds)
    return result is not None

# Usage: Only one process will execute this, even under race conditions
if run_once(r, "send_welcome_email:user:456"):
    send_welcome_email(user_id=456)
    print("Email sent")
else:
    print("Email already sent, skipping")
```

## Pattern 5: Atomic Pipeline for Multi-Key Updates

Use MULTI/EXEC with WATCH for optimistic transactions:

```python
def transfer_balance(r: redis.Redis, from_key: str, to_key: str, amount: int):
    """Atomically transfer amount between two accounts."""
    with r.pipeline() as pipe:
        while True:
            try:
                pipe.watch(from_key, to_key)
                from_balance = int(pipe.get(from_key) or 0)
                to_balance = int(pipe.get(to_key) or 0)

                if from_balance < amount:
                    raise ValueError("Insufficient balance")

                pipe.multi()
                pipe.set(from_key, from_balance - amount)
                pipe.set(to_key, to_balance + amount)
                pipe.execute()
                return True
            except redis.WatchError:
                # Another client modified the keys - retry
                continue
```

## Summary

Lock-free algorithms in Redis use atomic primitives - Lua scripts for CAS operations, INCR/DECRBY for counters, SETNX for idempotent guards, RPUSH for append-only logs, and WATCH/MULTI/EXEC for optimistic transactions. These approaches avoid the overhead and failure modes of distributed locking while providing strong consistency guarantees for the specific operation being protected.
