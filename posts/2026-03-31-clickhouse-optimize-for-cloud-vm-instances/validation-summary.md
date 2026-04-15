# Validation Summary: How to Optimize ClickHouse for Cloud VM Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (server configuration, storage policies, system tables)
- AWS (EC2 instance families: r6i, c6i, m6i, i3, i4i; EBS; S3)
- GCP (Compute Engine: n2-highmem, c2; local SSD; Persistent Disk)
- Azure (VM families: Edsv5, Fsv2, Lsv3)
- Linux sysctl (TCP buffer tuning)
- S3-backed tiered storage

## Sources Consulted
- ClickHouse official docs — Storage configuration and external disks: https://clickhouse.com/docs/en/operations/storing-data
- ClickHouse official docs — MergeTree storage policies: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official docs — system.asynchronous_metrics: https://clickhouse.com/docs/en/operations/system-tables/asynchronous_metrics
- ClickHouse official docs — Server settings (max_server_memory_usage_to_ram_ratio): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse official docs — S3 integration: https://clickhouse.com/docs/en/integrations/s3

## Issues Found
1. **Incorrect metric names in system.asynchronous_metrics query (line 119):**
   - `DiskReadBytes` and `DiskWriteBytes` do not exist as metrics in `system.asynchronous_metrics`. These metric names would return empty results.
   - **Fixed:** Changed to `BlockReadBytes` and `BlockWriteBytes`, which are the actual metric names for block device I/O bytes in ClickHouse's asynchronous metrics table.

## Review Notes
- The S3 disk configuration omits `<access_key_id>` and `<secret_access_key>`. This is valid when using IAM instance roles on AWS, but readers on other setups may need to add credentials or `<use_environment_credentials>1</use_environment_credentials>`.
- The `max_server_memory_usage_to_ram_ratio` default in ClickHouse is 0.9. The post sets it to 0.8, which is a conservative choice — technically correct but worth noting the default is already protective.
- The `max_threads` advice to match vCPU count is sound, though ClickHouse already defaults `max_threads` to the detected CPU core count. The setting is mainly useful when the auto-detected value is wrong or needs overriding.
- The local disk definition omits `<type>local</type>`, which is acceptable — ClickHouse defaults to `local` type when no type is specified, and official MergeTree documentation examples use this pattern.
