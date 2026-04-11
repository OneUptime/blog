# How to Implement a Countdown Latch with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Latch, Concurrency

Description: Implement a distributed countdown latch in Redis to coordinate multiple workers, allowing a process to wait until N tasks have completed.

---

A countdown latch starts at N and blocks waiters until it reaches zero. It is the classic tool for waiting on a group of parallel tasks - "don't proceed until all 10 workers have finished initializing." Redis makes this work across distributed processes.

## How a Countdown Latch Works

```text
1. Initialize the latch with a count N.
2. Each worker calls countDown() when done - decrements the count.
3. A coordinator calls await() - blocks until count reaches 0.
4. Once count == 0, all waiters are unblocked.
```

## Implementation

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def latch_create(latch_id: str, count: int, ttl: int = 300):
    """Initialize the latch with count N."""
    pipe = r.pipeline()
    pipe.set(f"latch:{latch_id}:count", count, ex=ttl)
    pipe.delete(f"latch:{latch_id}:done")
    pipe.execute()

def latch_count_down(latch_id: str) -> int:
    """Decrement the latch. Returns new count. Signals done when count hits 0."""
    new_count = r.decr(f"latch:{latch_id}:count")
    if new_count <= 0:
        # Signal all waiters
        r.publish(f"latch:{latch_id}:signal", "done")
        r.set(f"latch:{latch_id}:done", 1, ex=300)
    return max(0, new_count)

def latch_get_count(latch_id: str) -> int:
    return int(r.get(f"latch:{latch_id}:count") or 0)
```

## Await with Pub/Sub

A coordinator waits for the latch to reach zero using pub/sub for instant notification:

```python
def latch_await(latch_id: str, timeout: float = 30.0) -> bool:
    """
    Block until latch reaches 0 or timeout expires.
    Returns True if latch reached 0, False if timed out.
    """
    pubsub = r.pubsub()
    pubsub.subscribe(f"latch:{latch_id}:signal")

    try:
        # Check after subscribing to avoid missing the signal
        if r.exists(f"latch:{latch_id}:done") or latch_get_count(latch_id) <= 0:
            return True

        deadline = time.time() + timeout
        while time.time() < deadline:
            remaining = deadline - time.time()
            if remaining <= 0:
                break
            message = pubsub.get_message(timeout=min(remaining, 1.0))
            if message and message["type"] == "message" and message["data"] == "done":
                return True
    finally:
        pubsub.unsubscribe()
        pubsub.close()
    return False
```

## Polling Fallback

For environments where pub/sub is not available, poll with backoff:

```python
def latch_await_poll(latch_id: str, timeout: float = 30.0, poll_interval: float = 0.1) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if latch_get_count(latch_id) <= 0:
            return True
        time.sleep(poll_interval)
    return False
```

## Usage Example: Parallel Data Pipeline

```python
import threading

def parallel_pipeline(job_id: str, chunks: list):
    latch_create(job_id, len(chunks), ttl=600)

    def process_chunk(chunk_data):
        try:
            # Do work
            result = transform(chunk_data)
            r.rpush(f"results:{job_id}", result)
        finally:
            latch_count_down(job_id)

    threads = [threading.Thread(target=process_chunk, args=(c,)) for c in chunks]
    for t in threads:
        t.start()

    # Wait for all chunks to finish
    if latch_await(job_id, timeout=120):
        all_results = r.lrange(f"results:{job_id}", 0, -1)
        return aggregate_results(all_results)
    else:
        raise TimeoutError(f"Pipeline {job_id} did not complete in time")

def transform(data):
    return data  # placeholder

def aggregate_results(results):
    return results
```

## Resettable Latch

To reuse a latch across iterations:

```python
def latch_reset(latch_id: str, count: int, ttl: int = 300):
    pipe = r.pipeline()
    pipe.set(f"latch:{latch_id}:count", count, ex=ttl)
    pipe.delete(f"latch:{latch_id}:done")
    pipe.execute()
```

## Summary

A Redis countdown latch using DECR and pub/sub coordinates distributed workers without shared memory. Workers decrement the counter independently, and a pub/sub signal on zero gives the coordinator instant notification. TTL-based expiration prevents stale latches from blocking new jobs if a worker crashes.
