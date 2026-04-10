# How to Use Sharded Pub/Sub in Redis 7

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Sharded Pub/Sub, Redis 7, Cluster, SSUBSCRIBE, SPUBLISH, Scalability

Description: Use Redis 7 Sharded Pub/Sub with SSUBSCRIBE and SPUBLISH to distribute Pub/Sub traffic across cluster shards and eliminate cross-shard message fan-out bottlenecks.

---

Classic Redis Pub/Sub in a cluster broadcasts every published message to all cluster nodes, creating a fan-out bottleneck as message rates grow. Redis 7 introduced Sharded Pub/Sub, where each channel is owned by a specific shard based on its hash slot. Publishers send to the owning shard and only subscribers on that shard receive the message, eliminating unnecessary cross-node traffic.

## Prerequisites

- Redis 7.0 or later
- Redis Cluster mode enabled
- Cluster-aware client (redis-py >= 4.3.2, ioredis >= 5.9.0)

## Classic vs Sharded Pub/Sub Comparison

| Feature | Classic Pub/Sub | Sharded Pub/Sub |
|---|---|---|
| Commands | SUBSCRIBE / PUBLISH | SSUBSCRIBE / SPUBLISH |
| Cluster behavior | Fan-out to all nodes | Routed to owning shard |
| Pattern support | PSUBSCRIBE | Not supported |
| Cross-slot multi-key | N/A | Each channel is independent |
| Redis version | All versions | Redis 7.0+ |

## Publish with SPUBLISH

```bash
# Redis routes this to the shard owning the hash slot for "orders"
redis-cli -c SPUBLISH orders '{"order_id": 1001, "status": "paid"}'
```

## Subscribe with SSUBSCRIBE

```bash
# Must connect to the node that owns the channel's hash slot
redis-cli -c SSUBSCRIBE orders
```

The `-c` flag enables cluster-aware redirection in `redis-cli`.

## Python: Sharded Pub/Sub with redis-py

```python
import json

from redis.cluster import RedisCluster

rc = RedisCluster(
    host="127.0.0.1",
    port=7001,
    decode_responses=True,
)

# Sharded pubsub
pubsub = rc.pubsub()

# SSUBSCRIBE routes to the correct shard automatically
pubsub.ssubscribe('orders', 'inventory', 'alerts')

print("Waiting for sharded messages...")
for message in pubsub.listen():
    if message['type'] == 'smessage':
        data = json.loads(message['data'])
        print(f"Channel: {message['channel']}, Data: {data}")
```

## Python: Publish to Sharded Channel

```python
import json

from redis.cluster import RedisCluster

rc = RedisCluster(
    host="127.0.0.1",
    port=7001,
    decode_responses=True,
)

# SPUBLISH routes to the owning shard
receivers = rc.spublish('orders', json.dumps({'order_id': 1001, 'status': 'paid'}))
print(f"Message delivered to {receivers} subscriber(s)")
```

## Node.js: Sharded Pub/Sub with ioredis

```javascript
const { Cluster } = require('ioredis');

const pub = new Cluster([{ host: '127.0.0.1', port: 7001 }]);
const sub = new Cluster([{ host: '127.0.0.1', port: 7001 }], {
  shardedSubscribers: true,
});

// Subscribe using sharded pub/sub
sub.ssubscribe('orders', 'inventory', (err, count) => {
  console.log(`Sharded subscriptions: ${count}`);
});

sub.on('smessage', (channel, message) => {
  console.log(`[${channel}] ${message}`);
});

// Publish
setTimeout(() => {
  pub.spublish('orders', JSON.stringify({ order_id: 1001 }));
}, 1000);
```

## Monitor Sharded Channel Activity

```bash
# Count sharded subscriptions
redis-cli -c PUBSUB SHARDCHANNELS
redis-cli -c PUBSUB SHARDNUMSUB orders inventory alerts
```

## When to Use Sharded Pub/Sub

Use Sharded Pub/Sub when:
- You have a Redis 7 Cluster and high message throughput (>100k messages/sec)
- Classic Pub/Sub is causing cross-node bandwidth saturation
- You have many independent channels that naturally map to different key spaces

Stick with classic Pub/Sub when:
- You need `PSUBSCRIBE` (pattern subscriptions are not supported in sharded mode)
- You are on a single Redis instance (sharding provides no benefit)
- Your cluster is small and fan-out overhead is negligible

## Summary

Redis 7 Sharded Pub/Sub (`SSUBSCRIBE`/`SPUBLISH`) solves the fan-out bottleneck of classic Pub/Sub in cluster mode by routing each channel to its owning shard. Migrate from `SUBSCRIBE`/`PUBLISH` to `SSUBSCRIBE`/`SPUBLISH` to scale horizontally with cluster size, keeping in mind that pattern subscriptions are not supported in sharded mode.
