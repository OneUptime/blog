# How to Implement a Distributed Barrier with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Distributed Barrier, Synchronization, Coordination, Backend

Description: Implement a distributed barrier in Redis that blocks multiple services from proceeding until all participants have reached a checkpoint, using atomic operations.

---

A distributed barrier is a synchronization primitive that makes all participating processes wait until every participant has arrived at a common checkpoint before any of them proceeds. Redis makes this pattern easy with atomic increment operations and simple polling.

## Core Barrier Implementation

Each participant increments a counter and then waits until the counter equals the expected total:

```python
import redis
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

class DistributedBarrier:
    def __init__(self, name: str, parties: int, timeout: int = 30):
        self.key = f"barrier:{name}"
        self.parties = parties
        self.timeout = timeout

    def arrive(self) -> bool:
        """Signal arrival. Returns True if this participant completes the barrier."""
        count = r.incr(self.key)
        # Set expiry on first arrival to prevent stale barriers
        if count == 1:
            r.expire(self.key, self.timeout * 2)
        return count >= self.parties

    def wait(self, poll_interval: float = 0.1) -> bool:
        """Block until all parties have arrived or timeout expires."""
        deadline = time.time() + self.timeout
        while time.time() < deadline:
            count = int(r.get(self.key) or 0)
            if count >= self.parties:
                return True
            time.sleep(poll_interval)
        return False

    def reset(self):
        r.delete(self.key)
```

## Usage Example

Three worker services must all complete their data processing phase before the aggregation step begins:

```python
barrier = DistributedBarrier("data-processing-phase1", parties=3, timeout=60)

# In each of the 3 workers
def worker_phase1(worker_id: int):
    process_data(worker_id)
    print(f"Worker {worker_id} arrived at barrier")
    barrier.arrive()
    success = barrier.wait()
    if success:
        print(f"Worker {worker_id} proceeding to phase 2")
        worker_phase2(worker_id)
    else:
        print(f"Worker {worker_id} timed out at barrier")
```

## One-Time Barrier with Auto-Reset

For pipelines that run barriers repeatedly, reset after all workers pass:

```python
class ReusableBarrier:
    def __init__(self, name: str, parties: int):
        self.name = name
        self.parties = parties
        self.generation = 0

    def _key(self):
        return f"barrier:{self.name}:gen{self.generation}"

    def arrive_and_wait(self, timeout: int = 30) -> bool:
        key = self._key()
        count = r.incr(key)
        if count == 1:
            r.expire(key, timeout * 2)
        deadline = time.time() + timeout
        while time.time() < deadline:
            if int(r.get(key) or 0) >= self.parties:
                # All participants bump generation so every instance
                # uses the next key on the following round
                self.generation += 1
                return True
            time.sleep(0.1)
        return False
```

## Monitoring Barrier State

```bash
# Check how many workers have arrived
GET barrier:data-processing-phase1

# Check time remaining
TTL barrier:data-processing-phase1
```

## Summary

A Redis distributed barrier uses atomic `INCR` to count arrivals and polling to block until all parties are ready. Setting a TTL on the barrier key prevents indefinite blocking if a participant crashes. Reusable barriers use a generation counter so the same barrier can be used across multiple pipeline runs.

