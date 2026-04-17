# How to Debug ClickHouse Disk IO Bottlenecks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Disk IO, Performance, Debug, Storage

Description: Debug ClickHouse disk IO bottlenecks using system metrics, iostat, and query profiling to identify and resolve storage throughput issues.

---

Disk IO is often the bottleneck in ClickHouse query performance. MergeTree reads data in columnar format which is IO-efficient, but background merges, unoptimized queries that scan too much data, and slow storage can all create IO bottlenecks.

## Monitor Disk IO at the OS Level

```bash
# Overall disk throughput and utilization
iostat -x 1 10

# Per-disk stats
iostat -x -d /dev/sdb 1

# IO wait (high iowait% = disk bottleneck)
top  # Look at %wa (iowait) in the CPU line
```

High `%iowait` (over 20%) indicates disk IO is limiting performance.

## Check ClickHouse Disk Metrics

```sql
SELECT
    metric,
    value
FROM system.metrics
WHERE metric IN (
    'ReadonlyReplica',
    'BackgroundMergesAndMutationsPoolTask',
    'BackgroundFetchesPoolTask',
    'BackgroundMovePoolTask'
);

-- Disk read/write rates (host-level, per block device)
SELECT
    metric,
    value
FROM system.asynchronous_metrics
WHERE metric LIKE 'BlockRead%' OR metric LIKE 'BlockWrite%';
```

## Identify IO-Heavy Queries

```sql
SELECT
    query_id,
    formatReadableSize(read_bytes) AS bytes_read,
    formatReadableSize(written_bytes) AS bytes_written,
    read_rows,
    query_duration_ms,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time > now() - INTERVAL 1 HOUR
ORDER BY read_bytes DESC
LIMIT 10;
```

## Check Part Sizes and Merge Activity

Large merge operations read and rewrite significant data:

```sql
SELECT
    database,
    table,
    elapsed,
    progress,
    formatReadableSize(total_size_bytes_compressed) AS size,
    result_part_name
FROM system.merges
ORDER BY elapsed DESC;
```

## Reduce IO with Projection and Partition Pruning

```sql
-- Ensure queries use partition pruning (check with EXPLAIN indexes = 1)
EXPLAIN indexes = 1 SELECT count() FROM events WHERE event_date = today();

-- Look for "Partition" / "MinMax" index usage in output, with Parts and Granules filtered counts
```

Add a partition by clause if missing:

```sql
CREATE TABLE events (
    event_date Date,
    user_id UInt64,
    event_type String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id);
```

## Move to Faster Storage

Use ClickHouse's storage tiering to put hot data on SSD:

```xml
<storage_configuration>
  <disks>
    <ssd>
      <path>/mnt/ssd/clickhouse/</path>
    </ssd>
    <hdd>
      <path>/mnt/hdd/clickhouse/</path>
    </hdd>
  </disks>
  <policies>
    <tiered>
      <volumes>
        <hot>
          <disk>ssd</disk>
          <max_data_part_size_bytes>1073741824</max_data_part_size_bytes>
        </hot>
        <cold>
          <disk>hdd</disk>
        </cold>
      </volumes>
    </tiered>
  </policies>
</storage_configuration>
```

## Summary

ClickHouse disk IO bottlenecks are identified through OS-level `iostat` monitoring and ClickHouse's `system.query_log` tracking bytes read per query. Reduce IO by ensuring partition pruning is active, moving hot data to SSD using storage tiering, and monitoring background merge activity. Queries scanning unexpectedly large amounts of data usually lack proper partition filters.
