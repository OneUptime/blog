# How to Troubleshoot Redis READONLY Errors on Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, READONLY, Troubleshooting, Replica

Description: Fix Redis READONLY errors on replicas by understanding replica write protection, redirect writes to the primary, and configure replica-read-only correctly.

---

## What is the READONLY Error

When you send a write command (SET, DEL, INCR, etc.) to a Redis replica that has `replica-read-only yes` (the default), Redis returns:

```text
READONLY You can't write against a read only replica.
```

This is a safety feature preventing accidental writes to replicas that would not be replicated back to the primary and would diverge the dataset.

## Step 1 - Confirm You Are Connected to a Replica

```bash
redis-cli -h <host> -p 6379 ROLE
```

Output for a replica:

```text
1) "slave"
2) "192.168.1.10"   # primary host
3) (integer) 6379   # primary port
4) "connected"
5) (integer) 1234567  # replication offset
```

Output for a primary:

```text
1) "master"
2) (integer) 1234567
3) 1) 1) "192.168.1.11"
         2) "6379"
         3) "1234567"
```

## Step 2 - Redirect Writes to the Primary

The correct fix is to ensure write commands go to the primary. In most client libraries this is configured explicitly.

In Python with redis-py using Sentinel:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel(
    [('sentinel1', 26379), ('sentinel2', 26379)],
    socket_timeout=0.5
)

# Primary for writes
primary = sentinel.master_for('mymaster', socket_timeout=0.5)
primary.set('key', 'value')

# Replica for reads
replica = sentinel.slave_for('mymaster', socket_timeout=0.5)
value = replica.get('key')
```

In Node.js with ioredis:

```javascript
const Redis = require('ioredis');

// Always connect writes to the primary
const primary = new Redis({ host: 'redis-primary', port: 6379 });
const replica = new Redis({ host: 'redis-replica', port: 6379 });

await primary.set('key', 'value');
const value = await replica.get('key');
```

## Step 3 - Check if replica-read-only is Intentionally Disabled

In some use cases (e.g., storing session data locally on a replica) you may want replicas to accept writes. Note that these writes will not be replicated to the primary.

```bash
redis-cli -h <replica-host> CONFIG GET replica-read-only
# or older Redis versions
redis-cli -h <replica-host> CONFIG GET slave-read-only
```

To allow writes on this replica (use with caution):

```bash
redis-cli -h <replica-host> CONFIG SET replica-read-only no
```

Persist in `redis.conf`:

```text
replica-read-only no
```

## Step 4 - Check for Accidental Replica Connection After Failover

If you are using Sentinel or Redis Cluster and see READONLY errors unexpectedly, a failover may have promoted a replica to primary while your client is still connected to the old primary (now a replica).

```bash
# Check the current role
redis-cli -h <your-primary-host> ROLE
```

If the old primary is now a replica, update your client or let Sentinel redirect automatically:

```bash
# Get the current primary from Sentinel
redis-cli -h sentinel-host -p 26379 SENTINEL get-master-addr-by-name mymaster
```

## Step 5 - Check Redis Cluster READONLY

In Redis Cluster, clients must send commands to the correct shard (primary for the key). If you send a write to a replica shard, you get:

```text
READONLY You can't write against a read only replica.
```

Client libraries typically handle this automatically with MOVED/ASK redirections. If you are using `redis-cli --cluster`:

```bash
redis-cli -c -h <any-node> -p 6379 SET foo bar
# -c flag enables automatic redirection
```

Check your client library's cluster mode setting:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='redis-node1', port=6379)
rc.set('foo', 'bar')  # Automatically routes to the correct primary
```

## Step 6 - Allow Read Commands on Replica in Cluster Mode

In Redis Cluster, replicas only serve reads if the client issues a READONLY command first:

```bash
redis-cli -h <replica-node> -p 6379
> READONLY
OK
> GET mykey
"value"
```

In client libraries this is often a configuration flag:

```python
rc = RedisCluster(
    host='redis-node1',
    port=6379,
    read_from_replicas=True  # Sends reads to replicas
)
```

## Summary

READONLY errors on Redis replicas occur when write commands are sent to a node that is a replica with `replica-read-only yes`. The correct resolution is to redirect writes to the primary using Sentinel, Cluster routing, or explicit connection configuration. Only disable `replica-read-only` when you intentionally need local writes on a replica and understand they will not be replicated back.
