# How to Use system.mutations to Track Ongoing Mutations in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Mutation, MergeTree, System Table, Administration

Description: Learn how to query system.mutations to monitor ALTER UPDATE and ALTER DELETE progress, detect stuck mutations, and manage long-running data modifications in ClickHouse.

---

Mutations in ClickHouse are `ALTER TABLE ... UPDATE` and `ALTER TABLE ... DELETE` operations. Unlike traditional databases, mutations do not modify data in place. ClickHouse rewrites entire parts on disk, which can take significant time on large tables. `system.mutations` tracks every mutation - pending, in progress, and completed - giving you visibility into how much work is being done and whether any mutations are stuck.

## What system.mutations Contains

```sql
DESCRIBE system.mutations;
```

Key columns:

| Column | Type | Meaning |
|---|---|---|
| `database` | String | Database name |
| `table` | String | Table name |
| `mutation_id` | String | Unique mutation identifier |
| `command` | String | The SQL command (UPDATE/DELETE predicate) |
| `create_time` | DateTime | When the mutation was submitted |
| `block_numbers.partition_id` | Array(String) | Partitions affected |
| `block_numbers.number` | Array(Int64) | Block number up to which this mutation applies |
| `parts_to_do_names` | Array(String) | Parts still to be mutated |
| `parts_to_do` | Int64 | Count of parts still to process |
| `is_done` | UInt8 | 1 when all parts have been mutated |
| `latest_failed_part` | String | Last part that failed to mutate |
| `latest_fail_time` | DateTime | When the last failure occurred |
| `latest_fail_reason` | String | Error message from the last failure |

## List All Pending and In-Progress Mutations

```sql
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    parts_to_do,
    is_done
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time;
```

## List Recently Completed Mutations

```sql
SELECT
    database,
    table,
    mutation_id,
    command,
    create_time,
    is_done
FROM system.mutations
WHERE is_done = 1
ORDER BY create_time DESC
LIMIT 20;
```

## Monitor Mutation Progress

```sql
SELECT
    database,
    table,
    mutation_id,
    left(command, 80)                      AS cmd_preview,
    create_time,
    parts_to_do,
    length(parts_to_do_names)              AS parts_remaining,
    dateDiff('second', create_time, now()) AS age_seconds,
    is_done
FROM system.mutations
WHERE is_done = 0
ORDER BY create_time;
```

`parts_to_do` decrements as parts are rewritten. A mutation that has been running for hours with `parts_to_do` unchanged is stuck.

## Detect Failed Mutations

```sql
SELECT
    database,
    table,
    mutation_id,
    command,
    latest_failed_part,
    latest_fail_time,
    latest_fail_reason
FROM system.mutations
WHERE latest_fail_reason != ''
ORDER BY latest_fail_time DESC;
```

## Submit an UPDATE Mutation

```sql
ALTER TABLE default.events UPDATE status = 'archived' WHERE event_date < '2023-01-01';

-- Check progress immediately
SELECT mutation_id, parts_to_do, is_done
FROM system.mutations
WHERE database = 'default' AND table = 'events' AND is_done = 0
ORDER BY create_time DESC;
```

## Submit a DELETE Mutation

```sql
ALTER TABLE default.events DELETE WHERE user_id = 42;

-- Monitor it
SELECT mutation_id, command, parts_to_do, is_done, create_time
FROM system.mutations
WHERE database = 'default' AND table = 'events'
ORDER BY create_time DESC
LIMIT 5;
```

## Wait for a Mutation to Complete

```sql
-- Block until the mutation finishes (useful in scripts)
ALTER TABLE default.events UPDATE status = 'archived'
WHERE event_date < '2023-01-01'
SETTINGS mutations_sync = 1;
```

`mutations_sync = 1` makes the ALTER command synchronous - it blocks until all parts on the current replica are mutated. Use `mutations_sync = 2` to wait for all replicas.

## Cancel a Running Mutation

```sql
-- Find the mutation_id first
SELECT mutation_id, command, parts_to_do
FROM system.mutations
WHERE database = 'default' AND table = 'events' AND is_done = 0;

-- Kill the mutation
KILL MUTATION WHERE database = 'default' AND table = 'events'
    AND mutation_id = 'mutation_20240115_143022_12345';
```

## Estimate Time Remaining

```sql
WITH
    m AS (
        SELECT
            database,
            table,
            mutation_id,
            parts_to_do,
            dateDiff('second', create_time, now()) AS age_sec
        FROM system.mutations
        WHERE is_done = 0
    ),
    total AS (
        SELECT
            database,
            table,
            count() AS total_parts
        FROM system.parts
        WHERE active
        GROUP BY database, table
    )
SELECT
    m.database,
    m.table,
    m.mutation_id,
    m.parts_to_do,
    total.total_parts - m.parts_to_do AS parts_done,
    m.age_sec,
    round(
        m.age_sec * m.parts_to_do /
        nullIf(total.total_parts - m.parts_to_do, 0),
        0
    ) AS estimated_sec_remaining
FROM m
JOIN total ON m.database = total.database
         AND m.table = total.table;
```

## Shell Script: Watch Mutation Progress

```bash
#!/usr/bin/env bash
# Poll mutation progress every 5 seconds

DB="default"
TABLE="events"

while true; do
    echo "--- $(date) ---"
    clickhouse-client --query "
        SELECT
            mutation_id,
            left(command, 60) AS cmd,
            parts_to_do,
            is_done,
            dateDiff('second', create_time, now()) AS age_sec
        FROM system.mutations
        WHERE database = '${DB}' AND table = '${TABLE}'
          AND is_done = 0
        ORDER BY create_time
        FORMAT PrettyCompactNoEscapes
    "

    remaining=$(clickhouse-client --query "
        SELECT count() FROM system.mutations
        WHERE database = '${DB}' AND table = '${TABLE}' AND is_done = 0
    ")

    if [ "${remaining}" -eq 0 ]; then
        echo "All mutations completed"
        break
    fi

    sleep 5
done
```

## Prevent Mutation Buildup

Mutations can queue up if submitted faster than they complete. Check the backlog:

```sql
SELECT
    database,
    table,
    count()      AS pending_mutations,
    sum(parts_to_do) AS total_parts_to_rewrite
FROM system.mutations
WHERE is_done = 0
GROUP BY database, table
ORDER BY total_parts_to_rewrite DESC;
```

If `total_parts_to_rewrite` is large, consider:
1. Increasing `background_pool_size` to give more threads to background work.
2. Reducing mutation frequency - batch multiple UPDATEs into a single ALTER command.
3. Using `ReplacingMergeTree` or `CollapsingMergeTree` for high-frequency updates instead of mutations.

## Common Pitfalls

- Mutations do not block SELECT queries. Reads return data from both the old parts (not yet mutated) and new parts (already mutated) simultaneously, which can cause temporary inconsistency during a large mutation.
- Completed mutations are retained in `system.mutations` based on the `finished_mutations_to_keep` MergeTree engine setting. Older entries are automatically deleted. Filter with `is_done = 0` for operational queries.
- Cancelling a mutation with `KILL MUTATION` leaves partially mutated parts. Parts that were already rewritten remain rewritten; parts that were not yet processed are skipped. The table remains consistent but the mutation command is not fully applied.
- On replicated tables, `parts_to_do` reflects only the local replica. Other replicas process the same mutation independently.

## Summary

`system.mutations` provides full visibility into ClickHouse's data modification pipeline. Monitor `parts_to_do` to track progress, watch `latest_fail_reason` to catch errors early, and use `KILL MUTATION` to cancel stuck operations. For high-update workloads, prefer table engine designs that avoid mutations entirely.
