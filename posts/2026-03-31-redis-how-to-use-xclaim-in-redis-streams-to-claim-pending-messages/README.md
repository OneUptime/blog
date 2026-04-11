# How to Use XCLAIM in Redis Streams to Claim Pending Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Consumer Group, XCLAIM, Reliability, Fault Tolerance

Description: Learn how to use XCLAIM in Redis Streams to transfer ownership of pending messages from a failed consumer to an active one, ensuring at-least-once delivery.

---

## What Is XCLAIM?

When a consumer in a Redis Stream consumer group crashes or stalls, its pending messages are stuck. `XCLAIM` allows another consumer to take ownership of those messages, enabling recovery and ensuring no messages are permanently lost. The claiming consumer must provide a minimum idle time - the message must have been pending for at least that long before it can be claimed.

## Syntax

```text
XCLAIM key group consumer min-idle-time id [id ...] [IDLE ms] [TIME ms-unix-time] [RETRYCOUNT count] [FORCE] [JUSTID]
```

Key parameters:
- `key` - the stream name
- `group` - the consumer group
- `consumer` - the consumer claiming the messages
- `min-idle-time` - minimum milliseconds a message must have been idle to be claimed
- `id [id ...]` - one or more message IDs to claim

## Basic Usage

```bash
# Add messages and have worker-1 read them
XADD jobs * task "process-payment" order_id "ABC123"
XADD jobs * task "send-email" user_id "42"
XGROUP CREATE jobs workers 0
XREADGROUP GROUP workers worker-1 COUNT 2 STREAMS jobs >

# Worker-1 crashes. After 30 seconds, claim its messages to worker-2
XCLAIM jobs workers worker-2 30000 1700000001000-0 1700000002000-0
```

The response returns the full message data for all successfully claimed messages.

## Finding Messages to Claim

Before claiming, use `XPENDING` to identify stalled messages:

```bash
# Find messages idle more than 30 seconds
XPENDING jobs workers IDLE 30000 - + 10
```

```text
1) 1) "1700000001000-0"
   2) "worker-1"
   3) (integer) 45000   # idle for 45 seconds
   4) (integer) 1
```

Then claim them:

```bash
XCLAIM jobs workers worker-2 30000 1700000001000-0
```

## The JUSTID Option

Use `JUSTID` to return only IDs without full message data - useful when you just want to verify which messages were claimed. Note that using `JUSTID` also prevents the delivery counter from being incremented:

```bash
XCLAIM jobs workers worker-2 30000 1700000001000-0 JUSTID
# 1) "1700000001000-0"
```

## The RETRYCOUNT Option

Every time a message is delivered or claimed, its delivery count increases (unless `JUSTID` is used). Use `RETRYCOUNT` to override this counter - useful when implementing dead-letter logic:

```bash
# Reset retry count to 0 after manual intervention
XCLAIM jobs workers worker-2 0 1700000001000-0 RETRYCOUNT 0
```

If a message has been delivered many times without success, it may indicate a poison message. Check the delivery count in `XPENDING` output and route it to a dead-letter stream.

## Full Recovery Pattern in Python

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

STREAM = "jobs"
GROUP = "workers"
IDLE_THRESHOLD_MS = 30000  # 30 seconds
MAX_DELIVERIES = 5
DEAD_LETTER_STREAM = "jobs-dead-letters"

def recover_stalled_messages(active_consumer: str):
    # Find all idle messages
    pending = r.xpending_range(STREAM, GROUP, "-", "+", 100, idle=IDLE_THRESHOLD_MS)

    for entry in pending:
        msg_id = entry["message_id"]
        deliveries = entry["times_delivered"]

        if deliveries >= MAX_DELIVERIES:
            # Move to dead-letter stream
            msg_data = r.xrange(STREAM, msg_id, msg_id)
            if msg_data:
                _, fields = msg_data[0]
                r.xadd(DEAD_LETTER_STREAM, fields)
            r.xack(STREAM, GROUP, msg_id)
            print(f"Moved {msg_id} to dead-letter stream after {deliveries} attempts")
        else:
            # Claim for active consumer
            claimed = r.xclaim(STREAM, GROUP, active_consumer, IDLE_THRESHOLD_MS, [msg_id])
            if claimed:
                print(f"Claimed {msg_id} to {active_consumer} (attempt {deliveries + 1})")

recover_stalled_messages("worker-2")
```

## XCLAIM vs XAUTOCLAIM

| Feature | XCLAIM | XAUTOCLAIM |
|---------|--------|------------|
| Message selection | You specify IDs | Redis finds them automatically |
| ID discovery | Requires XPENDING first | Built-in |
| Flexibility | Per-message control | Batch-oriented |
| Redis version | 5.0+ | 6.2+ |

Use `XCLAIM` when you need fine-grained control over which messages to claim. Use `XAUTOCLAIM` for simpler batch recovery loops.

## Summary

`XCLAIM` transfers ownership of specific pending messages from one consumer to another in a Redis Stream consumer group, enabling recovery from consumer failures. It requires a minimum idle time to prevent race conditions between active consumers. Combined with `XPENDING` to identify stalled messages and delivery count tracking for dead-letter routing, `XCLAIM` is a fundamental tool for building reliable at-least-once message processing systems.
