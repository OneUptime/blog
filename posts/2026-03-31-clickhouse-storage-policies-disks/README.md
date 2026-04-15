# How to Configure ClickHouse Storage Policies with Multiple Disks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Storage, Configuration, Performance, MergeTree

Description: Learn how to configure ClickHouse storage policies with multiple disks to implement tiered storage, separate hot and cold data, and use S3-compatible object storage.

---

ClickHouse storage policies allow you to define how data is distributed across multiple storage devices. You can tier data from fast NVMe drives to slower HDDs as it ages, store cold data directly in S3-compatible object storage, or spread data across multiple volumes for capacity or I/O throughput reasons.

## Core Concepts

- **Disk** - a named storage location with a path (local filesystem) or endpoint (S3, HDFS, etc.).
- **Volume** - an ordered list of disks within a storage policy. Data is written to one volume at a time.
- **Storage Policy** - a named sequence of volumes. Data moves through volumes in order as it ages or as space is consumed.

## Defining Disks

Disk definitions go in `/etc/clickhouse-server/config.xml` or a drop-in file in `/etc/clickhouse-server/config.d/`:

```xml
<clickhouse>
    <storage_configuration>
        <disks>

            <!-- Default disk (always exists, no need to declare unless overriding) -->
            <default>
                <path>/var/lib/clickhouse/</path>
            </default>

            <!-- Fast NVMe disk for hot data -->
            <hot_nvme>
                <path>/mnt/nvme/clickhouse/</path>
            </hot_nvme>

            <!-- Slower HDD for warm data -->
            <warm_hdd>
                <path>/mnt/hdd/clickhouse/</path>
            </warm_hdd>

            <!-- S3-compatible cold storage -->
            <cold_s3>
                <type>s3</type>
                <endpoint>https://s3.us-east-1.amazonaws.com/my-clickhouse-bucket/data/</endpoint>
                <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
                <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
                <!-- Optional: reduce request costs by caching S3 data locally -->
                <cache_enabled>true</cache_enabled>
                <data_cache_max_size>10737418240</data_cache_max_size>  <!-- 10 GiB -->
                <cache_path>/var/lib/clickhouse/s3cache/</cache_path>
            </cold_s3>

        </disks>
    </storage_configuration>
</clickhouse>
```

## Defining Storage Policies

After defining disks, create policies that group disks into volumes:

```xml
<clickhouse>
    <storage_configuration>
        <disks>
            <hot_nvme><path>/mnt/nvme/clickhouse/</path></hot_nvme>
            <warm_hdd><path>/mnt/hdd/clickhouse/</path></warm_hdd>
            <cold_s3>
                <type>s3</type>
                <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/data/</endpoint>
                <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
                <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
            </cold_s3>
        </disks>

        <policies>

            <!-- Three-tier: NVMe -> HDD -> S3 -->
            <tiered>
                <volumes>
                    <hot>
                        <disk>hot_nvme</disk>
                        <!-- Parts larger than 10 GiB are placed on the next volume -->
                        <max_data_part_size_bytes>10737418240</max_data_part_size_bytes>
                    </hot>
                    <warm>
                        <disk>warm_hdd</disk>
                        <max_data_part_size_bytes>107374182400</max_data_part_size_bytes>
                    </warm>
                    <cold>
                        <disk>cold_s3</disk>
                    </cold>
                </volumes>
                <!-- Move parts to next volume when free space falls below this ratio (10%) -->
                <move_factor>0.1</move_factor>
            </tiered>

            <!-- Simple two-disk policy: spread NVMe and HDD at same tier -->
            <spread_nvme_hdd>
                <volumes>
                    <main>
                        <disk>hot_nvme</disk>
                        <disk>warm_hdd</disk>
                    </main>
                </volumes>
            </spread_nvme_hdd>

        </policies>
    </storage_configuration>
</clickhouse>
```

## Assigning a Storage Policy to a Table

Specify the policy in the table `SETTINGS` clause:

