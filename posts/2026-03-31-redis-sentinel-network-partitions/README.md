# How Redis Sentinel Handles Network Partitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Network, Partition, High Availability

Description: Learn how Redis Sentinel responds to network partitions, what quorum guarantees, and how to configure safeguards to minimize data loss during splits.

---

Network partitions are one of the hardest failure scenarios for any distributed system. Redis Sentinel has built-in mechanisms to handle partitions safely, but understanding the trade-offs helps you configure it correctly.

## Types of Network Partitions

```text
Scenario A: Primary isolated from Sentinels
  Clients <-> Primary (still serving writes)
  Sentinels <-> Replicas (Sentinels cannot reach Primary)

Scenario B: Minority Sentinel partition
  [S1] | [S2, S3, Primary, Replicas]
  S1 cannot form quorum, cannot initiate failover

Scenario C: Majority Sentinels with Primary
  [S1, S2, Primary] | [S3, Replicas]
  S1+S2 can reach Primary, no failover triggered
  Replicas are cut off, replication stalls
```

## What Quorum Guarantees

With quorum=2 (out of 3 Sentinels), the minority partition (1 Sentinel) cannot trigger a failover:

```text
Partition: [S1] | [S2, S3, Primary, Replicas]
  - S1 cannot reach Primary -> marks S-DOWN
  - S1 alone cannot reach quorum=2 -> no failover
  - Correct behavior: primary is reachable, just network issue to S1
```

But in the majority partition, failover can proceed:

```text
Partition: [S1, S2] | [S3, Primary, Replicas]
  - S1 and S2 cannot reach Primary -> S-DOWN
  - S1 + S2 reach quorum=2 -> O-DOWN
  - Leader elected (S1 or S2) attempts failover
  - But leader cannot reach any replica to promote -> failover fails
```

## Protecting Against Stale Primary Writes

During Scenario A (primary isolated), the primary still serves writes. Use `min-replicas-to-write` to stop writes when replicas are unreachable:

```bash
# redis.conf on primary
min-replicas-to-write 1
min-replicas-max-lag 10
```

This configuration stops the primary from accepting writes if it cannot confirm at least 1 replica is caught up within 10 seconds. Any writes accepted on the isolated primary before the protection kicks in (up to 10 seconds) will be lost when the old primary becomes a replica after the partition heals.

## Sentinel TILT Mode During Partition

If Sentinels experience time jumps (common during VM live migration or kernel issues), they enter TILT mode:

```bash
redis-cli -p 26379 INFO sentinel | grep tilt
# sentinel_tilt:1
```

During TILT, no failovers happen. TILT lasts 30 seconds after the clock issue resolves.

## Partition Healing

When the partition heals:

```text
1. Old primary reconnects to the cluster
2. Sentinels detect the old primary is back
3. Sentinels send REPLICAOF new-primary-ip new-primary-port to the old primary
4. Any writes made during the partition are discarded
5. Old primary syncs from the new primary
```

Verify after healing:

```bash
# Old primary should now be a replica
redis-cli -h old-primary INFO replication | grep role
# role:slave

# New primary should have the old one as replica
redis-cli -p 26379 SENTINEL replicas mymaster
```

## Monitoring Partition Risk

Watch for these warning signs:

```bash
# Replicas falling behind on the primary
redis-cli INFO replication | grep lag

# Sentinels not seeing each other
redis-cli -p 26379 SENTINEL masters | grep num-other-sentinels
# Should be (total_sentinels - 1)
```

Set up alerts in OneUptime when `num-other-sentinels` drops below expected values.

## Summary

Redis Sentinel handles network partitions through quorum voting - a minority of Sentinels cannot trigger failover. Protect against isolated primary writes with `min-replicas-to-write`. When partitions heal, the old primary automatically demotes itself and syncs from the new primary, discarding any writes made during the isolation window.
