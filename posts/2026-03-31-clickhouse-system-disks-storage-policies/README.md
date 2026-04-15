# How to Use system.disks and system.storage_policies in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.disks, system.storage_policies, Storage, Tiered Storage, Monitoring

Description: Monitor disk space, available capacity, and storage policy tiers using system.disks and system.storage_policies in ClickHouse.

---

ClickHouse supports tiered storage with multiple disks and storage policies that control where data lives. The `system.disks` and `system.storage_policies` tables let you inspect disk capacities, free space, and how policies are configured across your cluster.

## system.disks

`system.disks` lists all configured disks on the ClickHouse server.

```sql
SELECT
    name,
    path,
    type,
    formatReadableSize(free_space)    AS free,
    formatReadableSize(total_space)   AS total,
    formatReadableSize(keep_free_space) AS keep_free,
    round((1 - free_space / total_space) * 100, 1) AS used_pct
FROM system.disks
ORDER BY used_pct DESC;
```

## Checking Disk Usage Trends

Identify disks approaching capacity:

```sql
SELECT
    name,
    formatReadableSize(total_space - free_space) AS used,
    formatReadableSize(free_space)               AS available,
    round((1 - free_space / total_space) * 100, 1) AS used_pct
FROM system.disks
WHERE round((1 - free_space / total_space) * 100, 1) > 70
ORDER BY used_pct DESC;
```

Alert when `used_pct > 80` to avoid ClickHouse write failures.

## system.storage_policies

`system.storage_policies` lists all configured storage policies and their volume tiers.

```sql
SELECT
    policy_name,
    volume_name,
    volume_priority,
    disks,
    formatReadableSize(max_data_part_size) AS max_part_size,
    move_factor
FROM system.storage_policies
ORDER BY policy_name, volume_priority;
```

## Understanding Policy Tiers

A typical hot/warm/cold policy might look like:

```sql
SELECT
    policy_name,
    volume_name,
    disks,
    move_factor
FROM system.storage_policies
WHERE policy_name = 'hot_to_cold'
ORDER BY volume_priority;
```

This shows volumes in priority order - data moves from `hot` (fast NVMe) to `warm` (HDD) to `cold` (S3) as it ages.

## Finding Tables Using Each Policy

```sql
SELECT
    database,
    name AS table_name,
    storage_policy
FROM system.tables
WHERE engine LIKE '%MergeTree%'
  AND storage_policy != 'default'
ORDER BY database, name;
```

## Checking Which Disk Each Part Lives On

```sql
SELECT
    disk_name,
    count()                                     AS part_count,
    formatReadableSize(sum(bytes_on_disk))       AS size
FROM system.parts
WHERE database = 'mydb'
  AND table    = 'events'
  AND active   = 1
GROUP BY disk_name
ORDER BY disk_name;
```

## Triggering Data Movement

If data needs to move between tiers manually:

```sql
ALTER TABLE mydb.events MOVE PARTITION '2024-01' TO VOLUME 'cold';
```

Or move a specific part:

```sql
ALTER TABLE mydb.events MOVE PART '20240101_1_10_2' TO DISK 's3_disk';
```

## Summary

`system.disks` and `system.storage_policies` are essential for managing tiered storage in ClickHouse. Monitor disk utilization to prevent capacity issues, inspect policy tiers to understand data placement rules, and use `system.parts` with `disk_name` to verify that data has been tiered correctly.
