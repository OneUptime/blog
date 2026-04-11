# Validation Summary: How to Monitor Table I/O with Performance Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- MySQL sys schema
- SQL (querying Performance Schema tables)

## Sources Consulted
- MySQL 8.0 Reference Manual — Table I/O and Lock Wait Summary Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-wait-summary-tables.html
- MySQL 8.0 Reference Manual — Performance Schema Timing: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html
- MySQL 8.0 Reference Manual — table_io_waits_summary_by_table: https://dev.mysql.com/doc/mysql-perfschema-excerpt/8.0/en/performance-schema-table-io-waits-summary-by-table-table.html
- MySQL 8.0 Reference Manual — table_io_waits_summary_by_index_usage: https://dev.mysql.com/doc/mysql-perfschema-excerpt/8.0/en/performance-schema-table-io-waits-summary-by-index-usage-table.html
- MySQL 8.0 Reference Manual — sys.schema_table_statistics: https://dev.mysql.com/doc/refman/8.0/en/sys-schema-table-statistics.html
- MySQL 8.0 Reference Manual — sys.schema_tables_with_full_table_scans: https://dev.mysql.com/doc/refman/8.0/en/sys-schema-tables-with-full-table-scans.html
- MySQL 8.0 Reference Manual — Pre-Filtering by Consumer: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-consumer-filtering.html

## Issues Found
1. **Intro said "disk reads" instead of "I/O operations"**: Performance Schema table I/O instrumentation (`wait/io/table/sql/handler`) tracks logical table handler operations, not physical disk reads. A counted "fetch" may be served entirely from the InnoDB buffer pool without touching disk. Changed "disk reads" to "I/O operations" in the intro paragraph.

2. **NULL INDEX_NAME oversimplified as "full table scan"**: The original text stated "A NULL index name means a full table scan." In reality, NULL INDEX_NAME means no index was used for the operation, which includes full table scans but also all INSERT operations (which are always counted under NULL). Expanded the explanation to clarify this distinction and note that high *fetch* counts specifically indicate missing indexes.

## Review Notes
- The post enables `events_waits_current` and `events_waits_history_long` consumers, but the queries in the post only use summary tables (`table_io_waits_summary_by_table`, `table_io_waits_summary_by_index_usage`). Summary tables do not depend on those consumers — they only require `global_instrumentation` to be enabled along with the instruments themselves. Enabling those consumers is not harmful but is unnecessary for the use cases shown. This was not changed since it is not incorrect, just more than needed.
- Truncating `table_io_waits_summary_by_table` also implicitly truncates `table_io_waits_summary_by_index_usage` per MySQL documentation, so the second TRUNCATE in the "Resetting I/O Statistics" section is redundant. Not changed since it is not incorrect and makes the intent explicit.
- All table names, column names, picosecond-to-seconds/milliseconds conversions, sys schema view names, and TRUNCATE behavior were verified as correct.
