# How to Implement Leaky Bucket Rate Limiting with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Rate Limiting, API

Description: Implement the leaky bucket rate limiting algorithm in Redis to enforce a strictly smooth outflow rate and prevent traffic bursts.

---

The leaky bucket algorithm enforces a constant output rate regardless of input bursts. Think of it as a bucket with a hole at the bottom - water pours in at any rate, but drips out at a fixed steady rate. This guarantees uniform request processing and is ideal for protecting downstream services from spikes.

## How Leaky Bucket Works

- Requests enter the bucket (queue)
- The bucket drains at a fixed rate
- If the bucket is full, new requests are dropped
- Unlike token bucket, there is no bursting - the output rate is always constant

## Implementation Using Redis Sorted Sets

Use a sorted set where the score is the scheduled processing time, spaced by `1 / rate` seconds:

```python
import redis
import time
import uuid

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def leaky_bucket_allow(identifier: str, rate: float = 10.0, capacity: int = 20) -> bool:
    """
    rate: requests allowed per second (drip rate)
    capacity: maximum bucket size
    """
    key = f"leaky:{identifier}"
    now = time.time()
    interval = 1.0 / rate  # time between each allowed request

    pipe = r.pipeline()

    # Remove processed entries (scheduled time has passed)
    pipe.zremrangebyscore(key, '-inf', now)
    pipe.zcard(key)

    results = pipe.execute()
    current_count = results[1]

    if current_count >= capacity:
        return False  # Bucket is full

    # Schedule this request at the next available drip time
    if current_count == 0:
        next_time = now
    else:
        # Get the last scheduled time
        last_entries = r.zrange(key, -1, -1, withscores=True)
        last_time = last_entries[0][1] if last_entries else now
        next_time = max(now, last_time + interval)

    request_id = str(uuid.uuid4())
    r.zadd(key, {request_id: next_time})
    r.expire(key, int(capacity * interval) + 5)

    return True
```

## Queueing vs Dropping

The classic leaky bucket queues requests and processes them at the drip rate. The variation above drops excess requests. Here is a queuing implementation:

```python
import asyncio

async def enqueue_request(identifier: str, request_fn, rate: float = 5.0):
    key = f"leaky:queue:{identifier}"
    interval = 1.0 / rate

    # Check if queue is full
    queue_size = r.llen(key)
    if queue_size >= 100:
        raise Exception("Rate limit exceeded - queue full")

    # Add to queue
    r.rpush(key, "pending")
    r.expire(key, 60)

    # Wait for our turn
    position = r.llen(key) - 1
    await asyncio.sleep(position * interval)

    # Execute
    result = await request_fn()

    # Remove from queue
    r.lpop(key)
    return result
```

## Middleware Integration

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/export')
def export_data():
    if not leaky_bucket_allow(request.remote_addr, rate=2.0, capacity=10):
        return jsonify({
            "error": "Rate limit exceeded",
            "retry_after": "0.5"
        }), 429
    return jsonify({"status": "export started"})
```

## Monitoring the Bucket State

```bash
# See scheduled requests in the leaky bucket
redis-cli ZRANGE "leaky:192.168.1.1" 0 -1 WITHSCORES

# Count items currently in bucket
redis-cli ZCARD "leaky:192.168.1.1"

# Clear a bucket (reset rate limit for testing)
redis-cli DEL "leaky:192.168.1.1"
```

## When to Use Leaky Bucket vs Token Bucket

```text
Leaky Bucket: Use when you need strict output rate control (payment processors, email sending)
Token Bucket: Use when some bursting is acceptable (API endpoints, web traffic)
```

## Summary

The leaky bucket algorithm enforces a strictly constant processing rate using Redis sorted sets. Each entry is scheduled at the next available drip time, ensuring requests are spread evenly regardless of arrival rate. It is the right choice when protecting services that cannot handle bursts - such as external APIs with strict rate limits or batch processing pipelines.
