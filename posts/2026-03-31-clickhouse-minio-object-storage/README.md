# How to Use ClickHouse with MinIO Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MinIO, S3, Object Storage, Data Tiering, Integration

Description: Configure ClickHouse to use MinIO as an S3-compatible object storage backend for data tiering, backups, and direct table access.

---

MinIO is a high-performance, S3-compatible object storage system that can be self-hosted. ClickHouse integrates with MinIO for data tiering, backup storage, and direct table queries via the S3 engine.

## Configure MinIO Access in ClickHouse

Add MinIO credentials in `config.xml`:

```xml
<s3>
    <minio>
        <endpoint>http://minio:9000/</endpoint>
        <access_key_id>minioadmin</access_key_id>
        <secret_access_key>minioadmin</secret_access_key>
    </minio>
</s3>
```

## Query Files on MinIO

Use the S3 table function with the MinIO endpoint:

```sql
SELECT *
FROM s3(
    'http://minio:9000/my-bucket/events/*.parquet',
    'minioadmin',
    'minioadmin',
    'Parquet'
)
LIMIT 100;
```

## Use MinIO as a Cold Storage Tier

Configure a tiered storage policy with MinIO as the cold tier:

```xml
<storage_configuration>
    <disks>
        <hot>
            <path>/var/lib/clickhouse/</path>
        </hot>
        <minio>
            <type>s3</type>
            <endpoint>http://minio:9000/clickhouse-cold/</endpoint>
            <access_key_id>minioadmin</access_key_id>
            <secret_access_key>minioadmin</secret_access_key>
        </minio>
    </disks>
    <policies>
        <hot_cold>
            <volumes>
                <hot>
                    <disk>hot</disk>
                    <max_data_part_size_bytes>5368709120</max_data_part_size_bytes>
                </hot>
                <cold>
                    <disk>minio</disk>
                </cold>
            </volumes>
            <move_factor>0.2</move_factor>
        </hot_cold>
    </policies>
</storage_configuration>
```

Assign the policy to a table:

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time)
SETTINGS storage_policy = 'hot_cold';
```

## Backup to MinIO

Use `clickhouse-backup` to back up to MinIO:

```yaml
# config.yml for clickhouse-backup
s3:
  access_key: minioadmin
  secret_key: minioadmin
  bucket: clickhouse-backups
  endpoint: http://minio:9000
  path: backups/
  region: us-east-1
```

```bash
clickhouse-backup create my-backup
clickhouse-backup upload my-backup
```

## Create an External Table on MinIO

Create a persistent external table on MinIO:

```sql
CREATE TABLE minio_events
ENGINE = S3('http://minio:9000/my-bucket/events/*.parquet', 'minioadmin', 'minioadmin', 'Parquet');
```

## Insert Data to MinIO

Write ClickHouse data directly to MinIO:

```sql
INSERT INTO FUNCTION s3(
    'http://minio:9000/my-bucket/export/events_2025.parquet',
    'minioadmin',
    'minioadmin',
    'Parquet'
)
SELECT * FROM events WHERE toYear(event_time) = 2025;
```

## Summary

MinIO integrates with ClickHouse as a self-hosted S3-compatible backend for data tiering, backups, and external table access. Configure disk policies to automatically move old data to MinIO, reducing local storage costs while keeping data queryable through ClickHouse.
