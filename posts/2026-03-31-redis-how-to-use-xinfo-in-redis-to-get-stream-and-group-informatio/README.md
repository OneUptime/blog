# How to Use XINFO in Redis to Get Stream and Group Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, XINFO, Consumer Group, Monitoring

Description: Learn how to use XINFO in Redis to inspect stream metadata, consumer group state, and individual consumer details for monitoring and debugging.

---

## What Is XINFO

`XINFO` is a family of commands for inspecting Redis stream internals. It provides metadata about streams, consumer groups, and individual consumers without reading actual message data.

## XINFO Subcommands

```text
XINFO STREAM key [FULL [COUNT count]]
XINFO GROUPS key
XINFO CONSUMERS key group
```

## XINFO STREAM

Returns metadata about a stream including message count, first and last entries, and consumer group count.

```bash
redis-cli XADD orders '*' product "laptop" qty "1"
redis-cli XADD orders '*' product "mouse" qty "2"
redis-cli XGROUP CREATE orders processors $ MKSTREAM

redis-cli XINFO STREAM orders
```

```text
 1) "length"
 2) (integer) 2
 3) "radix-tree-keys"
 4) (integer) 1
 5) "radix-tree-nodes"
 6) (integer) 2
 7) "last-generated-id"
 8) "1743400002000-0"
 9) "max-deleted-entry-id"
10) "0-0"
11) "entries-added"
12) (integer) 2
13) "recorded-first-entry-id"
14) "1743400001000-0"
15) "groups"
16) (integer) 1
17) "first-entry"
18) 1) "1743400001000-0"
    2) 1) "product"
       2) "laptop"
       3) "qty"
       4) "1"
19) "last-entry"
20) 1) "1743400002000-0"
    2) 1) "product"
       2) "mouse"
       3) "qty"
       4) "2"
```

### FULL Mode

```bash
redis-cli XINFO STREAM orders FULL COUNT 5
```

Full mode includes detailed consumer group, consumer, and PEL information.

## XINFO GROUPS

Lists all consumer groups on a stream:

```bash
redis-cli XGROUP CREATE orders analytics 0
redis-cli XINFO GROUPS orders
```

```text
1) 1) "name"
   2) "processors"
   3) "consumers"
   4) (integer) 0
   5) "pending"
   6) (integer) 0
   7) "last-delivered-id"
   8) "1743400002000-0"
   9) "entries-read"
  10) (integer) 2
  11) "lag"
  12) (integer) 0
2) 1) "name"
   2) "analytics"
   ...
```

Key fields:
- `consumers` - number of active consumers
- `pending` - messages delivered but not acknowledged
- `last-delivered-id` - last message ID delivered to any consumer
- `lag` - number of unread messages

## XINFO CONSUMERS

Lists consumers within a group:

```bash
redis-cli XREADGROUP GROUP processors worker1 COUNT 1 STREAMS orders ">"
redis-cli XINFO CONSUMERS orders processors
```

```text
1) 1) "name"
   2) "worker1"
   3) "pending"
   4) (integer) 1
   5) "idle"
   6) (integer) 12345
   7) "inactive"
   8) (integer) 12345
```

Key fields:
- `pending` - messages currently in this consumer's PEL
- `idle` - milliseconds since last attempted interaction
- `inactive` - milliseconds since last successful interaction

## Practical Examples

### Stream Health Dashboard

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def stream_health_report(stream):
    info = r.xinfo_stream(stream)
    groups = r.xinfo_groups(stream)

    print(f"=== Stream: {stream} ===")
    print(f"  Messages: {info['length']}")
    print(f"  First entry: {info.get('first-entry', 'N/A')}")
    print(f"  Last entry: {info.get('last-entry', 'N/A')}")
    print(f"  Consumer groups: {info['groups']}")

    for group in groups:
        lag = group.get('lag', 'N/A')
        print(f"\n  Group: {group['name']}")
        print(f"    Consumers: {group['consumers']}")
        print(f"    Pending: {group['pending']}")
        print(f"    Lag: {lag}")
        print(f"    Last delivered: {group['last-delivered-id']}")

stream_health_report('orders')
```

### Consumer Staleness Check

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

IDLE_THRESHOLD_MS = 5 * 60 * 1000  # 5 minutes

def find_stale_consumers(stream, group):
    """Find consumers that have been idle too long."""
    consumers = r.xinfo_consumers(stream, group)
    stale = []

    for consumer in consumers:
        idle_ms = consumer['idle']
        pending = consumer['pending']

        if idle_ms > IDLE_THRESHOLD_MS and pending > 0:
            stale.append({
                'name': consumer['name'],
                'idle_minutes': round(idle_ms / 60000, 1),
                'pending': pending
            })

    return stale

stale = find_stale_consumers('orders', 'processors')
if stale:
    for c in stale:
        print(f"Stale consumer: {c['name']} - idle {c['idle_minutes']}min, {c['pending']} pending")
```

### Consumer Group Lag Monitor

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def monitor_group_lag(stream, alert_lag=100):
    groups = r.xinfo_groups(stream)
    alerts = []

    for group in groups:
        lag = group.get('lag', 0)
        if lag and lag > alert_lag:
            alerts.append({
                'stream': stream,
                'group': group['name'],
                'lag': lag,
                'pending': group['pending']
            })

    return alerts

while True:
    alerts = monitor_group_lag('orders', alert_lag=50)
    for alert in alerts:
        print(f"LAG ALERT: {alert['group']} in {alert['stream']} is {alert['lag']} messages behind")
    time.sleep(10)
```

### Get Stream Summary

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_stream_summary(stream):
    try:
        info = r.xinfo_stream(stream)
        return {
            'length': info['length'],
            'groups': info['groups'],
            'last_id': info.get('last-generated-id', 'N/A'),
        }
    except redis.exceptions.ResponseError:
        return None  # Stream doesn't exist

summary = get_stream_summary('orders')
print(f"Stream summary: {summary}")
```

## Summary

`XINFO STREAM` provides metadata about message count, first/last entries, and group count; `XINFO GROUPS` exposes per-group lag and pending counts for monitoring consumer health; and `XINFO CONSUMERS` shows individual consumer pending counts and idle times for detecting stale or crashed workers. Together they provide full observability into Redis Streams without reading actual message payloads.
