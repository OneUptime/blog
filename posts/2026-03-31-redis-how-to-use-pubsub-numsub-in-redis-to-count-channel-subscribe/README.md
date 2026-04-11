# How to Use PUBSUB NUMSUB in Redis to Count Channel Subscribers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Monitoring, Command

Description: Learn how to use PUBSUB NUMSUB in Redis to get the number of subscribers for specific channels, useful for monitoring and routing decisions.

---

## What Is PUBSUB NUMSUB

`PUBSUB NUMSUB` is a subcommand of the `PUBSUB` introspection command. It returns the subscriber count for one or more named channels. This is useful for monitoring channel activity, making routing decisions, and understanding your pub/sub topology.

```text
PUBSUB NUMSUB [channel [channel ...]]
```

## Basic Usage

```bash
# Count subscribers for specific channels
PUBSUB NUMSUB notifications alerts orders

# Response format: channel name followed by subscriber count
# 1) "notifications"
# 2) (integer) 5
# 3) "alerts"
# 4) (integer) 2
# 5) "orders"
# 6) (integer) 0
```

With no arguments, it returns an empty list:

```bash
PUBSUB NUMSUB
# (empty array)
```

## Checking a Single Channel

```bash
PUBSUB NUMSUB payments
# 1) "payments"
# 2) (integer) 3
```

## Difference from PUBSUB CHANNELS

`PUBSUB CHANNELS` lists channel names with active subscribers. `PUBSUB NUMSUB` gives you the count per channel. Use both together for full visibility:

```bash
# List all active channels
PUBSUB CHANNELS *
# 1) "notifications"
# 2) "alerts"

# Count subscribers per channel
PUBSUB NUMSUB notifications alerts
# 1) "notifications"
# 2) (integer) 4
# 3) "alerts"
# 4) (integer) 1
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_channel_stats(channels):
    result = client.pubsub_numsub(*channels)
    # Returns list of (channel, count) tuples
    stats = {}
    for channel, count in result:
        stats[channel] = count
    return stats

channels = ['notifications', 'alerts', 'orders', 'payments']
stats = get_channel_stats(channels)

for channel, count in stats.items():
    print(f"{channel}: {count} subscriber(s)")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

async function monitorChannels(channels) {
  const result = await client.pubSubNumSub(channels);
  // result is an object: { channelName: count, ... }
  for (const [channel, count] of Object.entries(result)) {
    console.log(`${channel}: ${count} subscriber(s)`);
  }
}

await monitorChannels(['notifications', 'alerts', 'orders']);
```

## Practical Example in Go

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    channels := []string{"notifications", "alerts", "orders"}
    counts, err := rdb.PubSubNumSub(ctx, channels...).Result()
    if err != nil {
        panic(err)
    }

    for channel, count := range counts {
        fmt.Printf("Channel %s: %d subscriber(s)\n", channel, count)
    }
}
```

## Using NUMSUB for Routing Decisions

You can use subscriber counts to decide whether to publish a message:

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def publish_if_subscribers(channel, message):
    result = client.pubsub_numsub(channel)
    # result is [(channel, count)]
    count = result[0][1] if result else 0

    if count > 0:
        delivered = client.publish(channel, message)
        print(f"Message delivered to {delivered} subscriber(s)")
    else:
        print(f"No subscribers on {channel} - consider alternative delivery")

publish_if_subscribers('live-updates', 'New data available')
```

## Monitoring Script

```bash
#!/bin/bash
# Check subscriber counts every 30 seconds
CHANNELS="notifications alerts orders payments"

while true; do
  echo "=== $(date) ==="
  redis-cli PUBSUB NUMSUB $CHANNELS
  sleep 30
done
```

## Pattern Subscribers vs Channel Subscribers

`PUBSUB NUMSUB` counts only direct channel subscribers (from `SUBSCRIBE`). It does not count pattern subscribers (from `PSUBSCRIBE`) even if their patterns match the channel. Use `PUBSUB NUMPAT` for pattern subscriber counts:

```bash
PUBSUB NUMPAT
# (integer) 2  <- total number of pattern subscriptions
```

## Summary

`PUBSUB NUMSUB` lets you query the number of subscribers for specific channels, making it a valuable tool for monitoring, debugging, and intelligent routing in Redis Pub/Sub systems. Remember it only counts direct subscribers and not pattern-based ones - use `PUBSUB NUMPAT` for those.
