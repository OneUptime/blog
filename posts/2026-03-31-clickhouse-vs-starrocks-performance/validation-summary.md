# Validation Summary: ClickHouse vs StarRocks Performance Comparison

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree, vectorized query engine)
- StarRocks (Primary Key tables, FE/BE architecture, shared-data mode)
- SQL (aggregation queries, joins, DDL)
- Star Schema Benchmark (SSB)

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse SQL reference for `toDate()`, `count()`, and `FINAL` keyword: https://clickhouse.com/docs/en/sql-reference
- StarRocks official documentation: https://docs.starrocks.io/docs/table_design/table_types/primary_key_table/
- StarRocks CREATE TABLE syntax and DISTRIBUTED BY clause: https://docs.starrocks.io/docs/sql-reference/sql-statements/table_bucket_part_index/CREATE_TABLE/
- StarRocks shared-data architecture: https://docs.starrocks.io/docs/deployment/shared_data/shared_data/
- Apache Doris project history (StarRocks fork lineage)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly identifies StarRocks as formerly DorisDB (a fork of Apache Doris). The lineage claim is accurate.
- ClickHouse SQL examples use idiomatic ClickHouse syntax (`toDate()`, `count()` without arguments, `FINAL` for deduplication) rather than generic SQL.
- StarRocks SQL examples use MySQL-compatible syntax (`DATE()`, `COUNT(*)`) which is correct for StarRocks.
- The ReplacingMergeTree example correctly passes `updated_at` as the version column and demonstrates the FINAL keyword for query-time deduplication.
- The StarRocks PRIMARY KEY table DDL correctly includes the required DISTRIBUTED BY clause.
- The qualitative benchmark summary table is balanced and aligns with widely reported community benchmarks. Specific numbers are not given beyond the SSB range (50-200ms), which is reasonable.
- Note: ClickHouse has been improving its join performance and query optimizer over time. The characterization of its optimizer as "less mature" was accurate historically and remains broadly true for complex multi-table joins, but the gap is narrowing in recent versions.
