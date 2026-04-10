# How to Configure parallel-syncs in Redis Sentinel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Configuration, Replication, Failover

Description: Learn how parallel-syncs controls how many replicas synchronize simultaneously after a Redis Sentinel failover, balancing speed against read availability.

---

After a Redis Sentinel failover, all replicas must resynchronize with the newly promoted primary. The `parallel-syncs` setting controls how many replicas can resync simultaneously. Getting this right balances failover speed against read availability during recovery.

## What Happens After Failover

When Sentinel promotes a new primary:

1. All existing replicas are reconfigured to follow the new primary
2. Each replica performs a full or partial resync
3. During a full resync, replicas briefly block connections while loading the new dataset (with `replica-serve-stale-data yes`, the default, they serve stale data until that point)
4. After resync completes, replicas return to serving current data

`parallel-syncs` controls how many replicas go through step 2-3 simultaneously.

## Configuration

```bash
# sentinel.conf
sentinel parallel-syncs mymaster 1
```

Default is 1, meaning replicas resync one at a time.

## Trade-offs

```text
parallel-syncs=1:
  - Only 1 replica is unavailable at any time
  - Remaining replicas serve reads during recovery
  - Slower overall recovery (replicas resync sequentially)

parallel-syncs=2:
  - 2 replicas unavailable simultaneously
  - Faster total resync time
  - More load on the new primary (sending RDB to 2 replicas at once)

parallel-syncs=N (all replicas):
  - Fastest recovery
  - All replicas unavailable during resync
  - Maximum load on new primary
```

## Choosing the Right Value

For 3 replicas serving read traffic:

```text
parallel-syncs=1 -> 2 replicas always available during recovery (safest)
parallel-syncs=2 -> 1 replica always available (acceptable)
parallel-syncs=3 -> 0 replicas available during recovery (risky)
```

For a deployment where read availability is critical:

```bash
sentinel parallel-syncs mymaster 1
```

For a deployment where fast recovery matters more:

```bash
sentinel parallel-syncs mymaster 2
```

## Changing at Runtime

```bash
redis-cli -p 26379 SENTINEL SET mymaster parallel-syncs 2
```

Verify:

```bash
redis-cli -p 26379 SENTINEL masters
# Look for "parallel-syncs" in the output
```

## Interaction with Partial Resync

If replicas support partial resync (their offset is still in the backlog), resync is much faster regardless of `parallel-syncs`. A well-sized replication backlog makes the `parallel-syncs` setting less impactful:

```bash
# Increase backlog on primaries to enable partial resync after failover
redis-cli CONFIG SET repl-backlog-size 67108864  # 64MB
```

With partial resync, even `parallel-syncs=3` may be acceptable since only the missed commands are transferred rather than a full dataset.

## Monitoring Recovery Progress

After a failover, check resync progress:

```bash
redis-cli -p 26379 SENTINEL replicas mymaster
# Look for "master-link-status" and "slave-repl-offset"
```

On each replica:

```bash
redis-cli -h replica INFO replication | grep -E "master_sync|master_link"
```

## Summary

`parallel-syncs` in Redis Sentinel controls how many replicas resync simultaneously after failover. Set it to 1 to always keep some replicas available for reads, or increase it to speed up total recovery time. Pair it with a large replication backlog to enable partial resyncs, which makes high `parallel-syncs` values safe.
