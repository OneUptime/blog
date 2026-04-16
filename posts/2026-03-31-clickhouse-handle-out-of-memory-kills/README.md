# How to Handle ClickHouse Out-of-Memory Kills

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, OOM, Memory, Incident Response, Performance

Description: Diagnose and resolve ClickHouse out-of-memory kills by identifying memory-hungry queries, setting per-query limits, and tuning server memory configuration.

---

OOM kills crash the ClickHouse process when the OS kills it or when ClickHouse's own memory limit is exceeded. Both scenarios interrupt all active queries. Here is how to diagnose and prevent them.

## Identify What Caused the OOM

Check the system OOM log:

```bash
dmesg | grep -i "killed process" | tail -20
journalctl -k | grep -i oom | tail -20
```

Check ClickHouse's own memory error log:

```bash
grep -i "memory" /var/log/clickhouse-server/clickhouse-server.err.log | tail -30
```

Find the heaviest recent queries:

```sql
SELECT
    query_id,
    user,
    query_start_time AS started,
    memory_usage / 1e9 AS memory_gb,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY memory_usage DESC
LIMIT 10;
```

## Set Per-Query Memory Limits

```sql
-- For all users
SET max_memory_usage = 10000000000;  -- 10 GB per query

-- For a specific user (profile)
ALTER USER analyst ADD SETTINGS max_memory_usage = 5000000000;
```

Or set globally in `users.xml`:

```xml
<profiles>
    <default>
        <max_memory_usage>10000000000</max_memory_usage>
    </default>
</profiles>
```

## Server-Level Memory Cap

```xml
<!-- clickhouse-server config -->
<max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>
```

This limits total server memory to 80% of RAM, leaving headroom for the OS.

## Rewrite Memory-Hungry Queries

Large `GROUP BY` on high-cardinality columns is a common cause:

```sql
-- Memory-heavy: keeps all groups in memory
SELECT user_id, count() FROM events GROUP BY user_id;

-- Better: use external aggregation
SET max_bytes_before_external_group_by = 5000000000;
SELECT user_id, count() FROM events GROUP BY user_id;
```

## Preventing Future OOM Events

Enable memory allocation sampling into `system.trace_log` so you can later identify memory-heavy code paths:

```xml
<total_memory_tracker_sample_probability>0.01</total_memory_tracker_sample_probability>
```

Monitor memory metrics via [OneUptime](https://oneuptime.com) and alert at 75% of server memory limit. This gives time to kill runaway queries before the OOM killer acts.

## Summary

OOM kills in ClickHouse are usually caused by one or two unconstrained analytical queries. Set per-query and server-level memory limits, enable external group-by for large aggregations, and monitor memory trends proactively to catch issues before they cause crashes.
