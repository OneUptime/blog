# How to Set Up Redis Replication Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, IPv4, High Availability, Configuration, Database, Caching

Description: Learn how to configure Redis primary-replica replication over IPv4 for high availability and read scaling of your Redis data.

---

Redis replication allows replica instances to maintain exact copies of a primary's dataset. Replicas can serve read requests, offloading the primary, and can be promoted if the primary fails (manually or via Redis Sentinel).

## Primary Configuration

```ini
# /etc/redis/redis.conf (on the primary)

# Bind to the primary's IPv4 address and localhost

bind 10.0.0.10 127.0.0.1

# Port
port 6379

# Enable authentication (strongly recommended)
requirepass "StrongPrimaryPassword123!"

# Persist data to disk (RDB snapshots)
save 900 1
save 300 10
save 60 10000

# Log level
loglevel notice
logfile /var/log/redis/redis.log
```

## Replica Configuration

```ini
# /etc/redis/redis.conf (on each replica)

# Bind to the replica's own IPv4 address
bind 10.0.0.11 127.0.0.1

port 6379

# Point to the primary
replicaof 10.0.0.10 6379

# Password to authenticate with the primary
masterauth "StrongPrimaryPassword123!"

# Require authentication for client connections too
requirepass "StrongReplicaPassword!"

# Make replicas read-only (default: yes)
replica-read-only yes

# Serve stale data while the replica is syncing or disconnected
# Set to no to return errors for most data commands instead
replica-serve-stale-data yes
```

## Starting Replication

```bash
# Restart Redis on both nodes to apply config changes
systemctl restart redis-server

# Verify replication status on the primary
redis-cli -h 10.0.0.10 -a 'StrongPrimaryPassword123!' INFO replication
```

Expected output:

```text
role:master
connected_slaves:1
slave0:ip=10.0.0.11,port=6379,state=online,offset=1024,lag=0
master_replid:abc123...
master_repl_offset:1024
```

## Adding a Replica at Runtime

```bash
# If the primary requires authentication, set it on the replica first
redis-cli -h 10.0.0.11 -a 'StrongReplicaPassword!' CONFIG SET masterauth 'StrongPrimaryPassword123!'

# Connect to the replica and set it to replicate from the primary
redis-cli -h 10.0.0.11 -a 'StrongReplicaPassword!' REPLICAOF 10.0.0.10 6379
```

## Monitoring Replication Lag

```bash
# Inspect replication offsets to estimate lag
redis-cli -h 10.0.0.10 -a 'StrongPrimaryPassword123!' INFO replication | grep offset

# Real-time lag monitoring
watch -n2 "redis-cli -h 10.0.0.10 -a 'StrongPrimaryPassword123!' INFO replication | grep -E 'role|slaves|offset|lag'"
```

## Promoting a Replica (Emergency)

```bash
# Manually promote a replica to primary
redis-cli -h 10.0.0.11 -a 'StrongReplicaPassword!' REPLICAOF NO ONE

# Verify it's now acting as primary
redis-cli -h 10.0.0.11 -a 'StrongReplicaPassword!' INFO replication | grep role
# role:master
```

## Key Takeaways

- `bind` should specify explicit IPv4 addresses; avoid `bind 0.0.0.0` in production.
- `masterauth` on each replica should match the primary's authentication password; a replica's `requirepass` controls client access to that replica.
- `replica-read-only yes` (default) prevents writes to replicas, avoiding data inconsistency.
- For automatic failover, add Redis Sentinel on top of replication; for sharding plus automatic failover, use Redis Cluster.
