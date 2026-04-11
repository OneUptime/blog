# How to Set Up Multiple Replicas in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Scalability, High Availability

Description: Learn how to configure multiple Redis replicas from a single primary to scale reads and improve availability across your infrastructure.

---

## Why Use Multiple Replicas?

A single primary-replica pair provides basic redundancy. Multiple replicas let you:

- Distribute read traffic across many nodes
- Survive multiple replica failures simultaneously
- Serve different geographic regions closer to users
- Dedicate specific replicas to reporting, backup, or analytics

## Architecture

```text
                    Primary
                   (6379)
                    /  \  \
                   /    \   \
           Replica1  Replica2  Replica3
           (6380)   (6381)    (6382)
```

Each replica independently maintains a connection to the primary and receives the same replication stream.

## Configuring Multiple Replicas

Each replica needs its own `redis.conf` pointing to the primary.

**Replica 1:**

```text
# /etc/redis/replica1.conf
port 6380
replicaof 192.168.1.10 6379
masterauth "primaryPassword"
requirepass "primaryPassword"
replica-read-only yes
```

**Replica 2:**

```text
# /etc/redis/replica2.conf
port 6381
replicaof 192.168.1.10 6379
masterauth "primaryPassword"
requirepass "primaryPassword"
replica-read-only yes
```

**Replica 3:**

```text
# /etc/redis/replica3.conf
port 6382
replicaof 192.168.1.10 6379
masterauth "primaryPassword"
requirepass "primaryPassword"
replica-read-only yes
```

Start each replica:

```bash
redis-server /etc/redis/replica1.conf &
redis-server /etc/redis/replica2.conf &
redis-server /etc/redis/replica3.conf &
```

## Verifying Multiple Replicas

Check the primary replication status:

```bash
redis-cli -p 6379 -a primaryPassword INFO replication
```

Expected output:

```text
role:master
connected_slaves:3
slave0:ip=192.168.1.11,port=6380,state=online,offset=5000,lag=0
slave1:ip=192.168.1.12,port=6381,state=online,offset=5000,lag=1
slave2:ip=192.168.1.13,port=6382,state=online,offset=5000,lag=0
master_replid:abc123...
master_repl_offset:5000
repl_backlog_active:1
repl_backlog_size:1048576
```

## Load Balancing Reads Across Replicas

Use a load balancer like HAProxy or Nginx to distribute reads across replicas.

Example HAProxy configuration:

```text
frontend redis_read
  bind *:6399
  mode tcp
  default_backend redis_replicas

backend redis_replicas
  mode tcp
  balance roundrobin
  server replica1 192.168.1.11:6380 check
  server replica2 192.168.1.12:6381 check
  server replica3 192.168.1.13:6382 check
```

In your application, send write commands to the primary and read commands through the load balancer:

```python
import redis

# Write client - points to primary
write_client = redis.Redis(host="192.168.1.10", port=6379, password="primaryPassword")

# Read client - points to load balancer
read_client = redis.Redis(host="192.168.1.20", port=6399, password="primaryPassword")

# Use write_client for mutations
write_client.set("mykey", "myvalue")

# Use read_client for queries
value = read_client.get("mykey")
```

## Cascaded Replicas (Replica of Replica)

To reduce the load on the primary from many replicas, you can chain replicas. One replica replicates from the primary, and others replicate from that replica:

```text
Primary --> Replica1 --> Replica2
                   \
                    --> Replica3
```

Configure Replica2 to replicate from Replica1:

```text
# replica2.conf
port 6381
replicaof 192.168.1.11 6380
masterauth "primaryPassword"
```

Note: cascaded replicas introduce additional replication lag.

## Managing Replication Backlog for Multiple Replicas

With multiple replicas, ensure the backlog is large enough to handle all of them reconnecting after a short outage:

```text
# Primary config
repl-backlog-size 50mb
repl-backlog-ttl 3600
```

`repl-backlog-ttl` controls how long the backlog is kept after no replicas are connected.

## Setting Replica Priority

The `replica-priority` setting influences which replica Sentinel promotes during failover:

```text
# Higher priority number = less preferred for promotion
# Set to 0 to exclude from Sentinel promotion
replica-priority 100   # normal replica
replica-priority 10    # preferred for promotion
replica-priority 0     # never promote (e.g., analytics replica)
```

## Monitoring All Replicas

Script to check the status of all replicas:

```bash
#!/bin/bash
PRIMARY_HOST="192.168.1.10"
PRIMARY_PORT=6379
AUTH="primaryPassword"

redis-cli -h $PRIMARY_HOST -p $PRIMARY_PORT -a $AUTH INFO replication | grep -E "slave[0-9]|connected_slaves"
```

## Summary

Setting up multiple Redis replicas is straightforward - each replica is configured with its own `redis.conf` pointing to the same primary. Multiple replicas enable read scaling via load balancing, increased fault tolerance, and specialized use cases like analytics or regional distribution. For large-scale deployments, consider cascaded replicas to distribute the replication fan-out load from the primary, and tune the replication backlog size to accommodate reconnection scenarios.
