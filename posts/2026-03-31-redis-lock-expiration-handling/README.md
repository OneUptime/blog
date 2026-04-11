# How to Handle Lock Expiration in Redis Distributed Locks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Distributed Lock, Lock Expiration, Concurrency, Fencing Token

Description: Learn how to handle Redis distributed lock expiration safely, including detecting expired locks, preventing split-brain scenarios, and using fencing tokens for critical operations.

---

Lock expiration in Redis distributed locking is a double-edged sword: it prevents deadlocks when a client crashes, but it also creates a window where a slow client may still be executing while the lock has been acquired by another client. This guide covers how to handle this safely.

## The Expiration Problem

When a Redis lock TTL expires, the key is deleted. If the original lock holder is still executing (due to a GC pause, slow network, or long computation), it will:
1. Finish its work and try to unlock
2. Succeed in unlocking - but the lock now belongs to a different client
3. Cause data corruption because two clients executed the critical section concurrently

## Detecting Expired Locks with Validation

Check that the lock is still valid before committing changes:

```python
import redis
import time

VALIDATE_AND_DELETE = """
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
else
    return 0
end
"""

class DistributedLock:
    def __init__(self, r: redis.Redis, resource: str, token: str, ttl_ms: int):
        self.r = r
        self.resource = resource
        self.token = token
        self.ttl_ms = ttl_ms
        self.acquired_at = time.time()

    def is_still_valid(self) -> bool:
        """Check if the lock is still held by us."""
        current_token = self.r.get(self.resource)
        if current_token is None:
            return False
        if isinstance(current_token, bytes):
            current_token = current_token.decode()
        return current_token == self.token

    def remaining_validity_ms(self) -> int:
        """Return approximate remaining validity time."""
        elapsed_ms = int((time.time() - self.acquired_at) * 1000)
        return self.ttl_ms - elapsed_ms

    def release(self) -> bool:
        result = self.r.eval(VALIDATE_AND_DELETE, 1, self.resource, self.token)
        return result == 1
```

## The Fencing Token Pattern

The most reliable way to handle lock expiration is the fencing token. Every lock acquisition returns a monotonically increasing token. Resources check that incoming requests have the highest seen token:

```python
def acquire_lock_with_fencing(r: redis.Redis, resource: str, ttl_ms: int):
    """Acquire a lock and return a fencing token."""
    # Increment a global counter atomically
    fence_token = r.incr(f"fence:{resource}")

    token = str(uuid.uuid4())
    acquired = r.set(resource, f"{token}:{fence_token}", nx=True, px=ttl_ms)

    if acquired:
        return token, fence_token
    return None, None

# In your database/resource:
def update_order(order_id: int, data: dict, fence_token: int):
    """Only accept updates if fencing token is higher than last seen."""
    # Store last seen fence token in the database
    result = db.execute(
        "UPDATE orders SET data = %s, last_fence_token = %s "
        "WHERE id = %s AND (last_fence_token IS NULL OR last_fence_token < %s)",
        (json.dumps(data), fence_token, order_id, fence_token)
    )
    if result.rowcount == 0:
        raise Exception(f"Stale operation: fence token {fence_token} rejected")
```

## Handling Slow Operations Before Lock Expiry

Check remaining validity before expensive operations:

```python
def process_with_lock(r: redis.Redis, resource: str):
    token = str(uuid.uuid4())
    ttl_ms = 30000
    if not r.set(resource, token, nx=True, px=ttl_ms):
        return False, "Lock not available"

    lock = DistributedLock(r, resource, token, ttl_ms)

    try:
        # Phase 1: Read data
        data = fetch_data()

        # Check validity before expensive write operation
        if lock.remaining_validity_ms() < 5000:
            raise Exception("Lock expiring soon, aborting to prevent corruption")

        if not lock.is_still_valid():
            raise Exception("Lock expired during operation")

        # Phase 2: Write changes
        write_changes(data)
        return True, "Success"

    except Exception as e:
        return False, str(e)
    finally:
        lock.release()
```

## Retry Strategy for Expired Locks

When a lock expires, implement exponential backoff retry:

```python
import random

def acquire_with_retry(r: redis.Redis, resource: str, ttl_ms: int,
                       max_attempts: int = 5) -> tuple:
    for attempt in range(max_attempts):
        token = str(uuid.uuid4())
        if r.set(resource, token, nx=True, px=ttl_ms):
            return token, True

        # Exponential backoff with jitter
        base_wait = min(0.1 * (2 ** attempt), 2.0)
        wait_time = base_wait + random.uniform(0, base_wait * 0.1)
        time.sleep(wait_time)

    return None, False
```

## Summary

Lock expiration prevents deadlocks but creates a race condition between the lock holder and any new acquirer. Mitigate this by checking lock validity before committing operations, using fencing tokens for idempotent resource updates, and implementing exponential backoff retry when a lock is unavailable. Never assume the lock is still held just because you acquired it - always validate before side-effectful operations.