```sql
CREATE TABLE events
(
    event_date  Date,
    event_time  DateTime,
    user_id     UInt64,
    event_type  LowCardinality(String),
    payload     String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id, event_time)
TTL event_date + INTERVAL 30 DAY TO VOLUME 'warm',
    event_date + INTERVAL 365 DAY TO VOLUME 'cold'
SETTINGS storage_policy = 'tiered';
```

The `TTL ... TO VOLUME` clause automatically moves parts to the named volume when the TTL condition is met.

## TTL with Move-to-Disk Rules

```sql
-- Alternatively move to a named disk rather than a volume
CREATE TABLE logs
(
    log_date    Date,
    log_time    DateTime,
    level       LowCardinality(String),
    message     String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(log_date)
ORDER BY (log_date, log_time)
TTL
    log_date + INTERVAL 7 DAY TO DISK 'warm_hdd',
    log_date + INTERVAL 90 DAY TO DISK 'cold_s3'
SETTINGS storage_policy = 'tiered';
```

## Adding a Storage Policy to an Existing Table

```sql
-- Change the storage policy on an existing table
ALTER TABLE events
    MODIFY SETTING storage_policy = 'tiered';
```

Note: you can only move to a superset policy (one that includes the current disks). Downgrading to a policy without the current disk will fail.

## Checking Which Disk Parts Live On

```sql
-- Parts and their disk locations
SELECT
    partition,
    name,
    disk_name,
    path,
    formatReadableSize(bytes_on_disk) AS size_on_disk,
    rows
FROM system.parts
WHERE
    database = 'default'
    AND table = 'events'
    AND active
ORDER BY partition, disk_name, name;
```

```sql
-- Summary by disk
SELECT
    disk_name,
    count() AS part_count,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
WHERE active
GROUP BY disk_name
ORDER BY sum(bytes_on_disk) DESC;
```

## Available Disk Space per Volume

```sql
SELECT
    policy_name,
    volume_name,
    volume_priority,
    disks,
    formatReadableSize(max_data_part_size) AS max_part_size,
    move_factor
FROM system.storage_policies;
```

```sql
SELECT
    name,
    path,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total,
    formatReadableSize(keep_free_space) AS reserved
FROM system.disks;
```

## Manually Moving Parts Between Disks

```sql
-- Move a specific part to a named disk
ALTER TABLE events
    MOVE PART '20240101_1_10_2' TO DISK 'warm_hdd';

-- Move an entire partition to a named volume
ALTER TABLE events
    MOVE PARTITION '202401' TO VOLUME 'cold';
```

## S3 Disk with Metadata on Local Storage

ClickHouse stores S3 object metadata (which S3 keys correspond to which parts) on the local disk. Ensure the local path for metadata is on a reliable volume:

```xml
<cold_s3>
    <type>s3</type>
    <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/data/</endpoint>
    <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
    <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
    <!-- Metadata stored here; keep on a fast, reliable local disk -->
    <metadata_path>/var/lib/clickhouse/disks/cold_s3/</metadata_path>
</cold_s3>
```

## Configuring Multiple Disks for a Single Volume (JBOD)

When multiple disks are listed under the same volume, ClickHouse writes new parts in round-robin order across all disks in that volume:

```xml
<policies>
    <jbod_policy>
        <volumes>
            <data>
                <disk>disk_a</disk>
                <disk>disk_b</disk>
                <disk>disk_c</disk>
                <disk>disk_d</disk>
            </data>
        </volumes>
    </jbod_policy>
</policies>
```

This is a JBOD (Just a Bunch of Disks) configuration. It increases total I/O bandwidth without RAID overhead.

## Conclusion

ClickHouse storage policies give you fine-grained control over where data lives at every stage of its lifecycle. Define named disks for each physical or cloud storage tier, group them into volumes within a storage policy, and assign the policy to tables. Use TTL rules to automate data movement as partitions age. Monitor disk utilization via `system.disks` and part placement via `system.parts` to confirm data is flowing through tiers as expected.
