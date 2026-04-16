# How to Use JBOD Storage Configuration in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, JBOD, Storage, Disk Configuration, MergeTree

Description: Learn how to configure JBOD (Just a Bunch of Disks) storage in ClickHouse to distribute data across multiple disks for increased capacity and I/O throughput.

---

## What Is JBOD in ClickHouse

JBOD (Just a Bunch of Disks) in ClickHouse refers to a storage policy where data parts are distributed across multiple independent disks in round-robin or fill-up order. Unlike RAID, ClickHouse manages the distribution directly through its storage policy configuration.

JBOD is useful for:
- Expanding storage capacity beyond a single disk
- Increasing aggregate I/O throughput
- Separating hot and cold data across different disk types

## Configuring Multiple Disks

Define disks in `config.xml` or a separate storage config file:

```xml
<storage_configuration>
    <disks>
        <disk1>
            <path>/mnt/disk1/clickhouse/</path>
        </disk1>
        <disk2>
            <path>/mnt/disk2/clickhouse/</path>
        </disk2>
        <disk3>
            <path>/mnt/disk3/clickhouse/</path>
        </disk3>
    </disks>

    <policies>
        <jbod_policy>
            <volumes>
                <data>
                    <disk>disk1</disk>
                    <disk>disk2</disk>
                    <disk>disk3</disk>
                </data>
            </volumes>
        </jbod_policy>
    </policies>
</storage_configuration>
```

## Creating a Table Using JBOD Policy

```sql
CREATE TABLE events (
    ts          DateTime,
    user_id     UInt64,
    event_type  String,
    payload     String
) ENGINE = MergeTree()
ORDER BY (ts, user_id)
SETTINGS storage_policy = 'jbod_policy';
```

## Understanding Part Distribution

ClickHouse distributes new parts across disks in a volume using round-robin by default. Switch to `least_used` so each new part is written to the disk with the most free space:

```xml
<policies>
    <jbod_policy>
        <volumes>
            <data>
                <disk>disk1</disk>
                <disk>disk2</disk>
                <disk>disk3</disk>
                <load_balancing>least_used</load_balancing>
            </data>
        </volumes>
    </jbod_policy>
</policies>
```

Use `max_data_part_size_bytes` to cap the size of a part on this volume — larger merged parts will be written to the next volume:

```xml
<max_data_part_size_bytes>1073741824</max_data_part_size_bytes>
```

## Tiered Storage - Hot and Cold Volumes

Combine JBOD with tiering to move cold data from NVMe to HDD or S3:

```xml
<policies>
    <tiered_policy>
        <volumes>
            <hot>
                <disk>nvme_disk</disk>
                <max_data_part_size_bytes>1073741824</max_data_part_size_bytes>
            </hot>
            <cold>
                <disk>hdd_disk1</disk>
                <disk>hdd_disk2</disk>
            </cold>
        </volumes>
        <move_factor>0.2</move_factor>
    </tiered_policy>
</policies>
```

## Checking Which Parts Are on Which Disk

```sql
SELECT
    disk_name,
    database,
    table,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
WHERE active = 1
GROUP BY disk_name, database, table
ORDER BY disk_name, total_size DESC;
```

## Moving Parts Between Disks

```sql
-- Move a specific part to a specific disk
ALTER TABLE events MOVE PART 'part_name' TO DISK 'disk2';

-- Move all parts of a partition to a disk
ALTER TABLE events MOVE PARTITION '202603' TO DISK 'disk2';

-- Move all parts to a volume
ALTER TABLE events MOVE PARTITION '202603' TO VOLUME 'cold';
```

## Monitoring Disk Usage

```sql
SELECT
    name AS disk,
    path,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total,
    formatReadableSize(total_space - free_space) AS used,
    round((total_space - free_space) / total_space * 100, 1) AS used_pct
FROM system.disks;
```

## Configuring Disk Reservations

Reserve space on each disk to prevent ClickHouse from completely filling it:

```xml
<disk1>
    <path>/mnt/disk1/clickhouse/</path>
    <keep_free_space_bytes>10737418240</keep_free_space_bytes>  <!-- Keep 10 GB free -->
</disk1>
```

## Replicated Table on JBOD

JBOD storage policies work transparently with replicated tables:

```sql
CREATE TABLE events ON CLUSTER my_cluster (
    ts       DateTime,
    user_id  UInt64
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
ORDER BY (ts, user_id)
SETTINGS storage_policy = 'jbod_policy';
```

## Summary

JBOD storage in ClickHouse distributes data parts across multiple independent disks using storage policies defined in `config.xml`. Configure disks and volumes, assign the policy to tables via `SETTINGS storage_policy`, and use `system.disks` and `system.parts` to monitor disk usage and part placement. Combine JBOD with tiering to automatically move cold data to cheaper storage as it ages.
