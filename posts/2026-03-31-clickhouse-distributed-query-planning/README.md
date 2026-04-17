# How ClickHouse Distributed Query Planning Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Distributed Query, Shard, Query Planning, Cluster

Description: Explains how ClickHouse plans and executes queries across distributed cluster shards, including two-stage aggregation, shard-local vs global operations, and common pitfalls.

---

## Distributed Table Architecture

In a ClickHouse cluster, data is split across shards. A Distributed table is a virtual table that routes queries to the underlying shard tables.

```sql
-- Shard-local table on each shard node
CREATE TABLE events_local (
  user_id    UInt64,
  event_time DateTime,
  event_type String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
ORDER BY (user_id, event_time);

-- Distributed table for query routing
CREATE TABLE events (
  user_id    UInt64,
  event_time DateTime,
  event_type String
) ENGINE = Distributed(
  'my_cluster',     -- cluster name from config.xml
  'analytics',      -- database
  'events_local',   -- local table name
  user_id           -- sharding key
);
```

## Query Execution Phases

When a query runs on the Distributed table, ClickHouse uses a two-phase execution plan:

```text
Phase 1 - Shard-local execution:
  Each shard runs a sub-query on its local data
  Partial aggregations are computed locally (e.g., partial count(), partial sum())

Phase 2 - Coordinator merge:
  The coordinator node receives partial results from all shards
  Merges partial aggregates into final results
  Applies ORDER BY, LIMIT, HAVING on merged data
```

## EXPLAIN on a Distributed Query

```sql
EXPLAIN
SELECT user_id, count() AS events
FROM events
WHERE event_time >= today()
GROUP BY user_id
ORDER BY events DESC
LIMIT 10;
```

Look for `Aggregating` operations appearing twice - once per shard and once on the coordinator.

## Sharding Key and Query Efficiency

The sharding key determines which shard stores a row. Queries that filter on the sharding key can skip shards entirely, but this requires the `optimize_skip_unused_shards` setting to be enabled (it is off by default).

```sql
SET optimize_skip_unused_shards = 1;

-- Sharding key is user_id
-- This query goes to only one shard (user_id = 42)
SELECT count() FROM events WHERE user_id = 42;

-- This query must hit all shards (no user_id filter)
SELECT count() FROM events WHERE event_time >= today();
```

## Two-Stage Aggregation for Large Groups

For GROUP BY queries with many distinct keys, ClickHouse can push the full GROUP BY to each shard and merge at the coordinator.

```sql
SET distributed_group_by_no_merge = 0;  -- default: coordinator merges partials

-- Each shard returns partial aggregates, coordinator combines
SELECT event_type, count() FROM events GROUP BY event_type;
```

## Global JOIN and Subqueries

A regular JOIN in a Distributed query runs on each shard independently, which can produce incorrect results if the right-side data is not replicated everywhere. Use `GLOBAL` to broadcast the subquery result to all shards.

```sql
-- WRONG: each shard joins against local filtered_users only
SELECT e.user_id FROM events e
JOIN users u ON e.user_id = u.user_id
WHERE u.country = 'US';

-- CORRECT: broadcast filtered_users to all shards
SELECT e.user_id FROM events e
GLOBAL JOIN (SELECT user_id FROM users WHERE country = 'US') u
ON e.user_id = u.user_id;
```

## Summary

ClickHouse distributed query planning works in two phases: shard-local partial execution followed by coordinator-side merging. Filtering on the sharding key reduces fan-out to fewer shards. Aggregations are computed partially on each shard and merged at the coordinator. Use `GLOBAL JOIN` when join inputs come from subqueries to avoid incorrect results from shard-local join evaluation.
