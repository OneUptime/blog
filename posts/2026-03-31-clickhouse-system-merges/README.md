# How to Use system.merges to Monitor Background Merges in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Merge, MergeTree, System Table, Performance

Description: Learn how to query system.merges to track active background merge operations, estimate completion time, and diagnose merge bottlenecks in MergeTree tables.

---

ClickHouse's MergeTree family continuously merges smaller data parts into larger ones in the background. Each active merge is visible in `system.merges`. Querying this table lets you see which tables are merging, how large the operation is, how far along it is, and when it is expected to finish. This is the first place to look when parts are accumulating faster than they are being merged.

## What system.merges Contains

```sql
DESCRIBE system.merges;
```

Key columns:

| Column | Type | Meaning |
|---|---|---|
| `database` | String | Database containing the table |
| `table` | String | Table being merged |
| `elapsed` | Float64 | Seconds since the merge started |
| `progress` | Float64 | Completion ratio from 0.0 to 1.0 |
| `num_parts` | UInt64 | Number of parts being merged together |
| `result_part_name` | String | Name of the part that will be produced |
| `is_mutation` | UInt8 | 1 if this is a mutation rather than a merge |
| `total_size_bytes_compressed` | UInt64 | Compressed size of all input parts |
| `total_size_bytes_uncompressed` | UInt64 | Uncompressed size of all input parts |
| `bytes_read_uncompressed` | UInt64 | Bytes processed so far (uncompressed) |
| `rows_read` | UInt64 | Rows processed so far |
| `rows_written` | UInt64 | Rows written to the output part so far |
| `memory_usage` | UInt64 | Current memory consumed by the merge |
| `thread_id` | UInt64 | OS thread executing the merge |

## List All Active Merges

```sql
SELECT
    database,
    table,
    elapsed,
    round(progress * 100, 2)       AS progress_pct,
    num_parts,
    formatReadableSize(total_size_bytes_compressed) AS compressed_size,
    formatReadableSize(memory_usage)                AS mem_usage,
    result_part_name,
    is_mutation
FROM system.merges
ORDER BY elapsed DESC;
```

## Estimate Time Remaining

```sql
SELECT
    database,
    table,
    result_part_name,
    round(progress * 100, 2)                   AS progress_pct,
    round(elapsed / progress - elapsed, 1)     AS estimated_seconds_remaining,
    formatReadableSize(total_size_bytes_compressed) AS total_compressed
FROM system.merges
WHERE progress > 0
ORDER BY estimated_seconds_remaining DESC;
```

Dividing elapsed time by progress gives the expected total duration. Subtracting elapsed gives the remaining time.

## Identify Large Merges

```sql
SELECT
    database,
    table,
    num_parts,
    formatReadableSize(total_size_bytes_compressed)   AS compressed,
    formatReadableSize(total_size_bytes_uncompressed) AS uncompressed,
    round(progress * 100, 2)                          AS progress_pct,
    elapsed
FROM system.merges
ORDER BY total_size_bytes_compressed DESC
LIMIT 10;
```

Large merges that stay at low progress for a long time indicate I/O saturation or underpowered merge threads.

## Separate Merges from Mutations

```sql
-- Active merges only
SELECT database, table, elapsed, progress, num_parts
FROM system.merges
WHERE is_mutation = 0
ORDER BY elapsed DESC;

-- Active mutations only
SELECT database, table, elapsed, progress, result_part_name
FROM system.merges
WHERE is_mutation = 1
ORDER BY elapsed DESC;
```

Mutations (ALTER TABLE ... UPDATE / DELETE) go through the same merge pipeline but are tracked with `is_mutation = 1`.

## Count Concurrent Merges Per Table

```sql
SELECT
    database,
    table,
    count()                                             AS active_merges,
    sum(num_parts)                                      AS total_parts_merging,
    formatReadableSize(sum(total_size_bytes_compressed)) AS total_compressed
FROM system.merges
WHERE is_mutation = 0
GROUP BY database, table
ORDER BY active_merges DESC;
```

## Monitor Merge Throughput in a Shell Loop

```bash
#!/usr/bin/env bash
# Print active merge progress every 5 seconds

while true; do
    echo "--- $(date) ---"
    clickhouse-client --query "
        SELECT
            database,
            table,
            round(progress * 100, 2) AS pct,
            round(elapsed / progress - elapsed, 1) AS eta_sec,
            formatReadableSize(total_size_bytes_compressed) AS size
        FROM system.merges
        WHERE progress > 0
        ORDER BY total_size_bytes_compressed DESC
        FORMAT PrettyCompactNoEscapes
    "
    sleep 5
done
```

## Watch for a Merge Backlog Using system.parts

Combine `system.merges` with `system.parts` to see whether parts are accumulating:

```sql
SELECT
    p.database,
    p.table,
    count()                                            AS active_parts,
    (SELECT count() FROM system.merges m
     WHERE m.database = p.database AND m.table = p.table) AS active_merges
FROM system.parts p
WHERE p.active = 1
GROUP BY p.database, p.table
HAVING active_parts > 300
ORDER BY active_parts DESC;
```

ClickHouse throws the "Too many parts" error when a partition exceeds `parts_to_throw_insert` active parts (default 300 before ClickHouse 23.6, 3000 since 23.6). Seeing high part counts alongside zero active merges suggests merge threads are stalled.

## Tune the Number of Merge Threads

```sql
-- View current background merge thread count
SELECT name, value
FROM system.server_settings
WHERE name IN (
    'background_pool_size',
    'background_merges_mutations_concurrency_ratio'
);
```

These are server-level settings and cannot be changed with `SET` at the session level. To change them, edit `config.xml`:

```xml
<background_pool_size>16</background_pool_size>
<background_merges_mutations_concurrency_ratio>2</background_merges_mutations_concurrency_ratio>
```

## Alert When No Merges Are Running But Parts Are High

```bash
#!/usr/bin/env bash
# Exit 1 (alert) if parts > 500 but no merges are active on the target table

DB="default"
TABLE="events"

parts=$(clickhouse-client --query "
    SELECT count() FROM system.parts
    WHERE database = '${DB}' AND table = '${TABLE}' AND active = 1
")

merges=$(clickhouse-client --query "
    SELECT count() FROM system.merges
    WHERE database = '${DB}' AND table = '${TABLE}'
")

if [ "${parts}" -gt 500 ] && [ "${merges}" -eq 0 ]; then
    echo "ALERT: ${DB}.${TABLE} has ${parts} parts but 0 active merges"
    exit 1
fi
echo "OK: parts=${parts} merges=${merges}"
```

## Common Pitfalls

- `system.merges` only shows merges running on the local node. In a replicated cluster, query each replica separately or use `clusterAllReplicas()`.
- Progress can briefly exceed 1.0 due to write amplification during deduplication or index construction. Treat values above 1.0 as nearly complete.
- A merge that stays at 0% progress for more than a minute is likely waiting for a mutex lock, out of memory, or blocked by a large mutation ahead of it in the queue.

## Summary

`system.merges` gives you a real-time window into the background work ClickHouse performs to keep your MergeTree tables healthy. Monitor it to catch merge backlogs early, estimate how long large operations will take, and distinguish routine merges from mutations that are modifying existing data.
