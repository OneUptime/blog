# How to Handle Consumer Failures in Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Consumer Group, Failure Recovery, Dead Letter Queue

Description: Learn how to detect and recover from consumer failures in Redis Streams using XAUTOCLAIM, delivery count tracking, and dead letter queue patterns.

---

When a Redis Streams consumer crashes mid-processing, the messages it was handling remain in the Pending Entries List (PEL) indefinitely. Without a recovery mechanism, those messages are never processed or acknowledged.

## How Failures Are Tracked

Redis tracks every unacknowledged message in the PEL. Each entry records the consumer name, delivery count, and time since last delivery:

```bash
# View pending messages - shows consumer, idle time, delivery count
XPENDING orders:queue workers - + 10
```

```text
1) 1) "1711234567890-0"
   2) "worker-1"         <- which consumer holds it
   3) (integer) 95234   <- idle for 95 seconds
   4) (integer) 3       <- delivered 3 times already
```

## Reclaiming Messages After a Crash

`XAUTOCLAIM` transfers messages that have been idle for too long to another consumer:

```python
import redis

r = redis.Redis(decode_responses=True)

STREAM = 'orders:queue'
GROUP = 'workers'
MAX_IDLE_MS = 60_000   # 60 seconds
MAX_RETRIES = 3
DLQ = 'orders:dead-letter'

def reclaim_failed_messages(consumer_name):
    start = '0-0'

    while True:
        # Claim messages idle for more than 60 seconds
        next_id, entries, deleted = r.xautoclaim(
            STREAM, GROUP, consumer_name,
            min_idle_time=MAX_IDLE_MS,
            start_id=start,
            count=20
        )

        for msg_id, fields in entries:
            delivery_count = get_delivery_count(msg_id)

            if delivery_count >= MAX_RETRIES:
                send_to_dlq(msg_id, fields, delivery_count)
            else:
                reprocess(consumer_name, msg_id, fields)

        if next_id == '0-0':
            break
        start = next_id

def get_delivery_count(msg_id):
    pending = r.xpending_range(STREAM, GROUP, msg_id, msg_id, 1)
    return pending[0]['times_delivered'] if pending else 0
```

## Reprocessing a Reclaimed Message

```python
def reprocess(consumer_name, msg_id, fields):
    try:
        process_message(fields)
        r.xack(STREAM, GROUP, msg_id)
        print(f"Successfully reprocessed {msg_id}")
    except Exception as e:
        print(f"Reprocessing failed for {msg_id}: {e}")
        # Leave in PEL; will be reclaimed again

def send_to_dlq(msg_id, fields, delivery_count):
    """Route exhausted messages to dead letter queue"""
    r.xadd(DLQ, {
        **fields,
        'original_id': msg_id,
        'delivery_count': delivery_count,
        'failure_reason': 'max_retries_exceeded'
    })
    r.xack(STREAM, GROUP, msg_id)
    print(f"Moved {msg_id} to DLQ after {delivery_count} attempts")
```

## Removing a Dead Consumer

When a consumer is permanently gone, clean it up to prevent confusion:

```bash
# Delete the consumer (its pending entries are removed from the PEL)
XGROUP DELCONSUMER orders:queue workers crashed-worker-3

# Verify consumer is removed
XINFO CONSUMERS orders:queue workers
```

```python
def remove_dead_consumer(stream, group, consumer_name):
    # Check if consumer has pending messages
    pending = r.xpending_range(stream, group, '-', '+', 1, consumername=consumer_name)
    if pending:
        print(f"Consumer {consumer_name} has {len(pending)} pending messages - reclaim first")
        return False

    r.xgroup_delconsumer(stream, group, consumer_name)
    print(f"Removed consumer {consumer_name} from group {group}")
    return True
```

## Startup Recovery Pattern

Always reclaim pending messages on consumer startup:

```python
def start_consumer(consumer_name):
    # Step 1: Reclaim any messages from previous run or crashed peers
    print(f"Reclaiming pending messages for {consumer_name}...")
    reclaim_failed_messages(consumer_name)

    # Step 2: Process new messages
    print(f"Starting normal processing for {consumer_name}...")
    while True:
        msgs = r.xreadgroup(GROUP, consumer_name, {STREAM: '>'}, count=10, block=5000)
        if msgs:
            for _, entries in msgs:
                for msg_id, fields in entries:
                    try:
                        process_message(fields)
                        r.xack(STREAM, GROUP, msg_id)
                    except Exception as e:
                        print(f"Processing error {msg_id}: {e}")
```

## Summary

Handle consumer failures in Redis Streams by running `XAUTOCLAIM` on startup to reclaim messages idle beyond your processing timeout. Track delivery counts to identify repeatedly failing messages and route them to a dead letter queue after a maximum retry threshold. Clean up permanently failed consumers with `XGROUP DELCONSUMER` to keep the group state accurate.
