# How to Use Redis with Prefect for Flow State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Prefect, Workflow

Description: Learn how to use Redis with Prefect as a result storage backend, task caching layer, and real-time flow progress store for external monitoring.

---

Prefect manages workflow orchestration state in its own database, but Redis integrates naturally as a result cache, a cross-flow coordination mechanism, and a fast status lookup store for external systems.

## Configure Prefect to Use Redis for Task Results

Prefect supports persistent result storage. Use a custom block with Redis:

```python
from prefect import task, flow
import redis
import hashlib

cache_client = redis.Redis(host="localhost", port=6379)

def make_result_key(task_name: str, *args, **kwargs) -> str:
    content = f"{task_name}:{str(args)}:{str(sorted(kwargs.items()))}"
    return f"prefect:result:{hashlib.sha256(content.encode()).hexdigest()[:16]}"
```

## Implement Task-Level Caching with Redis

```python
from prefect import task, flow
import redis
import pickle
import functools
import hashlib

cache = redis.Redis(host="localhost", port=6379)

def redis_cache(ttl: int = 3600):
    """Decorator to cache Prefect task results in Redis."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = f"prefect:cache:{fn.__name__}:{hashlib.md5(str(args).encode()).hexdigest()}"
            cached = cache.get(key)
            if cached is not None:
                return pickle.loads(cached)

            result = fn(*args, **kwargs)
            cache.set(key, pickle.dumps(result), ex=ttl)
            return result
        return wrapper
    return decorator

@task
@redis_cache(ttl=600)
def fetch_exchange_rates(base_currency: str) -> dict:
    """Expensive API call - cache result for 10 minutes."""
    import httpx
    resp = httpx.get(f"https://api.example.com/rates?base={base_currency}")
    return resp.json()
```

## Publish Flow Progress to Redis

```python
from prefect import task, flow
import redis
import time

progress_store = redis.Redis(host="localhost", port=6379, decode_responses=True)

def publish_progress(flow_run_id: str, step: str, pct: int, message: str = ""):
    key = f"prefect:progress:{flow_run_id}"
    progress_store.hset(key, mapping={
        "step": step,
        "pct": pct,
        "message": message,
        "updated_at": time.time(),
    })
    progress_store.expire(key, 7200)

@task
def process_batch(flow_run_id: str, batch_num: int, total_batches: int):
    pct = round((batch_num / total_batches) * 100)
    publish_progress(flow_run_id, f"batch_{batch_num}", pct)
    # ... actual processing

@flow
def data_pipeline(dataset_id: str):
    import prefect.context
    flow_run_id = prefect.context.get_run_context().flow_run.id
    batches = get_batches(dataset_id)

    for i, batch in enumerate(batches, 1):
        process_batch(str(flow_run_id), i, len(batches))

    publish_progress(str(flow_run_id), "complete", 100)
```

## Read Flow Progress from an API

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/flow-status/{flow_run_id}")
async def get_flow_status(flow_run_id: str):
    key = f"prefect:progress:{flow_run_id}"
    status = progress_store.hgetall(key)
    if not status:
        return {"status": "not_found"}
    return status
```

## Distributed Lock for Singleton Flows

```python
@flow
def singleton_flow(resource_id: str):
    lock_key = f"prefect:lock:{resource_id}"
    lock = cache.set(lock_key, "running", nx=True, ex=3600)

    if not lock:
        print(f"Flow already running for {resource_id}, skipping")
        return

    try:
        # Flow body
        do_work(resource_id)
    finally:
        cache.delete(lock_key)
```

## Summary

Redis integrates with Prefect as a task result cache to avoid re-running expensive tasks, a flow progress store for external monitoring without polling Prefect's API, and a distributed lock mechanism to prevent concurrent execution of singleton flows. Use TTLs that match or exceed your typical flow duration to prevent cache expiry during execution.
