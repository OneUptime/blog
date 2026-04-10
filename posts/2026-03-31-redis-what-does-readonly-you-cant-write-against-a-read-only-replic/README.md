# What Does 'READONLY You can't write against a read only replica' Mean

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, READONLY, Replica, Replication, Troubleshooting

Description: Learn why Redis returns the READONLY error when writing to a replica, when replicas can accept writes, and how to fix routing issues in your application.

---

## What Is the READONLY Error

When you send a write command to a Redis replica (formerly called a slave), Redis returns:

```text
(error) READONLY You can't write against a read only replica.
```

By default, Redis replicas are read-only. They receive data from the primary and serve read requests but reject write commands to prevent data inconsistency.

## Why This Happens

Common causes:

1. Your application is connected to a replica instead of the primary
2. A primary/replica failover happened and the old primary is now a replica
3. Redis Sentinel or Cluster promoted a new primary, but your application still points to the old address
4. Your load balancer is sending write traffic to all Redis nodes including replicas
5. You intentionally enabled replica read-only mode and a write is incorrectly routed

## How to Diagnose

### Check if the Node Is a Replica

```bash
redis-cli ROLE
```

If the output starts with `slave`, this node is a replica (the ROLE command returns `slave` even in newer Redis versions):

```text
1) "slave"
2) "10.0.0.1"
3) (integer) 6379
4) "connected"
5) (integer) 12345678
```

If it returns `master`, the node is a primary.

### Check Replication Status

```bash
redis-cli INFO replication
```

```text
role:slave
master_host:10.0.0.1
master_port:6379
master_link_status:up
master_last_io_seconds_ago:1
master_sync_in_progress:0
slave_repl_offset:12345678
slave_priority:100
slave_read_only:1
```

The `slave_read_only:1` field confirms the replica is read-only.

## How to Fix

### Fix 1 - Connect to the Primary Instead

Identify the primary:

```bash
redis-cli -h replica-host INFO replication | grep master_host
```

Update your application connection string to use the primary host.

### Fix 2 - Use Sentinel for Automatic Primary Discovery

If you are using Redis Sentinel, connect through Sentinel so your application always finds the current primary:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([
    ('sentinel1', 26379),
    ('sentinel2', 26379),
    ('sentinel3', 26379)
], socket_timeout=0.1)

# Get the current primary connection
primary = sentinel.master_for('mymaster', socket_timeout=0.1)

# Get a replica connection (for reads)
replica = sentinel.slave_for('mymaster', socket_timeout=0.1)

# Write to primary
primary.set('key', 'value')

# Read from replica
value = replica.get('key')
```

### Fix 3 - Use Redis Cluster Client

If using Redis Cluster, use a cluster-aware client that routes writes to the correct node:

```javascript
const Redis = require('ioredis');

const cluster = new Redis.Cluster([
  { host: '10.0.0.1', port: 6379 },
  { host: '10.0.0.2', port: 6379 },
  { host: '10.0.0.3', port: 6379 }
]);

// ioredis cluster client routes writes to the correct primary
cluster.set('key', 'value');
```

### Fix 4 - Allow Writes to Replica (Temporary)

In rare cases (for specific use cases like local caching on a replica), you can allow writes to a replica. Note that data written directly to a replica is not replicated back to the primary and will be overwritten on the next full sync:

```bash
redis-cli CONFIG SET replica-read-only no
# or older Redis
redis-cli CONFIG SET slave-read-only no
```

In `redis.conf`:

```text
replica-read-only no
```

This is generally not recommended for production as it creates data divergence.

### Fix 5 - After Failover - Update Connection

If a Sentinel failover occurred and your application is now pointing to the old primary (which became a replica):

```bash
# Check Sentinel to find new primary
redis-cli -h sentinel-host -p 26379 SENTINEL get-master-addr-by-name mymaster
```

Update the application configuration to point to the new primary address.

## Handling READONLY in Application Code

```python
import redis
from redis.exceptions import ReadOnlyError

r = redis.Redis(host='redis-host', port=6379)

def safe_set(key, value):
    try:
        r.set(key, value)
    except ReadOnlyError:
        # Log and potentially try to reconnect to primary
        print(f"Write to read-only replica rejected for key {key}")
        raise
```

In Node.js:

```javascript
redis.set('key', 'value').catch((err) => {
  if (err.message.includes('READONLY')) {
    console.error('Connected to a read-only replica - check connection routing');
  }
});
```

## Prevention

- Use Sentinel or Cluster clients that automatically route writes to the primary
- Never use a raw replica address for write operations in production
- Monitor Sentinel events and update application configs on failover
- Use health check endpoints that verify `ROLE` returns `master` for your write endpoint

## Summary

The READONLY error means your application is sending write commands to a Redis replica instead of the primary. Fix it by identifying the current primary using `ROLE` or `INFO replication`, updating your connection string, or using a Sentinel-aware client that automatically discovers and connects to the primary. In Redis Cluster, use a cluster client that routes writes to the correct shard primary.
