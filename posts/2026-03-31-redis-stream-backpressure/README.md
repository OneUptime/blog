# How to Handle Stream Backpressure in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Backpressure, Flow Control, Consumer Group

Description: Learn how to detect and handle backpressure in Redis Streams when consumers fall behind producers, using stream length limits, lag monitoring, and rate control.

---

Backpressure occurs when producers write to a Redis Stream faster than consumers can process messages. Without controls, the stream grows unbounded, consuming memory and eventually causing Redis to run out of resources.

## Detecting Backpressure

Check consumer group lag to see if consumers are falling behind:

```bash
# Check lag per consumer group
XINFO GROUPS tasks:queue

# Look for the "lag" field in the output
# 1) "lag"
# 2) (integer) 15432  <- consumers are 15,432 messages behind
```

```python
import redis

r = redis.Redis(decode_responses=True)

def get_consumer_lag(stream, group):
    groups = r.xinfo_groups(stream)
    for g in groups:
        if g['name'] == group:
            return g.get('lag', 0)
    return None

lag = get_consumer_lag('tasks:queue', 'workers')
if lag and lag > 10000:
    print(f"WARNING: Consumer lag is {lag} messages")
```

## Limiting Stream Size (Primary Defense)

The most important control is capping the stream length with `MAXLEN`:

```bash
# Approximate trim to last 100,000 messages (fast, uses ~ for efficiency)
XADD tasks:queue MAXLEN ~ 100000 * job_type send_email payload '...'
```

Approximate trimming (`~`) is faster than exact trimming because Redis only trims when it can remove whole macro nodes (listpacks) entirely, avoiding the cost of partially modifying individual nodes.

## Producer-Side Rate Limiting

Slow down producers when the stream gets too large:

```python
import time

MAX_STREAM_LENGTH = 50000
SLEEP_WHEN_FULL = 0.1  # seconds

def rate_limited_publish(stream, data):
    while True:
        stream_len = r.xlen(stream)

        if stream_len < MAX_STREAM_LENGTH:
            r.xadd(stream, data, maxlen=MAX_STREAM_LENGTH, approximate=True)
            return

        print(f"Stream at {stream_len}, applying backpressure...")
        time.sleep(SLEEP_WHEN_FULL)
```

## Scaling Consumers to Reduce Lag

Add more consumers to a group to increase throughput:

```python
import threading

def start_worker_pool(stream, group, num_workers):
    threads = []
    for i in range(num_workers):
        consumer_name = f'worker-{i}'
        t = threading.Thread(
            target=consume_messages,
            args=(stream, group, consumer_name),
            daemon=True
        )
        t.start()
        threads.append(t)
    return threads

# Scale up when lag is high
if get_consumer_lag('tasks:queue', 'workers') > 5000:
    start_worker_pool('tasks:queue', 'workers', num_workers=10)
```

## Shedding Load When Overwhelmed

When consumers cannot keep up even at full capacity, shed non-critical work:

```python
def publish_with_priority(stream, data, priority='normal'):
    stream_len = r.xlen(stream)

    # Shed low-priority work when stream is too long
    if stream_len > 80000 and priority == 'low':
        print(f"Dropping low-priority job, stream at {stream_len}")
        return None

    # Always allow high-priority work
    return r.xadd(stream, {**data, 'priority': priority}, maxlen=100000, approximate=True)
```

## Monitoring Backpressure

Set up alerts on stream metrics:

```bash
# Stream length
XLEN tasks:queue

# Consumer group lag
XINFO GROUPS tasks:queue

# Memory used by stream
MEMORY USAGE tasks:queue
```

Alert thresholds to consider:
- Warning: lag > 1,000 messages or stream length > 50% of max
- Critical: lag > 10,000 messages or stream length > 90% of max

## Summary

Backpressure in Redis Streams is managed through stream length limits with `MAXLEN`, producer-side rate limiting when streams grow too large, and scaling consumer groups to increase throughput. Monitor consumer group lag via `XINFO GROUPS` and set alerts to catch growing backlogs before they exhaust Redis memory.
