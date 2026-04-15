# How to Configure ClickHouse max_memory_usage Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Performance, Configuration, Memory

Description: Learn how to set max_memory_usage and related memory limits in ClickHouse to prevent runaway queries from exhausting server RAM and causing OOM crashes.

---

ClickHouse is designed for high-throughput analytical queries that can scan billions of rows in seconds. Without memory guardrails, a single poorly written query can allocate tens of gigabytes of RAM and trigger an out-of-memory kill of the entire server process. The `max_memory_usage` family of settings gives you fine-grained control over how much memory individual queries and the server as a whole are allowed to consume.

## The Memory Settings Hierarchy

ClickHouse has several related memory settings that form a hierarchy:

- `max_memory_usage` - per-query limit for a single user query.
- `max_memory_usage_for_user` - total limit across all concurrent queries from one user.
- `max_server_memory_usage` - hard limit on the total memory the server process may use.
- `max_server_memory_usage_to_ram_ratio` - sets `max_server_memory_usage` as a fraction of total RAM (alternative to a fixed byte value).

## Setting max_memory_usage Per Query

The most common setting. It caps how much memory a single SELECT, INSERT SELECT, or similar query may allocate:

```sql
-- Limit this query to 4 GiB
SELECT
    user_id,
    count() AS events,
    sum(revenue) AS total_revenue
FROM events
WHERE event_date >= today() - 30
GROUP BY user_id
ORDER BY total_revenue DESC
LIMIT 1000
SETTINGS max_memory_usage = 4294967296;
```

When the limit is hit ClickHouse throws an exception and cancels the query. No data is corrupted and other queries continue normally.

## Setting max_memory_usage in User Profiles

Rather than adding `SETTINGS` to every query, configure the limit in the user profile:

```xml
<clickhouse>
    <profiles>
        <default>
            <!-- 10 GiB per query for normal users -->
            <max_memory_usage>10737418240</max_memory_usage>
        </default>
        <analyst>
            <!-- 20 GiB for analysts who run heavy aggregations -->
            <max_memory_usage>21474836480</max_memory_usage>
        </analyst>
        <readonly>
            <!-- 2 GiB for read-only reporting queries -->
            <max_memory_usage>2147483648</max_memory_usage>
        </readonly>
    </profiles>
</clickhouse>
```

## Setting Per-User Totals

`max_memory_usage_for_user` limits the combined memory of all concurrent queries from a single user:

```xml
<clickhouse>
    <profiles>
        <analyst>
            <!-- Each query may use up to 10 GiB -->
            <max_memory_usage>10737418240</max_memory_usage>
            <!-- But all analyst queries together may not exceed 30 GiB -->
            <max_memory_usage_for_user>32212254720</max_memory_usage_for_user>
        </analyst>
    </profiles>
</clickhouse>
```

## Setting the Server-Wide Limit

The server-wide limit prevents the entire ClickHouse process from consuming more than a defined amount of RAM regardless of how many queries are running:

```xml
<clickhouse>
    <!-- Hard cap at 48 GiB on a 64 GiB machine -->
    <max_server_memory_usage>51539607552</max_server_memory_usage>
</clickhouse>
```

Alternatively, use a ratio so the setting scales automatically across machines with different RAM sizes:

```xml
<clickhouse>
    <!-- Use at most 75% of total system RAM -->
    <max_server_memory_usage_to_ram_ratio>0.75</max_server_memory_usage_to_ram_ratio>
</clickhouse>
```

When both are set, ClickHouse uses whichever is smaller.

## Memory Overcommit Behavior

By default, when a query exceeds `max_memory_usage` ClickHouse raises an exception immediately. You can change this behavior with the experimental memory overcommit settings. When `memory_overcommit_ratio_denominator` is set to a non-zero value, ClickHouse allows queries to temporarily exceed their memory limits. If total memory pressure causes the server to hit its global limit, ClickHouse computes an overcommit ratio for each query (allocated bytes divided by the denominator) and kills the query with the highest ratio first, rather than failing immediately:

