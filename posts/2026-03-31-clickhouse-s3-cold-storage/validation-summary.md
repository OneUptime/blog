# Validation Summary: How to Use S3 as Cold Storage in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, storage policies, TTL rules)
- Amazon S3 (as an object storage backend)
- S3 disk type and cache disk type in ClickHouse
- IAM role-based authentication for S3

## Sources Consulted
- ClickHouse official documentation: Storing Data (S3 disk configuration, storage policies) — https://clickhouse.com/docs/en/operations/storing-data
- ClickHouse official documentation: MergeTree TTL rules — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse official documentation: system.parts table — https://clickhouse.com/docs/en/operations/system-tables/parts
- AWS S3 pricing page — https://aws.amazon.com/s3/pricing/

## Issues Found
1. **Incorrect S3 cache configuration (lines 90–104)**: The original post configured caching using `cache_enabled`, `cache_path`, and `cache_size` parameters directly inside the `<s3_cold>` disk definition. These are not valid parameters for the S3 disk type. ClickHouse requires a separate disk of `<type>cache</type>` that wraps the S3 disk, using `<disk>`, `<path>`, and `<max_size>` parameters. Fixed by replacing the inline cache parameters with the correct separate `cache` disk type definition and adding a note to reference the cache disk in the storage policy.

## Review Notes
- The `max_connections` parameter in the initial S3 disk configuration is not explicitly documented in official ClickHouse docs. It may work as an undocumented setting but users should be aware it is not part of the official API surface.
- The `<policies>` snippet is shown without the enclosing `<storage_configuration>` tags. In context it is clear this goes inside `<storage_configuration>` alongside `<disks>`, but readers new to ClickHouse configuration may need to infer this.
- The S3 pricing of ~$0.023/GB/month is accurate for S3 Standard in us-east-1 (first 50 TB tier) as of the review date.
- All SQL examples (CREATE TABLE with TTL, system.parts queries) use correct syntax and valid column names.
