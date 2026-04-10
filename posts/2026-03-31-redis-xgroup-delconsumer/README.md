# How to Use XGROUP DELCONSUMER in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, XGROUP, Consumer Group, Cleanup

Description: Learn how to use XGROUP DELCONSUMER to remove a consumer from a Redis Stream consumer group and handle its pending messages safely.

---

In a Redis Streams consumer group, consumers are automatically created when they first call `XREADGROUP`. Over time, terminated or replaced consumers accumulate as stale entries. `XGROUP DELCONSUMER` removes a consumer from the group, and any pending messages it had become unclaimable.

## How XGROUP DELCONSUMER Works

When you delete a consumer, Redis removes its entry from the consumer group. Any pending (unacknowledged) messages associated with it become unclaimable - they are not automatically re-delivered and cannot be claimed by another consumer after deletion.

```mermaid
flowchart TD
    A[Consumer3 - crashed, idle 2 hours] --> B{Check XINFO CONSUMERS}
    B -- pending > 0 --> C[XCLAIM messages to active consumer]
    C --> D[XGROUP DELCONSUMER mystream workers consumer3]
    B -- pending = 0 --> D
    D --> E[Consumer removed, pending messages now unclaimable]
```

## Syntax

```redis
XGROUP DELCONSUMER key groupname consumername
```

- `key` - stream name
- `groupname` - consumer group name
- `consumername` - consumer to remove

Returns the number of pending messages the consumer had before it was deleted.

## Examples

### Delete a Consumer with No Pending Messages

```redis
XGROUP DELCONSUMER mystream workers consumer2
```

Returns `0` if the consumer had no pending messages.

### Safe Deletion Workflow

Always check for pending messages before deleting:

```redis
XINFO CONSUMERS mystream workers
```

If `pending > 0` for the target consumer, claim its messages first:

```redis
XAUTOCLAIM mystream workers active-consumer 0 0-0 COUNT 100
```

Then delete the consumer:

```redis
XGROUP DELCONSUMER mystream workers consumer3
```

### Verify Deletion

After deletion, confirm the consumer is gone:

```redis
XINFO CONSUMERS mystream workers
```

## Return Value Behavior

The return value indicates how many pending messages the consumer had before deletion:

```text
# consumer3 had 8 pending messages
XGROUP DELCONSUMER mystream workers consumer3
(integer) 8
```

If you get a non-zero return, those messages are now unclaimable. They will not be redelivered unless you had already claimed them to another consumer before deletion.

## Automating Stale Consumer Cleanup

A maintenance script can periodically remove idle consumers that have no pending work:

```bash
# List consumers with idle > 3600000ms (1 hour) and pending = 0
redis-cli XINFO CONSUMERS mystream workers
# For each idle consumer with pending = 0:
redis-cli XGROUP DELCONSUMER mystream workers stale-consumer-name
```

## Use Cases

- **Horizontal scale-down** - remove consumers when reducing worker count
- **Rolling deployments** - clean up consumers from old pod instances
- **Testing cleanup** - remove test consumers after integration test runs
- **Stale consumer management** - periodic cleanup of consumers that no longer connect

## Summary

`XGROUP DELCONSUMER` removes a consumer from a Redis Streams consumer group. The key safety concern is that any pending messages the consumer had become unclaimable after deletion - they are not re-delivered. Always use `XINFO CONSUMERS` to check pending counts and `XAUTOCLAIM` to rescue any outstanding messages before calling `XGROUP DELCONSUMER`.
