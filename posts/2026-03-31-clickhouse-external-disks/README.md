# How to Configure External Disks in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, Disk, Configuration, S3, Object Storage

Description: Learn how to configure external disks in ClickHouse including S3, GCS, and local NFS paths, enabling flexible storage tiering and offloading cold data to cheap object storage.

---

## Introduction

ClickHouse treats storage as an abstraction called a "disk". By default, data lives on the local filesystem (`default` disk). You can add external disks that point to S3, GCS, Azure Blob Storage, or encrypted local paths. External disks are the foundation for storage policies and data tiering.

## Disk Architecture

```mermaid
graph TD
    A[ClickHouse Server] --> B[Storage Policy]
    B --> C[Volume: hot]
    B --> D[Volume: cold]
    C --> E[Disk: local_ssd]
    D --> F[Disk: s3_cold]
    F --> G[Amazon S3]
```

## Types of External Disks

| Disk Type | Description |
|---|---|
| `local` | Default local filesystem |
| `s3` | Amazon S3 or S3-compatible storage |
| `s3_plain` | S3 with plain file names and no local metadata (used for backups) |
| `azure_blob_storage` | Azure Blob Storage |
| `encrypted` | Encrypted local disk |
| `cache` | Cache layer over another disk |

## Configuring an S3 Disk

Add disk definitions to `/etc/clickhouse-server/config.d/storage.xml`:

```xml
<clickhouse>
  <storage_configuration>
    <disks>
      <s3_cold>
        <type>s3</type>
        <endpoint>https://s3.amazonaws.com/my-bucket/clickhouse/</endpoint>
        <access_key_id>AKIAIOSFODNN7EXAMPLE</access_key_id>
        <secret_access_key>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</secret_access_key>
        <region>us-east-1</region>
        <send_metadata>true</send_metadata>
      </s3_cold>
    </disks>
  </storage_configuration>
</clickhouse>
```

## Configuring a Local External Disk

Mount a fast NVMe or network share and register it:

```xml
<disks>
  <fast_ssd>
    <type>local</type>
    <path>/mnt/fast-ssd/clickhouse/</path>
  </fast_ssd>
</disks>
```

## Configuring an Encrypted Disk

Wrap any disk in an encryption layer:

```xml
<disks>
  <local_encrypted>
    <type>encrypted</type>
    <disk>default</disk>
    <path>encrypted/</path>
    <key_hex>00112233445566778899aabbccddeeff</key_hex>
  </local_encrypted>
</disks>
```

## Configuring a Cache Disk

Add an SSD cache in front of a slow S3 disk:

```xml
<disks>
  <s3_cached>
    <type>cache</type>
    <disk>s3_cold</disk>
    <path>/var/lib/clickhouse/cache/s3/</path>
    <max_size>50Gi</max_size>
    <cache_on_write_operations>true</cache_on_write_operations>
  </s3_cached>
</disks>
```

## Verifying Disk Configuration

After reloading ClickHouse, inspect available disks:

```sql
SELECT name, type, path, free_space, total_space
FROM system.disks;
```

```text
name            type    path                            free_space   total_space
default         local   /var/lib/clickhouse/            250000000000 500000000000
s3_cold         s3      https://s3.amazonaws.com/...    0            0
s3_cached       cache   /var/lib/clickhouse/cache/s3/   45000000000  50000000000
```

## Assigning a Table to an External Disk

Use a storage policy (covered in the storage_configuration guide), or assign a disk directly at table creation:

```sql
CREATE TABLE events
(
    event_id    UInt64,
    event_type  String,
    event_time  DateTime
)
ENGINE = MergeTree
ORDER BY (event_time, event_type)
SETTINGS storage_policy = 'hot_to_cold';
```

## Moving Parts to an External Disk Manually

```sql
ALTER TABLE events MOVE PARTITION '2023-01' TO DISK 's3_cold';
```

## Checking Part Locations

```sql
SELECT
    partition,
    name,
    disk_name,
    path,
    bytes_on_disk
FROM system.parts
WHERE table = 'events'
  AND active = 1
ORDER BY partition;
```

## Reloading Configuration Without Restart

```sql
SYSTEM RELOAD CONFIG;
```

## Summary

External disks in ClickHouse abstract any storage backend -- local SSD, S3, GCS, Azure Blob, encrypted volumes, or cache layers -- behind a uniform disk API. You define disks in `storage_configuration` inside `config.xml` or a config drop-in file. Once defined, disks can be used in storage policies for automatic data tiering, or referenced directly in `ALTER TABLE MOVE PARTITION` commands.
