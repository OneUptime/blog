# How to Use Hot and Cold Storage Tiers in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, Database, Performance, Configuration

Description: Learn how to configure hot and cold storage tiers in ClickHouse so recent data lives on fast disks and older data moves automatically to cheaper storage.

---

Analytical databases accumulate data continuously. Recent data is queried frequently while data older than a few weeks or months is accessed rarely. Keeping all data on expensive fast storage is wasteful. ClickHouse's tiered storage lets you define hot and cold volumes so that ClickHouse automatically migrates parts to the appropriate tier based on age or size.

## Understanding Hot and Cold Tiers

A hot tier is typically a fast local disk - SSD or NVMe - used for recent, frequently queried data. A cold tier is slower, cheaper storage such as large HDDs or object storage (S3, GCS) used for archival data.

ClickHouse uses storage policies to express this intent. When a part ages beyond a threshold defined in the policy, ClickHouse's background moves thread pool migrates it to the next volume in the policy.

## Configuration

Create `/etc/clickhouse-server/config.d/tiered_storage.xml`:

```xml
<clickhouse>
  <storage_configuration>
    <disks>
      <hot_disk>
        <path>/mnt/ssd/clickhouse/</path>
      </hot_disk>
      <cold_disk>
        <path>/mnt/hdd/clickhouse/</path>
      </cold_disk>
    </disks>

    <policies>
      <hot_cold>
        <volumes>
          <hot>
            <disk>hot_disk</disk>
            <!-- Parts larger than 5 GiB are written to the next volume -->
            <max_data_part_size_bytes>5368709120</max_data_part_size_bytes>
          </hot>
          <cold>
            <disk>cold_disk</disk>
          </cold>
        </volumes>
        <!-- Move parts to cold after hot volume reaches 80% capacity -->
        <move_factor>0.2</move_factor>
      </hot_cold>
    </policies>
  </storage_configuration>
</clickhouse>
```

The `move_factor` value (0 to 1) controls the free-space threshold at which ClickHouse starts moving parts to the next volume. A value of `0.2` means ClickHouse starts moving when only 20% of the hot volume remains free.

## Creating a Table with Hot/Cold Policy

```sql
CREATE TABLE access_logs
(
    log_id      UInt64,
    host        String,
    path        String,
    status_code UInt16,
    bytes_sent  UInt32,
    ts          DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, host)
SETTINGS storage_policy = 'hot_cold';
```

## Adding TTL-Based Tier Migration

For time-based movement (independent of disk fill level), combine a TTL rule with the storage policy:

```sql
CREATE TABLE access_logs
(
    log_id      UInt64,
    host        String,
    path        String,
    status_code UInt16,
    bytes_sent  UInt32,
    ts          DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, host)
TTL ts + INTERVAL 30 DAY TO VOLUME 'cold'
SETTINGS storage_policy = 'hot_cold';
```

Parts for data older than 30 days are moved to the `cold` volume automatically. The TTL evaluation runs in the background and does not block inserts or queries.

## Querying Across Both Tiers

ClickHouse queries both hot and cold volumes transparently. A query touching data on both tiers will read from both disks:

```sql
-- This query spans hot and cold data automatically
SELECT
    toStartOfMonth(ts) AS month,
    count()             AS requests,
    sum(bytes_sent)     AS total_bytes
FROM access_logs
WHERE ts >= today() - 180
GROUP BY month
ORDER BY month;
```

To understand which parts are on which disk:

```sql
SELECT
    name         AS part_name,
    disk_name,
    modification_time,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE active = 1
  AND table = 'access_logs'
  AND database = currentDatabase()
ORDER BY modification_time DESC;
```

## Checking Tier Distribution

```sql
SELECT
    disk_name,
    count()                                        AS parts,
    formatReadableSize(sum(bytes_on_disk))         AS total_size,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed
FROM system.parts
WHERE active = 1
  AND table = 'access_logs'
  AND database = currentDatabase()
GROUP BY disk_name;
```

## Monitoring Free Space on Each Tier

```sql
SELECT
    name                                        AS disk,
    formatReadableSize(free_space)              AS free,
    formatReadableSize(total_space)             AS total,
    round((1 - free_space / total_space) * 100, 1) AS used_pct
FROM system.disks
ORDER BY name;
```

## Forcing a Manual Tier Move

Move a specific partition to cold storage immediately:

```sql
ALTER TABLE access_logs
    MOVE PARTITION '202401' TO VOLUME 'cold';
```

Move a specific part:

```sql
ALTER TABLE access_logs
    MOVE PART '202401_1_10_2' TO DISK 'cold_disk';
```

## Preparing the Filesystem

```bash
mkdir -p /mnt/ssd/clickhouse
mkdir -p /mnt/hdd/clickhouse
chown -R clickhouse:clickhouse /mnt/ssd/clickhouse
chown -R clickhouse:clickhouse /mnt/hdd/clickhouse
```

## Summary

ClickHouse tiered storage lets you separate hot frequently accessed data from cold archival data by configuring hot and cold volumes in a storage policy. Use `move_factor` for capacity-driven migration and TTL rules for time-driven migration. Both approaches work simultaneously and ClickHouse queries both tiers transparently, so application code requires no changes.
