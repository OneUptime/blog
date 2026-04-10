# Redis Runbook: Handling Sentinel Failover Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Runbook

Description: Runbook for diagnosing and resolving Redis Sentinel failover problems - covering quorum failures, stale primaries, and client reconnection issues.

---

Redis Sentinel automates failover, but when failover itself fails or stalls, you need a clear process to recover. This runbook covers the most common Sentinel failover problems.

## Step 1: Check Sentinel Status

Connect to each Sentinel and check its view of the cluster:

```bash
redis-cli -p 26379 SENTINEL masters
redis-cli -p 26379 SENTINEL replicas mymaster
redis-cli -p 26379 SENTINEL sentinels mymaster
```

Look for inconsistencies in which node each Sentinel considers the primary.

## Step 2: Check If Quorum Is Met

Failover has two requirements: a quorum of Sentinels must agree the primary is unreachable (failure detection), and then a majority of all Sentinels (more than half) must authorize the actual failover. Check the configured quorum:

```bash
redis-cli -p 26379 SENTINEL master mymaster | grep quorum
```

If fewer Sentinels are reachable than the quorum, failure detection will not proceed. Even if the quorum is met, failover will not execute unless a majority of Sentinels can vote. Check Sentinel process status on each node:

```bash
systemctl status redis-sentinel
```

## Step 3: Check for Split-Brain

If multiple Sentinels disagree on the primary, you may have a split-brain scenario. List what each Sentinel reports:

```bash
for port in 26379 26380 26381; do
  echo "Sentinel :$port"
  redis-cli -p $port SENTINEL get-master-addr-by-name mymaster
done
```

## Step 4: Manually Trigger Failover

If the automatic failover is stuck, trigger it manually:

```bash
redis-cli -p 26379 SENTINEL failover mymaster
```

This forces one Sentinel to promote a replica.

## Step 5: Fix a Stale Primary

If the old primary comes back online after a failover, it may still think it is the primary. Force it to become a replica:

```bash
redis-cli -h <old-primary-ip> REPLICAOF <new-primary-ip> 6379
```

## Step 6: Check Client Reconnection

After failover, clients must discover the new primary via Sentinel. Check if your client library supports Sentinel reconnection. In Python with redis-py:

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([('sentinel1', 26379), ('sentinel2', 26380)], socket_timeout=0.1)
master = sentinel.master_for('mymaster', socket_timeout=0.1)
master.ping()
```

## Step 7: Review Sentinel Configuration

Ensure all Sentinels have the correct configuration:

```bash
# sentinel.conf
sentinel monitor mymaster 192.168.1.10 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

## Summary

Sentinel failover issues are commonly caused by quorum failures, network partitions, or misconfigured clients. Checking quorum status, forcing manual failover when stuck, and verifying client Sentinel support are the three most effective recovery actions.
