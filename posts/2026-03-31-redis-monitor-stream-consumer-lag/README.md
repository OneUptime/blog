# How to Monitor Redis Stream Consumer Lag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Stream, Monitoring, Consumer Group, Lag

Description: Learn how to monitor Redis Stream consumer lag using XINFO GROUPS, track pending entries, and set up alerts to detect when consumers fall behind producers.

---

Consumer lag in Redis Streams is the number of unprocessed messages between where a consumer group's cursor sits and the end of the stream. Monitoring lag helps you detect processing bottlenecks before they become outages.

## Understanding Stream Lag

Redis 7.0 added a `lag` field to `XINFO GROUPS` that directly reports unprocessed message count:

```bash
XINFO GROUPS orders:events
```

```text
1)  1) "name"
    2) "billing"
    3) "consumers"
    4) (integer) 3
    5) "pending"
    6) (integer) 12
    7) "last-delivered-id"
    8) "1711234567890-0"
    9) "entries-read"
    10) (integer) 50234
    11) "lag"
    12) (integer) 4521
```

A `lag` of 4521 means the billing group has 4,521 unprocessed messages.

## Querying Lag Programmatically

```python
import redis

r = redis.Redis(decode_responses=True)

def get_all_group_lags(stream):
    groups = r.xinfo_groups(stream)
    lags = {}
    for group in groups:
        lags[group['name']] = {
            'lag': group.get('lag', 0),
            'pending': group['pending'],
            'consumers': group['consumers'],
            'last_delivered': group['last-delivered-id']
        }
    return lags

lags = get_all_group_lags('orders:events')
for group_name, metrics in lags.items():
    print(f"{group_name}: lag={metrics['lag']}, pending={metrics['pending']}")
```

## Monitoring Pending Entries

Lag measures unread messages, while pending measures messages read but not acknowledged. Both matter:

```bash
# Summary: count, min-id, max-id per group
XPENDING orders:events billing

# Detailed view: who holds what and for how long
XPENDING orders:events billing - + 10
```

```python
def get_long_pending(stream, group, idle_threshold_ms=60000):
    """Find messages pending for more than idle_threshold_ms"""
    pending = r.xpending_range(stream, group, '-', '+', 100)
    long_pending = [
        p for p in pending
        if p['time_since_delivered'] > idle_threshold_ms
    ]
    return long_pending

stuck = get_long_pending('orders:events', 'billing', idle_threshold_ms=30000)
if stuck:
    print(f"WARNING: {len(stuck)} messages stuck for more than 30 seconds")
```

## Computing Lag on Redis < 7.0

For older Redis versions without the `lag` and `entries-read` fields, count entries after the last delivered ID using `XRANGE`:

```python
def compute_lag_legacy(stream, group):
    group_info = next(g for g in r.xinfo_groups(stream) if g['name'] == group)
    last_id = group_info['last-delivered-id']

    if last_id == '0-0':
        # No messages delivered yet, lag is the full stream length
        return r.xlen(stream)

    # XRANGE is inclusive so the result includes last-delivered-id itself
    entries_after = r.xrange(stream, last_id, '+')
    return max(0, len(entries_after) - 1)
```

Note: This scans entries after the cursor, so it may be slow for very large backlogs. Upgrade to Redis 7.0+ for the O(1) `lag` field.

## Setting Up Lag Alerts

Integrate lag checks into your monitoring loop:

```python
import time

LAG_WARNING = 1000
LAG_CRITICAL = 10000

def monitor_streams():
    streams_to_watch = ['orders:events', 'payments:events', 'inventory:events']

    while True:
        for stream in streams_to_watch:
            lags = get_all_group_lags(stream)
            for group_name, metrics in lags.items():
                lag = metrics['lag']
                if lag >= LAG_CRITICAL:
                    alert(f"CRITICAL: {stream}/{group_name} lag={lag}")
                elif lag >= LAG_WARNING:
                    alert(f"WARNING: {stream}/{group_name} lag={lag}")

        time.sleep(30)

def alert(message):
    print(message)
    # Send to PagerDuty, Slack, etc.
```

## Exporting Metrics to Prometheus

```python
from prometheus_client import Gauge, start_http_server

redis_stream_lag = Gauge(
    'redis_stream_consumer_lag',
    'Number of unprocessed messages in consumer group',
    ['stream', 'group']
)

def update_metrics():
    for stream in ['orders:events', 'payments:events']:
        for group_name, metrics in get_all_group_lags(stream).items():
            redis_stream_lag.labels(stream=stream, group=group_name).set(metrics['lag'])
```

## Summary

Monitor Redis Stream consumer lag using `XINFO GROUPS` which provides a `lag` field in Redis 7.0+. Also track pending entry age via `XPENDING` to catch stuck consumers. Set alerts at two thresholds - warning and critical - and expose lag as a Prometheus metric for dashboard visibility and automated alerting.
