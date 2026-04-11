# How to Implement Message Deduplication with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Queue, Deduplication, Idempotency, Messaging

Description: Learn how to implement message deduplication in Redis queues using a seen-set to prevent the same message from being processed more than once.

---

In distributed systems, messages can arrive more than once due to retries, network issues, or at-least-once delivery guarantees. Message deduplication ensures each unique message is processed exactly once, protecting downstream systems from duplicate side effects.

## Strategy: Seen-Set with TTL

Before enqueuing or processing a message, check a Redis Set containing recently seen message IDs. If the ID is already in the set, skip the message.

```text
Key: dedup:seen:{queue_name}
Type: Set (or individual keys with SET NX EX)
TTL:  Should cover your message redelivery window (e.g., 24 hours)
```

## Deduplication at Enqueue Time

```python
import redis
import json
import hashlib

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

DEDUP_WINDOW = 86400  # 24 hours in seconds

def compute_message_id(payload: dict) -> str:
    # Stable hash of message content (for content-based dedup)
    content = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(content.encode()).hexdigest()[:16]

def enqueue_if_new(queue: str, payload: dict, message_id: str = None) -> bool:
    if message_id is None:
        message_id = compute_message_id(payload)

    dedup_key = f"dedup:seen:{queue}:{message_id}"

    # SET NX EX: only set if not exists, with TTL
    is_new = r.set(dedup_key, "1", nx=True, ex=DEDUP_WINDOW)

    if not is_new:
        print(f"Duplicate message {message_id}, skipping")
        return False

    r.rpush(queue, json.dumps({"id": message_id, "data": payload}))
    return True

# Test
enqueue_if_new("orders", {"order_id": "ord-001", "amount": 99.99})  # enqueued
enqueue_if_new("orders", {"order_id": "ord-001", "amount": 99.99})  # duplicate, skipped
enqueue_if_new("orders", {"order_id": "ord-002", "amount": 49.99})  # enqueued
```

## Deduplication at Consumer Time (Idempotent Processing)

```python
def process_with_dedup(queue: str, handler):
    while True:
        result = r.blpop(queue, timeout=5)
        if result is None:
            continue

        _, raw = result
        envelope = json.loads(raw)
        message_id = envelope["id"]

        # Check if already processed
        processed_key = f"dedup:processed:{queue}:{message_id}"
        already_done = r.set(processed_key, "1", nx=True, ex=DEDUP_WINDOW)

        if not already_done:
            print(f"Already processed {message_id}, skipping")
            continue

        try:
            handler(envelope["data"])
            print(f"Processed {message_id}")
        except Exception as e:
            # Remove the processed flag so it can be retried
            r.delete(processed_key)
            print(f"Failed to process {message_id}: {e}")
```

## Atomic Check-and-Enqueue with Lua

```lua
-- dedup_enqueue.lua
local dedup_key = KEYS[1]
local queue_key = KEYS[2]
local message_id = ARGV[1]
local payload = ARGV[2]
local ttl = tonumber(ARGV[3])

local is_new = redis.call("SET", dedup_key, "1", "NX", "EX", ttl)
if not is_new then
  return 0
end

redis.call("RPUSH", queue_key, payload)
return 1
```

## Checking Dedup State

```bash
# Check if a message ID was seen
redis-cli EXISTS dedup:seen:orders:abc123

# Count dedup keys
redis-cli KEYS "dedup:seen:orders:*" | wc -l

# TTL remaining on a dedup entry
redis-cli TTL dedup:seen:orders:abc123
```

## Summary

Message deduplication with Redis uses `SET NX EX` to atomically record message IDs with a TTL matching the redelivery window. Dedup can be applied at enqueue time to prevent duplicates from entering the queue, or at consume time for idempotent processing. Content-based hashing lets you deduplicate even when message IDs are not provided by the producer.

