# How to Use XAUTOCLAIM in Redis for Automatic Message Claiming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Consumer Group, XAUTOCLAIM, Fault Tolerance, Reliability

Description: Learn how XAUTOCLAIM combines XPENDING and XCLAIM into a single atomic command for efficient recovery of stalled messages in Redis Streams.

---

## What Is XAUTOCLAIM?

`XAUTOCLAIM` was introduced in Redis 6.2 to simplify the common pattern of scanning pending messages and claiming idle ones. Instead of calling `XPENDING` to find stalled messages and then `XCLAIM` for each one, `XAUTOCLAIM` does both atomically in a single command - scanning the PEL for messages that have been idle longer than a threshold and reassigning them to a new consumer.

## Syntax

```text
XAUTOCLAIM key group consumer min-idle-time start [COUNT count] [JUSTID]
```

- `key` - the stream name
- `group` - the consumer group
- `consumer` - the consumer to claim messages to
- `min-idle-time` - minimum idle time in milliseconds before a message can be claimed
- `start` - the PEL cursor to scan from (use `0-0` to start from the beginning)
- `COUNT` - max messages to claim per call (default: 100)
- `JUSTID` - return only IDs, not full message data

## Return Value

`XAUTOCLAIM` returns three elements:

1. A cursor for the next scan (like `SCAN`-style iteration)
2. An array of claimed messages
3. An array of deleted message IDs (messages that were in PEL but no longer in the stream)

## Basic Usage

```bash
# Set up stream and group
XADD queue * job "resize-image" file "photo.jpg"
XADD queue * job "send-report" email "cto@example.com"
XGROUP CREATE queue image-workers 0
XREADGROUP GROUP image-workers worker-1 COUNT 2 STREAMS queue >

# After worker-1 becomes idle for 30+ seconds, claim to worker-2
XAUTOCLAIM queue image-workers worker-2 30000 0-0 COUNT 10
```

Response:

```text
1) "0-0"               # next cursor (0-0 means scan complete)
2) 1) 1) "1700000001-0"
      2) 1) "job"
         2) "resize-image"
         3) "file"
         4) "photo.jpg"
3) (empty array)       # no deleted messages
```

## Cursor-Based Iteration

Like `SCAN`, `XAUTOCLAIM` is cursor-based. If there are more pending messages than the `COUNT` limit, iterate using the returned cursor:

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def autoclaim_all(stream: str, group: str, consumer: str, idle_ms: int):
    """Claim all idle messages using cursor-based iteration."""
    cursor = "0-0"
    total_claimed = 0

    while True:
        next_cursor, claimed, deleted = r.xautoclaim(
            stream, group, consumer, idle_ms, cursor, count=50
        )
        total_claimed += len(claimed)

        # Process claimed messages
        for msg_id, fields in claimed:
            print(f"Reclaimed: {msg_id} - {fields}")
            # ... process the message ...
            r.xack(stream, group, msg_id)

        if deleted:
            print(f"Cleaned up {len(deleted)} deleted message IDs from PEL")

        # Stop when cursor returns to 0-0
        if next_cursor == "0-0":
            break
        cursor = next_cursor

    print(f"Total messages reclaimed: {total_claimed}")

autoclaim_all("queue", "image-workers", "worker-2", 30000)
```

## Handling Deleted Messages

The third return value contains IDs of messages that were in the PEL but no longer exist in the stream (e.g., trimmed by `XTRIM` or `MAXLEN`). Redis automatically removes these from the PEL during `XAUTOCLAIM`, keeping the PEL clean.

```python
next_cursor, claimed, deleted = r.xautoclaim("queue", "image-workers", "worker-2", 30000, "0-0")

if deleted:
    print(f"PEL cleaned of {len(deleted)} ghost entries: {deleted}")
```

## Worker Loop with XAUTOCLAIM

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def worker_loop(stream: str, group: str, consumer: str, idle_ms: int = 30000):
    while True:
        # 1. Try to get new messages
        messages = r.xreadgroup(group, consumer, {stream: ">"}, count=10, block=2000)

        if messages:
            for stream_name, entries in messages:
                for msg_id, fields in entries:
                    process(msg_id, fields)
                    r.xack(stream, group, msg_id)
        else:
            # 2. No new messages - check for stalled ones
            _, claimed, _ = r.xautoclaim(stream, group, consumer, idle_ms, "0-0", count=10)
            for msg_id, fields in claimed:
                print(f"Recovered stalled message: {msg_id}")
                process(msg_id, fields)
                r.xack(stream, group, msg_id)

def process(msg_id, fields):
    print(f"Processing {msg_id}: {fields}")

worker_loop("queue", "image-workers", "worker-2")
```

## XAUTOCLAIM vs XCLAIM

| Feature | XAUTOCLAIM | XCLAIM |
|---------|------------|--------|
| Discovery | Built-in (scans PEL) | Manual (requires XPENDING) |
| Atomicity | Single command | Two commands |
| Batch | Cursor-based iteration | Explicit ID list |
| PEL cleanup | Yes (removes deleted entries) | No |
| Redis version | 6.2+ | 5.0+ |

## Summary

`XAUTOCLAIM` simplifies fault-tolerant Redis Stream processing by combining idle message detection and ownership transfer in a single atomic command. Its cursor-based design handles large PEL sets efficiently, and it automatically cleans up PEL entries for messages that no longer exist in the stream. For Redis 6.2+ environments, `XAUTOCLAIM` should be the preferred approach over the manual `XPENDING` + `XCLAIM` pattern.
