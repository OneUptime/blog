# How to Set Up Redis Primary-Replica Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, High Availability, Configuration

Description: A complete guide to setting up Redis primary-replica replication, including configuration, verification, and common troubleshooting steps.

---

## What Is Primary-Replica Replication?

Redis replication allows one Redis server (the primary) to replicate its data to one or more Redis servers (replicas). Replicas maintain an exact copy of the primary's dataset and automatically stay in sync as new writes arrive. This enables:

- Read scaling by distributing reads across replicas
- High availability via failover
- Data backup without impacting the primary

## Architecture Overview

```text
Client (writes) --> Primary (port 6379)
                         |
              +----------+----------+
              |                     |
        Replica 1             Replica 2
       (port 6380)           (port 6381)
```

Clients send write commands to the primary. Replicas receive a stream of write commands and apply them locally.

## Prerequisites

- Two or more Redis instances running (or servers)
- Network connectivity between primary and replica
- Redis 5.0+ (recommended: Redis 7.0+)

## Step 1 - Configure the Primary

The primary requires minimal configuration. Ensure it is listening on the correct interface:

```text
# /etc/redis/redis-primary.conf
bind 0.0.0.0
port 6379
requirepass "yourStrongPassword"
```

Start the primary:

```bash
redis-server /etc/redis/redis-primary.conf
```

## Step 2 - Configure the Replica

Add the `replicaof` directive to the replica's configuration:

```text
# /etc/redis/redis-replica.conf
bind 0.0.0.0
port 6380

# Point to the primary
replicaof 192.168.1.10 6379

# Password to authenticate with the primary
masterauth "yourStrongPassword"

# Optional: set a password for this replica too
requirepass "yourStrongPassword"

# Make the replica read-only (default is yes)
replica-read-only yes
```

Start the replica:

```bash
redis-server /etc/redis/redis-replica.conf
```

## Step 3 - Verify Replication

On the primary, check the replication status:

```bash
redis-cli -p 6379 -a yourStrongPassword INFO replication
```

Expected output:

```text
# Replication
role:master
connected_slaves:1
slave0:ip=192.168.1.11,port=6380,state=online,offset=1234,lag=0
master_failover_state:no-failover
master_replid:8f1b3c9a7e5d...
master_replid2:0000000000000...
master_repl_offset:1234
second_repl_offset:-1
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:1234
```

On the replica:

```bash
redis-cli -p 6380 -a yourStrongPassword INFO replication
```

Expected output:

```text
# Replication
role:slave
master_host:192.168.1.10
master_port:6379
master_link_status:up
master_last_io_seconds_ago:0
master_sync_in_progress:0
slave_read_repl_offset:1234
slave_repl_offset:1234
slave_priority:100
slave_read_only:1
replica_announced:1
connected_slaves:0
```

`master_link_status:up` confirms the replica is connected and syncing.

## Step 4 - Test Replication

Write to the primary and read from the replica:

```bash
# Write to primary
redis-cli -p 6379 -a yourStrongPassword SET testkey "hello"

# Read from replica
redis-cli -p 6380 -a yourStrongPassword GET testkey
```

Expected: `"hello"`

## Setting Up Replication at Runtime

You can also configure a running Redis instance as a replica without editing the config file:

```bash
redis-cli -p 6380 -a yourStrongPassword REPLICAOF 192.168.1.10 6379
```

To stop replication and make a replica independent:

```bash
redis-cli -p 6380 -a yourStrongPassword REPLICAOF NO ONE
```

## Configuring the Replication Backlog

The replication backlog is a circular buffer on the primary that stores recent write commands. It enables partial resynchronization when a replica reconnects after a brief outage:

```text
# 10 MB backlog (default is 1 MB)
repl-backlog-size 10mb
```

Increase this for replicas with unstable connections or high write throughput.

## Troubleshooting

If replication is not working, check:

1. Firewall rules allow traffic on the primary port
2. `masterauth` matches the primary's `requirepass`
3. Redis logs for error messages:

```bash
tail -f /var/log/redis/redis-server.log
```

Common error:

```text
# Error condition on socket for SYNC: Connection refused
```

This means the replica cannot reach the primary. Check network connectivity and that the primary is listening on the expected interface.

## Summary

Setting up Redis primary-replica replication involves configuring the `replicaof` directive on the replica and ensuring authentication credentials match. After starting both instances, verify the link with `INFO replication` and test by writing to the primary and reading from the replica. For production deployments, configure an appropriate backlog size and consider combining replication with Redis Sentinel for automatic failover.
