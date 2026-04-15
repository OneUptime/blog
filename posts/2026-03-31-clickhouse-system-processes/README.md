# How to Use system.processes to Monitor Active Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, System Table, Query, Monitoring, Administration

Description: Learn how to query system.processes to see currently running queries, measure elapsed time, inspect memory usage, and kill runaway queries in ClickHouse.

---

`system.processes` shows every query that is currently executing on the ClickHouse server at the moment you run the query. Unlike `system.query_log`, which is a historical record, `system.processes` is a live snapshot. It is the right tool for answering "what is running right now?" and for killing queries that are consuming too many resources.

## What system.processes Contains

```sql
DESCRIBE system.processes;
```

Key columns:

| Column | Type | Meaning |
|---|---|---|
| `query_id` | String | Unique identifier for the query |
| `user` | String | User who submitted the query |
| `query` | String | SQL text of the running query |
| `elapsed` | Float64 | Seconds since the query started |
| `read_rows` | UInt64 | Rows read so far |
| `read_bytes` | UInt64 | Bytes read from storage so far |
| `written_rows` | UInt64 | Rows written so far (for INSERT) |
| `total_rows_approx` | UInt64 | Estimated total rows to process |
| `memory_usage` | Int64 | Current memory used by this query |
| `peak_memory_usage` | Int64 | Peak memory used |
| `is_cancelled` | UInt8 | 1 if a cancellation was requested |
| `is_all_data_sent` | UInt8 | 1 if the result is fully sent to client |
| `ProfileEvents` | Map(String, UInt64) | Detailed profiling counters |

## List All Running Queries

```sql
SELECT
    query_id,
    user,
    elapsed,
    formatReadableSize(memory_usage)   AS memory,
    read_rows,
    formatReadableSize(read_bytes)     AS bytes_read,
    left(query, 100)                   AS query_preview
FROM system.processes
ORDER BY elapsed DESC;
```

This is the equivalent of `SHOW PROCESSLIST` in MySQL but with richer metadata.

## Show Estimated Progress

```sql
SELECT
    query_id,
    user,
    round(elapsed, 1)                                         AS elapsed_sec,
    read_rows,
    total_rows_approx,
    round(read_rows * 100.0 / nullIf(total_rows_approx, 0), 2) AS progress_pct,
    left(query, 100)                                          AS sql
FROM system.processes
WHERE total_rows_approx > 0
ORDER BY elapsed DESC;
```

`total_rows_approx` is an estimate based on the number of marks that will be read. Progress can exceed 100% in some cases due to the approximate nature of the estimate.

## Identify Memory-Heavy Queries

```sql
SELECT
    query_id,
    user,
    formatReadableSize(memory_usage)      AS memory,
    formatReadableSize(peak_memory_usage) AS peak_memory,
    elapsed,
    left(query, 120) AS sql
FROM system.processes
ORDER BY memory_usage DESC
LIMIT 10;
```

## Find Long-Running Queries

```sql
SELECT
    query_id,
    user,
    elapsed,
    formatReadableSize(read_bytes) AS bytes_read,
    left(query, 120) AS sql
FROM system.processes
WHERE elapsed > 60
ORDER BY elapsed DESC;
```

## Kill a Specific Query

```sql
-- Kill by query_id
KILL QUERY WHERE query_id = '5f52c7a4-b3d1-4f2e-9a6c-1234567890ab';
```

```sql
-- Kill all queries from a specific user
KILL QUERY WHERE user = 'analytics_bot';
```

```sql
-- Synchronous kill: wait until the query actually stops
KILL QUERY WHERE query_id = '5f52c7a4-b3d1-4f2e-9a6c-1234567890ab' SYNC;
```

Use `SYNC` when you need confirmation that the query has stopped before proceeding. Without `SYNC`, the command returns immediately and the kill happens asynchronously.

## Kill All Queries Exceeding a Time Limit

```sql
-- Kill every query running longer than 5 minutes
KILL QUERY WHERE elapsed > 300;
```

This is useful as a safety measure in automated scripts that run on a schedule to enforce query time limits cluster-wide.

## Monitor Queries from a Shell Script

```bash
#!/usr/bin/env bash
# Print running queries every 3 seconds

while true; do
    echo "--- $(date) ---"
    clickhouse-client --query "
        SELECT
            left(query_id, 8)                        AS id,
            user,
            round(elapsed, 1)                        AS sec,
            formatReadableSize(memory_usage)         AS mem,
            round(read_rows * 100.0 /
                  nullIf(total_rows_approx, 0), 1)   AS pct,
            left(query, 80)                          AS sql
        FROM system.processes
        ORDER BY elapsed DESC
        FORMAT PrettyCompactNoEscapes
    "
    sleep 3
done
```

## Detect Concurrent Queries Per User

```sql
SELECT
    user,
    count()                                       AS running_queries,
    formatReadableSize(sum(memory_usage))         AS total_memory,
    max(elapsed)                                  AS longest_sec
FROM system.processes
GROUP BY user
ORDER BY running_queries DESC;
```

## Watch a Specific Long Query

```bash
#!/usr/bin/env bash
# Poll a query by ID until it disappears from system.processes

QUERY_ID="5f52c7a4-b3d1-4f2e-9a6c-1234567890ab"

while true; do
    result=$(clickhouse-client --query "
        SELECT
            round(elapsed, 1) AS sec,
            read_rows,
            total_rows_approx,
            round(read_rows * 100.0 / nullIf(total_rows_approx, 0), 2) AS pct,
            formatReadableSize(memory_usage) AS mem
        FROM system.processes
        WHERE query_id = '${QUERY_ID}'
        FORMAT TSV
    ")

    if [ -z "${result}" ]; then
        echo "Query completed or not found"
        break
    fi

    echo "$(date): ${result}"
    sleep 2
done
```

## Correlate with system.query_log

Once a query finishes, it leaves `system.processes` and appears in `system.query_log`. Use the `query_id` to look it up:

```sql
SELECT
    query_id,
    query_duration_ms,
    read_rows,
    formatReadableSize(memory_usage) AS memory,
    exception
FROM system.query_log
WHERE query_id = '5f52c7a4-b3d1-4f2e-9a6c-1234567890ab'
  AND type     = 'QueryFinish';
```

## SET a Session-Level Query Timeout

You can prevent long queries from appearing in `system.processes` in the first place by setting a timeout:

```sql
SET max_execution_time = 30; -- kill if query runs longer than 30 seconds
SELECT count() FROM very_large_table WHERE complex_filter;
```

For global enforcement, set it in `users.xml`:

```xml
<max_execution_time>300</max_execution_time>
```

## Common Pitfalls

- `system.processes` only reflects the local node. In a distributed cluster, a query appears on the initiating node but sub-queries on remote shards appear in `system.processes` on those shards.
- The `query` column is the full SQL text. For large INSERT queries this can be megabytes of data. Use `left(query, N)` to limit output.
- `KILL QUERY` marks the query as cancelled, but the cancellation is checked at safe points inside the execution engine. A query stuck in a tight I/O loop may take a few seconds to actually stop.

## Summary

`system.processes` is your real-time window into what ClickHouse is doing right now. Use it to catch runaway queries before they exhaust memory, track progress of long-running analytical queries, and kill anything that violates your service level objectives. Pair it with `system.query_log` to trace the full lifecycle of any query.
