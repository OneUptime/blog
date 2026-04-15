# How to Use ClickHouse with Multi-Cloud Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Object Storage, Multi-Cloud, S3, Storage

Description: Configure ClickHouse to read and write data across S3, GCS, and Azure Blob Storage simultaneously for flexible multi-cloud data management.

---

ClickHouse's disk abstraction supports S3-compatible, GCS, and Azure Blob Storage backends. This lets you store different tables or partitions on different cloud providers, enabling cost optimization and geographic data placement.

## Configuring Multiple Object Storage Disks

```xml
<storage_configuration>
    <disks>
        <aws_s3>
            <type>s3</type>
            <endpoint>https://s3.us-east-1.amazonaws.com/ch-data-aws/</endpoint>
            <access_key_id>AWS_KEY</access_key_id>
            <secret_access_key>AWS_SECRET</secret_access_key>
        </aws_s3>
        <gcs>
            <type>s3</type>
            <!-- GCS is S3-compatible via the interop endpoint -->
            <endpoint>https://storage.googleapis.com/ch-data-gcp/</endpoint>
            <access_key_id>GCS_HMAC_KEY</access_key_id>
            <secret_access_key>GCS_HMAC_SECRET</secret_access_key>
        </gcs>
        <azure_blob>
            <type>azure_blob_storage</type>
            <storage_account_url>https://myaccount.blob.core.windows.net</storage_account_url>
            <container_name>ch-data-azure</container_name>
            <account_name>myaccount</account_name>
            <account_key>AZURE_KEY</account_key>
        </azure_blob>
    </disks>
    <policies>
        <multi_cloud>
            <volumes>
                <primary><disk>aws_s3</disk></primary>
            </volumes>
        </multi_cloud>
        <gcs_policy>
            <volumes>
                <primary><disk>gcs</disk></primary>
            </volumes>
        </gcs_policy>
    </policies>
</storage_configuration>
```

## Assigning Tables to Specific Clouds

```sql
-- EU data stays on GCS (europe-west1 bucket)
CREATE TABLE events_eu
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (id, ts)
SETTINGS storage_policy = 'gcs_policy';

-- US data on S3
CREATE TABLE events_us
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (id, ts)
SETTINGS storage_policy = 'multi_cloud';
```

## Reading External Data from Multiple Clouds

```sql
-- Read directly from S3 without a permanent table
SELECT count()
FROM s3('https://s3.us-east-1.amazonaws.com/archive/*.parquet', 'AWS_KEY', 'AWS_SECRET', 'Parquet');

-- Read from GCS
SELECT count()
FROM s3('https://storage.googleapis.com/archive/*.parquet', 'GCS_HMAC', 'GCS_SECRET', 'Parquet');
```

## Cost Optimization

- Store hot partitions on the lowest-latency cloud for your users.
- Move cold partitions older than 90 days to the cheapest storage provider using TTL moves.

```sql
ALTER TABLE events MODIFY TTL
    ts + INTERVAL 90 DAY TO DISK 'gcs';
```

## Monitoring

Use [OneUptime](https://oneuptime.com) to track disk write errors and read latency per storage backend. Alert when error rates increase on any single cloud disk.

## Summary

ClickHouse's pluggable disk abstraction makes multi-cloud object storage straightforward. Assign storage policies per table, use TTL to automate cold data migration between clouds, and monitor each backend independently.
