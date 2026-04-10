# How to Troubleshoot Redis Streams Consumer Group Lag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Consumer Group, Lag, Troubleshooting

Description: Learn to identify and resolve Redis Streams consumer group lag by inspecting pending entries, scaling consumers, and tuning delivery settings.

---

Consumer group lag in Redis Streams means consumers are falling behind producers. This causes growing backlogs, delayed processing, and eventually memory pressure. This guide shows how to measure lag and bring consumers back up to speed.

## Measure Consumer Group Lag

Use `XINFO GROUPS` to check the lag for each consumer group:

```bash
redis-cli XINFO GROUPS my-stream
```

Key fields:

```text
name: my-group
consumers: 2
pending: 1500
last-delivered-id: 1700000000000-0
entries-read: 8500
lag: 1500
```

`lag` is the number of unprocessed messages. Also check stream length:

```bash
redis-cli XLEN my-stream
```

## Inspect Pending Entries

Messages that were delivered but not acknowledged pile up as pending entries:

```bash
# Show pending summary
redis-cli XPENDING my-stream my-group

# Show up to 10 pending entries with details
redis-cli XPENDING my-stream my-group - + 10

# Detailed pending list filtered by consumer
redis-cli XPENDING my-stream my-group - + 100 consumer-1
```

A large pending count means consumers received messages but are not calling `XACK`. This blocks progress.

## Acknowledge Stuck Messages

If messages are stuck in pending because of a crash or bug, you can claim and reprocess them:

```bash
# Claim messages pending for more than 30 seconds
redis-cli XAUTOCLAIM my-stream my-group consumer-1 30000 0-0 COUNT 100
```

For messages that cannot be processed, move them to a dead-letter stream:

```bash
redis-cli XADD dead-letter "*" original_id "1700000000000-0" reason "processing_failed"
redis-cli XACK my-stream my-group 1700000000000-0
```

## Scale Consumers to Reduce Lag

Add more consumers to the same group to parallelize processing:

```python
import redis

r = redis.Redis()

def consume(consumer_name):
    while True:
        messages = r.xreadgroup(
            groupname="my-group",
            consumername=consumer_name,
            streams={"my-stream": ">"},
            count=50,
            block=1000
        )
        for stream, entries in messages:
            for msg_id, data in entries:
                # Process message
                r.xack("my-stream", "my-group", msg_id)
```

Run multiple instances with different `consumer_name` values. Redis distributes messages across all active consumers.

## Check Consumer Idle Time

Identify slow or dead consumers:

```bash
redis-cli XINFO CONSUMERS my-stream my-group
```

Look at `idle` (milliseconds since last activity). Remove stale consumers:

```bash
redis-cli XGROUP DELCONSUMER my-stream my-group dead-consumer
```

## Tune Message Delivery

Increase batch size and reduce round trips:

```bash
# Read larger batches
redis-cli XREADGROUP GROUP my-group consumer-1 COUNT 200 STREAMS my-stream ">"
```

Also configure `MAXLEN` to prevent the stream from growing unbounded:

```bash
redis-cli XTRIM my-stream MAXLEN ~ 1000000
```

## Summary

Redis Streams consumer group lag grows when consumers process messages slower than they arrive or fail to acknowledge them. Use `XINFO GROUPS` to measure lag, `XPENDING` to inspect stuck messages, and `XAUTOCLAIM` to recover them. Scale consumers horizontally and process messages in larger batches to keep lag near zero.
