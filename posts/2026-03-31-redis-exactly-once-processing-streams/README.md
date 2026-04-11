# How to Implement Exactly-Once Processing with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Exactly-Once, Idempotency, Consumer Group

Description: Learn how to implement exactly-once processing semantics with Redis Streams by combining idempotency keys, deduplication, and atomic acknowledgment patterns.

---

True exactly-once delivery is a hard guarantee to achieve in distributed systems. Redis Streams natively provide at-least-once delivery. Achieving exactly-once requires adding idempotency at the consumer side.

## Why Exactly-Once Is Hard

Redis Streams guarantee that a consumer group receives every message at least once. A consumer can crash after processing but before acknowledging, causing the message to be redelivered. The solution is to make your processing idempotent: processing the same message twice produces the same result.

## The Idempotency Key Pattern

Use the stream entry ID as a unique idempotency key. Store processed IDs as Redis keys with a TTL:

```python
import redis
import json

r = redis.Redis(decode_responses=True)

def process_with_dedup(stream, group, consumer):
    messages = r.xreadgroup(group, consumer, {stream: '>'}, count=10, block=5000)

    if not messages:
        return

    pipe = r.pipeline()
    to_ack = []

    for _, entries in messages:
        for msg_id, fields in entries:
            dedup_key = f'processed:{stream}:{msg_id}'

            # Check if already processed
            if r.exists(dedup_key):
                print(f"Skipping duplicate {msg_id}")
                to_ack.append(msg_id)
                continue

            success = process_message(fields)

            if success:
                # Mark as processed with TTL longer than message retention
                pipe.set(dedup_key, 1, ex=86400)
                to_ack.append(msg_id)

    pipe.execute()

    if to_ack:
        r.xack(stream, group, *to_ack)
```

## Atomic Processing with Lua

For critical operations, use a Lua script to make the check-and-process atomic:

```lua
-- process_once.lua
local dedup_key = KEYS[1]
local result_key = KEYS[2]
local msg_id = ARGV[1]
local ttl = tonumber(ARGV[2])

-- Check if already processed
if redis.call('EXISTS', dedup_key) == 1 then
  return redis.call('GET', result_key)
end

-- Mark as in-progress
redis.call('SET', dedup_key, 'processing', 'EX', ttl)

-- Return nil to indicate processing is needed
return nil
```

```python
def atomic_dedup_check(msg_id, stream_name):
    dedup_key = f'processed:{stream_name}:{msg_id}'
    result_key = f'result:{stream_name}:{msg_id}'

    result = r.eval(
        open('process_once.lua').read(),
        2, dedup_key, result_key, msg_id, 3600
    )
    return result  # None means process, value means already done
```

## Database-Level Idempotency

For database operations, use a unique constraint on the message ID:

```python
import psycopg2

def process_payment_once(msg_id, fields):
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    try:
        # Insert with conflict handling on msg_id
        cur.execute("""
            INSERT INTO payments (idempotency_key, order_id, amount, status)
            VALUES (%s, %s, %s, 'completed')
            ON CONFLICT (idempotency_key) DO NOTHING
        """, (msg_id, fields['order_id'], fields['amount']))

        affected = cur.rowcount
        conn.commit()

        if affected == 0:
            print(f"Payment {msg_id} already processed, skipping")
        return True

    except Exception as e:
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()
```

## Handling the Processing Window

There's a window between processing and acknowledging where a crash causes redelivery. Keep this window small:

```python
def safe_process(stream, group, consumer, msg_id, fields):
    # 1. Process the message
    result = do_work(fields)  # Make this idempotent

    # 2. Acknowledge immediately after (minimal window)
    r.xack(stream, group, msg_id)

    return result
```

## Monitoring Deduplication

Track deduplication rates to understand your message delivery patterns:

```bash
# Count dedup keys
redis-cli KEYS "processed:orders:events:*" | wc -l

# Check pending (unacknowledged) messages
redis-cli XPENDING orders:events workers - + 100
```

## Summary

Exactly-once processing with Redis Streams requires idempotent consumers - use the stream entry ID as a deduplication key stored with a TTL. For database operations, unique constraints on the message ID provide the strongest guarantee. Keeping the processing-to-acknowledgment window small reduces redelivery frequency.
