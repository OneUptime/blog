# How to Use Sharded Pub/Sub in Redis 7.0+

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Sharding, Cluster, Redis 7.0

Description: Use Redis 7.0 sharded Pub/Sub with SSUBSCRIBE and SPUBLISH to route messages through specific cluster shards and avoid cross-slot fan-out overhead.

---

## The Problem with Classic Pub/Sub in Clusters

In Redis Cluster, traditional Pub/Sub messages are broadcast to every node in the cluster. A `PUBLISH` command sent to any node is forwarded to all other nodes so subscribers on any node receive the message. This creates O(N) traffic proportional to the number of nodes for every published message.

At scale (dozens of nodes), this gossip-style broadcast wastes network bandwidth and limits throughput.

Sharded Pub/Sub, introduced in Redis 7.0, solves this: each channel is pinned to a specific shard (hash slot), and messages only go to nodes owning that slot.

## How Sharded Pub/Sub Works

- `SSUBSCRIBE` subscribes to a shard channel
- `SPUBLISH` publishes to a shard channel
- The channel name is hashed to a slot (same algorithm as regular keys)
- Messages are only delivered to clients subscribed to that channel on the owning shard
- No cross-shard broadcasting

This gives linear scalability: adding more shards increases Pub/Sub capacity proportionally.

## Step 1 - Enable Sharded Pub/Sub

No configuration is required. It is available on any Redis 7.0+ Cluster automatically.

Verify your Redis version:

```bash
redis-cli INFO server | grep redis_version
```

## Step 2 - Subscribe with SSUBSCRIBE

```bash
# Connect to the cluster node that owns the slot for 'orders'
redis-cli -c -h redis-node1 -p 6379 SSUBSCRIBE orders
```

The `-c` flag enables cluster mode (auto-follow redirections). Redis will redirect you to the node owning the `orders` hash slot.

```text
Reading messages... (press Ctrl-C to quit)
1) "ssubscribe"
2) "orders"
3) (integer) 1
```

## Step 3 - Publish with SPUBLISH

```bash
redis-cli -c -h redis-node1 -p 6379 SPUBLISH orders '{"id":123,"status":"created"}'
```

Returns the number of clients that received the message (on the owning shard only).

## Step 4 - Using Sharded Pub/Sub in Python

```python
import redis
from redis.cluster import RedisCluster

# Connect to cluster
rc = RedisCluster(host='redis-node1', port=6379)

# Publisher
def publish_order(order_id, status):
    channel = f'orders:{order_id % 100}'  # Fan out across 100 channel shards
    message = f'{{"id":{order_id},"status":"{status}"}}'
    count = rc.spublish(channel, message)
    print(f"Delivered to {count} subscribers")

# Subscriber (uses shard-aware pubsub)
pubsub = rc.pubsub()
pubsub.ssubscribe('orders:42')  # Must use exact channel names, no pattern matching

for message in pubsub.listen():
    if message['type'] == 'smessage':
        print(f"Channel: {message['channel']}, Data: {message['data']}")
```

**Note:** Sharded Pub/Sub does not support pattern subscriptions. You must subscribe to exact channel names.

## Step 5 - Using Hash Tags for Channel Co-location

To ensure related channels land on the same shard, use hash tags:

```bash
# Both channels share slot for 'orders' - delivered by same shard
SSUBSCRIBE {orders}:created
SSUBSCRIBE {orders}:updated
SSUBSCRIBE {orders}:cancelled

SPUBLISH {orders}:created '{"id":123}'
```

All channels with `{orders}` in their name will be co-located on the same shard.

## Step 6 - Check Shard Channel Subscriptions

```bash
redis-cli -c PUBSUB SHARDCHANNELS
```

Returns all active sharded channel names.

```bash
redis-cli -c PUBSUB SHARDNUMSUB orders notifications
```

Returns the number of subscribers per sharded channel.

## Step 7 - Classic vs Sharded Pub/Sub Comparison

| Feature | Classic PUBLISH/SUBSCRIBE | Sharded SPUBLISH/SSUBSCRIBE |
|---|---|---|
| Cluster broadcast | Yes (all nodes) | No (owning shard only) |
| Pattern subscriptions | Yes (PSUBSCRIBE) | No |
| Scalability | O(N nodes) overhead | O(1) overhead |
| Cross-slot messages | Transparent | Subscriber must connect to correct shard |
| Redis version required | Any | 7.0+ |

## Step 8 - Node.js with ioredis

```javascript
const { Cluster } = require('ioredis');

const cluster = new Cluster([
    { host: 'redis-node1', port: 6379 },
    { host: 'redis-node2', port: 6379 },
]);

// Subscriber
const sub = cluster.duplicate();
await sub.ssubscribe('orders');
sub.on('smessage', (channel, message) => {
    console.log(`Channel: ${channel}, Message: ${message}`);
});

// Publisher
await cluster.spublish('orders', JSON.stringify({ id: 123, status: 'created' }));
```

## Summary

Redis 7.0 Sharded Pub/Sub (`SSUBSCRIBE`/`SPUBLISH`) eliminates the cluster-wide broadcast overhead of classic Pub/Sub by routing messages only to the shard owning each channel's hash slot. This enables linear scaling of Pub/Sub throughput with cluster size. The trade-off is that pattern subscriptions are not supported and subscribers must connect to (or be redirected to) the correct shard. Use hash tags to co-locate related channels on the same shard.
