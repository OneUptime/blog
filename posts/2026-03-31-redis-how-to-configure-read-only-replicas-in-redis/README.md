# How to Configure Read-Only Replicas in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Read-Only, Configuration, Scalability

Description: Learn how to configure Redis replicas as read-only nodes, enforce read restrictions, and safely allow select write commands for local state.

---

## What Are Read-Only Replicas?

By default, Redis replicas are read-only. This means clients connected to a replica can issue read commands (GET, LRANGE, HGETALL, etc.) but any write command (SET, DEL, LPUSH, etc.) will be rejected with an error:

```text
READONLY You can't write against a read only replica.
```

Read-only mode protects the replica's dataset from diverging from the primary.

## Enabling Read-Only Mode

The `replica-read-only` directive controls this behavior. It is `yes` by default:

```text
# redis.conf
replica-read-only yes
```

To verify at runtime:

```bash
redis-cli CONFIG GET replica-read-only
```

Output:

```text
1) "replica-read-only"
2) "yes"
```

## Why Read-Only Mode Is Important

If a client writes directly to a replica, that data is not replicated back to the primary. When the primary sends its replication stream, it can overwrite or conflict with those local writes. This leads to data inconsistency that is difficult to debug.

Always keep replicas read-only in production unless you have a specific, well-understood use case.

## Testing Read-Only Behavior

Connect to a replica and try to write:

```bash
redis-cli -p 6380 SET mykey "test"
```

Expected error:

```text
(error) READONLY You can't write against a read only replica.
```

Test a read operation:

```bash
redis-cli -p 6380 GET mykey
```

This should succeed if the key exists on the primary.

## Allowing Writes to Replicas (Advanced Use Case)

In some advanced scenarios, you may want to allow limited writes to a replica - for example, storing replica-local session state or metrics that do not need to be replicated.

Disable read-only mode:

```text
replica-read-only no
```

Or at runtime:

```bash
redis-cli CONFIG SET replica-read-only no
```

**Warning:** Any keys written directly to the replica will be overwritten if the primary replicates commands that touch the same key. Use different key prefixes for replica-local data to avoid conflicts.

## Routing Reads to Replicas in Your Application

In application code, maintain separate connection pools for the primary (writes) and replicas (reads):

```javascript
const Redis = require("ioredis");

// Primary connection - used for writes
const primary = new Redis({ host: "primary-host", port: 6379 });

// Replica connections - used for reads
const replica1 = new Redis({ host: "replica1-host", port: 6380 });
const replica2 = new Redis({ host: "replica2-host", port: 6381 });

// Simple round-robin read routing
const replicas = [replica1, replica2];
let replicaIndex = 0;

function getReadClient() {
  const client = replicas[replicaIndex % replicas.length];
  replicaIndex++;
  return client;
}

async function example() {
  // Write to primary
  await primary.set("user:1:name", "Alice");

  // Read from a replica
  const name = await getReadClient().get("user:1:name");
  console.log(name);
}
```

## Using ioredis Cluster or Sentinel with Replica Reads

If you are using Redis Sentinel, ioredis can automatically route reads to replicas:

```javascript
const Redis = require("ioredis");

const redis = new Redis({
  sentinels: [
    { host: "sentinel1", port: 26379 },
    { host: "sentinel2", port: 26380 },
  ],
  name: "mymaster",
  role: "slave", // Route to replicas
  password: "yourPassword",
});

const value = await redis.get("mykey");
```

## Handling Replication Lag in Read Replicas

Replicas may lag behind the primary. If you need strongly consistent reads, read from the primary instead. For eventually consistent use cases, add retry logic when a replica returns stale data:

```python
import redis

primary = redis.Redis(host="primary", port=6379, password="pass")
replica = redis.Redis(host="replica", port=6380, password="pass")

def read_with_fallback(key):
    value = replica.get(key)
    if value is None:
        # Fall back to primary for freshness
        value = primary.get(key)
    return value
```

## Monitoring Read-Only Status

Confirm all replicas are in read-only mode:

```bash
for port in 6380 6381 6382; do
  echo -n "Port $port: "
  redis-cli -p $port CONFIG GET replica-read-only | tail -1
done
```

## Summary

Redis replicas are read-only by default through the `replica-read-only yes` setting, which prevents data divergence from direct writes to a replica. In your application, route writes to the primary and reads to replicas using separate connection pools or a load balancer. When allowing writes to replicas for specialized use cases, carefully isolate replica-local keys from replicated keys to avoid overwrite conflicts.
