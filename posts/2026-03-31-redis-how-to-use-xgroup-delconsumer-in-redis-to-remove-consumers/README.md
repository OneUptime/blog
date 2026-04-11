# How to Use XGROUP DELCONSUMER in Redis to Remove Consumers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Consumer Group, Messaging, Cleanup

Description: Learn how to use XGROUP DELCONSUMER to remove a consumer from a Redis Stream consumer group and handle its pending messages.

---

## What Is XGROUP DELCONSUMER?

When a consumer in a Redis Stream consumer group is no longer active - due to a service shutdown, a configuration change, or a scaling event - you need to remove it cleanly. `XGROUP DELCONSUMER` removes a named consumer from a consumer group. The command returns the number of pending messages (PEL entries) that belonged to the deleted consumer.

## Syntax

```text
XGROUP DELCONSUMER key group consumer
```

- `key` - the stream name
- `group` - the name of the consumer group
- `consumer` - the consumer to remove

The return value is the number of pending messages that were owned by the removed consumer. These messages remain in the stream but their PEL entries are removed along with the consumer, making them unclaimable after deletion.

## Basic Usage

```bash
# Add some messages to a stream
XADD tasks * type "email" recipient "alice@example.com"
XADD tasks * type "sms"   recipient "bob@example.com"

# Create a group and read messages with a consumer
XGROUP CREATE tasks workers 0
XREADGROUP GROUP workers consumer-1 COUNT 2 STREAMS tasks >

# Now delete consumer-1
XGROUP DELCONSUMER tasks workers consumer-1
# (integer) 2 - it had 2 pending messages
```

## What Happens to Pending Messages?

Deleting a consumer removes its PEL entries, making those pending messages unclaimable. The messages still exist in the stream but can no longer be claimed or acknowledged through the consumer group. You must handle pending messages **before** deleting the consumer:

1. **Claim them with XCLAIM or XAUTOCLAIM** - Transfer ownership to another consumer before deletion.
2. **Acknowledge them with XACK** - If you know they were processed and just not acknowledged, ACK them before deletion.

```bash
# Before deleting, check pending messages for consumer-1
XPENDING tasks workers - + 10 consumer-1

# Claim the pending messages to consumer-2
XCLAIM tasks workers consumer-2 0 <message-id>

# Now safe to delete consumer-1
XGROUP DELCONSUMER tasks workers consumer-1
# (integer) 0 - no remaining pending messages
```

## Safe Consumer Removal Pattern

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def safe_remove_consumer(stream: str, group: str, consumer: str, target_consumer: str):
    """Transfer all pending messages before removing consumer."""
    # Get pending messages for the consumer being removed
    pending = r.xpending_range(stream, group, "-", "+", count=100, consumername=consumer)

    for entry in pending:
        msg_id = entry["message_id"]
        # Claim with 0 min-idle-time to force-reassign immediately
        r.xclaim(stream, group, target_consumer, 0, [msg_id])

    # Now delete the consumer - should return 0 pending
    removed_pending = r.xgroup_delconsumer(stream, group, consumer)
    print(f"Removed consumer '{consumer}' with {removed_pending} leftover pending messages")

safe_remove_consumer("tasks", "workers", "consumer-1", "consumer-2")
```

## Viewing Remaining Consumers

After deletion, verify the consumer group state:

```bash
XINFO CONSUMERS tasks workers
```

```text
1) 1) "name"
   2) "consumer-2"
   3) "pending"
   4) (integer) 2
   5) "idle"
   6) (integer) 1024
```

## Difference Between DELCONSUMER and DESTROY

| Command | Removes | Deletes Messages |
|---------|---------|-----------------|
| `XGROUP DELCONSUMER` | One consumer | No |
| `XGROUP DESTROY` | Entire group | No (stream remains) |

Use `DELCONSUMER` for removing individual consumers during scaling or maintenance, and `DESTROY` only when decommissioning an entire processing pipeline.

## Summary

`XGROUP DELCONSUMER` removes a specific consumer from a Redis Stream consumer group and returns the count of its pending messages. Those pending messages' PEL entries are removed along with the consumer, making them unclaimable after deletion. Best practice is to transfer pending messages to another consumer using `XCLAIM` or `XAUTOCLAIM` before calling `XGROUP DELCONSUMER` to avoid losing track of unprocessed messages.
