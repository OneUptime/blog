# How to Implement a Barrier with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Barrier, Concurrency

Description: Implement a distributed barrier in Redis where N workers all pause at a checkpoint and resume together only when every participant has arrived.

---

A barrier is the opposite of a countdown latch: instead of a coordinator waiting for workers to finish, all workers wait for each other at a synchronization point before continuing. This is essential for phased distributed algorithms and batch processing pipelines where each phase must complete before the next begins.

## How a Barrier Works

```text
1. Each worker arrives and registers itself.
2. Workers that arrive early block and wait.
3. When the last worker arrives, ALL workers are released simultaneously.
4. All workers proceed to the next phase together.
```

## Implementation

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def barrier_create(barrier_id: str, party_count: int, ttl: int = 300):
    """Create a barrier expecting party_count participants."""
    pipe = r.pipeline()
    pipe.set(f"barrier:{barrier_id}:total", party_count, ex=ttl)
    pipe.delete(f"barrier:{barrier_id}:arrived")
    pipe.delete(f"barrier:{barrier_id}:open")
    pipe.execute()

def barrier_arrive_and_wait(barrier_id: str, worker_id: str, timeout: float = 60.0) -> bool:
    """
    Register arrival and block until all workers have arrived.
    Returns True when released, False on timeout.
    """
    total = int(r.get(f"barrier:{barrier_id}:total") or 0)
    if total == 0:
        raise ValueError(f"Barrier '{barrier_id}' not initialized")

    # Register this worker's arrival
    arrived = r.incr(f"barrier:{barrier_id}:arrived")

    # Last worker to arrive opens the gate
    if arrived >= total:
        r.set(f"barrier:{barrier_id}:open", 1, ex=300)
        r.publish(f"barrier:{barrier_id}:signal", "open")
        return True

    # Wait for the gate to open
    return _wait_for_barrier(barrier_id, timeout)

def _wait_for_barrier(barrier_id: str, timeout: float) -> bool:
    # Fast path: already open
    if r.exists(f"barrier:{barrier_id}:open"):
        return True

    pubsub = r.pubsub()
    pubsub.subscribe(f"barrier:{barrier_id}:signal")
    deadline = time.time() + timeout

    try:
        while True:
            remaining = deadline - time.time()
            if remaining <= 0:
                return False
            message = pubsub.get_message(timeout=min(remaining, 1.0))
            if message and message["type"] == "message" and message["data"] == "open":
                return True
            # Re-check in case we missed the signal
            if r.exists(f"barrier:{barrier_id}:open"):
                return True
    finally:
        pubsub.unsubscribe()
        pubsub.close()
```

## Usage: Phased Map-Reduce

```python
import threading

def run_phased_job(job_id: str, workers: int):
    barrier_create(f"{job_id}:phase1", workers)
    barrier_create(f"{job_id}:phase2", workers)
    results_phase1 = []

    def worker(worker_id: int):
        # Phase 1: map
        result = do_map_work(worker_id)
        r.rpush(f"phase1:results:{job_id}", result)

        # Wait for all workers to finish phase 1
        barrier_arrive_and_wait(f"{job_id}:phase1", str(worker_id))

        # Phase 2: reduce (all workers proceed together)
        do_reduce_work(worker_id)
        barrier_arrive_and_wait(f"{job_id}:phase2", str(worker_id))

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(workers)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

def do_map_work(worker_id: int) -> str:
    return f"result_{worker_id}"

def do_reduce_work(worker_id: int):
    pass
```

## Cyclic Barrier

A cyclic barrier resets after all workers pass through, allowing reuse across multiple phases:

```python
def barrier_reset(barrier_id: str, party_count: int, ttl: int = 300):
    pipe = r.pipeline()
    pipe.set(f"barrier:{barrier_id}:total", party_count, ex=ttl)
    pipe.set(f"barrier:{barrier_id}:arrived", 0, ex=ttl)
    pipe.delete(f"barrier:{barrier_id}:open")
    pipe.execute()
```

## Monitoring Barrier Progress

```python
def barrier_status(barrier_id: str) -> dict:
    pipe = r.pipeline(transaction=False)
    pipe.get(f"barrier:{barrier_id}:total")
    pipe.get(f"barrier:{barrier_id}:arrived")
    pipe.exists(f"barrier:{barrier_id}:open")
    total, arrived, is_open = pipe.execute()
    return {
        "total": int(total or 0),
        "arrived": int(arrived or 0),
        "waiting": int(total or 0) - int(arrived or 0),
        "open": bool(is_open)
    }
```

## Summary

A Redis barrier uses INCR to count arrivals and pub/sub to release waiting workers simultaneously. The last worker to arrive publishes the release signal, ensuring all workers proceed to the next phase at the same time. Cyclic barriers reset the counter for reuse across multiple synchronization points in long-running distributed jobs.
