# Validation Summary: How to Reduce ClickHouse Storage Costs

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL dialect, DDL, system tables)
- ClickHouse compression codecs (LZ4, ZSTD, Delta, DoubleDelta)
- ClickHouse LowCardinality encoding
- ClickHouse TTL policies (delete and move-to-disk)
- ClickHouse tiered storage (hot/cold with S3)
- ClickHouse partitioning strategies

## Sources Consulted
- ClickHouse documentation on compression codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse documentation on system.columns: https://clickhouse.com/docs/en/operations/system-tables/columns
- ClickHouse documentation on LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation on TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse documentation on tiered storage: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse documentation on ALTER TABLE: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse documentation on data types: https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found
No technical issues found.

## Review Notes
- The `OPTIMIZE TABLE events FINAL` command in Section 4 is technically correct for triggering TTL cleanup, but it forces a full merge of all parts within each partition. On large tables this can be very resource-intensive and may temporarily increase disk usage and CPU load. A brief caveat would strengthen the advice, but the current statement is not incorrect.
- The `Delta` codec applied to `Float64` in Section 1 is valid but may yield modest compression gains compared to integer types, since floating-point deltas are less predictable. `Gorilla` codec is another option worth considering for float columns, but the current recommendation is not wrong.
- The storage configuration filename `storage_policy.xml` is a reasonable convention; ClickHouse will load any XML file placed in the `config.d/` directory with the appropriate `<storage_configuration>` element.
