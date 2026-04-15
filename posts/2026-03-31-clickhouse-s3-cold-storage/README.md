# How to Use S3 as Cold Storage in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, S3, Cold Storage, Storage, Tiering

Description: Learn how to configure Amazon S3 as a cold storage tier in ClickHouse to store historical data cheaply while keeping recent data on fast local disks.

---

S3 cold storage in ClickHouse lets you store historical data at S3 pricing (~$0.023/GB/month) versus local SSD ($0.10-0.30/GB/month). ClickHouse reads S3 data transparently when needed, making it invisible to applications.

## S3 Disk Configuration

Configure S3 as a disk in `config.d/s3-storage.xml`:

```xml
<clickhouse>
    <storage_configuration>
        <disks>
            <local_ssd>
                <type>local</type>
                <path>/data/ssd/clickhouse/</path>
            </local_ssd>
            <s3_cold>
                <type>s3</type>
                <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/cold/</endpoint>
                <access_key_id>ACCESS_KEY_ID</access_key_id>
                <secret_access_key>SECRET_ACCESS_KEY</secret_access_key>
                <region>us-east-1</region>
                <use_environment_credentials>false</use_environment_credentials>
                <connect_timeout_ms>10000</connect_timeout_ms>
                <request_timeout_ms>60000</request_timeout_ms>
                <max_connections>100</max_connections>
            </s3_cold>
        </disks>
    </storage_configuration>
</clickhouse>
```

## Using IAM Roles Instead of Access Keys

For EC2 instances with an IAM role:

```xml
<s3_cold>
    <type>s3</type>
    <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/cold/</endpoint>
    <use_environment_credentials>true</use_environment_credentials>
</s3_cold>
```

## Creating a Local+S3 Storage Policy

```xml
<policies>
    <local_to_s3>
        <volumes>
            <hot>
                <disk>local_ssd</disk>
            </hot>
            <cold>
                <disk>s3_cold</disk>
            </cold>
        </volumes>
        <move_factor>0.1</move_factor>
    </local_to_s3>
</policies>
```

## Creating a Table with S3 Cold Storage

```sql
CREATE TABLE events
(
    event_time DateTime,
    user_id UInt64,
    event_type String,
    data String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id)
TTL event_time + INTERVAL 30 DAY TO VOLUME 'cold'
SETTINGS storage_policy = 'local_to_s3';
```

Data on local SSD for 30 days, then migrates to S3 automatically.

## Optimizing S3 Read Performance

Configure a local read-through cache to reduce latency on repeated accesses. Define a separate `cache` disk that wraps the S3 disk:

```xml
<disks>
    <s3_cold>
        <type>s3</type>
        <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/cold/</endpoint>
        <access_key_id>ACCESS_KEY_ID</access_key_id>
        <secret_access_key>SECRET_ACCESS_KEY</secret_access_key>
    </s3_cold>
    <s3_cache>
        <type>cache</type>
        <disk>s3_cold</disk>
        <path>/data/s3_cache/</path>
        <max_size>107374182400</max_size>
    </s3_cache>
</disks>
```

This creates a 100GB local disk cache for recently accessed S3 objects. Use `s3_cache` instead of `s3_cold` in your storage policy's cold volume to enable caching.

## Checking S3 Data Placement

```sql
SELECT
    partition,
    disk_name,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY partition, disk_name
ORDER BY partition DESC;
```

## Cost Estimation

Calculate S3 storage cost for your data:

```sql
SELECT
    formatReadableSize(sum(bytes_on_disk)) AS s3_data_size,
    round(sum(bytes_on_disk) / 1e9, 2) AS gb,
    round(sum(bytes_on_disk) / 1e9 * 0.023, 2) AS monthly_cost_usd
FROM system.parts
WHERE
    active = 1
    AND disk_name = 's3_cold'
    AND table = 'events';
```

## Summary

S3 cold storage in ClickHouse uses the S3 disk type to store data in an S3 bucket transparently. Configure a local-to-S3 storage policy with TTL rules to automatically tier data after a retention period. Use IAM roles for authentication in AWS, enable S3 read caching for frequently accessed cold data, and query S3 costs via `system.parts` to validate your storage savings.
