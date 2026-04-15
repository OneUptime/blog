# How to Configure ClickHouse S3 Disk Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Configuration, S3, ObjectStorage, Tiering

Description: Learn how to configure ClickHouse's S3 disk to store data parts directly in S3-compatible object storage for scalable cold or primary storage.

---

ClickHouse can use S3-compatible object storage as a disk type, allowing you to store data parts directly in S3 buckets. This enables nearly unlimited storage capacity for cold data, disaster recovery copies, or even primary storage in cloud deployments. The S3 disk integrates with the storage policy and volume system, so it works alongside local disks for tiered storage.

## S3 Disk Configuration

```xml
<!-- /etc/clickhouse-server/config.d/s3-disk.xml -->
<clickhouse>
    <storage_configuration>
        <disks>
            <s3_cold>
                <type>s3</type>
                <endpoint>https://s3.us-east-1.amazonaws.com/my-clickhouse-bucket/data/</endpoint>
                <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
                <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
                <region>us-east-1</region>
                <metadata_path>/var/lib/clickhouse/disks/s3_cold/</metadata_path>
            </s3_cold>
            <!-- Local cache wrapping s3_cold to speed up reads -->
            <s3_cold_cache>
                <type>cache</type>
                <disk>s3_cold</disk>
                <path>/var/lib/clickhouse/disks/s3_cold_cache/</path>
                <max_size>10Gi</max_size>
            </s3_cold_cache>
        </disks>
    </storage_configuration>
</clickhouse>
```

## Using IAM Role Instead of Static Credentials

For EC2 instances with an IAM role, omit the access key and secret:

```xml
<s3_cold>
    <type>s3</type>
    <endpoint>https://s3.us-east-1.amazonaws.com/my-clickhouse-bucket/data/</endpoint>
    <use_environment_credentials>true</use_environment_credentials>
    <metadata_path>/var/lib/clickhouse/disks/s3_cold/</metadata_path>
</s3_cold>
```

## S3-Compatible Storage (MinIO, GCS, etc.)

For MinIO or other S3-compatible providers:

```xml
<s3_minio>
    <type>s3</type>
    <endpoint>http://minio.internal:9000/clickhouse-bucket/</endpoint>
    <access_key_id>minioadmin</access_key_id>
    <secret_access_key>minioadmin</secret_access_key>
    <!-- Required for MinIO - use path-style URLs -->
    <use_path_style_url>true</use_path_style_url>
    <metadata_path>/var/lib/clickhouse/disks/s3_minio/</metadata_path>
</s3_minio>
```

For Google Cloud Storage:

```xml
<gcs_cold>
    <type>s3</type>
    <endpoint>https://storage.googleapis.com/my-gcs-bucket/</endpoint>
    <access_key_id>HMAC_KEY</access_key_id>
    <secret_access_key>HMAC_SECRET</secret_access_key>
    <metadata_path>/var/lib/clickhouse/disks/gcs_cold/</metadata_path>
</gcs_cold>
```

## S3 Disk in a Tiered Storage Policy

```xml
<clickhouse>
    <storage_configuration>
        <disks>
            <local_nvme>
                <path>/mnt/nvme/clickhouse/</path>
            </local_nvme>
            <s3_cold>
                <type>s3</type>
                <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/data/</endpoint>
                <use_environment_credentials>true</use_environment_credentials>
                <metadata_path>/var/lib/clickhouse/disks/s3/</metadata_path>
            </s3_cold>
            <s3_cold_cache>
                <type>cache</type>
                <disk>s3_cold</disk>
                <path>/var/lib/clickhouse/disks/s3_cache/</path>
                <max_size>20Gi</max_size>
            </s3_cold_cache>
        </disks>

        <policies>
            <tiered>
                <volumes>
                    <hot>
                        <disk>local_nvme</disk>
                    </hot>
                    <cold>
                        <disk>s3_cold_cache</disk>
                    </cold>
                </volumes>
                <move_factor>0.1</move_factor>
            </tiered>
        </policies>
    </storage_configuration>
</clickhouse>
```

## Applying the Policy to a Table

```sql
CREATE TABLE events
(
    ts      DateTime,
    user_id UInt64,
    data    String
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, user_id)
TTL ts + INTERVAL 90 DAY TO VOLUME 'cold'
SETTINGS storage_policy = 'tiered';
```

## Storage Architecture

```mermaid
graph LR
    A[New data parts] --> B[Hot volume - local NVMe]
    B -- TTL or 90% full --> C[Cold volume - S3]
    D[Query execution] --> E{Part location?}
    E -- Local --> F[Read from NVMe - fast]
    E -- S3 --> G{Cache hit?}
    G -- Yes --> H[Read from local cache]
    G -- No --> I[Fetch from S3 - slower]
    I --> H
```

## S3 Performance Tuning

```xml
<s3_cold>
    <type>s3</type>
    <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/data/</endpoint>

    <!-- Maximum size for a single-part (non-multipart) upload -->
    <max_single_part_upload_size>33554432</max_single_part_upload_size>
    <max_single_read_retries>4</max_single_read_retries>

    <!-- Multipart upload part sizing -->
    <min_upload_part_size>16777216</min_upload_part_size>
    <upload_part_size_multiply_factor>2</upload_part_size_multiply_factor>

    <!-- Thread pool for S3 operations -->
    <thread_pool_size>16</thread_pool_size>
</s3_cold>
```

## Monitoring S3 Disk Usage

```sql
SELECT
    name,
    type,
    path,
    formatReadableSize(free_space) AS free,
    formatReadableSize(total_space) AS total
FROM system.disks
WHERE type = 's3';
```

```sql
-- Parts on S3
SELECT
    table,
    disk_name,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active AND disk_name = 's3_cold'
GROUP BY table, disk_name;
```

## Summary

Configure an S3 disk by setting `type` to `s3` and providing your bucket endpoint and credentials in `storage_configuration`. Add a separate `cache` disk wrapping the S3 disk to reduce read latency for warm data. Use IAM roles or environment credentials in cloud deployments instead of static keys. Combine the S3 disk with a local NVMe disk in a tiered policy and use TTL rules to automate cold data movement.
