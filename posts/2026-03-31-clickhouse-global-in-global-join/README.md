# How to Use GLOBAL IN and GLOBAL JOIN in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, GLOBAL IN, GLOBAL JOIN, Distributed, Subquery, Performance

Description: Learn when and how to use GLOBAL IN and GLOBAL JOIN in ClickHouse to avoid redundant subquery execution on every shard.

---

Without the GLOBAL keyword, a subquery referencing a Distributed table is executed independently on every shard. This causes N executions of the same work and can return incorrect results when the subquery itself spans shards. GLOBAL IN and GLOBAL JOIN fix both problems.

## The Problem with Plain IN on Distributed Tables

```sql
-- Bad: each shard runs the subquery independently
SELECT user_id, count()
FROM dist_events
WHERE user_id IN (SELECT user_id FROM dist_vip_users)
GROUP BY user_id;
```

Each shard re-runs `SELECT user_id FROM dist_vip_users` against its own local slice. If `dist_vip_users` is also distributed, each shard only sees its own partition of VIP users, producing incomplete results.

## GLOBAL IN

GLOBAL IN tells the initiator to run the subquery once, collect all results into a temporary in-memory set, and distribute that set to every shard.

```sql
SELECT user_id, count()
FROM dist_events
WHERE user_id GLOBAL IN (SELECT user_id FROM dist_vip_users)
GROUP BY user_id;
```

The initiator executes `SELECT user_id FROM dist_vip_users` as a full distributed query, builds an in-memory set, then sends it alongside the main query to each shard. Shards filter locally against the pre-built set.

## GLOBAL JOIN

The same principle applies to JOINs:

```sql
SELECT e.user_id, v.tier, count()
FROM dist_events AS e
GLOBAL JOIN dist_vip_users AS v ON e.user_id = v.user_id
GROUP BY e.user_id, v.tier;
```

The initiator fetches all rows from `dist_vip_users` once and sends them as a temporary table to every shard. Each shard builds its own hash table from the temporary data and probes it locally.

## Memory Considerations

Both GLOBAL IN and GLOBAL JOIN load the subquery result into the initiator's memory and then into each shard's memory. Keep the right-side result set small.

```sql
-- Good: limit what is broadcast
SELECT e.user_id, count()
FROM dist_events AS e
GLOBAL JOIN (
    SELECT user_id, tier
    FROM dist_vip_users
    WHERE tier = 'gold'
) AS v ON e.user_id = v.user_id
GROUP BY e.user_id;
```

## Checking if GLOBAL is Being Used

```sql
EXPLAIN
SELECT user_id, count()
FROM dist_events
WHERE user_id GLOBAL IN (SELECT user_id FROM dist_vip_users)
GROUP BY user_id;
```

Look for `CreatingSets` (with a `CreatingSet` child) and `ReadFromRemote` in the EXPLAIN output, confirming the set is built once on the initiator and then used by the distributed main query.

## When to Use GLOBAL vs Regular

| Situation | Use |
|---|---|
| Both tables are distributed | GLOBAL IN / GLOBAL JOIN |
| Right side is a small local table | Regular IN / JOIN |
| Right side fits in memory (< a few GB) | GLOBAL IN / GLOBAL JOIN |
| Right side is huge | Dictionary or collocated sharding |

## Summary

GLOBAL IN and GLOBAL JOIN solve the repeated subquery problem in distributed ClickHouse queries by executing the subquery once on the initiator and broadcasting the result to all shards. Use them whenever your IN subquery or JOIN right side references a Distributed table to ensure correctness and avoid redundant remote reads.
