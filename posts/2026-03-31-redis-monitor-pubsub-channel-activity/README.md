# How to Monitor Pub/Sub Channel Activity in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Monitoring, PubSub, Channel, Observability, Operation

Description: Use Redis PUBSUB commands and keyspace notifications to monitor active channels, subscriber counts, and message throughput in your Redis Pub/Sub deployment.

---

Redis Pub/Sub is easy to set up but can be hard to observe in production. Without visibility into channel activity, you cannot tell how many subscribers are connected, which channels are busiest, or whether publishers are producing messages that nobody is consuming. Redis provides built-in `PUBSUB` introspection commands that give you this visibility without any external tooling.

## List Active Channels

```bash
# All channels with at least one subscriber
redis-cli PUBSUB CHANNELS "*"

# Channels matching a pattern
redis-cli PUBSUB CHANNELS "events:*"

# Count total active channels
redis-cli PUBSUB CHANNELS "*" | wc -l
```

## Get Subscriber Counts per Channel

```bash
# Count subscribers for specific channels
redis-cli PUBSUB NUMSUB events:orders events:inventory events:alerts

# Example output:
# 1) "events:orders"
# 2) (integer) 14
# 3) "events:inventory"
# 4) (integer) 3
# 5) "events:alerts"
# 6) (integer) 0
```

## Count Pattern Subscriptions

```bash
# Total number of active pattern subscriptions (PSUBSCRIBE)
redis-cli PUBSUB NUMPAT
```

## Monitor Pub/Sub with MONITOR (Development Only)

The `MONITOR` command streams every command received by Redis, including `PUBLISH` calls:

```bash
redis-cli MONITOR | grep PUBLISH
```

**Warning:** `MONITOR` has significant performance impact. Use it briefly in development, never in production during peak load.

## Keyspace Notifications for Pub/Sub Events

Enable keyspace notifications to track key-level data events (such as SET, DEL, and EXPIRE operations):

```bash
# Enable keyspace event notifications (K = keyspace, E = keyevent, g = generic commands)
redis-cli CONFIG SET notify-keyspace-events "KEg"
```

Then subscribe to the keyevent channel to watch for key changes:

```bash
redis-cli PSUBSCRIBE '__keyevent@0__:*'
```

## Python Script: Poll Channel Activity

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

channels_to_monitor = ['events:orders', 'events:inventory', 'events:alerts']

while True:
    counts = r.pubsub_numsub(*channels_to_monitor)
    pattern_subs = r.pubsub_numpat()
    active_channels = r.pubsub_channels('*')

    print(f"--- {time.strftime('%H:%M:%S')} ---")
    print(f"Active channels: {len(active_channels)}")
    print(f"Pattern subscriptions: {pattern_subs}")
    for channel, num_subs in counts.items():
        print(f"  {channel}: {num_subs} subscribers")
    print()
    time.sleep(5)
```

## Track Message Throughput with INFO Stats

```bash
# Current Pub/Sub state from server stats
redis-cli INFO stats | grep pubsub

# Example output:
# pubsub_channels:12
# pubsub_patterns:3
# pubsub_shardchannels:0
```

## Grafana Dashboard Metrics

Export these metrics to Prometheus via `redis_exporter`:

| Metric | Description |
|---|---|
| `redis_pubsub_channels` | Number of channels with subscribers |
| `redis_pubsub_patterns` | Number of pattern subscriptions |
| `redis_commands_total{cmd="publish"}` | PUBLISH command rate |
| `redis_commands_total{cmd="subscribe"}` | SUBSCRIBE command rate |

## Summary

Redis provides `PUBSUB CHANNELS`, `PUBSUB NUMSUB`, and `PUBSUB NUMPAT` for real-time introspection of Pub/Sub activity. Pair these with `INFO stats` polling and a Prometheus exporter to build a monitoring dashboard. Watch for channels with zero subscribers (wasted publishes) and rapid subscriber churn (unstable consumers) as early warning signs of Pub/Sub misconfigurations.
