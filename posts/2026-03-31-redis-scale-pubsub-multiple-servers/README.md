# How to Scale Redis Pub/Sub Across Multiple Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Scaling, Cluster, Architecture

Description: Learn how to scale Redis Pub/Sub across multiple application servers and Redis instances using a shared Redis broker, Cluster, and sharded pub/sub patterns.

---

When your application runs on multiple servers, each server needs to receive published messages. A naive local pub/sub won't propagate messages between servers. Redis serves as a shared pub/sub broker that all servers connect to.

## Single Redis, Multiple App Servers

The simplest scaling pattern: all application servers connect to the same Redis instance. Publishers and subscribers on any server communicate through the shared Redis broker.

```python
import redis

# All app servers use the same Redis connection
REDIS_URL = 'redis://redis-broker:6379'
r = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# Server A publishes
r.publish('notifications', 'user 42 logged in')

# Server B (subscribed to the same Redis) receives it
pubsub = r.pubsub()
pubsub.subscribe('notifications')
for msg in pubsub.listen():
    if msg['type'] == 'message':
        print(f"Server B received: {msg['data']}")
```

## Scaling Subscriber Count

Each subscriber connection occupies a Redis client slot and uses memory for output buffers. For large numbers of subscribers, use connection pooling and fan-out at the application layer:

```python
import asyncio
from redis.asyncio import Redis

async def pubsub_fanout(channels, local_handlers):
    """Single Redis connection fans out to many local handlers"""
    r = Redis.from_url('redis://redis-broker:6379')
    pubsub = r.pubsub()
    await pubsub.subscribe(*channels)

    async for msg in pubsub.listen():
        if msg['type'] == 'message':
            channel = msg['channel']
            data = msg['data']
            # Broadcast to all local WebSocket clients
            for handler in local_handlers.get(channel, []):
                await handler(data)
```

This pattern means one Redis subscriber per application server, not one per WebSocket client.

## Redis Cluster and Pub/Sub

In Redis Cluster, pub/sub messages are propagated to all cluster nodes, but subscribers connected to any node receive messages published to any other node. This works correctly but involves internal node-to-node message propagation:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(
    host='redis-cluster',
    port=6379,
    decode_responses=True
)

# Publish to any node - Redis Cluster propagates to all nodes
rc.publish('events', 'message')

# Subscriber on a different node receives it
```

## Sharded Pub/Sub (Redis 7.0+)

Redis 7.0 introduced `SSUBSCRIBE` / `SUNSUBSCRIBE` / `SPUBLISH` for sharded pub/sub. Messages stay on the shard responsible for the channel, reducing cross-node traffic:

```bash
# Subscribe to a sharded channel
SSUBSCRIBE orders:created

# Publish to a sharded channel (stays on one shard)
SPUBLISH orders:created '{"order_id":1001}'
```

```python
def sharded_subscribe(channel):
    """Use sharded pub/sub for cluster-friendly messaging"""
    pubsub = rc.sharded_pubsub()
    pubsub.ssubscribe(channel)

    for msg in pubsub.listen():
        if msg['type'] == 'smessage':
            print(f"Sharded message: {msg['data']}")
```

Sharded pub/sub is more efficient in cluster environments because published messages don't broadcast to all nodes - only the responsible shard processes and delivers them.

## Load Balancing Subscribers

Redis Pub/Sub is node-local: subscribers only receive messages published on the same Redis instance they are connected to. Publishing on the primary does **not** propagate messages to replicas. All subscribers must connect to the same instance as the publishers:

```python
import redis

# Pub/Sub is node-local - replicas do NOT receive messages published on the primary
# All subscribers must connect to the same instance where PUBLISH is called
primary = redis.Redis(host='redis-primary')

# Publish goes to primary
primary.publish('high-volume-channel', 'data')

# Subscribe must also connect to primary
pubsub = primary.pubsub()
pubsub.subscribe('high-volume-channel')
for msg in pubsub.listen():
    if msg['type'] == 'message':
        print(msg['data'])
```

To handle high subscriber counts on a single instance, use the application-level fan-out pattern described above, or use Redis Cluster with sharded pub/sub.

## Monitoring Pub/Sub Scale

```bash
# Count connected clients
CLIENT LIST TYPE pubsub

# Count active channels and pattern subscriptions
PUBSUB CHANNELS *
PUBSUB NUMPAT

# Check memory used by subscriber output buffers
INFO clients
```

## Summary

Scale Redis Pub/Sub across multiple app servers by connecting all servers to the same Redis instance as both publishers and subscribers. For large subscriber counts, use one Redis connection per server with application-level fan-out to local clients. In Redis Cluster, use sharded pub/sub (`SSUBSCRIBE`/`SPUBLISH`) to keep messages on a single shard and reduce cross-node propagation overhead.
