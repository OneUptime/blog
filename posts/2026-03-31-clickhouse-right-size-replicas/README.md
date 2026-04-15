# How to Right-Size ClickHouse Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Replica, Capacity Planning, High Availability, Performance

Description: Determine the right number of ClickHouse replicas per shard by balancing read throughput, fault tolerance, and replication overhead costs.

---

Replicas in ClickHouse serve two purposes: fault tolerance and read parallelism. Right-sizing means choosing the number that meets both goals without over-spending on unnecessary copies.

## Replica Count Decision

| Goal | Minimum Replicas |
|---|---|
| Survive 1 node failure | 2 |
| Survive 1 node failure + read scaling | 3 |
| Survive 1 AZ failure (3 AZs) | 3 (one per AZ) |
| Mission-critical, zero-downtime | 3-5 |

## Read Throughput Benefit

ClickHouse's distributed engine uses `load_balancing` to spread reads across replicas. With 3 replicas, read QPS capacity roughly triples:

```sql
SET load_balancing = 'random';
```

Verify replicas are active and caught up:

```sql
SELECT
    replica_name,
    is_leader,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE table = 'events';
```

## Replication Lag Check

Too many replicas can slow down writes if using quorum inserts:

```sql
SELECT
    replica_path,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE table = 'events'
ORDER BY absolute_delay DESC;
```

With `absolute_delay > 60` seconds on any replica, investigate network bandwidth or disk I/O on that node.

## Right-Sizing Formula

```text
required_replicas = max(
    fault_tolerance_replicas,   -- usually 2-3
    ceil(peak_qps / single_node_qps)  -- read scaling
)
```

Example:

```text
fault_tolerance_replicas = 3
single_node_qps (from benchmark) = 50
peak_qps target = 120
read_scaling_replicas = ceil(120 / 50) = 3

required_replicas = max(3, 3) = 3
```

## Removing an Over-Replicated Shard

```sql
-- Check which replica is least active
SELECT replica_path, is_leader, queue_size
FROM system.replicas WHERE table = 'events';

-- Detach the excess replica (run on that node)
DETACH TABLE events;
```

Then remove its entry from the cluster configuration and restart ClickHouse Keeper.

## Monitoring Replica Health

Add a [OneUptime](https://oneuptime.com) check that queries `system.replicas` every 5 minutes. Alert when `is_readonly = 1` or `absolute_delay > 300` on any replica.

## Summary

Two replicas provide basic HA; three replicas cover AZ-level failures and double read throughput. Calculate the minimum needed for your fault tolerance tier, then check if read scaling requires more. Avoid excessive replicas that increase replication write overhead without proportional benefit.
