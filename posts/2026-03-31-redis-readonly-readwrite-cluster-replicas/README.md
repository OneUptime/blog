# How to Use READONLY and READWRITE in Redis Cluster Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cluster, Replica

Description: Learn how to use READONLY and READWRITE commands to enable and disable read operations on Redis Cluster replica nodes for horizontal read scaling.

---

By default, Redis Cluster replicas reject all read commands, redirecting clients to the primary. The `READONLY` command changes this behavior for the current connection, allowing it to read stale data from replicas. `READWRITE` reverts back to the default redirect behavior.

## Why Read from Replicas

In read-heavy workloads, you can distribute read traffic across replicas to reduce load on the primary. The trade-off is that replica data may be slightly behind the primary (eventual consistency).

## READONLY Command

```text
READONLY
```

Enables read mode for the current connection on the connected replica node.

## READWRITE Command

```text
READWRITE
```

Reverts the connection to the default mode where reads are redirected to the primary.

## Basic Usage

```bash
# Connect directly to a replica
redis-cli -p 7004

# Enable read mode
READONLY
# OK

# Now reads work on this replica
GET user:1001
# Returns the (possibly stale) value

# Revert to default
READWRITE
# OK
```

## Reads Without READONLY

If you try to read from a replica without enabling `READONLY`:

```bash
redis-cli -p 7004 GET user:1001
# (error) MOVED 4821 127.0.0.1:7001
```

The `MOVED` error redirects you to the primary. `READONLY` suppresses this redirection.

## Using READONLY with redis-cli in Cluster Mode

Most Redis clients handle `READONLY` automatically when configured for replica reads. With redis-cli, connect in cluster mode and issue the `READONLY` command:

```bash
# Connect to a replica in cluster mode
redis-cli -c -p 7004

# Then enable READONLY mode
READONLY
# OK

GET user:1001
# Returns the value from this replica
```

## Using READONLY in Application Code

Most Redis cluster clients support a `readFromReplicas` option that handles `READONLY` automatically:

```python
from redis.cluster import RedisCluster

# Automatically reads from replicas
client = RedisCluster(
    host="127.0.0.1",
    port=7001,
    read_from_replicas=True
)

value = client.get("user:1001")
```

## Stale Read Considerations

Data read from a replica may be seconds behind the primary. This is acceptable for:
- User profile lookups
- Product catalog reads
- Analytics queries

It is not suitable for:
- Financial transactions
- Inventory counts
- Session validation that requires exact currency

## READONLY Scope

`READONLY` applies to the current connection only. Other connections to the same replica node still require `READONLY` to be set independently. The state resets when the connection closes.

## Summary

`READONLY` enables read operations on Redis Cluster replica connections, allowing you to scale read throughput horizontally. `READWRITE` reverts to redirect mode. Most modern Redis client libraries handle this transparently via a `readFromReplicas` option. Use replica reads for workloads that tolerate eventual consistency.
