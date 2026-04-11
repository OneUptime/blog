# How to Implement Redis Connection Warm-Up

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Connection Management

Description: Learn how to pre-warm Redis connection pools at application startup to eliminate cold-start latency spikes on the first requests after deployment.

---

When an application starts, connection pool slots are empty. The first burst of requests all race to establish connections simultaneously, causing latency spikes. Connection warm-up pre-creates connections before traffic arrives.

## Why Warm-Up Matters

Without warm-up, the first N requests after startup (where N is pool size) each pay connection establishment cost:

```text
Without warm-up:
  t=0ms: 50 requests arrive
  t=10ms: 50 connections being established concurrently
  t=50ms: Requests complete (50ms extra latency each)

With warm-up:
  t=-5s: Application creates 50 connections proactively
  t=0ms: 50 requests arrive
  t=2ms: Requests complete (connections already ready)
```

## Warm-Up in Python with redis-py

```python
import redis
import logging

logger = logging.getLogger(__name__)

def warm_up_pool(pool: redis.ConnectionPool, target_connections: int = 10):
    """Pre-create connections in the pool before serving traffic."""
    connections = []
    warmed = 0

    for i in range(target_connections):
        try:
            conn = pool.get_connection("_")
            conn.send_command("PING")
            conn.read_response()
            connections.append(conn)
            warmed += 1
        except Exception as e:
            logger.warning(f"Warm-up connection {i} failed: {e}")
            break

    # Return all connections to the pool
    for conn in connections:
        pool.release(conn)

    logger.info(f"Warmed up {warmed}/{target_connections} Redis connections")
    return warmed

# Usage at application startup
pool = redis.ConnectionPool(host="localhost", port=6379, max_connections=50)
client = redis.Redis(connection_pool=pool)
warm_up_pool(pool, target_connections=20)
```

## Async Warm-Up with aioredis

```python
import asyncio
import redis.asyncio as aioredis

async def warm_up_async_pool(client: aioredis.Redis, target: int = 10):
    """Issue concurrent PINGs to pre-establish async connections."""
    tasks = [client.ping() for _ in range(target)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    success = sum(1 for r in results if r is True)
    print(f"Warmed up {success}/{target} async Redis connections")

async def startup():
    pool = aioredis.ConnectionPool.from_url(
        "redis://localhost:6379",
        max_connections=50,
    )
    client = aioredis.Redis(connection_pool=pool)
    await warm_up_async_pool(client, target=20)
    return client
```

## FastAPI Startup Event

```python
from fastapi import FastAPI
import redis.asyncio as aioredis

app = FastAPI()
redis_client = None

@app.on_event("startup")
async def startup_event():
    global redis_client
    pool = aioredis.ConnectionPool.from_url(
        "redis://localhost:6379",
        max_connections=50,
    )
    redis_client = aioredis.Redis(connection_pool=pool)
    await warm_up_async_pool(redis_client, target=20)
```

## Node.js Warm-Up with ioredis

A single ioredis client uses one TCP connection (not a pool), so warm-up ensures that connection is established before traffic arrives:

```javascript
const Redis = require("ioredis");

async function warmUp(client) {
  try {
    await client.ping();
    console.log("Redis connection warmed up and ready");
  } catch (err) {
    console.error("Redis warm-up failed:", err.message);
  }
}

async function main() {
  const client = new Redis({ host: "localhost", port: 6379 });
  await warmUp(client);
  // Now start accepting HTTP traffic
  startServer();
}
```

## Kubernetes Readiness Probe

Combine warm-up with a readiness probe so Kubernetes only sends traffic after connections are ready:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Summary

Redis connection warm-up pre-establishes pool connections at application startup, eliminating the latency spike that occurs when the first production requests race to connect. Issue concurrent PINGs equal to your target pre-warmed connections, do this before opening the application to traffic, and combine with Kubernetes readiness probes to ensure a smooth deployment.
