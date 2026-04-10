# How to Use Redis with Temporal for Workflow State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Temporal, Workflow

Description: Learn how to integrate Redis with Temporal workflows to cache activity results, store workflow metadata, and implement fast side-effect caching.

---

Temporal handles durable workflow state internally, but there are several patterns where Redis complements Temporal: caching expensive activity results, storing computed metadata accessible outside the workflow, and coordinating across workflow boundaries.

## Pattern 1: Cache Expensive Activity Results

Temporal retries failed activities, which can re-run expensive operations. Cache results in Redis so retries skip the computation:

```python
import temporalio.activity
import redis
import json

cache = redis.Redis(host="localhost", port=6379, decode_responses=True)

@temporalio.activity.defn
async def fetch_user_profile(user_id: str) -> dict:
    cache_key = f"workflow:user_profile:{user_id}"

    cached = cache.get(cache_key)
    if cached:
        return json.loads(cached)

    # Expensive operation - fetch from database
    profile = await database.get_user(user_id)

    # Cache for 10 minutes - longer than max workflow duration
    cache.set(cache_key, json.dumps(profile), ex=600)
    return profile
```

## Pattern 2: Publish Workflow Progress for External Consumers

Temporal workflow state is internal. Use Redis to make progress visible to dashboards or APIs:

```python
import temporalio.workflow
import temporalio.activity
import redis
from datetime import timedelta

progress_cache = redis.Redis(host="localhost", port=6379, decode_responses=True)

@temporalio.activity.defn
async def update_progress(workflow_id: str, step: str, pct: int):
    key = f"workflow:progress:{workflow_id}"
    progress_cache.hset(key, mapping={"step": step, "pct": pct})
    progress_cache.expire(key, 3600)  # expire after 1 hour

@temporalio.workflow.defn
class OrderProcessingWorkflow:
    @temporalio.workflow.run
    async def run(self, order_id: str) -> str:
        workflow_id = temporalio.workflow.info().workflow_id

        await temporalio.workflow.execute_activity(
            update_progress, args=[workflow_id, "payment_verification", 10],
            schedule_to_close_timeout=timedelta(seconds=30),
        )
        # ... more steps

# Read progress from external service
def get_workflow_progress(workflow_id: str) -> dict:
    return progress_cache.hgetall(f"workflow:progress:{workflow_id}")
```

## Pattern 3: Cross-Workflow Coordination with Redis

Coordinate between workflow instances using Redis Locks:

```python
import redis

lock_client = redis.Redis(host="localhost", port=6379)

@temporalio.activity.defn
async def acquire_resource_lock(resource_id: str, workflow_id: str) -> bool:
    lock_key = f"workflow:lock:{resource_id}"
    # NX = only set if not exists, EX = expiry in seconds
    result = lock_client.set(lock_key, workflow_id, nx=True, ex=300)
    return result is not None

@temporalio.activity.defn
async def release_resource_lock(resource_id: str, workflow_id: str):
    lock_key = f"workflow:lock:{resource_id}"
    # Atomic check-and-delete via Lua to prevent race conditions
    release_script = """
    if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
    else
        return 0
    end
    """
    lock_client.eval(release_script, 1, lock_key, workflow_id)
```

## Pattern 4: Memoize Signal Handlers

```python
from datetime import timedelta

@temporalio.activity.defn
async def check_and_mark_event(event_id: str) -> bool:
    """Returns True if this is a new event, False if already processed."""
    dedup_key = f"workflow:event:{event_id}"
    return cache.set(dedup_key, "1", nx=True, ex=86400) is not None

@temporalio.workflow.defn
class LongRunningWorkflow:
    def __init__(self):
        self._pending_events = []

    @temporalio.workflow.signal
    async def process_event(self, event_id: str, event_data: dict):
        self._pending_events.append((event_id, event_data))

    @temporalio.workflow.run
    async def run(self):
        while True:
            await temporalio.workflow.wait_condition(
                lambda: len(self._pending_events) > 0
            )
            event_id, event_data = self._pending_events.pop(0)

            # Deduplicate events using Redis via activity
            is_new = await temporalio.workflow.execute_activity(
                check_and_mark_event, args=[event_id],
                schedule_to_close_timeout=timedelta(seconds=10),
            )
            if is_new:
                await self._handle_event(event_data)
```

## Summary

Redis complements Temporal by caching expensive activity results to speed up retries, publishing workflow progress to external consumers, and coordinating across workflow instances with distributed locks. Keep Redis usage in activities rather than workflow code, and set TTLs longer than your maximum workflow duration to avoid cache misses during long-running workflows.
