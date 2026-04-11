# How to Implement Redis Connection Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Health Check, Reliability

Description: Learn how to implement Redis connection health checks to detect stale connections, validate pool health, and integrate with application readiness probes.

---

Stale connections - ones that appear open but are actually broken - cause mysterious failures. Health checks proactively detect broken connections before they cause request failures.

## Built-in Health Check in redis-py

```python
import redis
import socket

# health_check_interval runs PING on idle connections every N seconds
client = redis.Redis(
    host="localhost",
    port=6379,
    health_check_interval=30,  # seconds
    socket_keepalive=True,
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 60,
        socket.TCP_KEEPINTVL: 10,
        socket.TCP_KEEPCNT: 5,
    },
)
```

## Manual Health Check Function

```python
import redis
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def check_redis_health(client: redis.Redis) -> dict:
    result = {
        "status": "unhealthy",
        "latency_ms": None,
        "error": None,
    }
    try:
        import time
        start = time.monotonic()
        response = client.ping()
        latency = (time.monotonic() - start) * 1000

        if response:
            result["status"] = "healthy"
            result["latency_ms"] = round(latency, 2)
    except redis.ConnectionError as e:
        result["error"] = f"Connection error: {e}"
    except redis.TimeoutError as e:
        result["error"] = f"Timeout: {e}"
    except Exception as e:
        result["error"] = f"Unexpected error: {e}"

    return result
```

## HTTP Health Endpoint with FastAPI

```python
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import redis

app = FastAPI()
redis_client = redis.Redis(host="localhost", port=6379, socket_timeout=2)

@app.get("/health/redis")
async def redis_health():
    health = check_redis_health(redis_client)
    status_code = 200 if health["status"] == "healthy" else 503
    return JSONResponse(content=health, status_code=status_code)
```

## Kubernetes Readiness Probe

```yaml
readinessProbe:
  exec:
    command:
      - redis-cli
      - -h
      - localhost
      - ping
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3
```

## Health Check in Node.js with ioredis

```javascript
const Redis = require("ioredis");

const client = new Redis({ host: "localhost", port: 6379 });

async function checkRedisHealth() {
  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    return { status: "healthy", latencyMs };
  } catch (err) {
    return { status: "unhealthy", error: err.message };
  }
}

// Expose as HTTP endpoint (Express example)
const express = require("express");
const app = express();

app.get("/health/redis", async (req, res) => {
  const health = await checkRedisHealth();
  res.status(health.status === "healthy" ? 200 : 503).json(health);
});
```

## Pool-Level Health Check

For connection pools, validate that idle connections are still alive:

```python
def validate_pool_health(pool: redis.ConnectionPool) -> dict:
    stats = {
        "available": pool._available_connections.__len__(),
        "in_use": pool._in_use_connections.__len__(),
    }
    # Test one connection from the pool
    test_client = redis.Redis(connection_pool=pool)
    health = check_redis_health(test_client)
    stats.update(health)
    return stats
```

## Summary

Redis health checks prevent stale connections from causing silent failures. Use built-in `health_check_interval` for automatic background checks, implement manual PING-based health endpoints for Kubernetes readiness probes, and monitor latency alongside connectivity status to catch degraded but technically connected scenarios.
