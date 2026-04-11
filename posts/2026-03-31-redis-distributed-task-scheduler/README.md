# How to Build a Distributed Task Scheduler with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Task Scheduler, Distributed System, Sorted Set, Backend

Description: Build a distributed task scheduler with Redis sorted sets that schedules future tasks by Unix timestamp and dispatches them to workers without double-execution.

---

Cron jobs break down in distributed environments - multiple instances run the same job simultaneously. A Redis-backed task scheduler uses sorted sets scored by execution time and atomic pop operations to guarantee each task runs exactly once across your fleet.

## Scheduling Tasks

Add tasks to a sorted set scored by their scheduled Unix timestamp:

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)
SCHEDULER_KEY = "tasks:scheduled"

def schedule_task(task_id: str, payload: dict, run_at: float):
    r.zadd(SCHEDULER_KEY, {json.dumps({"id": task_id, **payload}): run_at})

# Schedule a task 5 minutes from now
schedule_task("send-report-101", {"type": "report", "user_id": 42}, time.time() + 300)
```

## Dispatching Due Tasks

A worker polls the sorted set for tasks whose score (run time) is in the past. Use `ZRANGEBYSCORE` to find due tasks and `ZREM` to atomically claim each one so no other worker can process it:

```python
def dispatch_due_tasks(worker_fn):
    now = time.time()
    # Get and remove all tasks due up to now
    due = r.zrangebyscore(SCHEDULER_KEY, 0, now, withscores=False)

    for raw in due:
        # Atomic removal - only one worker succeeds
        removed = r.zrem(SCHEDULER_KEY, raw)
        if removed:
            task = json.loads(raw)
            try:
                worker_fn(task)
            except Exception as e:
                reschedule_failed(task, e)
```

## Using ZPOPMIN for Safer Dispatch

`ZPOPMIN` atomically pops the task with the lowest score (earliest due time):

```python
def dispatch_one():
    result = r.zpopmin(SCHEDULER_KEY, count=1)
    if not result:
        return None
    raw, score = result[0]
    if score > time.time():
        # Not due yet - put it back
        r.zadd(SCHEDULER_KEY, {raw: score})
        return None
    return json.loads(raw)
```

## Rescheduling Failed Tasks

On failure, requeue the task with a delay using exponential backoff:

```python
def reschedule_failed(task: dict, error: Exception, max_attempts: int = 3):
    task["attempts"] = task.get("attempts", 0) + 1
    task["last_error"] = str(error)
    if task["attempts"] < max_attempts:
        delay = 2 ** task["attempts"] * 60  # 2m, 4m
        r.zadd(SCHEDULER_KEY, {json.dumps(task): time.time() + delay})
    else:
        r.rpush("tasks:failed", json.dumps(task))
```

## Monitoring the Schedule

```bash
# Count pending tasks
ZCARD tasks:scheduled

# Preview next 5 due tasks
ZRANGE tasks:scheduled 0 4 WITHSCORES

# Tasks due in the next 60 seconds
ZRANGEBYSCORE tasks:scheduled 0 <current_unix_plus_60>
```

## Summary

Redis sorted sets are a natural fit for task scheduling because scores represent execution time. Atomic `ZREM` or `ZPOPMIN` operations guarantee that only one worker claims each task even with many concurrent workers. Exponential backoff on failure and a dead-letter list ensure no task is silently lost.

