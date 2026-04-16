# How to Handle Stale Replicas in Distributed Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed, Replica, Replication, Consistency, Availability

Description: Configure how ClickHouse selects replicas for distributed queries and handle cases where replicas are lagging behind the primary.

---

ClickHouse Distributed tables can route reads to any replica of a shard. When one replica is lagging (for example, after a network partition or maintenance), queries routed to it may return stale data. Several settings control how aggressively ClickHouse falls back to fresher replicas.

## How Replica Selection Works

The `load_balancing` setting determines which replica the initiator contacts first:

```sql
SET load_balancing = 'random';
-- options: random, nearest_hostname, in_order, first_or_random, round_robin
```

With `in_order`, ClickHouse always tries the first listed replica in `remote_servers`, falling back only on failure. With `random`, replicas are selected uniformly at random.

## max_replica_delay_for_distributed_queries

This is the core setting for stale replica handling. Any replica with replication lag exceeding this value (in seconds) is excluded from selection:

```sql
SET max_replica_delay_for_distributed_queries = 300; -- 5 minutes
```

If all replicas of a shard exceed the threshold, ClickHouse either raises an error or falls back to the least-lagging replica, depending on the next setting.

## fallback_to_stale_replicas_for_distributed_queries

Controls what happens when no replica meets the freshness threshold:

```sql
SET fallback_to_stale_replicas_for_distributed_queries = 1;
-- 1 = use the least-lagging replica anyway
-- 0 = raise an exception
```

Setting this to 0 is appropriate when your application cannot tolerate stale reads and you prefer an explicit error.

## Checking Current Replica Lag

```sql
SELECT
    database,
    table,
    replica_name,
    absolute_delay,
    queue_size
FROM system.replicas
WHERE absolute_delay > 0
ORDER BY absolute_delay DESC;
```

`absolute_delay` is in seconds. A value above your threshold means queries may be routed away from this replica.

## Forcing Consistency with select_sequential_consistency

For reads that must reflect the latest committed data, ensure you connect to the leader or use `select_sequential_consistency`:

```sql
SET select_sequential_consistency = 1;
```

This restricts the SELECT to replicas that contain data from all previous INSERTs written with `insert_quorum`, at the cost of higher latency. It only has an effect when writes use `insert_quorum`; it does not cover `ALTER` mutations.

## Monitoring Replica Health in Prometheus

ClickHouse exposes the maximum replica lag (across all replicated tables on the server) via its built-in Prometheus endpoint:

```text
GET /metrics
ClickHouseAsyncMetrics_ReplicasMaxAbsoluteDelay 12
```

These built-in async metrics are global aggregates without per-table labels. For per-table visibility, scrape `system.replicas` directly (for example via a custom exporter query).

Set alerts when `ReplicasMaxAbsoluteDelay` exceeds your SLA threshold.

## Summary

Stale replicas in ClickHouse distributed queries are managed through `max_replica_delay_for_distributed_queries` and `fallback_to_stale_replicas_for_distributed_queries`. Monitor `system.replicas` for lag and set `select_sequential_consistency = 1` when reads must reflect the absolute latest state. Balance availability against consistency based on your application's requirements.
