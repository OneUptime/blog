# How to Use XLEN in Redis Streams to Get Stream Length

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, XLEN, Stream Length, Monitoring

Description: Learn how to use XLEN in Redis Streams to retrieve the number of messages in a stream for monitoring, capacity planning, and queue depth tracking.

---

## What Is XLEN

`XLEN` returns the number of messages (entries) currently stored in a Redis stream. It is an O(1) operation that does not scan the stream, making it suitable for frequent health checks and monitoring.

## Syntax

```text
XLEN key
```

- `key` - the Redis stream key

Returns an integer - the number of entries in the stream. Returns 0 if the key does not exist.

## Basic Usage

### Check Stream Length

```bash
redis-cli XADD events '*' type "click"
redis-cli XADD events '*' type "purchase"
redis-cli XADD events '*' type "pageview"

redis-cli XLEN events
```

```text
(integer) 3
```

### Empty Stream

```bash
redis-cli DEL events
redis-cli XADD events '*' placeholder ""
redis-cli XDEL events $(redis-cli --raw XRANGE events - + COUNT 1 | head -1)
redis-cli XLEN events
```

Or simply:

```bash
redis-cli XLEN nonexistent_stream
```

```text
(integer) 0
```

### After XDEL

```bash
redis-cli XADD mystream '*' field "value1"
redis-cli XADD mystream '*' field "value2"
redis-cli XLEN mystream
```

```text
(integer) 2
```

```bash
# Delete first message
redis-cli XDEL mystream $(redis-cli --raw XRANGE mystream - + COUNT 1 | head -1)
redis-cli XLEN mystream
```

```text
(integer) 1
```

## XLEN vs XINFO STREAM

`XLEN` returns only the entry count. `XINFO STREAM` provides richer metadata but is heavier:

```bash
# Fast - just the count
redis-cli XLEN events

# Detailed but heavier
redis-cli XINFO STREAM events
```

Use `XLEN` when you only need the message count for monitoring.

## Practical Examples

### Queue Depth Monitoring

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def monitor_stream_depths(streams, alert_threshold=1000):
    """Monitor stream lengths and alert on high queue depth."""
    depths = {}
    for stream in streams:
        depth = r.xlen(stream)
        depths[stream] = depth
        if depth > alert_threshold:
            print(f"ALERT: {stream} has {depth} messages (threshold: {alert_threshold})")
    return depths

# Monitor multiple streams
while True:
    depths = monitor_stream_depths(['orders', 'notifications', 'analytics'])
    print(f"Stream depths: {depths}")
    time.sleep(30)
```

### Backpressure Control

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

MAX_STREAM_LENGTH = 10000

def publish_with_backpressure(stream, data):
    """Only publish if stream is not too full."""
    current_length = r.xlen(stream)

    if current_length >= MAX_STREAM_LENGTH:
        print(f"Stream {stream} is full ({current_length} messages), dropping")
        return False

    if current_length > MAX_STREAM_LENGTH * 0.9:
        print(f"Warning: stream {stream} is at {current_length/MAX_STREAM_LENGTH*100:.0f}% capacity")

    r.xadd(stream, data)
    return True

publish_with_backpressure('events', {'type': 'click', 'user': '42'})
```

### Auto-Trimming Based on Length

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

STREAM = 'logs'
MAX_LENGTH = 50000

def add_log_entry(data):
    r.xadd(STREAM, data, maxlen=MAX_LENGTH, approximate=True)

def check_and_trim():
    """Explicitly trim if stream exceeds max length."""
    length = r.xlen(STREAM)
    if length > MAX_LENGTH:
        r.xtrim(STREAM, maxlen=MAX_LENGTH, approximate=True)
        print(f"Trimmed stream from {length} to ~{MAX_LENGTH}")
    return length

add_log_entry({'level': 'INFO', 'msg': 'Application started'})
current = check_and_trim()
print(f"Stream length: {current}")
```

### Health Check Endpoint

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

STREAMS = {
    'orders': {'warn': 500, 'critical': 2000},
    'notifications': {'warn': 1000, 'critical': 5000},
    'dead_letter': {'warn': 1, 'critical': 10},
}

def get_stream_health():
    health = {}
    overall_status = 'healthy'

    for stream, thresholds in STREAMS.items():
        length = r.xlen(stream)
        if length >= thresholds['critical']:
            status = 'critical'
            overall_status = 'critical'
        elif length >= thresholds['warn']:
            status = 'warning'
            if overall_status == 'healthy':
                overall_status = 'warning'
        else:
            status = 'healthy'

        health[stream] = {'length': length, 'status': status}

    return {'status': overall_status, 'streams': health}

health = get_stream_health()
print(health)
```

### Consumer Group Lag Calculation

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_consumer_group_lag(stream, group):
    """Estimate how far behind a consumer group is."""
    total_messages = r.xlen(stream)
    info = r.xinfo_groups(stream)

    for group_info in info:
        if group_info['name'] == group:
            pending = group_info['pending']
            # lag = pending + unread (approximation)
            return {
                'total': total_messages,
                'pending': pending,
                'lag': pending
            }
    return None
```

## Summary

`XLEN` provides an O(1) count of messages in a Redis stream and returns 0 for non-existent keys. It is the primary tool for queue depth monitoring, backpressure control, auto-trimming triggers, and consumer group lag calculations. For richer stream metadata including first/last entry IDs and consumer group counts, use `XINFO STREAM` instead.
