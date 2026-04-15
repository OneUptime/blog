# Validation Summary: How to Plan for ClickHouse Network Bandwidth

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (distributed query settings, replication, native protocol)
- AWS CLI (S3 uploads with bandwidth throttling)
- clickhouse-backup (Altinity backup tool)
- Linux networking tools (iftop, nethogs)

## Sources Consulted
- [ClickHouse Settings documentation](https://clickhouse.com/docs/operations/settings/settings) — verified `max_bytes_before_external_group_by` and `distributed_aggregation_memory_efficient` settings
- [ClickHouse GROUP BY documentation](https://clickhouse.com/docs/sql-reference/statements/select/group-by) — confirmed external GROUP BY behavior
- [AWS CLI S3 Configuration](https://docs.aws.amazon.com/cli/latest/topic/s3-config.html) — verified `max_bandwidth` is the correct S3 throttling mechanism
- [AWS SDK max_bandwidth setting](https://docs.aws.amazon.com/sdkref/latest/guide/setting-s3-max_bandwidth.html) — confirmed correct syntax and usage

## Issues Found
1. **Invalid AWS CLI flag `--bandwidth-limit`**: The `aws s3 cp` command does not support a `--bandwidth-limit` flag. This flag does not exist and the command would fail at runtime. Fixed by replacing with the correct approach: setting `max_bandwidth` via `aws configure set default.s3.max_bandwidth 50MB/s` before running the `aws s3 cp` command.

## Review Notes
- The bandwidth estimation math is correct throughout (ingestion, replication, NIC sizing).
- The ClickHouse settings `max_bytes_before_external_group_by` and `distributed_aggregation_memory_efficient` are valid and correctly used.
- The replication bandwidth formula expression `100,000 rows/sec / 8x compression * 500 bytes` is written in an unusual order but produces the correct result (6.25 MB/sec) since multiplication and division are associative here.
- The `clickhouse-backup` tool syntax is correct for the Altinity clickhouse-backup utility.
- The 1 Gbps = 125 MB/sec conversion and headroom calculation are accurate.
