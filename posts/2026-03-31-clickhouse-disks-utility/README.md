# How to Use clickhouse-disks Utility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-disks, Storage, Disk Management, Utility

Description: Learn how to use the clickhouse-disks utility to inspect, copy, and manage data across ClickHouse storage disks including local and object storage.

---

`clickhouse-disks` is a command-line tool for interacting with ClickHouse storage configurations. It lets you list, copy, move, and delete files across all configured disks - including local disks, S3, Azure Blob, and HDFS.

## Installation

Ships with ClickHouse 22.7 and later:

```bash
which clickhouse-disks
# /usr/bin/clickhouse-disks
```

## Listing Configured Disks

```bash
clickhouse-disks --config-file /etc/clickhouse-server/config.xml --query "list-disks"
```

Sample output:

```text
default: local, path: /var/lib/clickhouse/
s3cold: s3, path: s3://my-bucket/clickhouse/
```

## Listing Files on a Disk

```bash
clickhouse-disks --config-file /etc/clickhouse-server/config.xml \
  --disk default \
  --query "list /data/analytics/events/"
```

## Copying Data Between Disks

Move a table partition from local to S3:

```bash
clickhouse-disks --config-file /etc/clickhouse-server/config.xml \
  --query "copy --disk-from default --disk-to s3cold /data/analytics/events/202601_1_1_0/ /data/analytics/events/202601_1_1_0/"
```

## Removing Files from a Disk

```bash
clickhouse-disks --config-file /etc/clickhouse-server/config.xml \
  --disk s3cold \
  --query "remove /data/analytics/events/old_partition/"
```

## Interactive Mode

Launch an interactive shell for disk operations:

```bash
clickhouse-disks --config-file /etc/clickhouse-server/config.xml \
  --disk default
```

Then use commands like `ls`, `cp`, `mv`, `rm`, `mkdir` in the interactive session.

## Use Case: Manual Cold Storage Migration

When automated TTL moves are not suitable, manually migrate old partitions:

```bash
# List partitions older than 6 months
clickhouse-disks --disk default --query "list /data/analytics/events/" | grep "^2025"

# Copy each to cold storage
clickhouse-disks \
  --query "copy --disk-from default --disk-to s3cold /data/analytics/events/202506_1_100_5/ /data/analytics/events/202506_1_100_5/"
```

## Checking Disk Usage

```bash
clickhouse-client --query "SELECT name, path, free_space, total_space FROM system.disks"
```

## Summary

`clickhouse-disks` gives you filesystem-like control over all storage backends configured in ClickHouse. It is particularly useful for manual data tiering, disaster recovery, and debugging storage issues across local and object storage disks.
