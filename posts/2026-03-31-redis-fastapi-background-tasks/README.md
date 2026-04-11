# How to Use Redis for FastAPI Background Tasks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FastAPI, Background Task, Python, Queue

Description: Learn how to offload long-running work from FastAPI endpoints using Redis as a task queue with ARQ or direct list-based queues.

---

FastAPI's built-in `BackgroundTasks` runs work in the same process, which can block under load. Offloading tasks to Redis decouples execution and lets you scale workers independently.

## Choose Your Approach

Two common options are ARQ (an async Redis job queue) and a manual list-based queue using `redis.asyncio`. ARQ is the more production-ready choice.

## Install Dependencies

```bash
pip install fastapi uvicorn arq redis
```

## Define Tasks with ARQ

Create a `tasks.py` file:

```python
import asyncio
from arq.connections import RedisSettings

async def send_email(ctx, recipient: str, subject: str):
    # Simulate sending email
    await asyncio.sleep(2)
    print(f"Email sent to {recipient}: {subject}")

class WorkerSettings:
    functions = [send_email]
    redis_settings = RedisSettings(host="localhost", port=6379)
```

## Enqueue from FastAPI

```python
from fastapi import FastAPI
from arq import create_pool
from arq.connections import RedisSettings

app = FastAPI()

async def get_redis():
    return await create_pool(RedisSettings(host="localhost", port=6379))

@app.post("/send-notification")
async def send_notification(recipient: str, subject: str):
    redis = await get_redis()
    await redis.enqueue_job("send_email", recipient, subject)
    await redis.close()
    return {"status": "queued"}
```

## Run the Worker

```bash
arq tasks.WorkerSettings
```

## Manual List-Based Queue

If you prefer a lightweight approach without ARQ, push jobs to a Redis list:

```python
from redis.asyncio import Redis
import json

redis = Redis.from_url("redis://localhost:6379")

@app.post("/process")
async def process(data: dict):
    await redis.rpush("task_queue", json.dumps(data))
    return {"status": "enqueued"}
```

A separate worker pops from the list:

```python
import asyncio
from redis.asyncio import Redis
import json

async def worker():
    redis = Redis.from_url("redis://localhost:6379")
    while True:
        _, raw = await redis.blpop("task_queue")
        task = json.loads(raw)
        print(f"Processing: {task}")

asyncio.run(worker())
```

`BLPOP` blocks until an item is available, making the worker efficient with no busy-waiting.

## Track Job Status

Store results back in Redis with a TTL so the API can poll for completion:

```python
async def send_email(ctx, job_id: str, recipient: str):
    await asyncio.sleep(2)
    await ctx["redis"].setex(f"job:{job_id}", 300, "done")
```

```python
@app.get("/status/{job_id}")
async def job_status(job_id: str):
    redis = await get_redis()
    status = await redis.get(f"job:{job_id}")
    return {"status": status or "pending"}
```

## Monitor Queue Depth

```bash
redis-cli llen task_queue
```

For ARQ jobs, use the built-in health check:

```bash
arq --check tasks.WorkerSettings
```

## Summary

Redis-backed background tasks in FastAPI decouple long-running work from request handling. ARQ provides a mature async queue with retries and result tracking, while a manual list queue is simpler for lightweight use cases. Both approaches let you scale workers independently from the API process.
