# How to Clean Up Old ClickHouse Data Parts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, Data Part, Cleanup, MergeTree

Description: Learn how to identify and clean up old, detached, and orphaned ClickHouse data parts to reclaim disk space and improve server health.

---

ClickHouse accumulates various types of old data parts over time: merged-away inactive parts, detached parts from failed operations, and frozen parts from backups. Cleaning these up reclaims disk space and keeps the server healthy.

## Types of Old Parts to Clean

1. **Inactive parts** - parts that have been merged into larger parts but not yet removed
2. **Detached parts** - parts moved to `detached/` directory due to errors or manual operations
3. **Frozen parts** - parts created by `ALTER TABLE FREEZE` for backups
4. **Temporary parts** - parts from interrupted merges or mutations

## Finding Inactive Parts

Inactive parts are normally cleaned up automatically, but may accumulate if cleanup is delayed:

```sql
SELECT
    database,
    table,
    count() AS inactive_parts,
    formatReadableSize(sum(bytes_on_disk)) AS wasted_space
FROM system.parts
WHERE active = 0
GROUP BY database, table
ORDER BY inactive_parts DESC;
```

## Forcing Cleanup of Inactive Parts

Inactive parts are removed by a background task after `old_parts_lifetime` seconds have elapsed (default 480 seconds / 8 minutes). There is no command to force immediate removal, but you can lower the setting or trigger merges that produce new inactive parts:

```sql
-- Merge small parts into larger ones (older parts become inactive)
OPTIMIZE TABLE my_database.events;

-- Lower old_parts_lifetime for a table to reduce retention of inactive parts
ALTER TABLE my_database.events MODIFY SETTING old_parts_lifetime = 60;
```

## Listing Detached Parts

Detached parts live in the `detached/` subdirectory of each table's data path:

```sql
SELECT
    database,
    table,
    count() AS detached_count,
    formatReadableSize(sum(bytes_on_disk)) AS detached_size
FROM system.detached_parts
GROUP BY database, table
ORDER BY detached_size DESC;
```

## Removing Detached Parts

After verifying detached parts are not needed, drop them. These statements require the user-level setting `allow_drop_detached = 1`:

```sql
SET allow_drop_detached = 1;

-- Drop a specific detached part
ALTER TABLE my_database.events DROP DETACHED PART 'all_0_0_0';

-- Drop all detached parts in the 'all' partition (for tables without PARTITION BY)
ALTER TABLE my_database.events DROP DETACHED PARTITION ID 'all';
```

Or remove manually from the filesystem after stopping ClickHouse:

```bash
# List detached parts
ls -la /var/lib/clickhouse/data/my_database/events/detached/

# Remove old detached parts (verify they are safe to delete first)
rm -rf /var/lib/clickhouse/data/my_database/events/detached/all_0_0_0/
```

## Cleaning Up Frozen Parts

Frozen parts from `ALTER TABLE FREEZE` accumulate in the `shadow/` directory:

```bash
# List frozen snapshots
ls -la /var/lib/clickhouse/shadow/

# Clean up old snapshots by name
ALTER TABLE events UNFREEZE WITH NAME 'backup_20260301';

# Manual cleanup
rm -rf /var/lib/clickhouse/shadow/backup_20260301/
```

## Checking for Orphaned Temporary Files

Temporary parts from interrupted merges may leave orphaned files:

```bash
# Find old temporary directories
find /var/lib/clickhouse/data/ -maxdepth 3 -name "tmp_*" -type d -mtime +1

# Remove orphaned temp files (when ClickHouse is stopped)
find /var/lib/clickhouse/data/ -maxdepth 3 -name "tmp_*" -type d -mtime +1 -exec rm -rf {} +
```

## Automated Cleanup Script

```bash
#!/bin/bash
# Log disk usage before cleanup
BEFORE=$(df -h /var/lib/clickhouse | tail -1 | awk '{print $3}')

# Drop detached parts older than 7 days (by specific part name)
clickhouse-client --query "
SELECT database, table, name
FROM system.detached_parts
WHERE modification_time < now() - INTERVAL 7 DAY
FORMAT TabSeparated
" | while IFS=$'\t' read -r db table part; do
    clickhouse-client --query "SET allow_drop_detached = 1; ALTER TABLE ${db}.${table} DROP DETACHED PART '${part}'"
done

AFTER=$(df -h /var/lib/clickhouse | tail -1 | awk '{print $3}')
echo "Disk usage: before=$BEFORE, after=$AFTER"
```

## Summary

Old ClickHouse data parts accumulate in three forms: inactive (auto-cleaned), detached (requires manual cleanup), and frozen (from backups). Monitor `system.parts` and `system.detached_parts` for accumulation, use `ALTER TABLE DROP DETACHED` to clean up safely, and regularly `UNFREEZE` old backup snapshots. Schedule a weekly cleanup job for detached parts to prevent disk space issues.
