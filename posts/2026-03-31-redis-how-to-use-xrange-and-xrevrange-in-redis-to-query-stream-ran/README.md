# How to Use XRANGE and XREVRANGE in Redis to Query Stream Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, XRANGE, XREVRANGE, Stream Queries

Description: Learn how to use XRANGE and XREVRANGE in Redis Streams to query messages by ID range in forward and reverse order with optional count limits.

---

## What Are XRANGE and XREVRANGE

`XRANGE` reads messages from a Redis stream in chronological order (ascending ID). `XREVRANGE` reads in reverse chronological order (descending ID). Both accept a range of message IDs and an optional COUNT limit.

Unlike `XREADGROUP`, these commands do not belong to a consumer group and do not track delivery or acknowledgment.

## Syntax

```text
XRANGE key start end [COUNT count]
XREVRANGE key end start [COUNT count]
```

- `key` - the stream key
- `start` / `end` - message IDs (`-` for minimum, `+` for maximum)
- `COUNT count` - limit the number of returned messages

Note: For `XREVRANGE`, the range arguments are reversed - the higher ID comes first.

## Basic Usage

### Read All Messages

```bash
redis-cli XADD logs '*' level "INFO" msg "App started"
redis-cli XADD logs '*' level "WARN" msg "High memory"
redis-cli XADD logs '*' level "ERROR" msg "Connection failed"

redis-cli XRANGE logs - +
```

```text
1) 1) "1743400001000-0"
   2) 1) "level"
      2) "INFO"
      3) "msg"
      4) "App started"
2) 1) "1743400002000-0"
   2) 1) "level"
      2) "WARN"
      3) "msg"
      4) "High memory"
3) 1) "1743400003000-0"
   2) 1) "level"
      2) "ERROR"
      3) "msg"
      4) "Connection failed"
```

### Read with COUNT Limit

```bash
# First 2 messages
redis-cli XRANGE logs - + COUNT 2
```

### Read in Reverse Order

```bash
# Most recent first
redis-cli XREVRANGE logs + - COUNT 2
```

```text
1) 1) "1743400003000-0"
   2) 1) "level"
      2) "ERROR"
      ...
2) 1) "1743400002000-0"
   2) 1) "level"
      2) "WARN"
```

### Range by Timestamp

Use millisecond timestamps as partial IDs (Redis auto-completes the start with -0 and the end with the maximum sequence number):

```bash
# Messages from a specific millisecond timestamp range
redis-cli XRANGE logs 1743400001000 1743400002999
```

## Pagination Pattern

```bash
# Page 1: start from minimum
redis-cli XRANGE logs - + COUNT 2

# Page 2: start from the NEXT ID after last page's last ID
# If last ID was "1743400002000-0", use "1743400002000-1" as start
redis-cli XRANGE logs "1743400002000-1" + COUNT 2
```

## Practical Examples

### Log Viewer in Python

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_recent_logs(stream, count=20):
    """Get the most recent log entries."""
    entries = r.xrevrange(stream, '+', '-', count=count)
    logs = []
    for msg_id, data in entries:
        logs.append({
            'id': msg_id,
            'timestamp': int(msg_id.split('-')[0]),
            **data
        })
    return logs

def get_logs_in_range(stream, start_ms, end_ms):
    """Get logs between two Unix millisecond timestamps."""
    entries = r.xrange(stream, start_ms, end_ms)
    return [{'id': mid, **data} for mid, data in entries]

# Add some logs
r.xadd('app:logs', {'level': 'INFO', 'msg': 'Service started', 'service': 'api'})
r.xadd('app:logs', {'level': 'ERROR', 'msg': 'DB timeout', 'service': 'api'})
r.xadd('app:logs', {'level': 'INFO', 'msg': 'Request processed', 'service': 'api'})

recent = get_recent_logs('app:logs', count=10)
print(f"Recent {len(recent)} logs:")
for log in recent:
    print(f"  [{log['level']}] {log['msg']}")
```

### Paginated Stream Reader

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def paginate_stream(stream, page_size=10):
    """Iterate through a stream in pages."""
    last_id = '-'

    while True:
        entries = r.xrange(stream, last_id, '+', count=page_size + 1)

        if not entries:
            break

        # Check if this is the last page
        has_more = len(entries) > page_size
        page_entries = entries[:page_size]

        yield page_entries

        if not has_more:
            break

        # Next page starts after the last entry of this page
        last_id = '(' + page_entries[-1][0]

for page in paginate_stream('events'):
    print(f"Page with {len(page)} entries")
    for msg_id, data in page:
        print(f"  {msg_id}: {data}")
```

### Event Replay for a Time Window

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def replay_events(stream, start_unix_sec, end_unix_sec):
    """Replay all events in a time window."""
    start_ms = int(start_unix_sec * 1000)
    end_ms = int(end_unix_sec * 1000)

    entries = r.xrange(stream, start_ms, end_ms)
    print(f"Replaying {len(entries)} events from {start_ms} to {end_ms}")

    for msg_id, data in entries:
        print(f"Replaying: {msg_id} -> {data}")
        handle_event(data)

def handle_event(data):
    pass

# Replay events from the last hour
now = time.time()
replay_events('audit:events', now - 3600, now)
```

### Latest N Messages per User

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_user_recent_events(user_id, count=5):
    """Get the most recent events for a specific user."""
    stream = f'user:{user_id}:events'
    entries = r.xrevrange(stream, '+', '-', count=count)
    return [(mid, data) for mid, data in entries]

r.xadd('user:42:events', {'type': 'login', 'ip': '1.2.3.4'})
r.xadd('user:42:events', {'type': 'purchase', 'item': 'laptop'})
r.xadd('user:42:events', {'type': 'logout', 'duration': '3600'})

events = get_user_recent_events('42', count=2)
print(f"Recent events for user 42:")
for mid, data in events:
    print(f"  {mid}: {data}")
```

## Summary

`XRANGE` and `XREVRANGE` provide direct range-based access to Redis stream messages by ID - forward and reverse respectively. Use `-` and `+` as open bounds, timestamp-based IDs for time-range queries, and `COUNT` to limit results. For pagination, use exclusive lower bounds by prepending `(` to the last seen ID. These commands are ideal for log viewers, event replay, audit trail queries, and inspecting stream content outside of consumer group workflows.
