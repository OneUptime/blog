# How to Use S3 as a Storage Backend in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, S3, Storage, Object Storage, Disk, Cost Optimization

Description: Configure Amazon S3 as a ClickHouse storage backend to store data parts on cheap object storage, reducing costs while retaining full SQL query capability.

---

## Introduction

ClickHouse can store data parts directly on Amazon S3 (or any S3-compatible endpoint like MinIO). This offloads capacity from local disks, dramatically reduces per-GB storage costs, and works seamlessly with the MergeTree engine family. ClickHouse reads native MergeTree data part files from S3 on demand and caches hot data locally.

## Architecture

```mermaid
graph LR
    A[ClickHouse Server] -->|read/write parts| B[S3 Bucket]
    A -->|cache| C[Local SSD Cache]
    B --> D[data/*.bin]
    B --> E[data/*.mrk3]
    B --> F[checksums.txt]
```

## Step 1: Create an S3 Bucket

```bash
aws s3 mb s3://my-clickhouse-data --region us-east-1

# Block all public access
aws s3api put-public-access-block \
    --bucket my-clickhouse-data \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

## Step 2: Create an IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::my-clickhouse-data",
        "arn:aws:s3:::my-clickhouse-data/*"
      ]
    }
  ]
}
```

## Step 3: Configure the S3 Disk

Create `/etc/clickhouse-server/config.d/s3_storage.xml`:

```xml
<clickhouse>
  <storage_configuration>
    <disks>
      <s3>
        <type>s3</type>
        <endpoint>https://s3.amazonaws.com/my-clickhouse-data/data/</endpoint>
        <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
        <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
        <region>us-east-1</region>
        <send_metadata>true</send_metadata>
      </s3>

      <!-- Add a local SSD cache in front of S3 -->
      <s3_cache>
        <type>cache</type>
        <disk>s3</disk>
        <path>/var/lib/clickhouse/s3_cache/</path>
        <max_size>100Gi</max_size>
        <cache_on_write_operations>true</cache_on_write_operations>
        <enable_filesystem_query_cache_limit>true</enable_filesystem_query_cache_limit>
      </s3_cache>
    </disks>

    <policies>
      <s3_policy>
        <volumes>
          <main>
            <disk>s3_cache</disk>
          </main>
        </volumes>
      </s3_policy>
    </policies>
  </storage_configuration>
</clickhouse>
```

## Step 4: Create a Table Using S3 Storage

```sql
CREATE TABLE events
(
    event_id   UInt64,
    event_type LowCardinality(String),
    event_time DateTime,
    payload    String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, event_type)
SETTINGS storage_policy = 's3_policy';
```

## Using Instance Profile Instead of Access Keys

For EC2 with an attached IAM role, omit credentials and set:

```xml
<s3>
  <type>s3</type>
  <endpoint>https://s3.amazonaws.com/my-clickhouse-data/data/</endpoint>
  <region>us-east-1</region>
  <use_environment_credentials>true</use_environment_credentials>
</s3>
```

## MinIO Configuration (S3-Compatible)

```xml
<s3_minio>
  <type>s3</type>
  <endpoint>http://minio:9000/clickhouse-bucket/data/</endpoint>
  <access_key_id>minioadmin</access_key_id>
  <secret_access_key>minioadmin</secret_access_key>
  <use_path_style_url>true</use_path_style_url>
</s3_minio>
```

## Verifying Data Is on S3

```sql
SELECT
    disk_name,
    count()               AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY disk_name;
```

```text
disk_name   parts   size
s3_cache    48      14.32 GiB
```

## Monitoring S3 Request Metrics

```sql
-- Current gauges (active connections, threads, etc.)
SELECT
    metric,
    value
FROM system.metrics
WHERE metric LIKE '%S3%';

-- Cumulative counters (requests, bytes, errors, etc.)
SELECT
    event,
    value
FROM system.events
WHERE event LIKE '%S3%';
```

## Summary

Using S3 as a ClickHouse storage backend replaces local disk space with cheap object storage while keeping full SQL query capability. Configure an `s3` disk in `storage_configuration`, optionally wrap it in a `cache` disk for local SSD caching of hot data, group it in a storage policy, and reference that policy in your MergeTree tables. Instance profiles and MinIO are supported alternatives to static access keys.
