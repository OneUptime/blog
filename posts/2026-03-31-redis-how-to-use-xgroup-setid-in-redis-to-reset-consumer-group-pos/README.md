# How to Use XGROUP SETID in Redis to Reset Consumer Group Position

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Consumer Group, Message Replay, Messaging

Description: Learn how to use XGROUP SETID to reposition a consumer group's last-delivered-id, enabling message replay or skipping ahead in a Redis Stream.

---

## What Is XGROUP SETID?

Every Redis Stream consumer group tracks its position in the stream using a `last-delivered-id`. This is the ID of the most recently delivered message. New calls to `XREADGROUP` will deliver messages that come after this ID.

`XGROUP SETID` lets you change this position - effectively rewinding the group to replay old messages, or fast-forwarding it to skip unprocessed messages.

## Syntax

```text
XGROUP SETID key groupname id [ENTRIESREAD entries-read]
```

- `key` - the stream name
- `groupname` - the consumer group to update
- `id` - the new last-delivered-id (`0` for start, `$` for latest, or a specific message ID)
- `ENTRIESREAD` - (Redis 7.0+) hint for the lag calculation; set to the number of entries already delivered

## Basic Usage

```bash
# Create stream and group
XADD logs * level "info" message "Server started"
XADD logs * level "warn" message "High memory usage"
XADD logs * level "error" message "Disk full"
XGROUP CREATE logs monitors 0

# Read all messages
XREADGROUP GROUP monitors worker COUNT 10 STREAMS logs >

# Acknowledge them
XACK logs monitors <id1> <id2> <id3>

# Rewind to replay all messages from the beginning
XGROUP SETID logs monitors 0
# OK

# Now XREADGROUP will re-deliver all messages
XREADGROUP GROUP monitors worker COUNT 10 STREAMS logs >
```

## Setting Position to $

Using `$` moves the group's position to the latest message, causing `XREADGROUP` to only deliver future messages:

```bash
# Skip all existing messages - only process new ones going forward
XGROUP SETID logs monitors $
```

This is useful when you want to start processing from "now" without dealing with the backlog.

## Setting Position to a Specific ID

```bash
# Get the IDs of existing messages
XRANGE logs - + COUNT 5
# Returns messages with IDs like 1700000000000-0, 1700000001000-0, etc.

# Rewind to a specific point in time
XGROUP SETID logs monitors 1700000001000-0
```

All messages with IDs greater than `1700000001000-0` will be re-delivered on the next `XREADGROUP` call.

## Application-Level Replay Pattern

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def replay_from_beginning(stream: str, group: str):
    """Rewind consumer group to replay all messages."""
    r.xgroup_setid(stream, group, "0")
    print(f"Group '{group}' rewound to beginning of stream '{stream}'")

def skip_to_latest(stream: str, group: str):
    """Move consumer group to the latest message, skipping backlog."""
    r.xgroup_setid(stream, group, "$")
    print(f"Group '{group}' advanced to latest message in '{stream}'")

def replay_from_timestamp(stream: str, group: str, timestamp_ms: int):
    """Rewind consumer group to a specific Unix timestamp in milliseconds."""
    # Redis Stream IDs are millisecond timestamps + sequence
    msg_id = f"{timestamp_ms}-0"
    r.xgroup_setid(stream, group, msg_id)
    print(f"Group '{group}' repositioned to {msg_id}")

replay_from_beginning("logs", "monitors")
```

## ENTRIESREAD Option (Redis 7.0+)

Redis 7.0 added consumer group lag tracking. When rewinding with `SETID`, Redis may not know how many entries have been read, which causes inaccurate lag statistics. Use `ENTRIESREAD` to provide this hint:

```bash
# Rewind to beginning; indicate 0 entries have been read
XGROUP SETID logs monitors 0 ENTRIESREAD 0

# Check lag
XINFO GROUPS logs
# "entries-read" will be 0, "lag" will equal total stream length
```

## Common Patterns

| Goal | Command |
|------|---------|
| Replay all messages | `XGROUP SETID stream group 0` |
| Skip backlog | `XGROUP SETID stream group $` |
| Replay from a time | `XGROUP SETID stream group <timestamp-ms>-0` |

## Summary

`XGROUP SETID` repositions a Redis Stream consumer group's last-delivered-id, enabling message replay (rewind to `0`) or backlog skipping (advance to `$`). It is a non-destructive operation - no messages are deleted - making it safe to use for replaying events, recovering from processing errors, or bypassing stale backlog data. In Redis 7.0+, combine it with `ENTRIESREAD` to keep lag statistics accurate.