```sql
-- Enable experimental memory overcommit: under memory pressure,
-- this query's overcommit ratio is computed as allocated / 1073741824
SELECT *
FROM large_table
SETTINGS
    max_memory_usage = 8589934592,
    memory_overcommit_ratio_denominator = 1073741824;
```

Note that this feature is experimental. A simpler approach for handling large queries is to configure `max_bytes_before_external_group_by` and `max_bytes_before_external_sort`, which let ClickHouse spill to disk when in-memory limits are exceeded rather than failing the query.

## Spill to Disk for GROUP BY

```sql
-- Spill GROUP BY state to disk when it exceeds 4 GiB in RAM
SELECT
    user_country,
    device_type,
    count() AS sessions
FROM web_events
GROUP BY user_country, device_type
SETTINGS
    max_bytes_before_external_group_by = 4294967296,
    max_memory_usage = 10737418240;
```

Configure globally in the user profile:

```xml
<clickhouse>
    <profiles>
        <default>
            <max_memory_usage>10737418240</max_memory_usage>
            <!-- Spill GROUP BY to disk at 4 GiB -->
            <max_bytes_before_external_group_by>4294967296</max_bytes_before_external_group_by>
            <!-- Spill ORDER BY to disk at 4 GiB -->
            <max_bytes_before_external_sort>4294967296</max_bytes_before_external_sort>
        </default>
    </profiles>
</clickhouse>
```

## Monitoring Memory Usage

```sql
-- Current memory usage per running query
SELECT
    query_id,
    user,
    memory_usage,
    formatReadableSize(memory_usage) AS memory_readable,
    query
FROM system.processes
ORDER BY memory_usage DESC;
```

```sql
-- Historical peak memory usage from query log
SELECT
    query_id,
    user,
    formatReadableSize(memory_usage) AS memory_used,
    event_time,
    left(query, 100) AS query_snippet
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_date = today()
ORDER BY memory_usage DESC
LIMIT 20;
```

```sql
-- Server-wide memory metrics
SELECT
    metric,
    formatReadableSize(value) AS value
FROM system.metrics
WHERE metric IN (
    'MemoryTracking',
    'MergesMutationsMemoryTracking'
);
```

## Handling Memory Limit Exceptions

When a query exceeds its limit you will see an error like:

```text
Code: 241. DB::Exception: Received from localhost:9000.
DB::Exception: Memory limit (for query) exceeded:
would use 10.01 GiB (attempt to allocate chunk of 1048576 bytes),
maximum: 10.00 GiB.
```

Options for resolving this:

1. Increase `max_memory_usage` in the user profile.
2. Add `max_bytes_before_external_group_by` to enable disk spill.
3. Rewrite the query to use less memory (e.g., avoid `ORDER BY` on large result sets, use `LIMIT` earlier, avoid `IN` with large subqueries).
4. Split the query into smaller time-range chunks.

## Recommended Starting Configuration

```xml
<clickhouse>
    <!-- Server-wide: 80% of RAM -->
    <max_server_memory_usage_to_ram_ratio>0.80</max_server_memory_usage_to_ram_ratio>

    <profiles>
        <default>
            <!-- 10 GiB per query -->
            <max_memory_usage>10737418240</max_memory_usage>
            <!-- Spill aggregations and sorts to disk before hitting the limit -->
            <max_bytes_before_external_group_by>5368709120</max_bytes_before_external_group_by>
            <max_bytes_before_external_sort>5368709120</max_bytes_before_external_sort>
        </default>
    </profiles>
</clickhouse>
```

## Conclusion

`max_memory_usage` and its companion settings are essential guardrails for any production ClickHouse deployment. Set per-query limits in user profiles, configure spill-to-disk thresholds to gracefully handle large aggregations, and monitor `system.processes` and `system.query_log` to identify queries that approach or exceed their limits. Combining these settings with the server-wide ratio cap ensures ClickHouse never exhausts all available RAM regardless of query concurrency.
