# How to Set Up Redis Sentinel from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, High Availability, Setup, Configuration

Description: Step-by-step guide to setting up Redis Sentinel from scratch with one primary, two replicas, and three Sentinel processes for automatic failover.

---

Redis Sentinel provides high availability through automatic failover. When the primary fails, Sentinels detect the failure, elect a new primary from the replicas, and reconfigure clients. This guide walks through a complete setup from scratch.

## Architecture

A minimal production Sentinel setup requires:
- 1 Redis primary
- At least 1 Redis replica (2 recommended)
- 3 Sentinel processes (must be odd number for quorum)

```text
Clients
  |
  v
Sentinel-1  Sentinel-2  Sentinel-3
      \           |          /
       \          v         /
        +-- Primary (6379) --+
                |
          Replica-1 (6380)
          Replica-2 (6381)
```

## Step 1 - Configure the Primary

```bash
# /etc/redis/primary.conf
bind 0.0.0.0
port 6379
daemonize yes
logfile /var/log/redis/primary.log
dir /var/lib/redis/primary
```

Start the primary:

```bash
redis-server /etc/redis/primary.conf
```

## Step 2 - Configure Replicas

```bash
# /etc/redis/replica-1.conf
bind 0.0.0.0
port 6380
daemonize yes
logfile /var/log/redis/replica-1.log
dir /var/lib/redis/replica-1
replicaof 127.0.0.1 6379
```

```bash
# /etc/redis/replica-2.conf
bind 0.0.0.0
port 6381
daemonize yes
logfile /var/log/redis/replica-2.log
dir /var/lib/redis/replica-2
replicaof 127.0.0.1 6379
```

Start replicas:

```bash
redis-server /etc/redis/replica-1.conf
redis-server /etc/redis/replica-2.conf
```

Verify replication:

```bash
redis-cli -p 6379 INFO replication | grep connected_slaves
# connected_slaves:2
```

## Step 3 - Configure Sentinels

Create three Sentinel config files:

```bash
# /etc/redis/sentinel-1.conf
port 26379
daemonize yes
logfile /var/log/redis/sentinel-1.log
dir /tmp

sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

Copy for sentinel-2 (port 26380) and sentinel-3 (port 26381), changing only the `port` line.

Start all Sentinels:

```bash
redis-sentinel /etc/redis/sentinel-1.conf
redis-sentinel /etc/redis/sentinel-2.conf
redis-sentinel /etc/redis/sentinel-3.conf
```

## Step 4 - Verify Sentinel Status

```bash
redis-cli -p 26379 SENTINEL masters
```

```text
1) "name"
2) "mymaster"
3) "ip"
4) "127.0.0.1"
5) "port"
6) "6379"
...
17) "num-slaves"
18) "2"
19) "num-other-sentinels"
20) "2"
```

Check sentinels know about each other:

```bash
redis-cli -p 26379 SENTINEL sentinels mymaster
# Should list 2 other sentinels
```

## Step 5 - Test Failover

```bash
# Force primary down
redis-cli -p 6379 DEBUG sleep 30

# Watch Sentinel logs
tail -f /var/log/redis/sentinel-1.log
```

After `down-after-milliseconds`, Sentinel elects a new primary and promotes a replica.

## Summary

A Redis Sentinel setup requires at least 3 Sentinels (for quorum), one primary, and at least one replica. Configure each Sentinel with `sentinel monitor` pointing to the primary, start all processes, and verify with `SENTINEL masters`. Test failover by simulating primary unavailability before going to production.
