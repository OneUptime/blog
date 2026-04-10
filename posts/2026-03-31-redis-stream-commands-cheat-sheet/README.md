# Redis Stream Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Command, Cheat Sheet, Messaging

Description: Complete Redis stream commands reference covering XADD, XREAD, XREADGROUP, XACK, XCLAIM, and consumer group management.

---

Redis Streams are an append-only log data structure for reliable messaging and event sourcing. Here is the complete command reference for working with streams.

## Writing to a Stream

```bash
# Add an entry (auto-generated ID)
XADD events * action "login" user_id 42

# Add with explicit ID (milliseconds-sequence)
XADD events 1711900000000-0 action "login" user_id 42

# Add with partial ID (auto sequence, Redis 7.0+)
XADD events 1711900000000 action "login" user_id 42

# Cap stream length (approximate, uses ~ for efficiency)
XADD events MAXLEN ~ 10000 * action "login" user_id 42

# Cap by minimum ID (trim older than X)
XADD events MINID ~ 1711800000000-0 * action "login" user_id 42
```

## Reading from a Stream

```bash
# Read N entries starting from beginning
XREAD COUNT 10 STREAMS events 0-0

# Read entries after a given ID
XREAD COUNT 10 STREAMS events 1711900000000-0

# Read new entries (block until available)
XREAD BLOCK 5000 COUNT 10 STREAMS events $

# Read from multiple streams
XREAD COUNT 5 STREAMS events orders 0-0 0-0
```

## Stream Info

```bash
# Get stream metadata
XINFO STREAM events
XINFO STREAM events FULL   # detailed including PEL

# Get entry count
XLEN events

# Get range of entries
XRANGE events - +              # all entries
XRANGE events 0-0 1711900000000-0  # range by ID
XRANGE events - + COUNT 10    # first 10

# Get entries in reverse
XREVRANGE events + -
XREVRANGE events + - COUNT 10
```

## Trim Streams

```bash
# Trim to max length
XTRIM events MAXLEN 10000
XTRIM events MAXLEN ~ 10000    # approximate (faster)

# Trim by minimum ID
XTRIM events MINID 1711800000000
```

## Consumer Groups

```bash
# Create consumer group
XGROUP CREATE events mygroup $ MKSTREAM   # start from last
XGROUP CREATE events mygroup 0            # start from beginning

# Read as consumer group
XREADGROUP GROUP mygroup consumer1 COUNT 10 STREAMS events >

# Acknowledge processed message
XACK events mygroup 1711900000000-0

# List consumer groups
XINFO GROUPS events

# List consumers in a group
XINFO CONSUMERS events mygroup
```

## Pending Message Management

```bash
# List pending messages (unacknowledged)
XPENDING events mygroup - + 10

# Summary of pending messages per consumer
XPENDING events mygroup

# Re-read pending messages (process again)
XREADGROUP GROUP mygroup consumer1 COUNT 10 STREAMS events 0

# Claim idle messages from another consumer
XCLAIM events mygroup consumer2 60000 1711900000000-0

# Auto-claim idle messages (Redis 6.2+)
XAUTOCLAIM events mygroup consumer2 60000 0-0 COUNT 10

# Delete a specific entry
XDEL events 1711900000000-0
```

## Consumer Group Management

```bash
# Delete consumer group
XGROUP DESTROY events mygroup

# Create/update consumer
XGROUP CREATECONSUMER events mygroup consumer1

# Delete consumer
XGROUP DELCONSUMER events mygroup consumer1

# Set start position
XGROUP SETID events mygroup $        # skip all existing
XGROUP SETID events mygroup 0-0      # replay from start
```

## Summary

Redis stream commands follow an append-only, consumer group model similar to Kafka. XADD writes entries, XREADGROUP with consumer groups enables parallel processing with at-least-once delivery, and XACK + XCLAIM handle acknowledgment and recovery of stalled messages. Use MAXLEN capping to prevent unbounded stream growth.
