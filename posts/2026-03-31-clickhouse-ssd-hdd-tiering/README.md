# How to Configure SSD and HDD Tiering in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, SSD, HDD, Tiering

Description: Learn how to configure ClickHouse to store hot data on SSD and automatically move older data to HDD using storage policies and TTL rules.

---

SSD/HDD tiering in ClickHouse puts recent, frequently accessed data on fast SSD and moves older data to cheaper HDD automatically. This reduces storage costs significantly while keeping query performance high for recent data.

## Storage Architecture

A typical SSD/HDD tiered setup stores:
- **SSD** - last 30-60 days of data, frequently queried
- **HDD** - historical data, occasionally queried or for compliance

## Configuring SSD and HDD Disks

Add both disk types to `config.d/storage.xml`:

```xml
<clickhouse>
    <storage_configuration>
        <disks>
            <ssd>
                <path>/data/ssd/clickhouse/</path>
            </ssd>
            <hdd>
                <path>/data/hdd/clickhouse/</path>
            </hdd>
        </disks>
        <policies>
            <ssd_to_hdd>
                <volumes>
                    <hot>
                        <disk>ssd</disk>
                        <max_data_part_size_bytes>10737418240</max_data_part_size_bytes>
                    </hot>
                    <cold>
                        <disk>hdd</disk>
                    </cold>
                </volumes>
                <move_factor>0.1</move_factor>
            </ssd_to_hdd>
        </policies>
    </storage_configuration>
</clickhouse>
```

## Creating a Table with SSD/HDD Tiering

```sql
CREATE TABLE events
(
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    data String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id)
TTL event_time + INTERVAL 60 DAY TO VOLUME 'cold'
SETTINGS storage_policy = 'ssd_to_hdd';
```

Data stays on SSD for 60 days, then moves to HDD.

## Verifying Tier Placement

Check which disk holds each partition:

```sql
SELECT
    partition,
    disk_name,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    min(min_time) AS oldest,
    max(max_time) AS newest
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY partition, disk_name
ORDER BY partition DESC;
```

## Monitoring Disk Fill Levels

```sql
SELECT
    name AS disk,
    path,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total,
    round((total_space - free_space) / total_space * 100, 1) AS used_pct
FROM system.disks;
```

Alert when SSD usage exceeds 80% - this may indicate TTL moves are not keeping up.

## Triggering Manual Tier Moves

If automatic TTL moves are delayed, trigger them manually:

```sql
-- Force TTL processing
OPTIMIZE TABLE events FINAL;

-- Or trigger moves system-wide
SYSTEM START TTL MERGES;
```

## Query Performance Across Tiers

Queries that span both SSD and HDD partitions work transparently but are slower for HDD data. To make this visible:

```sql
-- Check which partitions will be read by a query
EXPLAIN
SELECT count() FROM events
WHERE event_time >= '2025-01-01' AND event_time < '2025-04-01';
```

For queries that must be fast on historical data, consider using ClickHouse's S3 tier instead of HDD for better throughput via parallel object reads.

## Adjusting TTL Move Period

Change when data moves to HDD:

```sql
ALTER TABLE events
MODIFY TTL event_time + INTERVAL 90 DAY TO VOLUME 'cold';
```

## Summary

SSD/HDD tiering in ClickHouse uses volume-based storage policies and TTL TO VOLUME rules to automatically move data from SSD to HDD as it ages. Configure the `move_factor` to start moves before disks fill up, monitor tier distribution via `system.parts`, and check disk space via `system.disks`. Tiering reduces SSD requirements by 50-80% for time-series workloads with declining access frequency.
