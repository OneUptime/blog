# How to Handle Redis Connection in Long-Running Processes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Connection Management, Reliability

Description: Learn how to manage Redis connections reliably in long-running processes, including reconnect logic, connection validation, and handling idle timeouts.

---

Long-running processes like background workers, daemons, and queue consumers hold Redis connections open for hours or days. Without proper management, these connections silently break and operations start failing.

## The Problem: Silent Connection Loss

Redis and intermediate network devices (load balancers, firewalls) close idle connections. Your process may not notice until it tries to use the dead connection:

```text
Process starts --> Connects to Redis --> Works fine
[8 hours later]
AWS ELB closes idle connection after 350 seconds
Process tries GET --> Broken pipe error
```

## Use Socket Keepalive

Enable TCP keepalives so the OS detects broken connections proactively:

```python
import redis
import socket

client = redis.Redis(
    host="localhost",
    port=6379,
    socket_keepalive=True,
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 60,    # Start probes after 60s idle
        socket.TCP_KEEPINTVL: 10,   # Probe interval: 10s
        socket.TCP_KEEPCNT: 5,      # Drop after 5 failed probes
    },
    health_check_interval=30,  # redis-py built-in health check
)
```

## Reconnect on Error in a Worker Loop

```python
import redis
import time
import logging

logger = logging.getLogger(__name__)

def create_client():
    return redis.Redis(
        host="localhost",
        port=6379,
        socket_keepalive=True,
        health_check_interval=30,
        retry_on_timeout=True,
    )

def worker_loop():
    client = create_client()

    while True:
        try:
            # Main work
            item = client.blpop("jobs", timeout=5)
            if item:
                queue, data = item
                process_job(data)
        except (redis.ConnectionError, redis.TimeoutError) as e:
            logger.warning(f"Redis connection lost: {e}. Reconnecting in 5s...")
            time.sleep(5)
            try:
                client.close()
            except Exception:
                pass
            client = create_client()
        except Exception as e:
            logger.error(f"Job processing error: {e}")
```

## Validate Connection Before Use

For processes that use Redis infrequently, ping before each batch of operations:

```python
def ensure_connected(client: redis.Redis) -> redis.Redis:
    try:
        client.ping()
        return client
    except redis.ConnectionError:
        logger.warning("Redis connection stale, reconnecting...")
        return create_client()
```

## Long-Running Node.js Process

```javascript
const Redis = require("ioredis");

const client = new Redis({
  host: "localhost",
  port: 6379,
  keepAlive: 30000, // 30 second keepalive
  retryStrategy(times) {
    // Keep retrying indefinitely for long-running processes
    const delay = Math.min(1000 * Math.pow(2, times), 30000);
    console.log(`Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
});

client.on("error", (err) => {
  console.error("Redis error:", err.message);
});

client.on("reconnecting", (delay) => {
  console.log(`Reconnecting in ${delay}ms...`);
});

client.on("ready", () => {
  console.log("Redis connection ready");
});
```

## Handle Signals Gracefully

```python
import signal
import sys

def signal_handler(sig, frame):
    logger.info("Shutdown signal received. Closing Redis connection...")
    client.close()
    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)
```

## Summary

Long-running processes must actively maintain Redis connections through TCP keepalives, built-in health check intervals, and automatic reconnection logic. Always wrap the main processing loop in error handlers that reconnect on connection failures, and handle OS signals gracefully to release connections cleanly on shutdown.
