# How to Move Data Between Disks in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, Database, Administration, Configuration

Description: Learn how to move ClickHouse data parts and partitions between disks manually and automatically using ALTER TABLE, TTL rules, and storage policies.

---

ClickHouse stores table data as immutable parts on disk. Once written, a part stays on its original disk unless explicitly moved or rewritten. Understanding how to move parts between disks is essential for managing storage tiers, recovering from disk pressure, and migrating data to new hardware.

## Two Ways to Move Data

ClickHouse supports two movement mechanisms:

1. **Manual movement** using `ALTER TABLE ... MOVE` commands
2. **Automatic movement** through TTL rules and storage policy `move_factor`

Both mechanisms work at the part or partition granularity and leave data fully queryable during the move.

## Prerequisites: Multiple Disks in a Policy

Before moving data, both the source and destination disks must be part of the table's storage policy. Configure disks and a policy in `/etc/clickhouse-server/config.d/storage.xml`:

```xml
<clickhouse>
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
      <two_tier>
        <volumes>
          <fast>
            <disk>ssd</disk>
          </fast>
          <slow>
            <disk>hdd</disk>
          </slow>
        </volumes>
      </two_tier>
    </policies>
  </storage_configuration>
</clickhouse>
```

Create a table using this policy:

```sql
CREATE TABLE metrics
(
    metric_id UInt64,
    name      LowCardinality(String),
    value     Float64,
    ts        DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, metric_id)
SETTINGS storage_policy = 'two_tier';
```

## Moving a Single Part

Find the part names to move:

```sql
SELECT name, disk_name, formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE active = 1
  AND table = 'metrics'
  AND database = currentDatabase()
ORDER BY modification_time;
```

Move one specific part to a different disk:

```sql
ALTER TABLE metrics
    MOVE PART '202401_1_1_0' TO DISK 'hdd';
```

Move it to a named volume instead of specifying the disk directly:

```sql
ALTER TABLE metrics
    MOVE PART '202401_1_1_0' TO VOLUME 'slow';
```

## Moving an Entire Partition

Move all parts of a monthly partition to the slower disk:

```sql
ALTER TABLE metrics
    MOVE PARTITION '202401' TO DISK 'hdd';

-- Or by volume name
ALTER TABLE metrics
    MOVE PARTITION '202401' TO VOLUME 'slow';
```

Moving a partition is equivalent to moving every active part in that partition. ClickHouse performs the moves in the background and the partition remains queryable throughout.

## Automating Movement with TTL

Add a TTL clause to move data automatically based on age:

```sql
ALTER TABLE metrics
    MODIFY TTL ts + INTERVAL 7 DAY TO VOLUME 'slow';
```

To set TTL during table creation:

```sql
CREATE TABLE metrics
(
    metric_id UInt64,
    name      LowCardinality(String),
    value     Float64,
    ts        DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, metric_id)
TTL ts + INTERVAL 7 DAY TO VOLUME 'slow'
SETTINGS storage_policy = 'two_tier';
```

TTL evaluation runs in background merge threads. To force immediate TTL processing:

```sql
OPTIMIZE TABLE metrics FINAL;
```

Or trigger TTL moves without a full merge:

```sql
ALTER TABLE metrics MATERIALIZE TTL;
```

## Automating Movement with move_factor

Set `move_factor` in the policy to trigger automatic moves when disk fill crosses a threshold:

```xml
<two_tier>
  <volumes>
    <fast>
      <disk>ssd</disk>
    </fast>
    <slow>
      <disk>hdd</disk>
    </slow>
  </volumes>
  <move_factor>0.1</move_factor>
</two_tier>
```

When only 10% of the `ssd` disk remains free, ClickHouse begins moving the largest parts to `hdd`.

## Verifying Part Locations After a Move

```sql
SELECT
    name            AS part,
    disk_name,
    modification_time,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE active = 1
  AND table = 'metrics'
  AND database = currentDatabase()
ORDER BY modification_time;
```

Check distribution by disk:

```sql
SELECT
    disk_name,
    count()                                AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
WHERE active = 1
  AND table = 'metrics'
  AND database = currentDatabase()
GROUP BY disk_name;
```

## What Happens During a Move

ClickHouse copies the part to the destination disk. Once the copy is confirmed, the original part is removed. The move is atomic from the query engine's perspective - queries always see either the old location or the new location, never an inconsistent state.

## Moving Data to a New Policy

If you need to migrate a table to an entirely new storage policy (for example, after replacing hardware), update the policy first, then explicitly move partitions. The new policy must contain all disks and volumes from the old policy with the same names.

```sql
-- Update storage policy (new policy must include all old disks/volumes)
ALTER TABLE metrics
    MODIFY SETTING storage_policy = 'new_policy';

-- Move each partition
ALTER TABLE metrics MOVE PARTITION '202401' TO VOLUME 'new_volume';
ALTER TABLE metrics MOVE PARTITION '202402' TO VOLUME 'new_volume';
```

## Summary

ClickHouse provides `ALTER TABLE MOVE PART` and `ALTER TABLE MOVE PARTITION` for manual data movement between disks. For automation, use TTL rules to move data based on age or `move_factor` to move based on disk fill level. Both manual and automatic moves are transparent to queries. Always verify part locations using `system.parts` before and after moves to confirm expected outcomes.
