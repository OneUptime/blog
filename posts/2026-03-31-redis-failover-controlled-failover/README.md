# How to Use FAILOVER in Redis for Controlled Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Failover, Replication, High Availability, Primary

Description: Learn how to use the FAILOVER command in Redis to perform a safe, coordinated promotion of a replica to primary without data loss.

---

The `FAILOVER` command, introduced in Redis 6.2, initiates a controlled failover in a standalone replication setup. Unlike `REPLICAOF NO ONE`, which is a blunt promotion, `FAILOVER` coordinates with the current primary to ensure the replica is fully synchronized before taking over. It is the recommended way to perform planned failovers.

## Syntax

```text
FAILOVER [TO host port [FORCE]] [ABORT] [TIMEOUT milliseconds]
```

Run this command on the **primary** to direct it to fail over to a specific or any connected replica.

## Basic Failover to Any Replica

Running `FAILOVER` on the primary with no arguments tells the primary to hand off to the first replica that catches up to the current replication offset:

```bash
redis-cli -p 6379 FAILOVER
# OK - failover initiated
```

Redis will:
1. Stop accepting new writes (via CLIENT PAUSE WRITE)
2. Wait for a replica to catch up to the primary's replication offset
3. The primary demotes itself to a replica (without discarding data)
4. Send a PSYNC FAILOVER to the target replica, instructing it to become the new primary

## Failover to a Specific Replica

Direct the failover to a particular replica:

```bash
redis-cli -p 6379 FAILOVER TO 127.0.0.1 6380
```

## Using TIMEOUT to Set a Deadline

If no replica catches up within the timeout, the failover is aborted and the primary resumes accepting writes:

```bash
# Abort if no replica catches up within 10 seconds
redis-cli -p 6379 FAILOVER TIMEOUT 10000
```

## FORCE Flag

If you want to force failover to a specific replica even if it has not fully caught up:

```bash
redis-cli -p 6379 FAILOVER TO 127.0.0.1 6380 FORCE TIMEOUT 5000
```

The `FORCE` flag requires both `TO` and `TIMEOUT` to be set. When the timeout elapses and the replica has not caught up, the primary will forcefully fail over instead of aborting. This may cause a small amount of data loss if the replica is behind.

## Aborting an In-Progress Failover

If the failover is taking too long, cancel it:

```bash
redis-cli -p 6379 FAILOVER ABORT
```

If the failover is still in the `waiting-for-sync` state, this safely restores the primary to normal write-accepting state. However, if the failover has already reached the `failover-in-progress` state, aborting may result in a multi-master scenario that requires manual remediation.

## Monitoring Failover Progress

```bash
# Watch INFO replication on the primary
redis-cli -p 6379 INFO replication | grep role
# role:slave  <-- primary has demoted itself

# Check the new primary
redis-cli -p 6380 INFO replication | grep role
# role:master
```

## FAILOVER vs REPLICAOF NO ONE

| Feature | FAILOVER | REPLICAOF NO ONE |
|---------|----------|-----------------|
| Data loss risk | Minimal | Higher (no sync guarantee) |
| Coordinated | Yes | No |
| Requires primary to be up | Yes | No |
| Automatic demotion of old primary | Yes | No |

## Use Case - Zero-Downtime Primary Upgrade

```bash
# Step 1 - Initiate failover from the current primary
redis-cli -p 6379 FAILOVER TIMEOUT 30000

# Step 2 - Wait for promotion to complete
redis-cli -p 6380 INFO replication | grep role

# Step 3 - Upgrade the old primary (now a replica)
# Perform maintenance...
```

## Summary

`FAILOVER` provides a safe, coordinated way to promote a replica to primary in Redis standalone replication. It ensures data consistency by synchronizing the replica before cutover and automatically demotes the old primary. Use it for planned maintenance, rolling upgrades, or proactive failovers before taking a primary offline.
