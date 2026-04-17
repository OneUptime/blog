# Validation Summary: How to Configure External Disks in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (storage configuration, disks, storage policies)
- Amazon S3
- Google Cloud Storage (GCS)
- Azure Blob Storage
- Local filesystem / NVMe
- ClickHouse encrypted disks
- ClickHouse cache disks
- XML configuration (`/etc/clickhouse-server/config.d/`)
- SQL (MergeTree, ALTER TABLE, system tables)

## Sources Consulted
- ClickHouse official docs — External disks for storing data: https://clickhouse.com/docs/operations/storing-data
- ClickHouse official docs — MergeTree multiple volumes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official docs — Integrate Google Cloud Storage with ClickHouse: https://clickhouse.com/docs/integrations/gcs
- ClickHouse official docs — `system.disks`: https://clickhouse.com/docs/en/operations/system-tables/disks
- Altinity Knowledge Base — S3Disk and Google S3 (GCS)

## Issues Found

1. **Incorrect disk type `gcs` listed in table.** The post originally listed `gcs` as a distinct disk type with the description "Google Cloud Storage (via S3 compatibility)". ClickHouse does not have a `gcs` disk type — Google Cloud Storage is configured using `<type>s3</type>` pointing at `https://storage.googleapis.com/...` with HMAC credentials. The per-disk name in the XML may be called `<gcs>`, but the `<type>` is `s3`. Removed the `gcs` row from the disk type table to avoid misleading readers.

2. **Incorrect description for `s3_plain`.** The post described `s3_plain` as "S3 without multipart upload (simpler, slower)". This is not what `s3_plain` does. Per the ClickHouse docs, `s3_plain` uses plain file names on S3 (the same layout as local files) and does not store metadata locally; it is primarily used for backups. Updated the description to "S3 with plain file names and no local metadata (used for backups)".

## Review Notes
- The `<region>` parameter is valid for S3 disks. The `<send_metadata>` parameter is a legitimate S3 disk option.
- The `cache` disk parameters (`max_size`, `cache_on_write_operations`, `disk`, `path`) match current documentation, including human-readable sizes like `50Gi`.
- Columns referenced in `system.disks` (`name`, `type`, `path`, `free_space`, `total_space`) are all valid.
- Columns referenced in `system.parts` (`partition`, `name`, `disk_name`, `path`, `bytes_on_disk`) are all valid.
- `SYSTEM RELOAD CONFIG` is the correct SQL for reloading configuration without restart.
- `ALTER TABLE ... MOVE PARTITION ... TO DISK '<name>'` syntax is correct.
- Readers may want to know that `s3_plain_rewritable` (added in 24.4) is a newer related disk type that supports merges/inserts without local metadata, but this was out of scope for this post.
