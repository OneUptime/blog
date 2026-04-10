# How to Implement a Mutex with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Mutex, Lock

Description: Implement a distributed mutex in Redis using SET NX PX for safe exclusive access to shared resources across multiple application servers.

---

When multiple servers need to update a shared resource - a payment record, a configuration file, a cron job - you need a distributed mutex to ensure only one server acts at a time. Redis provides the building blocks for a correct, deadlock-safe lock.

## Basic Mutex with SET NX

The SET NX (set if not exists) command combined with an expiration is the foundation of a Redis mutex:

```python
import redis
import time
import uuid

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def acquire_lock(resource: str, ttl_ms: int = 5000) -> str | None:
    """
    Attempt to acquire a lock on `resource`.
    Returns the lock token if acquired, None otherwise.
    ttl_ms: lock expiration to prevent deadlocks if the holder crashes.
    """
    token = str(uuid.uuid4())
    acquired = r.set(f"lock:{resource}", token, px=ttl_ms, nx=True)
    return token if acquired else None

def release_lock(resource: str, token: str) -> bool:
    """
    Release the lock only if we still own it.
    Uses a Lua script to ensure check-and-delete is atomic.
    """
    script = """
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
    else
        return 0
    end
    """
    result = r.eval(script, 1, f"lock:{resource}", token)
    return bool(result)
```

## Context Manager for Clean Usage

Wrap the lock in a context manager to ensure it is always released:

```python
import contextlib

@contextlib.contextmanager
def distributed_lock(resource: str, ttl_ms: int = 5000, retry_times: int = 3, retry_delay: float = 0.1):
    token = None
    for attempt in range(retry_times):
        token = acquire_lock(resource, ttl_ms)
        if token:
            break
        time.sleep(retry_delay * (2 ** attempt))  # exponential backoff

    if not token:
        raise TimeoutError(f"Could not acquire lock on '{resource}' after {retry_times} attempts")

    try:
        yield token
    finally:
        release_lock(resource, token)
```

## Using the Mutex

```python
def process_payment(payment_id: str, amount: float):
    with distributed_lock(f"payment:{payment_id}", ttl_ms=10000):
        # Only one server can execute this block at a time
        current = r.hget(f"payment:{payment_id}", "status")
        if current == "processed":
            return {"status": "already_processed"}

        # Simulate payment processing
        r.hset(f"payment:{payment_id}", mapping={
            "status": "processed",
            "amount": amount,
            "processed_at": time.time()
        })
        return {"status": "success"}

def run_cron_job(job_name: str):
    try:
        with distributed_lock(f"cron:{job_name}", ttl_ms=60000):
            execute_job(job_name)
    except TimeoutError:
        print(f"Job '{job_name}' already running on another server - skipping")
```

## Lock Extension for Long Operations

If your operation might outlast the TTL, extend the lock:

```python
def extend_lock(resource: str, token: str, ttl_ms: int) -> bool:
    """Set a new TTL on an owned lock."""
    script = """
    if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('PEXPIRE', KEYS[1], ARGV[2])
    else
        return 0
    end
    """
    result = r.eval(script, 1, f"lock:{resource}", token, ttl_ms)
    return bool(result)
```

## Lock Status Inspection

```python
def is_locked(resource: str) -> bool:
    return r.exists(f"lock:{resource}") > 0

def get_lock_ttl(resource: str) -> int:
    """Returns remaining TTL in milliseconds, or -2 if not locked."""
    return r.pttl(f"lock:{resource}")
```

## Summary

Redis SET NX PX provides the atomic set-if-not-exists-with-expiry primitive needed for a safe distributed mutex. The Lua-based conditional delete ensures the lock is only released by its owner, preventing one server from releasing a lock held by another. Always set a TTL to prevent deadlocks if the lock holder crashes.
