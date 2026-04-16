# How to Use KILL QUERY in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, KILL QUERY, Administration, Monitoring

Description: Learn how to use KILL QUERY in ClickHouse to terminate runaway queries by query ID, user, or other criteria safely.

---

`KILL QUERY` in ClickHouse sends a termination signal to one or more running queries. It is an essential administrative tool for stopping runaway queries that are consuming excessive memory or CPU, unblocking a server under heavy load, or cancelling long-running migrations that were started by mistake. Before killing a query you need its `query_id`, which you retrieve from `SHOW PROCESSLIST` or `system.processes`.

## Basic KILL QUERY Syntax

```sql
KILL QUERY WHERE query_id = 'a1b2c3d4-0000-0000-0000-000000000001';
```

The WHERE clause identifies which query or queries to kill. You can filter by any column available in `system.processes`.

## Step 1 - Find the Query ID

Always start by identifying the query you want to kill:

```sql
SELECT
    query_id,
    user,
    round(elapsed, 2)                AS elapsed_sec,
    formatReadableSize(memory_usage) AS memory,
    left(query, 150)                 AS query_preview
FROM system.processes
WHERE elapsed > 30
ORDER BY elapsed DESC;
```

```text
query_id                             | user    | elapsed_sec | memory      | query_preview
a1b2c3d4-0000-0000-0000-000000000001 | analyst | 245.30      | 4.20 GiB    | SELECT region, product_id, count()...
```

Copy the `query_id` value for use in KILL QUERY.

## Kill a Single Query by ID

```sql
KILL QUERY WHERE query_id = 'a1b2c3d4-0000-0000-0000-000000000001';
```

Sample response:

```text
kill_status | query_id                             | user    | query
waiting     | a1b2c3d4-0000-0000-0000-000000000001 | analyst | SELECT region...
```

A `kill_status` of `waiting` means the cancel signal has been sent and ClickHouse is waiting for the query to stop at the next cancellation checkpoint in its execution. Once the query actually stops, the status becomes `finished`.

## SYNC vs ASYNC Kill

By default, KILL QUERY is asynchronous - it sends the signal and returns immediately without waiting for the query to finish.

```sql
-- Asynchronous kill (default) - returns immediately
KILL QUERY WHERE query_id = 'a1b2c3d4-0000-0000-0000-000000000001' ASYNC;

-- Synchronous kill - waits until the query actually stops
KILL QUERY WHERE query_id = 'a1b2c3d4-0000-0000-0000-000000000001' SYNC;
```

Use `SYNC` when you need to confirm the query has terminated before proceeding - for example, before reclaiming resources or releasing a table lock in a migration script.

## Kill All Queries by a Specific User

If a user's session is issuing many problematic queries at once, you can kill all of them together:

```sql
KILL QUERY WHERE user = 'analyst';
```

This will match every row in `system.processes` where `user = 'analyst'` and send a kill signal to each.

## Kill Queries Running Longer Than a Threshold

```sql
KILL QUERY WHERE elapsed > 300 AND user != 'default';
```

This kills any query running longer than 5 minutes, excluding the `default` user (often used by internal ETL jobs with known long runtimes).

## Kill Queries by Memory Usage

```sql
KILL QUERY WHERE memory_usage > 5 * 1024 * 1024 * 1024;
-- Kill queries using more than 5 GiB of memory
```

## TEST Mode - Preview Without Killing

Use `TEST` to preview which queries would be killed without actually sending a termination signal:

```sql
KILL QUERY WHERE elapsed > 60 TEST;
```

```text
kill_status    | query_id                             | user    | query
unknown_status | a1b2c3d4-0000-0000-0000-000000000001 | analyst | SELECT ...
unknown_status | b9c0d1e2-0000-0000-0000-000000000002 | etl     | INSERT ...
```

`TEST` is invaluable when writing a broad WHERE clause - always preview first to avoid accidentally killing production ETL jobs.

## Kill a Query from the Shell

You can also kill a query directly from the command line:

```bash
clickhouse-client --query "KILL QUERY WHERE query_id = 'a1b2c3d4-0000-0000-0000-000000000001' SYNC"
```

Or combined with a lookup in a single shell script:

```bash
# Find the longest-running query and kill it
QUERY_ID=$(clickhouse-client --query "
  SELECT query_id FROM system.processes
  WHERE user = 'analyst'
  ORDER BY elapsed DESC
  LIMIT 1
  FORMAT TabSeparated
")

if [ -n "$QUERY_ID" ]; then
  clickhouse-client --query "KILL QUERY WHERE query_id = '$QUERY_ID' SYNC"
  echo "Killed query: $QUERY_ID"
fi
```

## Kill Status Values

| Status | Meaning |
|--------|---------|
| `finished` | Query has finished (either terminated successfully or was no longer running by the time KILL ran) |
| `waiting` | Cancel signal has been sent, waiting for the query to stop at its next checkpoint |
| `pending` | Query has not started executing yet (not initialized) |
| `cant_cancel` | Cancel signal cannot be sent for this query |
| `unknown_status` | Returned when `TEST` mode is used (no signal is actually sent) |

## Summary

`KILL QUERY WHERE query_id = '...'` is the standard way to terminate a runaway query in ClickHouse. Always use `TEST` first when writing broad WHERE clauses to preview the impact. Use `SYNC` when you need confirmation that the query has actually stopped before continuing. For automated administration scripts, combine `system.processes` queries with KILL QUERY to build policies that automatically terminate queries exceeding memory or time thresholds.
