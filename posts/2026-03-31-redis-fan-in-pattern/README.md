# How to Implement Fan-In Pattern with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Fan-In, Aggregation, Python

Description: Learn how to implement the fan-in pattern with Redis, aggregating results from multiple parallel workers into a single collection point for further processing.

---

Fan-in is the reverse of fan-out: multiple producers or parallel workers funnel their results into a single stream or queue for aggregation. This is common in map-reduce workflows, report generation, and multi-source data pipelines.

## Use Case: Parallel Processing with Result Aggregation

A job spawns N worker tasks. Each worker processes a chunk and writes its result to a shared Redis list. A collector waits until all results arrive, then merges them.

## Approach 1: List-Based Fan-In

```python
import redis
import json
import uuid
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def run_parallel_jobs(job_id: str, chunks: list):
    result_key = f"fanin:results:{job_id}"
    total_workers = len(chunks)

    def worker(chunk, index):
        # Simulate processing
        result = {"worker": index, "count": len(chunk), "sum": sum(chunk)}
        r.rpush(result_key, json.dumps(result))
        print(f"Worker {index} done")

    threads = []
    for i, chunk in enumerate(chunks):
        t = threading.Thread(target=worker, args=(chunk, i))
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    return collect_results(result_key, total_workers)

def collect_results(result_key: str, expected: int) -> list:
    results = []
    for _ in range(expected):
        # BLPOP blocks until an item is available
        item = r.blpop(result_key, timeout=30)
        if item:
            results.append(json.loads(item[1]))
    return results

# Example
job_id = str(uuid.uuid4())
chunks = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]
results = run_parallel_jobs(job_id, chunks)
total_sum = sum(r["sum"] for r in results)
print(f"Aggregated sum: {total_sum}")  # 78
```

## Approach 2: Stream-Based Fan-In with Tracking

Use a Redis Stream as the fan-in sink and a Hash to track completion.

```python
def fan_in_with_tracking(job_id: str, worker_ids: list):
    stream_key = f"fanin:stream:{job_id}"
    tracker_key = f"fanin:done:{job_id}"

    def worker(wid: str, data: list):
        result = {"worker_id": wid, "result": sum(data)}
        r.xadd(stream_key, result)
        r.hset(tracker_key, wid, "done")
        r.expire(tracker_key, 3600)

    # Simulate parallel workers
    workers = [
        threading.Thread(target=worker, args=(wid, list(range(i * 10, i * 10 + 10))))
        for i, wid in enumerate(worker_ids)
    ]
    for w in workers:
        w.start()
    for w in workers:
        w.join()

    # Collect from stream
    messages = r.xrange(stream_key)
    results = [fields for _, fields in messages]

    # Cleanup
    r.delete(stream_key, tracker_key)
    return results
```

## Checking Completion Status

```python
def all_workers_done(job_id: str, expected: int) -> bool:
    tracker_key = f"fanin:done:{job_id}"
    done_count = r.hlen(tracker_key)
    return done_count >= expected
```

## Redis CLI Inspection

```bash
# Check list length (results waiting)
redis-cli LLEN fanin:results:job-abc

# View the first result (non-destructive)
redis-cli LRANGE fanin:results:job-abc 0 0

# Check completion tracker
redis-cli HGETALL fanin:done:job-abc
```

## Cleanup After Aggregation

```python
def cleanup_job(job_id: str):
    keys = r.keys(f"fanin:*:{job_id}")
    if keys:
        r.delete(*keys)
```

## Summary

The fan-in pattern collects outputs from parallel workers into a single Redis List or Stream. Using `RPUSH` / `BLPOP` provides a simple blocking collect loop, while Streams add replay capability and better visibility. Always set TTLs or explicitly clean up result keys to avoid memory accumulation.

