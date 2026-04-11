# How to Build a FastAPI Real-Time Dashboard with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FastAPI, Real-Time, Dashboard, Server-Sent Event

Description: Build a real-time metrics dashboard with FastAPI and Redis using Server-Sent Events and Pub/Sub to push live updates to the browser.

---

A real-time dashboard needs a way to push updates to connected clients without polling. Combining FastAPI's `StreamingResponse` with Redis Pub/Sub creates a lightweight push mechanism that works in any browser without WebSocket complexity.

## Install Dependencies

```bash
pip install fastapi uvicorn redis
```

## Publish Metrics to Redis

A background process or another service publishes metrics to a Redis channel:

```python
import redis.asyncio as aioredis
import asyncio
import json
import random

async def publish_metrics():
    redis = aioredis.from_url("redis://localhost:6379")
    while True:
        payload = {
            "cpu": random.uniform(10, 90),
            "memory": random.uniform(30, 80),
            "requests_per_sec": random.randint(50, 500),
        }
        await redis.publish("dashboard:metrics", json.dumps(payload))
        await asyncio.sleep(1)
```

## Stream Updates via Server-Sent Events

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import redis.asyncio as aioredis
import json

app = FastAPI()

async def metrics_stream():
    redis = aioredis.from_url("redis://localhost:6379")
    pubsub = redis.pubsub()
    await pubsub.subscribe("dashboard:metrics")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"].decode()
                yield f"data: {data}\n\n"
    finally:
        await pubsub.unsubscribe("dashboard:metrics")
        await redis.close()

@app.get("/stream/metrics")
async def stream_metrics():
    return StreamingResponse(
        metrics_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

## Store Latest State in Redis

Persist the most recent snapshot so new clients get immediate data:

```python
import redis.asyncio as aioredis

redis_state = aioredis.from_url("redis://localhost:6379")

async def publish_and_store():
    while True:
        payload = {"cpu": random.uniform(10, 90), "memory": random.uniform(30, 80)}
        raw = json.dumps(payload)
        await redis_state.set("dashboard:latest", raw, ex=10)
        await redis_state.publish("dashboard:metrics", raw)
        await asyncio.sleep(1)

@app.on_event("startup")
async def startup():
    asyncio.create_task(publish_and_store())
```

## Client-Side JavaScript

```javascript
const source = new EventSource("/stream/metrics");
source.onmessage = (event) => {
  const metrics = JSON.parse(event.data);
  document.getElementById("cpu").textContent = metrics.cpu.toFixed(1) + "%";
  document.getElementById("mem").textContent = metrics.memory.toFixed(1) + "%";
};
```

## Serve the Dashboard HTML

```python
from fastapi.responses import HTMLResponse

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    return """
    <html><body>
      <h1>Live Dashboard</h1>
      <p>CPU: <span id="cpu">-</span></p>
      <p>Memory: <span id="mem">-</span></p>
      <script src="/static/dashboard.js"></script>
    </body></html>
    """
```

## Summary

FastAPI with Redis Pub/Sub and Server-Sent Events delivers a low-overhead real-time dashboard without WebSocket complexity. Publishers write metrics to a Redis channel, and each connected browser receives updates through a persistent HTTP stream. Storing the latest snapshot in Redis ensures new clients see data immediately on connect.
