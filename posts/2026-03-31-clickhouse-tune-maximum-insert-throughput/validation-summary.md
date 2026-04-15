# Validation Summary: How to Tune ClickHouse for Maximum Insert Throughput

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Buffer engine, async inserts)
- ClickHouse HTTP interface
- ClickHouse server/session configuration (users.xml, table settings)

## Sources Consulted
- ClickHouse official docs: Session Settings — https://clickhouse.com/docs/operations/settings/settings
- ClickHouse official docs: MergeTree Settings — https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse official docs: Buffer Table Engine — https://clickhouse.com/docs/engines/table-engines/special/buffer
- ClickHouse official docs: Asynchronous Inserts — https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse official docs: system.part_log — https://clickhouse.com/docs/operations/system-tables/part_log
- ClickHouse official docs: ORDER BY Clause (external sort) — https://clickhouse.com/docs/sql-reference/statements/select/order-by
- ClickHouse official docs: Compression Modes — https://clickhouse.com/docs/data-compression/compression-modes
- ClickHouse blog: Supercharging Data Loads Part 1 — https://clickhouse.com/blog/supercharge-your-clickhouse-data-loads-part1

## Issues Found

1. **`max_insert_threads` shown in config.xml (line 27-29):** `max_insert_threads` is a session/query-level setting, not a server-level config.xml setting. It belongs in `users.xml` under a `<profiles>` section. Fixed the XML snippet to show the correct file (`users.xml`) and proper profile hierarchy.

2. **"Configure the Write-Ahead Buffer" section used `max_bytes_before_external_sort` (lines 52-58):** This setting controls memory thresholds for ORDER BY external sorting in SELECT queries. It has nothing to do with insert buffering or write-ahead logs. Replaced the entire section with correct insert block size settings (`min_insert_block_size_rows` and `min_insert_block_size_bytes`) and renamed the heading to "Configure Insert Block Size."

3. **Buffer engine parameter list was incomplete (line 69):** The description listed only 7 parameters (`num_layers, min_time, max_time, min_rows, max_rows, min_bytes, max_bytes`) but omitted the first two (`database, table`). The CREATE TABLE statement itself was correct with all 9 arguments. Fixed the parameter list to include all required parameters.

4. **`system.part_log` query used non-existent columns (lines 94-96):** The columns `written_rows` and `written_bytes` do not exist in `system.part_log` (they exist in `system.query_log`). The correct columns are `rows` and `size_in_bytes`. Fixed the query to use the correct column names.

## Review Notes
- `async_insert_busy_timeout_ms` is the original setting name. In ClickHouse v24.2+, adaptive timeout settings were added (`async_insert_busy_timeout_min_ms`, `async_insert_busy_timeout_max_ms`). The original setting still works but readers on newer versions may want to use the newer variants.
- `network_compression_method = 'none'` is valid but affects all native protocol traffic (reads and writes), not just inserts. The post's framing as an insert-specific optimization is slightly misleading but not incorrect.
- The `parts_to_throw_insert` default changed from 300 to 3000 in ClickHouse v23.6+. The blog's suggested value of 600 would actually be lower than the current default, which could be counterproductive on newer versions. Readers should check their version's defaults before applying these values.
- The Buffer engine also supports optional `flush_time`, `flush_rows`, and `flush_bytes` parameters not mentioned in the post, which could be useful for more advanced tuning.
