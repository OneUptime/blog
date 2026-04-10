# How to Handle Pub/Sub Memory Issues with Slow Consumers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Memory, Slow Consumer, Output Buffer

Description: Learn how slow Pub/Sub consumers cause Redis memory issues through output buffer growth, how to configure buffer limits, and strategies to prevent subscriber disconnections.

---

When a Redis Pub/Sub subscriber cannot process messages as fast as they are published, messages accumulate in the subscriber's output buffer on the Redis server. If this buffer grows too large, Redis disconnects the client, causing message loss.

## How Output Buffers Work

Redis maintains a per-client output buffer for data waiting to be sent. For Pub/Sub subscribers, published messages queue in this buffer until the client reads them. A slow consumer - one that reads less frequently than messages arrive - causes the buffer to grow:

```bash
# Check current client output buffer usage
CLIENT LIST

# Look for:
# omem=<size>  - current output buffer size in bytes
# obl=<size>   - output buffer length (fixed buffer portion)
```

```bash
# Example output for a slow subscriber
id=42 addr=192.168.1.10:54321 ... omem=8388608 obl=47 ...
#                                  ^ 8MB output buffer - warning territory
```

## Default Output Buffer Limits

Redis disconnects Pub/Sub clients when their buffer exceeds these defaults:

```bash
CONFIG GET client-output-buffer-limit
# pubsub 32mb 8mb 60
# class   hard  soft  soft-seconds
```

This means: disconnect immediately if buffer exceeds 32MB, or disconnect if buffer stays above 8MB for 60 seconds.

## Configuring Buffer Limits

Adjust limits based on your subscriber throughput and acceptable memory trade-offs:

```bash
# Increase limits for intentionally slow consumers (e.g., logging)
CONFIG SET client-output-buffer-limit "pubsub 64mb 16mb 120"

# Tighten limits if memory is constrained
CONFIG SET client-output-buffer-limit "pubsub 8mb 2mb 30"
```

In `redis.conf`:

```text
client-output-buffer-limit pubsub 32mb 8mb 60
```

## Diagnosing Slow Consumers

Monitor subscriber buffer growth:

```python
import redis
import time

r = redis.Redis(decode_responses=True)

def find_slow_pubsub_clients():
    clients = r.client_list(_type='pubsub')
    slow = []
    for client in clients:
        omem = int(client.get('omem', 0))
        if omem > 1_000_000:  # > 1MB
            slow.append({
                'id': client['id'],
                'addr': client['addr'],
                'omem_mb': omem / 1_048_576
            })
    return slow

while True:
    slow_clients = find_slow_pubsub_clients()
    for c in slow_clients:
        print(f"Slow subscriber {c['addr']}: {c['omem_mb']:.1f} MB buffered")
    time.sleep(10)
```

## Strategies to Prevent Buffer Overflow

**1. Increase consumer processing speed**

```python
# Process in batches and use async I/O
import asyncio
import redis.asyncio as aioredis

async def fast_consumer():
    r = aioredis.from_url('redis://localhost')
    pubsub = r.pubsub()
    await pubsub.subscribe('high-volume-channel')

    async for msg in pubsub.listen():
        if msg['type'] == 'message':
            # Non-blocking: queue for async processing
            asyncio.create_task(process_async(msg['data']))
```

**2. Reduce publisher rate when consumers are slow**

```python
def publish_with_backpressure(channel, data, max_clients_slow=True):
    # Check if any subscriber is falling behind
    slow = find_slow_pubsub_clients()
    if slow and max_clients_slow:
        time.sleep(0.01)  # Brief pause to let consumers catch up
    r.publish(channel, data)
```

**3. Use Redis Streams for slow consumers**

If consumers are inherently slow, switch to Redis Streams which store messages server-side without output buffer pressure:

```bash
# Stream: messages wait in the stream, not in client output buffer
XADD notifications:events * message "server maintenance in 5 min"

# Slow consumer reads at its own pace
XREADGROUP GROUP slow-processors worker-1 COUNT 10 BLOCK 5000 STREAMS notifications:events >
```

## Monitoring with INFO

```bash
# Get aggregate client buffer stats
INFO clients
# client_recent_max_output_buffer: 8388608
```

## Summary

Slow Redis Pub/Sub consumers cause output buffer growth that leads to forced disconnections and message loss. Monitor per-client `omem` with `CLIENT LIST`, tune limits using `client-output-buffer-limit`, and increase consumer processing speed through batching or async I/O. For inherently slow consumers that cannot keep up with publish rates, switch to Redis Streams where backpressure is managed server-side without disconnecting clients.
