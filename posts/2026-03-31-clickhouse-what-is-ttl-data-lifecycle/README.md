# What Is TTL in ClickHouse and How Data Lifecycle Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TTL, Data Lifecycle, Storage Tiering, MergeTree

Description: Learn what TTL is in ClickHouse, how it automatically deletes or moves data based on age, and how to configure multi-tier storage policies.

---

TTL (Time To Live) in ClickHouse defines rules for what happens to data after a certain age. ClickHouse can automatically delete old rows, move partitions to cheaper storage, or recompress data - all without application-level intervention.

## Row-Level TTL

Row-level TTL deletes individual rows when a time expression becomes true.

```sql
CREATE TABLE events (
  id       UInt64,
  ts       DateTime,
  region   String,
  payload  String
) ENGINE = MergeTree()
ORDER BY (ts, id)
TTL ts + INTERVAL 90 DAY;  -- delete rows older than 90 days
```

TTL is evaluated during background merges. Old rows are removed when the part containing them is merged after the TTL expression becomes true.

## Column-Level TTL

You can expire individual columns rather than entire rows. This keeps the row in the table but replaces the column value with its default.

```sql
CREATE TABLE events (
  id       UInt64,
  ts       DateTime,
  payload  String TTL ts + INTERVAL 30 DAY  -- clear payload after 30 days
) ENGINE = MergeTree()
ORDER BY (ts, id);
```

This is useful for keeping summary data while purging large raw payloads to save disk space.

## Table-Level TTL with Actions

Table-level TTL supports multiple actions beyond DELETE, including moving data to different disks or volumes. When combined with time-aligned expressions, ClickHouse can efficiently manage data lifecycle across storage tiers.

```sql
ALTER TABLE events
MODIFY TTL toStartOfMonth(ts) + INTERVAL 6 MONTH
  DELETE;
```

Or move to a different storage disk:

```sql
ALTER TABLE events
MODIFY TTL
  ts + INTERVAL 30 DAY TO DISK 'warm_ssd',
  ts + INTERVAL 180 DAY TO DISK 'cold_hdd',
  ts + INTERVAL 365 DAY DELETE;
```

## Storage Tiering with MOVE TO DISK

Multi-tier TTL moves data through hot, warm, and cold storage automatically. Define volumes in `config.xml`:

```xml
<storage_configuration>
  <disks>
    <hot_nvme>
      <path>/mnt/nvme/</path>
    </hot_nvme>
    <warm_ssd>
      <path>/mnt/ssd/</path>
    </warm_ssd>
  </disks>
  <policies>
    <tiered>
      <volumes>
        <hot><disk>hot_nvme</disk><max_data_part_size_bytes>1073741824</max_data_part_size_bytes></hot>
        <warm><disk>warm_ssd</disk></warm>
      </volumes>
    </tiered>
  </policies>
</storage_configuration>
```

```sql
CREATE TABLE events (...)
ENGINE = MergeTree()
ORDER BY ts
SETTINGS storage_policy = 'tiered'
TTL ts + INTERVAL 7 DAY TO VOLUME 'warm';
```

## How TTL Is Applied

TTL rules are enforced during background merges. ClickHouse does not immediately delete rows when they expire. To force TTL application:

```sql
-- Force TTL processing on a specific table
ALTER TABLE events MATERIALIZE TTL;
```

Or configure how frequently TTL is checked:

```xml
<!-- config.xml -->
<merge_tree>
  <merge_with_ttl_timeout>86400</merge_with_ttl_timeout>
</merge_tree>
```

## Checking TTL Configuration

```sql
SELECT table, engine_full
FROM system.tables
WHERE database = 'analytics' AND engine_full LIKE '%TTL%';
```

## Summary

ClickHouse TTL provides automatic data lifecycle management at the row, column, or table level. Use row-level TTL for fine-grained expiry, column-level TTL to purge large fields while keeping row metadata, and table-level TTL with `TO DISK` or `TO VOLUME` actions for cost-effective multi-tier storage. TTL runs during background merges and can be forced with `ALTER TABLE ... MATERIALIZE TTL`.
