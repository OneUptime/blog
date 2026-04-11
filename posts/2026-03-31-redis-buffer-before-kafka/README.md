# How to Use Redis as a Buffer Before Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kafka, Buffer, Batching, Performance

Description: Learn how to use Redis as a write buffer before Kafka to absorb traffic spikes, batch small messages, and reduce producer overhead on your Kafka cluster.

---

Kafka performs best with larger batches. A flood of tiny individual events - user clicks, sensor readings, log lines - can cause high producer overhead and small, inefficient segments. Redis acts as an intermediate buffer that aggregates events and flushes to Kafka in efficient batches.

## Architecture

```text
High-frequency producers --> RPUSH --> Redis List --> Flusher Process --> Kafka Topic
```

## Writing to the Redis Buffer

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

BUFFER_KEY = "kafka:buffer:events"

def buffer_event(event: dict):
    """Fast write to Redis buffer."""
    r.rpush(BUFFER_KEY, json.dumps(event))

# Simulate many rapid writes
for i in range(1000):
    buffer_event({"event": "click", "user_id": f"u{i}", "page": "/home", "ts": time.time()})

print(f"Buffer size: {r.llen(BUFFER_KEY)}")
```

## Flusher: Batch Transfer to Kafka

```python
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers=["kafka:9092"],
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    batch_size=65536,
    linger_ms=5
)

BATCH_SIZE = 500
FLUSH_INTERVAL = 2.0  # seconds

def flush_to_kafka():
    while True:
        batch = []
        # Pull up to BATCH_SIZE events
        pipeline = r.pipeline()
        for _ in range(BATCH_SIZE):
            pipeline.lpop(BUFFER_KEY)
        results = pipeline.execute()

        for raw in results:
            if raw is None:
                break
            batch.append(json.loads(raw))

        if batch:
            for event in batch:
                producer.send("events", value=event)
            producer.flush()
            print(f"Flushed {len(batch)} events to Kafka")
        else:
            time.sleep(FLUSH_INTERVAL)
```

## Atomic Batch Pop with Lua

```lua
-- batch_pop.lua
local key = KEYS[1]
local batch_size = tonumber(ARGV[1])

local items = {}
for i = 1, batch_size do
  local val = redis.call("LPOP", key)
  if val == false then break end
  table.insert(items, val)
end

return items
```

```python
batch_pop = r.register_script(open("batch_pop.lua").read())

def flush_atomic():
    raw_items = batch_pop(keys=[BUFFER_KEY], args=[BATCH_SIZE])
    if not raw_items:
        return 0
    for raw in raw_items:
        event = json.loads(raw)
        producer.send("events", value=event)
    producer.flush()
    return len(raw_items)
```

## Handling Flusher Failures

If the flusher crashes after popping from Redis but before sending to Kafka, those events are lost. Use a two-step approach with a processing key.

```python
PROCESSING_KEY = "kafka:buffer:processing"

def safe_flush():
    # Move batch to a "processing" key before sending
    pipeline = r.pipeline()
    for _ in range(BATCH_SIZE):
        pipeline.lmove(BUFFER_KEY, PROCESSING_KEY, src="RIGHT", dest="LEFT")
    pipeline.execute()

    items = r.lrange(PROCESSING_KEY, 0, -1)
    if not items:
        return

    try:
        for raw in items:
            producer.send("events", value=json.loads(raw))
        producer.flush()
        r.delete(PROCESSING_KEY)  # Clear only after successful send
    except Exception as e:
        # On failure, items stay in PROCESSING_KEY for retry
        print(f"Kafka send failed: {e}")
```

## Monitoring Buffer Depth

```bash
redis-cli LLEN kafka:buffer:events
watch -n 2 redis-cli LLEN kafka:buffer:events
```

## Summary

Redis as a Kafka write buffer absorbs write spikes by decoupling fast producers from the Kafka cluster. A periodic flusher pulls batches from the Redis List and sends them to Kafka in efficient chunks. For crash-safe flushing, use an intermediate processing key and only delete it after successful Kafka delivery.

