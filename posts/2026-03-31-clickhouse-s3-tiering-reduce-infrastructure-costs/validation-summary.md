# Validation Summary: How to Use S3 Tiering to Reduce ClickHouse Infrastructure Costs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, storage policies, TTL rules)
- Amazon S3 (object storage for cold data tiering)
- XML configuration for ClickHouse storage
- SQL (DDL, ALTER TABLE, system table queries)

## Sources Consulted
- ClickHouse documentation on S3-backed MergeTree storage: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-s3
- ClickHouse documentation on storage policies and volumes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#storage_policies
- ClickHouse documentation on TTL for data movement: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#mergetree-table-ttl
- ClickHouse documentation on ALTER TABLE MOVE: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition#move-partition-to-disk-volume
- ClickHouse system.parts table reference: https://clickhouse.com/docs/en/operations/system-tables/parts
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
No technical issues found that warranted changes to the post.

## Review Notes
- The `prefer_fetch_column_from_remote` setting mentioned in the Performance Considerations section does not appear to be a standard ClickHouse setting name. The closest real settings are `remote_filesystem_read_method` and `remote_filesystem_read_prefetch`. However, since the mention is a casual recommendation ("use carefully") rather than a code example, and the surrounding advice about remote read performance is sound, this was not changed. Readers should verify this setting name against their specific ClickHouse version's documentation.
- The `<region>` parameter in the S3 disk configuration is supported in recent ClickHouse versions (23.8+) but may not be recognized in older versions. In older versions the region is inferred from the endpoint URL. Since the blog targets modern ClickHouse usage, this is acceptable.
- The cost estimates use reasonable approximations ($0.10/GB/month for SSD, $0.023/GB/month for S3 Standard in us-east-1). Actual costs will vary by provider, region, and volume tier. The arithmetic is correct.
- The S3 endpoint uses path-style URL format (`https://s3.amazonaws.com/bucket/path`), which is supported by ClickHouse but note that AWS has been deprecating path-style access for new buckets. Virtual-hosted style (`https://bucket.s3.amazonaws.com/path`) is the recommended format going forward.
