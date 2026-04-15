# How to Set max_memory_usage per Query in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Performance, Configuration, Memory, Query

Description: Learn how to configure the max_memory_usage setting in ClickHouse to limit memory consumption on a per-query basis and prevent resource exhaustion.

---

ClickHouse provides two levels of memory control: server-wide limits and per-query limits. The `max_server_memory_usage` setting controls total server memory, while the per-query `max_memory_usage` setting caps how much RAM a single query can consume, protecting your cluster from runaway queries while allowing normal workloads to proceed.

## Understanding Per-Query vs Server-Level Memory Limits

The server-level `max_server_memory_usage` (in `config.xml`) sets the absolute ceiling for the entire ClickHouse process. The user-level `max_memory_usage` setting in query context controls how much memory a single query may use before ClickHouse throws a `Memory limit (for query) exceeded` error.

These two settings work together. A query cannot exceed either limit.

## Setting max_memory_usage in users.xml

To apply a default limit for all queries by a profile, edit `users.xml`:

```xml
<profiles>
  <default>
    <max_memory_usage>10000000000</max_memory_usage>
  </default>
  <analysts>
    <max_memory_usage>20000000000</max_memory_usage>
  </analysts>
</profiles>
```

This sets a 10 GB per-query limit for the default profile and 20 GB for analysts.

## Setting max_memory_usage for a Single Session

You can override the limit for a session using `SET`:

```sql
SET max_memory_usage = 5000000000;

SELECT
    user_id,
    groupArray(event_type) AS events
FROM user_events
GROUP BY user_id;
```

## Setting max_memory_usage in a Single Query

Pass the setting inline with a query using `SETTINGS`:

```sql
SELECT
    product_id,
    sum(revenue) AS total_revenue
FROM orders
GROUP BY product_id
ORDER BY total_revenue DESC
LIMIT 100
SETTINGS max_memory_usage = 2000000000;
```

## Checking Current Memory Usage

To monitor memory consumption of running queries, query the `system.processes` table:

```sql
SELECT
    query_id,
    user,
    memory_usage,
    formatReadableSize(memory_usage) AS readable_memory,
    query
FROM system.processes
ORDER BY memory_usage DESC;
```

To review memory used by completed queries, use `system.query_log`:

```sql
SELECT
    query_id,
    user,
    memory_usage,
    formatReadableSize(memory_usage) AS readable_memory,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY memory_usage DESC
LIMIT 20;
```

## Handling Memory Limit Errors

When a query exceeds `max_memory_usage`, ClickHouse returns:

```text
Code: 241. DB::Exception: Memory limit (for query) exceeded: would use X bytes (attempt to allocate chunk of Y bytes), maximum: Z bytes.
```

Options to resolve this:
- Increase `max_memory_usage` for the profile or session
- Add filters to reduce the data scanned
- Use `max_bytes_before_external_group_by` to spill GROUP BY data to disk
- Rewrite the query to use less memory (e.g., avoid large IN lists or wide groupArray results)

## Using max_bytes_before_external_group_by as a Safety Valve

Instead of failing, you can allow ClickHouse to spill aggregation state to disk:

```sql
SET max_memory_usage = 10000000000;
SET max_bytes_before_external_group_by = 5000000000;

SELECT
    session_id,
    groupArray(page_url) AS visited_pages
FROM page_views
GROUP BY session_id;
```

When aggregation state exceeds `max_bytes_before_external_group_by`, ClickHouse writes it to a temp directory and continues processing.

## Best Practices

- Set a reasonable per-query limit (2-20 GB depending on server RAM) in the default profile
- Grant elevated limits only to trusted analyst profiles
- Monitor `system.query_log` regularly to catch queries approaching the limit
- Combine `max_memory_usage` with `max_execution_time` for comprehensive query guardrails

## Summary

The per-query `max_memory_usage` setting in ClickHouse is your first line of defense against queries that consume excessive RAM. By configuring it in user profiles, you protect cluster stability while still allowing analysts to run complex aggregations. Pair it with external group-by spilling to handle edge cases gracefully without hard failures.
