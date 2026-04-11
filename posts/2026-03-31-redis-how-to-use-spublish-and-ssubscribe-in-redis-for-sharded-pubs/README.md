# How to Use SPUBLISH and SSUBSCRIBE in Redis for Sharded Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Sharding, Cluster, Scalability

Description: Learn how to use SPUBLISH and SSUBSCRIBE in Redis 7.0+ for sharded Pub/Sub, which distributes channel load across cluster nodes for better scalability.

---

## What Is Sharded Pub/Sub

Redis 7.0 introduced sharded Pub/Sub as an alternative to traditional Pub/Sub in cluster mode. In traditional Redis cluster Pub/Sub, messages are broadcast to all nodes - every `PUBLISH` propagates cluster-wide. Sharded Pub/Sub assigns each channel to a specific cluster shard (based on hash slot), so messages only travel to nodes that own that shard.

The new commands are:
- `SSUBSCRIBE` - subscribe to a sharded channel
- `SUNSUBSCRIBE` - unsubscribe from a sharded channel
- `SPUBLISH` - publish to a sharded channel

## Requirements

Sharded Pub/Sub requires Redis 7.0+ in cluster mode. It does not work on standalone instances.

## SSUBSCRIBE Command

```text
SSUBSCRIBE shardchannel [shardchannel ...]
```

```bash
SSUBSCRIBE orders:us-east
SSUBSCRIBE {payments}.eu-west {payments}.asia
```

Note: all channels in a single `SSUBSCRIBE` call must belong to the same hash slot. Use separate calls for channels in different slots.

Each subscription confirmation returns:

```text
1) "ssubscribe"
2) "orders:us-east"
3) (integer) 1
```

## SPUBLISH Command

```text
SPUBLISH shardchannel message
```

```bash
SPUBLISH orders:us-east "order-id:12345"
SPUBLISH payments:eu-west "payment-confirmed:abc"
```

The publisher must connect to the node that owns the hash slot for that channel. Client libraries handle this routing automatically.

## SUNSUBSCRIBE Command

```text
SUNSUBSCRIBE [shardchannel [shardchannel ...]]
```

```bash
SUNSUBSCRIBE orders:us-east
SUNSUBSCRIBE   # leave all sharded channels
```

## Traditional vs Sharded Pub/Sub

| Feature | PUBLISH/SUBSCRIBE | SPUBLISH/SSUBSCRIBE |
|---------|-------------------|---------------------|
| Redis version | All | 7.0+ cluster only |
| Message routing | All cluster nodes | Owning shard only |
| Scalability | Limited in cluster | Horizontal |
| Cross-node overhead | High | Minimal |

## Practical Example in Python

```python
import redis
from redis.cluster import RedisCluster

# Sharded pub/sub requires cluster client
cluster = RedisCluster(
    host='redis-cluster-node',
    port=7000,
    decode_responses=True
)

# Subscriber side
def subscribe_sharded():
    pubsub = cluster.pubsub()
    # Note: use ssubscribe for sharded channels
    pubsub.ssubscribe('orders:us-east', 'orders:us-west')

    for message in pubsub.listen():
        if message['type'] == 'smessage':
            print(f"Shard channel: {message['channel']}")
            print(f"Message: {message['data']}")

# Publisher side
def publish_sharded():
    cluster.spublish('orders:us-east', 'New order received')
```

## Practical Example in Node.js

```javascript
const { createCluster } = require('redis');

const cluster = createCluster({
  rootNodes: [
    { host: 'redis-node-1', port: 7000 },
    { host: 'redis-node-2', port: 7001 },
    { host: 'redis-node-3', port: 7002 },
  ]
});

await cluster.connect();

// Create a dedicated subscriber client
const subscriber = cluster.duplicate();
await subscriber.connect();

// Subscribe to sharded channel
await subscriber.sSubscribe('orders:us-east', (message, channel) => {
  console.log(`Sharded message on ${channel}: ${message}`);
});

// Publish to sharded channel
await cluster.sPublish('orders:us-east', 'order-12345-confirmed');
```

## Channel Name and Hash Slot Assignment

Channels are assigned to hash slots the same way keys are, using CRC16 hashing. You can use hash tags `{...}` to co-locate related channels on the same shard:

```bash
# These channels will be on the same shard
SSUBSCRIBE {orders}.us-east
SSUBSCRIBE {orders}.us-west

# Publisher
SPUBLISH {orders}.us-east "new-order"
SPUBLISH {orders}.us-west "new-order"
```

## When to Use Sharded vs Traditional Pub/Sub

Use sharded Pub/Sub when:
- Running Redis in cluster mode with many nodes
- You have high message throughput that saturates a single node
- You want per-channel scalability without cluster-wide broadcast overhead

Use traditional Pub/Sub when:
- Running standalone Redis
- All subscribers need to receive all messages regardless of node
- You use pattern subscriptions (`PSUBSCRIBE`)

Note: `SPUBLISH`/`SSUBSCRIBE` do not support pattern subscriptions.

## Monitoring Sharded Channels

```bash
# List active sharded channels
PUBSUB SHARDCHANNELS [pattern]

# Count subscribers per sharded channel
PUBSUB SHARDNUMSUB [channel ...]
```

```bash
PUBSUB SHARDCHANNELS *
# 1) "orders:us-east"
# 2) "payments:eu-west"

PUBSUB SHARDNUMSUB orders:us-east payments:eu-west
# 1) "orders:us-east"
# 2) (integer) 3
# 3) "payments:eu-west"
# 4) (integer) 1
```

## Summary

`SPUBLISH` and `SSUBSCRIBE` enable sharded Pub/Sub in Redis 7.0+ cluster mode, routing messages only to the shard that owns each channel based on hash slot assignment. This dramatically reduces cross-node traffic compared to traditional Pub/Sub, making it the right choice for high-throughput pub/sub workloads in Redis cluster deployments.
