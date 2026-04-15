# How to Move Tables Between Disks in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, Disk, ALTER TABLE, Migration

Description: Learn how to move ClickHouse tables, partitions, and data parts between disks or volumes using ALTER TABLE MOVE commands.

---

ClickHouse provides SQL commands to move data between disks, volumes, and storage tiers without downtime. This is useful for manual tiering, disk rebalancing, or migrating data to new hardware.

## Prerequisites

The source and destination disks must both be defined in the ClickHouse storage configuration, and the table must use a storage policy that includes both disks.

## Moving a Partition to a Different Volume

```sql
-- Move a specific partition to the cold volume
ALTER TABLE events MOVE PARTITION '202601' TO VOLUME 'cold';

-- Move to a specific disk
ALTER TABLE events MOVE PARTITION '202601' TO DISK 'hdd';
```

## Moving All Partitions to a Volume

Move all partitions of a table to a target volume:

```sql
-- Get all partition IDs
SELECT DISTINCT partition
FROM system.parts
WHERE table = 'events' AND active = 1
ORDER BY partition;
```

```bash
# Move all partitions programmatically
clickhouse-client --query "
SELECT DISTINCT partition
FROM system.parts
WHERE database = 'production' AND table = 'events' AND active = 1
" | while read partition; do
    echo "Moving partition $partition..."
    clickhouse-client --query "ALTER TABLE production.events MOVE PARTITION '${partition}' TO VOLUME 'cold'"
done
```

## Moving Specific Data Parts

Move an individual part instead of a full partition:

```sql
-- List parts on a specific disk
SELECT name, partition, disk_name, formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE table = 'events' AND disk_name = 'hot_nvme' AND active = 1
ORDER BY bytes_on_disk DESC
LIMIT 20;

-- Move a specific part
ALTER TABLE events MOVE PART 'all_0_100_5' TO DISK 'sata_ssd';
```

## Checking Move Progress

Monitor ongoing moves using the `system.moves` table:

```sql
SELECT
    database,
    table,
    part_name,
    target_disk_name,
    elapsed,
    formatReadableSize(part_size) AS size
FROM system.moves
ORDER BY elapsed DESC;
```

## Changing the Default Storage Policy

To move all future data for a table to a different policy:

```sql
-- Change storage policy (does not move existing data)
ALTER TABLE events MODIFY SETTING storage_policy = 'cold_only';
```

The new policy must include all disks and volumes from the previous policy (with the same names). You can add new disks or volumes, but you cannot remove existing ones.

This affects only new parts. Existing parts stay on their current disks until manually moved or until TTL rules trigger.

## Verifying Data Location After Move

Confirm parts are on the expected disk:

```sql
SELECT
    partition,
    disk_name,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY partition, disk_name
ORDER BY partition, disk_name;
```

## Moving a Table to a New Server

For server-to-server migration, combine FREEZE and rsync:

```bash
# On source server: freeze the table
clickhouse-client --query "ALTER TABLE events FREEZE WITH NAME 'migration_2026'"

# Copy frozen data to new server's detached directory
# The table must already exist on the new server with the same structure
rsync -av /var/lib/clickhouse/shadow/migration_2026/store/<shard>/<table>/ \
    new-server:/var/lib/clickhouse/data/<database>/events/detached/

# On new server: attach each partition
clickhouse-client --query "ALTER TABLE events ATTACH PARTITION '202601'"

# Cleanup freeze on source
clickhouse-client --query "ALTER TABLE events UNFREEZE WITH NAME 'migration_2026'"
```

Note: The frozen data must be copied into the target table's `detached/` directory, not the `shadow/` directory, before running `ATTACH`. You need to attach each partition individually.

## Summary

ClickHouse provides `ALTER TABLE MOVE PARTITION` and `ALTER TABLE MOVE PART` for moving data between disks and volumes. Use partition-level moves for bulk migrations, part-level moves for surgical rebalancing, and monitor progress via `system.moves`. Changing `storage_policy` affects only future writes - use explicit MOVE commands to relocate existing data.
