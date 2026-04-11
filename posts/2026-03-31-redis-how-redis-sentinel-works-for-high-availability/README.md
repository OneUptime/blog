# How Redis Sentinel Works for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, High Availability, Failover, Architecture

Description: A comprehensive explanation of how Redis Sentinel monitors instances, detects failures, performs leader election, and executes automatic failover.

---

## What Is Redis Sentinel?

Redis Sentinel is a distributed system that provides high availability for Redis. It runs as separate processes (or alongside Redis instances) and is responsible for:

- **Monitoring** - Continuously checking whether primary and replica instances are working
- **Notification** - Alerting administrators or other programs when something goes wrong
- **Automatic failover** - When a primary fails, Sentinel promotes a replica and redirects clients
- **Configuration provider** - Clients query Sentinel to discover the current primary address

## Architecture Overview

A typical Sentinel setup uses at least 3 Sentinel nodes to achieve quorum:

```text
[Sentinel 1] [Sentinel 2] [Sentinel 3]
      |             |             |
      +------+------+------+------+
             |             |
          Primary        Replica
          (6379)          (6380)
```

Sentinels communicate with each other and with Redis instances. Clients connect to Sentinel to get the primary address.

## Step 1 - How Sentinels Monitor Redis

Each Sentinel sends `PING` commands to monitored Redis instances every second. If an instance does not respond within the configured `sentinel down-after-milliseconds` timeout, the Sentinel marks it as **subjectively down (SDOWN)**.

Sentinel configuration:

```text
# sentinel.conf
sentinel monitor mymaster 192.168.1.10 6379 2
sentinel auth-pass mymaster yourPassword
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

- `monitor mymaster 192.168.1.10 6379 2` - Monitor primary at the address, requiring quorum of 2 for failover
- `down-after-milliseconds` - Time without a response before marking as SDOWN (5 seconds here)

## Step 2 - Subjective Down vs Objective Down

When one Sentinel detects an instance as down, it declares **SDOWN** (subjectively down). This is only one Sentinel's opinion.

For an actual failover to begin, enough Sentinels must agree - this is called **ODOWN** (objectively down). The quorum is set in the `sentinel monitor` directive:

```text
sentinel monitor mymaster 192.168.1.10 6379 2
```

With quorum=2, at least 2 Sentinels must agree the primary is down before failover starts.

## Step 3 - Sentinel Leader Election

Before executing a failover, the Sentinels must elect a **leader** - one Sentinel that will carry out the failover. This uses a variation of the Raft consensus algorithm.

1. A Sentinel that detects ODOWN requests votes from other Sentinels
2. Each Sentinel votes for the first requester in the current epoch
3. The Sentinel that receives a majority of votes becomes the leader
4. The leader proceeds with the failover

Majority is `(num_sentinels / 2) + 1`. With 3 Sentinels, majority = 2.

## Step 4 - Selecting the Best Replica

The leader Sentinel selects the best replica to promote based on:

1. Replicas with `replica-priority 0` are excluded
2. The replica with the lowest `replica-priority` value is preferred
3. Among equal priorities, the replica with the smallest replication lag (highest offset) is preferred
4. Among equal offsets, the replica with the lexicographically smallest run ID is chosen

## Step 5 - Executing the Failover

1. Sentinel sends `REPLICAOF NO ONE` to the chosen replica - it becomes the new primary
2. Other replicas are reconfigured to replicate from the new primary
3. The old primary (if it comes back online) is reconfigured as a replica of the new primary
4. All Sentinels update their configuration with the new primary address

## Step 6 - Client Discovery

Clients ask Sentinel for the current primary address using `SENTINEL get-master-addr-by-name`:

```bash
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

Output:

```text
1) "192.168.1.10"
2) "6379"
```

After failover, Sentinel returns the new primary address. Client libraries like ioredis and Jedis handle this automatically:

```javascript
const Redis = require("ioredis");
const redis = new Redis({
  sentinels: [
    { host: "sentinel1", port: 26379 },
    { host: "sentinel2", port: 26380 },
    { host: "sentinel3", port: 26381 },
  ],
  name: "mymaster",
  password: "yourPassword",
});
```

## Starting Sentinel

Create a `sentinel.conf` file and start:

```bash
redis-sentinel /etc/redis/sentinel.conf
```

Or use the Redis server with sentinel mode:

```bash
redis-server /etc/redis/sentinel.conf --sentinel
```

## Monitoring Sentinel Status

Check which master Sentinel is monitoring:

```bash
redis-cli -p 26379 SENTINEL masters
```

Check replica status:

```bash
redis-cli -p 26379 SENTINEL replicas mymaster
```

Check other Sentinels:

```bash
redis-cli -p 26379 SENTINEL sentinels mymaster
```

## Minimum Sentinel Count

Always deploy an odd number of Sentinels to ensure a clear majority:

```text
Sentinels | Quorum | Tolerated failures
----------|--------|--------------------
3         | 2      | 1 Sentinel failure
5         | 3      | 2 Sentinel failures
```

With 2 Sentinels, quorum=2 means both must agree - if one fails, no failover is possible. With quorum=1, any single Sentinel can trigger failover, which risks split-brain.

## Summary

Redis Sentinel provides high availability through continuous monitoring, quorum-based failure detection, leader election, and automatic failover. Sentinel requires at least 3 nodes for proper quorum. When a primary fails, Sentinels elect a leader, select the best replica, and execute failover automatically - with client libraries transparently connecting to the new primary. This makes Sentinel a reliable HA solution for non-cluster Redis deployments.
