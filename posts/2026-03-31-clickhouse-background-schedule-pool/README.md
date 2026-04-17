# How to Configure ClickHouse Background Schedule Pool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Background Pool, Schedule, Replication, Configuration, Performance

Description: Configure the ClickHouse background_schedule_pool_size and related pools to balance replication, mutation, and move tasks without overwhelming system resources.

---

## What Is the Background Schedule Pool?

ClickHouse has multiple background thread pools for different tasks:

| Pool | Purpose |
|------|---------|
| `background_pool_size` | Merges and mutations |
| `background_schedule_pool_size` | Replication tasks, TTL moves, cleanup |
| `background_move_pool_size` | Moving parts between storage volumes |
| `background_fetches_pool_size` | Fetching parts from other replicas |

Each pool runs independently. Misconfiguration causes tasks to queue up, delaying replication, TTL expiry, or part cleanup.

## Default Values and When to Change Them

Defaults:

```text
background_pool_size = 16
background_schedule_pool_size = 128
background_move_pool_size = 8
background_fetches_pool_size = 8
```

Increase `background_schedule_pool_size` when:
- You have many replicated tables (each adds replication tasks)
- Replication lag is growing on healthy nodes
- TTL moves are not completing on time

## Configuring the Pools

```xml
<!-- config.xml -->
<background_pool_size>16</background_pool_size>
<background_schedule_pool_size>256</background_schedule_pool_size>
<background_move_pool_size>16</background_move_pool_size>
<background_fetches_pool_size>16</background_fetches_pool_size>
```

After editing `config.xml`, reload the configuration without restarting the server:

```sql
SYSTEM RELOAD CONFIG;
```

## Monitoring Pool Activity

Check current pool utilization:

```sql
SELECT
    metric,
    value
FROM system.metrics
WHERE metric LIKE '%BackgroundPool%'
   OR metric LIKE '%BackgroundSchedule%'
   OR metric LIKE '%BackgroundFetch%';
```

Check for queued replication tasks:

```sql
SELECT
    table,
    type,
    count() AS pending
FROM system.replication_queue
GROUP BY table, type
ORDER BY pending DESC;
```

## Diagnosing Pool Exhaustion

If the schedule pool is exhausted, replication tasks queue up. Signs include:

- Growing `system.replication_queue`
- Replica lag increasing in Prometheus metrics
- Slow TTL expiry despite TTL being past due

Increase the pool size and watch the queue drain:

```xml
<background_schedule_pool_size>512</background_schedule_pool_size>
```

## Background Move Pool for Tiered Storage

If using hot/warm/cold storage tiers, the move pool handles part migration:

```sql
ALTER TABLE events MODIFY SETTING
    storage_policy = 'hot_to_cold';
```

```xml
<background_move_pool_size>32</background_move_pool_size>
```

Increase this if parts are not moving to cold storage on schedule.

## Summary

Configure the ClickHouse background schedule pool by matching pool sizes to your workload - more replicated tables and tiers need larger pools. Monitor `system.metrics` for pool saturation and `system.replication_queue` for task backlog. Splitting merges, schedule tasks, moves, and fetches into separate pools prevents one slow task type from starving the others.
