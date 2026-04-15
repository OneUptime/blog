# How to Use S3 as a Storage Disk in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, S3, Storage, Database, Cloud, Configuration

Description: Learn how to configure Amazon S3 or S3-compatible object storage as a ClickHouse disk for scalable cold storage and tiered data archival.

---

ClickHouse supports S3 and S3-compatible object storage (MinIO, GCS, Cloudflare R2, and others) as a native disk type. Using S3 as a ClickHouse disk removes physical storage limits from your cluster and is an effective way to implement cold storage tiers at a fraction of the cost of local disks.

## How S3 Disk Works

ClickHouse stores data parts as files. When an S3 disk is configured, ClickHouse writes those files directly to an S3 bucket using the AWS S3 API. Reads transparently fetch from S3. The local filesystem is still used for temporary files and metadata, but all part data lives in the bucket.

## Prerequisites

- A ClickHouse server at version 22.3 or later (S3 disk became production-ready in 22.3)
- An S3 bucket with the ClickHouse server having read/write access
- Network connectivity from the ClickHouse host to the S3 endpoint

## Configuring the S3 Disk

Create `/etc/clickhouse-server/config.d/s3_storage.xml`:

```xml
<clickhouse>
  <storage_configuration>
    <disks>
      <local>
        <path>/var/lib/clickhouse/</path>
      </local>

      <s3_cold>
        <type>s3</type>
        <endpoint>https://s3.us-east-1.amazonaws.com/my-clickhouse-bucket/data/</endpoint>
        <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
        <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
        <region>us-east-1</region>
        <!-- Store S3 metadata locally -->
        <metadata_path>/var/lib/clickhouse/disks/s3_cold/</metadata_path>
      </s3_cold>

      <!-- Local cache wrapping the S3 disk (recommended, requires 22.8+) -->
      <s3_cold_cache>
        <type>cache</type>
        <disk>s3_cold</disk>
        <path>/var/lib/clickhouse/disks/s3_cold_cache/</path>
        <max_size>10Gi</max_size>
      </s3_cold_cache>
    </disks>

    <policies>
      <local_to_s3>
        <volumes>
          <hot>
            <disk>local</disk>
          </hot>
          <cold>
            <disk>s3_cold_cache</disk>
          </cold>
        </volumes>
        <move_factor>0.2</move_factor>
      </local_to_s3>
    </policies>
  </storage_configuration>
</clickhouse>
```

For IAM role-based access (recommended for EC2-hosted ClickHouse), omit `access_key_id` and `secret_access_key` and add `<use_environment_credentials>true</use_environment_credentials>` to the disk definition. ClickHouse will then use the instance metadata service or environment variables for authentication.

## Using S3-Compatible Storage (MinIO)

Replace the endpoint with your MinIO address:

```xml
<s3_minio>
  <type>s3</type>
  <endpoint>http://minio.internal:9000/clickhouse-bucket/data/</endpoint>
  <access_key_id>minioadmin</access_key_id>
  <secret_access_key>minioadmin</secret_access_key>
  <use_path_style_uri>true</use_path_style_uri>
</s3_minio>
```

The `use_path_style_uri` setting is required for MinIO and other non-AWS S3-compatible stores.

## Creating a Table on S3

```sql
CREATE TABLE events
(
    event_id   UInt64,
    user_id    UInt32,
    event_type LowCardinality(String),
    payload    String,
    ts         DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, event_id)
SETTINGS storage_policy = 'local_to_s3';
```

## Combining with TTL for Automatic Tiering

Move data to S3 after 30 days automatically:

```sql
ALTER TABLE events
    MODIFY TTL ts + INTERVAL 30 DAY TO VOLUME 'cold';
```

## Verifying S3 Disk Is Active

```sql
SELECT name, type, path, free_space, total_space
FROM system.disks
WHERE name = 's3_cold';
```

Check which parts live on S3:

```sql
SELECT
    name         AS part,
    disk_name,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE active = 1
  AND table = 'events'
  AND database = currentDatabase()
ORDER BY modification_time;
```

## Performance Tuning

S3 reads are slower than local disk. Tune the following parameters to reduce latency:

```xml
<s3_cold>
  <type>s3</type>
  <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/data/</endpoint>
  <!-- Files above this size use multipart upload (default ~32 MiB) -->
  <max_single_part_upload_size>33554432</max_single_part_upload_size>
  <!-- Retry S3 requests on failure -->
  <retry_attempts>10</retry_attempts>
  <!-- Timeout for S3 requests in milliseconds -->
  <request_timeout_ms>30000</request_timeout_ms>
</s3_cold>

<!-- 20 GiB local read cache wrapping the S3 disk -->
<s3_cold_cache>
  <type>cache</type>
  <disk>s3_cold</disk>
  <path>/var/lib/clickhouse/disks/s3_cache/</path>
  <max_size>20Gi</max_size>
</s3_cold_cache>
```

## Storing Credentials Securely

Instead of embedding credentials in XML, use environment variables or the ClickHouse secrets mechanism:

```xml
<s3_cold>
  <type>s3</type>
  <endpoint>https://s3.us-east-1.amazonaws.com/my-bucket/data/</endpoint>
  <access_key_id from_env="AWS_ACCESS_KEY_ID"/>
  <secret_access_key from_env="AWS_SECRET_ACCESS_KEY"/>
</s3_cold>
```

Set the environment variables in the systemd unit override:

```bash
systemctl edit clickhouse-server
```

```text
[Service]
Environment="AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"
Environment="AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

## Creating Required Local Directories

```bash
mkdir -p /var/lib/clickhouse/disks/s3_cold
mkdir -p /var/lib/clickhouse/disks/s3_cold_cache
chown -R clickhouse:clickhouse /var/lib/clickhouse/disks/
```

## Summary

S3 disk support in ClickHouse makes it straightforward to extend local storage with cheap, scalable object storage. Configure the disk in `storage_configuration`, group it into a cold volume in a storage policy, and apply the policy to any MergeTree table. Combine with TTL rules for fully automatic data tiering. Use local caching to offset S3 read latency for recently moved data.
