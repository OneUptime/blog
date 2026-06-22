# How to Archive Old Data from ClickHouse to S3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, S3, Archive, Data Lifecycle, Cold Storage, Cost Optimization

Description: A comprehensive guide to archiving old ClickHouse data to S3 for cost-effective long-term storage while maintaining query capability.

---

Archiving data to S3 reduces storage costs while preserving data for compliance and historical analysis. This guide covers archive strategies and implementation.

## S3 Archive Configuration

### Configure S3 Disk

```xml
<!-- config.d/s3_archive.xml -->
<clickhouse>
    <storage_configuration>
        <disks>
            <s3_archive>
                <type>s3</type>
                <endpoint>https://archive-bucket.s3.amazonaws.com/clickhouse/</endpoint>
                <access_key_id>xxx</access_key_id>
                <secret_access_key>xxx</secret_access_key>
                <metadata_path>/var/lib/clickhouse/disks/s3_archive/</metadata_path>
            </s3_archive>
            <s3_archive_cache>
                <type>cache</type>
                <disk>s3_archive</disk>
                <path>/var/lib/clickhouse/disks/s3_cache/</path>
                <max_size>10Gi</max_size>
            </s3_archive_cache>
        </disks>
        <policies>
            <default_with_s3>
                <volumes>
                    <hot>
                        <disk>default</disk>
                    </hot>
                    <cold>
                        <disk>s3_archive_cache</disk>
                    </cold>
                </volumes>
            </default_with_s3>
        </policies>
    </storage_configuration>
</clickhouse>
```

## Archive Strategies

### Strategy 1: TTL to S3

```sql
CREATE TABLE events (
    timestamp DateTime,
    data String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY timestamp
TTL timestamp + INTERVAL 30 DAY TO DISK 's3_archive_cache'
SETTINGS storage_policy = 'default_with_s3';
```

### Strategy 2: Export and Drop

```sql
-- Export partition to S3
INSERT INTO FUNCTION s3(
    'https://bucket.s3.amazonaws.com/archive/events/2024-01/events_202401.parquet',
    'access_key', 'secret_key',
    'Parquet',
    'timestamp DateTime, data String'
)
SELECT * FROM events
WHERE toYYYYMM(timestamp) = 202401;

-- Track what was archived
INSERT INTO archive_manifest (
    table_name,
    partition,
    row_count,
    size_bytes,
    archived_at,
    s3_location,
    retention_until
)
SELECT
    'events' AS table_name,
    '202401' AS partition,
    count() AS row_count,
    0 AS size_bytes,
    now() AS archived_at,
    's3://bucket/archive/events/2024-01/events_202401.parquet' AS s3_location,
    toDate('2031-01-01') AS retention_until
FROM events
WHERE toYYYYMM(timestamp) = 202401;

-- Drop the partition
ALTER TABLE events DROP PARTITION '202401';
```

### Strategy 3: Backup to S3

```bash
# Using clickhouse-backup

clickhouse-backup create --tables default.events 2024-01-archive

# Upload to S3
clickhouse-backup upload 2024-01-archive
```

## Querying Archived Data

```sql
-- Query S3 directly when needed
SELECT count()
FROM s3(
    'https://bucket.s3.amazonaws.com/archive/events/2024-01/*.parquet',
    'Parquet'
);

-- Create external table for regular access
CREATE TABLE events_archive_2024_01
(
    timestamp DateTime,
    data String
)
ENGINE = S3(
    'https://bucket.s3.amazonaws.com/archive/events/2024-01/*.parquet',
    'Parquet'
);

-- Union current and archived data
SELECT * FROM events
WHERE timestamp >= '2024-02-01'
UNION ALL
SELECT * FROM events_archive_2024_01;
```

## Archive Manifest

```sql
CREATE TABLE archive_manifest (
    table_name String,
    partition String,
    row_count UInt64,
    size_bytes UInt64,
    archived_at DateTime,
    s3_location String,
    retention_until Date
) ENGINE = MergeTree()
ORDER BY (table_name, archived_at);
```

## Conclusion

Archiving to S3 provides:

1. **Cost savings** - S3 storage is 10-20x cheaper than SSD
2. **Query capability** - Data remains queryable via S3 functions
3. **Compliance** - Long-term retention without high costs
4. **Flexibility** - Multiple archive strategies available

Choose the archive strategy that best fits your access patterns and retention requirements.
