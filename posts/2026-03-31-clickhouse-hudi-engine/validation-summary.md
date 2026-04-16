# Validation Summary: How to Use Hudi Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Hudi table engine)
- Apache Hudi (Copy-on-Write, Merge-on-Read)
- Amazon S3 / S3-compatible object storage
- Parquet / Avro file formats
- ClickHouse named collections
- ClickHouse MergeTree (for join example)

## Sources Consulted
- ClickHouse Hudi engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/hudi
- ClickHouse 23.3 release notes: https://clickhouse.com/blog/clickhouse-release-23-03
- ClickHouse named collections documentation: https://clickhouse.com/docs/operations/named-collections
- Apache Hudi file layout / table format reference: https://hudi.apache.org/docs/file_layouts
- ClickHouse S3Tables / Hudi MoR support discussion (GitHub issue #71506)

## Issues Found

1. **Named collection syntax was incorrect.** The post used `ENGINE = Hudi(named_collection = lake_s3, url = '...')`. ClickHouse engines accept a named collection as a positional argument rather than a keyword named `named_collection`. Fixed to `ENGINE = Hudi(lake_s3, url = '...')`, matching the documented pattern for Hudi and sibling engines (S3, Iceberg, DeltaLake).

2. **Incorrect claim that ClickHouse Hudi engine can query Merge-on-Read (MoR) tables.** The official docs and ClickHouse implementation support Copy-on-Write only; MoR tables are not supported by the Hudi engine. Updated the Prerequisites, the CoW vs MoR table, and the Summary to state clearly that the engine is read-only and targets CoW tables, and that MoR pipelines should be compacted to a CoW snapshot before querying.

## Review Notes

- `aws_access_key_id` / `aws_secret_access_key` are the documented positional argument names for the Hudi engine, but positional arguments are unnamed at the call site, so the post's positional usage `Hudi('s3://...', 'AKIA...', 'wJal...')` is correct.
- The named-collection XML example uses `<access_key_id>` / `<secret_access_key>`, which matches ClickHouse's S3-style named-collection key conventions.
- The post's assertion that ClickHouse reads `.hoodie/` metadata is consistent with the Hudi on-disk table format; the official ClickHouse docs do not call this out explicitly, but it accurately describes the engine's behavior for CoW tables.
- The Hudi engine does not document virtual columns; the post correctly avoids claiming any, instead pointing readers at `system.query_log` for observability.
- 23.3 is the correct minimum version — the Hudi / Iceberg / DeltaLake engines landed in the ClickHouse 23.3 release.
