# Validation Summary: How to Use Buffer Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Buffer table engine
- ClickHouse MergeTree table engine
- ClickHouse SQL (DDL/DML)
- `system.tables` system table
- `OPTIMIZE TABLE` statement
- ClickHouse functions: `now()`, `toYYYYMM()`, `toDate()`, `toStartOfMinute()`, `currentDatabase()`, `round()`, `avg()`, `max()`

## Sources Consulted
- ClickHouse Buffer engine docs: https://clickhouse.com/docs/en/engines/table-engines/special/buffer
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse `CREATE TABLE ... AS` docs: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse GitHub issues #8226, #35468, #71694, #61097 for current Buffer engine behavior and caveats

## Issues Found
1. **Row distribution mechanism (fixed)**: The post claimed "Rows are distributed across layers via hashing." Per the official ClickHouse docs: *"During the write operation, data is inserted into one or more random buffers (configured with `num_layers`)."* Distribution is random, not hash-based. Updated the wording to "Rows are inserted into one of the layers at random."

## Review Notes
- The Buffer engine parameter order `(database, table, num_layers, min_time, max_time, min_rows, max_rows, min_bytes, max_bytes)` is correct. Optional trailing parameters `flush_time`, `flush_rows`, `flush_bytes` exist but are not covered in the post — acceptable for an introductory tutorial.
- Flush condition rule ("any max_* exceeded OR all min_* satisfied") matches the official docs exactly.
- `OPTIMIZE TABLE <buffer_table>` does trigger a flush via `StorageBuffer::optimize()` in the ClickHouse source, but the official docs do not formally document this as an API. It is widely used in the community and works, so retained in the post.
- `currentDatabase()` as the database parameter is explicitly supported per the docs: *"You can use `currentDatabase()` or another constant expression that returns a string."*
- `CREATE TABLE foo AS existing_table ENGINE = Buffer(...)` schema inheritance pattern matches the official example verbatim.
- The listed limitations (crash-loss, ALTER non-propagation, mutations/DELETE on buffered rows, FINAL) are all consistent with official documentation.
- Forward-looking caveat: The ClickHouse team now recommends **asynchronous inserts** as a preferred alternative for many workloads previously handled by Buffer tables. This is not strictly a correctness issue, so not added to the post, but readers may want to evaluate async inserts for new deployments.
- All SQL examples are syntactically valid and the INSERT row shapes match the declared column types and order.
