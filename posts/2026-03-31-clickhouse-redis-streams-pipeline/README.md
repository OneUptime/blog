# How to Build a Redis Streams to ClickHouse Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Redis, Redis Streams, Pipeline, Streaming

Description: Build a Redis Streams to ClickHouse ingestion pipeline to move real-time events from Redis into ClickHouse for long-term storage and analytics.

---

Redis Streams are a powerful append-only data structure for real-time event streaming. While Redis excels at low-latency writes and short-term storage, ClickHouse is ideal for long-term analytical storage. Building a bridge between them enables real-time ingestion with durable analytical storage.

## Redis Streams Basics

Redis Streams use consumer groups to allow multiple consumers to read from the same stream with guaranteed delivery:

```bash
# Create a stream and add events
redis-cli XADD events '*' user_id 1001 event_type click page_url /home

# Create a consumer group
redis-cli XGROUP CREATE events clickhouse-consumers $ MKSTREAM
```

## Python Consumer

```python
import redis
import clickhouse_connect
from datetime import datetime

r = redis.Redis(host='redis.internal', port=6379, decode_responses=True)
ch = clickhouse_connect.get_client(
    host='clickhouse.internal',
    port=8443,
    secure=True,
    username='etl_service',
    password='ServicePass!2026'
)

STREAM = 'events'
GROUP = 'clickhouse-consumers'
CONSUMER = 'worker-1'
BATCH_SIZE = 1000

def consume_and_insert():
    while True:
        entries = r.xreadgroup(
            GROUP, CONSUMER, {STREAM: '>'},
            count=BATCH_SIZE,
            block=2000  # Block 2 seconds if no messages
        )

        if not entries:
            continue

        stream_name, messages = entries[0]
        rows = []
        message_ids = []

        for msg_id, fields in messages:
            rows.append([
                datetime.fromtimestamp(int(msg_id.split('-')[0]) / 1000),
                int(fields.get('user_id', 0)),
                fields.get('event_type', ''),
                fields.get('page_url', ''),
                msg_id
            ])
            message_ids.append(msg_id)

        if rows:
            ch.insert('events', rows,
                column_names=['event_time', 'user_id', 'event_type', 'page_url', 'stream_id'])

            # Acknowledge after successful insert
            r.xack(STREAM, GROUP, *message_ids)

consume_and_insert()
```

## ClickHouse Target Table

```sql
CREATE TABLE events (
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    page_url String,
    stream_id String
) ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id)
TTL event_time + INTERVAL 90 DAY;
```

## Handling Pending Messages

Messages that are consumed but not acknowledged (due to a crash) become "pending." Recover them periodically:

```python
def process_pending():
    # Get messages pending for more than 30 seconds
    pending = r.xautoclaim(
        STREAM, GROUP, CONSUMER,
        min_idle_time=30000,  # 30 seconds in milliseconds
        start_id='0-0',
        count=BATCH_SIZE
    )
    # Process and acknowledge as normal
```

## Monitoring Stream Length

```bash
# Check stream length
redis-cli XLEN events

# Check consumer group lag
redis-cli XINFO GROUPS events
```

Look for `lag` in the XINFO GROUPS output - this is the number of unread messages per group.

## Trimming Old Events in Redis

Keep Redis memory usage in check by trimming the stream after events are successfully consumed:

```python
# Trim stream to last 1 million entries after acknowledging
r.xtrim(STREAM, maxlen=1000000, approximate=True)
```

## Scaling Consumers

Add more consumers to the same group to process partitions in parallel:

```python
# Worker 2 reads from the same stream
CONSUMER = 'worker-2'
```

Redis Streams automatically distribute unread messages across consumers in the same group.

## Summary

A Redis Streams to ClickHouse pipeline uses `XREADGROUP` with consumer groups for reliable, at-least-once delivery. Acknowledge messages only after successful ClickHouse inserts, handle pending messages from crashed workers using `XAUTOCLAIM`, and trim the stream regularly to prevent unbounded Redis memory growth. This pattern combines Redis's low-latency write performance with ClickHouse's analytical query power.
