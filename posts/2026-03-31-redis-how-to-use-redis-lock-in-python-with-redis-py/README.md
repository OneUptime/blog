# How to Use Redis Lock in Python with redis-py

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Distributed Lock, redis-py, Concurrency

Description: Learn how to implement distributed locks in Python using Redis with redis-py's built-in Lock class, including timeout handling, context managers, and best practices.

---

## What Is a Redis Distributed Lock?

A distributed lock ensures that only one process or thread across multiple machines can access a shared resource at a time. Redis is an ideal lock store because:

- Atomic `SET NX PX` command prevents race conditions
- Automatic expiry (TTL) prevents deadlocks if a process crashes
- Fast in-memory operations minimize lock contention overhead

redis-py provides a built-in `Lock` class that handles all of this.

## Basic Lock Usage

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Acquire a lock with a 10-second timeout
lock = r.lock('my-resource', timeout=10)

# Try to acquire
acquired = lock.acquire(blocking=True)

if acquired:
    try:
        print("Lock acquired, doing work...")
        # Do your critical section work here
        import time
        time.sleep(2)
    finally:
        lock.release()
        print("Lock released")
else:
    print("Could not acquire lock")
```

## Using the Context Manager

The context manager is the recommended approach - it automatically releases the lock:

```python
import redis
from redis.exceptions import LockError

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

try:
    with r.lock('resource:payment-processor', timeout=30, blocking_timeout=5):
        print("Processing payment...")
        # Critical section
        process_payment()
        print("Payment processed")
except LockError:
    print("Could not acquire lock within 5 seconds")
```

## Lock Parameters Explained

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

lock = r.lock(
    name='my-lock',          # Key name in Redis
    timeout=30,              # Lock expires after 30s (prevents deadlock)
    sleep=0.1,               # Poll interval when blocking (seconds)
    blocking=True,           # Whether to block waiting for the lock
    blocking_timeout=10,     # Max time to wait for lock (seconds)
    thread_local=True        # Lock token is thread-local (thread safety)
)
```

## Non-Blocking Lock Attempt

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

lock = r.lock('resource:report-generator', timeout=60)

# Try once, don't wait
acquired = lock.acquire(blocking=False)

if acquired:
    try:
        generate_report()
    finally:
        lock.release()
else:
    print("Report generation already in progress, skipping")
```

## Extending Lock Timeout

For long-running tasks, extend the lock before it expires:

```python
import redis
import threading

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def extend_lock_periodically(lock, interval=10):
    """Extend lock every interval seconds while work is in progress."""
    stop_event = threading.Event()

    def extender():
        while not stop_event.wait(interval):
            try:
                lock.extend(additional_time=30)
                print("Lock extended")
            except Exception:
                break

    thread = threading.Thread(target=extender, daemon=True)
    thread.start()
    return stop_event

lock = r.lock('long-job', timeout=30, thread_local=False)

with lock:
    stop = extend_lock_periodically(lock, interval=10)
    try:
        # Long-running work
        import time
        time.sleep(60)
    finally:
        stop.set()
```

## Checking Lock Status

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

lock = r.lock('my-resource', timeout=30)

# Check if lock is currently held by anyone
is_locked = r.exists('my-resource')
print(f"Lock held: {bool(is_locked)}")

# Check TTL of lock
ttl = r.pttl('my-resource')
print(f"Lock expires in: {ttl}ms")

# Check if this instance owns the lock
lock.acquire()
owned = lock.owned()
print(f"Lock owned by this instance: {owned}")
lock.release()
```

## Practical Example - Job Deduplication

```python
import redis
from redis.exceptions import LockError
import hashlib

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def run_unique_job(job_type, job_params):
    """Ensure only one instance of a job runs at a time."""
    # Create a unique lock key based on job identity
    job_id = hashlib.md5(f"{job_type}:{job_params}".encode()).hexdigest()[:16]
    lock_key = f"job:{job_type}:{job_id}"

    try:
        with r.lock(lock_key, timeout=300, blocking_timeout=1):
            print(f"Running job {job_type} with params {job_params}")
            # Execute the job
            execute_job(job_type, job_params)
            print(f"Job {job_type} completed")
            return True
    except LockError:
        print(f"Job {job_type}:{job_id} is already running, skipping")
        return False

def execute_job(job_type, params):
    import time
    time.sleep(2)

run_unique_job('email_campaign', 'campaign_id=42')
```

## Multi-Resource Locking

For operations that require multiple locks, always acquire them in the same order to prevent deadlocks:

```python
import redis
from contextlib import contextmanager

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

@contextmanager
def multi_lock(resource_names, timeout=30, blocking_timeout=10):
    """Acquire multiple locks in sorted order to prevent deadlocks."""
    sorted_names = sorted(resource_names)
    locks = [r.lock(name, timeout=timeout, blocking_timeout=blocking_timeout) for name in sorted_names]
    acquired = []

    try:
        for lock in locks:
            lock.acquire()
            acquired.append(lock)
        yield
    finally:
        for lock in reversed(acquired):
            try:
                lock.release()
            except Exception:
                pass

with multi_lock(['resource:account:alice', 'resource:account:bob']):
    print("Both accounts locked for transfer")
```

## Summary

Redis locks in Python with redis-py's built-in `Lock` class provide a reliable distributed locking mechanism using atomic `SET NX PX` operations. Use the context manager pattern for automatic release, set appropriate timeouts to prevent deadlocks, and extend locks for long-running operations. Always handle `LockError` exceptions gracefully when `blocking_timeout` is set, and acquire multiple locks in consistent sorted order to avoid deadlocks.
