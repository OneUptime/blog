# How to Diagnose ClickHouse Part Merger Stuck

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Merge, Stuck Merge, Diagnosis, system.merges, MergeTree

Description: Diagnose and resolve stuck ClickHouse merges by checking system.merges, background pool utilization, and disk space to restore normal part consolidation.

---

## Signs of a Stuck Merger

- Part count keeps growing despite low insert rate
- `system.merges` shows the same merge running for hours
- "Too many parts" errors appear in query logs
- Monitoring shows high `NumberOfParts` metric with no decrease

## Step 1 - Check Current Merge Status

```sql
SELECT
    table,
    progress,
    elapsed,
    is_mutation,
    formatReadableSize(total_size_bytes_compressed) AS size,
    result_part_name,
    source_part_names
FROM system.merges
ORDER BY elapsed DESC;
```

A `progress` value stuck at the same number for many minutes indicates a stuck merge.

## Step 2 - Check Background Pool Utilization

```sql
SELECT metric, value
FROM system.metrics
WHERE metric IN (
    'BackgroundMergesAndMutationsPoolTask',
    'BackgroundMergesAndMutationsPoolSize'
);
```

If `BackgroundMergesAndMutationsPoolTask` equals `BackgroundMergesAndMutationsPoolSize`, the pool is fully saturated.

## Step 3 - Check Disk Space

Merges create a new part before deleting the old ones. You need free space equal to the size of the parts being merged:

```sql
SELECT
    name,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total
FROM system.disks;
```

If free space is less than the merge size, the merge will stall or fail:

```bash
df -h /var/lib/clickhouse
```

## Step 4 - Check for Error in Server Log

```bash
grep -i "merge\|MergeTask\|Can't merge\|exception" \
  /var/log/clickhouse-server/clickhouse-server.log | tail -50
```

Common error patterns:
- `Not enough space for merging` - disk full
- `Exception during merge` - codec or data corruption
- `Already merging part` - duplicate merge attempt

## Step 5 - Inspect Part Health

```sql
SELECT
    table,
    name,
    active,
    level,
    rows,
    formatReadableSize(bytes_on_disk) AS size,
    modification_time
FROM system.parts
WHERE database = 'default' AND table = 'events'
ORDER BY modification_time DESC
LIMIT 30;
```

Parts stuck at a low level (0 or 1) with high row count need merging but aren't being picked up.

## Resolving Stuck Merges

Free up disk space by dropping old partitions:

```sql
ALTER TABLE events DROP PARTITION '2025-01';
```

Increase the merge pool to unblock saturation. `background_pool_size` is a server-level setting, so edit `config.xml` and reload the configuration (only increases take effect at runtime; decreases require a server restart):

```xml
<background_pool_size>32</background_pool_size>
```

```sql
SYSTEM RELOAD CONFIG;
```

Trigger a manual optimize to force merging:

```sql
OPTIMIZE TABLE events PARTITION '2026-03' FINAL;
```

## Summary

Diagnose stuck ClickHouse merges by checking `system.merges` for stalled progress, `system.metrics` for pool saturation, `system.disks` for insufficient free space, and the server log for merge exceptions. Resolve by freeing disk space, increasing the merge pool, or triggering manual partition-scoped `OPTIMIZE` commands.
