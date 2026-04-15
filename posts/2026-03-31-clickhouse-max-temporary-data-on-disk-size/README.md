# How to Use max_temporary_data_on_disk_size in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, max_temporary_data_on_disk_size, Spill to Disk, Memory Management, Setting, External Sort

Description: Control how much temporary disk space ClickHouse may use for spilling large aggregations and sorts with max_temporary_data_on_disk_size.

---

When ClickHouse processes large aggregations or sort operations that exceed available memory, it can spill intermediate data to disk. The `max_temporary_data_on_disk_size` setting caps how much disk space this spilling can consume, preventing runaway queries from filling storage volumes.

## What is max_temporary_data_on_disk_size?

`max_temporary_data_on_disk_size` is a **server-level** setting in bytes (default: `0`, unlimited) that defines the maximum total amount of temporary data that may be written to disk for external aggregation, joins, or sorting across all queries. When the limit is exceeded, ClickHouse throws an error rather than continuing to write.

ClickHouse also provides more granular variants:
- `max_temporary_data_on_disk_size_for_query` - per-query limit on temporary disk usage
- `max_temporary_data_on_disk_size_for_user` - per-user limit on temporary disk usage

These work in combination with:
- `max_bytes_before_external_group_by` - triggers GROUP BY spill to disk
- `max_bytes_before_external_sort` - triggers ORDER BY spill to disk

## Enabling Spill to Disk

First, enable external aggregation and sorting by setting the thresholds. Use `max_temporary_data_on_disk_size_for_query` to cap disk usage per query:

```sql
SELECT
    user_id,
    count()      AS events,
    sum(revenue) AS total
FROM transactions
GROUP BY user_id
SETTINGS
    max_bytes_before_external_group_by        = 2000000000,   -- 2 GB
    max_temporary_data_on_disk_size_for_query = 10000000000;  -- 10 GB cap
```

## Limiting Disk Usage per Query

Cap how much spill a single query can produce:

```sql
SELECT
    session_id,
    groupArray(event_type) AS events
FROM clickstream
GROUP BY session_id
ORDER BY session_id
SETTINGS
    max_bytes_before_external_sort            = 1000000000,
    max_bytes_before_external_group_by        = 1000000000,
    max_temporary_data_on_disk_size_for_query = 5000000000;   -- 5 GB max spill
```

## Setting Global Server Defaults

In `config.xml`, apply the server-wide limit:

```text
<max_temporary_data_on_disk_size>10737418240</max_temporary_data_on_disk_size>
```

To set per-user limits, use the `_for_user` variant in `users.xml` profiles or with SQL:

```sql
ALTER USER heavy_user
    SETTINGS max_temporary_data_on_disk_size_for_user = 5368709120;  -- 5 GB
```

## Monitoring Temporary Disk Usage

Check which queries consume the most memory (queries that approach `max_memory_usage` are candidates for spilling):

```sql
SELECT
    query_id,
    query,
    peak_memory_usage,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY peak_memory_usage DESC
LIMIT 10;
```

Also watch disk usage on the temp directory configured in ClickHouse's `tmp_path`:

```bash
df -h /var/lib/clickhouse/tmp/
```

## What Happens When the Limit is Hit

When a query's spill exceeds the configured limit, ClickHouse raises an error such as:

```text
DB::Exception: Limit for temporary files size exceeded
```

The query is aborted and temporary files are cleaned up. This prevents a single out-of-control query from filling the disk and impacting other workloads.

## Best Practices

- Set `max_temporary_data_on_disk_size` to a fraction of available temp disk space (e.g., 50% if disk is dedicated)
- Use separate volumes for ClickHouse temp data to isolate I/O from data storage
- Monitor `system.query_log.peak_memory_usage` and the `tmp_path` directory to identify queries that frequently spill

## Summary

`max_temporary_data_on_disk_size` provides a server-wide safety cap for disk spilling in ClickHouse. Use `max_temporary_data_on_disk_size_for_query` and `max_temporary_data_on_disk_size_for_user` for more granular control. Enable these alongside `max_bytes_before_external_group_by` and `max_bytes_before_external_sort` to allow large queries to spill safely without filling your storage volumes.
