# Validation Summary: How to Query Apache Hudi Tables from ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Hudi table engine and `hudi()` table function)
- Apache Hudi (Copy-on-Write and Merge-on-Read table types)
- Amazon S3 (as Hudi storage backend)
- Apache Spark (for Hudi compaction)
- Parquet (underlying file format)

## Sources Consulted
- ClickHouse Hudi table engine documentation: https://clickhouse.com/docs/engines/table-engines/integrations/hudi
- ClickHouse `hudi()` table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/hudi
- ClickHouse Hudi integration overview: https://clickhouse.com/docs/integrations/hudi
- Apache Hudi compaction documentation: https://hudi.apache.org/docs/compaction/
- ClickHouse GitHub issue #66462 (MoR support feature request)

## Issues Found

1. **Incorrect claim that ClickHouse supports both Hudi table types fully (High severity)**
   - **What was wrong:** The post stated "ClickHouse supports both Hudi table types" with MoR described as "ClickHouse reads the latest compacted snapshot," implying full MoR support. In reality, ClickHouse only fully supports Copy-on-Write tables. MoR support (including snapshot queries and delta log merging) is an open feature request (GitHub issue #66462).
   - **What was changed:** Rewrote the "Hudi Table Types" section to clearly state that only CoW is fully supported, and that MoR tables are only partially supported (base Parquet files only, no delta log merging). Updated the Summary section to reflect this as well.

2. **`toDate(_hoodie_commit_time)` would not parse correctly (Medium severity)**
   - **What was wrong:** `_hoodie_commit_time` is a string in compact format (e.g., `'20250101000000'`). ClickHouse's `toDate()` does not reliably parse this compact format.
   - **What was changed:** Replaced `toDate(_hoodie_commit_time)` with `toDate(parseDateTimeBestEffort(_hoodie_commit_time))`, which correctly handles the compact datetime string format.

3. **`toDateTime(_hoodie_commit_time)` is unreliable (Medium severity)**
   - **What was wrong:** In the "Copy Hudi Data into ClickHouse" section, `toDateTime(_hoodie_commit_time)` was used to convert the commit time. This is unreliable for the compact `YYYYMMDDHHmmss` string format.
   - **What was changed:** Replaced with `parseDateTimeBestEffort(_hoodie_commit_time)`, which reliably parses multiple datetime string formats including the compact format used by Hudi.

## Review Notes
- The `_hoodie_commit_time`, `_hoodie_commit_seqno`, `_hoodie_record_key`, and `_hoodie_partition_path` columns are accessible because they are regular columns stored in Hudi's Parquet data files (not ClickHouse virtual columns). This usage is correct but worth noting that these are not documented as ClickHouse-specific virtual columns.
- The string comparison `_hoodie_commit_time > '20250101000000'` in the Incremental Queries section is correct because the compact format is lexicographically sortable.
- The `hudi()` table function and `Hudi` engine syntax are correct and match the official ClickHouse documentation.
- The `HoodieCompactor` class name and spark-submit invocation are correct per the Apache Hudi documentation.
