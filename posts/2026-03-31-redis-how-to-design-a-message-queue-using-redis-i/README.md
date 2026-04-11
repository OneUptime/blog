# How to Design a Message Queue Using Redis in a System Design Interview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, System Design, Message Queue, Interview, Stream, Pub/Sub, Architecture

Description: A complete system design walkthrough for building a message queue with Redis Streams, covering producer-consumer patterns, consumer groups, and failure handling.

---

## Problem Statement

Design a message queue system that:
- Accepts messages from producers and delivers to consumers
- Supports at-least-once delivery
- Handles 50K messages/sec throughput
- Supports multiple consumer groups reading the same stream
- Retries failed messages

## Why Redis Streams?

```text
Feature             List (LPUSH/RPOP)   Pub/Sub     Redis Streams
-------             -----------------   -------     -------------
Persistence         Yes                 No          Yes
Consumer groups     No                  No          Yes
Message replay      No                  No          Yes
At-least-once       Manual              No          Yes (ACK-based)
Multiple consumers  No                  Yes         Yes
Message retention   Until consumed      None        Configurable
```

Redis Streams is the right tool for a production message queue.

## Stream Data Model

```text
Stream key: queue:{topic}

Each message entry:
  ID: <timestamp-sequenceNumber> (e.g., 1711900000000-0)
  Fields: any key-value pairs

Consumer Groups:
  Each group tracks its own position in the stream.
  Multiple groups can read the same stream independently.
```

## Producer: Publishing Messages

```python
import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def publish_message(topic: str, payload: dict, max_len: int = 100000) -> str:
    stream_key = f"queue:{topic}"

    # XADD with auto-generated ID and MAXLEN for bounded stream
    message_id = r.xadd(
        stream_key,
        {'payload': json.dumps(payload), 'publishedAt': str(int(time.time()))},
        maxlen=max_len,
        approximate=True  # ~ prefix for performance
    )
    return message_id

# Usage
msg_id = publish_message('order-created', {
    'orderId': 'ord-123',
    'userId': 42,
    'amount': 99.99
})
print(f"Published: {msg_id}")
```

## Setting Up Consumer Groups

```python
def create_consumer_group(topic: str, group_name: str):
    stream_key = f"queue:{topic}"

    try:
        # '$' means start from new messages only
        # '0' means start from beginning of stream
        r.xgroup_create(stream_key, group_name, id='$', mkstream=True)
        print(f"Created consumer group: {group_name}")
    except redis.exceptions.ResponseError as e:
        if 'BUSYGROUP' in str(e):
            print(f"Consumer group {group_name} already exists")

# Create groups
create_consumer_group('order-created', 'email-service')
create_consumer_group('order-created', 'inventory-service')
create_consumer_group('order-created', 'analytics-service')
```

## Consumer: Reading and Processing Messages

```python
import signal
import sys

def run_consumer(topic: str, group_name: str, consumer_name: str):
    stream_key = f"queue:{topic}"
    running = True

    def shutdown(sig, frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    print(f"Consumer {consumer_name} started for {topic}/{group_name}")

    while running:
        # Read up to 10 messages, block for 1 second if none available
        messages = r.xreadgroup(
            groupname=group_name,
            consumername=consumer_name,
            streams={stream_key: '>'},  # '>' means new undelivered messages
            count=10,
            block=1000  # milliseconds
        )

        if not messages:
            continue

        for stream, entries in messages:
            for message_id, fields in entries:
                try:
                    payload = json.loads(fields['payload'])
                    process_message(payload)

                    # Acknowledge successful processing
                    r.xack(stream_key, group_name, message_id)

                except Exception as e:
                    print(f"Error processing {message_id}: {e}")
                    # Don't ACK - message stays in Pending Entries List for retry

def process_message(payload: dict):
    print(f"Processing: {payload}")
    # Add your business logic here
```

## Handling Failed Messages (PEL - Pending Entries List)

```python
def reprocess_pending_messages(topic: str, group_name: str, idle_ms: int = 30000):
    """Reclaim and reprocess messages idle for 30+ seconds."""
    stream_key = f"queue:{topic}"

    # Check pending messages (range form returns per-message details)
    pending = r.xpending_range(stream_key, group_name, '-', '+', 100)

    for entry in pending:
        message_id = entry['message_id']
        idle_time = entry['time_since_delivered']
        delivery_count = entry['times_delivered']

        if idle_time < idle_ms:
            continue

        if delivery_count >= 3:
            # Move to dead letter queue
            move_to_dlq(stream_key, group_name, message_id)
            continue

        # Claim the message and retry
        claimed = r.xautoclaim(
            stream_key, group_name, 'retry-worker',
            min_idle_time=idle_ms,
            start_id=message_id,
            count=1
        )

        print(f"Reclaimed message {message_id} for retry")

def move_to_dlq(stream_key: str, group_name: str, message_id: str):
    # Get original message
    msgs = r.xrange(stream_key, message_id, message_id)
    if msgs:
        _, fields = msgs[0]
        r.xadd(f"{stream_key}:dlq", fields)

    # Acknowledge to remove from PEL
    r.xack(stream_key, group_name, message_id)
```

## Stream Monitoring

```python
def get_queue_stats(topic: str, group_name: str) -> dict:
    stream_key = f"queue:{topic}"

    stream_info = r.xinfo_stream(stream_key)
    group_info = r.xinfo_groups(stream_key)

    group_data = next((g for g in group_info if g['name'] == group_name), {})

    return {
        'total_messages': stream_info['length'],
        'pending': group_data.get('pending', 0),
        'last_delivered': group_data.get('last-delivered-id', ''),
        'consumer_count': group_data.get('consumers', 0)
    }
```

## Scaling Strategies

```text
Strategy                Description
--------                -----------
Multiple consumers      Add more consumers to same group - auto load balanced
Multiple groups         Different services read the same stream independently
Partitioning            Use separate streams per partition (queue:orders:0-7)
Redis Cluster           Distribute streams across shards
Stream trimming         MAXLEN prevents unbounded memory growth
```

## Capacity Estimation

```text
50K messages/sec:
- Redis XADD: ~200K ops/sec single node -> handles 50K easily
- With clustering: 1M+ ops/sec

Storage:
- Average message: 200 bytes
- MAXLEN 100K messages: 20MB per stream
- 10 topics: 200MB Redis memory
```

## Summary

Redis Streams provide a production-ready message queue with consumer groups for parallel processing, ACK-based at-least-once delivery, and the Pending Entries List for failure recovery. The XADD MAXLEN option bounds memory usage. For interview discussions, emphasize that Streams solve the limitations of simple LPUSH/RPOP queues by supporting multiple independent consumer groups, message replay, and reliable delivery semantics.
