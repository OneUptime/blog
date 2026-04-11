# How to Use PING in Redis to Test Server Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Connectivity, Health Check, Command, Monitoring

Description: Learn how to use the PING command in Redis to test server connectivity, measure round-trip latency, and build health checks for your Redis-dependent applications.

---

## What Is PING in Redis

`PING` is the simplest Redis command - it tests whether the server is alive and reachable. It is used for connectivity checks, health monitoring, and measuring round-trip latency. `PING` can also echo back a custom message.

```text
PING [message]
```

- No arguments: returns `PONG`
- With a message: echoes back the message

## Basic Usage

```bash
PING
# PONG

PING "hello redis"
# "hello redis"

PING 42
# "42"
```

## Testing Connectivity from CLI

```bash
# Basic connectivity test
redis-cli PING

# With latency measurement
redis-cli --latency

# Continuous ping for latency monitoring
redis-cli --latency-history

# Color-coded latency spectrum (continuous)
redis-cli --latency-dist
```

## Practical Example in Python

```python
import redis
import time

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Basic ping
response = client.ping()
print(f"Server alive: {response}")  # True

# Ping with message (returns the message back)
echo = client.execute_command('PING', 'health-check')
print(f"Echo: {echo}")  # health-check

# Measure round-trip time
def measure_latency(client, samples=10):
    times = []
    for _ in range(samples):
        start = time.perf_counter()
        client.ping()
        elapsed = (time.perf_counter() - start) * 1000
        times.append(elapsed)

    avg = sum(times) / len(times)
    min_t = min(times)
    max_t = max(times)
    return {'avg_ms': round(avg, 3), 'min_ms': round(min_t, 3), 'max_ms': round(max_t, 3)}

latency = measure_latency(client)
print(f"Latency - avg: {latency['avg_ms']}ms, min: {latency['min_ms']}ms, max: {latency['max_ms']}ms")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Basic ping
const response = await client.ping();
console.log(`Server response: ${response}`); // PONG

// Ping with message
const echo = await client.ping('health-check-123');
console.log(`Echo: ${echo}`); // health-check-123

// Latency measurement
async function measureLatency(samples = 10) {
  const times = [];
  for (let i = 0; i < samples; i++) {
    const start = process.hrtime.bigint();
    await client.ping();
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
    times.push(elapsed);
  }
  const avg = times.reduce((a, b) => a + b) / times.length;
  return {
    avgMs: avg.toFixed(3),
    minMs: Math.min(...times).toFixed(3),
    maxMs: Math.max(...times).toFixed(3),
  };
}

const latency = await measureLatency();
console.log(`Avg: ${latency.avgMs}ms, Min: ${latency.minMs}ms, Max: ${latency.maxMs}ms`);
```

## Health Check Implementation

```python
import redis
import time

def redis_health_check(host='localhost', port=6379, timeout=2.0):
    """
    Perform a health check on Redis.
    Returns dict with status, latency, and error info.
    """
    try:
        client = redis.Redis(
            host=host,
            port=port,
            socket_connect_timeout=timeout,
            socket_timeout=timeout,
            decode_responses=True
        )

        start = time.perf_counter()
        response = client.ping()
        latency_ms = (time.perf_counter() - start) * 1000

        return {
            'status': 'healthy',
            'latency_ms': round(latency_ms, 2),
            'response': response,
            'host': f"{host}:{port}"
        }

    except redis.ConnectionError as e:
        return {
            'status': 'unhealthy',
            'error': f"Connection failed: {e}",
            'host': f"{host}:{port}"
        }
    except redis.TimeoutError:
        return {
            'status': 'unhealthy',
            'error': 'Timeout',
            'host': f"{host}:{port}"
        }

health = redis_health_check()
print(health)
# {'status': 'healthy', 'latency_ms': 0.45, 'response': True, 'host': 'localhost:6379'}
```

## PING in Pub/Sub Mode

In subscriber mode, most commands are restricted. `PING` is one of the few allowed:

```bash
SUBSCRIBE notifications

# In subscriber mode, a limited set of commands is allowed:
PING                    # Returns ["pong", ""]
PING "subscriber alive" # Returns ["pong", "subscriber alive"]
SUBSCRIBE ch2           # Add more subscriptions
UNSUBSCRIBE             # Leave channels
# Also allowed: PSUBSCRIBE, PUNSUBSCRIBE, SSUBSCRIBE, SUNSUBSCRIBE, RESET, QUIT
```

This makes `PING` useful for keepalive checks in long-running subscriber connections:

```python
import redis
import threading
import time

def keepalive(pubsub, interval=30):
    """Send periodic PING to keep the subscriber connection alive."""
    while True:
        time.sleep(interval)
        pubsub.ping()
        print("Keepalive ping sent")

client = redis.Redis(host='localhost', port=6379, decode_responses=True)
pubsub = client.pubsub()
pubsub.subscribe('my-channel')

# Start keepalive thread
t = threading.Thread(target=keepalive, args=(pubsub,), daemon=True)
t.start()
```

## Using PING in Connection Pools

```python
import redis

pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    decode_responses=True,
    health_check_interval=30  # Auto-ping every 30 seconds
)

client = redis.Redis(connection_pool=pool)
```

## Monitoring Script

```bash
#!/bin/bash
# Monitor Redis connectivity every 10 seconds

HOST="localhost"
PORT="6379"

while true; do
    RESPONSE=$(redis-cli -h "$HOST" -p "$PORT" PING 2>&1)
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    if [ "$RESPONSE" = "PONG" ]; then
        echo "$TIMESTAMP - OK: $HOST:$PORT responded PONG"
    else
        echo "$TIMESTAMP - ERROR: $HOST:$PORT - $RESPONSE"
    fi

    sleep 10
done
```

## Summary

`PING` is Redis's fundamental connectivity test command, returning `PONG` or echoing back a provided message. Use it for health checks, latency measurement, keepalive signals in subscriber connections, and verifying connectivity at application startup. Most client libraries call `PING` automatically during connection pool health checks via the `health_check_interval` setting.
