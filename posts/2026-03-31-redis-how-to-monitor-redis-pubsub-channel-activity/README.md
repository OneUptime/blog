# How to Monitor Redis Pub/Sub Channel Activity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Monitoring, Observability, PUBSUB Commands

Description: Monitor Redis Pub/Sub channel activity using PUBSUB commands to list active channels, count subscribers, and measure message throughput.

---

## Overview of PUBSUB Monitoring Commands

Redis provides the `PUBSUB` family of commands for introspecting active channel state:

| Command | Description |
|---|---|
| `PUBSUB CHANNELS [pattern]` | List active channels with at least one subscriber |
| `PUBSUB NUMSUB [channel ...]` | Number of subscribers per channel |
| `PUBSUB NUMPAT` | Total number of active pattern subscriptions |
| `PUBSUB SHARDCHANNELS [pattern]` | List active sharded channels (Redis 7.0+) |
| `PUBSUB SHARDNUMSUB [channel ...]` | Subscribers per sharded channel (Redis 7.0+) |

## Step 1 - List Active Channels

```bash
# List all channels with active subscribers
redis-cli PUBSUB CHANNELS

# List channels matching a pattern
redis-cli PUBSUB CHANNELS 'events.*'
redis-cli PUBSUB CHANNELS 'order:*'
```

Example output:

```text
1) "events.user"
2) "events.order"
3) "notifications"
```

An "active" channel means at least one client is subscribed. Channels with zero subscribers do not appear.

## Step 2 - Count Subscribers Per Channel

```bash
redis-cli PUBSUB NUMSUB events.user events.order notifications
```

Output:

```text
1) "events.user"
2) (integer) 5
3) "events.order"
4) (integer) 3
5) "notifications"
6) (integer) 1
```

## Step 3 - Count Pattern Subscriptions

```bash
redis-cli PUBSUB NUMPAT
```

Returns the total number of active PSUBSCRIBE subscriptions (not per-channel, just the total pattern count).

## Step 4 - Build a Channel Monitor Script

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379)

def print_pubsub_stats():
    # Get all active channels
    channels = r.pubsub_channels()

    if not channels:
        print("No active channels")
        return

    # Get subscriber counts
    channel_names = [c.decode() if isinstance(c, bytes) else c for c in channels]
    if channel_names:
        counts = r.pubsub_numsub(*channel_names)
        print(f"\n{'Channel':<40} {'Subscribers':<12}")
        print('-' * 55)
        for channel, count in counts:
            if isinstance(channel, bytes):
                channel = channel.decode()
            print(f"{channel:<40} {count:<12}")

    # Pattern subscriptions
    numpat = r.pubsub_numpat()
    print(f"\nActive pattern subscriptions: {numpat}")

while True:
    print_pubsub_stats()
    time.sleep(10)
```

## Step 5 - Measure Message Throughput

Redis does not natively count messages per channel. Use `MONITOR` to observe Pub/Sub traffic (development only - impacts performance):

```bash
redis-cli MONITOR | grep -E 'PUBLISH|publish'
```

For production, instrument your publisher code:

```python
import redis
import time
from collections import defaultdict

r = redis.Redis(host='localhost', port=6379)
publish_counts = defaultdict(int)

def publish_with_tracking(channel, message):
    r.publish(channel, message)
    publish_counts[channel] += 1

# Periodically log counts
def log_publish_rates():
    while True:
        time.sleep(60)
        for channel, count in publish_counts.items():
            print(f"Channel {channel}: {count} messages/min")
        publish_counts.clear()
```

## Step 6 - Alert on Orphaned Subscribers

An orphaned subscriber is connected but the publisher has stopped. Messages stop flowing but the subscriber stays connected, holding an idle connection.

```python
def find_orphaned_channels(inactivity_threshold=300):
    """
    Returns channels that have subscribers but
    have not received messages recently.
    (Requires external tracking of last publish time)
    """
    channels = r.pubsub_channels()
    return [
        c for c in channels
        if last_publish_time.get(c, 0) < time.time() - inactivity_threshold
    ]
```

## Step 7 - Verify Delivery with a Test Publisher

Check if subscribers are receiving by publishing a test message:

```python
def verify_channel(channel, timeout=5):
    received = []
    sub_r = redis.Redis(host='localhost', port=6379)
    pubsub = sub_r.pubsub()
    pubsub.subscribe(channel)
    pubsub.get_message(timeout=1)  # consume subscribe confirmation

    # Publish test message
    r.publish(channel, 'HEALTH_CHECK')

    # Wait for it to be received
    deadline = time.time() + timeout
    for msg in pubsub.listen():
        if msg['type'] == 'message' and msg['data'] == b'HEALTH_CHECK':
            received.append(msg)
            break
        if time.time() > deadline:
            break

    pubsub.unsubscribe(channel)
    return len(received) > 0

ok = verify_channel('notifications')
print(f"Channel delivery working: {ok}")
```

## Step 8 - Integrate with Prometheus

Export Pub/Sub metrics using the redis_exporter Prometheus exporter, or instrument directly:

```python
from prometheus_client import Gauge

pubsub_subscribers = Gauge('redis_pubsub_subscribers', 'Active subscribers', ['channel'])

def update_metrics():
    channels = r.pubsub_channels()
    if channels:
        channel_names = [c.decode() if isinstance(c, bytes) else c for c in channels]
        counts = r.pubsub_numsub(*channel_names)
        for channel, count in counts:
            if isinstance(channel, bytes):
                channel = channel.decode()
            pubsub_subscribers.labels(channel=channel).set(count)
```

## Summary

Monitor Redis Pub/Sub activity with `PUBSUB CHANNELS`, `PUBSUB NUMSUB`, and `PUBSUB NUMPAT` to track active channels, subscriber counts, and pattern subscription totals. Instrument publishers to measure message throughput since Redis does not natively count per-channel message rates. Set up periodic monitoring to detect subscriber accumulation, orphaned channels, and unexpected subscriber count changes.
